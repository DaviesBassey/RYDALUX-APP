import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from '../../constants/colors';

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.gray500}
        style={[styles.input, Boolean(error) && styles.inputError, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { color: colors.gray700, fontSize: 12, fontWeight: '800', marginBottom: 7, textTransform: 'uppercase' },
  input: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    color: colors.gray900,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  inputError: { borderColor: colors.error },
  error: { color: colors.error, fontSize: 12, marginTop: 6, fontWeight: '600' },
});
