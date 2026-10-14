'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { Logo } from './AppShell';

const ROLE_OPTIONS: { id: Role; title: string; blurb: string }[] = [
  { id: 'creator', title: 'Creator', blurb: 'Post for campaigns, earn by views' },
  { id: 'brand', title: 'Brand', blurb: 'Run campaigns with a budget' },
];

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const { login, signup } = useAuth();
  const [role, setRole] = useState<Role>('creator');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <section className="auth-art">
        <Logo />
        <div>
          <h1>
            Make the internet laugh. <em>Get paid</em> for it.
          </h1>
          <p>
            Brands set a budget and a milestone ladder. Creators post, views climb, and payouts land automatically,
            never past the budget.
          </p>
        </div>
        <div className="auth-ladder" aria-hidden="true">
          <div>
            <span>10K views</span>
            <span>₹500</span>
          </div>
          <div>
            <span>50K views</span>
            <span>₹2,000</span>
          </div>
          <div>
            <span>100K views</span>
            <span>₹5,000</span>
          </div>
        </div>
      </section>

      <section className="auth-form-wrap">
        <div className="card auth-card">
          <p className="eyebrow">{isSignup ? "Join Meme'd" : 'Welcome back'}</p>
          <h2>{isSignup ? 'Create your account' : 'Log in'}</h2>

          <form onSubmit={onSubmit} style={{ marginTop: 22 }}>
            {isSignup && (
              <>
                <div className="field">
                  <span id="role-label">I am a…</span>
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
              {isSignup && <p className="field-hint">At least 8 characters.</p>}
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ marginTop: 22 }}>
              {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
            </button>
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
          </form>

          <p className="auth-switch">
            {isSignup ? (
              <>
                Already have an account? <Link href="/login">Log in</Link>
              </>
            ) : (
              <>
                New here? <Link href="/signup">Create an account</Link>
              </>
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
