'use client';

import { BarChart3, FilePlus2, LayoutDashboard, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AppShell, type NavItem } from '@/components/AppShell';
import { CampaignDetail } from '@/components/CampaignDetail';
import { CampaignTable } from '@/components/CampaignTable';
import { CreateCampaignForm } from '@/components/CreateCampaignForm';
import { api, ApiError } from '@/lib/api';
import { useRequireRole } from '@/lib/auth';
import { greeting, rupees } from '@/lib/format';
import type { BrandCampaign } from '@/lib/types';

type View = 'overview' | 'campaigns' | 'create';

export default function BrandPage() {
  const user = useRequireRole('brand');
  const [campaigns, setCampaigns] = useState<BrandCampaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('overview');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCampaigns((await api.myCampaigns()).campaigns);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load campaigns');
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (!user) return <p className="loading">Loading…</p>;

  const list = campaigns ?? [];
  const totals = list.reduce((t, c) => ({ budget: t.budget + c.budget, spent: t.spent + c.spent }), { budget: 0, spent: 0 });
  const liveCount = list.filter((c) => c.status === 'live').length;
  const flagged = list.reduce((n, c) => n + c.flaggedCount, 0);
  const spentPct = totals.budget > 0 ? Math.round((totals.spent / totals.budget) * 100) : 0;
  const selected = list.find((c) => c.id === selectedId) ?? null;

  const nav: NavItem<View>[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'campaigns', label: 'Campaigns', icon: BarChart3, count: list.length },
    { id: 'create', label: 'New campaign', icon: FilePlus2 },
  ];
  const navigate = (next: View) => {
    setSelectedId(null);
    setView(next);
  };

  let content;
  if (selected) {
    content = <CampaignDetail campaign={selected} onBack={() => setSelectedId(null)} onRefresh={() => void load()} />;
  } else if (view === 'create') {
    content = (
      <CreateCampaignForm
        onCancel={() => navigate('overview')}
        onCreated={() => {
          void load();
          navigate('campaigns');
        }}
      />
    );
  } else {
    content = (
      <div className="page">
        <div className="page-head">
          <div>
            <p className="eyebrow">Brand workspace</p>
            <h1>
              {view === 'overview' ? (
                <>
                  {greeting()}, {user.name} <em>✦</em>
                </>
              ) : (
                'Campaigns in motion.'
              )}
            </h1>
            <p className="subtitle">
              {view === 'overview'
                ? 'Budget goes out as creators hit milestones. Here is where it stands.'
                : 'Every campaign, with budget spent vs remaining.'}
            </p>
          </div>
          <div className="head-actions">
            <button className="btn btn-ghost" onClick={() => void load()}>
              <RefreshCw size={15} /> Refresh
            </button>
            <button className="btn btn-primary" onClick={() => navigate('create')}>
              <Plus size={15} /> New campaign
            </button>
          </div>
        </div>

        {view === 'overview' && (
          <div className="stat-grid">
            <div className="card stat">
              <span>Total budget</span>
              <strong>{rupees(totals.budget)}</strong>
              <small>
                Across {list.length} campaign{list.length === 1 ? '' : 's'}
              </small>
            </div>
            <div className="card stat bg-butter">
              <span>Spent</span>
              <strong>{rupees(totals.spent)}</strong>
              <small>{spentPct}% of total budget</small>
            </div>
            <div className="card stat bg-mint">
              <span>Remaining</span>
              <strong>{rupees(totals.budget - totals.spent)}</strong>
              <small>Available for payouts</small>
            </div>
            <div className="card stat bg-lavender">
              <span>Live campaigns</span>
              <strong>{String(liveCount).padStart(2, '0')}</strong>
              <small>{flagged > 0 ? `${flagged} post${flagged === 1 ? '' : 's'} flagged for review` : 'No posts flagged'}</small>
            </div>
          </div>
        )}

        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}

        <section className="section">
          <div className="section-head">
            <div>
              <p className="kicker">Spend tracker</p>
              <h2>{view === 'overview' ? 'Campaign overview' : 'All campaigns'}</h2>
            </div>
            {list.length > 0 && <span className="small muted">Open a campaign to see its posts.</span>}
          </div>
          {campaigns === null && !error && <p className="muted">Loading campaigns…</p>}
          {campaigns?.length === 0 && (
            <div className="card empty">
              <FilePlus2 size={26} color="var(--coral)" aria-hidden="true" />
              <strong>No campaigns yet</strong>
              <span>Set a budget and a milestone ladder to get creators posting.</span>
              <button className="btn btn-primary" onClick={() => navigate('create')} style={{ marginTop: 8 }}>
                <Plus size={15} /> Create your first campaign
              </button>
            </div>
          )}
          {list.length > 0 && <CampaignTable campaigns={list} onSelect={setSelectedId} />}
        </section>
      </div>
    );
  }

  return (
    <AppShell user={user} nav={nav} active={selected ? 'campaigns' : view} onNavigate={navigate}>
      {content}
    </AppShell>
  );
}
