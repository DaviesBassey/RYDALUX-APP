import React from 'react';
import { Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Button, Card, ListItem, Screen, SectionHeader } from '../../components/rider';
import { getMockTrip } from '../../mock/rider';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'ShareTrip'>;

export default function ShareTripScreen({ route }: Props) {
  const trip = getMockTrip(route.params.tripId);
  return (
    <Screen>
      <SectionHeader title="Share trip" />
      <Card>
        <ListItem title="Driver" subtitle={trip.driver.name} />
        <ListItem title="Vehicle" subtitle={`${trip.vehicle.color} ${trip.vehicle.model}`} right={trip.vehicle.plate} />
        <ListItem title="Route" subtitle={`${trip.pickup.address} to ${trip.dropoff.address}`} />
        <ListItem title="Share link" subtitle="Secure live share placeholder" right="Ready" />
      </Card>
      <Button title="Share with trusted contacts" onPress={() => Alert.alert('Share placeholder', 'Live trip sharing will connect to the safety API.')} />
    </Screen>
  );
}
