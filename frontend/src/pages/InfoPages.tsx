import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CONTACT_EMAIL, CREATOR_INSTITUTE, CREATOR_NAME, DISCLAIMER, INFORMATION_KINDS } from '../content/site';
import { referenceService } from '../services/publicApi';

export function AboutPage() {
  useDocumentTitle('About SchoolDhundo');
  const sources = useApi(() => referenceService.dataSources(), []);
  return (
    <>
      <PageHeader title="About SchoolDhundo" />
      <div className="container-page prose-page max-w-3xl py-8">
        <p>
          SchoolDhundo is an education discovery and preparation platform designed to help parents and students explore schools
          across India.
        </p>
        <p>
          Our goal is to make school information easier to discover, compare and understand. The platform brings together school profiles,
          locations, facilities, admission information, rankings and educational resources.
        </p>
        <p>
          We also aim to support students through entrance examination preparation, mock tests, daily quizzes, practice questions and
          learning progress tracking.
        </p>
        <p>
          SchoolDhundo was created by {CREATOR_NAME}, an alumnus of the {CREATOR_INSTITUTE}, with the vision of making school discovery
          and educational resources more accessible across India.
        </p>
        <section className="not-prose my-6 rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="creator-heading">
          <h2 id="creator-heading" className="font-display text-lg font-bold text-ink">Website created by {CREATOR_NAME}</h2>
          <p className="mt-1 text-slate-700">{CREATOR_INSTITUTE}</p>
          <p className="mt-1 text-slate-700">Contact: <a href={`mailto:${CONTACT_EMAIL}`} className="link break-all">{CONTACT_EMAIL}</a></p>
        </section>
        <h2>Our data principles</h2>
        <ul>
          <li>We never invent information. Anything not published by an official source is shown as “Not available”.</li>
          <li>Records are marked “Pending verification” until an administrator checks them against the cited source.</li>
          <li>Fees and admission dates are kept per academic year, so history is preserved.</li>
          <li>Photos are used only from official sources or with a clear licence, with credit shown.</li>
          <li>Our ranking is our own, published methodology — not an official government ranking.</li>
        </ul>
        <h2>How we label information</h2>
        <ul>
          {INFORMATION_KINDS.map((k) => <li key={k.title}><strong>{k.title}:</strong> {k.text}</li>)}
        </ul>
        <p>{DISCLAIMER}</p>
        <p>
          SchoolDhundo is not affiliated with CBSE, CISCE, IIRF, Navodaya Vidyalaya Samiti, Netarhat Awasiya Vidyalaya or the Sainik
          Schools Society.
        </p>
        <h2>Primary sources</h2>
        <AsyncContent state={sources}>
          {(list) => (
            <ul>
              {list.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="link">{s.name}</a>
                  {s.description && <> — {s.description}</>}
                </li>
              ))}
            </ul>
          )}
        </AsyncContent>
        <p>
          Schools: if your information is missing or out of date, please <Link to="/contact?topic=LISTING" className="link">contact us</Link> with
          a link to the official source.
        </p>
      </div>
    </>
  );
}

