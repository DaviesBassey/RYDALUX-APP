import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../constants/colors';
import { RideCategory } from '../../constants/ride-categories';
import { formatCurrency } from '../../utils/formatting';

type Props = {
  category: RideCategory;
  selected: boolean;
  estimate: number;
  onPress: () => void;
};

export function RideCategoryCard({ category, selected, estimate, onPress }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={[styles.card, selected && styles.selected]}>
      <View style={styles.mark}>
        <Text style={styles.icon}>{category.icon}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.name}>{category.displayName}</Text>
        <Text style={styles.description}>{category.description}</Text>
        <Text style={styles.meta}>{category.capacity} seats • {category.estimatedTime}</Text>
      </View>
      <Text style={styles.price}>{formatCurrency(estimate)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  selected: { borderColor: colors.secondary, backgroundColor: '#fffaf0' },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.darkNavy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: { fontSize: 22 },
  copy: { flex: 1 },
  name: { color: colors.gray900, fontSize: 16, fontWeight: '800' },
  description: { color: colors.gray500, fontSize: 12, marginTop: 2 },
  meta: { color: colors.gray700, fontSize: 12, marginTop: 5, fontWeight: '700' },
  price: { color: colors.gray900, fontSize: 14, fontWeight: '900' },
});
