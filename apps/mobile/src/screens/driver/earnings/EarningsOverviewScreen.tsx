import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/colors';
import { getMockEarningsForDate, MOCK_DRIVER } from '../../../mock/driver';

type Props = {
  navigation: any;
};

export default function EarningsOverviewScreen({ navigation }: Props) {
  const today = new Date();
  const earnings = getMockEarningsForDate(today);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Earnings</Text>

      {/* Total Earnings Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Today's Earnings</Text>
        <Text style={styles.amount}>₦8,500</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Trips</Text>
            <Text style={styles.statValue}>3</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Bonuses</Text>
            <Text style={styles.statValue}>₦500</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Cancellations</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
        </View>
      </View>

      {/* Weekly Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Stats</Text>
        <View style={styles.weeklyRow}>
          <View>
            <Text style={styles.weekLabel}>Week Total</Text>
            <Text style={styles.weekValue}>₦47,200</Text>
          </View>
          <View>
            <Text style={styles.weekLabel}>Avg/Day</Text>
            <Text style={styles.weekValue}>₦6,743</Text>
          </View>
          <View>
            <Text style={styles.weekLabel}>Trips</Text>
            <Text style={styles.weekValue}>18</Text>
          </View>
        </View>
      </View>

      {/* Monthly Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Monthly Stats</Text>
        <View style={styles.monthlyRow}>
          <Text style={styles.monthLabel}>Total Earnings</Text>
          <Text style={styles.monthValue}>₦184,500</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('EarningsCalendar')}>
          <Text style={styles.viewAllLink}>View Monthly Breakdown →</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Trips */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Trips</Text>
        {earnings.map((trip, index) => (
          <View key={index} style={styles.tripItem}>
            <View style={styles.tripInfo}>
              <Text style={styles.tripRoute}>{trip.pickupLocation} → {trip.dropoffLocation}</Text>
              <Text style={styles.tripRider}>{trip.riderName}</Text>
            </View>
            <Text style={styles.tripEarning}>₦{trip.amount}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
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
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  weeklyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  weekValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthLabel: {
    fontSize: 14,
    color: colors.text,
  },
  monthValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  viewAllLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  tripItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tripInfo: {
    flex: 1,
  },
  tripRoute: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tripRider: {
    fontSize: 12,
    color: colors.text,
    marginTop: 4,
  },
  tripEarning: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.success,
  },
});
