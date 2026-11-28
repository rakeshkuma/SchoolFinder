import { useEffect, useRef } from 'react';
import { useConsentGranted } from '../layout/ConsentBanner';
import { PaidLabel } from './Badges';

const CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT ?? '').trim();

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function adsConfigured(): boolean {
  return /^ca-pub-\d{10,20}$/.test(CLIENT);
}

let scriptAdded = false;
function addScript() {
  if (scriptAdded) return;
  scriptAdded = true;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(CLIENT)}`;
  document.head.appendChild(s);
}

/**
 * A place for one Google AdSense unit. It renders nothing until the build has an approved publisher ID
 * (VITE_ADSENSE_CLIENT) and the visitor has accepted cookies, so the site looks the same as before until then.
 * Placements sit between content sections, labelled "Advertisement", with space around them and never next to
 * buttons, forms or navigation. Ads are never placed inside rankings, school facts or practice questions.
 */
export function AdSlot({ slot, className = '' }: { slot: string; className?: string }) {
  const granted = useConsentGranted();
  const ref = useRef<HTMLModElement>(null);
  const show = adsConfigured() && granted && /^\d{6,}$/.test(slot);
  useEffect(() => {
    if (!show || !ref.current || ref.current.dataset.adsbygoogleStatus) return;
    addScript();
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      /* an ad that cannot load leaves an empty, labelled space */
    }
  }, [show]);
  if (!show) return null;
  return (
    <aside aria-label="Advertisement" className={`my-10 ${className}`}>
      <p className="mb-1 text-center"><PaidLabel kind="Advertisement" /></p>
      <ins ref={ref} className="adsbygoogle block min-h-[100px]" data-ad-client={CLIENT} data-ad-slot={slot}
        data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}

/**
 * Ad unit IDs per placement, filled in after AdSense approval (AdSense → Ads → By ad unit). Empty: no ad there.
 * schoolProfile: below a school's tabs, above its FAQ. blogPost: after an article, before the "Search schools" box.
 */
export const AD_SLOTS: Record<'schoolProfile' | 'blogPost', string> = {
  schoolProfile: '',
  blogPost: '',
};
