import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/colors';

type Props = {
  navigation: any;
  route: any;
};

export default function RideDetailsScreen({ navigation, route }: Props) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Ride Details</Text>

      {/* Trip Status */}
      <View style={styles.card}>
        <Text style={styles.label}>Trip Status</Text>
        <Text style={styles.status}>IN_PROGRESS</Text>
      </View>

      {/* Rider Info */}
      <View style={styles.card}>
        <Text style={styles.label}>Rider Information</Text>
        <Text style={styles.riderName}>Chioma Eze</Text>
        <Text style={styles.riderInfo}>⭐ 4.9 • 156 rides</Text>
        <TouchableOpacity style={styles.callButton}>
          <Text style={styles.callText}>☎️ Call Rider</Text>
        </TouchableOpacity>
      </View>

      {/* Route */}
      <View style={styles.card}>
        <View style={styles.routeRow}>
          <Text style={styles.routeIcon}>📍</Text>
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeValue}>Lekki Phase 1</Text>
          </View>
        </View>
        <View style={styles.routeRow}>
          <Text style={styles.routeIcon}>🎯</Text>
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>Dropoff</Text>
            <Text style={styles.routeValue}>Victoria Island</Text>
          </View>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.card}>
        <Text style={styles.label}>Trip Timeline</Text>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTime}>2:15 PM</Text>
          <Text style={styles.timelineEvent}>Trip Started</Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTime}>2:10 PM</Text>
          <Text style={styles.timelineEvent}>Rider Picked Up</Text>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.reportButton}>
        <Text style={styles.reportButtonText}>⚠️ Report Issue</Text>
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
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.info,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  riderInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  callButton: {
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  callText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
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
  timelineItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timelineTime: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    width: 50,
  },
  timelineEvent: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  reportButton: {
    backgroundColor: colors.error + '20',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 32,
  },
  reportButtonText: {
    color: colors.error,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
  },
});
