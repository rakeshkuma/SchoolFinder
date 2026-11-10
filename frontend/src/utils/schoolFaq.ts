import type { SchoolDetail } from '../types/api';
import { genderLabel, managementLabel, schoolTypeLabel } from './format';

export interface Faq {
  question: string;
  answer: string;
}

/**
 * Questions parents search for, answered only from the school's own record. A question is left out when its source
 * publishes no answer — nothing is guessed, and fees and admission dates stay on their tabs with their sources.
 */
export function schoolFaqs(s: SchoolDetail): Faq[] {
  const faqs: Faq[] = [];
  const place = [s.city, s.district?.name ? `${s.district.name} district` : null, s.stateName].filter(Boolean).join(', ');

  if (s.board) {
    faqs.push({
      question: `Which board is ${s.name} affiliated to?`,
      answer: `${s.name} is affiliated to ${s.board.name}${s.affiliationNumber ? ` (affiliation number ${s.affiliationNumber})` : ''}, according to its listed source.`,
    });
  }
  if (s.classesOffered.length) {
    const first = s.classesOffered[0].name;
    const last = s.classesOffered[s.classesOffered.length - 1].name;
    faqs.push({
      question: `Which classes does ${s.name} have?`,
      answer: first === last ? `Its source lists ${first}.` : `Its source lists classes from ${first} to ${last}.`,
    });
  } else if (s.affiliatedUpTo) {
    faqs.push({
      question: `Up to which class does ${s.name} teach?`,
      answer: `${s.board?.code ?? 'Its board'} affiliates it up to ${s.affiliatedUpTo}. The lowest class it admits is not published in that record; check with the school.`,
    });
  }
  if (s.addressLine || place) {
    faqs.push({
      question: `Where is ${s.name}?`,
      answer: [s.addressLine, place, s.pinCode ? `PIN ${s.pinCode}` : null].filter(Boolean).join(', ') + '.',
    });
  }
  if (s.management) {
    const kind = (s.management === 'OTHER' ? schoolTypeLabel[s.schoolType] : managementLabel[s.management]).toLowerCase();
    const gender = s.genderType === 'CO_ED' ? `, ${genderLabel.CO_ED.toLowerCase()}` : s.genderType ? `, for ${genderLabel[s.genderType].toLowerCase()}` : '';
    const medium = s.mediumOfInstruction ? `, teaching in ${s.mediumOfInstruction}` : '';
    faqs.push({
      question: `Is ${s.name} a government or private school?`,
      answer: `${s.name} is listed as a ${kind} school${gender}${medium}.`,
    });
  }
  if (s.hasHostel !== null) {
    faqs.push({
      question: `Does ${s.name} have a hostel?`,
      answer: s.hasHostel ? 'Yes. Its source says boarding (hostel) is available; see the Boarding tab where details are published.'
        : 'No. Its source lists it as a day school.',
    });
  }
  if (s.admissionPortalUrl || s.websiteUrl) {
    faqs.push({
      question: `How do I apply for admission to ${s.name}?`,
      answer: s.admissionPortalUrl
        ? `Applications go through the school's admission portal (${s.admissionPortalUrl}). Dates and documents, where published, are on the Admissions tab.`
        : `Check the school's official website (${s.websiteUrl}) for its admission notice. Dates and documents, where published, are on the Admissions tab.`,
    });
  }
  const contact = [s.phone ? `phone ${s.phone}` : null, s.email ? `email ${s.email}` : null].filter(Boolean);
  if (contact.length) {
    faqs.push({
      question: `How can I contact ${s.name}?`,
      answer: `The school lists ${contact.join(' and ')}${s.websiteUrl ? `, and its website is ${s.websiteUrl}` : ''}.`,
    });
  }
  return faqs;
}
