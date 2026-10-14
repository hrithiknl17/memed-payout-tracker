'use client';

import {
  BarChart3,
  Crown,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Send,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { initials } from '@/lib/format';
import type { Role, User } from '@/lib/types';
import { PixelLogo } from './brand';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Also highlight this item for nested routes under these prefixes. */
  matches?: string[];
}

// Same sections as the mobile app's bottom bar (Home, Participations, Wallet, Profile), plus the leaderboard.
const NAV: Record<Role, NavItem[]> = {
  creator: [
    { href: '/creator', label: 'Home', icon: Home, matches: ['/creator/campaigns'] },
    { href: '/creator/participations', label: 'Participations', icon: Send },
    { href: '/creator/wallet', label: 'Wallet', icon: Wallet },
    { href: '/creator/leaderboard', label: 'Leaderboard', icon: Crown },
    { href: '/creator/profile', label: 'Profile', icon: UserRound },
  ],
  brand: [
    { href: '/brand', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/brand/campaigns', label: 'Campaigns', icon: BarChart3, matches: ['/brand/campaigns/'] },
  ],
};

function isActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  if (item.href !== '/creator' && item.href !== '/brand' && pathname.startsWith(`${item.href}/`)) {
    return !(item.href === '/brand/campaigns' && pathname === '/brand/campaigns/new');
  }
  return (item.matches ?? []).some((m) => pathname.startsWith(m) && pathname !== '/brand/campaigns/new');
}

/** Desktop sidebar (drawer on phones) shared by both workspaces. */
export function AppShell({ user, children }: { user: User; children: ReactNode }) {
  const { logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const home = user.role === 'brand' ? '/brand' : '/creator';

  // Close the phone drawer after navigating.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className={`app${open ? ' nav-open' : ''}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-head">
          <PixelLogo href={home} />
          <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={22} />
          </button>
        </div>

        <nav className="nav">
          <p className="nav-label">{user.role === 'brand' ? 'Brand' : 'Creator'}</p>
          {NAV[user.role].map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`nav-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
                <Icon size={20} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          {user.role === 'brand' && (
            <Link href="/brand/campaigns/new" className="btn btn-primary nav-cta">
              <Plus size={18} /> New campaign
            </Link>
          )}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <span className="avatar" aria-hidden="true">
              {initials(user.name)}
            </span>
            <div>
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>
          </div>
          <button className="logout" onClick={logout}>
            <LogOut size={17} aria-hidden="true" /> Log out
          </button>
        </div>
      </aside>

      <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />

      <div className="main">
        <header className="topbar-mobile">
          <PixelLogo href={home} size="sm" />
          <button className="menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
