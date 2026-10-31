import type { GenderType, SchoolSearchParams } from '../types/api';
import { AFFORDABLE_MAX_FEE, SYSTEM_GROUPS } from './boardingCollections';

/**
 * Boarding landing pages (/boarding/:page). Each one is a fixed filter over the live boarding directory with its rule
 * stated in plain words. None is a ranking: schools are listed alphabetically unless the reader chooses another order.
 */
export interface BoardingLanding {
  slug: string;
  title: string;
  /** Meta description and the line under the heading. */
  description: string;
  /** Which schools are listed, and what is left out. */
  rule: string;
  /** Fixed search filters; the reader can add a state. */
  params: Partial<SchoolSearchParams>;
  /** What families should check for this kind of school. */
  checks: string[];
  /** The gender this page is about, for its count. */
  gender?: GenderType;
  /** Shown above the list when the data behind the page is thin. */
  dataNote?: string;
}

const COMMON_CHECKS = [
  'Read the hostel rules: warden-to-student ratio, visiting days, phone and leave policy.',
  'Ask how the school handles medical care, counselling and complaints, and who to contact at night.',
  'Check the total yearly cost — tuition, boarding, mess, uniform, travel and one-time charges — in the official fee schedule.',
  'Visit if you can, including the dormitories, kitchen and washrooms, and talk to current parents.',
];

export const BOARDING_LANDINGS: BoardingLanding[] = [
  {
    slug: 'india',
    title: 'Boarding schools in India',
    description: 'Every boarding and residential school we list in India, by state: government residential schools, military schools and private boarding schools.',
    rule: 'Schools whose official website, prospectus or system record says they offer boarding. Listed alphabetically; this is not a ranking.',
    params: {},
    checks: COMMON_CHECKS,
  },
  {
    slug: 'government',
    title: 'Government boarding schools in India',
    description: 'Jawahar Navodaya Vidyalayas, Sainik Schools, Rashtriya Military Schools, RIMC, and state and tribal residential schools.',
    rule: 'Run by a central or state government or its society. Admission is usually through the system\'s own entrance exam, with eligibility rules set in each year\'s official notice.',
    params: { residentialSystem: SYSTEM_GROUPS.government.systems.join(',') },
    checks: [
      'Find the entrance exam, the entry class and the age limits in this year\'s official notice; they change from year to year.',
      'Check the reservation and domicile rules — many seats are reserved by district, state, category or for rural children.',
      'Fees and concessions are set by each system; read them in the official notice rather than on third-party sites.',
      ...COMMON_CHECKS.slice(0, 2),
    ],
  },
  {
    slug: 'private',
    title: 'Private boarding schools in India',
    description: 'Privately managed boarding schools across India, with sourced profiles, published fees and admission details.',
    rule: 'Privately managed schools whose official source describes them as boarding or residential.',
    params: { residentialSystem: SYSTEM_GROUPS.private.systems.join(',') },
    checks: COMMON_CHECKS,
  },
  {
    slug: 'boys',
    title: "Boys' boarding schools in India",
    description: 'Boarding schools whose official sources say they admit boys only.',
    rule: 'The school or its official system states that it admits boys only.',
    params: { genderType: 'BOYS' },
    gender: 'BOYS',
    checks: COMMON_CHECKS,
    dataNote: 'Many boarding records do not yet say whether the school admits boys, girls or both, so this list is incomplete. We only list a school here when a source states it.',
  },
  {
    slug: 'girls',
    title: "Girls' boarding schools in India",
    description: 'Boarding schools whose official sources say they admit girls only.',
    rule: 'The school states that it admits girls only.',
    params: { genderType: 'GIRLS' },
    gender: 'GIRLS',
    checks: [
      'Ask about the women wardens and staff on duty at night, and the rules for visitors and outings.',
      ...COMMON_CHECKS,
    ],
    dataNote: 'Many boarding records do not yet say whether the school admits boys, girls or both, so this list is incomplete. We only list a school here when a source states it.',
  },
  {
    slug: 'co-ed',
    title: 'Co-educational boarding schools in India',
    description: 'Boarding schools that admit both boys and girls.',
    rule: 'The school or its official system states that it admits boys and girls. Hostels are usually separate; check the arrangements with the school.',
    params: { genderType: 'CO_ED' },
    gender: 'CO_ED',
    checks: [
      'Ask how boys\' and girls\' hostels are separated and supervised.',
      ...COMMON_CHECKS,
    ],
  },
  {
    slug: 'affordable',
    title: 'Affordable boarding schools in India',
    description: 'Boarding schools whose official published annual fee is up to ₹1.5 lakh a year.',
    rule: `The lowest recurring annual fee in the school's official fee schedule is ₹${AFFORDABLE_MAX_FEE.toLocaleString('en-IN')} or less. Schools without a published fee schedule are not listed, even when they charge little or nothing.`,
    params: { maxAnnualFee: AFFORDABLE_MAX_FEE },
    checks: [
      'Add boarding, mess, uniform, books and travel to the tuition fee — the full yearly cost can be much higher than tuition.',
      'Government residential systems such as Navodaya Vidyalayas set their own fees and concessions; read them in the official notice.',
      'Ask about scholarships, fee concessions and instalment plans before applying.',
    ],
    dataNote: 'Few boarding schools publish a fee schedule we can cite, so this list is short. Government residential schools often charge low fees but are listed under government boarding schools until their official fee is recorded.',
  },
];

export function boardingLanding(slug: string): BoardingLanding | undefined {
  return BOARDING_LANDINGS.find((l) => l.slug === slug);
}
