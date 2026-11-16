#!/bin/sh
# Every request runs in the browser, so the backend's address ends up inside
# the built JavaScript. A published image is built with a placeholder instead
# (__MORCHE_API_URL__); this writes the real address from API_URL into the
# files before the server starts, so one image works for everyone.
#
# The address in use is kept in .next/.api-url: changing API_URL and
# restarting the container swaps the old one for the new one.
set -eu

PLACEHOLDER=__MORCHE_API_URL__
STATE=/app/.next/.api-url

current=$(cat "$STATE" 2>/dev/null || echo "$PLACEHOLDER")
wanted=${API_URL:-}
wanted=${wanted%/}

if grep -rqsF "$PLACEHOLDER" /app/.next /app/server.js 2>/dev/null \
  || [ "$current" != "$PLACEHOLDER" ]; then
  if [ -z "$wanted" ]; then
    echo "API_URL is not set: give the address people's browsers reach the backend at, e.g. API_URL=http://192.168.1.10:8080" >&2
    exit 1
  fi
  case "$wanted" in
    http://* | https://*) ;;
    *)
      echo "API_URL must start with http:// or https:// (got: $wanted)" >&2
      exit 1
      ;;
  esac
  if [ "$current" != "$wanted" ]; then
    echo "pointing the panel at $wanted"
    from=$(printf '%s' "$current" | sed 's/[][\\.*^$|]/\\&/g')
    to=$(printf '%s' "$wanted" | sed 's/[\\&|]/\\&/g')
    grep -rlsF "$current" /app/.next /app/server.js | while IFS= read -r f; do
      sed -i "s|$from|$to|g" "$f"
    done
    printf '%s' "$wanted" >"$STATE"
  fi
fi

exec "$@"
