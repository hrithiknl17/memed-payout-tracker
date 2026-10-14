'use client';

import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { EmptyFolder, Thumb } from '@/components/brand';
import { SimulateViews } from '@/components/SimulateViews';
import { SubmissionStatus } from '@/components/SubmissionStatus';
import { count, rupees, timeAgo } from '@/lib/format';
import { useCreatorData } from '@/lib/hooks';

type Tab = 'active' | 'past';

export default function ParticipationsPage() {
  const { data, error, reload } = useCreatorData();
  const [tab, setTab] = useState<Tab>('active');

  const liveIds = new Set(data?.live.map((c) => c.id));
  const campaigns = new Map([...(data?.live ?? []), ...(data?.ended ?? [])].map((c) => [c.id, c]));
  // Active: the campaign still accepts posts. Past: it ended or ran out of budget.
  const rows = (data?.submissions ?? []).filter((s) => (tab === 'active' ? liveIds.has(s.campaignId) : !liveIds.has(s.campaignId)));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Participations</h1>
          <p>Every post you&apos;ve submitted, and what it has earned.</p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Participations">
        {(['active', 'past'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'active' ? 'Active Participations' : 'Past Participations'}
          </button>
        ))}
      </div>

      <section className="section" style={{ marginTop: 24 }}>
        {error && <p className="alert error">{error}</p>}
        {!data && !error && <div className="skeleton" style={{ height: 240 }} />}

        {data && rows.length === 0 && (
          <div className="empty">
            <EmptyFolder />
            <h3>
              You have no {tab} <span className="blue">submissions</span> yet
            </h3>
            <p>All your attempted challenges will show here</p>
            {tab === 'active' && (
              <Link href="/creator" className="btn btn-primary" style={{ marginTop: 10 }}>
                Explore Challenges <ArrowRight size={17} />
              </Link>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <div className="card">
            <div className="list">
              {rows.map((s) => {
                const c = campaigns.get(s.campaignId);
                return (
                  <div className="list-row" key={s.id} style={{ flexWrap: 'wrap' }}>
                    <div className="mini-thumb">
                      <Thumb src={c?.thumbnailUrl} alt="" mini />
                    </div>
                    <div className="grow" style={{ minWidth: 200 }}>
                      <Link className="title" href={`/creator/campaigns/${s.campaignId}`}>
                        {s.campaignName ?? 'Campaign'}
                      </Link>
                      <a className="sub" href={s.postUrl} target="_blank" rel="noreferrer">
                        {s.postUrl.replace(/^https:\/\//, '')} <ArrowUpRight size={11} aria-hidden="true" />
                      </a>
                      <div className="pills" style={{ marginTop: 6 }}>
                        <SubmissionStatus s={s} />
                      </div>
                    </div>
                    <div style={{ minWidth: 100 }}>
                      <strong>{count(s.views)}</strong>
                      <span className="sub">views · {timeAgo(s.viewsUpdatedAt)}</span>
                    </div>
                    <div style={{ minWidth: 100 }}>
                      <strong style={{ color: 'var(--good)' }}>{rupees(s.paidAmount)}</strong>
                      <span className="sub">{s.entitledAmount > s.paidAmount ? `of ${rupees(s.entitledAmount)} earned` : 'earned'}</span>
                    </div>
                    <div style={{ width: 250, maxWidth: '100%' }}>
                      <span className="sub" style={{ marginBottom: 4 }}>Simulate platform views</span>
                      <SimulateViews submission={s} onChanged={() => void reload()} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
