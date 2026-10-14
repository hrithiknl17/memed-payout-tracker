'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { useRequireRole } from '@/lib/auth';

/** Every /brand/* page: brand-only, inside the sidebar shell. */
export default function BrandLayout({ children }: { children: ReactNode }) {
  const user = useRequireRole('brand');
  if (!user) return <p className="loading">Loading…</p>;
  return <AppShell user={user}>{children}</AppShell>;
}
