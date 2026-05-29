'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { useAuth, RequireAuth } from '@/lib/auth';

const ALL_NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', permission: null },
  { href: '/dashboard/users', label: 'Users', permission: 'MANAGE_USERS' },
  { href: '/dashboard/riders', label: 'Riders', permission: 'MANAGE_RIDERS' },
  { href: '/dashboard/drivers', label: 'Drivers', permission: 'MANAGE_DRIVERS' },
  { href: '/dashboard/kyc', label: 'KYC Review', permission: 'MANAGE_KYC' },
  { href: '/dashboard/vehicles', label: 'Vehicles', permission: 'MANAGE_VEHICLES' },
  { href: '/dashboard/trips', label: 'Trips', permission: 'VIEW_TRIPS' },
  { href: '/dashboard/payments', label: 'Payments', permission: 'VIEW_PAYMENTS' },
  { href: '/dashboard/payouts', label: 'Payouts', permission: 'MANAGE_PAYOUTS' },
  { href: '/dashboard/ledger', label: 'Ledger', permission: 'VIEW_LEDGER' },
  { href: '/dashboard/support', label: 'Support Tickets', permission: 'MANAGE_SUPPORT' },
  { href: '/dashboard/safety', label: 'Safety', permission: 'MANAGE_SAFETY' },
  { href: '/dashboard/audit-logs', label: 'Audit Logs', permission: 'VIEW_AUDIT_LOGS' },
  { href: '/dashboard/settings', label: 'Settings', permission: 'MANAGE_SETTINGS' },
];

function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f1eb' }}>
      <aside style={{ width: 248, background: '#111111', borderRight: '1px solid #2b2418', padding: '24px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 24px 24px' }}>
          <img src="/brand/rydalux-logo-white.png" alt="Rydalux" style={{ display: 'block', width: 160, height: 'auto' }} />
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#d2b16d' }}>Operations Console</p>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ALL_NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  color: active ? '#111111' : '#d8d2c6',
                  background: active ? '#d2b16d' : 'transparent',
                  textDecoration: 'none',
                  borderRight: active ? '3px solid #ffffff' : '3px solid transparent',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ marginTop: 'auto', padding: '0 24px 24px' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 8,
              border: '1px solid #3a3122',
              background: '#1b1b1b',
              color: '#f8f3e8',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, maxWidth: 1200 }}>{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <DashboardShell>{children}</DashboardShell>
    </RequireAuth>
  );
}
