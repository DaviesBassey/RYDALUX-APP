import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { createFareQuote, FareQuote, ServiceType } from '../../api/fare';
import { createTrip } from '../../api/trips';
import { getActiveTrip } from '../../api/trips';
import { logoutSession } from '../../api/auth';
import { clearTokens } from '../../store/authStore';
import { useAuth } from '../../context/AuthContext';
import { MainStackParamList } from '../../navigation/MainNavigator';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Home'>;

// Default Lagos test coordinates — change via input fields for other locations
const DEFAULTS = {
  pickupLat: '6.5244',
  pickupLng: '3.3792',
  pickupAddress: 'Lagos Island',
  dropoffLat: '6.6018',
  dropoffLng: '3.3515',
  dropoffAddress: 'Ikeja',
};

const SERVICE_TYPES: ServiceType[] = ['REGULAR', 'PREMIUM', 'SCHEDULED'];

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { logout } = useAuth();

  const [pickupAddress, setPickupAddress] = useState(DEFAULTS.pickupAddress);
  const [pickupLat, setPickupLat] = useState(DEFAULTS.pickupLat);
  const [pickupLng, setPickupLng] = useState(DEFAULTS.pickupLng);
  const [dropoffAddress, setDropoffAddress] = useState(DEFAULTS.dropoffAddress);
  const [dropoffLat, setDropoffLat] = useState(DEFAULTS.dropoffLat);
  const [dropoffLng, setDropoffLng] = useState(DEFAULTS.dropoffLng);
  const [serviceType, setServiceType] = useState<ServiceType>('REGULAR');

  const [fareQuote, setFareQuote] = useState<FareQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [bookLoading, setBookLoading] = useState(false);
  const [error, setError] = useState('');

  // Resume active trip on screen focus
  useFocusEffect(
    useCallback(() => {
      getActiveTrip().then((trip) => {
        if (trip) {
          navigation.navigate('ActiveTrip', { tripId: trip.id });
        }
      }).catch(() => {});
    }, [navigation])
  );

  async function handleGetQuote() {
    setError('');
    setFareQuote(null);
    const pLat = parseFloat(pickupLat);
    const pLng = parseFloat(pickupLng);
    const dLat = parseFloat(dropoffLat);
    const dLng = parseFloat(dropoffLng);

    if ([pLat, pLng, dLat, dLng].some(isNaN)) {
      setError('Enter valid numeric coordinates for pickup and dropoff.');
      return;
    }

    setQuoteLoading(true);
    try {
      const quote = await createFareQuote({
        pickupLatitude: pLat,
        pickupLongitude: pLng,
        dropoffLatitude: dLat,
        dropoffLongitude: dLng,
        rideCategory: serviceType,
      });
      setFareQuote(quote);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? 'Could not get fare quote. Try again.');
    } finally {
      setQuoteLoading(false);
    }
  }

  async function handleRequestRide() {
    if (!fareQuote) return;
    setError('');
    setBookLoading(true);
    try {
      const trip = await createTrip({
        fareQuoteId: fareQuote.id,
        pickupAddress: pickupAddress.trim() || DEFAULTS.pickupAddress,
        dropoffAddress: dropoffAddress.trim() || DEFAULTS.dropoffAddress,
      });
      setFareQuote(null);
      navigation.navigate('ActiveTrip', { tripId: trip.id });
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? 'Could not book ride. Try again.');
    } finally {
      setBookLoading(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try { await logoutSession(); } catch {}
          await clearTokens();
          logout();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../../../assets/brand/rydalux-logo-black.png')} style={styles.brandLogo} resizeMode="contain" />
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Request a Ride</Text>

        {/* Pickup */}
        <Text style={styles.label}>Pickup address</Text>
        <TextInput style={styles.input} value={pickupAddress} onChangeText={setPickupAddress} placeholder="Pickup location name" placeholderTextColor="#aaa" />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.half]} value={pickupLat} onChangeText={setPickupLat} placeholder="Latitude" placeholderTextColor="#aaa" keyboardType="decimal-pad" />
          <View style={styles.gap} />
          <TextInput style={[styles.input, styles.half]} value={pickupLng} onChangeText={setPickupLng} placeholder="Longitude" placeholderTextColor="#aaa" keyboardType="decimal-pad" />
        </View>

        {/* Dropoff */}
        <Text style={styles.label}>Dropoff address</Text>
        <TextInput style={styles.input} value={dropoffAddress} onChangeText={setDropoffAddress} placeholder="Dropoff location name" placeholderTextColor="#aaa" />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.half]} value={dropoffLat} onChangeText={setDropoffLat} placeholder="Latitude" placeholderTextColor="#aaa" keyboardType="decimal-pad" />
          <View style={styles.gap} />
          <TextInput style={[styles.input, styles.half]} value={dropoffLng} onChangeText={setDropoffLng} placeholder="Longitude" placeholderTextColor="#aaa" keyboardType="decimal-pad" />
        </View>

        {/* Service type */}
        <Text style={styles.label}>Service type</Text>
        <View style={styles.row}>
          {SERVICE_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, serviceType === type && styles.chipActive]}
              onPress={() => setServiceType(type)}
            >
              <Text style={[styles.chipText, serviceType === type && styles.chipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Fare quote result */}
        {fareQuote && (
          <View style={styles.quoteCard}>
            <Text style={styles.quoteTitle}>Fare Estimate</Text>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Total</Text>
              <Text style={styles.quoteTotal}>₦{fareQuote.breakdown.total.toLocaleString()}</Text>
            </View>
            <View style={styles.divider} />
            <QuoteRow label="Base fare" value={fareQuote.breakdown.baseFare} />
            <QuoteRow label="Distance" value={fareQuote.breakdown.distanceFare} />
            <QuoteRow label="Time" value={fareQuote.breakdown.timeFare} />
            <QuoteRow label="Booking fee" value={fareQuote.breakdown.bookingFee} />
            {fareQuote.breakdown.promoDiscount > 0 && (
              <QuoteRow label="Promo" value={-fareQuote.breakdown.promoDiscount} accent />
            )}
            {fareQuote.breakdown.pickupZone && (
              <Text style={styles.quoteZone}>
                {fareQuote.breakdown.pickupZone} → {fareQuote.breakdown.dropoffZone}
              </Text>
            )}
          </View>
        )}

        {/* Primary action — shown only after a quote is available */}
        {fareQuote && (
          <TouchableOpacity
            style={[styles.btn, bookLoading && styles.btnDisabled]}
            onPress={handleRequestRide}
            disabled={bookLoading || quoteLoading}
          >
            {bookLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Request Trip</Text>}
          </TouchableOpacity>
        )}

        {/* Secondary — get/refresh quote */}
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary, quoteLoading && styles.btnDisabled]}
          onPress={handleGetQuote}
          disabled={quoteLoading || bookLoading}
        >
          {quoteLoading
            ? <ActivityIndicator color="#111111" />
            : <Text style={styles.btnTextSecondary}>{fareQuote ? 'Refresh Quote' : 'Get Fare Quote'}</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function QuoteRow({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <View style={styles.quoteRow}>
      <Text style={styles.quoteLabel}>{label}</Text>
      <Text style={[styles.quoteValue, accent && styles.quoteAccent]}>
        {accent ? '-' : ''}₦{Math.abs(value).toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1eb' },
  scroll: { padding: 20, paddingBottom: 80 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  brandLogo: { width: 148, height: 24 },
  logoutText: { color: '#6b5d45', fontSize: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1a1a2e',
    backgroundColor: '#fafafa',
    flex: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  half: { flex: 1 },
  gap: { width: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ddd',
    marginRight: 8,
    marginTop: 8,
  },
  chipActive: { backgroundColor: '#111111', borderColor: '#111111' },
  chipText: { fontSize: 13, color: '#555', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  error: { color: '#b42318', fontSize: 13, marginTop: 10 },
  quoteCard: {
    backgroundColor: '#f7f7fb',
    borderRadius: 14,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ebebf5',
  },
  quoteTitle: { fontSize: 14, fontWeight: '700', color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  quoteRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  quoteLabel: { fontSize: 14, color: '#555' },
  quoteTotal: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  quoteValue: { fontSize: 14, color: '#1a1a2e', fontWeight: '600' },
  quoteAccent: { color: '#2ecc71' },
  quoteZone: { fontSize: 12, color: '#888', marginTop: 8 },
  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 10 },
  btn: { backgroundColor: '#111111', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 14 },
  btnSecondary: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#111111' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnTextSecondary: { color: '#111111', fontSize: 16, fontWeight: '700' },
});
