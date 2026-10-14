'use client';

import { ArrowLeft, ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { rupees } from '@/lib/format';
import type { Platform } from '@/lib/types';

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

export function CreateCampaignForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [budget, setBudget] = useState('50000');
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const updateRow = (i: number, key: keyof Row, value: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.createCampaign({
        name,
        platform,
        budget: Number(budget),
        milestones: rows.map((r) => ({ views: Number(r.views), payout: Number(r.payout) })),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.fullMessage : 'Could not create campaign');
    } finally {
      setBusy(false);
    }
  }

  // Payouts aren't cumulative, so the most one post can earn is the top rung.
  const topPayout = Math.max(0, ...rows.map((r) => Number(r.payout) || 0));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Campaign studio · New brief</p>
          <h1>
            Make something people <em>share</em>.
          </h1>
          <p className="subtitle">Set the budget and the milestone ladder. Creators find the angle.</p>
        </div>
        <button className="btn btn-ghost" type="button" onClick={onCancel}>
          <ArrowLeft size={15} /> Back
        </button>
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <section className="card card-pad">
          <p className="kicker">01 · Basics</p>
          <div className="field">
            <label htmlFor="cname">Campaign name</label>
            <input id="cname" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} placeholder="Late-night cravings" />
          </div>
          <div className="field">
            <label htmlFor="platform">Platform</label>
            <select id="platform" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="budget">Total budget</label>
            <div className="input-prefix">
              <span aria-hidden="true">₹</span>
              <input id="budget" type="number" min={1} step={1} value={budget} onChange={(e) => setBudget(e.target.value)} required />
            </div>
            <p className="field-hint">Total payouts across all posts can never go above this.</p>
          </div>
        </section>

        <section className="card card-pad">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <div>
              <p className="kicker">02 · Milestone ladder</p>
              <h2 style={{ fontSize: 20 }}>Pay for the moments that matter.</h2>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRows((rs) => [...rs, { views: '', payout: '' }])}>
              <Plus size={14} /> Add milestone
            </button>
          </div>
          <p className="field-hint">A post earns the payout of the highest milestone it reaches, not the sum of every rung.</p>

          {rows.map((r, i) => (
            <div className="milestone-row" key={i}>
              <span className="milestone-num">{String(i + 1).padStart(2, '0')}</span>
              <div className="field">
                <label htmlFor={`views-${i}`}>Views</label>
                <input id={`views-${i}`} type="number" min={1} step={1} value={r.views} onChange={(e) => updateRow(i, 'views', e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor={`payout-${i}`}>Payout (₹)</label>
                <input id={`payout-${i}`} type="number" min={1} step={1} value={r.payout} onChange={(e) => updateRow(i, 'payout', e.target.value)} required />
              </div>
              <button
                type="button"
                className="remove-btn"
                onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                disabled={rows.length === 1}
                aria-label={`Remove milestone ${i + 1}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <div className="form-summary">
            <span>Most a single post can earn</span>
            <strong>{rupees(topPayout)}</strong>
          </div>
          {error && (
            <p className="alert error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ marginTop: 18 }}>
            {busy ? 'Launching…' : 'Launch campaign'} <ArrowUpRight size={15} />
          </button>
        </section>
      </form>
    </div>
  );
}
