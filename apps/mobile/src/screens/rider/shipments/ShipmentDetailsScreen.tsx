import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../../navigation/RiderNavigator';
import { Screen, Button, Card, ListItem, StatusBadge } from '../../../components/rider';
import { colors } from '../../../constants/colors';
import { getShipment, Shipment } from '../../../api/shipments';
import { formatPackageCategory, formatPriority, formatDateTime } from '../../../utils/formatting';

type Nav = NativeStackNavigationProp<RiderNavigatorParamList, 'ShipmentDetails'>;

export default function ShipmentDetailsScreen({ route }: { route: any }) {
  const navigation = useNavigation<Nav>();
  const { shipmentId } = route.params;

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchDetails() {
    try {
      const s = await getShipment(shipmentId);
      setShipment(s);
      setError('');
    } catch (err: any) {
      setError('Could not retrieve shipment details.');
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDetails();
  }, [shipmentId]);

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

  let tone: 'success' | 'warning' | 'error' | 'info' | 'neutral' = 'neutral';
  if (shipment.status === 'DELIVERED') tone = 'success';
  else if (shipment.status === 'CANCELLED' || (shipment.status as string) === 'FAILED') tone = 'error';
  else if (['DRIVER_ASSIGNED', 'IN_TRANSIT', 'PICKUP_ARRIVED'].includes(shipment.status)) tone = 'info';

  return (
    <Screen contentStyle={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.ref}>{shipment.reference}</Text>
          <StatusBadge label={shipment.status} tone={tone} />
        </View>

        <Card style={styles.card}>
          <ListItem title="Created On" subtitle={formatDateTime(shipment.createdAt)} />
          {shipment.deliveredAt && (
            <ListItem title="Delivered On" subtitle={formatDateTime(shipment.deliveredAt)} />
          )}
          {shipment.cancelledAt && (
            <ListItem title="Cancelled On" subtitle={formatDateTime(shipment.cancelledAt)} />
          )}
        </Card>

        <SectionHeader title="Route Information" />
        <Card style={styles.card}>
          <ListItem title="Pickup Address" subtitle={shipment.pickupAddress} />
          <ListItem title="Dropoff Address" subtitle={shipment.dropoffAddress} />
        </Card>

        <SectionHeader title="Recipient Information" />
        <Card style={styles.card}>
          <ListItem title="Recipient Name" subtitle={shipment.recipientName} />
          <ListItem title="Recipient Phone" subtitle={shipment.recipientPhone} />
        </Card>

        <SectionHeader title="Package details" />
        <Card style={styles.card}>
          <ListItem title="Category" subtitle={formatPackageCategory(shipment.packageCategory)} />
          <ListItem title="Priority Level" subtitle={formatPriority(shipment.priority)} />
          {shipment.packageDescription && (
            <ListItem title="Content Description" subtitle={shipment.packageDescription} />
          )}
        </Card>

        <SectionHeader title="Fare and Payment" />
        <Card style={styles.card}>
          <ListItem
            title="Total Charged"
            subtitle="Premium Wallet payment"
            right={`₦${parseFloat(String(shipment.quotedFare ?? 0)).toLocaleString()}`}
          />
        </Card>

        {shipment.proofs.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.proofHeaderTitle}>Delivery Proof Signature</Text>
            {shipment.proofs.map((proof) => (
              <View key={proof.id} style={styles.proofItem}>
                <Text style={styles.proofLabel}>Proof Type: {proof.proofType}</Text>
                <Text style={styles.proofUrl} numberOfLines={1}>{proof.url}</Text>
                {proof.notes && <Text style={styles.proofNotes}>Notes: {proof.notes}</Text>}
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Need Help? Open Support Ticket"
          variant="secondary"
          onPress={() => {
            navigation.navigate('CreateTicket', { tripId: shipment.tripId });
          }}
          style={styles.actionBtn}
        />
        <Button title="Go Back" onPress={() => navigation.goBack()} style={[styles.actionBtn, { marginTop: 8 }] as any} />
      </View>
    </Screen>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: colors.error, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  scroll: { paddingVertical: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  ref: { fontSize: 16, fontWeight: '900', color: colors.gray900 },
  card: { padding: 16, marginHorizontal: 16, marginBottom: 16, borderRadius: 12 },
  sectionHeader: { fontSize: 13, fontWeight: '900', color: colors.gray500, textTransform: 'uppercase', marginHorizontal: 16, marginBottom: 8, marginTop: 4, letterSpacing: 0.5 },
  proofHeaderTitle: { fontSize: 12, fontWeight: '900', color: colors.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  proofItem: { marginTop: 8 },
  proofLabel: { fontSize: 12, color: colors.gray500, fontWeight: '600' },
  proofUrl: { fontSize: 12, color: colors.info, marginTop: 2, textDecorationLine: 'underline' },
  proofNotes: { fontSize: 12, color: colors.gray700, fontStyle: 'italic', marginTop: 4 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.gray200, backgroundColor: colors.white },
  actionBtn: { width: '100%' },
});
