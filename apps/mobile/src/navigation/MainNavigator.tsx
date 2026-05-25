import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/main/HomeScreen';
import ActiveTripScreen from '../screens/main/ActiveTripScreen';
import ActiveShipmentScreen from '../screens/main/ActiveShipmentScreen';

export type MainStackParamList = {
  Home: undefined;
  ActiveTrip: { tripId: string };
  ActiveShipment: { shipmentId: string };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
      <Stack.Screen name="ActiveShipment" component={ActiveShipmentScreen} />
    </Stack.Navigator>
  );
}
