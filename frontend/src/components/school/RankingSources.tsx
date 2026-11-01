import { useApi } from '../../hooks/useApi';
import { rankingService } from '../../services/publicApi';
import { formatDate } from '../../utils/format';
import { AsyncContent } from '../common/States';

/** The methodology for rankings published by others: who published them, which years, and how we check and present them. */
export function RankingSources() {
  const editions = useApi(() => rankingService.editions(), []);
  return (
    <>
      <h2 id="presentation">How India School Finder presents rankings</h2>
      <ul>
        <li>Rankings are shown on this site, list by list. Each table is one publisher’s list for one year.</li>
        <li>Positions are never added together into one rank, and they compare only within the same list and year.</li>
        <li>National, state and city ranks are kept separate. A filter narrows a list and never renumbers it.</li>
        <li>Where a publisher made no separate board, government or boarding ranking, the page says so and shows each school’s national rank.</li>
        <li>A place, board or category with no verified entries is not shown, and nothing is added to fill a list.</li>
      </ul>
      <p>We do not sell ranking positions, and schools cannot pay for a better rank. Paid or featured listings are never shown as rankings.</p>
      <h2 id="school-lists">School lists</h2>
      <p>
        Below the rankings you will find lists of well-known schools by place, board and kind, compiled by India School Finder to help families start
        their search. They are listed A to Z and are not rankings: a school’s place in a list says nothing about its quality. Not every detail has been
        checked against an official source, so please confirm with the school. Schools with a “View School Details” link have a profile in our directory.
      </p>
      <h2 id="sources">Ranking publishers</h2>
      <AsyncContent state={editions} isEmpty={(d) => d.length === 0} empty={<p>No published list has verified entries yet.</p>}>
        {(list) => (
          <div className="not-prose space-y-3">
            {list.map((e) => (
              <section key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700" aria-label={`${e.publisher} ${e.year}`}>
                <h3 className="font-display font-bold text-ink">{e.name}, {e.year}</h3>
                <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-[10rem_1fr]">
                  <dt className="text-slate-500">Published by</dt><dd>{e.publisher}</dd>
                  <dt className="text-slate-500">How it works</dt><dd>{e.methodology ?? 'The publisher’s method is not recorded here yet.'}</dd>
                  <dt id={e === list[0] ? 'parameters' : undefined} className="text-slate-500">Evaluation parameters</dt>
                  <dd>{e.parameters.length > 0 ? e.parameters.map((p) => (p.weight !== null ? `${p.name} (${p.weight}%)` : p.name)).join(', ') : 'Not recorded'}{e.parameters.length > 0 && e.parameters.every((p) => p.weight === null) ? '. Weights not published.' : ''}</dd>
                  <dt className="text-slate-500">Scores published</dt><dd>{e.ratingBased ? 'No: rating bands only' : e.hasScores ? 'Yes' : 'No'}</dd>
                  <dt className="text-slate-500">Schools shown</dt><dd>{e.entries.toLocaleString('en-IN')}</dd>
                  <dt className="text-slate-500">Collected</dt><dd>{formatDate(e.collectedOn)}{e.lastVerified ? `, last checked ${formatDate(e.lastVerified)}` : ''}</dd>
                  <dt className="text-slate-500">Source</dt><dd className="break-all">{e.sourceUrl}</dd>
                </dl>
              </section>
            ))}
          </div>
        )}
      </AsyncContent>
      <h2 id="updates">Ranking years</h2>
      <p>
        Each list keeps its own year, and earlier years stay on a school’s record, so a school can have several rankings from different publishers
        and years. A changed entry goes back for review before it appears again.
      </p>
      <h2 id="evidence">Source data and verification</h2>
      <p>Three things on this site are different, and we keep them apart:</p>
      <ul>
        <li><strong>Original published ranking:</strong> a position or rating set by the publisher. We record it as printed.</li>
        <li><strong>School information verified through official sources:</strong> facts such as board, classes and facilities, from official records.</li>
        <li><strong>India School Finder’s own comparison features:</strong> tools and our evidence score, which are ours and are not a published ranking.</li>
      </ul>
      <p>
        An imported entry stays hidden until an administrator approves it. We check entries against the publisher’s list, not the publisher’s underlying
        data. UDISE+ and PGI-D are used for school facts and district indicators, not as a ranking of individual schools. A school in the Green Schools
        Programme is shown with its rating band, which is not a rank.
      </p>
    </>
  );
}
