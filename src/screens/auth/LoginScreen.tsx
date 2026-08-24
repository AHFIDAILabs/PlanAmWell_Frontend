import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../hooks/useAuth';
import { RFValue } from 'react-native-responsive-fontsize';
import { FormField } from '../../components/common/FormField';
import { loginSchema, fieldErrors } from '../../validation/authSchemas';

type Role = 'User' | 'Doctor';

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const { handleLogin, loading: authLoading, completeOnboarding } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('User');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isLoading = loading || authLoading;

  const handleLoginPress = async () => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const loggedInUser = await handleLogin({ email, password }, role);

      if (loggedInUser) {
        completeOnboarding();
        Toast.show({ type: 'success', text1: 'Success', text2: `Logged in as ${role}!` });

        const parentNav = navigation.getParent();
        const isDoctor = 'specialization' in loggedInUser && 'licenseNumber' in loggedInUser;

        if (isDoctor && loggedInUser.status === 'approved') {
          parentNav?.reset({ index: 0, routes: [{ name: 'DoctorDashScreen' }] });
          return;
        }

        parentNav?.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
      }

      if (role === 'Doctor' && 'status' in loggedInUser) {
        const status = loggedInUser.status;
        if (status === 'reviewing' || status === 'submitted') {
          Alert.alert('Account Pending', 'Your doctor account is under review. You can browse the app while waiting.');
        } else if (status === 'rejected') {
          Alert.alert('Account Rejected', 'Your doctor account application was not approved. Please contact support.');
        }
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed.';
      Toast.show({ type: 'error', text1: 'Login Failed', text2: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.safeArea}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>Plan Am Well</Text>
              <Text style={styles.welcomeText}>Welcome! Sign in to continue.</Text>
            </View>

            <View style={styles.roleSwitchContainer}>
              {['User', 'Doctor'].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleSwitchButton, role === r && styles.roleSwitchActive]}
                  onPress={() => setRole(r as Role)}
                  disabled={isLoading}
                >
                  <Text style={[styles.roleSwitchText, role === r && styles.roleSwitchTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FormField
              icon="mail"
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
              error={errors.email}
            />

            <FormField
              icon="lock"
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
              error={errors.password}
              rightElement={
                <TouchableOpacity onPress={() => setShowPassword(p => !p)} disabled={isLoading}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={RFValue(20)} style={styles.icon} />
                </TouchableOpacity>
              }
            />

            <TouchableOpacity style={styles.button} onPress={handleLoginPress} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Continue</Text>}
            </TouchableOpacity>

            <Text style={styles.divider}>Not yet registered?</Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#4CAF50', marginTop: RFValue(10) }]}
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Create an Account</Text>
            </TouchableOpacity>
            
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: RFValue(20) },
  container: { alignItems: 'center', width: '100%' },
  logoContainer: { marginBottom: RFValue(30), alignItems: 'center' },
  logoText: { fontSize: RFValue(28), fontWeight: 'bold', color: '#D81E5B', textAlign: 'center' },
  welcomeText: { fontSize: RFValue(16), color: '#666', marginTop: RFValue(8), textAlign: 'center' },
  roleSwitchContainer: { flexDirection: 'row', marginBottom: RFValue(20) },
  roleSwitchButton: {
    flex: 1,
    paddingVertical: RFValue(10),
    marginHorizontal: RFValue(5),
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: RFValue(8),
    alignItems: 'center',
  },
  roleSwitchActive: { backgroundColor: '#D81E5B', borderColor: '#2196F3' },
  roleSwitchText: { fontSize: RFValue(16), color: '#666', fontWeight: '500' },
  roleSwitchTextActive: { color: '#fff', fontWeight: '600' },
  icon: { color: '#666' },
  button: {
    width: '100%',
    paddingVertical: RFValue(14),
    borderRadius: RFValue(8),
    backgroundColor: '#D81E5B',
    alignItems: 'center',
    marginTop: RFValue(10),
  },
  buttonText: { color: '#fff', fontSize: RFValue(16), fontWeight: '600' },
  divider: { marginTop: RFValue(20), fontSize: RFValue(14), color: '#999' },
});
