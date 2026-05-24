'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { useAuth, RequireAuth } from '@/lib/auth';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/kyc', label: 'KYC Review' },
  { href: '/dashboard/drivers', label: 'Driver Documents' },
  { href: '/dashboard/vehicles', label: 'Vehicle Approval' },
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}>
      <aside style={{ width: 240, background: '#fff', borderRight: '1px solid #e5e7eb', padding: '24px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 24px 24px' }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>Rydalux Admin</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>Operations Console</p>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  color: active ? '#111827' : '#4b5563',
                  background: active ? '#f3f4f6' : 'transparent',
                  textDecoration: 'none',
                  borderRight: active ? '3px solid #111827' : '3px solid transparent',
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
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: '#374151',
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
