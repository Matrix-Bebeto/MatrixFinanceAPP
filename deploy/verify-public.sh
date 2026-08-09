#!/usr/bin/env bash
set -euo pipefail

echo "--- dns ---"
getent ahostsv4 finance.matrixlabs.ia.br || true
echo "--- https direct ---"
curl --resolve finance.matrixlabs.ia.br:443:147.79.86.156 \
  --silent --show-error --head --fail \
  https://finance.matrixlabs.ia.br/
echo "--- container ---"
docker inspect matrixfinance-web --format 'status={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{end}}'
echo "--- caddy certificates ---"
find /var/lib/docker/volumes/fazer-ai-caddy_caddy_data/_data/caddy/certificates \
  -type f -path '*finance.matrixlabs.ia.br*' -printf '%f\n' 2>/dev/null | sort
