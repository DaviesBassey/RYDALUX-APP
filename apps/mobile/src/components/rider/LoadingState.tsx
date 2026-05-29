import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.secondary} size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  label: { color: colors.gray500, marginTop: 14, fontSize: 14, fontWeight: '700' },
});
