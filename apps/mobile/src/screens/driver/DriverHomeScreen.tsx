import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DriverStackParamList } from '../../navigation/DriverNavigator';
import {
  getAvailableTrips,
  acceptTrip,
  getOnboardingStatus,
  activateOnline,
  devApproveDriver,
  AvailableTrip,
} from '../../api/driver';
import {
  getAvailableShipments,
  acceptShipment,
  AvailableShipment,
} from '../../api/shipments';
import { useAuth } from '../../context/AuthContext';
import { getTokens } from '../../store/authStore';
import { api } from '../../api/client';

type Nav = NativeStackNavigationProp<DriverStackParamList, 'DriverHome'>;

export default function DriverHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { logout } = useAuth();

  const [trips, setTrips] = useState<AvailableTrip[]>([]);
  const [shipments, setShipments] = useState<AvailableShipment[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [fullyApproved, setFullyApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchStatus() {
    try {
      const status = await getOnboardingStatus();
      setFullyApproved(status.fullyApproved);
    } catch {}
  }

  async function fetchJobs() {
    try {
      const [{ trips: list }, { shipments: slist }] = await Promise.all([
        getAvailableTrips(),
        getAvailableShipments(),
      ]);
      setTrips(list);
      setShipments(slist);
    } catch {}
  }

  async function loadInitial() {
    setLoading(true);
    await fetchStatus();
    if (fullyApproved) await fetchJobs();
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      loadInitial();
      pollRef.current = setInterval(fetchJobs, 5000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [fullyApproved])
  );

  async function handleGoOnline() {
    try {
      await activateOnline();
      setIsOnline(true);
      fetchJobs();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Could not go online.');
    }
  }

  async function handleAcceptTrip(tripId: string) {
    setAccepting(tripId);
    try {
      await acceptTrip(tripId);
      if (pollRef.current) clearInterval(pollRef.current);
      navigation.navigate('DriverActiveTrip');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Could not accept trip.');
    } finally {
      setAccepting(null);
    }
  }

  async function handleAcceptShipment(shipmentId: string) {
    setAccepting(shipmentId);
    try {
      const shipment = await acceptShipment(shipmentId);
      if (pollRef.current) clearInterval(pollRef.current);
      navigation.navigate('DriverActiveShipment', { shipmentId: shipment.id });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Could not accept shipment.');
    } finally {
      setAccepting(null);
    }
  }

  async function handleDevApprove() {
    setDevLoading(true);
    try {
      const tokens = await getTokens();
      // Decode userId from access token (JWT payload is base64)
      const parts = tokens.accessToken?.split('.');
      if (!parts || parts.length < 2) throw new Error('Invalid token');
      const payload = JSON.parse(atob(parts[1]));
      await devApproveDriver(payload.sub);
      await fetchStatus();
      Alert.alert('Dev', 'Driver approved. You can now go online.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Dev approve failed.');
    } finally {
      setDevLoading(false);
    }
  }

  function renderTripCard(item: AvailableTrip) {
    const isAccepting = accepting === item.id;
    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.ref}>{item.reference}</Text>
          {item.fare != null && <Text style={styles.fare}>₦{item.fare.toLocaleString()}</Text>}
        </View>
        <Text style={styles.addr} numberOfLines={1}>From: {item.pickup.address}</Text>
        <Text style={styles.addr} numberOfLines={1}>To: {item.dropoff.address}</Text>
        <TouchableOpacity
          style={[styles.acceptBtn, isAccepting && styles.btnDisabled]}
          onPress={() => handleAcceptTrip(item.id)}
          disabled={isAccepting}
        >
          {isAccepting ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptText}>Accept Ride</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  function renderShipmentCard(item: AvailableShipment) {
    const isAccepting = accepting === item.id;
    return (
      <View key={item.id} style={[styles.card, styles.parcelCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <Text style={styles.ref}>{item.reference}</Text>
            <View style={styles.parcelBadge}>
              <Text style={styles.parcelBadgeText}>PARCEL</Text>
            </View>
          </View>
          {item.quotedFare != null && <Text style={styles.fare}>₦{parseFloat(String(item.quotedFare)).toLocaleString()}</Text>}
        </View>
        <Text style={styles.addr} numberOfLines={1}>From: {item.pickupAddress}</Text>
        <Text style={styles.addr} numberOfLines={1}>To: {item.dropoffAddress}</Text>
        <Text style={styles.addr} numberOfLines={1}>Size: {item.packageCategory.replace('_', ' ')} • Recipient: {item.recipientName}</Text>
        <TouchableOpacity
          style={[styles.acceptBtn, styles.parcelAcceptBtn, isAccepting && styles.btnDisabled]}
          onPress={() => handleAcceptShipment(item.id)}
          disabled={isAccepting}
        >
          {isAccepting ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptText}>Accept Parcel</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#111111" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Image source={require('../../../assets/brand/rydalux-logo-black.png')} style={styles.brandLogo} resizeMode="contain" />
          <Text style={styles.title}>Driver Console</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {!fullyApproved ? (
        <View style={styles.section}>
          <Text style={styles.statusText}>Your account is pending approval.</Text>
          <TouchableOpacity
            style={[styles.onlineBtn, devLoading && styles.btnDisabled]}
            onPress={handleDevApprove}
            disabled={devLoading}
          >
            {devLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.onlineBtnText}>Dev: Fast Approve</Text>}
          </TouchableOpacity>
        </View>
      ) : !isOnline ? (
        <View style={styles.section}>
          <Text style={styles.statusText}>You are offline.</Text>
          <TouchableOpacity style={styles.onlineBtn} onPress={handleGoOnline}>
            <Text style={styles.onlineBtnText}>Go Online</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <Text style={styles.sectionTitle}>Ride Jobs</Text>
          {trips.length === 0 ? (
            <Text style={styles.emptyText}>No available rides</Text>
          ) : (
            trips.map(renderTripCard)
          )}

          <Text style={styles.sectionTitle}>Parcel Jobs</Text>
          {shipments.length === 0 ? (
            <Text style={styles.emptyText}>No available parcels</Text>
          ) : (
            shipments.map(renderShipmentCard)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1eb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fffaf1',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  brandLogo: { width: 140, height: 22, marginBottom: 4 },
  title: { fontSize: 12, fontWeight: '700', color: '#6b5d45', textTransform: 'uppercase', letterSpacing: 0.5 },
  logout: { color: '#111111', fontSize: 14, fontWeight: '600' },
  section: { padding: 24, alignItems: 'center' },
  statusText: { fontSize: 16, color: '#555', marginBottom: 20, textAlign: 'center' },
  onlineBtn: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  onlineBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fffaf1',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ref: { fontSize: 13, color: '#888', fontWeight: '600' },
  fare: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  addr: { fontSize: 14, color: '#444', marginBottom: 4 },
  acceptBtn: {
    backgroundColor: '#111111',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  acceptText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b5d45',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  parcelCard: {
    borderWidth: 1.5,
    borderColor: '#d2b16d',
  },
  parcelAcceptBtn: {
    backgroundColor: '#d2b16d',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  parcelBadge: {
    backgroundColor: '#d2b16d',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  parcelBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 0.5,
  },
});
