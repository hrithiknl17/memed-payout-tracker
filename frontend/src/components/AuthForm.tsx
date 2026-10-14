'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { Ladder, Wordmark } from './brand';

const ROLE_OPTIONS: { id: Role; title: string; blurb: string }[] = [
  { id: 'creator', title: 'Creator', blurb: 'Post for campaigns, earn by views' },
  { id: 'brand', title: 'Brand', blurb: 'Run campaigns with a budget' },
];

const SAMPLE_LADDER = [
  { views: 10_000, payout: 500 },
  { views: 50_000, payout: 2_000 },
  { views: 100_000, payout: 5_000 },
];

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const { login, signup } = useAuth();
  const [role, setRole] = useState<Role>('creator');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await signup({ name, email, password, role });
    } catch (err) {
      setError(err instanceof ApiError ? err.fullMessage : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const isSignup = mode === 'signup';
  return (
    <main className="auth">
      <section className="auth-hero">
        <Wordmark href="/" size="lg" />
        <div>
          <p className="eyebrow">Campaign payout tracker</p>
          <h1>
            Views in.
            <br />
            Payouts out.
          </h1>
          <p>Every payout is the highest milestone a post reaches, and no campaign spends past its budget.</p>
        </div>
        <div className="card receipt auth-receipt" aria-hidden="true">
          <span className="eyebrow">Example ladder</span>
          <Ladder milestones={SAMPLE_LADDER} views={62_000} />
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-card">
          <h2>{isSignup ? 'Create your account' : 'Log in'}</h2>
          <p className="muted" style={{ margin: '8px 0 26px' }}>
            {isSignup ? 'Earn as a creator, or run campaigns as a brand.' : 'Welcome back. Pick up where you left off.'}
          </p>

          <form onSubmit={onSubmit}>
            {isSignup && (
              <>
                <div className="field">
                  <span className="label" id="role-label">I am a…</span>
                  <div className="role-pick" role="radiogroup" aria-labelledby="role-label">
                    {ROLE_OPTIONS.map((r) => (
                      <button
                        type="button"
                        key={r.id}
                        role="radio"
                        aria-checked={role === r.id}
                        className={`role-option${role === r.id ? ' active' : ''}`}
                        onClick={() => setRole(r.id)}
                      >
                        <strong>{r.title}</strong>
                        <span>{r.blurb}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="name">{role === 'brand' ? 'Brand name' : 'Page / channel name'}</label>
                  <input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
                </div>
              </>
            )}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isSignup ? 8 : 1}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
              {isSignup && <p className="hint">At least 8 characters.</p>}
            </div>

            {isSignup && (
              <label className="check" style={{ marginTop: 18 }}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
                I agree to the terms &amp; privacy policy.
              </label>
            )}

            <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ marginTop: 24, padding: 15 }}>
              {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'} <ArrowRight size={18} />
            </button>
            {error && <p className="alert error" role="alert">{error}</p>}
          </form>

          <p className="muted" style={{ marginTop: 20 }}>
            {isSignup ? (
              <>
                Already have an account? <Link href="/login" className="link">Log in</Link>
              </>
            ) : (
              <>
                New here? <Link href="/signup" className="link">Sign up</Link>
              </>
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
