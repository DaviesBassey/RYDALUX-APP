import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/colors';
import { getMockTrip } from '../../../mock/driver';

type Props = {
  navigation: any;
  route: any;
};

export default function TripNavigationScreen({ navigation, route }: Props) {
  const trip = getMockTrip(route.params?.tripId);

  const handleArrived = () => {
    navigation.replace('TripArrived', { tripId: trip.id });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Navigate to Pickup</Text>

      {/* Directions Placeholder */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapIcon}>🗺️</Text>
        <Text style={styles.mapText}>Map View Placeholder</Text>
        <Text style={styles.mapSubtext}>Integration with maps service required</Text>
      </View>

      {/* Trip Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pickup Location</Text>
        <Text style={styles.location}>{trip.pickupLocation.title}</Text>
        <Text style={styles.address}>{trip.pickupLocation.address}</Text>
        <View style={styles.detailsRow}>
          <Text style={styles.detailLabel}>Distance</Text>
          <Text style={styles.detailValue}>{trip.distanceKm} km</Text>
        </View>
        <View style={styles.detailsRow}>
          <Text style={styles.detailLabel}>ETA</Text>
          <Text style={styles.detailValue}>{trip.durationMinutes} minutes</Text>
        </View>
      </View>

      {/* Rider Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rider</Text>
        <View style={styles.riderCard}>
          <Text style={styles.riderName}>{trip.riderName}</Text>
          <Text style={styles.riderRating}>⭐ {trip.riderRating}</Text>
        </View>
        <TouchableOpacity style={styles.callButton}>
          <Text style={styles.callButtonIcon}>☎️</Text>
          <Text style={styles.callButtonText}>Call Rider</Text>
        </TouchableOpacity>
      </View>

      {/* Action Button */}
      <TouchableOpacity style={styles.arrivedButton} onPress={handleArrived}>
        <Text style={styles.arrivedButtonText}>I've Arrived at Pickup ✅</Text>
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
    marginBottom: 16,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  mapIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  mapText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  mapSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  location: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  address: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  riderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  riderRating: {
    fontSize: 14,
    color: colors.warning,
  },
  callButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callButtonIcon: {
    fontSize: 18,
  },
  callButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  arrivedButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 'auto',
    marginBottom: 32,
  },
  arrivedButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
