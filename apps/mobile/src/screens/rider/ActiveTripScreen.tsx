import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Avatar, Button, Card, ListItem, SafetyButton, Screen, SectionHeader, StatusBadge } from '../../components/rider';
import { colors } from '../../constants/colors';
import { getMockTrip } from '../../mock/rider';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'ActiveTrip'>;

export default function ActiveTripScreen({ route, navigation }: Props) {
  const trip = getMockTrip(route.params.tripId);
  return (
    <Screen>
      <View style={styles.map}>
        <View style={styles.routeLine} />
        <Text style={styles.mapText}>Route map placeholder</Text>
      </View>
      <SectionHeader title="Active trip" />
      <StatusBadge label="IN_PROGRESS" tone="info" />
      <Card style={styles.driverCard}>
        <Avatar name={trip.driver.name} />
        <View style={styles.driverCopy}>
          <Text style={styles.name}>{trip.driver.name}</Text>
          <Text style={styles.meta}>{trip.vehicle.color} {trip.vehicle.model} • {trip.vehicle.plate}</Text>
        </View>
      </Card>
      <Card>
        <ListItem title="Pickup" subtitle={trip.pickup.address} />
        <ListItem title="Dropoff" subtitle={trip.dropoff.address} />
        <ListItem title="Trip PIN" subtitle="Visible until pickup verification." right={trip.pin} />
      </Card>
      <SafetyButton title="Emergency SOS" onPress={() => navigation.navigate('SOS', { tripId: trip.id })} />
      <Button title="Share trip" variant="secondary" onPress={() => navigation.navigate('ShareTrip', { tripId: trip.id })} style={styles.button} />
      <Button title="Support or report issue" variant="ghost" onPress={() => navigation.navigate('CreateTicket', { tripId: trip.id })} />
      <Button title="Complete demo trip" onPress={() => navigation.navigate('TripCompleted', { tripId: trip.id })} style={styles.button} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { height: 220, borderRadius: 8, backgroundColor: colors.gray900, marginBottom: 10, overflow: 'hidden' },
  routeLine: { position: 'absolute', width: 5, height: 180, borderRadius: 3, backgroundColor: colors.secondary, left: 155, top: 20, transform: [{ rotate: '28deg' }] },
  mapText: { position: 'absolute', left: 14, bottom: 14, color: colors.gray300, fontSize: 12, fontWeight: '800' },
  driverCard: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  driverCopy: { marginLeft: 12, flex: 1 },
  name: { color: colors.gray900, fontSize: 17, fontWeight: '900' },
  meta: { color: colors.gray500, marginTop: 3, fontSize: 13 },
  button: { marginTop: 12 },
});
