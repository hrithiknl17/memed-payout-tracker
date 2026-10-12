'use client';

import { useCallback, useEffect, useState } from 'react';
import { BrandCampaignCard } from '@/components/BrandCampaignCard';
import { CreateCampaignForm } from '@/components/CreateCampaignForm';
import { api, ApiError } from '@/lib/api';
import { useRequireRole } from '@/lib/auth';
import { rupees } from '@/lib/format';
import type { BrandCampaign } from '@/lib/types';

export default function BrandPage() {
  const user = useRequireRole('brand');
  const [campaigns, setCampaigns] = useState<BrandCampaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (!user) return <p className="muted">Loading…</p>;

  const totals = (campaigns ?? []).reduce(
    (t, c) => ({ budget: t.budget + c.budget, spent: t.spent + c.spent }),
    { budget: 0, spent: 0 },
  );

  return (
    <main>
      <h1>Your campaigns</h1>
      <p className="sub">Create campaigns and watch budget go out as creators hit milestones.</p>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Total budget</div>
          <div className="stat-value">{rupees(totals.budget)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Spent</div>
          <div className="stat-value">{rupees(totals.spent)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Remaining</div>
          <div className="stat-value">{rupees(totals.budget - totals.spent)}</div>
        </div>
      </div>

      <div className="grid grid-2">
        <CreateCampaignForm onCreated={load} />
        <section>
          <div className="row" style={{ marginBottom: 8 }}>
            <span className="muted small">Spend updates when creators&apos; view counts change.</span>
            <button className="secondary shrink" onClick={load}>
              Refresh
            </button>
          </div>
          {error && <p className="error">{error}</p>}
          {campaigns?.length === 0 && <div className="card empty">No campaigns yet — create your first one.</div>}
          {campaigns?.map((c) => <BrandCampaignCard key={c.id} campaign={c} />)}
        </section>
      </div>
    </main>
  );
}
