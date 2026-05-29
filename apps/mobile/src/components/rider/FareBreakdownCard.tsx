import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { formatCurrency } from '../../utils/formatting';
import { Card } from './Card';

export type FareBreakdownDisplay = {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  bookingFee: number;
  safetyFee?: number;
  total: number;
};

export function FareBreakdownCard({ breakdown }: { breakdown: FareBreakdownDisplay }) {
  return (
    <Card>
      <Text style={styles.title}>Fare breakdown</Text>
      <Row label="Base fare" value={breakdown.baseFare} />
      <Row label="Distance" value={breakdown.distanceFare} />
      <Row label="Time" value={breakdown.timeFare} />
      <Row label="Booking fee" value={breakdown.bookingFee} />
      {breakdown.safetyFee ? <Row label="Safety cover" value={breakdown.safetyFee} /> : null}
      <View style={styles.divider} />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.total}>{formatCurrency(breakdown.total)}</Text>
      </View>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{formatCurrency(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.gray900, fontSize: 15, fontWeight: '900', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: colors.gray500, fontSize: 14 },
  value: { color: colors.gray900, fontSize: 14, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.gray200, marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: colors.gray900, fontSize: 16, fontWeight: '900' },
  total: { color: colors.primary, fontSize: 19, fontWeight: '900' },
});
