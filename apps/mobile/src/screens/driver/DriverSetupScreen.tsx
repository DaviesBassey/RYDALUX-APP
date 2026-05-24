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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { submitDriverProfile } from '../../api/driver';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'DriverSetup'>;

export default function DriverSetupScreen({ route }: Props) {
  const { phone } = route.params;
  const { login } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await submitDriverProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone });
      login();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? 'Failed to save profile. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Driver Profile</Text>
          <Text style={styles.sub}>Tell us your name to get started.</Text>

          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="John"
            placeholderTextColor="#aaa"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Doe"
            placeholderTextColor="#aaa"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continue</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  heading: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  sub: { fontSize: 14, color: '#666', marginBottom: 28, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1a1a2e',
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  error: { color: '#e94560', fontSize: 13, marginBottom: 12 },
  btn: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
