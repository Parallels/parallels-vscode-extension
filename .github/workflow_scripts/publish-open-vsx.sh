#!/usr/bin/env bash
set -euo pipefail

# Publishes each .vsix file found under the repo root to Open VSX.
# Usage: OPEN_VSX_TOKEN=token ./publish-open-vsx.sh
# If a token is passed as the first positional argument it will be used as a fallback.

if [ -z "${OPEN_VSX_TOKEN:-}" ] && [ "$#" -ge 1 ]; then
  OPEN_VSX_TOKEN="$1"
fi

if [ -z "${OPEN_VSX_TOKEN:-}" ]; then
  echo "ERROR: OPEN_VSX_TOKEN not set. Export it or pass as first argument."
  exit 2
fi

shopt -s nullglob
files=( $(find . -type f -iname "*.vsix" -print) )
if [ ${#files[@]} -eq 0 ]; then
  echo "No .vsix files found to publish."
  exit 0
fi

for f in "${files[@]}"; do
  echo "Publishing: $f"
  npx --yes ovsx publish "$f" -p "$OPEN_VSX_TOKEN"
done

echo "All done."
