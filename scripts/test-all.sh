#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

for dependency in java docker pnpm; do
  if ! command -v "$dependency" >/dev/null 2>&1; then
    printf 'Missing prerequisite: %s. See docs/TESTING.md.\n' "$dependency" >&2
    exit 1
  fi
done
java -version
docker info >/dev/null

(cd backend && ./mvnw --batch-mode --no-transfer-progress verify)
(cd frontend && pnpm install --frozen-lockfile && pnpm test:unit && pnpm build && pnpm test:e2e:types)

# Only this ephemeral Compose project is started/stopped; never the development stack.
cleanup() {
  docker compose -f docker-compose.e2e.yml down
}
trap cleanup EXIT
docker compose -f docker-compose.e2e.yml up -d --wait
(cd frontend && pnpm exec playwright install chromium && pnpm test:e2e)
