import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../../../constants/colors';
import { validatePayoutAmount } from '../../../utils/validation-driver';

type Props = {
  navigation: any;
};

export default function PayoutRequestScreen({ navigation }: Props) {
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const handleRequest = () => {
    if (!amount || !validatePayoutAmount(parseInt(amount))) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount (₦1,000 - ₦1,000,000)');
      return;
    }
    Alert.alert('Success', `Payout request of ₦${amount} submitted!`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Request Payout</Text>

      {/* Current Balance */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balance}>₦47,250</Text>
      </View>

      {/* Amount */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Amount (₦)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount"
          keyboardType="number-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <Text style={styles.helperText}>Minimum: ₦1,000 • Maximum: ₦1,000,000</Text>
      </View>

      {/* Bank Name */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Bank Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., First Bank"
          value={bankName}
          onChangeText={setBankName}
        />
      </View>

      {/* Account Number */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Account Number</Text>
        <TextInput
          style={styles.input}
          placeholder="10 digits"
          keyboardType="number-pad"
          maxLength={10}
          value={accountNumber}
          onChangeText={setAccountNumber}
        />
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          💡 Payouts are processed within 1-3 business days. You'll receive a notification when your payout is sent.
        </Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitButton} onPress={handleRequest}>
        <Text style={styles.submitButtonText}>Request Payout</Text>
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
  balanceCard: {
    backgroundColor: colors.success + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  balance: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.success,
  },
  formGroup: {
    marginBottom: 16,
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  helperText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
  },
  infoBox: {
    backgroundColor: colors.info + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  infoText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 32,
  },
  submitButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
