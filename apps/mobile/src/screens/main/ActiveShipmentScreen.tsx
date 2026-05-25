import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Shipment,
  ShipmentPin,
  ShipmentStatus,
  ShipmentProof,
  TERMINAL_SHIPMENT_STATUSES,
  PIN_VISIBLE_SHIPMENT_STATUSES,
  RIDER_CANCELLABLE_SHIPMENT_STATUSES,
  getShipment,
  getShipmentCodes,
} from '../../api/shipments';
import { cancelTrip } from '../../api/trips';
import { triggerSos } from '../../api/safety';
import { MainStackParamList } from '../../navigation/MainNavigator';

type Props = NativeStackScreenProps<MainStackParamList, 'ActiveShipment'>;

const POLL_INTERVAL_MS = 5000;

const STATUS_LABELS: Partial<Record<ShipmentStatus, string>> = {
  REQUESTED: 'Looking for a driver…',
  DRIVER_EN_ROUTE: 'Driver on the way to pickup',
  AT_PICKUP: 'Driver at pickup location',
  IN_TRANSIT: 'Package in transit',
  DELIVERED: 'Package delivered',
  CANCELLED: 'Shipment cancelled',
  FAILED: 'Shipment failed',
};

const STATUS_COLORS: Partial<Record<ShipmentStatus, string>> = {
  REQUESTED: '#f0a500',
  DRIVER_EN_ROUTE: '#3498db',
  AT_PICKUP: '#9b59b6',
  IN_TRANSIT: '#2ecc71',
  DELIVERED: '#27ae60',
  CANCELLED: '#e94560',
  FAILED: '#888',
};

