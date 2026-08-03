#!/usr/bin/env bash
set -euo pipefail

echo "--- caddy directory ---"
find /opt/fazer-ai/caddy -maxdepth 2 -type f -printf '%p\n' | sort
echo "--- compose ---"
sed -n '1,240p' /opt/fazer-ai/caddy/caddy-compose.yml
echo "--- caddyfile ---"
if [ -f /opt/fazer-ai/caddy/Caddyfile ]; then
  sed -n '1,260p' /opt/fazer-ai/caddy/Caddyfile
fi
echo "--- container mounts/networks ---"
docker inspect fazer-ai-caddy-caddy-1 --format '{{json .Mounts}}'
docker inspect fazer-ai-caddy-caddy-1 --format '{{json .NetworkSettings.Networks}}'
