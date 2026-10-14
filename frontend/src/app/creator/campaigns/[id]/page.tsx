'use client';

import { ArrowLeft, ArrowUpRight, Send, Timer } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Coin, PlatformIcon, Progress, Thumb } from '@/components/brand';
import { NextMilestone } from '@/components/NextMilestone';
import { SimulateViews } from '@/components/SimulateViews';
import { SubmissionStatus } from '@/components/SubmissionStatus';
import { api, ApiError } from '@/lib/api';
import { count, deadlineLabel, formatDate, platformLabel, rupees, shortCount, statusLabel, topPayout } from '@/lib/format';
import { useCreatorData } from '@/lib/hooks';

export default function CreatorCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useCreatorData();
  const [postUrl, setPostUrl] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const campaign = data ? [...data.live, ...data.ended].find((c) => c.id === id) : undefined;
  const mine = data?.submissions.filter((s) => s.campaignId === id) ?? [];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!campaign) return;
    setSubmitError(null);
    setSubmitted(false);
    setBusy(true);
    try {
      await api.submitPost(campaign.id, postUrl);
      setPostUrl('');
      setSubmitted(true);
      await reload();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.fullMessage : 'Could not submit your post');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="page"><p className="alert error">{error}</p></div>;
  if (!data) return <p className="loading">Loading campaign…</p>;
  if (!campaign) {
    return (
      <div className="page">
        <Link href="/creator" className="back"><ArrowLeft size={16} /> Back to campaigns</Link>
        <div className="card empty">
          <h3>This campaign isn&apos;t available</h3>
          <p>It may have ended a while ago or been removed.</p>
        </div>
      </div>
    );
  }

  const live = campaign.status === 'live';
  const deadline = deadlineLabel(campaign.endsAt);
  const placeholder = campaign.platform === 'youtube' ? 'https://www.youtube.com/shorts/…' : 'https://www.instagram.com/reel/…';

  return (
    <div className="page">
      <Link href="/creator" className="back"><ArrowLeft size={16} /> Back to campaigns</Link>

      <div className="split">
        <article className="card" style={{ overflow: 'hidden' }}>
          <div className="thumb" style={{ aspectRatio: '16 / 8' }}>
            <Thumb src={campaign.thumbnailUrl} alt={`${campaign.name} cover`} />
            {deadline && live && <span className="pill dark"><Timer size={15} aria-hidden="true" /> {deadline}</span>}
            {!live && <span className="pill dark">{statusLabel(campaign)}</span>}
          </div>
          <div className="card-pad">
            <div className="pills">
              <span className="pill"><PlatformIcon platform={campaign.platform} /> {platformLabel(campaign.platform)}</span>
              <span className="pill outline">{campaign.brandName}</span>
              {campaign.endsAt && <span className="pill">Ends {formatDate(campaign.endsAt)}</span>}
            </div>
            <h1 style={{ marginTop: 14, fontSize: 'clamp(26px, 3vw, 36px)' }}>{campaign.name}</h1>

            <h2 style={{ marginTop: 28, fontSize: 18 }}>Objectives</h2>
            <p style={{ marginTop: 8, whiteSpace: 'pre-line' }} className={campaign.objective ? undefined : 'muted'}>
              {campaign.objective || 'The brand has not added a brief yet. Any on-platform post that fits the campaign counts.'}
            </p>

            <h2 style={{ marginTop: 28, fontSize: 18 }}>Payout milestones</h2>
            <div className="list" style={{ marginTop: 10, border: '1.5px solid var(--line)', borderRadius: 16 }}>
              {campaign.milestones.map((m) => (
                <div className="list-row" key={m.views}>
                  <span className="grow"><strong>{shortCount(m.views)} views</strong></span>
                  <span className="coin-amount"><Coin /> {count(m.payout)}</span>
                </div>
              ))}
            </div>
            <p className="hint" style={{ marginTop: 10 }}>
              You earn the highest milestone your post reaches, not the sum of every step. Payouts stop once the budget is fully distributed.
            </p>
          </div>
        </article>

        <aside style={{ display: 'grid', gap: 20 }}>
          <div className="card card-pad" style={{ display: 'grid', gap: 14 }}>
            <div className="earn-btn" style={{ marginTop: 0 }}>
              <small>Earn upto</small>
              <strong><Coin size={22} /> {count(topPayout(campaign))}</strong>
            </div>
            <div className="distributed">
              <Coin size={16} />
              <strong>{shortCount(campaign.spent)} of {shortCount(campaign.budget)}</strong>
              <span>distributed to creators</span>
            </div>
            <Progress value={campaign.spent} max={campaign.budget} large label="Budget distributed" />
            <p className="hint">{rupees(campaign.remaining)} left in the budget.</p>

            {live ? (
              <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10, marginTop: 6 }}>
                <div className="field">
                  <label htmlFor="post-url">Participate: link your {platformLabel(campaign.platform)} post</label>
                  <input id="post-url" type="url" required value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder={placeholder} />
                </div>
                <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                  <Send size={17} /> {busy ? 'Submitting…' : 'Submit post'}
                </button>
                {submitError && <p className="alert error" role="alert">{submitError}</p>}
                {submitted && (
                  <p className="alert success" role="status">
                    Submitted! Track it in <Link href="/creator/participations" className="link">Participations</Link>.
                  </p>
                )}
              </form>
            ) : (
              <p className="alert error" style={{ marginTop: 0 }}>
                {campaign.status === 'ended' ? 'This campaign has ended.' : 'This campaign has used its whole budget.'} It no longer accepts new posts.
              </p>
            )}
          </div>

          {mine.length > 0 && (
            <div className="card">
              <div className="card-pad" style={{ paddingBottom: 6 }}>
                <h2 style={{ fontSize: 18 }}>Your posts on this campaign</h2>
                <p className="hint" style={{ marginTop: 4 }}>Use “Set views” to simulate the platform reporting views.</p>
              </div>
              <div className="list">
                {mine.map((s) => (
                  <div className="list-row" key={s.id} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <a className="url" href={s.postUrl} target="_blank" rel="noreferrer">
                        {s.postUrl.replace(/^https:\/\//, '')} <ArrowUpRight size={12} aria-hidden="true" />
                      </a>
                      <strong style={{ color: 'var(--good)' }}>{rupees(s.paidAmount)}</strong>
                    </div>
                    <div className="pills"><span className="pill">{count(s.views)} views</span><SubmissionStatus s={s} /></div>
                    {s.review !== 'rejected' && <NextMilestone milestones={campaign.milestones} views={s.peakViews} />}
                    <SimulateViews submission={s} onChanged={() => void reload()} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
