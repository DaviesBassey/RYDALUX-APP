import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Button, Card, ListItem, SafetyButton, Screen, SectionHeader } from '../../components/rider';
import { colors } from '../../constants/colors';
import { MOCK_PICKUP } from '../../mock/rider';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'Home'>;

export default function HomeMapScreen({ navigation }: Props) {
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>RYDALUX</Text>
          <Text style={styles.title}>Where to today?</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profile}>
          <Text style={styles.profileText}>RB</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.map}>
        <View style={styles.gridLine} />
        <View style={[styles.gridLine, styles.gridLineTwo]} />
        <View style={styles.routeLine} />
        <View style={styles.pickupPin} />
        <View style={styles.dropoffPin} />
        <Text style={styles.mapLabel}>Live map placeholder</Text>
      </View>

      <Card style={styles.sheet}>
        <SectionHeader title="Pickup" />
        <ListItem title={MOCK_PICKUP.title} subtitle={MOCK_PICKUP.address} />
        <TouchableOpacity style={styles.destination} onPress={() => navigation.navigate('DestinationSearch', { mode: 'dropoff' })}>
          <Text style={styles.destinationText}>Search destination</Text>
        </TouchableOpacity>
        <View style={styles.actions}>
          <View style={styles.cta}>
            <Button title="Ride now" onPress={() => navigation.navigate('DestinationSearch', { mode: 'dropoff' })} />
          </View>
          <View style={styles.sos}>
            <SafetyButton title="SOS" onPress={() => navigation.navigate('SafetyCenter')} />
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  kicker: { color: colors.secondary, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.gray900, fontSize: 28, fontWeight: '900', marginTop: 4 },
  profile: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.darkNavy, alignItems: 'center', justifyContent: 'center' },
  profileText: { color: colors.secondary, fontWeight: '900' },
  map: { height: 360, borderRadius: 8, backgroundColor: colors.gray900, overflow: 'hidden', marginBottom: 14 },
  gridLine: { position: 'absolute', width: 520, height: 1, backgroundColor: '#2a2a2a', top: 120, left: -60, transform: [{ rotate: '-18deg' }] },
  gridLineTwo: { top: 250, transform: [{ rotate: '24deg' }] },
  routeLine: { position: 'absolute', width: 4, height: 190, backgroundColor: colors.secondary, left: 170, top: 80, borderRadius: 2 },
  pickupPin: { position: 'absolute', left: 156, top: 70, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, borderWidth: 4, borderColor: colors.white },
  dropoffPin: { position: 'absolute', left: 156, top: 255, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.secondary, borderWidth: 4, borderColor: colors.white },
  mapLabel: { position: 'absolute', left: 16, bottom: 16, color: colors.gray300, fontSize: 12, fontWeight: '800' },
  sheet: { marginTop: -44 },
  destination: { backgroundColor: colors.gray100, borderRadius: 8, padding: 15, marginTop: 12 },
  destinationText: { color: colors.gray500, fontSize: 16, fontWeight: '700' },
  actions: { flexDirection: 'row', marginTop: 14 },
  cta: { flex: 1, marginRight: 10 },
  sos: { width: 82 },
});
