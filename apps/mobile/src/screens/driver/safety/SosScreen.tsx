import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../../../constants/colors';

type Props = {
  navigation: any;
};

export default function SosScreen({ navigation }: Props) {
  const [sosActive, setSosActive] = useState(false);

  const handleActivateSos = () => {
    Alert.alert(
      'Confirm SOS Activation',
      'This will alert authorities and emergency contacts. Continue?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Activate SOS',
          onPress: () => {
            setSosActive(true);
            // In real app, this would trigger emergency services
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* SOS Button */}
      <View style={styles.sosButtonContainer}>
        <TouchableOpacity
          style={[styles.sosButton, sosActive && styles.sosButtonActive]}
          onPress={handleActivateSos}>
          <Text style={styles.sosIcon}>🚨</Text>
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
        {sosActive && <Text style={styles.activeIndicator}>● ACTIVE</Text>}
      </View>

      {/* Emergency Contacts */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Emergency Contacts</Text>
        <TouchableOpacity style={styles.contactItem}>
          <Text style={styles.contactIcon}>📞</Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>Police</Text>
            <Text style={styles.contactNumber}>999</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactItem}>
          <Text style={styles.contactIcon}>🏥</Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>Ambulance</Text>
            <Text style={styles.contactNumber}>911</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Safety Tips */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Safety Tips</Text>
        <Text style={styles.tipText}>• Keep doors locked when waiting for riders</Text>
        <Text style={styles.tipText}>• Share trip details with trusted contacts</Text>
        <Text style={styles.tipText}>• Verify rider identity before trip</Text>
        <Text style={styles.tipText}>• Report suspicious behavior to support</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  sosButtonContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  sosButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.error,
  },
  sosButtonActive: {
    backgroundColor: colors.error + '20',
  },
  sosIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  sosText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
  },
  activeIndicator: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.error,
    marginTop: 12,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  contactIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  contactNumber: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tipText: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 18,
  },
});
