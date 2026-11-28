import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../../content/site';

/**
 * How to reach SchoolDhundo in running text: the site's own email address once one is set up, otherwise the contact
 * form (no personal address is published on the site).
 */
export function ContactLink({ className = 'link break-all', formLabel = 'our contact form' }: { className?: string; formLabel?: string }) {
  return CONTACT_EMAIL
    ? <a href={`mailto:${CONTACT_EMAIL}`} className={className}>{CONTACT_EMAIL}</a>
    : <Link to="/contact" className={className}>{formLabel}</Link>;
}
