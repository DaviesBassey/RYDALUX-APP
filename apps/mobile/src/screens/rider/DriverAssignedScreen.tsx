import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Avatar, Button, Card, ListItem, Screen, SectionHeader } from '../../components/rider';
import { colors } from '../../constants/colors';
import { getMockTrip } from '../../mock/rider';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'DriverAssigned'>;

export default function DriverAssignedScreen({ route, navigation }: Props) {
  const trip = getMockTrip(route.params.tripId);
  return (
    <Screen>
      <SectionHeader title="Driver assigned" />
      <Card>
        <View style={styles.driverRow}>
          <Avatar name={trip.driver.name} />
          <View style={styles.driverCopy}>
            <Text style={styles.name}>{trip.driver.name}</Text>
            <Text style={styles.rating}>{trip.driver.rating} rating • {trip.eta} away</Text>
          </View>
        </View>
        <ListItem title="Vehicle" subtitle={`${trip.vehicle.color} ${trip.vehicle.model}`} right={trip.vehicle.plate} />
        <ListItem title="Trip PIN" subtitle="Share with your driver before the ride starts." right={trip.pin} />
      </Card>
      <View style={styles.row}>
        <View style={styles.half}><Button title="Call" variant="secondary" onPress={() => {}} /></View>
        <View style={styles.half}><Button title="Message" variant="secondary" onPress={() => {}} /></View>
      </View>
      <Button title="Track active trip" onPress={() => navigation.navigate('ActiveTrip', { tripId: trip.id })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  driverCopy: { marginLeft: 12, flex: 1 },
  name: { color: colors.gray900, fontSize: 18, fontWeight: '900' },
  rating: { color: colors.gray500, marginTop: 3, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  half: { flex: 1 },
});
