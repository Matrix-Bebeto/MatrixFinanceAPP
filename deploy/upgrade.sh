#!/usr/bin/env bash
set -euo pipefail

app_root='/opt/matrixfinance'
compose_file="$app_root/docker-compose.yml"
archive='/tmp/matrixfinance-site.tgz'
nginx_next='/tmp/nginx.conf'
release_id="$(date -u +%Y%m%dT%H%M%SZ)"
release_dir="$app_root/releases/$release_id"
previous_site="$app_root/site.previous.$release_id"
nginx_backup="$app_root/nginx.conf.previous.$release_id"

test -s "$archive"
test -s "$nginx_next"
test -f "$compose_file"

install -d -m 0755 "$app_root/releases" "$release_dir"
tar -xzf "$archive" -C "$release_dir"
test -s "$release_dir/index.html"
test -d "$release_dir/assets"

docker run --rm \
  -v "$nginx_next:/etc/nginx/conf.d/default.conf:ro" \
  nginx:stable-alpine nginx -t

cp -a "$app_root/nginx.conf" "$nginx_backup"
ln -s "$release_dir" "$app_root/site.next"

rollback() {
  trap - ERR
  set +e
  docker compose -f "$compose_file" down
  rm -f "$app_root/site"
  if [ -e "$previous_site" ]; then
    mv "$previous_site" "$app_root/site"
  fi
  cp -a "$nginx_backup" "$app_root/nginx.conf"
  docker compose -f "$compose_file" up -d
  echo 'deployment_rollback=completed' >&2
  exit 1
}
trap rollback ERR

mv "$app_root/site" "$previous_site"
mv "$app_root/site.next" "$app_root/site"
install -m 0644 "$nginx_next" "$app_root/nginx.conf"

docker compose -f "$compose_file" up -d --force-recreate

for _ in $(seq 1 30); do
  status="$(docker inspect matrixfinance-web --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"
  [ "$status" = 'healthy' ] && break
  sleep 2
done

status="$(docker inspect matrixfinance-web --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}')"
test "$status" = 'healthy'
curl -fsS http://127.0.0.1:3003/ >/dev/null
curl -fsS https://finance.matrixlabs.ia.br/login >/dev/null
grep -Rqs 'sb_publishable_' "$release_dir/assets"
if grep -Rqs 'service_role' "$release_dir"; then
  echo 'unexpected_service_role_marker=true' >&2
  false
fi

trap - ERR
rm -f "$archive" "$nginx_next" /tmp/upgrade.sh

echo "release=$release_id"
echo "container_status=$status"
echo "local_http=ok"
echo "public_https=ok"
echo "publishable_key=embedded"
echo "previous_site=$previous_site"
