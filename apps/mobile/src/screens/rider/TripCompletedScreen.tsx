import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderNavigatorParamList } from '../../navigation/RiderNavigator';
import { Button, FareBreakdownCard, Screen, SectionHeader } from '../../components/rider';
import { colors } from '../../constants/colors';
import { getMockTrip } from '../../mock/rider';

type Props = NativeStackScreenProps<RiderNavigatorParamList, 'TripCompleted'>;

export default function TripCompletedScreen({ route, navigation }: Props) {
  const trip = getMockTrip(route.params.tripId);
  const [rating, setRating] = useState(5);
  return (
    <Screen>
      <SectionHeader title="Trip completed" />
      <FareBreakdownCard breakdown={trip.fare} />
      <Text style={styles.label}>Rate your driver</Text>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((value) => (
          <TouchableOpacity key={value} onPress={() => setRating(value)} style={[styles.rate, rating >= value && styles.rateActive]}>
            <Text style={[styles.rateText, rating >= value && styles.rateTextActive]}>{value}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Button title="Add tip later" variant="secondary" onPress={() => {}} />
      <Button title="Need support?" variant="ghost" onPress={() => navigation.navigate('CreateTicket', { tripId: trip.id })} />
      <Button title="Done" onPress={() => navigation.navigate('Home')} style={styles.done} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.gray900, fontSize: 16, fontWeight: '900', marginTop: 10, marginBottom: 12 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  rate: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.gray200, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  rateActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  rateText: { color: colors.gray500, fontWeight: '900' },
  rateTextActive: { color: colors.darkNavy },
  done: { marginTop: 12 },
});
