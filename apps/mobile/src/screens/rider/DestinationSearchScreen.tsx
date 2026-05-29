import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Button, Card, Input, ListItem, Screen, SectionHeader } from '../../components/rider';
import { MOCK_DROPOFF, MOCK_PICKUP, MOCK_RECENT_LOCATIONS } from '../../mock/rider';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'DestinationSearch'>;

export default function DestinationSearchScreen({ navigation }: Props) {
  const [pickup, setPickup] = useState(MOCK_PICKUP.address);
  const [dropoff, setDropoff] = useState(MOCK_DROPOFF.address);

  return (
    <Screen>
      <SectionHeader title="Plan ride" />
      <Card>
        <Input label="Pickup" value={pickup} onChangeText={setPickup} />
        <Input label="Destination" value={dropoff} onChangeText={setDropoff} />
        <Button
          title="Continue"
          onPress={() => navigation.navigate('FareQuote', { pickup: MOCK_PICKUP, dropoff: { ...MOCK_DROPOFF, address: dropoff } })}
          disabled={!pickup.trim() || !dropoff.trim()}
        />
      </Card>
      <SectionHeader title="Recent locations" />
      <Card style={styles.card}>
        {MOCK_RECENT_LOCATIONS.map((location) => (
          <ListItem
            key={location.title}
            title={location.title}
            subtitle={location.address}
            onPress={() => setDropoff(location.address)}
          />
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 4 },
});
