import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { Button } from './Button';

type Props = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ title = 'Something went wrong', message, onRetry }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <Button title="Try again" onPress={onRetry} style={styles.button} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: colors.gray900, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  message: { color: colors.gray500, fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center' },
  button: { marginTop: 18, alignSelf: 'stretch' },
});
