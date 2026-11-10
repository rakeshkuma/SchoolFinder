/** The site's creator and contact details, as supplied by the creator. Nothing here may be added to or guessed. */
export const CONTACT_EMAIL = 'rakeshsingh.iiita@gmail.com';
export const CREATOR_NAME = 'Rakesh Kumar';
export const CREATOR_INSTITUTE = 'Indian Institute of Information Technology, Allahabad';

export const DISCLAIMER = 'SchoolDhundo is an independent school discovery and educational preparation platform. School information and '
  + 'rankings are presented with their respective sources where available. Parents and students should verify important admission, fee and '
  + 'examination details with the relevant official institution.';

/** How each kind of information on the site is told apart. */
export const INFORMATION_KINDS: { title: string; text: string }[] = [
  { title: 'Official school information', text: 'Taken from government records and school sources, with the link and the date it was checked.' },
  { title: 'Third-party rankings', text: 'Published by other organisations, shown under their name and year, and kept apart from our own score.' },
  { title: 'User-submitted information', text: 'Reviews and suggested updates come from visitors. An editor checks them before they appear.' },
  { title: 'Original practice questions', text: 'Written by SchoolDhundo for practice. They are not official exam questions.' },
  { title: 'Official previous-year papers', text: 'Linked at their official source. We do not republish them.' },
];
