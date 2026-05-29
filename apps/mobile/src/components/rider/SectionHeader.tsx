import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? <Text style={styles.action}>{action}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 },
  title: { color: colors.gray900, fontSize: 16, fontWeight: '900' },
  action: { color: colors.secondary, fontSize: 13, fontWeight: '800' },
});
