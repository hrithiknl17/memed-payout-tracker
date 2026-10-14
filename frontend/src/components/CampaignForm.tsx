'use client';

import { Lock, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { count, rupees, shortCount, toLocalInput } from '@/lib/format';
import type { Campaign, CampaignEdit, Platform } from '@/lib/types';
import { Coin, Thumb } from './brand';

interface Row {
  views: string;
  payout: string;
}

// The example ladder from the brief, as a sensible starting point.
const DEFAULT_ROWS: Row[] = [
  { views: '10000', payout: '500' },
  { views: '50000', payout: '2000' },
  { views: '100000', payout: '5000' },
];

/**
 * Create a campaign, or edit one. Editing only changes how the campaign is presented
 * (name, objective, cover, deadline): budget and milestones are locked once created.
 */
export function CampaignForm({ initial, onSaved }: { initial?: Campaign; onSaved: (campaign: Campaign) => void }) {
  const editing = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? '');
  const [platform, setPlatform] = useState<Platform>(initial?.platform ?? 'instagram');
  const [budget, setBudget] = useState(String(initial?.budget ?? 50000));
  const [objective, setObjective] = useState(initial?.objective ?? '');
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnailUrl ?? '');
  const [endsAt, setEndsAt] = useState(toLocalInput(initial?.endsAt));
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const updateRow = (i: number, key: keyof Row, value: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const deadline = endsAt ? new Date(endsAt).toISOString() : undefined;
    try {
      if (initial) {
        // Send only what changed, so an already-passed deadline isn't re-validated.
        const edit: CampaignEdit = {};
        if (name !== initial.name) edit.name = name;
        if (objective !== (initial.objective ?? '')) edit.objective = objective;
        if (thumbnailUrl !== (initial.thumbnailUrl ?? '')) edit.thumbnailUrl = thumbnailUrl;
        if (endsAt !== toLocalInput(initial.endsAt)) edit.endsAt = deadline ?? null;
        onSaved(Object.keys(edit).length ? (await api.updateCampaign(initial.id, edit)).campaign : initial);
      } else {
        const { campaign } = await api.createCampaign({
          name,
          platform,
          budget: Number(budget),
          milestones: rows.map((r) => ({ views: Number(r.views), payout: Number(r.payout) })),
          objective: objective || undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          endsAt: deadline,
        });
        onSaved(campaign);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.fullMessage : 'Could not save the campaign');
    } finally {
      setBusy(false);
    }
  }

  const ladder = initial?.milestones ?? rows.map((r) => ({ views: Number(r.views) || 0, payout: Number(r.payout) || 0 }));
  const maxPerPost = Math.max(0, ...ladder.map((m) => m.payout));

  return (
    <form className="split" onSubmit={onSubmit}>
      <div style={{ display: 'grid', gap: 20 }}>
        <section className="card card-pad">
          <h2 style={{ fontSize: 19, marginBottom: 16 }}>Campaign details</h2>
          <div className="field">
            <label htmlFor="name">Campaign name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} placeholder="Midnight snack drop" />
          </div>
          <div className="field">
            <label htmlFor="objective">Objectives</label>
            <textarea
              id="objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              maxLength={1000}
              placeholder="What should creators make? Hooks, mandatory caption or tag, dos and don'ts…"
            />
          </div>
          <div className="field">
            <label htmlFor="thumb">Cover image link</label>
            <input id="thumb" type="url" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://…/cover.jpg" />
            <p className="hint">Shown on campaign cards. Use an https image link.</p>
          </div>
          <div className="field">
            <label htmlFor="endsAt">Deadline (optional)</label>
            <div className="inline-form">
              <input id="endsAt" className="input" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              {endsAt && (
                <button type="button" className="btn btn-soft btn-sm" onClick={() => setEndsAt('')}>
                  No deadline
                </button>
              )}
            </div>
            <p className="hint">After the deadline no new posts are accepted. Posts already submitted keep earning until the budget runs out.</p>
          </div>
        </section>

        <section className="card card-pad">
          <div className="section-head" style={{ marginBottom: 6 }}>
            <h2 style={{ fontSize: 19 }}>Budget &amp; payout milestones</h2>
            {editing && (
              <span className="pill">
                <Lock size={13} aria-hidden="true" /> Locked after launch
              </span>
            )}
          </div>
          <p className="hint">A post earns the payout of the highest milestone it reaches, not the sum of every step.</p>

          {editing && initial ? (
            <>
              <div className="grid-2" style={{ marginTop: 16 }}>
                <div>
                  <span className="small muted">Platform</span>
                  <div style={{ fontWeight: 700 }}>{initial.platform === 'youtube' ? 'YouTube' : 'Instagram'}</div>
                </div>
                <div>
                  <span className="small muted">Total budget</span>
                  <div style={{ fontWeight: 700 }}>{rupees(initial.budget)}</div>
                </div>
              </div>
              <div className="list" style={{ marginTop: 14, border: '1.5px solid var(--line)', borderRadius: 16 }}>
                {initial.milestones.map((m) => (
                  <div className="list-row" key={m.views}>
                    <span className="grow"><strong>{shortCount(m.views)} views</strong></span>
                    <span className="coin-amount"><Coin /> {count(m.payout)}</span>
                  </div>
                ))}
              </div>
              <p className="hint" style={{ marginTop: 10 }}>
                Budget and milestones can&apos;t change once creators may have posted against them.
              </p>
            </>
          ) : (
            <>
              <div className="grid-2" style={{ marginTop: 16 }}>
                <div className="field">
                  <label htmlFor="platform">Platform</label>
                  <select id="platform" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>
                <div className="field" style={{ marginTop: 0 }}>
                  <label htmlFor="budget">Total budget</label>
                  <div className="input-prefix">
                    <span aria-hidden="true">₹</span>
                    <input id="budget" type="number" min={1} step={1} value={budget} onChange={(e) => setBudget(e.target.value)} required />
                  </div>
                </div>
              </div>
              {rows.map((r, i) => (
                <div className="milestone-row" key={i}>
                  <span className="milestone-num">{String(i + 1).padStart(2, '0')}</span>
                  <div className="field" style={{ marginTop: 0 }}>
                    <label htmlFor={`views-${i}`}>Views</label>
                    <input id={`views-${i}`} type="number" min={1} step={1} value={r.views} onChange={(e) => updateRow(i, 'views', e.target.value)} required />
                  </div>
                  <div className="field" style={{ marginTop: 0 }}>
                    <label htmlFor={`payout-${i}`}>Payout (₹)</label>
                    <input id={`payout-${i}`} type="number" min={1} step={1} value={r.payout} onChange={(e) => updateRow(i, 'payout', e.target.value)} required />
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                    disabled={rows.length === 1}
                    aria-label={`Remove milestone ${i + 1}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              <button type="button" className="dashed-btn" style={{ marginTop: 14 }} onClick={() => setRows((rs) => [...rs, { views: '', payout: '' }])}>
                <Plus size={18} /> Add milestone
              </button>
            </>
          )}
        </section>
      </div>

      <aside style={{ display: 'grid', gap: 16, position: 'sticky', top: 24 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="thumb">
            <Thumb src={thumbnailUrl || undefined} alt="Cover preview" />
          </div>
          <div className="campaign-body">
            <h3>{name || 'Your campaign name'}</h3>
            <p className="objective">{objective || 'Objectives appear here'}</p>
            <div className="earn-btn">
              <small>Earn upto</small>
              <strong><Coin size={22} /> {count(maxPerPost)}</strong>
            </div>
          </div>
        </div>
        <p className="hint" style={{ textAlign: 'center' }}>Live preview of the card creators will see</p>
        {error && <p className="alert error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Launch campaign'}
        </button>
      </aside>
    </form>
  );
}
