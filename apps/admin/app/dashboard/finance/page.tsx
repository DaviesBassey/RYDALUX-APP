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
  const [mismatches, setMismatches] = useState<any>(null);
  const [providerEvents, setProviderEvents] = useState<any>(null);
  const [refunds, setRefunds] = useState<any>(null);
  const [disputes, setDisputes] = useState<any>(null);
  const [operations, setOperations] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [sum, pay, po, led, wal, rec, mm, events, rfd, dsp, ops] = await Promise.all([
        api.getFinanceSummary(),
        api.getFinancePayments(10, 0),
        api.getFinancePayouts(10, 0),
        api.getFinanceLedger(10, 0),
        api.getFinanceWallets(10, 0),
        api.getFinanceReconciliation(),
        api.getFinanceReconciliationMismatches(20, 0),
        api.getFinanceProviderEvents('FAILED', 10, 0),
        api.getFinanceRefunds(10, 0),
        api.getFinanceDisputes(10, 0),
        api.getFinanceOperations(10, 0),
      ]);
      setSummary(sum);
      setPayments(pay);
      setPayouts(po);
      setLedger(led);
      setWallets(wal);
      setReconciliation(rec);
      setMismatches(mm);
      setProviderEvents(events);
      setRefunds(rfd);
      setDisputes(dsp);
      setOperations(ops);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runReconciliation() {
    setActionMessage('');
    setError('');
    try {
      const result = await api.runFinanceReconciliation();
      setActionMessage(`Reconciliation complete. Mismatches: ${result.mismatches?.total ?? 0}`);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function retryProviderEvent(id: string) {
    setActionMessage('');
    try {
      const result = await api.retryProviderEvent(id);
      setActionMessage(`Provider event retry finished: ${result.status ?? 'UNKNOWN'}`);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function deadLetterProviderEvent(id: string) {
    setActionMessage('');
    try {
      await api.deadLetterProviderEvent(id, 'Dead-lettered from finance dashboard');
      setActionMessage('Provider event moved to dead letter.');
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function retryPayout(id: string) {
    setActionMessage('');
    try {
      await api.retryPayout(id, 'Retried from finance dashboard');
      setActionMessage('Payout retry initiated.');
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

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
      {actionMessage && <div style={{ marginBottom: 16, padding: 12, background: '#dcfce7', color: '#166534', borderRadius: 8 }}>{actionMessage}</div>}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
                <h2 style={{ ...sectionTitle, margin: 0 }}>Reconciliation</h2>
                <button onClick={runReconciliation} style={{ border: 'none', borderRadius: 8, background: '#111827', color: '#f9d36a', padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}>
                  Run Reconciliation
                </button>
              </div>
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
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{reconciliation.failedProviderEvents ?? 0}</div><div style={{ fontSize: 12, color: '#6b7280' }}>Failed Events</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{reconciliation.unreversedRefunds ?? 0}</div><div style={{ fontSize: 12, color: '#6b7280' }}>Unreversed Refunds</div></div>
              </div>
            </div>
          )}

          {mismatches && (
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Mismatch Report ({mismatches.total ?? 0})</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{mismatches.stalePayouts?.length ?? 0}</div><div style={labelStyle}>Stale Processing Payouts</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{mismatches.providerEvents?.length ?? 0}</div><div style={labelStyle}>Provider Events</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{mismatches.refunds?.length ?? 0}</div><div style={labelStyle}>Refund Reversals</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{mismatches.paidPayoutsMissingLedger?.length ?? 0}</div><div style={labelStyle}>Payout Ledger Gaps</div></div>
                <div><div style={{ fontSize: 20, fontWeight: 700 }}>{mismatches.operations?.length ?? 0}</div><div style={labelStyle}>Operations</div></div>
              </div>
            </div>
          )}

          {providerEvents && (
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Failed Provider Events ({providerEvents.total})</h2>
              {providerEvents.items.length === 0 ? (
                <div style={{ color: '#6b7280' }}>No failed provider events.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Event</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Attempts</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Error</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providerEvents.items.map((event: any) => (
                      <tr key={event.id}>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{event.eventType}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{event.attemptCount}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>{event.lastError ?? '—'}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
                          <button onClick={() => retryProviderEvent(event.id)} style={{ marginRight: 8, border: '1px solid #111827', borderRadius: 6, background: '#fff', padding: '6px 10px', cursor: 'pointer' }}>Retry</button>
                          <button onClick={() => deadLetterProviderEvent(event.id)} style={{ border: '1px solid #b91c1c', color: '#b91c1c', borderRadius: 6, background: '#fff', padding: '6px 10px', cursor: 'pointer' }}>Dead-letter</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Action</th>
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
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
                          {p.status === 'FAILED' ? (
                            <button onClick={() => retryPayout(p.id)} style={{ border: '1px solid #111827', borderRadius: 6, background: '#fff', padding: '6px 10px', cursor: 'pointer' }}>Retry</button>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {refunds && (
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Refunds ({refunds.total})</h2>
              {refunds.items.length === 0 ? (
                <div style={{ color: '#6b7280' }}>No refunds.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Reference</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Ledger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.items.map((refund: any) => (
                      <tr key={refund.id}>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{refund.providerReference ?? refund.id}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>₦{parseFloat(refund.amount).toLocaleString()}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{refund.status}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{refund.ledgerReversedAt ? 'Reversed' : 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {disputes && (
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Disputes ({disputes.total})</h2>
              {disputes.items.length === 0 ? (
                <div style={{ color: '#6b7280' }}>No disputes.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Reference</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Admin</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disputes.items.map((dispute: any) => (
                      <tr key={dispute.id}>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{dispute.reference ?? dispute.providerDisputeId}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{dispute.status}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{dispute.adminStatus ?? '—'}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>{dispute.reason ?? dispute.adminNotes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {operations && (
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Financial Operations ({operations.total})</h2>
              {operations.items.length === 0 ? (
                <div style={{ color: '#6b7280' }}>No operations.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Entity</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.items.map((operation: any) => (
                      <tr key={operation.id}>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{operation.operationType}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{operation.entityType}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>{operation.status}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>{operation.errorMessage ?? '—'}</td>
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
