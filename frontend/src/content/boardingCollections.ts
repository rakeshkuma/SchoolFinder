import type { ResidentialSystem } from '../types/api';

/**
 * Boarding-directory collections. Each is a saved filter over the live directory with its eligibility stated; none is
 * a ranking, and a school appears in every collection it qualifies for as the same record.
 */
export const SYSTEM_GROUPS: Record<string, { label: string; systems: ResidentialSystem[] }> = {
  government: {
    label: 'Government residential',
    systems: ['NAVODAYA', 'SAINIK', 'MILITARY_SCHOOL', 'MILITARY_COLLEGE', 'STATE_RESIDENTIAL', 'TRIBAL_RESIDENTIAL'],
  },
  defence: { label: 'Military & defence', systems: ['SAINIK', 'MILITARY_SCHOOL', 'MILITARY_COLLEGE'] },
  private: { label: 'Private boarding', systems: ['PRIVATE_BOARDING'] },
};

export interface BoardingCollection {
  id: string;
  title: string;
  /** Who qualifies, in plain words. */
  eligibility: string;
  /** Directory URL parameters that select the collection. */
  params: Record<string, string>;
}

export const AFFORDABLE_MAX_FEE = 150000;

export const BOARDING_COLLECTIONS: BoardingCollection[] = [
  {
    id: 'government', title: 'Government residential schools', params: { system: 'government' },
    eligibility: 'Run by a central or state government or its society: Jawahar Navodaya Vidyalayas, Sainik Schools, Rashtriya Military Schools, RIMC, and state and tribal residential schools.',
  },
  {
    id: 'defence', title: 'Military and defence-oriented schools', params: { system: 'defence' },
    eligibility: 'Sainik Schools, Rashtriya Military Schools and RIMC. Each has its own entrance exam and eligibility rules.',
  },
  {
    id: 'private', title: 'Private boarding schools', params: { system: 'private' },
    eligibility: 'Privately managed schools whose official source describes them as boarding or residential.',
  },
  {
    id: 'affordable', title: 'Affordable boarding (official fee up to ₹1.5 lakh a year)', params: { maxFee: String(AFFORDABLE_MAX_FEE) },
    eligibility: 'Lowest official recurring annual fee published by the school is ₹1,50,000 or less. Schools without published fee records are not listed, even when they are free.',
  },
  { id: 'cbse', title: 'CBSE boarding schools', params: { board: 'CBSE' }, eligibility: 'Affiliated to CBSE as recorded by the board or the school.' },
  { id: 'cisce', title: 'ICSE/ISC (CISCE) boarding schools', params: { board: 'CISCE' }, eligibility: 'Affiliated to the Council for the Indian School Certificate Examinations.' },
  { id: 'ib', title: 'International-curriculum boarding schools', params: { board: 'IB' }, eligibility: 'Recorded as International Baccalaureate schools.' },
  { id: 'boys', title: "Boys' boarding schools", params: { gender: 'BOYS' }, eligibility: 'The school or its official system states that it admits boys only.' },
  { id: 'girls', title: "Girls' boarding schools", params: { gender: 'GIRLS' }, eligibility: 'The school states that it admits girls only.' },
  { id: 'coed', title: 'Co-educational boarding schools', params: { gender: 'CO_ED' }, eligibility: 'The school or its official system states that it admits boys and girls.' },
  {
    id: 'middle', title: 'Boarding schools with Class VI', params: { className: 'VI' },
    eligibility: 'Offer Class VI according to their published class list. Many records do not list classes yet, so this list is incomplete.',
  },
  {
    id: 'senior', title: 'Boarding schools with Class XI', params: { className: 'XI' },
    eligibility: 'Offer Class XI according to their published class list. Many records do not list classes yet, so this list is incomplete.',
  },
  {
    id: 'sports', title: 'Boarding schools with documented sports facilities', params: { facility: 'SPORTS' },
    eligibility: 'A cited source documents sports facilities. This shows what is documented, not their quality.',
  },
];
