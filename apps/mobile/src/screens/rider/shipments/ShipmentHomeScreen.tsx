import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../../navigation/RiderNavigator';
import { Screen, Button, Card, SectionHeader, StatusBadge } from '../../../components/rider';
import { colors } from '../../../constants/colors';
import { listShipments, getActiveShipment, Shipment } from '../../../api/shipments';
import { formatDate } from '../../../utils/formatting';

type Nav = NativeStackNavigationProp<RiderNavigatorParamList, 'Home'>;

export default function ShipmentHomeScreen() {
  const navigation = useNavigation<Nav>();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const active = await getActiveShipment();
      setActiveShipment(active);
      const res = await listShipments({ limit: 20 });
      setShipments(res.items.filter((item) => item.id !== active?.id));
    } catch (err) {
      console.warn('Failed to load rider shipments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  function handleRefresh() {
    setRefreshing(true);
    loadData();
  }

  const renderHistoryItem = ({ item }: { item: Shipment }) => {
    let tone: 'success' | 'warning' | 'error' | 'info' | 'neutral' = 'neutral';
    if (item.status === 'DELIVERED') tone = 'success';
    else if (item.status === 'CANCELLED' || (item.status as string) === 'FAILED') tone = 'error';
    else if (['DRIVER_ASSIGNED', 'IN_TRANSIT', 'PICKUP_ARRIVED'].includes(item.status)) tone = 'info';

    return (
      <TouchableOpacity onPress={() => navigation.navigate('ShipmentDetails', { shipmentId: item.id })} activeOpacity={0.8}>
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.reference}>{item.reference}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
            <StatusBadge label={item.status} tone={tone} />
          </View>
          <View style={styles.divider} />
          <View style={styles.locationContainer}>
            <View style={styles.dotContainer}>
              <View style={[styles.locationDot, { backgroundColor: colors.secondary }]} />
              <View style={styles.line} />
              <View style={[styles.locationDot, { backgroundColor: colors.primary }]} />
            </View>
            <View style={styles.addresses}>
              <Text style={styles.address} numberOfLines={1}>From: {item.pickupAddress}</Text>
              <Text style={styles.address} numberOfLines={1}>To: {item.dropoffAddress}</Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.category}>{item.packageCategory.replace('_', ' ')}</Text>
            <Text style={styles.fare}>₦{parseFloat(String(item.quotedFare ?? 0)).toLocaleString()}</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <Screen contentStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rydalux Logistics</Text>
        <Text style={styles.subtitle}>Premium package delivery at your fingertips</Text>
      </View>

      <Card style={styles.bookingHero}>
        <Text style={styles.heroTitle}>Need to send a parcel?</Text>
        <Text style={styles.heroText}>Get real-time rates, double-blind OTP verification, and instant tracking.</Text>
        <Button
          title="Create New Delivery"
          onPress={() => navigation.navigate('CreateShipmentQuote')}
          style={styles.heroBtn}
        />
      </Card>

      {activeShipment && (
        <View style={styles.activeContainer}>
          <SectionHeader title="Ongoing Delivery" />
          <TouchableOpacity
            onPress={() => navigation.navigate('ShipmentTracking', { shipmentId: activeShipment.id })}
            activeOpacity={0.8}
          >
            <Card style={[styles.card, styles.activeCard] as any}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.activeRef}>{activeShipment.reference}</Text>
                  <Text style={styles.activePulse}>Live Tracking Active</Text>
                </View>
                <StatusBadge label={activeShipment.status} tone="info" />
              </View>
              <Text style={styles.activeDesc} numberOfLines={2}>
                {activeShipment.packageDescription || 'No description provided'}
              </Text>
              <Button
                title="Track Package"
                variant="secondary"
                onPress={() => navigation.navigate('ShipmentTracking', { shipmentId: activeShipment.id })}
                style={styles.trackBtn}
              />
            </Card>
          </TouchableOpacity>
        </View>
      )}

      <SectionHeader title="Delivery History" />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={shipments}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No delivery history yet.</Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray100 },
  header: { paddingHorizontal: 16, paddingTop: 16, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', color: colors.gray900 },
  subtitle: { fontSize: 14, color: colors.gray500, marginTop: 4 },
  bookingHero: { backgroundColor: colors.gray900, padding: 24, marginHorizontal: 16, borderRadius: 16, marginBottom: 24 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: colors.white },
  heroText: { fontSize: 13, color: colors.gray300, marginTop: 8, lineHeight: 18 },
  heroBtn: { marginTop: 18, backgroundColor: colors.secondary },
  activeContainer: { marginHorizontal: 16, marginBottom: 16 },
  activeCard: { borderColor: colors.info, borderWidth: 1.5 },
  activeRef: { fontSize: 14, fontWeight: '900', color: colors.gray900 },
  activePulse: { fontSize: 12, color: colors.info, fontWeight: '700', marginTop: 2 },
  activeDesc: { fontSize: 14, color: colors.gray700, marginTop: 12, lineHeight: 20 },
  trackBtn: { marginTop: 12 },
  list: { paddingBottom: 24 },
  card: { padding: 16, marginHorizontal: 16, marginBottom: 12, borderRadius: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reference: { fontSize: 14, fontWeight: '800', color: colors.gray900 },
  date: { fontSize: 11, color: colors.gray500, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.gray200, marginVertical: 12 },
  locationContainer: { flexDirection: 'row', alignItems: 'center' },
  dotContainer: { alignItems: 'center', width: 20 },
  locationDot: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 1.5, height: 24, backgroundColor: colors.gray300, marginVertical: 4 },
  addresses: { marginLeft: 12, flex: 1 },
  address: { fontSize: 13, color: colors.gray700, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  category: { fontSize: 12, fontWeight: '700', color: colors.gray500, textTransform: 'uppercase' },
  fare: { fontSize: 15, fontWeight: '900', color: colors.gray900 },
  loadingContainer: { padding: 48, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: 48, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.gray500, fontStyle: 'italic', fontSize: 14 },
});
