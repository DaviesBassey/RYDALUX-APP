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
      login(res.accessToken, res.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="loginShell">
      <section className="loginCard" aria-label="Admin login">
        <div className="brandBlock">
          <img src="/brand/rydalux-logo-black.png" alt="Rydalux" className="brandLogo" />
          <p className="brandKicker">Operations console</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="submit"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </section>
      <style jsx>{`
        .loginShell {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 32px;
          background:
            linear-gradient(135deg, rgba(17, 17, 17, 0.08), transparent 34%),
            #f4f1eb;
        }

        .loginCard {
          width: 100%;
          max-width: 428px;
          padding: 38px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid #e4d7c4;
          border-radius: 18px;
          box-shadow: 0 24px 70px rgba(17, 17, 17, 0.16);
        }

        .brandBlock {
          margin-bottom: 30px;
          padding-bottom: 22px;
          border-bottom: 1px solid #eee4d6;
        }

        .brandLogo {
          display: block;
          width: 174px;
          height: auto;
        }

        .brandKicker {
          margin: 10px 0 0;
          color: #7b6744;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .field {
          margin-bottom: 18px;
        }

        .label {
          display: block;
          margin-bottom: 7px;
          color: #2a241b;
          font-size: 13px;
          font-weight: 700;
        }

        .input {
          box-sizing: border-box;
          width: 100%;
          padding: 13px 14px;
          border: 1px solid #d8cbb8;
          border-radius: 11px;
          background: #fbfaf7;
          color: #111111;
          font-size: 14px;
          outline: none;
          transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
        }

        .input:focus {
          border-color: #b8954d;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(210, 177, 109, 0.24);
        }

        .error {
          margin-bottom: 16px;
          padding: 11px 12px;
          border: 1px solid #fecaca;
          border-radius: 10px;
          background: #fff1f1;
          color: #991b1b;
          font-size: 14px;
        }

        .submit {
          box-sizing: border-box;
          width: 100%;
          padding: 14px;
          border: 1px solid #111111;
          border-radius: 11px;
          background: #111111;
          color: #ffffff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 140ms ease, background 140ms ease, box-shadow 140ms ease, opacity 140ms ease;
          box-shadow: 0 12px 26px rgba(17, 17, 17, 0.18);
        }

        .submit:hover:not(:disabled) {
          background: #1f1a12;
          box-shadow: 0 16px 30px rgba(17, 17, 17, 0.22);
          transform: translateY(-1px);
        }

        .submit:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 10px 20px rgba(17, 17, 17, 0.18);
        }

        .submit:focus-visible {
          outline: 3px solid rgba(210, 177, 109, 0.48);
          outline-offset: 3px;
        }

        .submit:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }
      `}</style>
    </main>
  );
}
