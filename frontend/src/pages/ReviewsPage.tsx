import { Link } from 'react-router-dom';
import { Stars } from '../components/common/Badges';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent, EmptyState } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { schoolService } from '../services/publicApi';

export function ReviewsPage() {
  useDocumentTitle('Parent reviews and ratings');
  const state = useApi(() => schoolService.search({ sortBy: 'rating', minRating: 1, size: 30 }), []);
  return (
    <>
      <PageHeader
        title="Parent reviews and ratings"
        subtitle="Ratings come only from moderated reviews by parents and guardians on this site. Open a school to read reviews or write one."
      />
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_340px]">
        <section>
          <AsyncContent state={state} isEmpty={(d) => d.content.length === 0}
            empty={<EmptyState title="No published reviews yet.">Open any <Link to="/schools" className="link">school profile</Link> and use the Reviews tab to share your experience.</EmptyState>}>
            {(page) => (
              <ol className="card divide-y divide-slate-100">
                {page.content.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <div>
                      <Link to={`/schools/${s.slug}?tab=reviews`} className="font-medium hover:text-brand-700">{s.name}</Link>
                      <p className="text-xs text-slate-500">{s.locality}</p>
                    </div>
                    <div className="text-right">
                      <Stars rating={s.averageRating} />
                      <p className="text-xs text-slate-500">{s.reviewCount} review{s.reviewCount === 1 ? '' : 's'}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </AsyncContent>
        </section>
        <aside className="card prose-page h-fit p-5 text-sm">
          <h2 className="!mt-0">Review policy</h2>
          <ul>
            <li>Every review is checked by a moderator before it is published.</li>
            <li>We don’t ask for email, phone numbers or children’s details, and we remove personal information found in reviews.</li>
            <li>Reviews must describe the reviewer’s own experience. Abusive or promotional content is rejected.</li>
            <li>A school’s parent-feedback score counts toward rankings only after it has enough approved reviews.</li>
          </ul>
        </aside>
      </div>
    </>
  );
}
