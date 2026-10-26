import type { ReactNode } from 'react';

/** Page hero used by every inner page: dark navy band with a faint grid, eyebrow, title and subtitle. */
export function PageHeader({ title, subtitle, eyebrow, children }: {
  title: string;
  subtitle?: ReactNode;
  eyebrow?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-ink text-white">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl" aria-hidden />
      <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-accent-500/10 blur-3xl" aria-hidden />
      <div className="container-page relative py-10 sm:py-12">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-300">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
        {subtitle && <div className="mt-3 max-w-3xl text-base text-slate-300 [&_a]:text-accent-300 [&_strong]:text-white">{subtitle}</div>}
        {children && <div className="mt-6 [&>a]:text-accent-300 [&>a:hover]:text-white">{children}</div>}
      </div>
    </div>
  );
}
