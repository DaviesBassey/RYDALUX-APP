import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';

// Home tab screens
import HomeScreen from '../screens/main/HomeScreen';
import ActiveTripScreen from '../screens/main/ActiveTripScreen';

// Placeholder component for screens not yet created
function PlaceholderScreen({ name }: { name: string }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 }}>{name}</Text>
      <Text style={{ fontSize: 14, color: '#999' }}>Coming soon</Text>
    </View>
  );
}

// Parameter types for all screens
export type RiderNavigatorParamList = {
  Home: undefined;
  DestinationSearch: { mode: 'pickup' | 'dropoff' };
  FareQuote: { pickup: { lat: number; lng: number }; dropoff: { lat: number; lng: number } };
  RideCategory: { fareQuoteId: string };
  ConfirmRide: { rideCategory: string; tripId: string };
  PaymentMethods: undefined;
  TripHistory: undefined;
  TripDetails: { tripId: string };
  SafetyCenter: undefined;
  TrustedContacts: undefined;
  ShareTrip: { tripId: string };
  SupportTickets: undefined;
  CreateTicket: undefined;
  Profile: undefined;
  Settings: undefined;
  ActiveTrip: { tripId: string };
  TripCompleted: { tripId: string };
  DriverAssigned: { tripId: string };
  SOS: { tripId?: string };
};

const Stack = createNativeStackNavigator<RiderNavigatorParamList>();

export default function RiderNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Group>
        {/* Home Tab */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="DestinationSearch"
          component={() => <PlaceholderScreen name="Destination Search" />}
        />
        <Stack.Screen
          name="FareQuote"
          component={() => <PlaceholderScreen name="Fare Quote" />}
        />
        <Stack.Screen
          name="RideCategory"
          component={() => <PlaceholderScreen name="Ride Category" />}
        />
        <Stack.Screen
          name="ConfirmRide"
          component={() => <PlaceholderScreen name="Confirm Ride" />}
        />
        <Stack.Screen
          name="PaymentMethods"
          component={() => <PlaceholderScreen name="Payment Methods" />}
        />

        {/* Trips Tab */}
        <Stack.Screen
          name="TripHistory"
          component={() => <PlaceholderScreen name="Trip History" />}
        />
        <Stack.Screen
          name="TripDetails"
          component={() => <PlaceholderScreen name="Trip Details" />}
        />

        {/* Safety Tab */}
        <Stack.Screen
          name="SafetyCenter"
          component={() => <PlaceholderScreen name="Safety Center" />}
        />
        <Stack.Screen
          name="TrustedContacts"
          component={() => <PlaceholderScreen name="Trusted Contacts" />}
        />
        <Stack.Screen
          name="ShareTrip"
          component={() => <PlaceholderScreen name="Share Trip" />}
        />

        {/* Support Tab */}
        <Stack.Screen
          name="SupportTickets"
          component={() => <PlaceholderScreen name="Support Tickets" />}
        />
        <Stack.Screen
          name="CreateTicket"
          component={() => <PlaceholderScreen name="Create Ticket" />}
        />

        {/* Profile Tab */}
        <Stack.Screen
          name="Profile"
          component={() => <PlaceholderScreen name="Profile" />}
        />
        <Stack.Screen
          name="Settings"
          component={() => <PlaceholderScreen name="Settings" />}
        />
      </Stack.Group>

      {/* Modal screens that overlay */}
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen
          name="ActiveTrip"
          component={ActiveTripScreen}
        />
        <Stack.Screen
          name="TripCompleted"
          component={() => <PlaceholderScreen name="Trip Completed" />}
        />
        <Stack.Screen
          name="DriverAssigned"
          component={() => <PlaceholderScreen name="Driver Assigned" />}
        />
        <Stack.Screen
          name="SOS"
          component={() => <PlaceholderScreen name="SOS" />}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}
