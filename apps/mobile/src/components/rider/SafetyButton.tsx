import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../constants/colors';

type Props = {
  title?: string;
  onPress: () => void;
};

export function SafetyButton({ title = 'SOS', onPress }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.button}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  text: { color: colors.white, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
});
