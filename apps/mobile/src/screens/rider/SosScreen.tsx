import React from 'react';
import { Alert, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Button, Card, SafetyButton, Screen, SectionHeader } from '../../components/rider';
import { colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'SOS'>;

export default function SosScreen({ route, navigation }: Props) {
  return (
    <Screen dark>
      <SectionHeader title="Emergency SOS" />
      <Card dark>
        <Text style={{ color: colors.white, fontSize: 18, fontWeight: '900', marginBottom: 8 }}>Safety team alert</Text>
        <Text style={{ color: colors.gray300, lineHeight: 21 }}>
          This placeholder will send current location, trip ID {route.params?.tripId ?? 'not attached'}, rider details, and live route context.
        </Text>
      </Card>
      <SafetyButton title="Send SOS now" onPress={() => Alert.alert('SOS sent', 'Placeholder alert sent to RYDALUX safety operations.')} />
      <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} style={{ marginTop: 14 }} />
    </Screen>
  );
}
