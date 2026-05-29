import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { formatTripStatus } from '../../utils/formatting';

type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const toneColors: Record<Tone, string> = {
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
  neutral: colors.gray500,
};

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const color = toneColors[tone];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{formatTripStatus(label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.white,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 7 },
  text: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
});
