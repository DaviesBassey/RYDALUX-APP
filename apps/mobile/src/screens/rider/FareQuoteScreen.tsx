import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Button, Card, FareBreakdownCard, ListItem, Screen, SectionHeader } from '../../components/rider';
import { colors } from '../../constants/colors';
import { MOCK_FARE } from '../../mock/rider';
import { formatDistance, formatDuration } from '../../utils/formatting';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'FareQuote'>;

export default function FareQuoteScreen({ route, navigation }: Props) {
  const { pickup, dropoff } = route.params;
  return (
    <Screen>
      <SectionHeader title="Fare quote" />
      <Card>
        <ListItem title="Pickup" subtitle={pickup.address} />
        <ListItem title="Dropoff" subtitle={dropoff.address} />
        <Text style={styles.meta}>{formatDistance(24300)} • {formatDuration(2380)}</Text>
      </Card>
      <FareBreakdownCard breakdown={MOCK_FARE} />
      <Button title="Choose ride category" onPress={() => navigation.navigate('RideCategory', { fareQuoteId: 'mock_fare_quote_21' })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { color: colors.gray700, fontSize: 14, fontWeight: '800', marginTop: 12 },
});
