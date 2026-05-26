import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Trip,
  TripPin,
  TripStatus,
  TERMINAL_STATUSES,
  PIN_VISIBLE_STATUSES,
  RIDER_CANCELLABLE_STATUSES,
  getTrip,
  getTripPin,
  cancelTrip,
} from '../../api/trips';
import { triggerSos } from '../../api/safety';
import { MainStackParamList } from '../../navigation/MainNavigator';

type Props = NativeStackScreenProps<MainStackParamList, 'ActiveTrip'>;

const POLL_INTERVAL_MS = 5000;

const STATUS_LABELS: Partial<Record<TripStatus, string>> = {
  REQUESTED: 'Looking for a driver…',
  DRIVER_ASSIGNED: 'Driver assigned — heading your way',
  DRIVER_ARRIVING: 'Driver is on the way',
  DRIVER_ARRIVED: 'Driver has arrived',
  PIN_VERIFIED: 'Identity verified — trip starting',
  IN_PROGRESS: 'Trip in progress',
  COMPLETED: 'Trip completed',
  CANCELLED_BY_RIDER: 'You cancelled this trip',
  CANCELLED_BY_DRIVER: 'Driver cancelled this trip',
  EXPIRED: 'Trip expired — no driver found',
  DISPUTED: 'Trip under review',
};

const STATUS_COLORS: Partial<Record<TripStatus, string>> = {
  REQUESTED: '#c5a059',
  DRIVER_ASSIGNED: '#1a1a2e',
  DRIVER_ARRIVING: '#1a1a2e',
  DRIVER_ARRIVED: '#111111',
  PIN_VERIFIED: '#111111',
  IN_PROGRESS: '#111111',
  COMPLETED: '#2d4a3e',
  CANCELLED_BY_RIDER: '#b42318',
  CANCELLED_BY_DRIVER: '#b42318',
  EXPIRED: '#6b5d45',
  DISPUTED: '#6b5d45',
};

