import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PhoneScreen from '../screens/auth/PhoneScreen';
import OtpScreen from '../screens/auth/OtpScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import DriverSetupScreen from '../screens/driver/DriverSetupScreen';

export type AuthStackParamList = {
  Phone: undefined;
  Otp: { phone: string; devCode?: string; intent: 'RIDER' | 'DRIVER' };
  ProfileSetup: { phone: string };
  DriverSetup: { phone: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Phone" component={PhoneScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="DriverSetup" component={DriverSetupScreen} />
    </Stack.Navigator>
  );
}
