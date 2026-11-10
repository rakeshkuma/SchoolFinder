import type { SchoolNetwork } from '../types/api';

/**
 * Government school networks with a directory page of their own (/network/{slug}), in the order they are presented.
 * Descriptions follow each network's own official information; `residential` separates boarding networks from
 * Kendriya Vidyalayas, which are predominantly day schools.
 */
export const NETWORK_PAGES: Record<string, { network: SchoolNetwork; intro: string; officialUrl: string; officialName: string; residential: boolean }> = {
  'jawahar-navodaya-vidyalaya': {
    network: 'JAWAHAR_NAVODAYA_VIDYALAYA',
    intro: 'Residential central government schools run by Navodaya Vidyalaya Samiti; admission to Class VI is through the JNV Selection Test. Education, boarding and lodging are free; a small Vidyalaya Vikas Nidhi contribution applies to some students in Classes IX to XII under the Samiti’s rules.',
    officialUrl: 'https://navodaya.gov.in/', officialName: 'Navodaya Vidyalaya Samiti', residential: true,
  },
  'sainik-school': {
    network: 'SAINIK_SCHOOL',
    intro: 'Residential schools run by the Sainik Schools Society under the Ministry of Defence. Admission to Classes VI and IX is through the All India Sainik Schools Entrance Examination (AISSEE); eligibility, including for girls, is set in each year’s bulletin. Fees are charged, with scholarships set by states and the Ministry.',
    officialUrl: 'https://sainikschoolsociety.in/', officialName: 'Sainik Schools Society', residential: true,
  },
  'eklavya-model-residential-school': {
    network: 'EKLAVYA_MODEL_RESIDENTIAL_SCHOOL',
    intro: 'Residential schools for Scheduled Tribe students, set up under the Ministry of Tribal Affairs and run through the National Education Society for Tribal Students (NESTS) and state societies. Admission rules and dates are set by each state.',
    officialUrl: 'https://emrs.tribal.gov.in/', officialName: 'Ministry of Tribal Affairs (EMRS)', residential: true,
  },
  'rashtriya-military-school': {
    network: 'RASHTRIYA_MILITARY_SCHOOL',
    intro: 'Residential schools under the Ministry of Defence. Admission to Classes VI and IX is through the Rashtriya Military Schools Common Entrance Test (RMS CET).',
    officialUrl: 'https://rashtriyamilitaryschools.edu.in/', officialName: 'Rashtriya Military Schools', residential: true,
  },
  'kendriya-vidyalaya': {
    network: 'KENDRIYA_VIDYALAYA',
    intro: 'Central government schools run by Kendriya Vidyalaya Sangathan under the Ministry of Education, affiliated to CBSE. They are predominantly day schools, not boarding schools.',
    officialUrl: 'https://kvsangathan.nic.in/', officialName: 'Kendriya Vidyalaya Sangathan', residential: false,
  },
};
