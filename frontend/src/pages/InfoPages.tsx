import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CONTACT_EMAIL, CREATOR_INSTITUTE, CREATOR_NAME, DISCLAIMER, INFORMATION_KINDS } from '../content/site';
import { referenceService } from '../services/publicApi';

export function AboutPage() {
  useDocumentTitle('About India School Finder');
  const sources = useApi(() => referenceService.dataSources(), []);
  return (
    <>
      <PageHeader title="About India School Finder" />
      <div className="container-page prose-page max-w-3xl py-8">
        <p>
          India School Finder is an education discovery and preparation platform designed to help parents and students explore schools
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
          India School Finder was created by {CREATOR_NAME}, an alumnus of the {CREATOR_INSTITUTE}, with the vision of making school discovery
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
          India School Finder is not affiliated with CBSE, CISCE, IIRF, Navodaya Vidyalaya Samiti, Netarhat Awasiya Vidyalaya or the Sainik
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
          <li><strong>What we keep:</strong> your name, email address, a one-way hash of your password (never the password itself), whether your email is confirmed, the optional state and city you choose, when you accepted these terms, and when you last signed in.</li>
          <li><strong>Why:</strong> to let you sign in and, later, keep your saved schools and exams across devices. Your area only sets search defaults.</li>
          <li><strong>Email:</strong> we email you only about your account — confirming your address, password resets and notices such as a password change or deletion. No marketing email unless you separately agree to it.</li>
          <li><strong>Sign-in:</strong> a secure, HttpOnly session cookie keeps you signed in; it holds a random identifier, not your details. It ends when you sign out, after two hours of inactivity, or after 30 days if you chose “Keep me signed in”.</li>
          <li><strong>Protection:</strong> passwords are stored with BCrypt; links in our emails work once and expire (24 hours to confirm an email, 30 minutes to reset a password); repeated wrong passwords lock the account for a while.</li>
          <li><strong>Your control:</strong> you can change your name, area and password, and delete your account on your account page. Deletion removes your account details at once and signs you out everywhere.</li>
          <li><strong>Children:</strong> accounts are for adults (parents, guardians and other adults). We do not ask for information about your children.</li>
          <li><strong>Continue with Google (optional, where offered):</strong> if you choose it, Google tells us your name, your email address, whether Google has verified that address, and a Google account ID; we keep the email, the name (which you can change) and the account ID, so you can sign in again. We ask Google for nothing else and do not keep Google access tokens, so we cannot read your Gmail, contacts or files. Google learns that you signed in to India School Finder, under Google’s own privacy policy. If an account with the same email exists, Google sign-in is added to it and we email you to say so. Accounts created this way have no password until you set one by email.</li>
        </ul>
        <h2 id="leaderboard">Practice leaderboard (optional)</h2>
        <p>Practice works without joining. If you join the leaderboard, as a guest or with an account:</p>
        <ul>
          <li><strong>What we keep:</strong> a nickname, your state, your city and what you prepare for if you give them, for guests an age choice (18 or older, or under 18), your choice about public listing, and your practice attempts, answers, scores, points and badges. Guests have a random key kept in their browser; we store only a hash of it.</li>
          <li><strong>Why:</strong> to work out your points, rank, streak and progress. Answers that come implausibly fast earn no points and may be reviewed for fair play: a moderator sees your nickname and the attempt, not your name or email, and can remove an attempt or hide a nickname.</li>
          <li><strong>What others see:</strong> nothing unless you opt in. You are ranked privately by default and show as “Private learner”. If you opt in, others see your nickname, state, your city only if you chose to show it, what you prepare for, and your points, tests, accuracy and streak. Your progress and badges are shown only to you. Email addresses, phone numbers and real names are never shown. Leaderboard pages are not offered to search engines.</li>
          <li><strong>Under 18:</strong> accounts are for adults, so under-18s take part as guests or on a parent’s or guardian’s account. A guest’s nickname is shown only if they state that a parent or guardian agrees, and we cannot check this. On an account, the adult who holds it decides whether the nickname is shown.</li>
          <li><strong>Your control:</strong> you can change your nickname or turn off public listing at any time on your progress page. Guests can delete their entry there, with its results and points; deleting an account removes them too.</li>
        </ul>
        <h2 id="contact">Contact form (optional)</h2>
        <ul>
          <li><strong>What we keep:</strong> your name, email address, the subject and your message.</li>
          <li><strong>Why:</strong> to read and answer your message. Staff read messages in the admin area, and they may also be sent to the site’s email inbox.</li>
          <li><strong>How long:</strong> your name and email are deleted when your message has been dealt with. The rest of the message is kept as a record, so please don’t include personal details in it.</li>
        </ul>
        <h2>What we don’t do</h2>
        <ul>
          <li>No advertising trackers and no sale of data.</li>
          <li>No marketing email by default.</li>
        </ul>
        <h2>Removal requests</h2>
        <p>To ask for a review to be removed or corrected, <Link to="/contact" className="link">contact us</Link>.</p>
        <h2>Maps</h2>
        <p>Map tiles are loaded from OpenStreetMap, which receives standard web requests (such as your IP address) when tiles are displayed.</p>
      </div>
    </>
  );
}

export function TermsPage() {
  useDocumentTitle('Terms of Service');
  return (
    <>
      <PageHeader title="Terms of Service" subtitle="Plain-language terms for using India School Finder and its optional accounts." />
      <div className="container-page prose-page max-w-3xl py-8">
        <h2>Using the site</h2>
        <ul>
          <li>India School Finder is an independent directory. Information is collected from official and public sources and linked to them; it can be out of date or incomplete. Always confirm fees, dates and eligibility with the school or the official notice before acting. See the <Link to="/disclaimer" className="link">disclaimer</Link>.</li>
          <li>Rankings and practice questions are our own work, not official rankings or exam questions.</li>
          <li>Do not misuse the site: no automated scraping that harms the service, no attempts to break its security, and no false or abusive reviews or suggestions.</li>
        </ul>
        <h2>Accounts</h2>
        <ul>
          <li>Accounts are optional and for adults (18 or older). Give your real name and an email address you control.</li>
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
          Information on India School Finder is collected from official and public sources and is provided for general guidance.
          Fees, admission schedules and eligibility rules change; always confirm with the school and the relevant state or
          central education authority before making decisions or payments.
        </p>
        <p>
          India School Finder rankings are calculated by this website using its published methodology. They are not an official
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
          India School Finder is not affiliated with CBSE, CISCE, IIRF, Navodaya Vidyalaya Samiti, Netarhat Awasiya Vidyalaya or the Sainik
          Schools Society.
        </p>
      </div>
    </>
  );
}

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="container-page py-20 text-center">
      <p className="text-5xl font-bold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-semibold">We couldn’t find that page</h1>
      <p className="mt-2 text-slate-600">The school or page may have been moved or removed.</p>
      <Link to="/schools" className="btn-primary mt-6">Browse schools</Link>
    </div>
  );
}
