import { useEffect, useState } from 'react';
import { HomeHero } from '../components/home/HomeHero';
import {
  ExploreCategories, FeaturedSchools, GrowSection, HomeExamPrep, HomeRankings, PhotoCredits, pickFeatured, TrendingNow,
  type PracticeCounts,
} from '../components/home/HomeSections';
import { HomeUpdates, LiveTicker } from '../components/home/HomeUpdates';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { blogService } from '../services/blogApi';
import {
  directoryService, practiceService, rankingService, referenceService, schoolService, updateService,
} from '../services/publicApi';
import type { PracticeSetSummary } from '../types/api';

/** The updates feed is asked for again every five minutes while the page is open. */
const REFRESH_MS = 5 * 60_000;

/** Practice sets per exam, kept small for the browser's remembered copy (the full list is about 50 KB). */
export function countPractice(sets: PracticeSetSummary[]): PracticeCounts {
  const byExam: PracticeCounts['byExam'] = {};
  let questions = 0;
  for (const s of sets) {
    questions += s.questionCount;
    if (!s.examSlug) continue;
    const c = (byExam[s.examSlug] ??= { sets: 0, questions: 0 });
    c.sets += 1;
    c.questions += s.questionCount;
  }
  return { byExam, sets: sets.length, questions };
}

export function HomePage() {
  useDocumentTitle(undefined);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setTick((n) => n + 1);
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  // Each list is remembered in the browser (cacheKey), so a returning visitor sees it at once and a server hiccup
  // leaves the last good copy on screen instead of an error.
  const stats = useApi(() => referenceService.stats(), [], true, 'home.stats');
  const feed = useApi(() => updateService.list({ size: 12 }), [tick], true, 'home.updates');
  const prep = useApi(() => updateService.list({ category: 'PREP', size: 20 }), [tick], true, 'home.prep');
  const practice = useApi(() => practiceService.list().then(countPractice), [], true, 'home.practice');
  const iirf = useApi(() => rankingService.external({ publisher: 'IIRF', size: 3 }), [], true, 'home.iirf');
  const directory = useApi(() => directoryService.summary(), [], true, 'home.directory');
  const places = useApi(() => rankingService.bestPlaces(), [], true, 'home.places');
  const posts = useApi(() => blogService.list({ size: 5 }), [], true, 'home.blog');
  const featured = useApi(() => schoolService.featured(undefined, 24).then((s) => pickFeatured(s)), [], true, 'home.featured');

  return (
    <div className="bg-[linear-gradient(180deg,#f6f8ff_0%,#ffffff_28%,#f8f7ff_100%)]">
      <HomeHero schools={stats.data?.activeSchools ?? null} practiceSets={practice.data?.sets ?? null} />
      <LiveTicker state={feed} />
      <HomeUpdates all={feed} />
      <ExploreCategories />
      <HomeRankings iirf={iirf} directory={directory} places={places}
        trending={<TrendingNow updates={feed.data?.content ?? []} posts={posts.data?.content ?? []} />} />
      <HomeExamPrep counts={practice.data} prep={prep.data?.content ?? []} />
      <FeaturedSchools state={featured} />
      <GrowSection />
      <PhotoCredits />
    </div>
  );
}
