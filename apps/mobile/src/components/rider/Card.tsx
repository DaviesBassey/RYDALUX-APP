import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';

type Props = {
  children: ReactNode;
  dark?: boolean;
  style?: ViewStyle;
};

export function Card({ children, dark = false, style }: Props) {
  return <View style={[styles.card, dark && styles.dark, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 16,
    marginBottom: 12,
  },
  dark: {
    backgroundColor: colors.gray900,
    borderColor: colors.gray700,
  },
});
