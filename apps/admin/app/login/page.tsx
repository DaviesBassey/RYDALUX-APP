'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login({
        email,
        password,
        fingerprint: 'admin-dashboard-' + Date.now(),
        deviceName: 'Admin Dashboard',
      });
      login(res.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f4f1eb' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: 32, background: '#fff', borderRadius: 10, boxShadow: '0 18px 48px rgba(17, 24, 39, 0.12)', border: '1px solid #eadfce' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <img src="/brand/rydalux-icon-light.png" alt="" style={{ width: 48, height: 48, borderRadius: 12 }} />
          <div>
            <img src="/brand/rydalux-logo-black.png" alt="Rydalux" style={{ display: 'block', width: 154, height: 'auto' }} />
            <p style={{ margin: '4px 0 0', color: '#6b5d45', fontSize: 13 }}>Operations dashboard</p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
            />
          </div>
          {error && <div style={{ marginBottom: 16, padding: 10, background: '#fee2e2', color: '#b91c1c', borderRadius: 8, fontSize: 14 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#111111', color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}
