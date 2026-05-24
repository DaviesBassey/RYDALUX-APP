import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { requestOtp } from '../../api/auth';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Phone'>;

export default function PhoneScreen() {
  const navigation = useNavigation<Nav>();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSend() {
    const trimmed = phone.trim();
    if (!trimmed || !/^\+?[0-9]{8,15}$/.test(trimmed)) {
      setError('Enter a valid phone number (e.g. +2348012345678)');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await requestOtp(trimmed);
      navigation.navigate('Otp', { phone: trimmed, devCode: res.devCode });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.container}>
          <Text style={styles.brand}>Rydalux</Text>
          <Text style={styles.heading}>Enter your phone number</Text>
          <Text style={styles.sub}>We'll send a one-time code to verify your number.</Text>

          <TextInput
            style={styles.input}
            placeholder="+2348012345678"
            placeholderTextColor="#aaa"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phone}
            onChangeText={setPhone}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSend} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: 28 },
  brand: { fontSize: 32, fontWeight: '800', color: '#e94560', marginBottom: 32 },
  heading: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  sub: { fontSize: 14, color: '#666', marginBottom: 28, lineHeight: 20 },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1a1a2e',
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  error: { color: '#e94560', fontSize: 13, marginBottom: 12 },
  btn: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
