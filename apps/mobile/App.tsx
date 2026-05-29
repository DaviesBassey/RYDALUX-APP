import 'react-native-gesture-handler';
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import DriverNavigator from './src/navigation/DriverNavigator';
import { getTokens } from './src/store/authStore';
import { useEffect, useState } from 'react';

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
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
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

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});
