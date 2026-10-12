'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { count, platformLabel, rupees, timeAgo } from '@/lib/format';
import type { BrandCampaign, Submission } from '@/lib/types';
import { BudgetBar } from './BudgetBar';
import { Ladder } from './Ladder';
import { SubmissionStatus } from './SubmissionStatus';

export function BrandCampaignCard({ campaign }: { campaign: BrandCampaign }) {
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setError(null);
      try {
        setSubs((await api.campaignSubmissions(campaign.id)).submissions);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not load submissions');
      }
    }
  }

  return (
    <div className="card">
      <div className="campaign-head">
        <div>
          <h2 style={{ marginBottom: 2 }}>{campaign.name}</h2>
          <span className="small muted">
            {platformLabel(campaign.platform)} · created {timeAgo(campaign.createdAt)}
          </span>
        </div>
        <span className={`pill ${campaign.status === 'live' ? 'live' : 'done'}`}>
          {campaign.status === 'live' ? 'Live' : 'Budget used up'}
        </span>
      </div>

      <BudgetBar spent={campaign.spent} budget={campaign.budget} />
      <Ladder milestones={campaign.milestones} />

      <div className="row small" style={{ marginTop: 12 }}>
        <span className="muted">
          {campaign.submissionCount} post{campaign.submissionCount === 1 ? '' : 's'}
          {campaign.flaggedCount > 0 && <> · <span style={{ color: 'var(--bad)' }}>{campaign.flaggedCount} flagged</span></>}
        </span>
        {campaign.submissionCount > 0 && (
          <button className="link shrink" onClick={toggle}>
            {open ? 'Hide posts' : 'View posts'}
          </button>
        )}
      </div>

      {open && (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          {error && <p className="error">{error}</p>}
          {!subs && !error && <p className="muted small">Loading…</p>}
          {subs && (
            <table>
              <thead>
                <tr>
                  <th>Post</th>
                  <th className="num">Views</th>
                  <th className="num">Paid</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <a className="url" href={s.postUrl} target="_blank" rel="noreferrer">
                        {s.postUrl.replace(/^https:\/\//, '')}
                      </a>
                    </td>
                    <td className="num">{count(s.views)}</td>
                    <td className="num">{rupees(s.paidAmount)}</td>
                    <td>
                      <SubmissionStatus s={s} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
