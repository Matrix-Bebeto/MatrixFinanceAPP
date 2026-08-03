#!/usr/bin/env bash
set -euo pipefail

docker logs --since 20m fazer-ai-caddy-caddy-1 2>&1 \
  | grep -Ei 'finance\.matrixlabs\.ia\.br|certificate|acme|tls|error' \
  | tail -n 160 || true
