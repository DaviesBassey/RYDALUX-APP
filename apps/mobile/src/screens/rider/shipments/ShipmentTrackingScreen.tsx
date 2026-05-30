import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../../navigation/RiderNavigator';
import { Screen, Button, Card, ListItem, StatusBadge } from '../../../components/rider';
import { colors } from '../../../constants/colors';
import {
  getShipment,
  getShipmentCodes,
  cancelShipment,
  Shipment,
  ShipmentPin,
  TERMINAL_SHIPMENT_STATUSES,
  CANCELLABLE_SHIPMENT_STATUSES,
} from '../../../api/shipments';

type Nav = NativeStackNavigationProp<RiderNavigatorParamList, 'ShipmentTracking'>;

const POLL_INTERVAL_MS = 5000;

export default function ShipmentTrackingScreen({ route }: { route: any }) {
  const navigation = useNavigation<Nav>();
  const { shipmentId } = route.params;

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [codes, setCodes] = useState<ShipmentPin | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadData() {
    try {
      const s = await getShipment(shipmentId);
      setShipment(s);
      setError('');

      if (!TERMINAL_SHIPMENT_STATUSES.includes(s.status)) {
        try {
          const pin = await getShipmentCodes(shipmentId);
          setCodes(pin);
        } catch (pinErr) {
          console.log('Could not fetch OTP codes:', pinErr);
        }
      }

      if (TERMINAL_SHIPMENT_STATUSES.includes(s.status)) {
        stopPolling();
      }
    } catch (err: any) {
      setError('Could not retrieve live tracking data.');
      console.warn(err);
    }
  }

  function startPolling() {
    loadData().finally(() => setLoading(false));
    pollIntervalRef.current = setInterval(loadData, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  useEffect(() => {
    startPolling();
    return stopPolling;
  }, [shipmentId]);

  async function handleCancel() {
    Alert.alert(
      'Cancel Delivery',
      'Are you sure you want to cancel this delivery order?',
      [
        { text: 'Keep Delivery', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelShipment(shipmentId, { reason: 'Rider requested cancellation via app' });
              Alert.alert('Cancelled', 'Your delivery order has been cancelled.');
              loadData();
            } catch (err: any) {
              const errMsg = err?.response?.data?.message || err?.message || 'Failed to cancel shipment.';
              Alert.alert('Error', errMsg);
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <Screen contentStyle={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (!shipment) {
    return (
      <Screen contentStyle={styles.center}>
        <Text style={styles.error}>{error || 'Shipment not found.'}</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  const isCancellable = CANCELLABLE_SHIPMENT_STATUSES.includes(shipment.status);
  const isTerminal = TERMINAL_SHIPMENT_STATUSES.includes(shipment.status);

  let tone: 'success' | 'warning' | 'error' | 'info' | 'neutral' = 'neutral';
  if (shipment.status === 'DELIVERED') tone = 'success';
  else if (shipment.status === 'CANCELLED' || (shipment.status as string) === 'FAILED') tone = 'error';
  else if (['DRIVER_ASSIGNED', 'IN_TRANSIT', 'PICKUP_ARRIVED', 'PICKUP_VERIFIED', 'DELIVERY_ARRIVED', 'DELIVERY_VERIFIED'].includes(shipment.status)) tone = 'info';

  const steps = [
    { key: 'REQUESTED', label: 'Order Placed', active: true },
    { key: 'DRIVER_ASSIGNED', label: 'Driver En Route', active: ['DRIVER_ASSIGNED', 'PICKUP_ARRIVED', 'PICKUP_VERIFIED', 'IN_TRANSIT', 'DELIVERY_ARRIVED', 'DELIVERY_VERIFIED', 'DELIVERED'].includes(shipment.status) },
    { key: 'PICKUP_VERIFIED', label: 'Package Picked Up', active: ['PICKUP_VERIFIED', 'IN_TRANSIT', 'DELIVERY_ARRIVED', 'DELIVERY_VERIFIED', 'DELIVERED'].includes(shipment.status) },
    { key: 'IN_TRANSIT', label: 'In Transit', active: ['IN_TRANSIT', 'DELIVERY_ARRIVED', 'DELIVERY_VERIFIED', 'DELIVERED'].includes(shipment.status) },
    { key: 'DELIVERED', label: 'Delivered', active: shipment.status === 'DELIVERED' },
  ];

  return (
    <Screen contentStyle={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.ref}>{shipment.reference}</Text>
          <StatusBadge label={shipment.status} tone={tone} />
        </View>

        <Card style={styles.mapMock}>
          <View style={styles.routeLine} />
          <Text style={styles.mapText}>Live Map Routing Placeholder</Text>
        </Card>

        {!isTerminal && codes && (
          <Card style={styles.otpCard}>
            <Text style={styles.otpTitle}>Double-Blind Verification Codes</Text>
            <Text style={styles.otpSub}>
              Share these codes with the driver at each stage to verify exchange security.
            </Text>
            <View style={styles.otpRow}>
              {codes.pickupOtp && (
                <View style={styles.otpBox}>
                  <Text style={styles.otpLabel}>PICKUP OTP</Text>
                  <Text style={styles.otpCode}>{codes.pickupOtp}</Text>
                </View>
              )}
              {codes.deliveryOtp && (
                <View style={styles.otpBox}>
                  <Text style={styles.otpLabel}>DELIVERY OTP</Text>
                  <Text style={styles.otpCode}>{codes.deliveryOtp}</Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {shipment.driver && (
          <Card style={styles.driverCard}>
            <Text style={styles.cardHeaderTitle}>Assigned Rider</Text>
            <ListItem
              title={shipment.driver.name || 'Anonymous Driver'}
              subtitle={shipment.driver.phone || 'Contact unavailable'}
            />
            {shipment.vehicle && (
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleText}>
                  Vehicle: {shipment.vehicle.color} {shipment.vehicle.make} {shipment.vehicle.model}
                </Text>
                <Text style={styles.plateText}>Plate: {shipment.vehicle.registrationNumber}</Text>
              </View>
            )}
          </Card>
        )}

        <Card style={styles.timelineCard}>
          <Text style={styles.cardHeaderTitle}>Delivery Milestones</Text>
          <View style={styles.timeline}>
            {steps.map((st, i) => (
              <View key={st.key} style={styles.timelineRow}>
                <View style={styles.timelineDotColumn}>
                  <View style={[styles.timelineDot, st.active && styles.timelineDotActive]} />
                  {i < steps.length - 1 && <View style={[styles.timelineLine, st.active && styles.timelineLineActive]} />}
                </View>
                <Text style={[styles.timelineLabel, st.active && styles.timelineLabelActive]}>
                  {st.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.detailsCard}>
          <Text style={styles.cardHeaderTitle}>Package Summary</Text>
          <ListItem title="Recipient" subtitle={shipment.recipientName} />
          <ListItem title="Destination Address" subtitle={shipment.dropoffAddress} />
          {shipment.packageDescription && <ListItem title="Contents" subtitle={shipment.packageDescription} />}
        </Card>

        {shipment.proofs.length > 0 && (
          <Card style={styles.proofCard}>
            <Text style={styles.cardHeaderTitle}>Delivery Verification Signature</Text>
            {shipment.proofs.map((proof) => (
              <View key={proof.id} style={styles.proofItem}>
                <Text style={styles.proofLabel}>Proof Image URL:</Text>
                <Text style={styles.proofUrl} numberOfLines={1}>{proof.url}</Text>
                {proof.notes && <Text style={styles.proofNotes}>Notes: {proof.notes}</Text>}
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Open Support Ticket"
          variant="secondary"
          onPress={() => {
            navigation.navigate('CreateTicket', { tripId: shipment.tripId });
          }}
          style={styles.actionBtn}
        />
        {isCancellable && (
          <Button
            title={cancelling ? 'Cancelling...' : 'Cancel Delivery'}
            variant="ghost"
            onPress={handleCancel}
            style={[styles.actionBtn, { color: colors.error }] as any}
          />
        )}
        {isTerminal && (
          <Button
            title="Return to Logistics Home"
            onPress={() => navigation.navigate('Home')}
            style={styles.actionBtn}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: colors.error, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  scroll: { paddingVertical: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  ref: { fontSize: 16, fontWeight: '900', color: colors.gray900 },
  mapMock: { height: 180, marginHorizontal: 16, borderRadius: 12, backgroundColor: colors.gray900, marginBottom: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  routeLine: { position: 'absolute', width: 4, height: 140, borderRadius: 2, backgroundColor: colors.secondary, left: 160, top: 20, transform: [{ rotate: '40deg' }] },
  mapText: { color: colors.gray300, fontSize: 12, fontWeight: '900', zIndex: 1 },
  otpCard: { padding: 16, marginHorizontal: 16, marginBottom: 16, borderRadius: 12, borderColor: colors.secondary, borderWidth: 1 },
  otpTitle: { fontSize: 14, fontWeight: '900', color: colors.secondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  otpSub: { fontSize: 12, color: colors.gray500, marginTop: 4, lineHeight: 18 },
  otpRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  otpBox: { flex: 1, backgroundColor: colors.gray200, padding: 12, borderRadius: 8, alignItems: 'center' },
  otpLabel: { fontSize: 9, fontWeight: '900', color: colors.gray500, letterSpacing: 0.5 },
  otpCode: { fontSize: 20, fontWeight: '900', color: colors.gray900, marginTop: 4, letterSpacing: 2 },
  driverCard: { padding: 16, marginHorizontal: 16, marginBottom: 16, borderRadius: 12 },
  cardHeaderTitle: { fontSize: 12, fontWeight: '900', color: colors.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  vehicleInfo: { marginTop: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: colors.gray300 },
  vehicleText: { fontSize: 13, color: colors.gray700 },
  plateText: { fontSize: 13, fontWeight: '700', color: colors.gray900, marginTop: 2 },
  timelineCard: { padding: 16, marginHorizontal: 16, marginBottom: 16, borderRadius: 12 },
  timeline: { paddingVertical: 8 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  timelineDotColumn: { alignItems: 'center', width: 24 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gray300 },
  timelineDotActive: { backgroundColor: colors.info },
  timelineLine: { width: 2, height: 20, backgroundColor: colors.gray300, position: 'absolute', top: 10 },
  timelineLineActive: { backgroundColor: colors.info },
  timelineLabel: { marginLeft: 12, fontSize: 14, color: colors.gray500, fontWeight: '600' },
  timelineLabelActive: { color: colors.gray900, fontWeight: '900' },
  detailsCard: { padding: 16, marginHorizontal: 16, marginBottom: 16, borderRadius: 12 },
  proofCard: { padding: 16, marginHorizontal: 16, marginBottom: 16, borderRadius: 12 },
  proofItem: { marginTop: 8 },
  proofLabel: { fontSize: 12, color: colors.gray500, fontWeight: '600' },
  proofUrl: { fontSize: 12, color: colors.info, marginTop: 2, textDecorationLine: 'underline' },
  proofNotes: { fontSize: 12, color: colors.gray700, fontStyle: 'italic', marginTop: 4 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.gray200, backgroundColor: colors.white },
  actionBtn: { width: '100%', marginBottom: 8 },
});
