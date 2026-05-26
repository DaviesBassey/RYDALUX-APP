import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { verifyOtp } from '../../api/auth';
import { getRiderProfile } from '../../api/rider';
import { getOnboardingStatus } from '../../api/driver';
import { saveTokens } from '../../store/authStore';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;
type Nav = NativeStackNavigationProp<AuthStackParamList, 'Otp'>;

export default function OtpScreen({ route }: Props) {
  const { phone, devCode, intent } = route.params;
  const navigation = useNavigation<Nav>();
  const { login } = useAuth();

  const [code, setCode] = useState(devCode ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (devCode) setCode(devCode);
  }, [devCode]);

  async function handleVerify() {
    if (!code.trim() || !/^[0-9]{4,6}$/.test(code.trim())) {
      setError('Enter the 4–6 digit code sent to your phone.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const tokens = await verifyOtp(phone, code.trim(), intent);
      await saveTokens({ ...tokens, userType: tokens.userType });

      if (intent === 'DRIVER') {
        try {
          const status = await getOnboardingStatus();
          if (status.profileExists) {
            login();
          } else {
            navigation.navigate('DriverSetup', { phone });
          }
        } catch {
          navigation.navigate('DriverSetup', { phone });
        }
      } else {
        try {
          const profile = await getRiderProfile();
          if (profile.riderProfile) {
            login();
          } else {
            navigation.navigate('ProfileSetup', { phone });
          }
        } catch {
          navigation.navigate('ProfileSetup', { phone });
        }
      }
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.brandBlock}>
            <Image
              source={require('../../../assets/brand/rydalux-logo-black.png')}
              style={styles.brandLogo}
            />
          </View>

          <Text style={styles.heading}>Enter your code</Text>
          <Text style={styles.sub}>
            Code sent to <Text style={styles.phone}>{phone}</Text>
          </Text>

          {devCode ? (
            <View style={styles.devBanner}>
              <Text style={styles.devText}>Dev mode — code auto-filled: {devCode}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="123456"
            placeholderTextColor="#aaa"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            onSubmitEditing={handleVerify}
            returnKeyType="done"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleVerify} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1eb' },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: 28 },
  backBtn: { position: 'absolute', top: 16, left: 28 },
  backText: { color: '#1a1a2e', fontSize: 15, fontWeight: '600' },
  brandBlock: { marginBottom: 32, alignItems: 'center' },
  brandLogo: { width: 140, height: 40, resizeMode: 'contain' },
  heading: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  sub: { fontSize: 14, color: '#6b5d45', marginBottom: 20, lineHeight: 20 },
  phone: { fontWeight: '700', color: '#1a1a2e' },
  devBanner: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  devText: { fontSize: 12, color: '#856404' },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  error: { color: '#b42318', fontSize: 13, marginBottom: 12 },
  btn: { backgroundColor: '#111111', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
