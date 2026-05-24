'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function FinancePage() {
  const [summary, setSummary] = useState<any>(null);
  const [payments, setPayments] = useState<any>(null);
  const [payouts, setPayouts] = useState<any>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [wallets, setWallets] = useState<any>(null);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [sum, pay, po, led, wal, rec] = await Promise.all([
        api.getFinanceSummary(),
        api.getFinancePayments(10, 0),
        api.getFinancePayouts(10, 0),
        api.getFinanceLedger(10, 0),
        api.getFinanceWallets(10, 0),
        api.getFinanceReconciliation(),
      ]);
      setSummary(sum);
      setPayments(pay);
      setPayouts(po);
      setLedger(led);
      setWallets(wal);
      setReconciliation(rec);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    margin: '0 0 16px',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 800,
    color: '#111827',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: 28, fontWeight: 700 }}>Finance Dashboard</h1>
      {error && <div style={{ marginBottom: 16, padding: 12, background: '#fee2e2', color: '#b91c1c', borderRadius: 8 }}>{error}</div>}
      {loading ? (
        <div style={{ color: '#6b7280' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Summary Cards */}
          {summary && (
            <div>
              <h2 style={sectionTitle}>Summary</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                <div style={cardStyle}>
                  <div style={valueStyle}>₦{summary.grossCapturedRevenue?.toLocaleString() ?? 0}</div>
                  <div style={labelStyle}>Gross Captured Revenue</div>
                </div>
                <div style={cardStyle}>
                  <div style={valueStyle}>₦{summary.platformCommission?.total?.toLocaleString() ?? 0}</div>
                  <div style={labelStyle}>Platform Commission ({summary.platformCommission?.count ?? 0})</div>
                </div>
                <div style={cardStyle}>
                  <div style={valueStyle}>₦{summary.driverEarnings?.total?.toLocaleString() ?? 0}</div>
                  <div style={labelStyle}>Driver Earnings ({summary.driverEarnings?.count ?? 0})</div>
                </div>
                <div style={cardStyle}>
                  <div style={valueStyle}>₦{summary.pendingPayouts?.total?.toLocaleString() ?? 0}</div>
                  <div style={labelStyle}>Pending Payouts ({summary.pendingPayouts?.count ?? 0})</div>
                </div>
                <div style={cardStyle}>
                  <div style={valueStyle}>₦{summary.paidPayouts?.total?.toLocaleString() ?? 0}</div>
                  <div style={labelStyle}>Paid Payouts ({summary.paidPayouts?.count ?? 0})</div>
                </div>
                <div style={cardStyle}>
                  <div style={valueStyle}>₦{summary.failedPayments?.total?.toLocaleString() ?? 0}</div>
                  <div style={labelStyle}>Failed Payments ({summary.failedPayments?.count ?? 0})</div>
                </div>
                <div style={cardStyle}>
                  <div style={valueStyle}>₦{summary.refunds?.total?.toLocaleString() ?? 0}</div>
                  <div style={labelStyle}>Refunds ({summary.refunds?.count ?? 0})</div>
                </div>
              </div>
            </div>
          )}

          {/* Reconciliation */}
          {reconciliation && (
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Reconciliation</h2>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 12,
                  background: reconciliation.status === 'CLEAR' ? '#dcfce7' : '#fee2e2',
                  color: reconciliation.status === 'CLEAR' ? '#166534' : '#b91c1c',
                  fontSize: 13,
                  fontWeight: 700,
                }}>
                  {reconciliation.status}
                </span>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Paystack: {reconciliation.paystackMode}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{reconciliation.ledgerTransactions}</div><div style={{ fontSize: 12, color: '#6b7280' }}>Ledger Txns</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{reconciliation.ledgerEntries}</div><div style={{ fontSize: 12, color: '#6b7280' }}>Ledger Entries</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{reconciliation.providerEvents}</div><div style={{ fontSize: 12, color: '#6b7280' }}>Provider Events</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{reconciliation.unprocessedProviderEvents}</div><div style={{ fontSize: 12, color: '#6b7280' }}>Unprocessed</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{reconciliation.failedPayments}</div><div style={{ fontSize: 12, color: '#6b7280' }}>Failed Payments</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{reconciliation.pendingPayouts}</div><div style={{ fontSize: 12, color: '#6b7280' }}>Pending Payouts</div></div>
              </div>
            </div>
          )}

          {/* Payment Status Summary */}
          {summary?.paymentStatusSummary && summary.paymentStatusSummary.length > 0 && (
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Payment Status Breakdown</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {summary.paymentStatusSummary.map((row: any) => (
                  <div key={row.status} style={{ padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{row.count}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{row.status}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>₦{row.total?.toLocaleString() ?? 0}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Payments */}
          {payments && (
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Recent Payments ({payments.total})</h2>
              {payments.items.length === 0 ? (
                <div style={{ color: '#6b7280' }}>No payments.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Ref</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Amount</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Provider</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.items.map((p: any) => (
                      <tr key={p.id}>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>{p.reference}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>₦{parseFloat(p.amount).toLocaleString()}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 12, background: p.status === 'CAPTURED' ? '#dcfce7' : p.status === 'FAILED' ? '#fee2e2' : '#f3f4f6', fontSize: 12, fontWeight: 600 }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13, color: '#6b7280' }}>{p.provider}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Recent Payouts */}
          {payouts && (
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Recent Payouts ({payouts.total})</h2>
              {payouts.items.length === 0 ? (
                <div style={{ color: '#6b7280' }}>No payouts.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Driver</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Amount</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.items.map((p: any) => (
                      <tr key={p.id}>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
                          <div style={{ fontWeight: 500 }}>{p.driver?.name || '—'}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{p.driver?.phone}</div>
                        </td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>₦{parseFloat(p.amount).toLocaleString()}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 12, background: p.status === 'PAID' ? '#dcfce7' : p.status === 'FAILED' ? '#fee2e2' : '#fef3c7', fontSize: 12, fontWeight: 600 }}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Recent Ledger */}
          {ledger && (
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Recent Ledger Entries ({ledger.total})</h2>
              {ledger.items.length === 0 ? (
                <div style={{ color: '#6b7280' }}>No ledger entries.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Account</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Amount</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.items.map((e: any) => (
                      <tr key={e.id}>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>{e.ledgerAccount?.name || '—'}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>₦{parseFloat(e.amount).toLocaleString()}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{e.entryType}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13, color: '#6b7280' }}>{e.financialTransaction?.eventType || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Wallets */}
          {wallets && (
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Wallets ({wallets.total})</h2>
              {wallets.items.length === 0 ? (
                <div style={{ color: '#6b7280' }}>No wallets.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>User</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Balance</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Currency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.items.map((w: any) => (
                      <tr key={w.id}>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
                          <div style={{ fontWeight: 500 }}>{w.user?.displayName || '—'}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{w.user?.phone}</div>
                        </td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{w.user?.userType}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 700 }}>₦{parseFloat(w.balance).toLocaleString()}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{w.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
