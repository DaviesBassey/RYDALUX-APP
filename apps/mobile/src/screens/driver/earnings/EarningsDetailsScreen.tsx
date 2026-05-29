import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/colors';

type Props = {
  navigation: any;
};

export default function EarningsDetailsScreen({ navigation }: Props) {
  const [selectedDate, setSelectedDate] = useState('2025-05-30');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Earnings Details</Text>

      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <TouchableOpacity style={styles.dateButton}>
          <Text style={styles.dateButtonText}>← Previous</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{selectedDate}</Text>
        <TouchableOpacity style={styles.dateButton}>
          <Text style={styles.dateButtonText}>Next →</Text>
        </TouchableOpacity>
      </View>

      {/* Daily Summary */}
      <View style={styles.card}>
        <Text style={styles.label}>Daily Summary</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Gross Earnings</Text>
          <Text style={styles.rowValue}>₦9,500</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Bonuses</Text>
          <Text style={styles.rowValue}>₦500</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Adjustments</Text>
          <Text style={styles.rowValue}>-₦1,000</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Net Earnings</Text>
          <Text style={styles.rowValue}>₦9,000</Text>
        </View>
      </View>

      {/* Trip List */}
      <View style={styles.card}>
        <Text style={styles.label}>Trips (3)</Text>
        {[1, 2, 3].map((trip) => (
          <View key={trip} style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripId}>Trip #{trip}</Text>
              <Text style={styles.tripTime}>2:30 PM</Text>
            </View>
            <View style={styles.tripRoute}>
              <Text style={styles.routeText}>Lekki Phase 1 → Victoria Island</Text>
            </View>
            <View style={styles.tripFooter}>
              <Text style={styles.tripDuration}>18 min • 8.4 km</Text>
              <Text style={styles.tripFare}>₦2,500</Text>
            </View>
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
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  dateButton: {
    padding: 8,
  },
  dateButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLabel: {
    fontSize: 14,
    color: colors.text,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  tripCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tripId: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  tripTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tripRoute: {
    marginBottom: 8,
  },
  routeText: {
    fontSize: 12,
    color: colors.text,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripDuration: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  tripFare: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
});
