import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors } from '../../../constants/colors';
import { getMockPayouts, MOCK_DRIVER } from '../../../mock/driver';

type Props = {
  navigation: any;
};

export default function PayoutHistoryScreen({ navigation }: Props) {
  const payouts = getMockPayouts();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return colors.success;
      case 'PROCESSING':
        return colors.warning;
      case 'REJECTED':
        return colors.error;
      default:
        return colors.info;
    }
  };

  const renderPayout = ({ item }: any) => (
    <TouchableOpacity
      style={styles.payoutCard}
      onPress={() => navigation.navigate('PayoutDetails', { payoutId: item.id })}>
      <View style={styles.payoutHeader}>
        <View>
          <Text style={styles.amount}>₦{item.amount}</Text>
          <Text style={styles.date}>{new Date(item.requestedDate).toLocaleDateString()}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(item.status)}20` },
          ]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.bankInfo}>{item.bankName} {item.accountNumberMasked}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payout History</Text>

      {/* Request New Payout Button */}
      <TouchableOpacity
        style={styles.requestButton}
        onPress={() => navigation.navigate('PayoutRequest')}>
        <Text style={styles.requestButtonText}>+ Request New Payout</Text>
      </TouchableOpacity>

      {/* Payouts List */}
      <FlatList
        data={payouts}
        renderItem={renderPayout}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
      />
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
  requestButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  requestButtonText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    gap: 12,
  },
  payoutCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bankInfo: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
