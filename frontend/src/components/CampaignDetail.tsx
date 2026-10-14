'use client';

import { ArrowLeft, ArrowUpRight, RefreshCw, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { count, initials, platformLabel, rupees, shortCount, timeAgo } from '@/lib/format';
import type { BrandCampaign, Submission } from '@/lib/types';
import { StatusPill } from './CampaignTable';
import { SubmissionStatus } from './SubmissionStatus';

export function LadderStrip({ milestones }: { milestones: BrandCampaign['milestones'] }) {
  return (
    <section className="ladder-strip" aria-label="Milestone ladder">
      <div className="ladder-strip-title">
        <p className="kicker">Milestone ladder</p>
        <h2>Paid at the highest rung reached.</h2>
      </div>
      {milestones.map((m, i) => (
        <div className="ladder-step" key={m.views}>
          <span>{String(i + 1).padStart(2, '0')}</span>
          <strong>{shortCount(m.views)} views</strong>
          <small>{rupees(m.payout)} total</small>
        </div>
      ))}
    </section>
  );
}

/** One campaign: spend, the ladder, and every post submitted to it. */
export function CampaignDetail({ campaign, onBack, onRefresh }: { campaign: BrandCampaign; onBack: () => void; onRefresh: () => void }) {
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSubs((await api.campaignSubmissions(campaign.id)).submissions);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load posts');
    }
  }, [campaign.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const pct = campaign.budget > 0 ? Math.round((campaign.spent / campaign.budget) * 100) : 0;

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 24 }}>
        <ArrowLeft size={15} /> All campaigns
      </button>

      <div className="page-head">
        <div>
          <p className="eyebrow">Campaign · {platformLabel(campaign.platform)}</p>
          <h1>{campaign.name}</h1>
          <div className="pills" style={{ marginTop: 14 }}>
            <StatusPill status={campaign.status} />
            <span className="pill">{rupees(campaign.budget)} budget</span>
            <span className="pill">Created {timeAgo(campaign.createdAt)}</span>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => {
            onRefresh();
            void load();
          }}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="stat-grid three">
        <div className="card stat bg-butter">
          <span>Spent so far</span>
          <strong>{rupees(campaign.spent)}</strong>
          <small>{pct}% of budget</small>
        </div>
        <div className="card stat bg-mint">
          <span>Remaining</span>
          <strong>{rupees(campaign.remaining)}</strong>
          <small>{campaign.remaining > 0 ? 'Available for payouts' : 'No more payouts or posts'}</small>
        </div>
        <div className="card stat bg-lavender">
          <span>Creator posts</span>
          <strong>{campaign.submissionCount}</strong>
          <small>{campaign.flaggedCount > 0 ? `${campaign.flaggedCount} flagged for a view spike` : 'None flagged'}</small>
        </div>
      </div>

      <LadderStrip milestones={campaign.milestones} />

      <section className="section">
        <div className="section-head">
          <div>
            <p className="kicker">Creator posts</p>
            <h2>Who&apos;s posting for you</h2>
          </div>
        </div>
        {error && <p className="alert error">{error}</p>}
        {!subs && !error && <p className="muted">Loading posts…</p>}
        {subs?.length === 0 && (
          <div className="card empty">
            <Users size={26} color="var(--coral)" aria-hidden="true" />
            <strong>No posts yet</strong>
            <span>Creator posts show up here once they join this campaign.</span>
          </div>
        )}
        {subs && subs.length > 0 && (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Creator / post</th>
                  <th className="num">Views</th>
                  <th className="num">Earned</th>
                  <th className="num">Paid</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="cell-title">
                        <span className="avatar" aria-hidden="true">
                          {initials(s.creatorName ?? '?')}
                        </span>
                        <div>
                          <strong>{s.creatorName ?? 'Creator'}</strong>
                          <a className="url" href={s.postUrl} target="_blank" rel="noreferrer">
                            {s.postUrl.replace(/^https:\/\//, '')} <ArrowUpRight size={11} aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="num">
                      <strong>{count(s.views)}</strong>
                      <div className="small muted">{timeAgo(s.viewsUpdatedAt)}</div>
                    </td>
                    <td className="num">{rupees(s.entitledAmount)}</td>
                    <td className="num">
                      <strong style={{ color: 'var(--good)' }}>{rupees(s.paidAmount)}</strong>
                    </td>
                    <td>
                      <SubmissionStatus s={s} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
