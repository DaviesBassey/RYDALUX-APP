import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { colors } from '../../../constants/colors';
import { getMockTrip } from '../../../mock/driver';
import { validatePinCode } from '../../../utils/validation-driver';

type Props = {
  navigation: any;
  route: any;
};

export default function TripPinVerificationScreen({ navigation, route }: Props) {
  const trip = getMockTrip(route.params?.tripId);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // Mock PIN for demo: 1234
  const CORRECT_PIN = '1234';

  const handleVerifyPin = () => {
    if (!validatePinCode(pin)) {
      setError('PIN must be 4-6 digits');
      return;
    }

    if (pin === CORRECT_PIN) {
      setError('');
      Alert.alert('Success', 'PIN verified!', [
        {
          text: 'OK',
          onPress: () => navigation.replace('TripActive', { tripId: trip.id }),
        },
      ]);
    } else {
      setError('Incorrect PIN. Try again.');
      setPin('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Rider PIN</Text>
      <Text style={styles.subtitle}>Verify the PIN from the rider to start the trip</Text>

      {/* Rider Card */}
      <View style={styles.riderCard}>
        <Text style={styles.riderName}>{trip.riderName}</Text>
        <Text style={styles.riderPhone}>{trip.riderPhone}</Text>
      </View>

      {/* PIN Input */}
      <View style={styles.pinSection}>
        <Text style={styles.pinLabel}>Trip PIN</Text>
        <TextInput
          style={[styles.pinInput, error && styles.pinInputError]}
          placeholder="0000"
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          maxLength={6}
          value={pin}
          onChangeText={(text) => {
            setPin(text);
            setError('');
          }}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      {/* Route Info */}
      <View style={styles.routeCard}>
        <View style={styles.routeRow}>
          <Text style={styles.routeIcon}>📍</Text>
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeValue}>{trip.pickupLocation.title}</Text>
          </View>
        </View>
        <View style={[styles.routeRow, { marginTop: 12 }]}>
          <Text style={styles.routeIcon}>🎯</Text>
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Dropoff</Text>
            <Text style={styles.routeValue}>{trip.dropoffLocation.title}</Text>
          </View>
        </View>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          💡 The rider provided a PIN to confirm they entered the correct vehicle. Ask them for this code to proceed.
        </Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyPin}>
        <Text style={styles.verifyButtonText}>Verify PIN & Start Trip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  riderCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  riderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  riderPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  pinSection: {
    marginBottom: 24,
  },
  pinLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  pinInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 2,
    borderColor: colors.border,
  },
  pinInputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  routeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  routeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: colors.info + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  infoText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 32,
  },
  verifyButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
