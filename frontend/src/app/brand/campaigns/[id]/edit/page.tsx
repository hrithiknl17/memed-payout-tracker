'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CampaignForm } from '@/components/CampaignForm';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/hooks';

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error } = useLoad(async () => ({
    campaign: (await api.myCampaigns()).campaigns.find((c) => c.id === id) ?? null,
  }));

  return (
    <div className="page">
      <Link href={`/brand/campaigns/${id}`} className="back"><ArrowLeft size={16} /> Back to campaign</Link>
      <div className="page-head">
        <div>
          <h1>Edit campaign</h1>
          <p>Update the brief, cover and deadline. Budget and milestones stay as launched.</p>
        </div>
      </div>
      {error && <p className="alert error">{error}</p>}
      {!data && !error && <p className="loading">Loading…</p>}
      {data && !data.campaign && <p className="alert error">Campaign not found.</p>}
      {data?.campaign && <CampaignForm initial={data.campaign} onSaved={() => router.push(`/brand/campaigns/${id}`)} />}
    </div>
  );
}
