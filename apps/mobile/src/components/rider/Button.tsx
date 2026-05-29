import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';

type Props = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style }: Props) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? colors.darkNavy : colors.white} />
      ) : (
        <Text style={[styles.text, (variant === 'secondary' || variant === 'ghost' || variant === 'gold') && styles.darkText]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200 },
  ghost: { backgroundColor: colors.transparent },
  danger: { backgroundColor: colors.error },
  gold: { backgroundColor: colors.secondary },
  disabled: { opacity: 0.55 },
  text: { color: colors.white, fontSize: 15, fontWeight: '800' },
  darkText: { color: colors.darkNavy },
});
