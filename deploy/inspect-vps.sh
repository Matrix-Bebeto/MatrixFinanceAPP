#!/usr/bin/env bash
set -euo pipefail

echo "identity=$(id -un)"
echo "hostname=$(hostname)"
echo "docker=$(command -v docker || true)"
echo "nginx=$(command -v nginx || true)"
echo "caddy=$(command -v caddy || true)"
echo "--- compose projects ---"
docker compose ls 2>/dev/null || true
echo "--- containers ---"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
echo "--- networks ---"
docker network ls --format 'table {{.Name}}\t{{.Driver}}\t{{.Scope}}'
echo "--- listening ports ---"
ss -lntp | head -n 60
echo "--- disk ---"
df -h / /var/lib/docker 2>/dev/null || df -h /
