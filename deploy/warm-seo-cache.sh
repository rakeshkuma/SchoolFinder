#!/usr/bin/env bash
# Asks this server's nginx for every page in the sitemap, one page at a time, so that each page's server-rendered head
# and content (the SSI includes in frontend/nginx.conf) are in nginx's cache before a search engine asks for them.
#
# Why: a page that has never been cached, or has dropped out of the cache, is rendered while the visitor waits, which
# took a median 4.3 s for the "best schools in" pages on the small server (17 Nov 2026), and Google slows its crawling
# of slow sites. A page that is cached is answered at once, and an expired copy is refreshed in the background
# (proxy_cache_use_stale updating + proxy_cache_background_update), so nothing is deleted here: visitors keep getting
# the last copy while each page is refreshed.
#
# Installed as /usr/local/bin/schooldhundo-warm-cache by deploy/oracle-micro-web.sh, which runs it 10 minutes after
# every deploy and daily at 06:45 IST (schooldhundo-warm.timer). Read-only: it only sends GET requests to nginx on
# this server. Run by hand with: sudo systemctl start schooldhundo-warm.service; see: journalctl -u schooldhundo-warm
set -uo pipefail

NGINX="${NGINX:-http://127.0.0.1:8081}"
# The same Host and scheme the HTTPS proxy (Caddy) passes on, so the pages are the ones visitors are served.
HOST="${HOST:-schooldhundo.in}"
# Seconds between pages: one page at a time, with a pause, keeps the small server free for visitors.
PAUSE="${PAUSE:-1}"
# Stop after this many pages (0: all of them), for trying the script out.
LIMIT="${LIMIT:-0}"
AGENT="SchoolDhundo cache warm-up"

get() { curl -fsS --max-time 30 -H "Host: $HOST" -H "X-Forwarded-Proto: https" -A "$AGENT" "$NGINX$1"; }
# The paths in a sitemap: "https://schooldhundo.in/schools/x" -> "/schools/x".
paths() { grep -o '<loc>[^<]*</loc>' | sed -e 's#</\?loc>##g' -e 's#&amp;#\&#g' -e 's#^https\?://[^/]*##'; }

started=$(date +%s)
index=$(get /sitemap.xml) || { echo "Could not read /sitemap.xml from $NGINX; nothing warmed."; exit 1; }
total=0; slow=0; failed=0
while read -r sitemap; do
  [ -n "$sitemap" ] || continue
  pages=$(get "$sitemap") || { echo "Could not read $sitemap"; failed=$((failed + 1)); continue; }
  while read -r page; do
    [ -n "$page" ] || continue
    if [ "$LIMIT" -gt 0 ] && [ "$total" -ge "$LIMIT" ]; then break 2; fi
    result=$(curl -s -o /dev/null --max-time 30 -w '%{http_code} %{time_total}' \
      -H "Host: $HOST" -H "X-Forwarded-Proto: https" -A "$AGENT" "$NGINX$page") || true
    code=${result%% *}
    seconds=${result##* }
    total=$((total + 1))
    if [ "$code" != "200" ]; then
      failed=$((failed + 1))
      echo "HTTP ${code:-none}: $page"
    elif awk -v s="$seconds" 'BEGIN { exit !(s > 2) }'; then
      slow=$((slow + 1)) # rendered while waiting: it was not in the cache
    fi
    sleep "$PAUSE"
  done < <(printf '%s\n' "$pages" | paths)
done < <(printf '%s\n' "$index" | paths)

echo "Warmed $total pages in $(( ($(date +%s) - started) / 60 )) min: $slow were not cached yet (over 2 s), $failed failed."
[ "$failed" -eq 0 ]
