import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../../navigation/RiderNavigator';
import { Screen, Button, Card, Input, SectionHeader } from '../../../components/rider';
import { colors } from '../../../constants/colors';
import { createShipmentQuote, PackageCategory, ShipmentPriority } from '../../../api/shipments';
import { MOCK_PICKUP, MOCK_DROPOFF } from '../../../mock/rider';

type Nav = NativeStackNavigationProp<RiderNavigatorParamList, 'CreateShipmentQuote'>;

const CATEGORIES: { label: string; value: PackageCategory }[] = [
  { label: 'Document', value: 'DOCUMENT' },
  { label: 'Small Package (< 5kg)', value: 'SMALL_PACKAGE' },
  { label: 'Medium Package (5-15kg)', value: 'MEDIUM_PACKAGE' },
  { label: 'Large Package (> 15kg)', value: 'LARGE_PACKAGE' },
  { label: 'Fragile Item', value: 'FRAGILE' },
  { label: 'High Value', value: 'HIGH_VALUE' },
  { label: 'Other', value: 'OTHER' },
];

const PRIORITIES: { label: string; value: ShipmentPriority; desc: string }[] = [
  { label: 'Standard', value: 'STANDARD', desc: 'Delivered in 2-4 hours' },
  { label: 'Express', value: 'EXPRESS', desc: 'Instant dispatch, direct delivery' },
  { label: 'Scheduled', value: 'SCHEDULED', desc: 'Deliver at a planned future time' },
];

