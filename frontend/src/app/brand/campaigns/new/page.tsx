'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CampaignForm } from '@/components/CampaignForm';

export default function NewCampaignPage() {
  const router = useRouter();
  return (
    <div className="page">
      <Link href="/brand" className="back"><ArrowLeft size={16} /> Dashboard</Link>
      <div className="page-head">
        <div>
          <h1>
            Make something people <span className="accent">share.</span>
          </h1>
          <p>Set the brief, the budget and the milestone ladder. Creators find the angle.</p>
        </div>
      </div>
      <CampaignForm onSaved={(c) => router.push(`/brand/campaigns/${c.id}`)} />
    </div>
  );
}
