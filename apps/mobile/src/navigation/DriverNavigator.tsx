import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DriverHomeScreen from '../screens/driver/DriverHomeScreen';
import DriverActiveTripScreen from '../screens/driver/DriverActiveTripScreen';

export type DriverStackParamList = {
  DriverHome: undefined;
  DriverActiveTrip: undefined;
};

const Stack = createNativeStackNavigator<DriverStackParamList>();

export default function DriverNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
      <Stack.Screen name="DriverActiveTrip" component={DriverActiveTripScreen} />
    </Stack.Navigator>
  );
}
