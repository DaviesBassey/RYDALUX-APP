import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/colors';
import { MOCK_DRIVER, MOCK_VEHICLE } from '../../../mock/driver';

type Props = {
  navigation: any;
};

export default function DriverProfileScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Profile</Text>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <Text style={styles.profileIcon}>👤</Text>
        <Text style={styles.name}>
          {MOCK_DRIVER.firstName} {MOCK_DRIVER.lastName}
        </Text>
        <Text style={styles.phone}>{MOCK_DRIVER.phone}</Text>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>✏️ Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{MOCK_DRIVER.completedTrips}</Text>
          <Text style={styles.statLabel}>Completed Trips</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{MOCK_DRIVER.rating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{MOCK_DRIVER.approvalStatus === 'APPROVED' ? '✅' : '⏳'}</Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      </View>

      {/* Driver Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Driver Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{MOCK_DRIVER.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>
            {new Date(MOCK_DRIVER.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={styles.infoValue}>{MOCK_DRIVER.approvalStatus}</Text>
        </View>
      </View>

      {/* Vehicle Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vehicle Information</Text>
        <Text style={styles.vehicleName}>
          {MOCK_VEHICLE.year} {MOCK_VEHICLE.make} {MOCK_VEHICLE.model}
        </Text>
        <Text style={styles.vehicleReg}>{MOCK_VEHICLE.registrationNumber}</Text>
        <TouchableOpacity style={styles.editLink}>
          <Text style={styles.editLinkText}>Edit Vehicle →</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('DriverSettings')}>
        <Text style={styles.settingsButtonIcon}>⚙️</Text>
        <Text style={styles.settingsButtonText}>Settings</Text>
      </TouchableOpacity>
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
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  profileIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  phone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  editButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editButtonText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  vehicleReg: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  editLink: {
    paddingVertical: 8,
  },
  editLinkText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  settingsButtonIcon: {
    fontSize: 24,
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
