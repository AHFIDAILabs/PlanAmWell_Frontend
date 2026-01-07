import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { RFValue } from 'react-native-responsive-fontsize';

type Role = 'User' | 'Doctor';

interface RegisterFormData {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  gender: string;
  dateOfBirth: string;
  homeAddress: string;
  city: string;
  state: string;
  lga: string;
  specialization: string;
  licenseNumber: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const RegisterScreen = ({ navigation }: { navigation: any }) => {
  const { handleRegister, handleLogin, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Role>('User');
  const [showPassword, setShowPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [doctorImageUri, setDoctorImageUri] = useState<string | undefined>(undefined);

  const [formData, setFormData] = useState<RegisterFormData>({
    name: '', firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '',
    gender: '', dateOfBirth: '', homeAddress: '', city: '', state: '', lga: '',
    specialization: '', licenseNumber: '',
  });

  const [loading, setLoading] = useState(false);
  const isLoading = loading || authLoading;

  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (role === 'User') {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      if (fullName) setFormData(prev => ({ ...prev, name: fullName }));
    } else if (formData.name && (!formData.firstName || !formData.lastName)) {
      const parts = formData.name.split(' ');
      setFormData(prev => ({
        ...prev,
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || ''
      }));
    }
  }, [role, formData.name, formData.firstName, formData.lastName]);

  const handleConfirmDate = (date: Date) => {
    handleInputChange('dateOfBirth', date.toISOString().split('T')[0]);
    setShowDatePicker(false);
  };

  const handleGenderSelect = () => {
    Alert.alert(
      "Select Gender", "Choose your gender:",
      [
        { text: "Male", onPress: () => handleInputChange('gender', 'male') },
        { text: "Female", onPress: () => handleInputChange('gender', 'female') },
        { text: "Other", onPress: () => handleInputChange('gender', 'other') },
      ]
    );
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant access to your photo library to upload a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) setDoctorImageUri(result.assets[0].uri);
  };

  const validateForm = () => {
    const requiredFields: (keyof RegisterFormData)[] = [
      'email', 'phone', 'password', 'confirmPassword',
      'gender', 'dateOfBirth', 'homeAddress', 'city', 'state', 'lga'
    ];

    if (role === 'User') requiredFields.push('name');
    else requiredFields.push('firstName', 'lastName', 'specialization', 'licenseNumber');

    for (const field of requiredFields) {
      if (!formData[field]) {
        Toast.show({ type: 'error', text1: 'Missing Field', text2: `${field} is required for ${role} registration.` });
        return false;
      }
    }

    if (formData.password !== formData.confirmPassword) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Passwords do not match.' });
      return false;
    }

    if (role === 'Doctor' && !doctorImageUri) {
      Toast.show({ type: 'error', text1: 'Missing Image', text2: 'Doctor registration requires a profile image.' });
      return false;
    }

