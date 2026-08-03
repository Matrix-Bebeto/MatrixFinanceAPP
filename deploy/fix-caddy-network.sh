#!/usr/bin/env bash
set -euo pipefail

app_root='/opt/matrixfinance'
caddy_file='/opt/fazer-ai/caddy/Caddyfile'
caddy_container='fazer-ai-caddy-caddy-1'
compose_source='/tmp/matrixfinance-docker-compose-network.yml'

install -m 0644 "$compose_source" "$app_root/docker-compose.yml"
docker compose -f "$app_root/docker-compose.yml" up -d

backup="${caddy_file}.matrixfinance-network.$(date +%Y%m%d%H%M%S).bak"
cp -a "$caddy_file" "$backup"
sed -i 's|reverse_proxy host\.docker\.internal:3003|reverse_proxy matrixfinance-web:80|' "$caddy_file"

if ! docker exec "$caddy_container" caddy validate --config /etc/caddy/Caddyfile; then
  cp -a "$backup" "$caddy_file"
  exit 1
fi

docker exec "$caddy_container" caddy reload --config /etc/caddy/Caddyfile

for _ in $(seq 1 20); do
  if docker exec "$caddy_container" wget -q -O /dev/null http://matrixfinance-web/; then
    break
  fi
  sleep 1
done

docker exec "$caddy_container" wget -q -O /dev/null http://matrixfinance-web/
curl --resolve finance.matrixlabs.ia.br:443:147.79.86.156 \
  --silent --show-error --head --fail \
  https://finance.matrixlabs.ia.br/

echo 'caddy_network=ok'
echo "caddy_backup=$backup"
