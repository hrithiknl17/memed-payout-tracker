'use client';

import { Crown } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CampaignCard } from '@/components/CampaignCard';
import { Coin, CoinStack } from '@/components/brand';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { count, greeting, rupees, shortCount, topPayout } from '@/lib/format';
import { useCreatorData, useLoad } from '@/lib/hooks';
import type { LiveCampaign } from '@/lib/types';

type Sort = 'newest' | 'payout' | 'ending';

const SORTS: Record<Sort, { label: string; compare: (a: LiveCampaign, b: LiveCampaign) => number }> = {
  newest: { label: 'Newest', compare: (a, b) => b.createdAt.localeCompare(a.createdAt) },
  payout: { label: 'Highest payout', compare: (a, b) => topPayout(b) - topPayout(a) },
  ending: {
    label: 'Ending soon',
    compare: (a, b) => (a.endsAt ? Date.parse(a.endsAt) : Infinity) - (b.endsAt ? Date.parse(b.endsAt) : Infinity),
  },
};

export default function CreatorHome() {
  const { user } = useAuth();
  const { data, error } = useCreatorData();
  const board = useLoad(() => api.leaderboard());
  const [sort, setSort] = useState<Sort>('newest');

  const live = useMemo(() => [...(data?.live ?? [])].sort(SORTS[sort].compare), [data, sort]);
  const firstName = user?.name.split(/\s+/)[0] ?? '';

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>
            {greeting()}, <span className="blue">{firstName}</span>
          </h1>
          <p>You slay, we pay. Pick a campaign, post, and earn as your views climb.</p>
        </div>
        <div className="head-actions">
          <Link href="/creator/leaderboard" className="btn btn-ghost">
            <Crown size={18} color="#e7a611" /> Leaderboard
          </Link>
        </div>
      </div>

      {error && <p className="alert error">{error}</p>}

      <div className="grid-2">
        <div className="card stat-card">
          <div className="value">
            <Coin size={24} /> {data ? count(data.earnings.totalEarnings) : '—'}
          </div>
          <div className="label">Lifetime earning</div>
          {!!data?.earnings.unpaidDueToBudget && (
            <span className="pill warn" style={{ width: 'fit-content', marginTop: 4 }}>
              {rupees(data.earnings.unpaidDueToBudget)} unpaid · budget out
            </span>
          )}
          <div className="art"><CoinStack size={76} /></div>
        </div>
        <div className="card stat-card">
          <div className="value">
            <Coin size={24} /> {board.data ? shortCount(board.data.totalDisbursed) : '—'}
          </div>
          <div className="label">Total disbursed</div>
          <div className="art"><Coin size={60} tilt={-14} /></div>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Live campaigns</h2>
          <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Sort
            <select className="input" style={{ width: 'auto', padding: '8px 12px' }} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {(Object.keys(SORTS) as Sort[]).map((s) => (
                <option key={s} value={s}>{SORTS[s].label}</option>
              ))}
            </select>
          </label>
        </div>
        {!data && !error && (
          <div className="campaign-grid">
            {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 420 }} />)}
          </div>
        )}
        {data && live.length === 0 && (
          <div className="card empty">
            <h3>No live campaigns right now</h3>
            <p>Brands add new briefs all the time. Check back soon.</p>
          </div>
        )}
        {live.length > 0 && (
          <div className="campaign-grid">
            {live.map((c) => (
              <CampaignCard key={c.id} campaign={c} brandName={c.brandName} href={`/creator/campaigns/${c.id}`} />
            ))}
          </div>
        )}
      </section>

      {data && data.ended.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Recently ended campaigns</h2>
          </div>
          <div className="rail">
            {data.ended.map((c) => (
              <CampaignCard key={c.id} campaign={c} brandName={c.brandName} href={`/creator/campaigns/${c.id}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
