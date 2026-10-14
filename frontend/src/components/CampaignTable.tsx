'use client';

import { Flag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deadlineLabel, platformLabel, rupees, shortCount, statusLabel } from '@/lib/format';
import type { BrandCampaign } from '@/lib/types';
import { PlatformIcon, Progress, Thumb } from './brand';

export function StatusPill({ status }: { status: BrandCampaign['status'] }) {
  const cls = status === 'live' ? 'blue' : status === 'ended' ? '' : 'warn';
  return <span className={`pill ${cls}`}>{statusLabel({ status })}</span>;
}

/** A brand's campaigns with budget distributed vs remaining. Rows open the campaign. */
export function CampaignTable({ campaigns }: { campaigns: BrandCampaign[] }) {
  const router = useRouter();
  const open = (id: string) => router.push(`/brand/campaigns/${id}`);

  return (
    <div className="card table-wrap">
      <table className="data stack">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Status</th>
            <th>Budget distributed</th>
            <th className="num">Posts</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr
              key={c.id}
              className="clickable"
              tabIndex={0}
              onClick={() => open(c.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  open(c.id);
                }
              }}
              aria-label={`Open ${c.name}`}
            >
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 240 }}>
                  <div className="mini-thumb">
                    <Thumb src={c.thumbnailUrl} alt="" mini />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block' }}>{c.name}</strong>
                    <span className="small muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <PlatformIcon platform={c.platform} size={14} /> {platformLabel(c.platform)}
                      {deadlineLabel(c.endsAt) && c.status === 'live' ? ` · ${deadlineLabel(c.endsAt)}` : ''}
                    </span>
                  </div>
                </div>
              </td>
              <td data-label="Status">
                <StatusPill status={c.status} />
              </td>
              <td data-label="Budget distributed" style={{ minWidth: 220 }}>
                <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6, fontSize: 13 }}>
                  <span>
                    <strong>{shortCount(c.spent)}</strong> <span className="muted">of {shortCount(c.budget)}</span>
                  </span>
                  <span className="muted">{rupees(c.remaining)} left</span>
                </div>
                <Progress value={c.spent} max={c.budget} label="Budget distributed" />
              </td>
              <td className="num" data-label="Posts">
                <strong>{c.submissionCount}</strong>
                {c.pendingReviewCount > 0 ? (
                  <div className="small" style={{ color: 'var(--bad)', fontWeight: 600 }}>
                    <Flag size={11} aria-hidden="true" /> {c.pendingReviewCount} to review
                  </div>
                ) : (
                  c.flaggedCount > 0 && (
                    <div className="small muted">
                      <Flag size={11} aria-hidden="true" /> {c.flaggedCount} flagged
                    </div>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
