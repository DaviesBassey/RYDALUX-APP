import React, { useState, useEffect, useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DriverStackParamList } from '../../navigation/DriverNavigator';
import {
  Shipment,
  ShipmentProof,
  ShipmentStatus,
  getDriverShipment,
  arrivePickup,
  verifyPickupOtp,
  startShipment,
  arriveDelivery,
  verifyDeliveryOtp,
  completeShipment,
  submitShipmentProof,
  TERMINAL_SHIPMENT_STATUSES,
} from '../../api/shipments';
import { cancelTrip } from '../../api/trips';
import { triggerSos } from '../../api/safety';

type Nav = NativeStackNavigationProp<DriverStackParamList, 'DriverActiveShipment'>;

const POLL_INTERVAL_MS = 5000;

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  DRAFT: 'Drafting shipment…',
  QUOTED: 'Quoted, waiting confirmation',
  REQUESTED: 'Looking for driver…',
  DRIVER_ASSIGNED: 'Heading to pickup',
  PICKUP_ARRIVED: 'Arrived at pickup',
  PICKUP_VERIFIED: 'Pickup OTP verified',
  IN_TRANSIT: 'Package in transit',
  DELIVERY_ARRIVED: 'Arrived at delivery location',
  DELIVERY_VERIFIED: 'Delivery OTP verified',
  DELIVERED: 'Package delivered',
  CANCELLED: 'Shipment cancelled',
  DISPUTED: 'Shipment in dispute',
  EXPIRED: 'Shipment expired',
};

