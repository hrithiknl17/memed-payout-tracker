'use client';

import { ArrowUpRight, Send, TrendingUp } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { campaignArt, platformLabel, rupees } from '@/lib/format';
import type { LiveCampaign } from '@/lib/types';
import { Ladder } from './Ladder';

/** First meaningful word of the campaign name, for the card art ("The 10-minute flex" → "10-minute"). */
function artWord(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words.find((w) => !/^(the|a|an)$/i.test(w)) ?? words[0] ?? '';
}

export function LiveCampaignCard({ campaign, onSubmitted }: { campaign: LiveCampaign; onSubmitted: () => void }) {
  const [open, setOpen] = useState(false);
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
      setOpen(false);
      setDone(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.fullMessage : 'Could not submit post');
    } finally {
      setBusy(false);
    }
  }

  const art = campaignArt(campaign.id);
  const platform = platformLabel(campaign.platform);
  const topPayout = Math.max(...campaign.milestones.map((m) => m.payout));
  const placeholder =
    campaign.platform === 'youtube' ? 'https://www.youtube.com/shorts/…' : 'https://www.instagram.com/reel/…';
  const inputId = `post-url-${campaign.id}`;

  return (
    <article className="card campaign-card">
      <div className={`art ${art.colour}`} aria-hidden="true">
        <div className="art-orbit" />
        <div className="art-orbit two" />
        <div className="art-title">
          <span>{campaign.brandName}</span>
          <strong>{artWord(campaign.name)}</strong>
        </div>
        <span className="pill art-tag">{platform}</span>
        <span className="sticker">{art.sticker}</span>
      </div>

      <div className="campaign-body">
        <div>
          <p className="kicker">{campaign.brandName}</p>
          <h3>{campaign.name}</h3>
        </div>
        <Ladder milestones={campaign.milestones} />
        <p className="small muted" style={{ margin: 0 }}>
          <TrendingUp size={13} aria-hidden="true" /> {rupees(campaign.remaining)} of {rupees(campaign.budget)} budget left
        </p>

        <div className="earn-row">
          <div>
            <span className="kicker">Earn up to</span>
            <strong>{rupees(topPayout)}</strong>
          </div>
          <button className="btn btn-accent btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? (
              'Cancel'
            ) : (
              <>
                Submit post <ArrowUpRight size={14} />
              </>
            )}
          </button>
        </div>

        {open && (
          <form className="submit-form" onSubmit={onSubmit}>
            <label htmlFor={inputId} className="small" style={{ fontWeight: 800 }}>
              Link to your {platform} post
            </label>
            <input
              id={inputId}
              type="url"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder={placeholder}
              required
              autoFocus
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
              <Send size={14} /> {busy ? 'Submitting…' : 'Submit link'}
            </button>
            {error && (
              <p className="inline-msg error" role="alert" style={{ margin: 0 }}>
                {error}
              </p>
            )}
          </form>
        )}
        {done && (
          <p className="inline-msg success" role="status" style={{ margin: 0 }}>
            Submitted. Track it under My posts.
          </p>
        )}
      </div>
    </article>
  );
}
