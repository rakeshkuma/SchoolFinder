import type { Fee } from '../../types/api';
import { feeComponentLabel, formatMoney } from '../../utils/format';
import { SourceLink, VerificationBadge } from '../common/Badges';

/** optional rows are hidden when the school lists no such charge */
const ROWS: { key: keyof Fee; label: string; note?: (f: Fee) => string; optional?: boolean }[] = [
  { key: 'registrationFee', label: 'Registration fee', note: () => 'one-time' },
  { key: 'admissionFee', label: 'Admission fee', note: () => 'one-time' },
  { key: 'monthlyTuition', label: 'Tuition fee', note: (f) => `per month × ${f.tuitionMonths}` },
  { key: 'monthlyCharges', label: 'Other monthly charges', optional: true,
    note: (f) => `per month × ${f.tuitionMonths}${f.monthlyChargesDescription ? ` · ${f.monthlyChargesDescription}` : ''}` },
  { key: 'annualCharges', label: 'Annual charges', note: () => 'per year' },
  { key: 'developmentCharges', label: 'Development charges', note: () => 'per year' },
  { key: 'otherCharges', label: 'Other charges', optional: true, note: (f) => f.otherChargesDescription ?? 'per year' },
  { key: 'securityDeposit', label: 'Security deposit', note: (f) => (f.securityDepositRefundable ? 'refundable' : 'non-refundable') },
  { key: 'transportMonthly', label: 'Transport (optional)', note: (f) => `per month${f.transportMonths ? ` × ${f.transportMonths}` : ''}` },
  { key: 'booksUniformEstimate', label: 'Books & uniform', note: () => 'estimate, not an official fee' },
];

/** One fee schedule (class + academic year). Unknown amounts read "Not available", never ₹0. */
export function FeeTable({ fee }: { fee: Fee }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
        <div>
          <h3 className="font-semibold">{fee.className} · {fee.academicYear}</h3>
          <SourceLink url={fee.sourceUrl} label="Fee source" />
        </div>
        <VerificationBadge status={fee.verificationStatus} date={fee.lastVerifiedDate} />
      </div>
      <table className="w-full text-sm">
        <tbody>
          {ROWS.map(({ key, label, note, optional }) => {
            const value = fee[key] as number | null;
            if (optional && value === null) return null;
            // A yearly component the school bills every month is stored as 0 here and included in monthly charges.
            const keyword = key === 'developmentCharges' ? 'development' : key === 'annualCharges' ? 'annual' : null;
            const inMonthly = value === 0 && keyword !== null && (fee.monthlyChargesDescription ?? '').toLowerCase().includes(keyword);
            if (inMonthly) {
              return (
                <tr key={key} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="px-4 py-2 text-left font-normal text-slate-600">{label}</th>
                  <td className="px-4 py-2 text-right text-xs text-slate-500">Included in monthly charges</td>
                </tr>
              );
            }
            return (
              <tr key={key} className="border-b border-slate-100 last:border-0">
                <th scope="row" className="px-4 py-2 text-left font-normal text-slate-600">
                  {label}
                  {note && <span className="block text-xs text-slate-500">{note(fee)}</span>}
                </th>
                <td className={`px-4 py-2 text-right tabular-nums ${value === null ? 'text-slate-500' : 'font-medium'}`}>{formatMoney(value)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-slate-50">
          <tr>
            <th scope="row" className="px-4 py-2 text-left">Recurring annual (official)</th>
            <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatMoney(fee.recurringAnnualOfficial)}</td>
          </tr>
          <tr>
            <th scope="row" className="px-4 py-2 text-left">First year (official, excl. deposit)</th>
            <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatMoney(fee.firstYearOfficial)}</td>
          </tr>
        </tfoot>
      </table>
      {fee.missingComponents.length > 0 && (
        <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          {fee.recurringAnnualOfficial !== null ? 'The first-year total is' : 'Totals are'} incomplete because these amounts are not published:{' '}
          {fee.missingComponents.map((c) => feeComponentLabel[c] ?? c).join(', ')}.
        </p>
      )}
      {fee.notes && <p className="px-4 py-2 text-xs text-slate-500">{fee.notes}</p>}
    </div>
  );
}
