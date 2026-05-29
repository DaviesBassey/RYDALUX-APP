import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../../../constants/colors';
import { getMockTripRequest } from '../../../mock/driver';

type Props = {
  navigation: any;
  route: any;
};

export default function TripRequestScreen({ navigation, route }: Props) {
  const [tripRequest] = useState(getMockTripRequest());
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          navigation.goBack();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigation]);

  const handleAcceptTrip = () => {
    navigation.replace('TripNavigation', { tripId: tripRequest.id });
  };

  const handleDeclineTrip = () => {
    Alert.alert('Decline Trip', 'Are you sure you want to decline this trip?', [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      { text: 'Decline', onPress: () => navigation.goBack(), style: 'destructive' },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.timer}>⏱️ {timeLeft}s</Text>
        <TouchableOpacity onPress={handleDeclineTrip}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Rider Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Rider Details</Text>
        <View style={styles.riderInfo}>
          <Text style={styles.riderName}>{tripRequest.riderName}</Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>⭐ {tripRequest.riderRating}</Text>
          </View>
        </View>
      </View>

      {/* Trip Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Trip Details</Text>
        <View style={styles.locationGroup}>
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationName}>{tripRequest.pickupLocation.title}</Text>
            </View>
          </View>
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>🎯</Text>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>Dropoff</Text>
              <Text style={styles.locationName}>{tripRequest.dropoffLocation.title}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Fare Info */}
      <View style={styles.card}>
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Estimated Fare</Text>
          <Text style={styles.fareAmount}>₦{tripRequest.estimatedFare}</Text>
        </View>
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Distance</Text>
          <Text style={styles.fareValue}>{(tripRequest.distance / 1000).toFixed(1)} km</Text>
        </View>
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>ETA</Text>
          <Text style={styles.fareValue}>{(tripRequest.eta / 60).toFixed(0)} minutes</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptTrip}>
          <Text style={styles.acceptButtonText}>Accept Trip 🚗</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineButton} onPress={handleDeclineTrip}>
          <Text style={styles.declineButtonText}>Decline</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  timer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
  },
  closeIcon: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  riderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  ratingBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
  },
  locationGroup: {
    gap: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  fareLabel: {
    fontSize: 14,
    color: colors.text,
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.success,
  },
  fareValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 'auto',
    marginBottom: 32,
  },
  acceptButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 16,
  },
  acceptButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  declineButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  declineButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
