import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Button, EmptyState, Screen, SectionHeader, TripCard } from '../../components/rider';
import { MOCK_TRIPS } from '../../mock/rider';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'TripHistory'>;

export default function TripHistoryScreen({ navigation }: Props) {
  const [showTrips, setShowTrips] = useState(true);
  return (
    <Screen>
      <SectionHeader title="Trip history" action="Filter" />
      <Button title={showTrips ? 'Show empty state' : 'Show previous trips'} variant="secondary" onPress={() => setShowTrips((value) => !value)} />
      {showTrips ? (
        <View style={{ marginTop: 14 }}>
          {MOCK_TRIPS.map((trip) => (
            <TripCard
              key={trip.id}
              pickup={trip.pickup.address}
              dropoff={trip.dropoff.address}
              date={trip.date}
              amount={trip.fare.total}
              distanceMeters={trip.distanceMeters}
              status={trip.status}
              onPress={() => navigation.navigate('TripDetails', { tripId: trip.id })}
            />
          ))}
        </View>
      ) : (
        <EmptyState title="No trips yet" message="Your completed RYDALUX rides will appear here." />
      )}
      <Text />
    </Screen>
  );
}
