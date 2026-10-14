'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CampaignTable } from '@/components/CampaignTable';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/hooks';
import type { CampaignStatus } from '@/lib/types';

type Filter = 'all' | CampaignStatus;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'ended', label: 'Ended' },
  { id: 'exhausted', label: 'Budget used up' },
];

export default function BrandCampaignsPage() {
  const { data, error } = useLoad(() => api.myCampaigns());
  const [filter, setFilter] = useState<Filter>('all');
  const campaigns = (data?.campaigns ?? []).filter((c) => filter === 'all' || c.status === filter);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Campaigns</h1>
          <p>Every campaign, with budget distributed vs remaining.</p>
        </div>
        <div className="head-actions">
          <Link href="/brand/campaigns/new" className="btn btn-primary">
            <Plus size={18} /> New campaign
          </Link>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Filter campaigns">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} className={`tab${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <section className="section" style={{ marginTop: 22 }}>
        {error && <p className="alert error">{error}</p>}
        {!data && !error && <div className="skeleton" style={{ height: 260 }} />}
        {data && campaigns.length === 0 && (
          <div className="card empty">
            <h3>No campaigns here</h3>
            <p>{filter === 'all' ? 'Create one to get creators posting.' : 'Try another filter.'}</p>
          </div>
        )}
        {campaigns.length > 0 && <CampaignTable campaigns={campaigns} />}
      </section>
    </div>
  );
}
