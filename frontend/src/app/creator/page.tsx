'use client';

import { useCallback, useEffect, useState } from 'react';
import { LiveCampaignCard } from '@/components/LiveCampaignCard';
import { MySubmissions } from '@/components/MySubmissions';
import { api, ApiError } from '@/lib/api';
import { useRequireRole } from '@/lib/auth';
import { rupees } from '@/lib/format';
import type { Campaign, Earnings, Submission } from '@/lib/types';

export default function CreatorPage() {
  const user = useRequireRole('creator');
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (!user) return <p className="muted">Loading…</p>;

  const refreshMine = () => void loadMine().catch(() => undefined);

  return (
    <main>
      <h1>Creator dashboard</h1>
      <p className="sub">Submit posts to live campaigns and get paid as your views climb.</p>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Total earnings</div>
          <div className="stat-value">{rupees(earnings?.totalEarnings ?? 0)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Posts submitted</div>
          <div className="stat-value">{earnings?.submissionCount ?? 0}</div>
        </div>
        {!!earnings?.unpaidDueToBudget && (
          <div className="stat" title="Earned by milestones but not paid because a campaign ran out of budget">
            <div className="stat-label">Unpaid (budget out)</div>
            <div className="stat-value" style={{ color: 'var(--warn)' }}>
              {rupees(earnings.unpaidDueToBudget)}
            </div>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="grid grid-2">
        <section>
          <div className="row" style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Live campaigns</h2>
            <button className="secondary shrink" onClick={() => void loadAll()}>
              Refresh
            </button>
          </div>
          {campaigns?.length === 0 && <div className="card empty">No live campaigns right now.</div>}
          {campaigns?.map((c) => <LiveCampaignCard key={c.id} campaign={c} onSubmitted={refreshMine} />)}
        </section>
        <section>
          <MySubmissions submissions={submissions} onChanged={refreshMine} />
        </section>
      </div>
    </main>
  );
}
