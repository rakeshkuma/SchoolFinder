#!/usr/bin/env bash
# How often search engines and AI answer engines fetch the site, from the web server's nginx access log: requests per
# crawler, how many were for pages in the sitemap's sections, and the pages each fetched most. Read-only.
#
# Installed on the web server by deploy/oracle-micro-web.sh. Run there:
#   sudo schooldhundo-crawler-report                               (the current log)
#   sudo schooldhundo-crawler-report /var/log/nginx/access.log.1   (the previous one)
# User-agent strings can be faked; Search Console (Googlebot) and Bing Webmaster Tools (Bingbot) show verified crawling.
set -euo pipefail

LOG="${1:-/var/log/nginx/access.log}"
[ -r "$LOG" ] || { echo "Cannot read $LOG (try sudo)"; exit 1; }

# Search engines, AI search and answer engines, then crawlers that collect pages to train AI models.
BOTS="Googlebot Bingbot OAI-SearchBot ChatGPT-User PerplexityBot Perplexity-User Claude-SearchBot Claude-User Applebot DuckDuckBot YandexBot GPTBot ClaudeBot CCBot Google-Extended Applebot-Extended meta-externalagent Bytespider"

echo "Crawler requests in $LOG ($(wc -l < "$LOG") requests in all)"
printf '%-20s %8s %8s %8s\n' "Crawler" "Requests" "Pages" "Errors"
for bot in $BOTS; do
  lines=$(grep -i -- "$bot" "$LOG" || true)
  [ -n "$lines" ] || continue
  total=$(printf '%s\n' "$lines" | wc -l)
  # Page views: not the API, assets, images or sitemaps.
  pages=$(printf '%s\n' "$lines" | awk '{print $7}' | grep -cvE '^/(api|assets|images|sitemaps?)|\.(js|css|svg|png|webp|xml|txt|ico)$' || true)
  errors=$(printf '%s\n' "$lines" | awk '$9 >= 400' | wc -l)
  printf '%-20s %8d %8d %8d\n' "$bot" "$total" "$pages" "$errors"
done

for bot in OAI-SearchBot ChatGPT-User PerplexityBot Bingbot Googlebot; do
  top=$(grep -i -- "$bot" "$LOG" | awk '{print $7}' | grep -vE '^/(api|assets|images)' | sort | uniq -c | sort -rn | head -5 || true)
  [ -n "$top" ] || continue
  echo
  echo "Pages $bot fetched most:"
  printf '%s\n' "$top"
done
