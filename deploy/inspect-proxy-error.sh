#!/usr/bin/env bash
set -euo pipefail

curl --resolve finance.matrixlabs.ia.br:443:127.0.0.1 \
  --silent --show-error --head --insecure \
  https://finance.matrixlabs.ia.br/ || true
echo '--- recent caddy logs ---'
docker logs --since 3m fazer-ai-caddy-caddy-1 2>&1 | tail -n 100
echo '--- caddy dns ---'
docker exec fazer-ai-caddy-caddy-1 wget -S -O /dev/null http://matrixfinance-web/ 2>&1 || true
echo '--- network addresses ---'
docker inspect matrixfinance-web --format '{{json .NetworkSettings.Networks}}'
