import { Rupee } from '@/components/brand';
import { count, rupees, shortCount } from '@/lib/format';
import type { CampaignAnalytics } from '@/lib/types';

const DAY = 86_400_000;
const W = 640;
const H = 240;
const PAD = { top: 18, right: 16, bottom: 30, left: 52 };

const dayMs = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
const dayLabel = (ms: number) => new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/**
 * Cumulative spend against the budget, one step per day with payouts. Plain
 * SVG, so no chart library ships to the browser.
 */
export function SpendChart({
  data,
  budget,
  startedAt,
}: {
  data: CampaignAnalytics['spendByDay'];
  budget: number;
  startedAt: string;
}) {
  if (data.length === 0) {
    return <p className="muted chart-empty">No payouts yet. The chart fills in as posts cross milestones.</p>;
  }

  const start = Math.min(dayMs(startedAt), dayMs(data[0]!.date));
  const end = Math.max(dayMs(data[data.length - 1]!.date), Date.now() - (Date.now() % DAY), start + DAY);
  const yMax = Math.max(budget, data[data.length - 1]!.cumulative);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (ms: number) => PAD.left + ((ms - start) / (end - start)) * innerW;
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;

  // Step line: flat until the day of each payout, then jumps up.
  let path = `M ${x(start)} ${y(0)}`;
  let prev = 0;
  for (const d of data) {
    const px = x(dayMs(d.date));
    path += ` L ${px} ${y(prev)} L ${px} ${y(d.cumulative)}`;
    prev = d.cumulative;
  }
  path += ` L ${x(end)} ${y(prev)}`;
  const area = `${path} L ${x(end)} ${y(0)} L ${x(start)} ${y(0)} Z`;

  const ticks = [0, 0.5, 1].map((f) => Math.round(yMax * f));
  // A middle date label only helps when the range spans more than a couple of days.
  const xTicks = end - start > 2 * DAY ? [start, start + (end - start) / 2, end] : [start, end];

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Budget spent over time: ${rupees(prev)} of ${rupees(budget)}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="chart-label">
              {shortCount(t)}
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(budget)} y2={y(budget)} className="chart-budget" />
        <text x={W - PAD.right} y={y(budget) - 6} textAnchor="end" className="chart-label strong">
          Budget {shortCount(budget)}
        </text>
        <path d={area} className="chart-area" />
        <path d={path} className="chart-line" />
        {data.map((d) => (
          <circle key={d.date} cx={x(dayMs(d.date))} cy={y(d.cumulative)} r={4.5} className="chart-dot">
            <title>{`${dayLabel(dayMs(d.date))}: +${rupees(d.amount)} (${d.payouts} payout${d.payouts === 1 ? '' : 's'}), ${rupees(d.cumulative)} total`}</title>
          </circle>
        ))}
        {xTicks.map((t, i) => (
          <text key={i} x={x(t)} y={H - 8} textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'} className="chart-label">
            {dayLabel(t)}
          </text>
        ))}
      </svg>
    </figure>
  );
}

/** How many posts reached each milestone, and how many stopped there. */
export function MilestoneFunnel({ analytics }: { analytics: CampaignAnalytics }) {
  const { milestones, posts, belowFirstMilestone } = analytics;
  if (posts === 0) return <p className="muted chart-empty">No posts yet.</p>;

  return (
    <div className="funnel">
      {milestones.map((m) => (
        <div className="funnel-row" key={m.views}>
          <div className="funnel-head">
            <strong>{shortCount(m.views)} views</strong>
            <span className="coin-amount"><Rupee size={14} /> {count(m.payout)}</span>
          </div>
          <div className="funnel-bar" aria-hidden="true">
            <span style={{ width: `${(m.reached / posts) * 100}%` }} />
          </div>
          <span className="small muted">
            {m.reached} of {posts} post{posts === 1 ? '' : 's'} reached · {m.topTier} stopped here
          </span>
        </div>
      ))}
      <p className="small muted" style={{ margin: 0 }}>
        {belowFirstMilestone} post{belowFirstMilestone === 1 ? '' : 's'} below the first milestone.
      </p>
    </div>
  );
}
