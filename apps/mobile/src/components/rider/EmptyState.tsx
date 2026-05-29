import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 },
  title: { color: colors.gray900, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  message: { color: colors.gray500, fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center' },
});
