#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Uso: CONFIRM_RESTORE=barberflow $0 /caminho/backup.dump" >&2
  exit 2
fi

if [[ "${CONFIRM_RESTORE:-}" != "barberflow" ]]; then
  echo "Restauro recusado. Defina CONFIRM_RESTORE=barberflow para confirmar." >&2
  exit 2
fi

backup_file="$1"
if [[ ! -s "${backup_file}" ]]; then
  echo "Backup inexistente ou vazio: ${backup_file}" >&2
  exit 2
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="${COMPOSE_FILE:-${repo_root}/docker-compose.production.yml}"

docker compose -f "${compose_file}" exec -T database sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore --clean --if-exists --no-owner --no-privileges --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
  < "${backup_file}"

echo "Restauro concluído a partir de: ${backup_file}"
