import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { referenceService } from '../services/publicApi';

export function AboutPage() {
  useDocumentTitle('About us');
  const sources = useApi(() => referenceService.dataSources(), []);
  return (
    <>
      <PageHeader title="About India School Finder" />
      <div className="container-page prose-page max-w-3xl py-8">
        <p>
          India School Finder helps families discover, compare and evaluate schools across India. We focus on facts that can be
          checked: every school profile, fee schedule, admission cycle and ranking input carries a link to the source it came
          from, its verification status and the date it was last checked.
        </p>
        <h2>Our data principles</h2>
        <ul>
          <li>We never invent information. Anything not published by an official source is shown as “Not available”.</li>
          <li>Records are marked “Pending verification” until an administrator checks them against the cited source.</li>
          <li>Fees and admission dates are kept per academic year, so history is preserved.</li>
          <li>Photos are used only from official sources or with a clear licence, with credit shown.</li>
          <li>Our ranking is our own, published methodology — not an official government ranking.</li>
        </ul>
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
          Schools: if your information is missing or out of date, please <Link to="/contact" className="link">contact us</Link> with
          a link to the official source.
        </p>
      </div>
    </>
  );
}

export function ContactPage() {
  useDocumentTitle('Contact us');
  const email = import.meta.env.VITE_CONTACT_EMAIL as string | undefined;
  return (
    <>
      <PageHeader title="Contact us" />
      <div className="container-page prose-page max-w-3xl py-8">
        <p>
          <strong>To update or correct a school&apos;s profile</strong> (fees, admission dates, classes, contact details or a
          mistake), use the <Link to="/suggest" className="link">suggest an update</Link> form and link the official page
          that states it. An editor checks every suggestion before anything changes.
        </p>
        <p>For anything else, email us.</p>
        {email ? (
          <p><a href={`mailto:${email}`} className="btn-primary">Email {email}</a></p>
        ) : (
          <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">The contact address has not been configured for this deployment.</p>
        )}
        <p className="text-sm">
          We deliberately don’t use a contact form, so we don’t store your personal details. Please don’t send information about
          your children that we don’t need.
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
