import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { AuthStyles } from '../../styles/AuthStyles'; 

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
    // Immediately mark onboarding as complete in state
    completeOnboarding(); // updates both SecureStore and hook state

    Toast.show({ type: 'success', text1: 'Success', text2: `Logged in as ${role}!` });

    const parentNav = navigation.getParent();

    const isDoctor = 'specialization' in loggedInUser && 'licenseNumber' in loggedInUser;

    if (isDoctor && loggedInUser.status === 'approved') {
        parentNav?.reset({ index: 0, routes: [{ name: 'DoctorDashScreen' }] });
        return;
    }

    // Default: regular user or non-approved doctor
    parentNav?.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
}

      // Optional: show doctor-specific alerts
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
    <SafeAreaView style={AuthStyles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={AuthStyles.safeArea}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View style={AuthStyles.container}>
            <View style={AuthStyles.logoContainer}>
              <Text style={AuthStyles.logoText}>Plan Am Well</Text>
              <Text style={AuthStyles.welcomeText}>Welcome! Sign in to continue.</Text>
            </View>

     
            <View style={AuthStyles.roleSwitchContainer}>
              {['User', 'Doctor'].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[AuthStyles.roleSwitchButton, role === r && AuthStyles.roleSwitchActive]}
                  onPress={() => setRole(r as Role)}
                  disabled={isLoading}
                >
                  <Text style={[AuthStyles.roleSwitchText, role === r && AuthStyles.roleSwitchTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

      
            <View style={AuthStyles.inputContainer}>
              <Feather name="mail" size={20} style={AuthStyles.icon} />
              <TextInput
                style={AuthStyles.input}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!isLoading}
              />
            </View>

           
            <View style={AuthStyles.inputContainer}>
              <Feather name="lock" size={20} style={AuthStyles.icon} />
              <TextInput
                style={AuthStyles.input}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowPassword(p => !p)} disabled={isLoading}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} style={AuthStyles.icon} />
              </TouchableOpacity>
            </View>

           
            <TouchableOpacity style={AuthStyles.button} onPress={handleLoginPress} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={AuthStyles.buttonText}>Continue</Text>}
            </TouchableOpacity>

            
            <Text style={AuthStyles.divider}>or continue with</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;


