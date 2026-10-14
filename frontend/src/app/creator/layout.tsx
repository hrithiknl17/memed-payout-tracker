'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/lib/auth';

/** Every /creator/* page: creator-only, inside the sidebar shell. */
export default function CreatorLayout({ children }: { children: ReactNode }) {
  const user = useRequireRole('creator');
  if (!user) return <p className="loading">Loading…</p>;
  return <AppShell user={user}>{children}</AppShell>;
}
