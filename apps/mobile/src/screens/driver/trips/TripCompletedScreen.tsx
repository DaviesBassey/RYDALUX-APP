import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../../../constants/colors';
import { getMockTrip } from '../../../mock/driver';

type Props = {
  navigation: any;
  route: any;
};

export default function TripCompletedScreen({ navigation, route }: Props) {
  const trip = getMockTrip(route.params?.tripId);

  const handleGoHome = () => {
    navigation.replace('DriverDashboard');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Success Header */}
      <View style={styles.successHeader}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successText}>Trip Completed!</Text>
      </View>

      {/* Earnings Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Earnings</Text>
        <View style={styles.earningRow}>
          <Text style={styles.earningLabel}>Fare</Text>
          <Text style={styles.earningValue}>₦{trip.fare.total}</Text>
        </View>
        <View style={styles.earningRow}>
          <Text style={styles.earningLabel}>Duration</Text>
          <Text style={styles.earningValue}>{trip.durationMinutes} mins</Text>
        </View>
        <View style={styles.earningRow}>
          <Text style={styles.earningLabel}>Distance</Text>
          <Text style={styles.earningValue}>{trip.distanceKm} km</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Earned</Text>
          <Text style={styles.totalValue}>₦{trip.earnings}</Text>
        </View>
      </View>

      {/* Fare Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fare Breakdown</Text>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Base Fare</Text>
          <Text style={styles.breakdownValue}>₦{trip.fare.baseFare}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Distance Fare</Text>
          <Text style={styles.breakdownValue}>₦{trip.fare.distanceFare}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Time Fare</Text>
          <Text style={styles.breakdownValue}>₦{trip.fare.timeFare}</Text>
        </View>
      </View>

      {/* Rider Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rider Details</Text>
        <View style={styles.riderInfo}>
          <Text style={styles.riderName}>{trip.riderName}</Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>⭐ {trip.riderRating}</Text>
          </View>
        </View>
        <View style={styles.ratingPrompt}>
          <Text style={styles.ratingPromptText}>
            📝 Did you rate this rider? Visit your profile to provide a rating.
          </Text>
        </View>
      </View>

      {/* Route Info */}
      <View style={styles.card}>
        <View style={styles.routeRow}>
          <Text style={styles.routeIcon}>📍</Text>
          <View>
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeValue}>{trip.pickupLocation.title}</Text>
          </View>
        </View>
        <View style={styles.routeRow}>
          <Text style={styles.routeIcon}>🎯</Text>
          <View>
            <Text style={styles.routeLabel}>Dropoff</Text>
            <Text style={styles.routeValue}>{trip.dropoffLocation.title}</Text>
          </View>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
        <Text style={styles.homeButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>

      <View style={styles.spacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 24,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  successText: {
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
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  earningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  earningLabel: {
    fontSize: 14,
    color: colors.text,
  },
  earningValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.success,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  riderInfo: {
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
  ratingBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
  },
  ratingPrompt: {
    backgroundColor: colors.info + '20',
    borderRadius: 8,
    padding: 12,
  },
  ratingPromptText: {
    fontSize: 12,
    color: colors.text,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  routeIcon: {
    fontSize: 24,
    marginTop: 2,
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
  homeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  homeButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  spacing: {
    height: 16,
  },
});