export function PrivacyPage() {
  useDocumentTitle('Privacy policy');
  return (
    <>
      <PageHeader title="Privacy policy" />
      <div className="container-page prose-page max-w-3xl py-8">
        <h2>What we collect</h2>
        <ul>
          <li><strong>Reviews:</strong> your rating, review text, relationship to the school and an optional display name. We don’t collect email addresses, phone numbers, IP-linked profiles or children’s details.</li>
          <li><strong>Consent:</strong> a review is stored only if you confirm it may be published. It is published after moderation.</li>
          <li><strong>Suggested updates:</strong> the school, what should change, the link to the official page and whether you are from the school or a parent. Your e-mail address is optional, used only to reply to you, and deleted as soon as an editor has handled the suggestion.</li>
          <li><strong>Location:</strong> “Schools near me” uses your browser’s location only to search; it isn’t stored. Distances on the compare page are worked out in your browser, and your location is not sent to us.</li>
          <li><strong>Shared links:</strong> a shared comparison or shortlist link contains only school numbers, nothing about you.</li>
          <li><strong>Browser storage:</strong> your comparison list, saved schools, saved exams, recently viewed schools and recent searches (which you can clear or pause) are kept in your own browser (localStorage) and never sent to us.</li>
        </ul>
        <h2 id="accounts">Accounts (optional)</h2>
        <p>You can use the whole site without an account. If you create one:</p>
        <ul>
          <li><strong>What we keep:</strong> your name, email address, your mobile number if you choose to give it, a one-way hash of your password (never the password itself), whether your email is confirmed, the optional state and city you choose, when you accepted these terms, and when you last signed in.</li>
          <li><strong>Why:</strong> to let you sign in and, later, keep your saved schools and exams across devices. Your area only sets search defaults.</li>
          <li><strong>Email:</strong> we email you only about your account — confirming your address, password resets and notices such as a password change or deletion. No marketing email unless you separately agree to it.</li>
          <li><strong>Sign-in:</strong> a secure, HttpOnly session cookie keeps you signed in; it holds a random identifier, not your details. It ends when you sign out, after two hours of inactivity, or after 30 days if you chose “Keep me signed in”.</li>
          <li><strong>Protection:</strong> passwords are stored with BCrypt; links in our emails work once and expire (24 hours to confirm an email, 30 minutes to reset a password); repeated wrong passwords lock the account for a while.</li>
          <li><strong>Your control:</strong> you can change your name, area, mobile number and password, and delete your account on your account page. Deletion removes your account details at once and signs you out everywhere.</li>
          <li><strong>Children:</strong> accounts are open to all ages. If you are under 18, please ask a parent or guardian before creating one. Parents do not need to give us information about their children.</li>
          <li><strong>Continue with Google (optional, where offered):</strong> if you choose it, Google tells us your name, your email address, whether Google has verified that address, a Google account ID and the address of your Google profile photo; we keep the email, the name (which you can change), the account ID and the photo address (refreshed each time you sign in with Google, and shown only to you in your account menu), so you can sign in again. We ask Google for nothing else and do not keep Google access tokens, so we cannot read your Gmail, contacts or files. Google learns that you signed in to SchoolDhundo, under Google’s own privacy policy. If an account with the same email exists, Google sign-in is added to it and we email you to say so. Accounts created this way have no password until you set one by email.</li>
        </ul>
        <h2 id="leaderboard">Practice leaderboard (optional)</h2>
        <p>Practice works without joining. If you join the leaderboard, as a guest or with an account:</p>
        <ul>
          <li><strong>What we keep:</strong> a nickname, your state, your city and what you prepare for if you give them, an age choice (18 or older, or under 18), your choice about public listing, and your practice attempts, answers, scores, points and badges. Guests have a random key kept in their browser; we store only a hash of it.</li>
          <li><strong>Why:</strong> to work out your points, rank, streak and progress. Answers that come implausibly fast earn no points and may be reviewed for fair play: a moderator sees your nickname and the attempt, not your name or email, and can remove an attempt or hide a nickname.</li>
          <li><strong>What others see:</strong> nothing unless you opt in. You are ranked privately by default and show as “Private learner”. If you opt in, others see your nickname, state, your city only if you chose to show it, what you prepare for, and your points, tests, accuracy and streak. Your progress and badges are shown only to you. Email addresses, phone numbers and real names are never shown. Leaderboard pages are not offered to search engines.</li>
          <li><strong>Under 18:</strong> anyone can take part, with an account or as a guest. An under-18’s nickname is shown only if they state that a parent or guardian agrees, and we cannot check this. Otherwise they are ranked privately.</li>
          <li><strong>Your control:</strong> you can change your nickname or turn off public listing at any time on your progress page. Guests can delete their entry there, with its results and points; deleting an account removes them too.</li>
        </ul>
        <h2 id="contact">Contact form (optional)</h2>
        <ul>
          <li><strong>What we keep:</strong> your name, email address, the subject and your message.</li>
          <li><strong>Why:</strong> to read and answer your message. Staff read messages in the admin area, and they may also be sent to the site’s email inbox.</li>
          <li><strong>How long:</strong> your name and email are deleted when your message has been dealt with. The rest of the message is kept as a record, so please don’t include personal details in it.</li>
        </ul>
        <h2 id="analytics">Cookies and analytics</h2>
        <ul>
          <li><strong>Needed cookies:</strong> signed-in members get the session cookie described above, and forms use a security (CSRF) cookie. These are needed for the site to work and are not used for tracking.</li>
          <li><strong>Google Analytics (only if you accept):</strong> where enabled, a banner asks whether we may use Google Analytics. If you accept, Google Analytics sets cookies and records pages viewed and actions such as searching for schools, opening a school profile, comparing schools, starting or finishing a practice quiz and signing up, together with your browser, device and approximate location as Google works them out. We use this only to understand which pages help families. We never send your name, email, mobile number, answers, passwords or sign-in details to Google Analytics, IP addresses are anonymised, and advertising features are turned off. If you decline, nothing is sent. You can change your choice under “Cookie settings” at the bottom of every page.</li>
          <li><strong>Advertising:</strong> the site shows no advertisements today. If it does later (for example Google AdSense), ads will be shown only after you agree to cookies, will be labelled “Advertisement”, will be kept apart from school information and rankings, and this policy will be updated first.</li>
        </ul>
        <h2>Who else processes data</h2>
        <ul>
          <li><strong>Hosting:</strong> the site and its database run on servers rented from Oracle Cloud in Mumbai, India.</li>
          <li><strong>Google:</strong> only if you use “Continue with Google” or accept analytics, as described above.</li>
          <li><strong>Email:</strong> account emails are sent through an email delivery service once one is set up; it receives the address and the message.</li>
          <li><strong>Maps:</strong> map tiles are loaded from OpenStreetMap, which receives standard web requests (such as your IP address) when tiles are displayed.</li>
        </ul>
        <h2>How long we keep information</h2>
        <ul>
          <li>Account details: until you delete the account. Email links expire as described above and are cleared after a week.</li>
          <li>Contact messages and suggestions: your name and email are deleted once the message has been dealt with.</li>
          <li>Backups: the database is backed up every night and each backup is kept for seven days, so deleted information disappears from backups within about a week.</li>
          <li>A record that an account was deleted, without your name or email, is kept in our administration log.</li>
        </ul>
        <p>How to delete your account or other information: see <Link to="/data-deletion" className="link">Account and data deletion</Link>.</p>
        <h2>What we don’t do</h2>
        <ul>
          <li>No sale of data.</li>
          <li>No marketing email by default.</li>
        </ul>
        <h2>Removal requests and questions</h2>
        <p>
          To ask for a review to be removed or corrected, or with any question about your information,{' '}
          <Link to="/contact" className="link">contact us</Link> or email <a href={`mailto:${CONTACT_EMAIL}`} className="link break-all">{CONTACT_EMAIL}</a>.
        </p>
        <p className="text-sm text-slate-500">Last updated: 10 November 2026.</p>
      </div>
    </>
  );
}

