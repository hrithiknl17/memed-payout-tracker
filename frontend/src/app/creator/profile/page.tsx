'use client';

import { Mail, PencilLine, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Coin, PlatformIcon, PreviewBadge } from '@/components/brand';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, initials, platformLabel } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import type { Platform, SocialAccount } from '@/lib/types';

export default function ProfilePage() {
  const { refresh } = useAuth();
  const { data, error, reload } = useLoad(() => api.me());
  const profile = data?.user;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [handle, setHandle] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(input: { name?: string; socials?: SocialAccount[] }, success: string) {
    setBusy(true);
    setMsg(null);
    try {
      await api.updateProfile(input);
      await Promise.all([reload(), refresh()]);
      setMsg({ ok: true, text: success });
      return true;
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.fullMessage : 'Could not save' });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onSaveName(e: FormEvent) {
    e.preventDefault();
    if (await save({ name }, 'Name updated')) setEditing(false);
  }

  async function onAddSocial(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (await save({ socials: [...profile.socials, { platform, handle }] }, 'Social account added')) {
      setHandle('');
      setAdding(false);
    }
  }

  if (error) return <div className="page"><p className="alert error">{error}</p></div>;
  if (!profile) return <p className="loading">Loading profile…</p>;

  return (
    <div className="page" style={{ maxWidth: 880 }}>
      <div className="page-head">
        <h1>Profile</h1>
      </div>

      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <span className="avatar lg" aria-hidden="true">{initials(profile.name)}</span>
        <div style={{ flex: 1, minWidth: 220 }}>
          {editing ? (
            <form onSubmit={onSaveName} className="inline-form">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} aria-label="Display name" autoFocus />
              <button className="btn btn-primary btn-sm" disabled={busy}>Save</button>
              <button type="button" className="btn btn-soft btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </form>
          ) : (
            <h2 style={{ fontSize: 28 }}>{profile.name}</h2>
          )}
          <p className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0 0' }}>
            <Mail size={15} aria-hidden="true" /> {profile.email}
          </p>
          <p className="hint" style={{ marginTop: 4 }}>Creator since {formatDate(profile.createdAt)}</p>
        </div>
        {!editing && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setName(profile.name);
              setEditing(true);
            }}
          >
            <PencilLine size={17} /> Edit profile
          </button>
        )}
      </div>

      {msg && <p className={`alert ${msg.ok ? 'success' : 'error'}`} role="status">{msg.text}</p>}

      <button className="btn btn-ghost btn-block" style={{ marginTop: 24, padding: 18, fontSize: 17 }} disabled>
        <Coin size={22} /> Refer &amp; Earn <PreviewBadge />
      </button>

      <section className="section">
        <div className="section-head">
          <h2>Social accounts</h2>
          <span className="hint">Shown on your profile. Not verified.</span>
        </div>

        {profile.socials.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="list">
              {profile.socials.map((s, i) => (
                <div className="list-row" key={`${s.platform}-${s.handle}`}>
                  <PlatformIcon platform={s.platform} size={28} />
                  <div className="grow">
                    <span className="title">@{s.handle}</span>
                    <span className="sub">{platformLabel(s.platform)}</span>
                  </div>
                  <button
                    className="icon-btn"
                    aria-label={`Remove @${s.handle}`}
                    disabled={busy}
                    onClick={() => void save({ socials: profile.socials.filter((_, j) => j !== i) }, 'Social account removed')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {adding ? (
          <form className="card card-pad" onSubmit={onAddSocial} style={{ display: 'grid', gap: 12 }}>
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="field">
                <label htmlFor="platform">Platform</label>
                <select id="platform" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>
              <div className="field" style={{ marginTop: 0 }}>
                <label htmlFor="handle">Handle</label>
                <input id="handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourpage" required maxLength={61} />
              </div>
            </div>
            <div className="head-actions">
              <button className="btn btn-primary" disabled={busy}>Add account</button>
              <button type="button" className="btn btn-soft" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          profile.socials.length < 5 && (
            <button className="dashed-btn" onClick={() => setAdding(true)}>
              <Plus size={20} /> Add social
            </button>
          )
        )}
      </section>
    </div>
  );
}
