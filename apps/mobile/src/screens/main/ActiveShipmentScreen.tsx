import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Shipment functionality is out of scope for Section 21 (Rider App Foundation)
// This screen is a placeholder. Full shipment support coming in a future section.
export default function ActiveShipmentScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Shipment Feature</Text>
        <Text style={styles.message}>Shipment tracking coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1eb' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  message: { fontSize: 14, color: '#999' },
});