export default function ActiveTripScreen({ route, navigation }: Props) {
  const { tripId } = route.params;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [pin, setPin] = useState<TripPin | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [sendingSos, setSendingSos] = useState(false);
  const [error, setError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchTrip() {
    try {
      const t = await getTrip(tripId);
      setTrip(t);
      setError('');

      if (PIN_VISIBLE_STATUSES.includes(t.status)) {
        try {
          const p = await getTripPin(tripId);
          setPin(p);
        } catch {
          setPin(null);
        }
      } else {
        setPin(null);
      }

      // Stop polling once trip reaches a terminal state
      if (TERMINAL_STATUSES.includes(t.status)) {
        stopPolling();
      }
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? 'Could not load trip details.');
    } finally {
      setLoading(false);
    }
  }

  function startPolling() {
    fetchTrip();
    pollRef.current = setInterval(fetchTrip, POLL_INTERVAL_MS);
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
  }, [tripId]);

  async function handleCancel() {
    Alert.alert('Cancel ride', 'Are you sure you want to cancel this trip?', [
      { text: 'Keep ride', style: 'cancel' },
      {
        text: 'Cancel ride',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await cancelTrip(tripId);
            stopPolling();
            navigation.navigate('Home');
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.error?.message ?? e?.response?.data?.message ?? 'Could not cancel the trip.');
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
              // Use trip pickup location as fallback; in production use device GPS
              const lat = trip?.pickup?.latitude ?? 0;
              const lng = trip?.pickup?.longitude ?? 0;
              const sos = await triggerSos({
                type: 'PANIC',
                latitude: lat,
                longitude: lng,
                notes: `SOS from rider during ${trip?.status ?? 'unknown'}`,
              });
              Alert.alert('SOS Sent', `Safety team notified. SOS ID: ${sos.id}`);
              // Refresh trip to show safety flagged state
              fetchTrip();
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
        <ActivityIndicator size="large" color="#111111" />
        <Text style={styles.loadingText}>Loading trip…</Text>
      </SafeAreaView>
    );
  }

  if (error && !trip) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchTrip} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!trip) return null;

  const isTerminal = TERMINAL_STATUSES.includes(trip.status);
  const canCancel = RIDER_CANCELLABLE_STATUSES.includes(trip.status);
  const statusColor = STATUS_COLORS[trip.status] ?? '#888';
  const statusLabel = STATUS_LABELS[trip.status] ?? trip.status;
  const pickupAddress = trip.pickup?.address ?? 'Pickup unavailable';
  const dropoffAddress = trip.dropoff?.address ?? 'Dropoff unavailable';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.brandBlock}>
          <Image
            source={require('../../../assets/brand/rydalux-logo-black.png')}
            style={styles.brandLogo}
          />
        </View>
        
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        {/* Reference */}
        <Text style={styles.ref}>Ref: {trip.reference}</Text>

        {/* Route */}
        <View style={styles.card}>
          <RouteRow label="From" value={pickupAddress} />
          <View style={styles.routeDivider} />
          <RouteRow label="To" value={dropoffAddress} />
        </View>

        {/* Fare */}
        {trip.fare && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fare</Text>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Total</Text>
              <Text style={styles.fareTotal}>₦{parseFloat(trip.fare.totalFare).toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* PIN — shown when driver is assigned/arriving/arrived */}
        {pin && (
          <View style={styles.pinCard}>
            <Text style={styles.pinTitle}>Your Safety PIN</Text>
            <Text style={styles.pinSub}>Show this to your driver to verify your identity.</Text>
            <Text style={styles.pinCode}>{pin.pin}</Text>
          </View>
        )}

        {/* Driver + vehicle */}
        {trip.driver && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Driver</Text>
            <Text style={styles.driverName}>{trip.driver.name ?? 'Driver'}</Text>
            {trip.driver.phone && <Text style={styles.driverPhone}>{trip.driver.phone}</Text>}
            {trip.vehicle && (
              <View style={styles.vehicleRow}>
                <Text style={styles.vehicleText}>
                  {trip.vehicle.color} {trip.vehicle.make} {trip.vehicle.model} ({trip.vehicle.year})
                </Text>
                <Text style={styles.vehiclePlate}>{trip.vehicle.registrationNumber}</Text>
              </View>
            )}
          </View>
        )}

        {/* SOS button — shown during active non-terminal trips */}
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
              ? <ActivityIndicator color="#b42318" />
              : <Text style={styles.cancelText}>Cancel Ride</Text>}
          </TouchableOpacity>
        )}

        {/* Book again after terminal */}
        {isTerminal && (
          <TouchableOpacity style={styles.bookAgainBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.bookAgainText}>Book Another Ride</Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1eb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f4f1eb' },
  scroll: { padding: 20, paddingBottom: 40 },
  brandBlock: { marginBottom: 24, alignItems: 'center' },
  brandLogo: { width: 120, height: 34, resizeMode: 'contain' },
  loadingText: { marginTop: 12, color: '#6b5d45', fontSize: 15 },
  errorText: { color: '#b42318', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { padding: 12, backgroundColor: '#111111', borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 15, fontWeight: '700' },
  ref: { fontSize: 12, color: '#6b5d45', marginBottom: 16, marginLeft: 2 },
  card: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d1c7b7',
  },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#6b5d45', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  routeLabel: { fontSize: 12, color: '#6b5d45', fontWeight: '600', width: 40 },
  routeValue: { fontSize: 15, color: '#1a1a2e', fontWeight: '600', flex: 1, textAlign: 'right' },
  routeDivider: { height: 1, backgroundColor: '#d1c7b7', marginVertical: 10 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareLabel: { fontSize: 14, color: '#6b5d45' },
  fareTotal: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  pinCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  pinTitle: { fontSize: 13, fontWeight: '700', color: '#c5a059', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  pinSub: { fontSize: 12, color: '#f4f1eb', marginBottom: 14, textAlign: 'center' },
  pinCode: { fontSize: 48, fontWeight: '900', color: '#fff', letterSpacing: 12 },
  driverName: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  driverPhone: { fontSize: 14, color: '#6b5d45', marginBottom: 10 },
  vehicleRow: { backgroundColor: '#f0ede4', borderRadius: 8, padding: 10, marginTop: 4 },
  vehicleText: { fontSize: 13, color: '#6b5d45', marginBottom: 2 },
  vehiclePlate: { fontSize: 16, fontWeight: '800', color: '#1a1a2e', letterSpacing: 2 },
  sosBtn: {
    backgroundColor: '#b42318',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  sosText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#b42318',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  cancelText: { color: '#b42318', fontSize: 16, fontWeight: '700' },
  bookAgainBtn: { backgroundColor: '#111111', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  bookAgainText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorInline: { color: '#b42318', fontSize: 13, marginTop: 10, textAlign: 'center' },
});
