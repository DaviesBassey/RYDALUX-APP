import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ActiveTripScreen from '../screens/rider/ActiveTripScreen';
import ConfirmRideScreen from '../screens/rider/ConfirmRideScreen';
import CreateSupportTicketScreen from '../screens/rider/CreateSupportTicketScreen';
import DestinationSearchScreen from '../screens/rider/DestinationSearchScreen';
import DriverAssignedScreen from '../screens/rider/DriverAssignedScreen';
import FareQuoteScreen from '../screens/rider/FareQuoteScreen';
import HomeMapScreen from '../screens/rider/HomeMapScreen';
import PaymentMethodsScreen from '../screens/rider/PaymentMethodsScreen';
import ProfileScreen from '../screens/rider/ProfileScreen';
import RideCategorySelectionScreen from '../screens/rider/RideCategorySelectionScreen';
import SafetyCenterScreen from '../screens/rider/SafetyCenterScreen';
import SettingsScreen from '../screens/rider/SettingsScreen';
import ShareTripScreen from '../screens/rider/ShareTripScreen';
import SosScreen from '../screens/rider/SosScreen';
import SupportTicketsScreen from '../screens/rider/SupportTicketsScreen';
import TrustedContactsScreen from '../screens/rider/TrustedContactsScreen';
import TripCompletedScreen from '../screens/rider/TripCompletedScreen';
import TripDetailsScreen from '../screens/rider/TripDetailsScreen';
import TripHistoryScreen from '../screens/rider/TripHistoryScreen';

export type RiderLocationParam = {
  title: string;
  address: string;
  lat: number;
  lng: number;
};

// Parameter types for all screens
export type RiderNavigatorParamList = {
  Home: undefined;
  DestinationSearch: { mode: 'pickup' | 'dropoff' };
  FareQuote: { pickup: RiderLocationParam; dropoff: RiderLocationParam };
  RideCategory: { fareQuoteId: string };
  ConfirmRide: { fareQuoteId: string; rideCategory: string };
  PaymentMethods: undefined;
  TripHistory: undefined;
  TripDetails: { tripId: string };
  SafetyCenter: undefined;
  TrustedContacts: undefined;
  ShareTrip: { tripId: string };
  SupportTickets: undefined;
  CreateTicket: { tripId?: string } | undefined;
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
        <Stack.Screen name="Home" component={HomeMapScreen} />
        <Stack.Screen name="DestinationSearch" component={DestinationSearchScreen} />
        <Stack.Screen name="FareQuote" component={FareQuoteScreen} />
        <Stack.Screen name="RideCategory" component={RideCategorySelectionScreen} />
        <Stack.Screen name="ConfirmRide" component={ConfirmRideScreen} />
        <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />

        {/* Trips Tab */}
        <Stack.Screen name="TripHistory" component={TripHistoryScreen} />
        <Stack.Screen name="TripDetails" component={TripDetailsScreen} />

        {/* Safety Tab */}
        <Stack.Screen name="SafetyCenter" component={SafetyCenterScreen} />
        <Stack.Screen name="TrustedContacts" component={TrustedContactsScreen} />
        <Stack.Screen name="ShareTrip" component={ShareTripScreen} />

        {/* Support Tab */}
        <Stack.Screen name="SupportTickets" component={SupportTicketsScreen} />
        <Stack.Screen name="CreateTicket" component={CreateSupportTicketScreen} />

        {/* Profile Tab */}
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Group>

      {/* Modal screens that overlay */}
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen
          name="ActiveTrip"
          component={ActiveTripScreen}
        />
        <Stack.Screen name="TripCompleted" component={TripCompletedScreen} />
        <Stack.Screen name="DriverAssigned" component={DriverAssignedScreen} />
        <Stack.Screen name="SOS" component={SosScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
