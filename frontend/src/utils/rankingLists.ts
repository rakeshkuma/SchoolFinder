import type { ExternalRanking, ExternalRankingListItem, RankingPublisherKind } from '../types/api';

export const publisherKindLabel: Record<RankingPublisherKind, string> = {
  SURVEY: 'Survey rankings',
  AWARD: 'Awards',
  GREEN: 'Green school ratings',
  OTHER: 'Other',
};

/** "EducationWorld · India School Rankings 2025-26 · Day schools · Delhi" */
export function listTitle(e: ExternalRanking): string {
  return [e.publisher, `${e.rankingName} ${e.rankingYear}`, e.category, e.region].filter(Boolean).join(' · ');
}

/** Entries arrive grouped by list and in rank order; positions only compare within one list. */
export function groupByList(items: ExternalRankingListItem[]): { title: string; items: ExternalRankingListItem[] }[] {
  const groups = new Map<string, ExternalRankingListItem[]>();
  for (const item of items) {
    const key = listTitle(item.entry);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].map(([title, list]) => ({ title, items: list }));
}
