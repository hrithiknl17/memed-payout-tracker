import { Camera, Flag, PlaySquare } from 'lucide-react';
import { platformLabel, rupees } from '@/lib/format';
import type { BrandCampaign } from '@/lib/types';
import { BudgetBar } from './BudgetBar';

export function PlatformBadge({ platform }: { platform: string }) {
  const Icon = platform === 'youtube' ? PlaySquare : Camera;
  return (
    <span className={`platform-badge ${platform}`} aria-hidden="true">
      <Icon size={16} />
    </span>
  );
}

export function StatusPill({ status }: { status: 'live' | 'exhausted' }) {
  return <span className={`pill ${status === 'live' ? 'live' : 'done'}`}>{status === 'live' ? 'Live' : 'Budget used up'}</span>;
}

/** A brand's campaigns with budget spent vs remaining. Rows open the campaign. */
export function CampaignTable({ campaigns, onSelect }: { campaigns: BrandCampaign[]; onSelect: (id: string) => void }) {
  return (
    <div className="table-wrap">
      <table className="data stack">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Status</th>
            <th>Budget spent vs remaining</th>
            <th className="num">Posts</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr
              key={c.id}
              className="clickable"
              tabIndex={0}
              onClick={() => onSelect(c.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(c.id);
                }
              }}
              aria-label={`Open ${c.name}`}
            >
              <td>
                <div className="cell-title">
                  <PlatformBadge platform={c.platform} />
                  <div>
                    <strong>{c.name}</strong>
                    <span>
                      {platformLabel(c.platform)} · {rupees(c.budget)} budget
                    </span>
                  </div>
                </div>
              </td>
              <td>
                <StatusPill status={c.status} />
              </td>
              <td data-label="Budget spent vs remaining">
                <BudgetBar spent={c.spent} budget={c.budget} />
              </td>
              <td className="num" data-label="Posts">
                <strong>{c.submissionCount}</strong>
                {c.flaggedCount > 0 && (
                  <div className="small" style={{ color: 'var(--bad)' }}>
                    <Flag size={11} aria-hidden="true" /> {c.flaggedCount} flagged
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
