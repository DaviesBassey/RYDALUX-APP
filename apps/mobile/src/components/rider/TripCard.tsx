import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../constants/colors';
import { formatCurrency, formatDate, formatDistance } from '../../utils/formatting';
import { StatusBadge } from './StatusBadge';

type Props = {
  pickup: string;
  dropoff: string;
  date: string;
  amount: number;
  distanceMeters: number;
  status: string;
  onPress: () => void;
};

export function TripCard({ pickup, dropoff, date, amount, distanceMeters, status, onPress }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.date}>{formatDate(date)}</Text>
        <StatusBadge label={status} tone={status === 'COMPLETED' ? 'success' : 'neutral'} />
      </View>
      <Text style={styles.route}>{pickup}</Text>
      <Text style={styles.to}>to {dropoff}</Text>
      <View style={styles.bottom}>
        <Text style={styles.meta}>{formatDistance(distanceMeters)}</Text>
        <Text style={styles.amount}>{formatCurrency(amount)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: 12,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  date: { color: colors.gray500, fontSize: 12, fontWeight: '700' },
  route: { color: colors.gray900, fontSize: 15, fontWeight: '800' },
  to: { color: colors.gray500, fontSize: 14, marginTop: 3 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  meta: { color: colors.gray500, fontSize: 12, fontWeight: '700' },
  amount: { color: colors.gray900, fontSize: 16, fontWeight: '900' },
});
