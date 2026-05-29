import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { colors } from '../../../constants/colors';

type Props = {
  navigation: any;
};

export default function VehicleSetupScreen({ navigation }: Props) {
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    color: '',
    registrationNumber: '',
    vin: '',
  });

  const handleSave = () => {
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Vehicle Information</Text>

      <Text style={styles.label}>Vehicle Make</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Toyota"
        value={formData.make}
        onChangeText={(text) => setFormData({ ...formData, make: text })}
      />

      <Text style={styles.label}>Vehicle Model</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Camry"
        value={formData.model}
        onChangeText={(text) => setFormData({ ...formData, model: text })}
      />

      <Text style={styles.label}>Year</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 2020"
        keyboardType="numeric"
        value={formData.year}
        onChangeText={(text) => setFormData({ ...formData, year: text })}
      />

      <Text style={styles.label}>Color</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Silver"
        value={formData.color}
        onChangeText={(text) => setFormData({ ...formData, color: text })}
      />

      <Text style={styles.label}>Registration Number</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., ABC 123XY"
        value={formData.registrationNumber}
        onChangeText={(text) => setFormData({ ...formData, registrationNumber: text })}
      />

      <Text style={styles.label}>VIN (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Vehicle Identification Number"
        value={formData.vin}
        onChangeText={(text) => setFormData({ ...formData, vin: text })}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Vehicle</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 24,
    marginBottom: 32,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
