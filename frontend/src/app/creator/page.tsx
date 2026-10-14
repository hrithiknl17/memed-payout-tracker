'use client';

import { ArrowUpRight, Compass, Home, LayoutGrid, RefreshCw, Wallet } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell, type NavItem } from '@/components/AppShell';
import { LiveCampaignCard } from '@/components/LiveCampaignCard';
import { MySubmissions } from '@/components/MySubmissions';
import { NextMilestoneCard } from '@/components/NextMilestoneCard';
import { api, ApiError } from '@/lib/api';
import { useRequireRole } from '@/lib/auth';
import { greeting, rupees } from '@/lib/format';
import type { Campaign, Earnings, LiveCampaign, Submission } from '@/lib/types';

type View = 'overview' | 'discover' | 'posts';

const HEADINGS: Record<Exclude<View, 'overview'>, { title: string; subtitle: string }> = {
  discover: { title: 'Campaigns you can join', subtitle: 'Every campaign that still has budget. Post, submit the link, get paid by views.' },
  posts: {
    title: 'Your posts',
    subtitle: 'Use "Set views" to simulate the platform reporting new view counts. Payouts update instantly.',
  },
};

export default function CreatorPage() {
  const user = useRequireRole('creator');
  const [campaigns, setCampaigns] = useState<LiveCampaign[] | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('overview');

  const loadMine = useCallback(async () => {
    const mine = await api.mySubmissions();
    setSubmissions(mine.submissions);
    setEarnings(mine.earnings);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [live] = await Promise.all([api.liveCampaigns(), loadMine()]);
      setCampaigns(live.campaigns);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your dashboard');
    }
  }, [loadMine]);

  useEffect(() => {
    if (user) void loadAll();
  }, [user, loadAll]);

  const campaignsById = useMemo(() => new Map<string, Campaign>((campaigns ?? []).map((c) => [c.id, c])), [campaigns]);

  if (!user) return <p className="loading">Loading…</p>;

  // A new payout can exhaust a campaign, so refresh the live list too.
  const refresh = () => void loadAll();
  const live = campaigns ?? [];

  const nav: NavItem<View>[] = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'discover', label: 'Discover campaigns', icon: Compass, count: live.length },
    { id: 'posts', label: 'My posts', icon: LayoutGrid, count: submissions.length },
  ];

  // `fill` stretches a short preview row across the page instead of leaving a gap.
  const campaignGrid = (items: LiveCampaign[], fill = false) =>
    campaigns === null && !error ? (
      <p className="muted">Loading campaigns…</p>
    ) : items.length === 0 ? (
      <div className="card empty">
        <Compass size={26} color="var(--coral)" aria-hidden="true" />
        <strong>No live campaigns right now</strong>
        <span>Check back soon. Brands add new briefs all the time.</span>
      </div>
    ) : (
      <div className={`campaign-grid${fill ? ' fill' : ''}`}>
        {items.map((c) => (
          <LiveCampaignCard key={c.id} campaign={c} onSubmitted={refresh} />
        ))}
      </div>
    );

  const firstName = user.name.split(/\s+/)[0];

  return (
    <AppShell user={user} nav={nav} active={view} onNavigate={setView}>
      <div className="page">
        <div className="page-head">
          <div>
            <p className="eyebrow">Creator workspace</p>
            <h1>
              {view === 'overview' ? (
                <>
                  {greeting()}, {firstName} <em>✦</em>
                </>
              ) : (
                HEADINGS[view].title
              )}
            </h1>
            <p className="subtitle">
              {view === 'overview' ? 'Submit posts to live campaigns and get paid as your views climb.' : HEADINGS[view].subtitle}
            </p>
          </div>
          <div className="head-actions">
            <button className="btn btn-ghost" onClick={refresh}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}

        {view === 'overview' && (
          <>
            <div className="hero-grid">
              <div className="card balance-card bg-lavender dots">
                <div className="milestone-top">
                  <div>
                    <p className="balance-label">Total earnings</p>
                    <p className="balance-amount">{rupees(earnings?.totalEarnings ?? 0)}</p>
                  </div>
                  <span className="wallet-icon" aria-hidden="true">
                    <Wallet size={20} />
                  </span>
                </div>
                <div className="balance-foot">
                  <span>
                    {earnings?.submissionCount ?? 0} post{earnings?.submissionCount === 1 ? '' : 's'} submitted
                  </span>
                  {!!earnings?.unpaidDueToBudget && (
                    <span className="pill warn" title="Earned by milestones but not paid because a campaign ran out of budget">
                      {rupees(earnings.unpaidDueToBudget)} unpaid · budget out
                    </span>
                  )}
                </div>
              </div>
              <NextMilestoneCard submissions={submissions} campaigns={campaignsById} />
            </div>

            <section className="section">
              <div className="section-head">
                <div>
                  <p className="kicker">Open calls · live</p>
                  <h2>Campaigns you might like</h2>
                </div>
                {live.length > 3 && (
                  <button className="link-btn" onClick={() => setView('discover')}>
                    See all {live.length} campaigns <ArrowUpRight size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
              {campaignGrid(live.slice(0, 3), true)}
            </section>

            <section className="section">
              <div className="section-head">
                <div>
                  <p className="kicker">Your work</p>
                  <h2>Recent posts</h2>
                </div>
                {submissions.length > 4 && (
                  <button className="link-btn" onClick={() => setView('posts')}>
                    View all posts <ArrowUpRight size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
              <MySubmissions submissions={submissions} onChanged={refresh} limit={4} />
            </section>
          </>
        )}

        {view === 'discover' && <section className="section">{campaignGrid(live)}</section>}

        {view === 'posts' && (
          <section className="section">
            <MySubmissions submissions={submissions} onChanged={refresh} />
          </section>
        )}
      </div>
    </AppShell>
  );
}
