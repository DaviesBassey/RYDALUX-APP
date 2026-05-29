import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Avatar, Button, Card, FareBreakdownCard, ListItem, Screen, SectionHeader, StatusBadge } from '../../components/rider';
import { getMockTrip } from '../../mock/rider';
import { formatDateTime, formatDistance, formatDuration } from '../../utils/formatting';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'TripDetails'>;

export default function TripDetailsScreen({ route, navigation }: Props) {
  const trip = getMockTrip(route.params.tripId);
  return (
    <Screen>
      <SectionHeader title={trip.reference} />
      <StatusBadge label={trip.status} tone="success" />
      <Card style={{ marginTop: 12 }}>
        <ListItem title="Date" subtitle={formatDateTime(trip.date)} />
        <ListItem title="Route" subtitle={`${trip.pickup.address} to ${trip.dropoff.address}`} />
        <ListItem title="Distance and time" subtitle={`${formatDistance(trip.distanceMeters)} • ${formatDuration(trip.durationSeconds)}`} />
      </Card>
      <Card>
        <Avatar name={trip.driver.name} />
        <ListItem title="Driver" subtitle={`${trip.driver.name} • ${trip.driver.rating} rating`} />
        <ListItem title="Vehicle" subtitle={`${trip.vehicle.color} ${trip.vehicle.model}`} right={trip.vehicle.plate} />
        <ListItem title="Payment status" subtitle={`${trip.payment.brand} •••• ${trip.payment.last4}`} right={trip.payment.status} />
      </Card>
      <FareBreakdownCard breakdown={trip.fare} />
      <Button title="Open support ticket" onPress={() => navigation.navigate('CreateTicket', { tripId: trip.id })} />
    </Screen>
  );
}
