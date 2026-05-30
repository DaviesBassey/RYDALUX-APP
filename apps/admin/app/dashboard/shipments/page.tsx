'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/lib/components/PageHeader';

interface ShipmentTrackingEvent {
  id: string;
  eventType: string;
  status: string;
  location: string | null;
  createdAt: string;
  metadata?: any;
}

interface ShipmentItem {
  id: string;
  tripId: string;
  reference: string;
  status: string;
  tripStatus: string;
  senderName: string;
  recipientName: string;
  recipientPhone: string;
  packageCategory: string;
  priority: string;
  totalFare: number | null;
  paymentStatus: string | null;
  proofCount: number;
  driverName: string | null;
  driverProfileId: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

interface ShipmentsResponse {
  items: ShipmentItem[];
  total: number;
  limit: number;
  offset: number;
}

const STATUS_OPTIONS = ['', 'DRAFT', 'QUOTED', 'REQUESTED', 'DRIVER_ASSIGNED', 'PICKUP_ARRIVED', 'PICKUP_VERIFIED', 'IN_TRANSIT', 'DELIVERY_ARRIVED', 'DELIVERY_VERIFIED', 'DELIVERED', 'CANCELLED', 'DISPUTED', 'EXPIRED'];
const PRIORITY_OPTIONS = ['', 'STANDARD', 'EXPRESS', 'SCHEDULED'];
const CATEGORY_OPTIONS = ['', 'DOCUMENT', 'SMALL_PACKAGE', 'MEDIUM_PACKAGE', 'LARGE_PACKAGE', 'FRAGILE', 'HIGH_VALUE', 'OTHER'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DELIVERED: { bg: '#dcfce7', text: '#166534' },
  CANCELLED: { bg: '#fee2e2', text: '#b91c1c' },
  FAILED: { bg: '#fee2e2', text: '#b91c1c' },
  EXPIRED: { bg: '#f3f4f6', text: '#374151' },
  REQUESTED: { bg: '#f3f4f6', text: '#374151' },
  DRAFT: { bg: '#f3f4f6', text: '#374151' },
  QUOTED: { bg: '#f3f4f6', text: '#374151' },
  DRIVER_ASSIGNED: { bg: '#fef3c7', text: '#92400e' },
  PICKUP_ARRIVED: { bg: '#fef3c7', text: '#92400e' },
  PICKUP_VERIFIED: { bg: '#dbeafe', text: '#1e40af' },
  IN_TRANSIT: { bg: '#dbeafe', text: '#1e40af' },
  DELIVERY_ARRIVED: { bg: '#fef3c7', text: '#92400e' },
  DELIVERY_VERIFIED: { bg: '#dcfce7', text: '#166534' },
  DISPUTED: { bg: '#ffedd5', text: '#ea580c' },
};

function statusBadge(status: string) {
  const colors = STATUS_COLORS[status] || { bg: '#f3f4f6', text: '#374151' };
  return (
    <span
      className="inline-block px-3 py-1 text-xs font-semibold rounded-full"
      style={{
        background: colors.bg,
        color: colors.text,
      }}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

export default function ShipmentsPage() {
  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState(''); // 'assigned', 'unassigned', ''
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  // Form states for Admin actions inside expanded drawer
  const [assignDriverId, setAssignDriverId] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      // Use our new administration client method
      const res: ShipmentsResponse = await api.listAdminShipments(statusFilter || undefined, 100, 0);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by priority
    if (priorityFilter) {
      result = result.filter((item) => item.priority === priorityFilter);
    }

    // Filter by category
    if (categoryFilter) {
      result = result.filter((item) => item.packageCategory === categoryFilter);
    }

    // Filter by driver assignment
    if (assignmentFilter === 'assigned') {
      result = result.filter((item) => item.driverName !== null);
    } else if (assignmentFilter === 'unassigned') {
      result = result.filter((item) => item.driverName === null);
    }

    // Text search
    const q = search.trim().toLowerCase();
    if (!q) return result;
    return result.filter(
      (s) =>
        s.reference.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.tripId.toLowerCase().includes(q) ||
        s.recipientName.toLowerCase().includes(q) ||
        s.senderName.toLowerCase().includes(q) ||
        s.recipientPhone.includes(q),
    );
  }, [items, priorityFilter, categoryFilter, assignmentFilter, search]);

  async function toggleDetail(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    setAssignDriverId('');
    setDisputeReason('');
    setNewStatus('');
    setStatusReason('');
    try {
      const d = await api.getAdminShipment(id);
      setDetail(d);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }

  // Trigger Driver Assignment
  async function handleAssignDriver(id: string) {
    if (!assignDriverId.trim()) {
      AlertMock('Please enter a valid Driver UUID.');
      return;
    }
    setActionId(id);
    setActionMessage('');
    setError('');
    try {
      await api.assignShipmentDriver(id, assignDriverId.trim());
      setActionMessage(`Driver assigned successfully to shipment ${id}.`);
      await load();
      await toggleDetail(id); // Reload detail drawer
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  }

  // Trigger Dispute
  async function handleDispute(id: string) {
    if (!disputeReason.trim()) {
      AlertMock('Please provide a reason for the dispute.');
      return;
    }
    setActionId(id);
    setActionMessage('');
    setError('');
    try {
      await api.disputeShipment(id, disputeReason.trim());
      setActionMessage(`Dispute filed for shipment ${id}.`);
      await load();
      await toggleDetail(id); // Reload details
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  }

  // Trigger Custom Status Update
  async function handleUpdateStatus(id: string) {
    if (!newStatus) {
      AlertMock('Please select a target status.');
      return;
    }
    setActionId(id);
    setActionMessage('');
    setError('');
    try {
      await api.updateShipmentStatus(id, newStatus, statusReason.trim() || undefined);
      setActionMessage(`Shipment status updated to ${newStatus}.`);
      await load();
      await toggleDetail(id); // Reload details
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  }

  // Trigger Cancellation
  async function handleCancel(id: string) {
    setActionId(id);
    setActionMessage('');
    setError('');
    try {
      await api.cancelAdminShipment(id, 'Admin operations intervention cancellation');
      setActionMessage(`Shipment ${id} cancelled successfully.`);
      await load();
      await toggleDetail(id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  }

  function AlertMock(msg: string) {
    alert(msg);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Premium Shipments Dashboard"
        description="Monitor double-blind OTP verifications, route tracking timelines, and operational status transitions."
      />

      {error && (
        <div className="p-4 bg-red-900/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-center">
          <span className="mr-2">⚠️</span> {error}
        </div>
      )}
      {actionMessage && (
        <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm flex items-center">
          <span className="mr-2">✓</span> {actionMessage}
        </div>
      )}

      {/* Advanced Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-white/5 border border-white/10 p-4 rounded-xl shadow-inner">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg p-2 text-sm focus:outline-none focus:border-yellow-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s ? s.replace('_', ' ') : 'All Statuses'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Priority</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg p-2 text-sm focus:outline-none focus:border-yellow-500"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p || 'All Priorities'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg p-2 text-sm focus:outline-none focus:border-yellow-500"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c ? c.replace('_', ' ') : 'All Categories'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Driver State</label>
          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg p-2 text-sm focus:outline-none focus:border-yellow-500"
          >
            <option value="">All Driver States</option>
            <option value="assigned">Assigned Only</option>
            <option value="unassigned">Unassigned Only</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Search Input</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ref, phone, names…"
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg p-2 text-sm focus:outline-none focus:border-yellow-500"
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="bg-gray-950 border border-white/5 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 bg-gray-900/50 border-b border-white/5 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-400">
            Total Grid Entries: {filteredItems.length} of {total}
          </span>
          <button
            onClick={load}
            className="px-4 py-1.5 text-xs font-bold bg-yellow-500 hover:bg-yellow-400 text-gray-950 rounded-lg transition"
          >
            Sync Data
          </button>
        </div>

        {loading ? (
          <div className="p-20 text-center text-gray-400 font-medium flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            Loading logistics registry…
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-20 text-center text-gray-400 italic">No matching shipments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-white/[0.02] text-gray-400 border-b border-white/5 text-xs uppercase font-bold tracking-wider">
                  <th className="p-4">Reference</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Sender</th>
                  <th className="p-4">Recipient</th>
                  <th className="p-4">Driver</th>
                  <th className="p-4">Fare</th>
                  <th className="p-4 text-center">Proofs</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.map((item) => (
                  <>
                    <tr
                      key={item.id}
                      onClick={() => toggleDetail(item.id)}
                      className={`hover:bg-white/[0.01] cursor-pointer transition ${expandedId === item.id ? 'bg-white/[0.02]' : ''}`}
                    >
                      <td className="p-4">
                        <div className="font-semibold text-white">{item.reference}</div>
                        <div className="text-xs text-gray-500">{item.id.slice(0, 8)}…</div>
                      </td>
                      <td className="p-4">{statusBadge(item.status)}</td>
                      <td className="p-4 text-xs font-bold text-gray-400 uppercase">
                        {item.packageCategory.replace('_', ' ')}
                      </td>
                      <td className="p-4 text-gray-300 font-medium">{item.senderName}</td>
                      <td className="p-4">
                        <div className="text-gray-300 font-medium">{item.recipientName}</div>
                        <div className="text-xs text-gray-500">{item.recipientPhone}</div>
                      </td>
                      <td className="p-4 text-gray-300">
                        {item.driverName ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{item.driverName}</span>
                          </div>
                        ) : (
                          <span className="text-yellow-500/80 font-semibold text-xs">UNASSIGNED</span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-white">
                        {item.totalFare !== null ? `₦${Number(item.totalFare).toLocaleString()}` : '—'}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.proofCount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                          {item.proofCount}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                    </tr>

                    {/* Expandable Side Sheet Detail Overlay (Inline Row format for beautiful layout) */}
                    {expandedId === item.id && (
                      <tr>
                        <td colSpan={9} className="p-0 bg-gray-900/20 border-b border-white/5">
                          {detailLoading ? (
                            <div className="p-12 text-center text-gray-400 font-medium">Syncing live timelines…</div>
                          ) : detail ? (
                            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                              {/* Left Column: Shipment Specs */}
                              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 space-y-4">
                                <h3 className="text-xs font-black text-yellow-500 uppercase tracking-widest border-b border-white/5 pb-2">
                                  Parcel Specifications
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <div className="text-gray-500 mb-1">Trip ID</div>
                                    <div className="font-mono text-gray-300 break-all">{detail.tripId}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 mb-1">Trip Status</div>
                                    <div>{statusBadge(detail.tripStatus)}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 mb-1">Payment Status</div>
                                    <div className="font-semibold text-gray-300">{detail.payment?.status ?? '—'}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 mb-1">Priority Level</div>
                                    <div className="font-semibold text-gray-300">{detail.priority}</div>
                                  </div>
                                </div>
                                <div className="text-xs space-y-2 border-t border-white/5 pt-3">
                                  <div>
                                    <div className="text-gray-500">Pickup Location</div>
                                    <div className="font-semibold text-gray-300">{detail.pickupAddress}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">Dropoff Location</div>
                                    <div className="font-semibold text-gray-300">{detail.dropoffAddress}</div>
                                  </div>
                                </div>
                                {detail.specialInstructions && (
                                  <div className="text-xs border-t border-white/5 pt-3">
                                    <div className="text-gray-500 mb-1">Special Instructions</div>
                                    <div className="text-gray-300 italic">"{detail.specialInstructions}"</div>
                                  </div>
                                )}
                              </div>

                              {/* Middle Column: Live Timeline */}
                              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex flex-col">
                                <h3 className="text-xs font-black text-yellow-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-4">
                                  Live Tracking Events Timeline
                                </h3>
                                <div className="space-y-4 flex-1 overflow-y-auto max-h-[220px] pr-2">
                                  {detail.trackingEvents && detail.trackingEvents.length > 0 ? (
                                    detail.trackingEvents.map((evt: ShipmentTrackingEvent) => (
                                      <div key={evt.id} className="flex gap-3 text-xs">
                                        <div className="flex flex-col items-center">
                                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                                          <div className="w-0.5 flex-1 bg-white/10 mt-1"></div>
                                        </div>
                                        <div className="space-y-1">
                                          <div className="font-bold text-gray-200">
                                            {evt.eventType} - <span className="text-yellow-500/80">{evt.status}</span>
                                          </div>
                                          {evt.location && <div className="text-gray-500">Loc: {evt.location}</div>}
                                          <div className="text-[10px] text-gray-500">
                                            {new Date(evt.createdAt).toLocaleString()}
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-gray-500 italic text-center py-8">No live tracking events recorded yet.</div>
                                  )}
                                </div>
                              </div>

                              {/* Right Column: Actions */}
                              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 space-y-4">
                                <h3 className="text-xs font-black text-yellow-500 uppercase tracking-widest border-b border-white/5 pb-2">
                                  Operator Intervention Control Panel
                                </h3>

                                {/* Driver Assignment */}
                                <div className="space-y-2 text-xs">
                                  <label className="block text-gray-400 font-semibold">Assign Driver</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={assignDriverId}
                                      onChange={(e) => setAssignDriverId(e.target.value)}
                                      placeholder="Driver UUID..."
                                      className="flex-1 bg-gray-900 border border-gray-800 text-white rounded p-1.5 focus:outline-none"
                                    />
                                    <button
                                      onClick={() => handleAssignDriver(detail.id)}
                                      disabled={actionId === detail.id}
                                      className="px-3 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded transition"
                                    >
                                      Assign
                                    </button>
                                  </div>
                                </div>

                                {/* Dispute Handler */}
                                <div className="space-y-2 text-xs border-t border-white/5 pt-3">
                                  <label className="block text-gray-400 font-semibold">File Dispute</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={disputeReason}
                                      onChange={(e) => setDisputeReason(e.target.value)}
                                      placeholder="Distress/Dispute reason..."
                                      className="flex-1 bg-gray-900 border border-gray-800 text-white rounded p-1.5 focus:outline-none"
                                    />
                                    <button
                                      onClick={() => handleDispute(detail.id)}
                                      disabled={actionId === detail.id}
                                      className="px-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded transition"
                                    >
                                      Dispute
                                    </button>
                                  </div>
                                </div>

                                {/* Status Transitions */}
                                <div className="space-y-2 text-xs border-t border-white/5 pt-3">
                                  <label className="block text-gray-400 font-semibold">Force Lifecycle State</label>
                                  <div className="flex gap-2">
                                    <select
                                      value={newStatus}
                                      onChange={(e) => setNewStatus(e.target.value)}
                                      className="flex-1 bg-gray-900 border border-gray-800 text-white rounded p-1.5 focus:outline-none"
                                    >
                                      <option value="">Select State...</option>
                                      <option value="DELIVERED">DELIVERED</option>
                                      <option value="CANCELLED">CANCELLED</option>
                                      <option value="DISPUTED">DISPUTED</option>
                                    </select>
                                    <button
                                      onClick={() => handleUpdateStatus(detail.id)}
                                      disabled={actionId === detail.id}
                                      className="px-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded transition"
                                    >
                                      Update
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    value={statusReason}
                                    onChange={(e) => setStatusReason(e.target.value)}
                                    placeholder="Audit log remark..."
                                    className="w-full bg-gray-900 border border-gray-800 text-white rounded p-1.5 focus:outline-none text-[11px]"
                                  />
                                </div>

                                {/* Quick Cancel Button */}
                                {detail.status !== 'DELIVERED' && detail.status !== 'CANCELLED' && (
                                  <div className="border-t border-white/5 pt-3">
                                    <button
                                      onClick={() => handleCancel(detail.id)}
                                      disabled={actionId === detail.id}
                                      className="w-full py-2 bg-red-650 hover:bg-red-500 text-white text-xs font-bold rounded transition"
                                    >
                                      Intervene: Cancel Shipment Order
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
