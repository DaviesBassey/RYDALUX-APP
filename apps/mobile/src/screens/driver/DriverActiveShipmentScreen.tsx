import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DriverStackParamList } from '../../navigation/DriverNavigator';
import {
  Shipment,
  ShipmentProof,
  ShipmentStatus,
  getShipment,
  arriveAtPickup,
  confirmPickup,
  submitShipmentProof,
  confirmDelivery,
  TERMINAL_SHIPMENT_STATUSES,
} from '../../api/shipments';
import { cancelTrip } from '../../api/trips';
import { triggerSos } from '../../api/safety';

type Nav = NativeStackNavigationProp<DriverStackParamList, 'DriverActiveShipment'>;

const POLL_INTERVAL_MS = 5000;

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Looking for driver…',
  DRIVER_EN_ROUTE: 'Heading to pickup',
  AT_PICKUP: 'Arrived at pickup',
  IN_TRANSIT: 'Package in transit',
  DELIVERED: 'Package delivered',
  CANCELLED: 'Shipment cancelled',
  FAILED: 'Shipment failed',
};

export default function DriverActiveShipmentScreen({ route }: { route: any }) {
  const navigation = useNavigation<Nav>();
  const { shipmentId } = route.params;

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [pin, setPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [showProofInput, setShowProofInput] = useState(false);
  const [sendingSos, setSendingSos] = useState(false);
  const [error, setError] = useState('');

  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchShipment() {
    try {
      const s = await getShipment(shipmentId);
      setShipment(s);
      setError('');
      if (TERMINAL_SHIPMENT_STATUSES.includes(s.status)) {
        stopPolling();
      }
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? 'Failed to load shipment.');
    }
  }

  function startPolling() {
    fetchShipment().finally(() => setLoading(false));
    pollRef.current = setInterval(() => {
      fetchShipment().catch(() => {});
    }, POLL_INTERVAL_MS);
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

  async function doArrive() {
    setTransitioning(true);
    try {
      await arriveAtPickup(shipmentId);
      await fetchShipment();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Arrive failed.');
    } finally {
      setTransitioning(false);
    }
  }

  async function doConfirmPickup() {
    if (!pin.trim() || !/^[0-9]{4}$/.test(pin.trim())) {
      Alert.alert('Invalid PIN', 'Enter the 4-digit pickup PIN.');
      return;
    }
    setTransitioning(true);
    try {
      await confirmPickup(shipmentId, pin.trim());
      setShowPinInput(false);
      setPin('');
      await fetchShipment();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Confirm pickup failed.');
    } finally {
      setTransitioning(false);
    }
  }

  async function doSubmitProof() {
    if (!proofUrl.trim()) {
      Alert.alert('Missing URL', 'Enter a proof URL.');
      return;
    }
    setTransitioning(true);
    try {
      await submitShipmentProof(shipmentId, {
        url: proofUrl.trim(),
        notes: proofNotes.trim() || undefined,
      });
      setProofUrl('');
      setProofNotes('');
      setShowProofInput(false);
      await fetchShipment();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Submit proof failed.');
    } finally {
      setTransitioning(false);
    }
  }

  async function doConfirmDelivery() {
    setTransitioning(true);
    try {
      await confirmDelivery(shipmentId);
      await fetchShipment();
      stopPolling();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Confirm delivery failed.');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleCancel() {
    if (!shipment) return;
    Alert.alert('Cancel Shipment', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setTransitioning(true);
          try {
            await cancelTrip(shipment.tripId);
            await fetchShipment();
            stopPolling();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.error?.message ?? 'Cancel failed.');
          } finally {
            setTransitioning(false);
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
                notes: `SOS from driver during shipment ${shipment?.status ?? 'unknown'}`,
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
      </SafeAreaView>
    );
  }

  if (!shipment) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Shipment not found.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const status: ShipmentStatus = shipment.status;
  const isTerminal = TERMINAL_SHIPMENT_STATUSES.includes(status);
  const statusLabel = STATUS_LABELS[status] ?? status;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.ref}>{shipment.reference}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PARCEL</Text>
          </View>
        </View>
        <Text style={styles.status}>{statusLabel}</Text>

        {/* Route */}
        <View style={styles.section}>
          <Text style={styles.label}>Pickup</Text>
          <Text style={styles.value}>{shipment.pickup.address}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Dropoff</Text>
          <Text style={styles.value}>{shipment.dropoff.address}</Text>
        </View>

        {/* Package & Recipient */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Package Details</Text>
          <DetailRow label="Size" value={shipment.packageSizeClass} />
          <DetailRow label="Recipient" value={shipment.recipientName} />
          <DetailRow label="Phone" value={shipment.recipientPhone} />
          {shipment.packageDescription && (
            <DetailRow label="Description" value={shipment.packageDescription} />
          )}
          {shipment.specialInstructions && (
            <DetailRow label="Instructions" value={shipment.specialInstructions} />
          )}
        </View>

        {/* Fare & Payment */}
        {(shipment.fare || shipment.payment) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment</Text>
            {shipment.fare && (
              <DetailRow label="Fare" value={`₦${parseFloat(shipment.fare.totalFare).toLocaleString()}`} />
            )}
            {shipment.payment && (
              <DetailRow label="Status" value={shipment.payment.status} />
            )}
          </View>
        )}

        {/* Proofs */}
        {shipment.proofs.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Submitted Proofs</Text>
            {shipment.proofs.map((p) => (
              <View key={p.id} style={styles.proofRow}>
                <Text style={styles.proofType}>{p.proofType}</Text>
                <Text style={styles.proofUrl} numberOfLines={1}>{p.url}</Text>
                {p.notes && <Text style={styles.proofNotes}>{p.notes}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Status-driven actions */}
        {status === 'DRIVER_EN_ROUTE' && (
          <ActionBtn label="I've Arrived at Pickup" onPress={doArrive} loading={transitioning} />
        )}

        {status === 'AT_PICKUP' && !showPinInput && (
          <ActionBtn label="Enter Pickup PIN" onPress={() => setShowPinInput(true)} loading={false} />
        )}

        {showPinInput && (
          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>Enter 4-digit pickup PIN</Text>
            <TextInput
              style={styles.pinInput}
              keyboardType="number-pad"
              maxLength={4}
              value={pin}
              onChangeText={setPin}
              placeholder="••••"
              placeholderTextColor="#bbb"
            />
            <ActionBtn label="Confirm Pickup" onPress={doConfirmPickup} loading={transitioning} />
          </View>
        )}

        {status === 'IN_TRANSIT' && (
          <>
            {!showProofInput && (
              <ActionBtn label="Add Delivery Proof" onPress={() => setShowProofInput(true)} loading={false} />
            )}

            {showProofInput && (
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Proof URL</Text>
                <TextInput
                  style={styles.textInput}
                  value={proofUrl}
                  onChangeText={setProofUrl}
                  placeholder="https://example.com/proof.jpg"
                  placeholderTextColor="#bbb"
                  autoCapitalize="none"
                />
                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={proofNotes}
                  onChangeText={setProofNotes}
                  placeholder="Delivery notes"
                  placeholderTextColor="#bbb"
                />
                <ActionBtn label="Submit Proof" onPress={doSubmitProof} loading={transitioning} />
              </View>
            )}

            {shipment.proofs.length > 0 && (
              <ActionBtn label="Confirm Delivery" onPress={doConfirmDelivery} loading={transitioning} primary />
            )}
          </>
        )}

        {/* Terminal state */}
        {isTerminal && (
          <ActionBtn label="Back to Home" onPress={() => navigation.navigate('DriverHome')} loading={false} primary />
        )}

        {/* SOS */}
        {!isTerminal && (
          <TouchableOpacity
            style={[styles.sosBtn, sendingSos && styles.btnDisabled]}
            onPress={handleSos}
            disabled={sendingSos}
          >
            {sendingSos ? <ActivityIndicator color="#fff" /> : <Text style={styles.sosText}>🚨 Emergency SOS</Text>}
          </TouchableOpacity>
        )}

        {/* Cancel */}
        {(status === 'DRIVER_EN_ROUTE' || status === 'AT_PICKUP') && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={transitioning}>
            <Text style={styles.cancelText}>Cancel Shipment</Text>
          </TouchableOpacity>
        )}

        {error ? <Text style={styles.errorInline}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
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

function ActionBtn({
  label,
  onPress,
  loading,
  primary = true,
}: {
  label: string;
  onPress: () => void;
  loading: boolean;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, primary && styles.actionBtnPrimary, loading && styles.btnDisabled]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { padding: 24, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ref: { fontSize: 13, color: '#aaa', fontWeight: '600' },
  badge: { backgroundColor: '#d2b16d', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#111111', letterSpacing: 0.5 },
  status: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 24 },
  section: { marginBottom: 16 },
  label: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  value: { fontSize: 15, color: '#333', lineHeight: 22 },
  card: {
    backgroundColor: '#f7f7fb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ebebf5',
  },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  detailValue: { fontSize: 14, color: '#1a1a2e', fontWeight: '600', flex: 1, textAlign: 'right' },
  proofRow: { marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e8e8f0' },
  proofType: { fontSize: 12, fontWeight: '700', color: '#1a1a2e', textTransform: 'uppercase' },
  proofUrl: { fontSize: 12, color: '#555', marginTop: 2 },
  proofNotes: { fontSize: 12, color: '#777', marginTop: 2, fontStyle: 'italic' },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#555',
  },
  actionBtnPrimary: { backgroundColor: '#e94560' },
  btnDisabled: { opacity: 0.6 },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sosBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  sosText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#e94560', fontSize: 15, fontWeight: '600' },
  inputBox: { marginTop: 16, backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16 },
  inputLabel: { fontSize: 14, color: '#444', marginBottom: 10, fontWeight: '600' },
  pinInput: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 10,
    color: '#1a1a2e',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1a1a2e',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  errorText: { color: '#e94560', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { padding: 12, backgroundColor: '#e94560', borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  errorInline: { color: '#e94560', fontSize: 13, marginTop: 10, textAlign: 'center' },
});
