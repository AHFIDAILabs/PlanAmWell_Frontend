import React, { useState } from 'react';
import {
  View,
  Text,
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
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { RFValue } from 'react-native-responsive-fontsize';
import { FormField } from '../../components/common/FormField';
import { userRegisterSchema, doctorRegisterSchema, fieldErrors } from '../../validation/authSchemas';

type Role = 'User' | 'Doctor';

interface RegisterFormData {
  // Shared
  email: string;
  password: string;
  confirmPassword: string;
  // User only
  name: string;
  // Doctor only
  firstName: string;
  lastName: string;
  specialization: string;
  licenseNumber: string;
  // Doctor also needs phone for licensing purposes
  phone: string;
}

const INITIAL_FORM: RegisterFormData = {
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
  firstName: '',
  lastName: '',
  specialization: '',
  licenseNumber: '',
  phone: '',
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────

const RegisterScreen = ({ navigation }: { navigation: any }) => {
  const { handleRegister, handleLogin, loading: authLoading } = useAuth();

  const [role, setRole] = useState<Role>('User');
  const [showPassword, setShowPassword] = useState(false);
  const [doctorImageUri, setDoctorImageUri] = useState<string | undefined>();
  const [formData, setFormData] = useState<RegisterFormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const isLoading = loading || authLoading;

  const set = (field: keyof RegisterFormData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  // ── Image picker (Doctor only) ─────────────────────────────────────────────
  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant access to your photo library.');
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

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const schema = role === 'User' ? userRegisterSchema : doctorRegisterSchema;
    const result = schema.safeParse(formData);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      Toast.show({ type: 'error', text1: 'Please fix the highlighted fields' });
      return false;
    }
    setErrors({});

    if (role === 'Doctor' && !doctorImageUri) {
      Toast.show({ type: 'error', text1: 'Profile image required for doctors' });
      return false;
    }

    if (!agreedToTerms) {
      Toast.show({ type: 'error', text1: 'Please agree to the Terms of Service and Privacy Policy' });
      return false;
    }

    return true;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        // User
        name: formData.name.trim(),
        // Doctor
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        specialization: formData.specialization.trim(),
        licenseNumber: formData.licenseNumber.trim(),
        phone: formData.phone.trim(),
      };

      if (role === 'Doctor') {
        await handleRegister(payload, 'Doctor', doctorImageUri);
        Toast.show({
          type: 'info',
          text1: 'Pending Approval',
          text2: 'Doctor account created! Please allow time for admin review.',
        });
        navigation.navigate('Login' as never);
      } else {
        await handleRegister(payload, 'User');
        await handleLogin({ email: payload.email, password: payload.password }, 'User');
        Toast.show({ type: 'success', text1: 'Account created!' });
        navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' as never }] });
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Registration failed.';
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: msg });
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.safeArea}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.container}>

            {/* Header */}
            <View style={s.header}>
              <Text style={s.logo}>Plan Am Well</Text>
              <Text style={s.sub}>Create your free account</Text>
            </View>

            {/* Role switcher */}
            <View style={s.roleRow}>
              {(['User', 'Doctor'] as Role[]).map(r => (
                <TouchableOpacity
                  key={r}
                  style={[s.roleBtn, role === r && s.roleBtnActive]}
                  onPress={() => setRole(r)}
                  disabled={isLoading}
                >
                  <Text style={[s.roleTxt, role === r && s.roleTxtActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Name field(s) ── */}
            {role === 'User' ? (
              <FormField icon="user" placeholder="Full Name" value={formData.name}
                onChangeText={v => set('name', v)} editable={!isLoading} error={errors.name} />
            ) : (
              <View style={s.row}>
                <FormField icon="user" placeholder="First Name" value={formData.firstName}
                  onChangeText={v => set('firstName', v)} editable={!isLoading}
                  containerStyle={{ flex: 1, marginRight: 8 }} error={errors.firstName} />
                <FormField placeholder="Last Name" value={formData.lastName}
                  onChangeText={v => set('lastName', v)} editable={!isLoading}
                  containerStyle={{ flex: 1 }} error={errors.lastName} />
              </View>
            )}

            {/* ── Email ── */}
            <FormField icon="mail" placeholder="Email Address" value={formData.email}
              onChangeText={v => set('email', v)} editable={!isLoading}
              keyboardType="email-address" autoCapitalize="none" error={errors.email} />

            {/* ── Doctor-specific fields ── */}
            {role === 'Doctor' && (
              <>
                {/* Phone is required for doctors (licensing / contact) */}
                <FormField icon="phone" placeholder="Phone Number" value={formData.phone}
                  onChangeText={v => set('phone', v)} editable={!isLoading}
                  keyboardType="phone-pad" error={errors.phone} />

                <FormField icon="shield" placeholder="Specialization" value={formData.specialization}
                  onChangeText={v => set('specialization', v)} editable={!isLoading} error={errors.specialization} />
                <FormField icon="file-text" placeholder="License Number" value={formData.licenseNumber}
                  onChangeText={v => set('licenseNumber', v)} editable={!isLoading} error={errors.licenseNumber} />

                <TouchableOpacity
                  style={[s.imageBtn, doctorImageUri && s.imageBtnDone]}
                  onPress={handleImagePick}
                  disabled={isLoading}
                >
                  <Feather
                    name={doctorImageUri ? 'check-circle' : 'camera'}
                    size={RFValue(20)}
                    color={doctorImageUri ? '#00796B' : '#D81E5B'}
                  />
                  <Text style={[s.imageBtnTxt, doctorImageUri && { color: '#00796B' }]}>
                    {doctorImageUri ? 'Profile Image Selected' : 'Upload Profile Image (Required)'}
                  </Text>
                </TouchableOpacity>

                {doctorImageUri && (
                  <Image source={{ uri: doctorImageUri }} style={s.preview} />
                )}
              </>
            )}

            {/* ── Password ── */}
            <FormField
              icon="lock"
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={formData.password}
              onChangeText={v => set('password', v)}
              editable={!isLoading}
              error={errors.password}
              rightElement={
                <TouchableOpacity onPress={() => setShowPassword(p => !p)} disabled={isLoading}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={RFValue(20)} style={s.icon} />
                </TouchableOpacity>
              }
            />

            <FormField
              icon="lock"
              placeholder="Confirm Password"
              secureTextEntry={!showPassword}
              value={formData.confirmPassword}
              onChangeText={v => set('confirmPassword', v)}
              editable={!isLoading}
              error={errors.confirmPassword}
            />

            {/* ── Hint text ── */}
            {role === 'User' && (
              <Text style={s.hint}>
                📍 Your phone number, address, and other details can be added when you place your first order or book an appointment.
              </Text>
            )}

            {/* ── Terms & Privacy consent ── */}
            <TouchableOpacity
              style={s.consentRow}
              onPress={() => setAgreedToTerms(v => !v)}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <View style={[s.checkbox, agreedToTerms && s.checkboxChecked]}>
                {agreedToTerms && <Feather name="check" size={RFValue(13)} color="#fff" />}
              </View>
              <Text style={s.consentTxt}>
                I agree to the{' '}
                <Text style={s.consentLink} onPress={() => navigation.navigate('TermsOfServiceScreen' as never)}>
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text style={s.consentLink} onPress={() => navigation.navigate('PrivacyPolicyScreen' as never)}>
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            {/* ── Submit ── */}
            <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={isLoading}>
              {isLoading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={s.btnTxt}>Create Account</Text>}
            </TouchableOpacity>

            {/* ── Login link ── */}
            <TouchableOpacity onPress={() => navigation.navigate('Login' as never)} disabled={isLoading}>
              <Text style={s.footer}>
                Already have an account?{' '}
                <Text style={s.link}>Log In</Text>
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable field component
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: '#fff' },
  scroll:       { flexGrow: 1, justifyContent: 'center', padding: RFValue(20), minHeight: SCREEN_HEIGHT },
  container:    { alignItems: 'center', width: '100%' },

  header:       { marginBottom: RFValue(28), alignItems: 'center' },
  logo:         { fontSize: RFValue(28), fontWeight: 'bold', color: '#2196F3' },
  sub:          { fontSize: RFValue(15), color: '#666', marginTop: RFValue(6) },

  roleRow:      { flexDirection: 'row', marginBottom: RFValue(20) },
  roleBtn: {
    flex: 1, paddingVertical: RFValue(10), marginHorizontal: RFValue(5),
    borderWidth: 1, borderColor: '#ccc', borderRadius: RFValue(8), alignItems: 'center',
  },
  roleBtnActive: { backgroundColor: '#D81E5B', borderColor: '#D81E5B' },
  roleTxt:      { fontSize: RFValue(15), color: '#666', fontWeight: '500' },
  roleTxtActive: { color: '#fff', fontWeight: '700' },

  row:          { flexDirection: 'row', width: '100%' },

  icon:         { color: '#999' },

  imageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    width: '100%', paddingVertical: RFValue(13), borderRadius: RFValue(8),
    backgroundColor: '#F5F5F5', marginBottom: RFValue(14),
  },
  imageBtnDone: { backgroundColor: '#E0F2F1' },
  imageBtnTxt:  { fontSize: RFValue(14), color: '#D81E5B', marginLeft: RFValue(8), fontWeight: '500' },
  preview:      { width: RFValue(90), height: RFValue(90), borderRadius: RFValue(45), alignSelf: 'center', marginBottom: RFValue(14) },

  hint: {
    fontSize: RFValue(12), color: '#888', textAlign: 'center',
    marginBottom: RFValue(18), paddingHorizontal: RFValue(10), lineHeight: RFValue(18),
  },

  consentRow: {
    flexDirection: 'row', alignItems: 'flex-start', width: '100%',
    marginTop: RFValue(6), marginBottom: RFValue(14),
  },
  checkbox: {
    width: RFValue(20), height: RFValue(20), borderRadius: RFValue(4),
    borderWidth: 1.5, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center',
    marginRight: RFValue(10), marginTop: RFValue(2),
  },
  checkboxChecked: { backgroundColor: '#D81E5B', borderColor: '#D81E5B' },
  consentTxt: { flex: 1, fontSize: RFValue(13), color: '#666', lineHeight: RFValue(19) },
  consentLink: { color: '#2196F3', fontWeight: '600' },

  btn: {
    width: '100%', paddingVertical: RFValue(14), borderRadius: RFValue(8),
    backgroundColor: '#D81E5B', alignItems: 'center', marginTop: RFValue(4),
  },
  btnTxt:       { color: '#fff', fontSize: RFValue(16), fontWeight: '700' },

  footer:       { marginTop: RFValue(16), fontSize: RFValue(14), color: '#666' },
  link:         { color: '#2196F3', fontWeight: '600' },
});

export default RegisterScreen;