import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
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
import { useAuth } from '../../context/AuthContext';
import { getTokens } from '../../store/authStore';
import { api } from '../../api/client';

type Nav = NativeStackNavigationProp<DriverStackParamList, 'DriverHome'>;

export default function DriverHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { logout } = useAuth();

  const [trips, setTrips] = useState<AvailableTrip[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [fullyApproved, setFullyApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchStatus() {
    try {
      const status = await getOnboardingStatus();
      setFullyApproved(status.fullyApproved);
    } catch {}
  }

  async function fetchTrips() {
    try {
      const { trips: list } = await getAvailableTrips();
      setTrips(list);
    } catch {}
  }

  async function loadInitial() {
    setLoading(true);
    await fetchStatus();
    if (fullyApproved) await fetchTrips();
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      loadInitial();
      pollRef.current = setInterval(fetchTrips, 5000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [fullyApproved])
  );

  async function handleGoOnline() {
    try {
      await activateOnline();
      setIsOnline(true);
      fetchTrips();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Could not go online.');
    }
  }

  async function handleAccept(tripId: string) {
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

  function renderTrip({ item }: { item: AvailableTrip }) {
    const isAccepting = accepting === item.id;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.ref}>{item.reference}</Text>
          {item.fare != null && <Text style={styles.fare}>₦{item.fare.toLocaleString()}</Text>}
        </View>
        <Text style={styles.addr} numberOfLines={1}>From: {item.pickup.address}</Text>
        <Text style={styles.addr} numberOfLines={1}>To: {item.dropoff.address}</Text>
        <TouchableOpacity
          style={[styles.acceptBtn, isAccepting && styles.btnDisabled]}
          onPress={() => handleAccept(item.id)}
          disabled={isAccepting}
        >
          {isAccepting ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptText}>Accept</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#e94560" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Driver</Text>
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
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          renderItem={renderTrip}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={fetchTrips} />}
          ListEmptyComponent={
            <View style={styles.section}>
              <Text style={styles.statusText}>No available trips. Waiting...</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1a1a2e' },
  logout: { color: '#e94560', fontSize: 14, fontWeight: '600' },
  section: { padding: 24, alignItems: 'center' },
  statusText: { fontSize: 16, color: '#555', marginBottom: 20, textAlign: 'center' },
  onlineBtn: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  onlineBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
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
    backgroundColor: '#e94560',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  acceptText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
