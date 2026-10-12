'use client';

import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { platformLabel, rupees } from '@/lib/format';
import type { Campaign } from '@/lib/types';
import { Ladder } from './Ladder';

export function LiveCampaignCard({ campaign, onSubmitted }: { campaign: Campaign; onSubmitted: () => void }) {
  const [postUrl, setPostUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    setBusy(true);
    try {
      await api.submitPost(campaign.id, postUrl);
      setPostUrl('');
      setDone(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.fullMessage : 'Could not submit post');
    } finally {
      setBusy(false);
    }
  }

  const placeholder =
    campaign.platform === 'youtube' ? 'https://www.youtube.com/shorts/…' : 'https://www.instagram.com/reel/…';

  return (
    <div className="card">
      <div className="campaign-head">
        <h2 style={{ marginBottom: 0 }}>{campaign.name}</h2>
        <span className="pill">{platformLabel(campaign.platform)}</span>
      </div>
      <p className="small muted" style={{ margin: '4px 0 0' }}>
        {rupees(campaign.remaining)} of {rupees(campaign.budget)} budget left
      </p>
      <Ladder milestones={campaign.milestones} />

      <form onSubmit={onSubmit} className="row" style={{ marginTop: 12 }}>
        <input
          type="url"
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
          placeholder={placeholder}
          aria-label="Post link"
          required
        />
        <button className="shrink" type="submit" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit post'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {done && <p className="success">Submitted — track it under “Your posts”.</p>}
    </div>
  );
}
