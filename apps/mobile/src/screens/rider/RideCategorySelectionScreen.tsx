import React, { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Button, RideCategoryCard, Screen, SectionHeader } from '../../components/rider';
import { RIDE_CATEGORY_LIST } from '../../constants/ride-categories';
import { MOCK_FARE } from '../../mock/rider';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'RideCategory'>;

export default function RideCategorySelectionScreen({ route, navigation }: Props) {
  const [selected, setSelected] = useState('STANDARD');
  return (
    <Screen>
      <SectionHeader title="Select ride" />
      {RIDE_CATEGORY_LIST.map((category) => (
        <RideCategoryCard
          key={category.id}
          category={category}
          selected={selected === category.id}
          estimate={Math.round(MOCK_FARE.total * category.basePriceMultiplier)}
          onPress={() => setSelected(category.id)}
        />
      ))}
      <Button
        title="Confirm selection"
        onPress={() => navigation.navigate('ConfirmRide', { fareQuoteId: route.params.fareQuoteId, rideCategory: selected })}
      />
    </Screen>
  );
}
