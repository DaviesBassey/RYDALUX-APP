import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import existing driver screens
import DriverHomeScreen from '../screens/driver/DriverHomeScreen';
import DriverActiveTripScreen from '../screens/driver/DriverActiveTripScreen';
import DriverActiveShipmentScreen from '../screens/driver/DriverActiveShipmentScreen';

// Import new driver screens - Auth
import DriverSplashScreen from '../screens/driver/auth/DriverSplashScreen';

// Import new driver screens - Documents
import DocumentsUploadScreen from '../screens/driver/documents/DocumentsUploadScreen';
import DocumentsReviewScreen from '../screens/driver/documents/DocumentsReviewScreen';
import DocumentsUploadDetailScreen from '../screens/driver/documents/DocumentsUploadDetailScreen';

// Import new driver screens - Vehicle
import VehicleSetupScreen from '../screens/driver/vehicle/VehicleSetupScreen';

// Import new driver screens - Dashboard
import DriverDashboardScreen from '../screens/driver/dashboard/DriverDashboardScreen';

// Import new driver screens - Trips
import TripRequestScreen from '../screens/driver/trips/TripRequestScreen';
import TripNavigationScreen from '../screens/driver/trips/TripNavigationScreen';
import TripArrivedScreen from '../screens/driver/trips/TripArrivedScreen';
import TripPinVerificationScreen from '../screens/driver/trips/TripPinVerificationScreen';
import TripCompletedScreen from '../screens/driver/trips/TripCompletedScreen';

// Import new driver screens - Earnings
import EarningsOverviewScreen from '../screens/driver/earnings/EarningsOverviewScreen';
import EarningsDetailsScreen from '../screens/driver/earnings/EarningsDetailsScreen';
import EarningsCalendarScreen from '../screens/driver/earnings/EarningsCalendarScreen';

// Import new driver screens - Payouts
import PayoutHistoryScreen from '../screens/driver/payouts/PayoutHistoryScreen';
import PayoutDetailsScreen from '../screens/driver/payouts/PayoutDetailsScreen';
import PayoutRequestScreen from '../screens/driver/payouts/PayoutRequestScreen';

// Import new driver screens - Safety & Support
import SosScreen from '../screens/driver/safety/SosScreen';
import RideDetailsScreen from '../screens/driver/safety/RideDetailsScreen';
import SupportTicketsScreen from '../screens/driver/support/SupportTicketsScreen';
import CreateSupportTicketScreen from '../screens/driver/support/CreateSupportTicketScreen';
import TicketDetailsScreen from '../screens/driver/support/TicketDetailsScreen';

// Import new driver screens - Profile
import DriverProfileScreen from '../screens/driver/profile/DriverProfileScreen';
import DriverSettingsScreen from '../screens/driver/profile/DriverSettingsScreen';

// Location type for navigation params
export type DriverLocationParam = {
  title: string;
  address: string;
  lat: number;
  lng: number;
};

// Comprehensive param list for all 26+ driver screens
export type DriverStackParamList = {
  // Auth/Onboarding
  DriverSplashScreen: undefined;
  DriverHome: undefined;

  // Documents
  DocumentsUploadScreen: undefined;
  DocumentsReviewScreen: undefined;
  DocumentsUploadDetail: { documentId: string };

  // Vehicle Setup
  VehicleSetupScreen: undefined;

  // Dashboard
  DriverDashboardScreen: undefined;

  // Trip Lifecycle
  TripRequestScreen: { tripId?: string };
  TripNavigation: { tripId: string };
  TripArrived: { tripId: string };
  TripPinVerification: { tripId: string };
  TripActive: { tripId: string };
  TripCompletedScreen: { tripId: string };

  // Earnings
  EarningsOverviewScreen: undefined;
  EarningsDetailsScreen: { date?: string };
  EarningsCalendarScreen: undefined;

  // Payouts
  PayoutHistoryScreen: undefined;
  PayoutDetailsScreen: { payoutId: string };
  PayoutRequestScreen: undefined;

  // Safety & Support
  SosScreen: undefined;
  RideDetailsScreen: { tripId?: string };
  SupportTicketsScreen: undefined;
  CreateSupportTicketScreen: undefined;
  TicketDetailsScreen: { ticketId: string };

  // Profile
  DriverProfileScreen: undefined;
  DriverSettingsScreen: undefined;

  // Existing screens
  DriverActiveTrip: { tripId?: string } | undefined;
  DriverActiveShipment: { shipmentId?: string } | undefined;
};

const Stack = createNativeStackNavigator<DriverStackParamList>();

export default function DriverNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Group>
        {/* Auth/Onboarding */}
        <Stack.Screen name="DriverSplashScreen" component={DriverSplashScreen} />
        <Stack.Screen name="DriverHome" component={DriverHomeScreen} />

        {/* Documents */}
        <Stack.Screen name="DocumentsUploadScreen" component={DocumentsUploadScreen} />
        <Stack.Screen name="DocumentsReviewScreen" component={DocumentsReviewScreen} />
        <Stack.Screen name="DocumentsUploadDetail" component={DocumentsUploadDetailScreen} />

        {/* Vehicle */}
        <Stack.Screen name="VehicleSetupScreen" component={VehicleSetupScreen} />

        {/* Dashboard */}
        <Stack.Screen name="DriverDashboardScreen" component={DriverDashboardScreen} />

        {/* Trip Lifecycle */}
        <Stack.Screen name="TripRequestScreen" component={TripRequestScreen} />
        <Stack.Screen name="TripNavigation" component={TripNavigationScreen} />
        <Stack.Screen name="TripArrived" component={TripArrivedScreen} />
        <Stack.Screen name="TripPinVerification" component={TripPinVerificationScreen} />
        <Stack.Screen name="TripActive" component={TripCompletedScreen} />
        <Stack.Screen name="TripCompletedScreen" component={TripCompletedScreen} />

        {/* Earnings */}
        <Stack.Screen name="EarningsOverviewScreen" component={EarningsOverviewScreen} />
        <Stack.Screen name="EarningsDetailsScreen" component={EarningsDetailsScreen} />
        <Stack.Screen name="EarningsCalendarScreen" component={EarningsCalendarScreen} />

        {/* Payouts */}
        <Stack.Screen name="PayoutHistoryScreen" component={PayoutHistoryScreen} />
        <Stack.Screen name="PayoutDetailsScreen" component={PayoutDetailsScreen} />
        <Stack.Screen name="PayoutRequestScreen" component={PayoutRequestScreen} />

        {/* Safety & Support */}
        <Stack.Screen name="SosScreen" component={SosScreen} />
        <Stack.Screen name="RideDetailsScreen" component={RideDetailsScreen} />
        <Stack.Screen name="SupportTicketsScreen" component={SupportTicketsScreen} />
        <Stack.Screen name="CreateSupportTicketScreen" component={CreateSupportTicketScreen} />
        <Stack.Screen name="TicketDetailsScreen" component={TicketDetailsScreen} />

        {/* Profile */}
        <Stack.Screen name="DriverProfileScreen" component={DriverProfileScreen} />
        <Stack.Screen name="DriverSettingsScreen" component={DriverSettingsScreen} />

        {/* Existing Screens */}
        <Stack.Screen name="DriverActiveTrip" component={DriverActiveTripScreen} />
        <Stack.Screen name="DriverActiveShipment" component={DriverActiveShipmentScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
