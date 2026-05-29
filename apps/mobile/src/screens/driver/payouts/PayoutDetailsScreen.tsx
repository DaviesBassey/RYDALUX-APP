import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/colors';

type Props = {
  navigation: any;
  route: any;
};

export default function PayoutDetailsScreen({ navigation, route }: Props) {
  const { payoutId } = route.params;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Payout Details</Text>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Status</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusIcon}>✅</Text>
          <Text style={styles.statusValue}>PAID</Text>
        </View>
      </View>

      {/* Amount */}
      <View style={styles.card}>
        <Text style={styles.label}>Payout Amount</Text>
        <Text style={styles.amount}>₦45,000</Text>
      </View>

      {/* Dates */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Requested</Text>
          <Text style={styles.rowValue}>2025-05-16</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Processed</Text>
          <Text style={styles.rowValue}>2025-05-17</Text>
        </View>
      </View>

      {/* Bank Details */}
      <View style={styles.card}>
        <Text style={styles.label}>Bank Details</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Bank</Text>
          <Text style={styles.rowValue}>First Bank</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Account</Text>
          <Text style={styles.rowValue}>****5678</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity style={styles.downloadButton}>
        <Text style={styles.downloadButtonText}>📥 Download Receipt</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.contactButton}>
        <Text style={styles.contactButtonText}>💬 Contact Support</Text>
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
  statusCard: {
    backgroundColor: colors.success + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIcon: {
    fontSize: 24,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.success,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  downloadButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 12,
  },
  downloadButtonText: {
    color: colors.surface,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
  },
  contactButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 32,
  },
  contactButtonText: {
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
  },
});
