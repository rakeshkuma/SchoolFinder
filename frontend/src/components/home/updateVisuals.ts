import type { HomeImageId } from '../../content/homeImages';
import type { UpdateBadge, UpdateCategory, UpdateItem } from '../../services/publicApi';
import type { IconName } from '../common/Icon';

export const UPDATE_TABS: { id: UpdateCategory | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'ADMISSION', label: 'Admissions' },
  { id: 'EXAM', label: 'Exams' },
  { id: 'PREP', label: 'Prep' },
  { id: 'JOB', label: 'Jobs' },
];

export const CATEGORY_LABEL: Record<UpdateCategory, string> = {
  ADMISSION: 'Admissions', EXAM: 'Exams', PREP: 'Exam prep', JOB: 'Jobs',
};

/** White text on each colour keeps a contrast ratio of at least 4.5:1. */
const BADGE_STYLE: Record<UpdateBadge, { label: string; className: string }> = {
  CLOSING_SOON: { label: 'Closing soon', className: 'bg-flame-700 text-white' },
  NEW: { label: 'New', className: 'bg-red-600 text-white' },
  OPEN: { label: 'Open', className: 'bg-emerald-700 text-white' },
  UPDATED: { label: 'Updated', className: 'bg-violet-600 text-white' },
  UPCOMING: { label: 'Upcoming', className: 'bg-royal-600 text-white' },
};

/** The badge the server worked out from the item's dates; "Updated 3h ago" when the change is under a day old. */
export function badgeFor(item: Pick<UpdateItem, 'badge' | 'updatedAt'>, now = Date.now()): { label: string; className: string } | null {
  if (!item.badge) return null;
  const style = BADGE_STYLE[item.badge];
  if (item.badge === 'UPDATED' && item.updatedAt) {
    const hours = Math.floor((now - new Date(item.updatedAt).getTime()) / 3_600_000);
    if (hours >= 0 && hours < 24) return { ...style, label: hours === 0 ? 'Updated just now' : `Updated ${hours}h ago` };
  }
  return style;
}

/** Exam notices show the exam's own school system; practice and other items a classroom picture. */
const EXAM_IMAGES: Record<string, HomeImageId> = {
  aissee: 'cadets-ceremony', rimc: 'cadets-ceremony', 'rms-cet': 'cadets-ceremony', jnvst: 'jnv-rangareddy', 'jnv-class-9': 'jnv-rangareddy',
  'jnv-class-11': 'jnv-rangareddy', netarhat: 'netarhat', 'kvs-admission': 'kv-hebbal',
};
const PREP_IMAGES: Record<string, HomeImageId> = { jnvst: 'reading', aissee: 'studying', netarhat: 'computer-lab' };
/** Generic pictures only (no named school), so a notice never shows another school's building. */
const CATEGORY_IMAGES: Record<UpdateCategory, HomeImageId[]> = {
  ADMISSION: ['classroom', 'teacher-class', 'hero-campus'], EXAM: ['studying', 'reading'], PREP: ['computer-lab', 'reading', 'studying', 'calculator'],
  JOB: ['teacher-classroom', 'teacher-class'],
};
/** Used when a card's own choices are already on screen. */
const SPARE_IMAGES: HomeImageId[] = ['classroom', 'studying', 'reading', 'computer-lab', 'teacher-class', 'teacher-classroom', 'calculator', 'hero-campus'];

/** The same item always gets the same picture; neighbouring items of one kind usually get different ones. */
function pick<T>(list: T[], key: string): T {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

export function updateImage(item: Pick<UpdateItem, 'category' | 'topic'> & { id?: string }): HomeImageId {
  const topic = item.topic ?? '';
  if (item.category === 'EXAM' && EXAM_IMAGES[topic]) return EXAM_IMAGES[topic];
  if (item.category === 'PREP' && PREP_IMAGES[topic]) return PREP_IMAGES[topic];
  return pick(CATEGORY_IMAGES[item.category], item.id ?? topic);
}

/**
 * Pictures for a set of cards shown together: each keeps its own choice (the exam's school system, or one for its kind)
 * unless that picture is already used above it; then the next unused one of its kind, then any unused generic one.
 */
export function assignUpdateImages(items: (Pick<UpdateItem, 'category' | 'topic'> & { id: string })[]): Map<string, HomeImageId> {
  const used = new Set<HomeImageId>();
  const out = new Map<string, HomeImageId>();
  for (const item of items) {
    const choices = [updateImage(item), ...CATEGORY_IMAGES[item.category], ...SPARE_IMAGES];
    const image = choices.find((c) => !used.has(c)) ?? choices[0];
    used.add(image);
    out.set(item.id, image);
  }
  return out;
}

/** The ticker's small icon: closing deadlines warn, new exam notices are hot, practice sets refresh. */
export function tickerIcon(item: Pick<UpdateItem, 'category' | 'badge'>): { icon: IconName; color: string } {
  if (item.badge === 'CLOSING_SOON') return { icon: 'warning', color: 'text-amber-500' };
  if (item.category === 'PREP') return item.badge === 'UPDATED' ? { icon: 'refresh', color: 'text-royal-600' } : { icon: 'file', color: 'text-indigo-500' };
  if (item.category === 'JOB') return { icon: 'megaphone', color: 'text-rose-500' };
  if (item.category === 'EXAM' && item.badge !== 'NEW' && item.badge !== 'OPEN') return { icon: 'megaphone', color: 'text-rose-500' };
  return { icon: 'fire', color: 'text-flame-500' };
}

/** Where an item leads: its page here, or (an editorial notice without one) the official source in a new tab. */
export function updateTarget(item: Pick<UpdateItem, 'linkPath' | 'sourceUrl'>): { internal: string } | { external: string } | null {
  if (item.linkPath) return { internal: item.linkPath };
  if (item.sourceUrl) return { external: item.sourceUrl };
  return null;
}

/** "nta.ac.in" for a source with no name. */
export function sourceLabel(item: Pick<UpdateItem, 'sourceName' | 'sourceUrl'>): string | null {
  if (item.sourceName) return item.sourceName;
  if (!item.sourceUrl) return null;
  try {
    return new URL(item.sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
