#!/usr/bin/env bash
set -euo pipefail

caddy_file='/opt/fazer-ai/caddy/Caddyfile'
caddy_container='fazer-ai-caddy-caddy-1'

docker exec -i "$caddy_container" \
  caddy reload --config /dev/stdin --adapter caddyfile <"$caddy_file"

curl --resolve finance.matrixlabs.ia.br:443:147.79.86.156 \
  --silent --show-error --head --fail \
  https://finance.matrixlabs.ia.br/

echo 'caddy_live_config=updated'
