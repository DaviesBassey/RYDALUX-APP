import React from 'react';
import { Text } from 'react-native';
import { Button, Card, ListItem, Screen, SectionHeader } from '../../components/rider';
import { colors } from '../../constants/colors';

export default function PaymentMethodsScreen() {
  return (
    <Screen>
      <SectionHeader title="Payment methods" />
      <Card>
        <ListItem title="Visa" subtitle="Saved card placeholder from Paystack tokenization" right="•••• 4242" />
        <ListItem title="Mastercard" subtitle="Brand and last4 only. No raw card data stored." right="•••• 1188" />
      </Card>
      <Button title="Add card with Paystack" onPress={() => {}} />
      <Text style={{ color: colors.gray500, fontSize: 13, lineHeight: 19, marginTop: 12 }}>
        Card entry will be handled by Paystack. RYDALUX only stores safe payment references, brand, and last4 display data.
      </Text>
    </Screen>
  );
}
