import { useState } from 'react';
import { Icon } from './Icon';

/**
 * "Share on WhatsApp" and "Copy link" for a page whose state is in its URL (a comparison, a shortlist). WhatsApp is
 * how most families in India pass school shortlists around; the link needs no account on either side.
 */
export function ShareLinkButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the link is still in the address bar */
    }
  };
  return (
    <>
      <a className="btn-primary rounded-full px-4 py-2 text-sm" target="_blank" rel="noopener noreferrer"
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}>
        <Icon name="share" className="h-4 w-4" /> Share on WhatsApp
      </a>
      <button type="button" className="btn-secondary rounded-full px-4 py-2 text-sm" onClick={copy} aria-live="polite">
        <Icon name="link" className="h-4 w-4" /> {copied ? 'Link copied' : 'Copy link'}
      </button>
    </>
  );
}
