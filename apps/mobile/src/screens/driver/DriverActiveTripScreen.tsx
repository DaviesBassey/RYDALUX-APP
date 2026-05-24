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
import { getDriverActiveTrip, transitionTrip } from '../../api/driver';
import { triggerSos } from '../../api/safety';

type Nav = NativeStackNavigationProp<DriverStackParamList, 'DriverActiveTrip'>;

const STATUS_LABELS: Record<string, string> = {
  DRIVER_ARRIVING: 'Heading to pickup',
  DRIVER_ARRIVED: 'Arrived at pickup',
  PIN_VERIFIED: 'PIN verified — ready to start',
  IN_PROGRESS: 'Trip in progress',
};

export default function DriverActiveTripScreen() {
  const navigation = useNavigation<Nav>();

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [pin, setPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [sendingSos, setSendingSos] = useState(false);

  async function fetchTrip() {
    try {
      const { trip: t } = await getDriverActiveTrip();
      setTrip(t);
      if (!t) navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Failed to load trip.');
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchTrip().finally(() => setLoading(false));
    }, [])
  );

  async function doTransition(nextState: string, opts?: { pin?: string; reason?: string }) {
    setTransitioning(true);
    try {
      await transitionTrip(trip.id, nextState, opts);
      if (nextState === 'COMPLETED' || nextState === 'CANCELLED_BY_DRIVER') {
        navigation.goBack();
      } else {
        await fetchTrip();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Transition failed.');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleVerifyPin() {
    if (!pin.trim() || !/^[0-9]{4}$/.test(pin.trim())) {
      Alert.alert('Invalid PIN', 'Enter the 4-digit PIN shown to the rider.');
      return;
    }
    setShowPinInput(false);
    await doTransition('PIN_VERIFIED', { pin: pin.trim() });
    setPin('');
  }

  async function handleCancel() {
    Alert.alert('Cancel Trip', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => doTransition('CANCELLED_BY_DRIVER') },
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
              const lat = trip?.pickup?.latitude ?? 0;
              const lng = trip?.pickup?.longitude ?? 0;
              const sos = await triggerSos({
                type: 'PANIC',
                latitude: lat,
                longitude: lng,
                notes: `SOS from driver during ${trip?.status ?? 'unknown'}`,
              });
              Alert.alert('SOS Sent', `Safety team notified. SOS ID: ${sos.id}`);
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
        <ActivityIndicator size="large" color="#e94560" />
      </SafeAreaView>
    );
  }

  if (!trip) return null;

  const status: string = trip.status;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.ref}>{trip.reference}</Text>
        <Text style={styles.status}>{STATUS_LABELS[status] ?? status}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Pickup</Text>
          <Text style={styles.value}>{trip.pickup?.address ?? trip.pickupAddress}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Dropoff</Text>
          <Text style={styles.value}>{trip.dropoff?.address ?? trip.dropoffAddress}</Text>
        </View>

        {status === 'DRIVER_ARRIVING' && (
          <ActionBtn label="I've Arrived" onPress={() => doTransition('DRIVER_ARRIVED')} loading={transitioning} />
        )}

        {status === 'DRIVER_ARRIVED' && !showPinInput && (
          <ActionBtn label="Verify Rider PIN" onPress={() => setShowPinInput(true)} loading={false} />
        )}

        {showPinInput && (
          <View style={styles.pinBox}>
            <Text style={styles.pinLabel}>Enter rider's PIN</Text>
            <TextInput
              style={styles.pinInput}
              keyboardType="number-pad"
              maxLength={4}
              value={pin}
              onChangeText={setPin}
              placeholder="••••"
              placeholderTextColor="#bbb"
            />
            <ActionBtn label="Confirm PIN" onPress={handleVerifyPin} loading={transitioning} />
          </View>
        )}

        {status === 'PIN_VERIFIED' && (
          <ActionBtn label="Start Trip" onPress={() => doTransition('IN_PROGRESS')} loading={transitioning} />
        )}

        {status === 'IN_PROGRESS' && (
          <ActionBtn label="Complete Trip" onPress={() => doTransition('COMPLETED')} loading={transitioning} primary />
        )}

        <TouchableOpacity
          style={[styles.sosBtn, sendingSos && styles.btnDisabled]}
          onPress={handleSos}
          disabled={sendingSos}
        >
          {sendingSos ? <ActivityIndicator color="#fff" /> : <Text style={styles.sosText}>🚨 Emergency SOS</Text>}
        </TouchableOpacity>

        {(status === 'DRIVER_ARRIVING' || status === 'DRIVER_ARRIVED' || status === 'PIN_VERIFIED') && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={transitioning}>
            <Text style={styles.cancelText}>Cancel Trip</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 24 },
  ref: { fontSize: 13, color: '#aaa', fontWeight: '600', marginBottom: 4 },
  status: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 24 },
  section: { marginBottom: 16 },
  label: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  value: { fontSize: 15, color: '#333', lineHeight: 22 },
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
  pinBox: { marginTop: 16, backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16 },
  pinLabel: { fontSize: 14, color: '#444', marginBottom: 10, fontWeight: '600' },
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
});
