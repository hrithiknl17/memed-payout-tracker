'use client';

import { ArrowLeft, ArrowUpRight, PencilLine, Timer, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StatusPill } from '@/components/CampaignTable';
import { Coin, PlatformIcon, Progress, Thumb } from '@/components/brand';
import { SubmissionStatus } from '@/components/SubmissionStatus';
import { api } from '@/lib/api';
import { count, deadlineLabel, formatDate, initials, platformLabel, rupees, shortCount, timeAgo } from '@/lib/format';
import { useLoad } from '@/lib/hooks';

export default function BrandCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useLoad(async () => {
    const [{ campaigns }, { submissions }] = await Promise.all([api.myCampaigns(), api.campaignSubmissions(id)]);
    return { campaign: campaigns.find((c) => c.id === id) ?? null, submissions };
  });

  if (error) {
    return (
      <div className="page">
        <Link href="/brand/campaigns" className="back"><ArrowLeft size={16} /> All campaigns</Link>
        <p className="alert error">{error}</p>
      </div>
    );
  }
  if (!data) return <p className="loading">Loading campaign…</p>;
  const { campaign, submissions } = data;
  if (!campaign) return <div className="page"><p className="alert error">Campaign not found.</p></div>;

  const pct = campaign.budget > 0 ? Math.round((campaign.spent / campaign.budget) * 100) : 0;
  const totalViews = submissions.reduce((n, s) => n + s.views, 0);
  const deadline = deadlineLabel(campaign.endsAt);

  return (
    <div className="page">
      <Link href="/brand/campaigns" className="back"><ArrowLeft size={16} /> All campaigns</Link>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 340px) minmax(0, 1fr)', overflow: 'hidden' }}>
        <div className="thumb" style={{ borderBottom: 0, borderRight: '2px solid var(--ink)', aspectRatio: 'auto', minHeight: 200 }}>
          <Thumb src={campaign.thumbnailUrl} alt={`${campaign.name} cover`} />
        </div>
        <div className="card-pad" style={{ display: 'grid', gap: 12, alignContent: 'center' }}>
          <div className="pills">
            <StatusPill status={campaign.status} />
            <span className="pill"><PlatformIcon platform={campaign.platform} /> {platformLabel(campaign.platform)}</span>
            {deadline && <span className="pill"><Timer size={14} aria-hidden="true" /> {campaign.status === 'live' ? deadline : `Ended ${formatDate(campaign.endsAt!)}`}</span>}
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 3vw, 38px)' }}>{campaign.name}</h1>
          <p className={campaign.objective ? undefined : 'muted'} style={{ margin: 0, whiteSpace: 'pre-line' }}>
            {campaign.objective || 'No objectives yet. Add a brief so creators know what to make.'}
          </p>
          <div>
            <Link href={`/brand/campaigns/${campaign.id}/edit`} className="btn btn-ghost btn-sm">
              <PencilLine size={15} /> Edit campaign
            </Link>
          </div>
        </div>
      </div>

      <div className="grid-4 section" style={{ marginTop: 24 }}>
        <div className="card stat-card">
          <div className="value"><Coin size={22} /> {count(campaign.budget)}</div>
          <div className="label">Total budget</div>
        </div>
        <div className="card stat-card blue">
          <div className="value"><Coin size={22} /> {count(campaign.spent)}</div>
          <div className="label">Distributed · {pct}%</div>
        </div>
        <div className="card stat-card">
          <div className="value"><Coin size={22} /> {count(campaign.remaining)}</div>
          <div className="label">Budget remaining</div>
        </div>
        <div className="card stat-card">
          <div className="value">{shortCount(totalViews)}</div>
          <div className="label">
            Views across {submissions.length} post{submissions.length === 1 ? '' : 's'}
            {campaign.flaggedCount > 0 && <span style={{ color: 'var(--bad)' }}> · {campaign.flaggedCount} flagged</span>}
          </div>
        </div>
      </div>

      <div className="split section">
        <section>
          <div className="section-head">
            <h2>Creator submissions</h2>
          </div>
          {submissions.length === 0 ? (
            <div className="card empty">
              <Users size={34} color="var(--cobalt)" aria-hidden="true" />
              <h3>No posts yet</h3>
              <p>Creator posts show up here as soon as they join.</p>
            </div>
          ) : (
            <div className="card table-wrap">
              <table className="data stack">
                <thead>
                  <tr>
                    <th>Creator / post</th>
                    <th className="num">Views</th>
                    <th className="num">Paid</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="avatar" aria-hidden="true">{initials(s.creatorName ?? '?')}</span>
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ display: 'block' }}>{s.creatorName ?? 'Creator'}</strong>
                            <a className="url" href={s.postUrl} target="_blank" rel="noreferrer">
                              {s.postUrl.replace(/^https:\/\//, '')} <ArrowUpRight size={11} aria-hidden="true" />
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="num" data-label="Views">
                        <strong>{count(s.views)}</strong>
                        <div className="small muted">{timeAgo(s.viewsUpdatedAt)}</div>
                      </td>
                      <td className="num" data-label="Paid">
                        <strong style={{ color: 'var(--good)' }}>{rupees(s.paidAmount)}</strong>
                      </td>
                      <td data-label="Notes"><SubmissionStatus s={s} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="card card-pad" style={{ display: 'grid', gap: 14 }}>
          <h2 style={{ fontSize: 19 }}>Budget &amp; milestones</h2>
          <div className="distributed">
            <Coin size={16} />
            <strong>{shortCount(campaign.spent)} of {shortCount(campaign.budget)}</strong>
            <span>distributed</span>
          </div>
          <Progress value={campaign.spent} max={campaign.budget} large label="Budget distributed" />
          <p className="hint">{rupees(campaign.remaining)} remaining. Payouts stop when it reaches zero.</p>
          <div className="list" style={{ border: '1.5px solid var(--line)', borderRadius: 16 }}>
            {campaign.milestones.map((m, i) => (
              <div className="list-row" key={m.views}>
                <span className="milestone-num" style={{ padding: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="grow"><strong>{shortCount(m.views)} views</strong></span>
                <span className="coin-amount"><Coin /> {count(m.payout)}</span>
              </div>
            ))}
          </div>
          <p className="hint">Each post earns its highest milestone reached, not the sum.</p>
        </aside>
      </div>
    </div>
  );
}
