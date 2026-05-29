import React from 'react';
import { Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Button, Card, ListItem, SafetyButton, Screen, SectionHeader } from '../../components/rider';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'SafetyCenter'>;

export default function SafetyCenterScreen({ navigation }: Props) {
  return (
    <Screen>
      <SectionHeader title="Safety center" />
      <SafetyButton title="Emergency SOS" onPress={() => Alert.alert('SOS placeholder', 'Live SOS dispatch will use verified location and trip context.')} />
      <Card style={{ marginTop: 14 }}>
        <ListItem title="Trusted contacts" subtitle="Manage people who can receive your ride details." onPress={() => navigation.navigate('TrustedContacts')} />
        <ListItem title="Share trip information" subtitle="Send route, driver, vehicle, and ETA details." onPress={() => navigation.navigate('ShareTrip', { tripId: 'trip_lagos_airport' })} />
        <ListItem title="Report an issue" subtitle="Create a safety or trip support ticket." onPress={() => navigation.navigate('CreateTicket', { tripId: 'trip_lagos_airport' })} />
      </Card>
      <SectionHeader title="Safety tips" />
      <Card>
        <ListItem title="Check your plate" subtitle="Confirm the plate and vehicle color before entering." />
        <ListItem title="Use your Trip PIN" subtitle="Only share your PIN with the assigned driver." />
        <ListItem title="Keep contacts updated" subtitle="Use trusted contacts for airport, night, and long-distance rides." />
      </Card>
      <Button title="Back to home" variant="secondary" onPress={() => navigation.navigate('Home')} />
    </Screen>
  );
}
