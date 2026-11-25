// Asks the live site to submit its sitemap addresses to IndexNow (Bing, Yandex, Seznam, Naver, Yep), through the admin
// endpoint POST /admin/seo/indexnow (ADMIN only). The server does the submitting: it reads its own sitemaps and sends
// nothing unless {site}/{key}.txt serves its IndexNow key.
//
// Usage:
//   ADMIN_USERNAME=admin ADMIN_PASSWORD=... node tools/seo/indexnow-submit.mjs https://schooldhundo.in/api/v1 --all
//     once, after IndexNow is first deployed: every sitemap address
//   ADMIN_USERNAME=admin ADMIN_PASSWORD=... node tools/seo/indexnow-submit.mjs https://schooldhundo.in/api/v1
//     the addresses changed in the last 2 days, as the 7:30 AM daily run does
// Credentials come from the environment only and are never printed.

const [apiBase, flag] = process.argv.slice(2);
const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
if (!/^https?:\/\/.+\/api\/v1$/.test(apiBase ?? '') || !ADMIN_USERNAME || !ADMIN_PASSWORD || (flag && flag !== '--all')) {
  console.error('usage: ADMIN_USERNAME=… ADMIN_PASSWORD=… node tools/seo/indexnow-submit.mjs <https://host/api/v1> [--all]');
  process.exit(2);
}

const login = await fetch(`${apiBase}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
});
if (!login.ok) {
  console.error(`login failed: HTTP ${login.status}`);
  process.exit(1);
}
const { accessToken } = await login.json();
const res = await fetch(`${apiBase}/admin/seo/indexnow?all=${flag === '--all'}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
});
if (!res.ok) {
  console.error(`submission request failed: HTTP ${res.status} (an ADMIN account is needed)`);
  process.exit(1);
}
const result = await res.json();
console.log(result.message);
console.log(`addresses found: ${result.urls}, accepted: ${result.submitted}, HTTP: ${JSON.stringify(result.statuses)}`);
process.exit(result.urls > 0 && result.submitted === result.urls ? 0 : 1);
