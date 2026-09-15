#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
case "${1:-}" in
  --ios) exec npx expo start --go --ios ;;
  --android) exec npx expo start --go --android ;;
  --web) exec npx expo start --web ;;
  --dev-client) exec npx expo start --dev-client ;;
  --tunnel) exec npx expo start --go --tunnel ;;
  --export-web) exec npx expo export --platform web ;;
  --help) echo 'Usage: build_and_run.sh [--ios|--android|--web|--dev-client|--tunnel|--export-web]' ;;
  '') exec npx expo start --go ;;
  *) echo "Unknown mode: $1" >&2; exit 2 ;;
esac
