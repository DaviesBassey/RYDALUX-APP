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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createRiderProfile } from '../../api/rider';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'ProfileSetup'>;

export default function ProfileSetupScreen({ route }: Props) {
  const { phone } = route.params;
  const { login } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleContinue() {
    if (!firstName.trim()) { setError('First name is required.'); return; }
    if (!lastName.trim()) { setError('Last name is required.'); return; }
    setError('');
    setLoading(true);
    try {
      await createRiderProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone });
      login();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <Image
              source={require('../../../assets/brand/rydalux-logo-black.png')}
              style={styles.brandLogo}
            />
          </View>

          <Text style={styles.heading}>Set up your profile</Text>
          <Text style={styles.sub}>This only takes a moment.</Text>

          <Text style={styles.label}>First name</Text>
          <TextInput
            style={styles.input}
            placeholder="Jane"
            placeholderTextColor="#aaa"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoComplete="given-name"
          />

          <Text style={styles.label}>Last name</Text>
          <TextInput
            style={styles.input}
            placeholder="Doe"
            placeholderTextColor="#aaa"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            autoComplete="family-name"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput style={[styles.input, styles.inputDisabled]} value={phone} editable={false} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleContinue} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continue</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1eb' },
  flex: { flex: 1 },
  container: { padding: 28, paddingTop: 40 },
  brandBlock: { marginBottom: 32, alignItems: 'center' },
  brandLogo: { width: 140, height: 40, resizeMode: 'contain' },
  heading: { fontSize: 24, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  sub: { fontSize: 14, color: '#6b5d45', marginBottom: 28, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#1a1a2e', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1a1a2e',
    backgroundColor: '#fafafa',
  },
  inputDisabled: { color: '#999', backgroundColor: '#f0f0f0' },
  error: { color: '#b42318', fontSize: 13, marginTop: 12 },
  btn: { backgroundColor: '#111111', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