export default function DriverActiveShipmentScreen({ route }: { route: any }) {
  const navigation = useNavigation<Nav>();
  const { shipmentId } = route.params;

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  // OTP Verification States
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  // Proof States
  const [proofUrl, setProofUrl] = useState('https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=400');
  const [proofNotes, setProofNotes] = useState('');
  const [showProofInput, setShowProofInput] = useState(false);

  const [sendingSos, setSendingSos] = useState(false);
  const [error, setError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchShipment() {
    try {
      const s = await getDriverShipment(shipmentId);
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

  async function handleArrivePickup() {
    setTransitioning(true);
    try {
      await arrivePickup(shipmentId);
      await fetchShipment();
      Alert.alert('Arrived', 'You have arrived at the pickup location. Enter the 6-digit OTP code provided by the sender.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Arrive pickup failed.');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleVerifyPickupOtp() {
    if (!otpCode.trim() || !/^\d{6}$/.test(otpCode.trim())) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit numeric OTP.');
      return;
    }
    setTransitioning(true);
    try {
      await verifyPickupOtp(shipmentId, otpCode.trim());
      setShowOtpInput(false);
      setOtpCode('');
      await fetchShipment();
      Alert.alert('Verified', 'Pickup verified successfully!');
    } catch (e: any) {
      Alert.alert('Verification Failed', e?.response?.data?.message || 'Incorrect OTP code.');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleStartShipment() {
    setTransitioning(true);
    try {
      await startShipment(shipmentId);
      await fetchShipment();
      Alert.alert('In Transit', 'Delivery starts! Navigate to the dropoff location.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to start shipment.');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleArriveDelivery() {
    setTransitioning(true);
    try {
      await arriveDelivery(shipmentId);
      await fetchShipment();
      Alert.alert('Arrived', 'Arrived at destination. Enter the 6-digit delivery OTP code provided by the recipient.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Arrive delivery failed.');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleVerifyDeliveryOtp() {
    if (!otpCode.trim() || !/^\d{6}$/.test(otpCode.trim())) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit numeric OTP.');
      return;
    }
    setTransitioning(true);
    try {
      await verifyDeliveryOtp(shipmentId, otpCode.trim());
      setShowOtpInput(false);
      setOtpCode('');
      await fetchShipment();
      Alert.alert('Verified', 'Delivery verified successfully! Now upload verification signature/proof.');
    } catch (e: any) {
      Alert.alert('Verification Failed', e?.response?.data?.message || 'Incorrect OTP code.');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleSubmitProof() {
    if (!proofUrl.trim()) {
      Alert.alert('Missing URL', 'Please enter a proof photo placeholder URL.');
      return;
    }
    setTransitioning(true);
    try {
      await submitShipmentProof(shipmentId, {
        url: proofUrl.trim(),
        notes: proofNotes.trim() || undefined,
      });
      setProofNotes('');
      setShowProofInput(false);
      await fetchShipment();
      Alert.alert('Submitted', 'Delivery proof photo uploaded successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to upload proof.');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleCompleteShipment() {
    setTransitioning(true);
    try {
      await completeShipment(shipmentId);
      await fetchShipment();
      stopPolling();
      Alert.alert('Completed', 'Shipment order successfully finalized and payment locked.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to complete shipment.');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleCancel() {
    if (!shipment) return;
    Alert.alert('Cancel Shipment', 'Are you sure you want to cancel this parcel delivery?', [
      { text: 'No, Keep Job', style: 'cancel' },
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
            Alert.alert('Error', e?.response?.data?.message || 'Cancel failed.');
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
      'This will alert our safety response team with your current location. Are you in danger?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS Alert',
          style: 'destructive',
          onPress: async () => {
            setSendingSos(true);
            try {
              const lat = shipment?.pickupLatitude ?? 0;
              const lng = shipment?.pickupLongitude ?? 0;
              await triggerSos({
                type: 'PANIC',
                latitude: lat,
                longitude: lng,
                notes: `SOS from driver during shipment ${shipment?.status ?? 'unknown'}`,
              });
              Alert.alert('SOS Sent', 'Safety response team has been alerted of your distress.');
              fetchShipment();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message || 'Could not trigger distress call.');
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
        <ActivityIndicator size="large" color="#d2b16d" />
      </SafeAreaView>
    );
  }

  if (!shipment) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Shipment order details not found.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Return to Console</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const status = shipment.status;
  const isTerminal = TERMINAL_SHIPMENT_STATUSES.includes(status);
  const statusLabel = STATUS_LABELS[status] || status;

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

        {/* Route Details */}
        <View style={styles.section}>
          <Text style={styles.label}>Pickup Address</Text>
          <Text style={styles.value}>{shipment.pickupAddress}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Dropoff Address</Text>
          <Text style={styles.value}>{shipment.dropoffAddress}</Text>
        </View>

        {/* Package & Recipient */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Parcel Specifications</Text>
          <DetailRow label="Category" value={shipment.packageCategory.replace('_', ' ')} />
          <DetailRow label="Priority" value={shipment.priority} />
          <DetailRow label="Recipient Name" value={shipment.recipientName} />
          <DetailRow label="Recipient Contact" value={shipment.recipientPhone} />
          {shipment.packageDescription && (
            <DetailRow label="Description" value={shipment.packageDescription} />
          )}
        </Card>

        {/* Earnings */}
        {shipment.quotedFare && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Payout Details</Text>
            <DetailRow label="Guaranteed Payout" value={`₦${parseFloat(String(shipment.quotedFare)).toLocaleString()}`} />
            {shipment.payment && (
              <DetailRow label="Payment Status" value={shipment.payment.status} />
            )}
          </Card>
        )}

        {/* Proof of Delivery */}
        {shipment.proofs.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Verification Signatures</Text>
            {shipment.proofs.map((p) => (
              <View key={p.id} style={styles.proofRow}>
                <Text style={styles.proofType}>{p.proofType}</Text>
                <Text style={styles.proofUrl} numberOfLines={1}>{p.url}</Text>
                {p.notes && <Text style={styles.proofNotes}>{p.notes}</Text>}
              </View>
            ))}
          </Card>
        )}

        {/* Double-Blind OTP & Transition actions */}
        {!isTerminal && (
          <View style={styles.actionsContainer}>
            {status === 'DRIVER_ASSIGNED' && (
              <ActionBtn label="I've Arrived at Pickup" onPress={handleArrivePickup} loading={transitioning} />
            )}

            {status === 'PICKUP_ARRIVED' && !showOtpInput && (
              <ActionBtn label="Enter Pickup 6-Digit OTP" onPress={() => setShowOtpInput(true)} loading={false} />
            )}

            {status === 'PICKUP_ARRIVED' && showOtpInput && (
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Enter 6-Digit Pickup Verification OTP</Text>
                <TextInput
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="••••••"
                  placeholderTextColor="#bbb"
                />
                <ActionBtn label="Verify Pickup OTP" onPress={handleVerifyPickupOtp} loading={transitioning} />
                <TouchableOpacity style={styles.cancelLink} onPress={() => setShowOtpInput(false)}>
                  <Text style={styles.cancelLinkText}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {status === 'PICKUP_VERIFIED' && (
              <ActionBtn label="Start Package Transit" onPress={handleStartShipment} loading={transitioning} />
            )}

            {status === 'IN_TRANSIT' && (
              <ActionBtn label="I've Arrived at Delivery Location" onPress={handleArriveDelivery} loading={transitioning} />
            )}

            {status === 'DELIVERY_ARRIVED' && !showOtpInput && (
              <ActionBtn label="Enter Delivery 6-Digit OTP" onPress={() => setShowOtpInput(true)} loading={false} />
            )}

            {status === 'DELIVERY_ARRIVED' && showOtpInput && (
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Enter 6-Digit Delivery Verification OTP</Text>
                <TextInput
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="••••••"
                  placeholderTextColor="#bbb"
                />
                <ActionBtn label="Verify Delivery OTP" onPress={handleVerifyDeliveryOtp} loading={transitioning} />
                <TouchableOpacity style={styles.cancelLink} onPress={() => setShowOtpInput(false)}>
                  <Text style={styles.cancelLinkText}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {status === 'DELIVERY_VERIFIED' && !showProofInput && shipment.proofs.length === 0 && (
              <ActionBtn label="Upload Delivery Proof Photo" onPress={() => setShowProofInput(true)} loading={false} />
            )}

            {status === 'DELIVERY_VERIFIED' && showProofInput && (
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Mock Proof Image URL</Text>
                <TextInput
                  style={styles.textInput}
                  value={proofUrl}
                  onChangeText={setProofUrl}
                  placeholder="https://example.com/delivery_signature.jpg"
                  autoCapitalize="none"
                />
                <Text style={styles.inputLabel}>Delivery Notes (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={proofNotes}
                  onChangeText={setProofNotes}
                  placeholder="e.g., Package handed over directly to receptionist"
                />
                <ActionBtn label="Submit Delivery Proof" onPress={handleSubmitProof} loading={transitioning} />
                <TouchableOpacity style={styles.cancelLink} onPress={() => setShowProofInput(false)}>
                  <Text style={styles.cancelLinkText}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {status === 'DELIVERY_VERIFIED' && shipment.proofs.length > 0 && (
              <ActionBtn label="Finalize & Complete Delivery" onPress={handleCompleteShipment} loading={transitioning} primary />
            )}
          </View>
        )}

        {/* Go back CTA in terminal status */}
        {isTerminal && (
          <ActionBtn label="Return to Console Home" onPress={() => navigation.navigate('DriverHome')} loading={false} primary />
        )}

        {/* SOS Alarm distress shortcut */}
        {!isTerminal && (
          <TouchableOpacity
            style={[styles.sosBtn, sendingSos && styles.btnDisabled]}
            onPress={handleSos}
            disabled={sendingSos}
          >
            {sendingSos ? <ActivityIndicator color="#fff" /> : <Text style={styles.sosText}>🚨 Emergency SOS Alert</Text>}
          </TouchableOpacity>
        )}

        {/* Cancel CTA */}
        {['DRIVER_ASSIGNED', 'PICKUP_ARRIVED'].includes(status) && (
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

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.cardContainer, style]}>{children}</View>;
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
  safe: { flex: 1, backgroundColor: '#f4f1eb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { padding: 24, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ref: { fontSize: 13, color: '#6b5d45', fontWeight: '600' },
  badge: { backgroundColor: '#d2b16d', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#111111', letterSpacing: 0.5 },
  status: { fontSize: 22, fontWeight: '900', color: '#1a1a2e', marginBottom: 24 },
  section: { marginBottom: 16 },
  label: { fontSize: 11, color: '#6b5d45', fontWeight: '800', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 15, color: '#333', lineHeight: 22 },
  cardContainer: {
    backgroundColor: '#fffaf1',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#ebebf5',
  },
  cardTitle: { fontSize: 11, fontWeight: '800', color: '#6b5d45', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { fontSize: 13, color: '#6b5d45', fontWeight: '600' },
  detailValue: { fontSize: 14, color: '#111', fontWeight: '750', flex: 1, textAlign: 'right' },
  proofRow: { marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e8e8f0' },
  proofType: { fontSize: 12, fontWeight: '700', color: '#1a1a2e', textTransform: 'uppercase' },
  proofUrl: { fontSize: 12, color: '#555', marginTop: 2 },
  proofNotes: { fontSize: 12, color: '#777', marginTop: 2, fontStyle: 'italic' },
  actionsContainer: { marginTop: 8 },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#333',
  },
  actionBtnPrimary: { backgroundColor: '#d2b16d' },
  btnDisabled: { opacity: 0.6 },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sosBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  sosText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  cancelBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#e94560', fontSize: 15, fontWeight: '700' },
  inputBox: { marginTop: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2b16d', borderRadius: 12, padding: 16 },
  inputLabel: { fontSize: 13, color: '#6b5d45', marginBottom: 10, fontWeight: '800', textTransform: 'uppercase' },
  otpInput: {
    borderWidth: 1.5,
    borderColor: '#d2b16d',
    borderRadius: 10,
    padding: 14,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 12,
    color: '#111',
    backgroundColor: '#fffaf1',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#ebebf5',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fffaf1',
    marginBottom: 12,
  },
  errorText: { color: '#e94560', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { padding: 12, backgroundColor: '#d2b16d', borderRadius: 10, alignSelf: 'center' },
  retryText: { color: '#fff', fontWeight: '750' },
  errorInline: { color: '#e94560', fontSize: 13, marginTop: 10, textAlign: 'center' },
  cancelLink: { marginTop: 12, alignItems: 'center' },
  cancelLinkText: { color: '#6b5d45', fontSize: 14, fontWeight: '700' },
});
