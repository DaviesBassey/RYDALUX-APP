import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { Button, Card, Screen } from '../../components/rider';
import { colors } from '../../constants/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  return (
    <Screen dark contentStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.logo}>RYDALUX</Text>
        <Text style={styles.title}>Executive rides with Lagos street intelligence.</Text>
        <Text style={styles.copy}>
          Book clean, verified rides with safety checks, trusted contacts, and responsive trip support built in.
        </Text>
      </View>
      <Card dark style={styles.card}>
        <Text style={styles.cardTitle}>Safety is part of the fare</Text>
        <Text style={styles.cardCopy}>Trip PINs, visible driver details, trusted contacts, and emergency support stay close during every ride.</Text>
      </Card>
      <Button title="Continue" variant="gold" onPress={() => navigation.navigate('Phone')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'flex-end', paddingBottom: 28 },
  hero: { marginBottom: 28 },
  logo: { color: colors.secondary, fontSize: 15, fontWeight: '900', letterSpacing: 3, marginBottom: 20 },
  title: { color: colors.white, fontSize: 34, lineHeight: 40, fontWeight: '900' },
  copy: { color: colors.gray300, fontSize: 16, lineHeight: 24, marginTop: 18 },
  card: { marginBottom: 16 },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: '900', marginBottom: 8 },
  cardCopy: { color: colors.gray300, fontSize: 14, lineHeight: 21 },
});
