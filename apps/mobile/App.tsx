import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import DriverNavigator from './src/navigation/DriverNavigator';
import { getTokens } from './src/store/authStore';
import { useEffect, useState } from 'react';
import SplashScreen from './src/screens/auth/SplashScreen';

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();
  const [userType, setUserType] = useState<'RIDER' | 'DRIVER' | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Get userType from stored tokens for routing
  useEffect(() => {
    getTokens().then(({ userType: ut }) => {
      setUserType(ut ?? null);
      setInitializing(false);
    });
  }, []);

  if (isLoading || initializing) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : userType === 'DRIVER' ? (
        <DriverNavigator />
      ) : (
        <MainNavigator />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
