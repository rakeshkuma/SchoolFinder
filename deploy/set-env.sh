#!/usr/bin/env bash
# Sets KEY=VALUE lines read from stdin in the backend's env file on the web server, without printing any value,
# then restarts the backend. Only the names of the keys that were set are shown.
#
# From Git Bash on the PC:
#   scp deploy/set-env.sh ubuntu@<web ip>:/tmp/ && grep -E '^GOOGLE_CLIENT_(ID|SECRET)=' .env | ssh ubuntu@<web ip> 'sudo bash /tmp/set-env.sh'
set -euo pipefail
ENV_FILE="${ENV_FILE:-/etc/schooldhundo/backend.env}"
tmp=$(mktemp)
trap 'rm -f "$tmp" "$tmp.new"' EXIT
# Strip a byte-order mark and Windows line endings from the input.
sed -e '1s/^\xEF\xBB\xBF//' -e 's/\r$//' > "$tmp"
while IFS= read -r line; do
  [[ "$line" =~ ^([A-Z][A-Z0-9_]*)=(.*)$ ]] || continue
  key="${BASH_REMATCH[1]}"
  KEY="$key" VALUE="${BASH_REMATCH[2]}" awk '
    BEGIN { k = ENVIRON["KEY"]; v = ENVIRON["VALUE"]; done = 0 }
    $0 ~ "^#?" k "=" { if (!done) { print k "=" v; done = 1 }; next }
    { print }
    END { if (!done) print k "=" v }
  ' "$ENV_FILE" > "$tmp.new"
  cat "$tmp.new" > "$ENV_FILE"
  echo "set $key"
done < "$tmp"
systemctl restart schooldhundo
echo "backend restarted"
