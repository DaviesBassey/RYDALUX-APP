import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../../constants/colors';

type Props = {
  navigation: any;
};

export default function EarningsCalendarScreen({ navigation }: Props) {
  const monthData = [
    { day: 1, earnings: 5200, trips: 2 },
    { day: 2, earnings: 7800, trips: 3 },
    { day: 3, earnings: 6500, trips: 3 },
    { day: 4, earnings: 8200, trips: 4 },
    { day: 5, earnings: 6800, trips: 3 },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Monthly Earnings</Text>

      {/* Month Summary */}
      <View style={styles.card}>
        <Text style={styles.monthLabel}>May 2025</Text>
        <Text style={styles.monthTotal}>₦184,500</Text>
        <View style={styles.monthStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg/Day</Text>
            <Text style={styles.statValue}>₦5,950</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Trips</Text>
            <Text style={styles.statValue}>95</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Best Day</Text>
            <Text style={styles.statValue}>₦9,200</Text>
          </View>
        </View>
      </View>

      {/* Daily Breakdown */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Daily Breakdown (Last 5 Days)</Text>
        {monthData.map((day, index) => (
          <View key={index} style={styles.dayRow}>
            <View style={styles.dayInfo}>
              <Text style={styles.dayNumber}>Day {day.day}</Text>
              <Text style={styles.dayTrips}>{day.trips} trips</Text>
            </View>
            <View style={styles.dayProgress}>
              <View style={[styles.progressBar, { width: `${(day.earnings / 10000) * 100}%` }]} />
            </View>
            <Text style={styles.dayAmount}>₦{day.earnings}</Text>
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
  monthLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  monthTotal: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 16,
  },
  monthStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayInfo: {
    width: 60,
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  dayTrips: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dayProgress: {
    flex: 1,
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.success,
  },
  dayAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    minWidth: 60,
    textAlign: 'right',
  },
});
