import React, { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';

type Props = {
  children: ReactNode;
  dark?: boolean;
  scroll?: boolean;
  contentStyle?: ViewStyle;
};

export function Screen({ children, dark = false, scroll = true, contentStyle }: Props) {
  const backgroundColor = dark ? colors.darkNavy : colors.accent;
  if (!scroll) {
    return <SafeAreaView style={[styles.safe, { backgroundColor }, contentStyle]}>{children}</SafeAreaView>;
  }
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]}>
      <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
});
