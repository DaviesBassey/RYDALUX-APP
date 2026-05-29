import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';
import { LoadingState, Screen } from '../../components/rider';

export default function SplashScreen() {
  return (
    <Screen dark scroll={false} contentStyle={styles.safe}>
      <View style={styles.brand}>
        <Text style={styles.logo}>RYDALUX</Text>
        <Text style={styles.line}>Premium Lagos mobility</Text>
      </View>
      <LoadingState label="Preparing your ride experience" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  safe: { justifyContent: 'center' },
  brand: { alignItems: 'center', marginTop: 120 },
  logo: { color: colors.white, fontSize: 34, fontWeight: '900', letterSpacing: 4 },
  line: { color: colors.secondary, marginTop: 8, fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
});
