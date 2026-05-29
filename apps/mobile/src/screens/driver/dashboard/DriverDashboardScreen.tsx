import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { colors } from '../../../constants/colors';
import { MOCK_DRIVER, MOCK_VEHICLE } from '../../../mock/driver';

type Props = {
  navigation: any;
};

export default function DriverDashboardScreen({ navigation }: Props) {
  const [isOnline, setIsOnline] = useState(false);

  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {MOCK_DRIVER.firstName}! 👋</Text>
          <Text style={styles.subtitle}>Your daily earnings</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('DriverProfile')}>
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Online Toggle */}
      <View style={styles.onlineCard}>
        <View>
          <Text style={styles.onlineLabel}>Go Online</Text>
          <Text style={styles.onlineStatus}>
            {isOnline ? '🟢 Online' : '⚫ Offline'}
          </Text>
        </View>
        <Switch value={isOnline} onValueChange={handleToggleOnline} />
      </View>

      {/* Today's Earnings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Earnings</Text>
        <View style={styles.earningsRow}>
          <View style={styles.earningItem}>
            <Text style={styles.earningLabel}>Trips</Text>
            <Text style={styles.earningValue}>₦8,500</Text>
          </View>
          <View style={styles.earningItem}>
            <Text style={styles.earningLabel}>Bonuses</Text>
            <Text style={styles.earningValue}>₦500</Text>
          </View>
          <View style={styles.earningItem}>
            <Text style={styles.earningLabel}>Expenses</Text>
            <Text style={styles.earningValue}>-₦1,000</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.netEarningsRow}>
          <Text style={styles.netEarningsLabel}>Net Earnings</Text>
          <Text style={styles.netEarningsValue}>₦8,000</Text>
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{MOCK_DRIVER.completedTrips}</Text>
          <Text style={styles.statLabel}>Completed Trips</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{MOCK_DRIVER.rating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Vehicle Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vehicle Status</Text>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>
            {MOCK_VEHICLE.year} {MOCK_VEHICLE.make} {MOCK_VEHICLE.model}
          </Text>
          <Text style={styles.vehicleReg}>{MOCK_VEHICLE.registrationNumber}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>✅ {MOCK_VEHICLE.status}</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('EarningsOverview')}>
          <Text style={styles.actionIcon}>💰</Text>
          <Text style={styles.actionLabel}>Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('DocumentsUpload')}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionLabel}>Documents</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('PayoutHistory')}>
          <Text style={styles.actionIcon}>🏦</Text>
          <Text style={styles.actionLabel}>Payouts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('SupportTickets')}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel}>Support</Text>
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  profileIcon: {
    fontSize: 32,
  },
  onlineCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.success,
  },
  onlineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  onlineStatus: {
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  earningItem: {
    flex: 1,
  },
  earningLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  earningValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  netEarningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netEarningsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  netEarningsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  vehicleInfo: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  vehicleReg: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  actionButton: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
