import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoneyCompact } from '../../utils/format';

export interface FeePoint {
  name: string;
  slug: string;
  fee: number;
  label: string;
}

/** Horizontal bars of each school's lowest published annual fee; loaded separately so the charts library is not
 * part of the home page's first download. */
export default function FeeChart({ data }: { data: FeePoint[] }) {
  const navigate = useNavigate();
  // Phone-width layout (read once; the chart re-renders with the data anyway).
  const narrow = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 640px)').matches;
  return (
    <div style={{ height: Math.max(220, data.length * 52) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: narrow ? 92 : 120 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={narrow ? 112 : 190}
            tick={{ fontSize: narrow ? 11 : 12, fill: '#334155' }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v: number) => formatMoneyCompact(v)} labelStyle={{ fontWeight: 600 }} />
          <Bar dataKey="fee" radius={[0, 8, 8, 0]} barSize={22} isAnimationActive={false}
            onClick={(d: { slug?: string }) => d.slug && navigate(`/schools/${d.slug}?tab=fees`)} className="cursor-pointer">
            {data.map((d, i) => <Cell key={d.slug} fill={i === 0 ? '#ffa520' : '#3b66f5'} />)}
            <LabelList dataKey="label" position="right" style={{ fontSize: 12, fontWeight: 700, fill: '#0b1324' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
