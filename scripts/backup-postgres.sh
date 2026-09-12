#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="${COMPOSE_FILE:-${repo_root}/docker-compose.production.yml}"
backup_dir="${BACKUP_DIR:-${repo_root}/backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${backup_dir}/barberflow-${timestamp}.dump"

mkdir -p "${backup_dir}"
umask 077

docker compose -f "${compose_file}" exec -T database sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump --format=custom --no-owner --no-privileges --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
  > "${backup_file}"

test -s "${backup_file}"
echo "Backup criado: ${backup_file}"
