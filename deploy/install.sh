#!/usr/bin/env bash
set -euo pipefail

app_root='/opt/matrixfinance'
caddy_file='/opt/fazer-ai/caddy/Caddyfile'
caddy_container='fazer-ai-caddy-caddy-1'
site_archive='/tmp/matrixfinance-site.tgz'
compose_source='/tmp/matrixfinance-docker-compose.yml'
nginx_source='/tmp/matrixfinance-nginx.conf'

install -d -m 0755 "$app_root" "$app_root/site"
find "$app_root/site" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
tar -xzf "$site_archive" -C "$app_root/site"
install -m 0644 "$compose_source" "$app_root/docker-compose.yml"
install -m 0644 "$nginx_source" "$app_root/nginx.conf"

docker compose -f "$app_root/docker-compose.yml" pull
docker compose -f "$app_root/docker-compose.yml" up -d

for _ in $(seq 1 30); do
  status="$(docker inspect matrixfinance-web --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')"
  if [ "$status" = 'healthy' ]; then
    break
  fi
  sleep 2
done

status="$(docker inspect matrixfinance-web --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')"
if [ "$status" != 'healthy' ]; then
  docker logs --tail 100 matrixfinance-web >&2
  exit 1
fi

curl -fsS http://127.0.0.1:3003/ >/dev/null

backup="${caddy_file}.matrixfinance.$(date +%Y%m%d%H%M%S).bak"
cp -a "$caddy_file" "$backup"

if ! grep -q '^finance\.matrixlabs\.ia\.br {' "$caddy_file"; then
  cat >>"$caddy_file" <<'CADDY'

finance.matrixlabs.ia.br {
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    X-Frame-Options "DENY"
    -Server
  }
  reverse_proxy host.docker.internal:3003
}
CADDY
fi

if ! docker exec "$caddy_container" caddy validate --config /etc/caddy/Caddyfile; then
  cp -a "$backup" "$caddy_file"
  exit 1
fi

docker exec "$caddy_container" caddy reload --config /etc/caddy/Caddyfile

echo "matrixfinance_status=$status"
echo "local_http=ok"
echo "caddy_reload=ok"
echo "caddy_backup=$backup"
