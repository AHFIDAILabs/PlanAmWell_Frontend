import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
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

type Role = 'User' | 'Doctor';

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const { handleLogin, loading: authLoading, completeOnboarding } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('User');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isLoading = loading || authLoading;

  const handleLoginPress = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter both email and password.' });
      return;
    }

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

            <View style={styles.inputContainer}>
              <Feather name="mail" size={RFValue(20)} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Feather name="lock" size={RFValue(20)} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowPassword(p => !p)} disabled={isLoading}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={RFValue(20)} style={styles.icon} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleLoginPress} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Continue</Text>}
            </TouchableOpacity>

            <Text style={styles.divider}>or continue with</Text>
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
  logoText: { fontSize: RFValue(28), fontWeight: 'bold', color: '#2196F3', textAlign: 'center' },
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
  roleSwitchActive: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  roleSwitchText: { fontSize: RFValue(16), color: '#666', fontWeight: '500' },
  roleSwitchTextActive: { color: '#fff', fontWeight: '600' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: RFValue(8),
    paddingHorizontal: RFValue(10),
    paddingVertical: Platform.OS === 'ios' ? RFValue(12) : RFValue(8),
    marginBottom: RFValue(15),
  },
  input: {
    flex: 1,
    fontSize: RFValue(16),
    color: '#000',
    lineHeight: RFValue(20),
    paddingVertical: 0,
    marginLeft: RFValue(10),
  },
  icon: { color: '#666' },
  button: {
    width: '100%',
    paddingVertical: RFValue(14),
    borderRadius: RFValue(8),
    backgroundColor: '#2196F3',
    alignItems: 'center',
    marginTop: RFValue(10),
  },
  buttonText: { color: '#fff', fontSize: RFValue(16), fontWeight: '600' },
  divider: { marginTop: RFValue(20), fontSize: RFValue(14), color: '#999' },
});
