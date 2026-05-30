import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../../navigation/RiderNavigator';
import { Screen, Button, Card, SectionHeader, ListItem } from '../../../components/rider';
import { colors } from '../../../constants/colors';
import { createShipment, Shipment } from '../../../api/shipments';
import { formatPackageCategory, formatPriority } from '../../../utils/formatting';

type Nav = NativeStackNavigationProp<RiderNavigatorParamList, 'ShipmentFareQuote'>;

export default function ShipmentFareQuoteScreen({ route }: { route: any }) {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(false);
  const [successShipment, setSuccessShipment] = useState<Shipment | null>(null);

  const {
    quote,
    pickupAddress,
    dropoffAddress,
    senderName,
    recipientName,
    recipientPhone,
    packageDescription,
    packageCategory,
    priority,
    specialInstructions,
  } = route.params;

  async function handleBookShipment() {
    setLoading(true);
    try {
      const shipment = await createShipment({
        quoteId: quote.id,
        pickupAddress,
        dropoffAddress,
        senderName,
        recipientName,
        recipientPhone,
        packageDescription: packageDescription || undefined,
        packageCategory,
        priority,
        specialInstructions: specialInstructions || undefined,
      });

      setSuccessShipment(shipment);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to place delivery order.';
      Alert.alert('Booking Failed', errMsg);
    } finally {
      setLoading(false);
    }
  }

  if (successShipment) {
    return (
      <Screen contentStyle={styles.successContainer}>
        <View style={styles.successInner}>
          <View style={styles.successBadge}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Shipment Created!</Text>
          <Text style={styles.successSub}>
            Your parcel delivery request has been successfully created. We are assigning a premium driver to your request now.
          </Text>

          <Card style={styles.successDetailsCard}>
            <ListItem title="Reference Code" subtitle={successShipment.reference} />
            <ListItem title="Recipient" subtitle={successShipment.recipientName} />
            <ListItem title="Total Quoted Fare" subtitle={`₦${parseFloat(String(successShipment.quotedFare ?? 0)).toLocaleString()}`} />
          </Card>

          <Button
            title="Track Shipment Live"
            onPress={() => {
              navigation.navigate('ShipmentTracking', { shipmentId: successShipment.id });
            }}
            style={styles.actionBtn}
          />
          <Button
            title="Return to Logistics Home"
            variant="secondary"
            onPress={() => {
              navigation.navigate('Home');
            }}
            style={[styles.actionBtn, { marginTop: 12 }] as any}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionHeader title="Fare Quote Summary" />

        <Card style={styles.card}>
          <View style={styles.fareHeader}>
            <Text style={styles.totalFareLabel}>Total Fare</Text>
            <Text style={styles.totalFareVal}>
              ₦{parseFloat(String(quote.totalFare)).toLocaleString()}
            </Text>
          </View>
          <View style={styles.divider} />
          <ListItem title="Base Fare" right={`₦${quote.baseFare}`} />
          <ListItem title="Distance Fare" right={`₦${quote.distanceFare}`} />
          <ListItem title="Weight Surcharge" right={`₦${quote.weightFare}`} />
          {quote.surgeMultiplier > 1 && (
            <ListItem title="Surge Multiplier" right={`${quote.surgeMultiplier}x`} />
          )}
        </Card>

        <SectionHeader title="Delivery Details" />
        <Card style={styles.card}>
          <ListItem title="Pickup Address" subtitle={pickupAddress} />
          <ListItem title="Dropoff Address" subtitle={dropoffAddress} />
          <ListItem title="Recipient Name" subtitle={recipientName} />
          <ListItem title="Recipient Contact" subtitle={recipientPhone} />
          <ListItem title="Category" subtitle={formatPackageCategory(packageCategory)} />
          <ListItem title="Priority Level" subtitle={formatPriority(priority)} />
          {packageDescription && <ListItem title="Description" subtitle={packageDescription} />}
          {specialInstructions && <ListItem title="Instructions" subtitle={specialInstructions} />}
        </Card>

        <SectionHeader title="Payment Method" />
        <Card style={styles.card}>
          <ListItem
            title="Premium Wallet Balance"
            subtitle="Default checkout"
            right="Selected ✓"
          />
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Cancel"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.footerBtn}
        />
        <Button
          title={loading ? 'Booking...' : 'Confirm & Request Driver'}
          onPress={handleBookShipment}
          disabled={loading}
          style={styles.footerBtn}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray100 },
  scroll: { paddingVertical: 16 },
  card: { padding: 16, marginHorizontal: 16, marginBottom: 16, borderRadius: 12 },
  fareHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  totalFareLabel: { fontSize: 16, fontWeight: '800', color: colors.gray700 },
  totalFareVal: { fontSize: 24, fontWeight: '900', color: colors.secondary },
  divider: { height: 1, backgroundColor: colors.gray200, marginVertical: 12 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
  },
  footerBtn: { flex: 1 },
  successContainer: { flex: 1, backgroundColor: colors.white, justifyContent: 'center' },
  successInner: { padding: 24, alignItems: 'center' },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkIcon: { fontSize: 32, color: colors.white, fontWeight: 'bold' },
  successTitle: { fontSize: 24, fontWeight: '900', color: colors.gray900, marginBottom: 12 },
  successSub: { fontSize: 13, color: colors.gray500, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  successDetailsCard: { width: '100%', padding: 16, marginBottom: 32, borderRadius: 12 },
  actionBtn: { width: '100%' },
});
