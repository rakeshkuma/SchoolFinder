// node --test tools/seo/link-check.test.mjs  (no network: only the page and robots.txt readers are tested)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRobots, readPage, robotsAllows } from './link-check.mjs';

test('a link to the site is found with its words and rel; a link inside a script is not a link', () => {
  const html = `<html><head><title>Free JNVST resources</title>
    <meta property="article:published_time" content="2026-07-01T10:00:00+05:30"></head>
    <body><p>Practice at <a href="https://www.schooldhundo.in/exams/jnvst" rel="nofollow noopener">SchoolDhundo JNVST</a>.</p>
    <a href="/contact-us/">Contact us</a> <a href="mailto:editor@example.org?subject=Hi">Mail</a>
    <a href="https://ncert.nic.in/">NCERT</a><a href="https://twitter.com/x">X</a>
    <script>var a = '<a href="https://schooldhundo.in/hidden">x</a>';</script>
    <p>We also like School Dhundo for school lists.</p></body></html>`;
  const page = readPage(html, 'https://resources.example.org/list/', 'schooldhundo.in');
  assert.equal(page.title, 'Free JNVST resources');
  assert.equal(page.published, '2026-07-01T10:00:00+05:30');
  assert.deepEqual(page.linksToSite, [{ href: 'https://www.schooldhundo.in/exams/jnvst', anchor: 'SchoolDhundo JNVST', rel: 'nofollow noopener' }]);
  // "SchoolDhundo" in the link's words and "School Dhundo" in the text.
  assert.equal(page.mentions, 2);
  assert.deepEqual(page.emails, ['editor@example.org']);
  assert.ok(page.contactLinks.includes('https://resources.example.org/contact-us/'));
  assert.ok(page.externalDomains.includes('ncert.nic.in'));
  assert.ok(!page.externalDomains.includes('schooldhundo.in'));
});

test('a page with no link to the site says so, which is how a removed link shows up', () => {
  const page = readPage('<title>Old list</title><a href="https://example.com/">Elsewhere</a>', 'https://blog.example.net/', 'schooldhundo.in');
  assert.deepEqual(page.linksToSite, []);
  assert.equal(page.mentions, 0);
});

test('robots.txt: the most specific rule wins, Allow wins a tie, $ anchors the end', () => {
  const rules = { allow: ['/blog/free/'], disallow: ['/blog/', '/*.pdf$'], delay: 0 };
  assert.equal(robotsAllows(rules, '/blog/post'), false);
  assert.equal(robotsAllows(rules, '/blog/free/list'), true);
  assert.equal(robotsAllows(rules, '/files/a.pdf'), false);
  assert.equal(robotsAllows(rules, '/files/a.pdf?x=1'), true);
  assert.equal(robotsAllows({ allow: [], disallow: [], delay: 0 }, '/anything'), true);
});

test('robots.txt groups: this tool\'s own group first, otherwise "*", and a crawl delay of at most 10 s', () => {
  const both = 'User-agent: *\nDisallow: /private/\n\nUser-agent: LinkCheck\nDisallow: /\nAllow: /public/\nCrawl-delay: 30';
  assert.deepEqual(parseRobots(both), { allow: ['/public/'], disallow: ['/'], delay: 10 });
  assert.deepEqual(parseRobots('User-agent: *\nDisallow: /private/ # staff only'), { allow: [], disallow: ['/private/'], delay: 0 });
});
