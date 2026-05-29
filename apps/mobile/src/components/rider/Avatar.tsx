import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

export function Avatar({ name, size = 52 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.text}>{initials || 'R'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.darkNavy, fontSize: 18, fontWeight: '900' },
});