export function TermsPage() {
  useDocumentTitle('Terms of Service');
  return (
    <>
      <PageHeader title="Terms of Service" subtitle="Plain-language terms for using SchoolDhundo and its optional accounts." />
      <div className="container-page prose-page max-w-3xl py-8">
        <h2>Using the site</h2>
        <ul>
          <li>SchoolDhundo is an independent directory. Information is collected from official and public sources and linked to them; it can be out of date or incomplete. Always confirm fees, dates and eligibility with the school or the official notice before acting. See the <Link to="/disclaimer" className="link">disclaimer</Link>.</li>
          <li>Rankings and practice questions are our own work, not official rankings or exam questions.</li>
          <li>Do not misuse the site: no automated scraping that harms the service, no attempts to break its security, and no false or abusive reviews or suggestions.</li>
        </ul>
        <h2>Accounts</h2>
        <ul>
          <li>Accounts are optional and open to all ages. If you are under 18, please ask a parent or guardian first. Give your real name and an email address you control.</li>
          <li>Keep your password to yourself and choose one you do not use elsewhere. Tell us if you think someone else has used your account.</li>
          <li>You can delete your account at any time from your account page. We may suspend accounts used to break these terms.</li>
          <li>How we handle account information is described in the <Link to="/privacy#accounts" className="link">Privacy Policy</Link>.</li>
        </ul>
        <h2>Changes</h2>
        <p>If these terms change in a way that matters, we will say so on this page and ask account holders to accept the new version. This version took effect on 27 October 2026.</p>
        <h2>Contact</h2>
        <p>Questions about these terms: <Link to="/contact" className="link">contact us</Link>.</p>
      </div>
    </>
  );
}

