import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/colors';
import { getMockTrip } from '../../../mock/driver';

type Props = {
  navigation: any;
  route: any;
};

export default function TripArrivedScreen({ navigation, route }: Props) {
  const trip = getMockTrip(route.params?.tripId);

  const handleStartTrip = () => {
    navigation.replace('TripActive', { tripId: trip.id });
  };

  const handleCancelTrip = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>You've Arrived! 🎉</Text>
      </View>

      {/* Status Card */}
      <View style={styles.card}>
        <Text style={styles.statusIcon}>✅</Text>
        <Text style={styles.statusText}>Waiting for Rider</Text>
      </View>

      {/* Rider Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rider Details</Text>
        <Text style={styles.riderName}>{trip.riderName}</Text>
        <Text style={styles.riderInfo}>⭐ {trip.riderRating} • Call: {trip.riderPhone}</Text>
        <TouchableOpacity style={styles.callButton}>
          <Text style={styles.callIcon}>☎️</Text>
          <Text style={styles.callText}>Call Rider</Text>
        </TouchableOpacity>
      </View>

      {/* Location */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pickup Location</Text>
        <Text style={styles.location}>{trip.pickupLocation.title}</Text>
        <Text style={styles.address}>{trip.pickupLocation.address}</Text>
      </View>

      {/* Notes */}
      <View style={styles.notesCard}>
        <Text style={styles.notesLabel}>💡 Tips</Text>
        <Text style={styles.notesText}>
          • Wait for rider at the pickup point{'\n'}
          • Keep engine running or doors unlocked{'\n'}
          • Have a pleasant interaction
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.startButton} onPress={handleStartTrip}>
          <Text style={styles.startButtonText}>Rider is Here - Start Trip 🚀</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelTrip}>
          <Text style={styles.cancelButtonText}>Cancel Trip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.success,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  riderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  riderInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  callButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  callIcon: {
    fontSize: 18,
  },
  callText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  location: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  address: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  notesCard: {
    backgroundColor: colors.warning + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 'auto',
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 16,
  },
  startButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: colors.error,
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