    return true;
  };

  const handleRegisterPress = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const commonPayload = { 
        email: formData.email, phone: formData.phone, firstName: formData.firstName, lastName: formData.lastName,
        gender: formData.gender, password: formData.password, confirmPassword: formData.confirmPassword,
        dateOfBirth: formData.dateOfBirth, homeAddress: formData.homeAddress, city: formData.city,
        state: formData.state, lga: formData.lga, specialization: formData.specialization, licenseNumber: formData.licenseNumber,
        name: formData.name
      };

      if (role === 'Doctor') {
        await handleRegister(commonPayload, 'Doctor', doctorImageUri);
        Toast.show({ type: 'info', text1: 'Pending Approval', text2: "Doctor account created! Please allow time for admin review." });
        navigation.navigate('Login' as never);
      } else {
        await handleRegister(commonPayload, 'User');
        await handleLogin({ email: formData.email, password: formData.password }, 'User');
        Toast.show({ type: 'success', text1: 'Success', text2: `Account created!` });
        navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' as never }] });
      }

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || `${role} Registration failed.`;
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={localStyles.safeArea}>
      {showDatePicker && (
        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="date"
          onConfirm={handleConfirmDate}
          onCancel={() => setShowDatePicker(false)}
        />
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={localStyles.safeArea}
      >
        <ScrollView
          contentContainerStyle={localStyles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={localStyles.container}>
            <View style={localStyles.logoContainer}>
              <Text style={localStyles.logoText}>Plan Am Well</Text>
              <Text style={localStyles.welcomeText}>Create your free account.</Text>
            </View>

            {/* Role switch */}
            <View style={localStyles.roleSwitchContainer}>
              {['User', 'Doctor'].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[localStyles.roleSwitchButton, role === r && localStyles.roleSwitchActive]}
                  onPress={() => setRole(r as Role)}
                  disabled={isLoading}
                >
                  <Text style={[localStyles.roleSwitchText, role === r && localStyles.roleSwitchTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name Fields */}
            <View style={localStyles.inputContainer}>
              <Feather name="user" size={RFValue(20)} style={localStyles.icon} />
              {role === 'User' ? (
                <TextInput
                  style={localStyles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#999"
                  value={formData.name}
                  onChangeText={t => handleInputChange('name', t)}
                  editable={!isLoading}
                />
              ) : (
                <>
                  <TextInput
                    style={[localStyles.input, { flex: 0.5 }]}
                    placeholder="First Name"
                    placeholderTextColor="#999"
                    value={formData.firstName}
                    onChangeText={t => handleInputChange('firstName', t)}
                    editable={!isLoading}
                  />
                  <TextInput
                    style={[localStyles.input, { flex: 0.5, marginLeft: 10 }]}
                    placeholder="Last Name"
                    placeholderTextColor="#999"
                    value={formData.lastName}
                    onChangeText={t => handleInputChange('lastName', t)}
                    editable={!isLoading}
                  />
                </>
              )}
            </View>

            {/* Email */}
            <View style={localStyles.inputContainer}>
              <Feather name="mail" size={RFValue(20)} style={localStyles.icon} />
              <TextInput
                style={localStyles.input}
                placeholder="Email Address"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={t => handleInputChange('email', t)}
                editable={!isLoading}
              />
            </View>

            {/* Phone */}
            <View style={localStyles.inputContainer}>
              <Feather name="phone" size={RFValue(20)} style={localStyles.icon} />
              <TextInput
                style={localStyles.input}
                placeholder="Phone Number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={t => handleInputChange('phone', t)}
                editable={!isLoading}
              />
            </View>

            {/* DoB & Gender */}
            <TouchableOpacity style={localStyles.inputContainer} onPress={() => setShowDatePicker(true)} disabled={isLoading}>
              <Feather name="calendar" size={RFValue(20)} style={localStyles.icon} />
              <Text style={[localStyles.input, { color: formData.dateOfBirth ? '#222' : '#999' }]}>
                {formData.dateOfBirth || "DoB (YYYY-MM-DD)"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={localStyles.inputContainer} onPress={handleGenderSelect} disabled={isLoading}>
              <Feather name="users" size={RFValue(20)} style={localStyles.icon} />
              <Text style={[localStyles.input, { color: formData.gender ? '#222' : '#999' }]}>
                {formData.gender || "Gender (Male/Female/Other)"}
              </Text>
              <Feather name="chevron-down" size={RFValue(20)} style={localStyles.icon} />
            </TouchableOpacity>

            {/* Address */}
            {['homeAddress', 'city', 'state', 'lga'].map(field => (
              <View style={localStyles.inputContainer} key={field}>
                <Feather
                  name={field === 'homeAddress' ? 'home' : field === 'lga' ? 'map-pin' : 'map'}
                  size={RFValue(20)}
                  style={localStyles.icon}
                />
                <TextInput
                  style={localStyles.input}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  placeholderTextColor="#999"
                  value={formData[field as keyof RegisterFormData]}
                  onChangeText={t => handleInputChange(field as keyof RegisterFormData, t)}
                  editable={!isLoading}
                />
              </View>
            ))}

            {/* Doctor-specific fields */}
            {role === 'Doctor' && (
              <>
                {['specialization', 'licenseNumber'].map(field => (
                  <View style={localStyles.inputContainer} key={field}>
                    <Feather name={field === 'specialization' ? 'shield' : 'file-text'} size={RFValue(20)} style={localStyles.icon} />
                    <TextInput
                      style={localStyles.input}
                      placeholder={field === 'specialization' ? 'Specialization' : 'License Number'}
                      placeholderTextColor="#999"
                      value={formData[field as keyof RegisterFormData]}
                      onChangeText={t => handleInputChange(field as keyof RegisterFormData, t)}
                      editable={!isLoading}
                    />
                  </View>
                ))}

                <TouchableOpacity
                  style={[localStyles.button, { marginTop: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: doctorImageUri ? '#E0F2F1' : '#F5F5F5' }]}
                  onPress={handleImagePick}
                  disabled={isLoading}
                >
                  <Feather name={doctorImageUri ? "check-circle" : "camera"} size={RFValue(20)} color={doctorImageUri ? '#00796B' : '#D81E5B'} />
                  <Text style={[localStyles.buttonText, { color: doctorImageUri ? '#00796B' : '#D81E5B', marginLeft: 10 }]}>
                    {doctorImageUri ? "Profile Image Selected" : "Upload Profile Image (Required)"}
                  </Text>
                </TouchableOpacity>

                {doctorImageUri && (
                  <Image source={{ uri: doctorImageUri }} style={localStyles.previewImage} />
                )}
              </>
            )}

            {/* Password Fields */}
            {['password', 'confirmPassword'].map(field => (
              <View style={localStyles.inputContainer} key={field}>
                <Feather name="lock" size={RFValue(20)} style={localStyles.icon} />
                <TextInput
                  style={localStyles.input}
                  placeholder={field === 'password' ? 'Password' : 'Confirm Password'}
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  value={formData[field as keyof RegisterFormData]}
                  onChangeText={t => handleInputChange(field as keyof RegisterFormData, t)}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(p => !p)} disabled={isLoading}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={RFValue(20)} style={localStyles.icon} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={localStyles.button} onPress={handleRegisterPress} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={localStyles.buttonText}>Sign Up</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login' as never)} disabled={isLoading}>
              <Text style={localStyles.footerText}>
                {'Already have an account? '}
                <Text style={localStyles.footerLink}>Log In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: RFValue(20), minHeight: SCREEN_HEIGHT },
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
  footerText: { marginTop: RFValue(10), fontSize: RFValue(14), color: '#666' },
  footerLink: { color: '#2196F3', fontWeight: '600' },
  previewImage: {
    width: RFValue(100),
    height: RFValue(100),
    borderRadius: RFValue(50),
    alignSelf: 'center',
    marginBottom: RFValue(15),
  },
});

export default RegisterScreen;
