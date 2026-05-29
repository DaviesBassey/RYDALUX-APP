import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Button, Card, FareBreakdownCard, ListItem, Screen, SectionHeader } from '../../components/rider';
import { RIDE_CATEGORIES } from '../../constants/ride-categories';
import { MOCK_DROPOFF, MOCK_FARE, MOCK_PICKUP } from '../../mock/rider';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'ConfirmRide'>;

export default function ConfirmRideScreen({ route, navigation }: Props) {
  const category = RIDE_CATEGORIES[route.params.rideCategory] ?? RIDE_CATEGORIES.STANDARD;
  return (
    <Screen>
      <SectionHeader title="Confirm ride" />
      <Card>
        <ListItem title="Ride category" subtitle={category.description} right={category.displayName} />
        <ListItem title="Payment method" subtitle="Paystack card placeholder" right="Visa •••• 4242" />
        <ListItem title="Pickup" subtitle={MOCK_PICKUP.address} />
        <ListItem title="Dropoff" subtitle={MOCK_DROPOFF.address} />
      </Card>
      <FareBreakdownCard breakdown={{ ...MOCK_FARE, total: Math.round(MOCK_FARE.total * category.basePriceMultiplier) }} />
      <Button title="Request ride" onPress={() => navigation.navigate('DriverAssigned', { tripId: 'trip_lagos_airport' })} />
    </Screen>
  );
}