export function DisclaimerPage() {
  useDocumentTitle('Disclaimer');
  return (
    <>
      <PageHeader title="Disclaimer" />
      <div className="container-page prose-page max-w-3xl py-8">
        <p>{DISCLAIMER}</p>
        <p>
          Information on SchoolDhundo is collected from official and public sources and is provided for general guidance.
          Fees, admission schedules and eligibility rules change; always confirm with the school and the relevant state or
          central education authority before making decisions or payments.
        </p>
        <p>
          SchoolDhundo rankings are calculated by this website using its published methodology. They are not an official
          ranking by any government body, education board or school, and are not endorsed by them. Independently published
          rankings are shown separately and belong to their publishers.
        </p>
        <p>
          School names, logos and photographs belong to their respective owners and are shown for identification, with credit,
          under the licence or permission stated next to each image.
        </p>
        <h2>How we label information</h2>
        <ul>
          {INFORMATION_KINDS.map((k) => <li key={k.title}><strong>{k.title}:</strong> {k.text}</li>)}
        </ul>
        <p>
          SchoolDhundo is not affiliated with CBSE, CISCE, IIRF, Navodaya Vidyalaya Samiti, Netarhat Awasiya Vidyalaya or the Sainik
          Schools Society.
        </p>
      </div>
    </>
  );
}

export function EditorialPolicyPage() {
  useDocumentTitle('Editorial policy', 'How SchoolDhundo chooses sources, checks school information, presents published rankings and writes its own practice questions.');
  return (
    <>
      <PageHeader title="Editorial policy" subtitle="How we choose, check and present information." />
      <div className="container-page prose-page max-w-3xl py-8">
        <h2>Sources come first</h2>
        <ul>
          <li>School facts come from official and public sources: education boards (for example the CBSE affiliation directory, SARAS), government bodies, and schools’ own websites and notices. Each profile links to its source and shows when it was retrieved.</li>
          <li>We never invent information. A fact no official source publishes is shown as “Not available”, not guessed.</li>
          <li>Records stay marked “Pending verification” until an administrator has checked them against the cited source.</li>
          <li>Fees and admission dates are kept per academic year and linked to the notice they come from.</li>
          <li>Photos are used only from official sources or under a clear licence, with credit shown next to each image.</li>
        </ul>
        <h2>Rankings</h2>
        <ul>
          <li>Rankings published by other organisations are shown with the publisher’s name, the year and the publisher’s own rank, and checked against the publisher’s list. They belong to their publishers.</li>
          <li>Where a publisher says its list is not a ranking (for example an A-to-Z list), we show it as a list, not as ranks.</li>
          <li>Our own SchoolDhundo score is calculated from source-linked evidence using a <Link to="/rankings/methodology" className="link">published methodology</Link> and is always kept apart from published rankings. It is not an official ranking.</li>
          <li>Rankings and scores cannot be bought. No payment changes a school’s rank, score or the facts on its profile.</li>
        </ul>
        <h2>Practice questions and articles</h2>
        <ul>
          <li>Practice questions and mock tests are written by SchoolDhundo for practice. They are not official exam questions, and we say so on every test. Officially published papers are linked to the conducting body’s own site.</li>
          <li>Guides and blog articles are written to help families and are dated. Exam dates and rules are always checked against the official notice, which is linked.</li>
        </ul>
        <h2>Advertising and sponsored content</h2>
        <ul>
          <li>The site shows no advertisements today. If advertising or sponsored listings are added, they will be clearly labelled “Advertisement” or “Sponsored”, kept apart from school facts and rankings, and will never change them.</li>
          <li>We do not promise or guarantee admission to any school.</li>
        </ul>
        <h2>Independence</h2>
        <p>
          SchoolDhundo is independent. It is not affiliated with or endorsed by any school, education board, ranking publisher or government
          body, and listing a school does not mean the school endorses this site.
        </p>
        <p>Found a mistake? See our <Link to="/corrections-policy" className="link">corrections policy</Link>.</p>
      </div>
    </>
  );
}

