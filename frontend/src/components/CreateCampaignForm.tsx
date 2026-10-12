'use client';

import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
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

export function CreateCampaignForm({ onCreated }: { onCreated: () => void }) {
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
      setName('');
      setRows(DEFAULT_ROWS);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.fullMessage : 'Could not create campaign');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>New campaign</h2>

      <label htmlFor="cname">Name</label>
      <input id="cname" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} placeholder="Diwali sneaker drop" />

      <div className="row">
        <div>
          <label htmlFor="platform">Platform</label>
          <select id="platform" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>
        <div>
          <label htmlFor="budget">Total budget (₹)</label>
          <input id="budget" type="number" min={1} step={1} value={budget} onChange={(e) => setBudget(e.target.value)} required />
        </div>
      </div>

      <label>Milestone ladder</label>
      <p className="small muted" style={{ margin: '0 0 6px' }}>
        A post earns the payout of the highest milestone it reaches (not the sum).
      </p>
      {rows.map((r, i) => (
        <div className="row" key={i} style={{ marginBottom: 6 }}>
          <input type="number" min={1} step={1} aria-label="Views" placeholder="Views" value={r.views} onChange={(e) => updateRow(i, 'views', e.target.value)} required />
          <input type="number" min={1} step={1} aria-label="Payout ₹" placeholder="Payout ₹" value={r.payout} onChange={(e) => updateRow(i, 'payout', e.target.value)} required />
          <button
            type="button"
            className="secondary shrink"
            onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
            disabled={rows.length === 1}
            aria-label="Remove milestone"
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="secondary" onClick={() => setRows((rs) => [...rs, { views: '', payout: '' }])}>
        + Add milestone
      </button>

      <button className="full" type="submit" disabled={busy}>
        {busy ? 'Creating…' : 'Create campaign'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