export default function ActiveShipmentScreen({ route, navigation }: Props) {
  const { shipmentId } = route.params;

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [pin, setPin] = useState<ShipmentPin | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [sendingSos, setSendingSos] = useState(false);
  const [error, setError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchShipment() {
    try {
      const s = await getShipment(shipmentId);
      setShipment(s);
      setError('');

      if (PIN_VISIBLE_SHIPMENT_STATUSES.includes(s.status)) {
        try {
          const p = await getShipmentCodes(shipmentId);
          setPin(p);
        } catch {
          setPin(null);
        }
      } else {
        setPin(null);
      }

      if (TERMINAL_SHIPMENT_STATUSES.includes(s.status)) {
        stopPolling();
      }
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? 'Could not load shipment details.');
    } finally {
      setLoading(false);
    }
  }

  function startPolling() {
    fetchShipment();
    pollRef.current = setInterval(fetchShipment, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    startPolling();
    return stopPolling;
  }, [shipmentId]);

  async function handleCancel() {
    Alert.alert('Cancel shipment', 'Are you sure you want to cancel this shipment?', [
      { text: 'Keep shipment', style: 'cancel' },
      {
        text: 'Cancel shipment',
        style: 'destructive',
        onPress: async () => {
          if (!shipment) return;
          setCancelling(true);
          try {
            const updated = await cancelTrip(shipment.tripId);
            // Refresh to get updated shipment status (CANCELLED)
            await fetchShipment();
            stopPolling();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.error?.message ?? e?.response?.data?.message ?? 'Could not cancel the shipment.');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  }

  async function handleSos() {
    Alert.alert(
      '🚨 Emergency SOS',
      'This will alert our safety team with your current location. Are you in danger?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: async () => {
            setSendingSos(true);
            try {
              const lat = shipment?.pickup?.latitude ?? 0;
              const lng = shipment?.pickup?.longitude ?? 0;
              const sos = await triggerSos({
                type: 'PANIC',
                latitude: lat,
                longitude: lng,
                notes: `SOS from rider during shipment ${shipment?.status ?? 'unknown'}`,
              });
              Alert.alert('SOS Sent', `Safety team notified. SOS ID: ${sos.id}`);
              fetchShipment();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.error?.message ?? 'Could not send SOS.');
            } finally {
              setSendingSos(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={styles.loadingText}>Loading shipment…</Text>
      </SafeAreaView>
    );
  }

  if (error && !shipment) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchShipment} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!shipment) return null;

  const isTerminal = TERMINAL_SHIPMENT_STATUSES.includes(shipment.status);
  const canCancel = RIDER_CANCELLABLE_SHIPMENT_STATUSES.includes(shipment.status);
  const statusColor = STATUS_COLORS[shipment.status] ?? '#888';
  const statusLabel = STATUS_LABELS[shipment.status] ?? shipment.status;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        {/* Reference */}
        <Text style={styles.ref}>Ref: {shipment.reference}</Text>

        {/* Route */}
        <View style={styles.card}>
          <RouteRow label="From" value={shipment.pickup.address} />
          <View style={styles.routeDivider} />
          <RouteRow label="To" value={shipment.dropoff.address} />
        </View>

        {/* Recipient + Package details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Package Details</Text>
          <DetailRow label="Size" value={shipment.packageSizeClass} />
          {shipment.packageDescription && (
            <DetailRow label="Description" value={shipment.packageDescription} />
          )}
          <DetailRow label="Recipient" value={shipment.recipientName} />
          <DetailRow label="Phone" value={shipment.recipientPhone} />
          {shipment.specialInstructions && (
            <DetailRow label="Instructions" value={shipment.specialInstructions} />
          )}
        </View>

        {/* Fare */}
        {shipment.fare && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fare</Text>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Total</Text>
              <Text style={styles.fareTotal}>₦{parseFloat(shipment.fare.totalFare).toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Payment */}
        {shipment.payment && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment</Text>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Status</Text>
              <Text style={[styles.paymentStatus, { color: paymentStatusColor(shipment.payment.status) }]}>
                {shipment.payment.status}
              </Text>
            </View>
          </View>
        )}

        {/* PIN — shown when driver is en route / at pickup */}
        {pin && (
          <View style={styles.pinCard}>
            <Text style={styles.pinTitle}>Pickup PIN</Text>
            <Text style={styles.pinSub}>Share this PIN with the driver to confirm pickup.</Text>
            <Text style={styles.pinCode}>{pin.pin}</Text>
          </View>
        )}

        {/* Driver + vehicle */}
        {shipment.driver && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Driver</Text>
            <Text style={styles.driverName}>{shipment.driver.name ?? 'Driver'}</Text>
            {shipment.driver.phone && <Text style={styles.driverPhone}>{shipment.driver.phone}</Text>}
            {shipment.vehicle && (
              <View style={styles.vehicleRow}>
                <Text style={styles.vehicleText}>
                  {shipment.vehicle.color} {shipment.vehicle.make} {shipment.vehicle.model} ({shipment.vehicle.year})
                </Text>
                <Text style={styles.vehiclePlate}>{shipment.vehicle.registrationNumber}</Text>
              </View>
            )}
          </View>
        )}

        {/* Proofs */}
        {shipment.proofs.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Delivery Proofs</Text>
            {shipment.proofs.map((proof) => (
              <View key={proof.id} style={styles.proofRow}>
                <Text style={styles.proofType}>{proof.proofType}</Text>
                <Text style={styles.proofNotes}>{proof.notes ?? 'No notes'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* SOS button — shown during active non-terminal shipments */}
        {!isTerminal && (
          <TouchableOpacity
            style={[styles.sosBtn, sendingSos && styles.btnDisabled]}
            onPress={handleSos}
            disabled={sendingSos}
          >
            {sendingSos
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.sosText}>🚨 Emergency SOS</Text>}
          </TouchableOpacity>
        )}

        {/* Cancel button */}
        {canCancel && !isTerminal && (
          <TouchableOpacity
            style={[styles.cancelBtn, cancelling && styles.btnDisabled]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling
              ? <ActivityIndicator color="#e94560" />
              : <Text style={styles.cancelText}>Cancel Shipment</Text>}
          </TouchableOpacity>
        )}

        {/* Book again after terminal */}
        {isTerminal && (
          <TouchableOpacity style={styles.bookAgainBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.bookAgainText}>Book Another</Text>
          </TouchableOpacity>
        )}

        {error ? <Text style={styles.errorInline}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function RouteRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.routeRow}>
      <Text style={styles.routeLabel}>{label}</Text>
      <Text style={styles.routeValue}>{value}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function paymentStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED': return '#27ae60';
    case 'FAILED': return '#e94560';
    case 'PENDING': return '#f0a500';
    default: return '#555';
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  scroll: { padding: 20, paddingBottom: 40 },
  loadingText: { marginTop: 12, color: '#888', fontSize: 15 },
  errorText: { color: '#e94560', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { padding: 12, backgroundColor: '#e94560', borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 15, fontWeight: '700' },
  ref: { fontSize: 12, color: '#aaa', marginBottom: 16, marginLeft: 2 },
  card: {
    backgroundColor: '#f7f7fb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ebebf5',
  },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  routeLabel: { fontSize: 12, color: '#888', fontWeight: '600', width: 40 },
  routeValue: { fontSize: 15, color: '#1a1a2e', fontWeight: '600', flex: 1, textAlign: 'right' },
  routeDivider: { height: 1, backgroundColor: '#e8e8f0', marginVertical: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  detailValue: { fontSize: 14, color: '#1a1a2e', fontWeight: '600', flex: 1, textAlign: 'right' },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareLabel: { fontSize: 14, color: '#555' },
  fareTotal: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  paymentStatus: { fontSize: 14, fontWeight: '700' },
  pinCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  pinTitle: { fontSize: 13, fontWeight: '700', color: '#aab0c6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  pinSub: { fontSize: 12, color: '#7a829c', marginBottom: 14, textAlign: 'center' },
  pinCode: { fontSize: 48, fontWeight: '900', color: '#fff', letterSpacing: 12 },
  driverName: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  driverPhone: { fontSize: 14, color: '#555', marginBottom: 10 },
  vehicleRow: { backgroundColor: '#eef0f8', borderRadius: 8, padding: 10, marginTop: 4 },
  vehicleText: { fontSize: 13, color: '#444', marginBottom: 2 },
  vehiclePlate: { fontSize: 16, fontWeight: '800', color: '#1a1a2e', letterSpacing: 2 },
  proofRow: { marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e8e8f0' },
  proofType: { fontSize: 13, fontWeight: '700', color: '#1a1a2e', textTransform: 'uppercase' },
  proofNotes: { fontSize: 12, color: '#555', marginTop: 2 },
  sosBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  sosText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelBtn: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  cancelText: { color: '#e94560', fontSize: 16, fontWeight: '700' },
  bookAgainBtn: { backgroundColor: '#e94560', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  bookAgainText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorInline: { color: '#e94560', fontSize: 13, marginTop: 10, textAlign: 'center' },
});