export function CorrectionsPolicyPage() {
  useDocumentTitle('Corrections policy', 'How to report a mistake on SchoolDhundo and how corrections are checked and shown.');
  return (
    <>
      <PageHeader title="Corrections policy" subtitle="Help us keep every listing accurate." />
      <div className="container-page prose-page max-w-3xl py-8">
        <h2>How to report a mistake</h2>
        <ul>
          <li>On a school profile, use <strong>Report incorrect information</strong> (in the “Data sources” box), or <Link to="/contact?topic=CORRECTION" className="link">contact us</Link> and choose “Report incorrect information”.</li>
          <li>Tell us what is wrong and, if you can, give a link to the official page that shows the correct information (the school’s website, an admission notice or the board’s directory).</li>
          <li>Schools can also <Link to="/contact?topic=LISTING" className="link">send their information</Link> with a link to where they publish it.</li>
        </ul>
        <h2>How we check it</h2>
        <ul>
          <li>An editor compares the report with the official source. We change a fact only when an official or clearly reliable source supports the change, so we may ask for a link.</li>
          <li>When a fact is corrected, the profile shows the new source and the date it was checked.</li>
          <li>Mistakes in our own practice questions can be reported from the question itself; we fix the question or its explanation.</li>
          <li>Rankings published by others are shown as their publishers published them. If a publisher corrects its list, we update ours.</li>
        </ul>
        <h2>Reviews</h2>
        <p>To ask for a review to be removed or corrected, <Link to="/contact" className="link">contact us</Link> with the school and the review.</p>
        <p>Questions: <a href={`mailto:${CONTACT_EMAIL}`} className="link break-all">{CONTACT_EMAIL}</a>.</p>
      </div>
    </>
  );
}

export function DataDeletionPage() {
  useDocumentTitle('Account and data deletion', 'How to delete your SchoolDhundo account or other information, what is removed and what is kept.');
  return (
    <>
      <PageHeader title="Account and data deletion" subtitle="You can delete your account and your information yourself." />
      <div className="container-page prose-page max-w-3xl py-8">
        <h2>Delete your account</h2>
        <ol>
          <li>Sign in and open <Link to="/account" className="link">My Account</Link>.</li>
          <li>Find “Delete account” at the bottom of the page.</li>
          <li>Confirm with your password. If you signed up with Google and have no password, type your email address; if you signed in more than a short while ago, you will be asked to sign in with Google again first.</li>
        </ol>
        <p>Deletion happens at once. You are signed out on every device and we email you to confirm.</p>
        <h2>What is deleted</h2>
        <ul>
          <li>Your account details: name, email address, mobile number, area, password hash, Google account ID and profile photo address.</li>
          <li>Your sign-in links and sessions.</li>
          <li>Your practice attempts, saved exams and bookmarked questions, and your leaderboard entry with its results and points.</li>
        </ul>
        <h2>What is kept</h2>
        <ul>
          <li>A note in our administration log that an account was deleted, without your name or email.</li>
          <li>Nightly database backups are kept for seven days, so your information disappears from them within about a week.</li>
          <li>Reports you sent about practice questions stay, so the questions can be fixed, but are no longer linked to you.</li>
          <li>School reviews are not linked to accounts; ask us if you want one removed.</li>
        </ul>
        <h2>Other information</h2>
        <ul>
          <li><strong>Guest leaderboard entry:</strong> delete it on your practice progress page.</li>
          <li><strong>Saved schools, comparisons and recent searches</strong> are kept only in your browser; clear them on the pages where they appear or by clearing this site’s data in your browser.</li>
          <li><strong>Contact messages and suggestions:</strong> your name and email are deleted once we have dealt with them. To ask for earlier deletion, contact us.</li>
          <li><strong>Google:</strong> to stop SchoolDhundo’s access to your Google sign-in, remove it at <a href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer" className="link">myaccount.google.com/connections</a>. We do not keep Google access tokens.</li>
          <li><strong>Analytics:</strong> choose “Cookie settings” at the bottom of any page and decline.</li>
        </ul>
        <p>
          If you cannot sign in, or want help, email <a href={`mailto:${CONTACT_EMAIL}`} className="link break-all">{CONTACT_EMAIL}</a> from the
          address on your account. See also the <Link to="/privacy" className="link">Privacy Policy</Link>.
        </p>
      </div>
    </>
  );
}

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  // Not a page to index, also for crawlers that render the app.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  return (
    <div className="container-page py-20 text-center">
      <p className="text-5xl font-bold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-semibold">We couldn’t find that page</h1>
      <p className="mt-2 text-slate-600">The school or page may have been moved or removed.</p>
      <Link to="/schools" className="btn-primary mt-6">Browse schools</Link>
    </div>
  );
}
