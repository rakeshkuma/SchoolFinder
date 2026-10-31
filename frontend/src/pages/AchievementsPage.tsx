import { Link } from 'react-router-dom';
import { AchievementCard, useProgressReport } from '../components/exam/ProgressReport';
import { PageHeader } from '../components/common/PageHeader';
import { ErrorState, Spinner } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMember } from '../hooks/useMember';
import type { Achievement } from '../services/accountApi';
import { leaderboardService, useGuestToken } from '../services/participantApi';

/** Keeps the server's order of groups. */
function groups(list: Achievement[]): [string, Achievement[]][] {
  const m = new Map<string, Achievement[]>();
  list.forEach((a) => m.set(a.group, [...(m.get(a.group) ?? []), a]));
  return [...m.entries()];
}

/** Every badge: a student sees theirs and their progress; anyone else sees what can be earned. */
export function AchievementsPage() {
  useDocumentTitle('My achievements');
  const { status } = useMember();
  const token = useGuestToken();
  const known = status === 'signedIn' || !!token;
  const report = useProgressReport();
  const catalogue = useApi(() => leaderboardService.achievements(), []);
  const list = known ? report.data?.achievements : catalogue.data;
  const failed = known ? report.error : catalogue.error;
  const earned = list?.filter((a) => a.earnedAt).length ?? 0;

  return (
    <>
      <PageHeader eyebrow="Practice centre" title="My achievements"
        subtitle={known && list ? `${earned} of ${list.length} earned, from the tests you have taken.` : 'Badges earned from real practice, not given away.'}>
        <div className="flex flex-wrap gap-2">
          <Link to="/exams/practice/progress" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">← My progress</Link>
        </div>
      </PageHeader>
      <div className="container-page space-y-8 py-8">
        {!known && status !== 'loading' && (
          <p className="card p-4 text-sm text-slate-700">
            To earn badges, <Link to="/exams/practice/progress" className="link">join with a nickname</Link> or sign in. No account is needed to join.
          </p>
        )}
        {failed ? <ErrorState error={failed} onRetry={known ? report.reload : catalogue.reload} />
          : !list ? <Spinner label="Loading achievements…" />
            : groups(list).map(([group, badges]) => (
              <section key={group} aria-label={group}>
                <h2 className="font-display text-lg font-bold text-ink">{group}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {badges.map((a) => <AchievementCard key={a.code} a={a} />)}
                </div>
              </section>
            ))}
        <p className="text-xs text-slate-500">
          Our server awards badges from your saved tests. A test counts when at least half of it was answered and it was not
          flagged as answered too quickly or untimed. Your badges are private: they are not shown on the leaderboard.
          Browser-based tests cannot fully prevent cheating, so a badge is a record of practice, not an official result.
        </p>
      </div>
    </>
  );
}
