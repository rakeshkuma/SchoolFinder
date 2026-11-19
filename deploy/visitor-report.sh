#!/usr/bin/env bash
# Daily visitors from the web server's nginx access logs, as a check on Google Analytics (which counts only visitors
# who accept cookies). Read-only; prints no IP addresses. Counts page loads only (not the API, scripts, images or
# sitemaps), separates Googlebot and other crawlers by user agent, and counts visits referred by search engines.
#
# Run from the PC (the key is the one deploy/oracle-micro-deploy.ps1 uses):
#   ssh -i <key> ubuntu@152.67.7.170 "sudo bash -s" < deploy/visitor-report.sh
# User agents can be faked, and one person on two devices counts twice: treat "visitors" as an estimate.
set -u
cd /var/log/nginx || exit 1
T=$(mktemp); chmod 600 "$T"; trap 'rm -f "$T"' EXIT
for f in $(ls -tr access.log* 2>/dev/null); do case $f in *.gz) zcat "$f" ;; *) cat "$f" ;; esac; done > "$T"
echo "Log lines: $(wc -l < "$T"); real client addresses logged: $(awk '$1 !~ /^127\.|^::1$/' "$T" | wc -l)"
# Behind Caddy, nginx logs 127.0.0.1 for everyone (no real_ip setting), so "visitors" is then distinct browsers
# (user-agent strings) per day: a lower bound, since many phones share one browser version.
echo
echo "day          pageviews   visitors  search-refs  google-refs    Googlebot  otherbots"
awk '
function bot(ua) { return ua ~ /[Bb]ot|crawl|[Ss]pider|slurp|curl|wget|python|Go-http|node|HeadlessChrome|Lighthouse|monitor|uptime|preview|facebookexternalhit|WhatsApp|Ubersuggest|Semrush|Ahrefs|axios|okhttp|Java\// }
{
  split($0, q, "\""); split(q[2], r, " "); ref = q[4]; ua = q[6]; d = substr($4, 2, 11);
  page = (r[1] == "GET" && $9 ~ /^(200|304)$/ && r[2] !~ /^\/(api|assets|images|sitemaps?|fonts|favicon|robots|manifest|sw|og)/ \
          && r[2] !~ /\.(js|css|svg|png|jpe?g|webp|xml|txt|ico|json|map|woff2?)(\?|$)/);
  if (!page) next;
  days[d] = 1;
  if (ua ~ /Googlebot/) { g[d]++; next }
  if (bot(ua)) { b[d]++; next }
  p[d]++; v[d SUBSEP $1 SUBSEP ua] = 1;
  if (ref ~ /google\.|bing\.com|duckduckgo|yahoo\./) s[d]++;
  if (ref ~ /google\./) sg[d]++;
}
END {
  for (k in v) { split(k, kk, SUBSEP); u[kk[1]]++ }
  for (x in days) printf "%-12s %10d %10d %12d %12d %12d %10d\n", x, p[x], u[x], s[x], sg[x], g[x], b[x];
}' "$T" | sort -t/ -k3,3n -k2,2M -k1,1n
echo
echo "Pages people reached from Google (all days in the logs):"
awk -F'"' '$4 ~ /google\./ && $6 !~ /[Bb]ot/ { split($2, r, " "); print r[2] }' "$T" | sort | uniq -c | sort -rn | head -15