export default function CreateShipmentQuoteScreen() {
  const navigation = useNavigation<Nav>();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Locations
  const [pickupAddress, setPickupAddress] = useState(MOCK_PICKUP.address);
  const [dropoffAddress, setDropoffAddress] = useState(MOCK_DROPOFF.address);

  // Step 2: Package details
  const [packageCategory, setPackageCategory] = useState<PackageCategory>('DOCUMENT');
  const [packageDescription, setPackageDescription] = useState('');
  const [declaredValue, setDeclaredValue] = useState('');
  const [weight, setWeight] = useState('1');
  const [priority, setPriority] = useState<ShipmentPriority>('STANDARD');

  // Step 3: Recipient
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [senderName, setSenderName] = useState('Chidi Benson');

  async function handleCalculateQuote() {
    if (!recipientName.trim() || !recipientPhone.trim()) {
      Alert.alert('Missing Fields', 'Please enter the recipient\'s name and phone number.');
      return;
    }

    setLoading(true);
    try {
      const quote = await createShipmentQuote({
        pickupLatitude: MOCK_PICKUP.lat,
        pickupLongitude: MOCK_PICKUP.lng,
        dropoffLatitude: MOCK_DROPOFF.lat,
        dropoffLongitude: MOCK_DROPOFF.lng,
        packageCategory,
        priority,
        declaredValue: declaredValue ? parseFloat(declaredValue) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
      });

      navigation.navigate('ShipmentFareQuote', {
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
      });
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Could not fetch quote.';
      Alert.alert('Calculation Failed', errMsg);
    } finally {
      setLoading(false);
    }
  }

  function nextStep() {
    if (step === 1) {
      if (!pickupAddress.trim() || !dropoffAddress.trim()) {
        Alert.alert('Required Details', 'Please provide both pickup and dropoff addresses.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!packageDescription.trim()) {
        Alert.alert('Required Details', 'Please describe the package contents.');
        return;
      }
      setStep(3);
    }
  }

  function prevStep() {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  }

  return (
    <Screen contentStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stepTitle}>Step {step} of 3</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {step === 1 && (
          <View style={styles.stepContainer}>
            <SectionHeader title="Where are we delivering?" />
            <Card style={styles.card}>
              <Input
                label="Pickup Address"
                value={pickupAddress}
                onChangeText={setPickupAddress}
                placeholder="Enter pickup point"
              />
              <Input
                label="Dropoff Address"
                value={dropoffAddress}
                onChangeText={setDropoffAddress}
                placeholder="Enter recipient location"
              />
            </Card>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <SectionHeader title="Package Details" />
            <Card style={styles.card}>
              <Text style={styles.dropdownLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {CATEGORIES.map((cat) => {
                  const isSelected = packageCategory === cat.value;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[styles.categoryBtn, isSelected && styles.categoryBtnSelected]}
                      onPress={() => setPackageCategory(cat.value)}
                    >
                      <Text style={[styles.categoryBtnText, isSelected && styles.categoryBtnTextSelected]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Input
                label="Content Description"
                value={packageDescription}
                onChangeText={setPackageDescription}
                placeholder="e.g. signed business documents, red shoes box"
              />

              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Input
                    label="Value (₦, Optional)"
                    value={declaredValue}
                    onChangeText={setDeclaredValue}
                    placeholder="Declared value"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.flexHalf}>
                  <Input
                    label="Weight (kg, Optional)"
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="Package weight"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.dropdownLabel}>Priority</Text>
              <View style={styles.prioritiesContainer}>
                {PRIORITIES.map((p) => {
                  const isSelected = priority === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.priorityCard, isSelected && styles.priorityCardSelected]}
                      onPress={() => setPriority(p.value)}
                    >
                      <View style={styles.priorityHeader}>
                        <Text style={[styles.priorityLabelText, isSelected && styles.priorityLabelTextSelected]}>
                          {p.label}
                        </Text>
                        {isSelected && <View style={styles.checkIcon} />}
                      </View>
                      <Text style={styles.priorityDesc}>{p.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <SectionHeader title="Recipient Information" />
            <Card style={styles.card}>
              <Input
                label="Sender Name (Your Name)"
                value={senderName}
                onChangeText={setSenderName}
                placeholder="Your full name"
              />
              <Input
                label="Recipient Full Name"
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder="Who is receiving this package?"
              />
              <Input
                label="Recipient Phone Number"
                value={recipientPhone}
                onChangeText={setRecipientPhone}
                placeholder="e.g., +234 812 345 6789"
                keyboardType="phone-pad"
              />
              <Input
                label="Special Instructions (Optional)"
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
                placeholder="e.g., call upon arrival, leave with security gate"
              />
            </Card>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Back"
          variant="secondary"
          onPress={prevStep}
          style={styles.navBtn}
        />
        {step < 3 ? (
          <Button
            title="Continue"
            onPress={nextStep}
            style={styles.navBtn}
          />
        ) : (
          <Button
            title={loading ? 'Calculating...' : 'Generate Quote'}
            onPress={handleCalculateQuote}
            disabled={loading}
            style={styles.navBtn}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray100 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.gray200, backgroundColor: colors.white },
  stepTitle: { fontSize: 13, fontWeight: '700', color: colors.gray500, textTransform: 'uppercase' },
  progressBar: { height: 6, backgroundColor: colors.gray200, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.secondary },
  scroll: { paddingVertical: 16 },
  stepContainer: { paddingHorizontal: 16 },
  card: { padding: 16, borderRadius: 12 },
  dropdownLabel: { fontSize: 13, fontWeight: '800', color: colors.gray900, marginBottom: 8, textTransform: 'uppercase' },
  categoryScroll: { flexDirection: 'row', marginBottom: 16 },
  categoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.gray200,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  categoryBtnSelected: { backgroundColor: colors.gray900, borderColor: colors.gray900 },
  categoryBtnText: { fontSize: 12, fontWeight: '700', color: colors.gray500 },
  categoryBtnTextSelected: { color: colors.white },
  row: { flexDirection: 'row', gap: 12, marginVertical: 4 },
  flexHalf: { flex: 1 },
  prioritiesContainer: { gap: 10, marginTop: 4 },
  priorityCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  priorityCardSelected: { borderColor: colors.secondary, backgroundColor: colors.white },
  priorityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priorityLabelText: { fontSize: 14, fontWeight: '800', color: colors.gray900 },
  priorityLabelTextSelected: { color: colors.secondary },
  checkIcon: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.secondary },
  priorityDesc: { fontSize: 11, color: colors.gray500, marginTop: 4 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
  },
  navBtn: { flex: 1 },
});
