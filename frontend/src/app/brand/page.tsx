'use client';

import { ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { CampaignTable } from '@/components/CampaignTable';
import { Coin, CoinStack, EmptyFolder } from '@/components/brand';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { count, greeting } from '@/lib/format';
import { useLoad } from '@/lib/hooks';

export default function BrandDashboard() {
  const { user } = useAuth();
  const { data, error } = useLoad(() => api.myCampaigns());
  const campaigns = data?.campaigns ?? [];

  const totals = campaigns.reduce((t, c) => ({ budget: t.budget + c.budget, spent: t.spent + c.spent }), { budget: 0, spent: 0 });
  const live = campaigns.filter((c) => c.status === 'live').length;
  const posts = campaigns.reduce((n, c) => n + c.submissionCount, 0);
  const toReview = campaigns.reduce((n, c) => n + c.pendingReviewCount, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>
            {greeting()}, <span className="blue">{user?.name}</span>
          </h1>
          <p>Budget goes out as creators hit milestones. Here&apos;s where it stands.</p>
        </div>
        <div className="head-actions">
          <Link href="/brand/campaigns/new" className="btn btn-primary">
            <Plus size={18} /> New campaign
          </Link>
        </div>
      </div>

      {error && <p className="alert error">{error}</p>}

      <div className="grid-4">
        <div className="card stat-card">
          <div className="value"><Coin size={22} /> {count(totals.budget)}</div>
          <div className="label">Total budget · {campaigns.length} campaign{campaigns.length === 1 ? '' : 's'}</div>
        </div>
        <div className="card stat-card blue">
          <div className="value"><Coin size={22} /> {count(totals.spent)}</div>
          <div className="label">Distributed to creators</div>
        </div>
        <div className="card stat-card">
          <div className="value"><Coin size={22} /> {count(totals.budget - totals.spent)}</div>
          <div className="label">Budget remaining</div>
          <div className="art"><CoinStack size={56} /></div>
        </div>
        <div className="card stat-card">
          <div className="value">{live}</div>
          <div className="label">
            Live campaigns · {posts} post{posts === 1 ? '' : 's'}
            {toReview > 0 && <span style={{ color: 'var(--bad)' }}> · {toReview} spike{toReview === 1 ? '' : 's'} to review</span>}
          </div>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Your campaigns</h2>
          {campaigns.length > 5 && (
            <Link href="/brand/campaigns" className="link">
              View all <ArrowRight size={15} />
            </Link>
          )}
        </div>
        {!data && !error && <div className="skeleton" style={{ height: 260 }} />}
        {data && campaigns.length === 0 && (
          <div className="card empty">
            <EmptyFolder />
            <h3>
              Launch your first <span className="blue">campaign</span>
            </h3>
            <p>Set a budget and a milestone ladder, and creators start posting.</p>
            <Link href="/brand/campaigns/new" className="btn btn-primary" style={{ marginTop: 10 }}>
              <Plus size={18} /> New campaign
            </Link>
          </div>
        )}
        {campaigns.length > 0 && <CampaignTable campaigns={campaigns.slice(0, 5)} />}
      </section>
    </div>
  );
}
