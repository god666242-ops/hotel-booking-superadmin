'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, CalendarCheck, LayoutDashboard, LogOut, Menu, ScrollText, Wallet, X } from 'lucide-react';
import { useSuperAdminAuth } from '@/context/SuperAdminAuthContext';
import { Avatar } from '@/components/ui';
import Logo from '@/components/Logo';

const nav = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/hotels', label: 'Hotels', icon: Building2 },
  { href: '/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/commission-invoices', label: 'Commission', icon: Wallet },
  { href: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
];

export default function DashboardLayout({ children }) {
  const { user, loading, logout } = useSuperAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => setOpen(false), [pathname]);

  if (loading || !user) return <div className="full-loader">Loading…</div>;

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const current = nav.find((n) => isActive(n.href));

  return (
    <div className="shell">
      <div className={`scrim ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand"><Link href="/" aria-label="PureBook Super Admin home"><Logo light /></Link><span className="brand-badge">Super Admin</span></div>
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`nav-link ${isActive(href) ? 'active' : ''}`} aria-current={isActive(href) ? 'page' : undefined}>
            <Icon size={18} /> {label}
          </Link>
        ))}
        <div className="sidebar-foot">
          <div className="user-chip"><Avatar name={user.name || user.email} size={30} /><span>{user.email}</span></div>
          <button className="btn ghost sm" onClick={logout}><LogOut size={14} /> Log out</button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X size={18} /> : <Menu size={18} />}</button>
          <strong>{current?.label || 'PureBook Admin'}</strong>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
