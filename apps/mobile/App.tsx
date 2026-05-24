import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthContext } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import DriverNavigator from './src/navigation/DriverNavigator';
import { getTokens } from './src/store/authStore';

type AppState = 'loading' | 'auth' | 'rider' | 'driver';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    getTokens().then(({ accessToken, userType }) => {
      if (!accessToken) {
        setAppState('auth');
      } else if (userType === 'DRIVER') {
        setAppState('driver');
      } else {
        setAppState('rider');
      }
    });
  }, []);

  const login = useCallback(async () => {
    const { userType } = await getTokens();
    setAppState(userType === 'DRIVER' ? 'driver' : 'rider');
  }, []);

  const logout = useCallback(() => setAppState('auth'), []);

  if (appState === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthContext.Provider value={{ login, logout }}>
        <NavigationContainer>
          {appState === 'auth' ? (
            <AuthNavigator />
          ) : appState === 'driver' ? (
            <DriverNavigator />
          ) : (
            <MainNavigator />
          )}
        </NavigationContainer>
      </AuthContext.Provider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});
