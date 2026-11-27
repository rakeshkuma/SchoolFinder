/**
 * Links between the JNVST pages, kept apart from the pages' content so a page that only links to another does not load
 * that page's text (the Mental Ability page's content is about 25 KB).
 */
import type { Bi } from './examPrep';

export const MENTAL_ABILITY_PATH = '/exams/jnvst/mental-ability';

/** The link to the Mental Ability page from the other JNVST pages (the server's HTML words it the same way). */
export const MENTAL_ABILITY_LINK: Bi = {
  en: 'Navodaya Mental Ability Test: question types, worked examples and official papers',
  hi: 'नवोदय मानसिक योग्यता परीक्षा: प्रश्न-प्रकार, हल किए उदाहरण और आधिकारिक प्रश्न-पत्र',
};
