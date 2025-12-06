import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Alert, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { AuthStyles } from '../../styles/AuthStyles'; 
import * as ImagePicker from 'expo-image-picker'; 

type Role = 'User' | 'Doctor';

// Define the comprehensive form data structure
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

const RegisterScreen = ({ navigation }: { navigation: any }) => {
    // Assuming useAuth provides a mechanism to update isAuthenticated
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

    // Helper to ensure name fields are linked if role is switched
    useEffect(() => {
        if (role === 'User') {
            const fullName = `${formData.firstName} ${formData.lastName}`.trim();
            if (fullName) {
                setFormData(prev => ({ ...prev, name: fullName }));
            }
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
        const formattedDate = date.toISOString().split('T')[0];
        handleInputChange('dateOfBirth', formattedDate);
        setShowDatePicker(false);
    };

    const handleGenderSelect = () => {
        Alert.alert(
            "Select Gender", "Choose your gender:",
            [
                { text: "Male", onPress: () => handleInputChange('gender', 'Male') },
                { text: "Female", onPress: () => handleInputChange('gender', 'Female') },
                { text: "Other", onPress: () => handleInputChange('gender', 'Other') },
            ]
        );
    };

    // --- Image Picker Function ---
    const handleImagePick = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please grant access to your photo library to upload a profile picture.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setDoctorImageUri(result.assets[0].uri);
        }
    };
    // ---


    const validateForm = () => {
        const requiredFields: (keyof RegisterFormData)[] = [
            'email', 'phone', 'password', 'confirmPassword',
            'gender', 'dateOfBirth', 'homeAddress', 'city', 'state', 'lga'
        ];
        
        if (role === 'User') {
             requiredFields.push('name');
        } else {
             requiredFields.push('firstName', 'lastName', 'specialization', 'licenseNumber');
        }

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

        // --- Doctor Image Validation ---
        if (role === 'Doctor' && !doctorImageUri) {
            Toast.show({ type: 'error', text1: 'Missing Image', text2: 'Doctor registration requires a profile image.' });
            return false;
        }
        // ---

        return true;
    };

    const handleRegisterPress = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const commonPayload = { 
                email: formData.email, phone: formData.phone, firstName: formData.firstName, lastName: formData.lastName,
                gender: formData.gender, password: formData.password, confirmPassword: formData.confirmPassword, 
                dateOfBirth: formData.dateOfBirth, homeAddress: formData.homeAddress, city: formData.city, specialization: formData.specialization, 
                state: formData.state, lga: formData.lga, licenseNumber: formData.licenseNumber, name: formData.name  
            };
            
            let finalPayload = { ...commonPayload };
            
            if (role === 'Doctor') {
                finalPayload = {
                    ...finalPayload,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    specialization: formData.specialization,
                    licenseNumber: formData.licenseNumber,
                };
                
                await handleRegister(finalPayload, 'Doctor', doctorImageUri);
                
                Toast.show({ type: 'info', text1: 'Pending Approval', text2: "Doctor account created! Please allow time for admin review." });
                
                // Doctors navigate back to Login to await approval
                navigation.navigate('Login' as never); 
            } else {
                // --- USER REGISTRATION & AUTO-LOGIN ---
                finalPayload = { ...finalPayload, name: formData.name };

                await handleRegister(finalPayload, 'User'); 
                
                // User auto-logs in after registration, updating `isAuthenticated` to true.
                await handleLogin({ email: formData.email, password: formData.password }, 'User');

                Toast.show({ type: 'success', text1: 'Success', text2: `Account created!` });
                
                // 🚀 FIX: Reset the stack to force AppNavigator to switch from AuthStack to HomeScreen.
                navigation.reset({
                    index: 0,
                    // 'HomeScreen' is a screen defined on the RootStack in AppNavigator, which is now accessible
                    // because AppNavigator sees isAuthenticated=true.
                    routes: [{ name: 'HomeScreen' as never }], 
                });
            }

        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || `${role} Registration failed.`;
            Toast.show({ type: 'error', text1: 'Registration Failed', text2: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={AuthStyles.safeArea}>
            
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
                style={AuthStyles.safeArea}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                    <View style={AuthStyles.container}>
                        <View style={AuthStyles.logoContainer}>
                            <Text style={AuthStyles.logoText}>Plan Am Well</Text>
                            <Text style={AuthStyles.welcomeText}>Create your free account.</Text>
                        </View>
                        
                        <View style={AuthStyles.roleSwitchContainer}>
                            <TouchableOpacity
                                style={[AuthStyles.roleSwitchButton, role === 'User' && AuthStyles.roleSwitchActive]}
                                onPress={() => setRole('User')}
                                disabled={isLoading}
                            >
                                <Text style={[AuthStyles.roleSwitchText, role === 'User' && AuthStyles.roleSwitchTextActive]}>User</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[AuthStyles.roleSwitchButton, role === 'Doctor' && AuthStyles.roleSwitchActive]}
                                onPress={() => setRole('Doctor')}
                                disabled={isLoading}
                            >
                                <Text style={[AuthStyles.roleSwitchText, role === 'Doctor' && AuthStyles.roleSwitchTextActive]}>Doctor</Text>
                            </TouchableOpacity>
                        </View>

                  
                        <View style={AuthStyles.inputContainer}>
                            <Feather name="user" size={20} style={AuthStyles.icon} />
                            {role === 'User' ? (
                                <TextInput style={AuthStyles.input} placeholder="Full Name" value={formData.name} onChangeText={(t) => handleInputChange('name', t)} editable={!isLoading} />
                            ) : (
                                <>
                                    <TextInput style={[AuthStyles.input, { flex: 0.5 }]} placeholder="First Name" value={formData.firstName} onChangeText={(t) => handleInputChange('firstName', t)} editable={!isLoading} />
                                    <TextInput style={[AuthStyles.input, { flex: 0.5, marginLeft: 10 }]} placeholder="Last Name" value={formData.lastName} onChangeText={(t) => handleInputChange('lastName', t)} editable={!isLoading} />
                                </>
                            )}
                        </View>
                   

                        <View style={AuthStyles.inputContainer}>
                            <Feather name="mail" size={20} style={AuthStyles.icon} />
                            <TextInput style={AuthStyles.input} placeholder="Email Address" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(t) => handleInputChange('email', t)} editable={!isLoading} />
                        </View>
                        <View style={AuthStyles.inputContainer}>
                            <Feather name="phone" size={20} style={AuthStyles.icon} />
                            <TextInput style={AuthStyles.input} placeholder="Phone Number" keyboardType="phone-pad" value={formData.phone} onChangeText={(t) => handleInputChange('phone', t)} editable={!isLoading} />
                        </View>
                        
                        <TouchableOpacity 
                            style={AuthStyles.inputContainer} 
                            onPress={() => setShowDatePicker(true)}
                            disabled={isLoading}
                        >
                            <Feather name="calendar" size={20} style={AuthStyles.icon} />
                            <TextInput 
                                style={AuthStyles.input} 
                                placeholder="DoB (YYYY-MM-DD)" 
                                value={formData.dateOfBirth} 
                                editable={false} 
                            />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={AuthStyles.inputContainer} 
                            onPress={handleGenderSelect}
                            disabled={isLoading}
                        >
                            <Feather name="users" size={20} style={AuthStyles.icon} />
                            <Text 
                                style={[
                                    AuthStyles.input, 
                                    { paddingTop: 15, paddingBottom: 15, flex: 1, height: 'auto' }, 
                                    formData.gender ? { color: '#222' } : { color: '#A0A0A0' } 
                                ]}
                            >
                                {formData.gender || "Gender (Male/Female/Other)"}
                            </Text>
                            <Feather name="chevron-down" size={20} style={AuthStyles.icon} />
                        </TouchableOpacity>

                        <View style={AuthStyles.inputContainer}>
                            <Feather name="home" size={20} style={AuthStyles.icon} />
                            <TextInput style={AuthStyles.input} placeholder="Home Address" value={formData.homeAddress} onChangeText={(t) => handleInputChange('homeAddress', t)} editable={!isLoading} />
                        </View>
                        <View style={AuthStyles.inputContainer}>
                            <Feather name="map" size={20} style={AuthStyles.icon} />
                            <TextInput style={AuthStyles.input} placeholder="City" value={formData.city} onChangeText={(t) => handleInputChange('city', t)} editable={!isLoading} />
                        </View>
                        <View style={AuthStyles.inputContainer}>
                            <Feather name="map" size={20} style={AuthStyles.icon} />
                            <TextInput style={AuthStyles.input} placeholder="State" value={formData.state} onChangeText={(t) => handleInputChange('state', t)} editable={!isLoading} />
                        </View>
                        <View style={AuthStyles.inputContainer}>
                            <Feather name="map-pin" size={20} style={AuthStyles.icon} />
                            <TextInput style={AuthStyles.input} placeholder="LGA" value={formData.lga} onChangeText={(t) => handleInputChange('lga', t)} editable={!isLoading} />
                        </View>

                    
                        {role === 'Doctor' && (
                            <>
                                <View style={AuthStyles.inputContainer}>
                                    <Feather name="shield" size={20} style={AuthStyles.icon} />
                                    <TextInput style={AuthStyles.input} placeholder="Specialization" value={formData.specialization} onChangeText={(t) => handleInputChange('specialization', t)} editable={!isLoading} />
                                </View>
                                <View style={AuthStyles.inputContainer}>
                                    <Feather name="file-text" size={20} style={AuthStyles.icon} />
                                    <TextInput style={AuthStyles.input} placeholder="License Number" value={formData.licenseNumber} onChangeText={(t) => handleInputChange('licenseNumber', t)} editable={!isLoading} />
                                </View>

                      
                                <TouchableOpacity 
                                    style={[AuthStyles.button, { marginTop: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: doctorImageUri ? '#E0F2F1' : '#F5F5F5' }]} 
                                    onPress={handleImagePick}
                                    disabled={isLoading}
                                >
                                    <Feather name={doctorImageUri ? "check-circle" : "camera"} size={20} color={doctorImageUri ? '#00796B' : '#D81E5B'} />
                                    <Text style={[AuthStyles.buttonText, { color: doctorImageUri ? '#00796B' : '#D81E5B', marginLeft: 10 }]}>
                                        {doctorImageUri ? "Profile Image Selected" : "Upload Profile Image (Required)"}
                                    </Text>
                                </TouchableOpacity>
                                {doctorImageUri && (
                                    <Image 
                                        source={{ uri: doctorImageUri }} 
                                        style={localStyles.previewImage} 
                                    />
                                )}
                            </>
                        )}
                   

                        <View style={AuthStyles.inputContainer}>
                            <Feather name="lock" size={20} style={AuthStyles.icon} />
                            <TextInput 
                                style={AuthStyles.input} 
                                placeholder="Password" 
                                secureTextEntry={!showPassword} 
                                value={formData.password} 
                                onChangeText={(t) => handleInputChange('password', t)} 
                                editable={!isLoading} 
                            />
                            <TouchableOpacity onPress={() => setShowPassword(p => !p)} disabled={isLoading}>
                                <Feather 
                                    name={showPassword ? "eye-off" : "eye"} 
                                    size={20} 
                                    style={AuthStyles.icon} 
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={AuthStyles.inputContainer}>
                            <Feather name="lock" size={20} style={AuthStyles.icon} />
                            <TextInput 
                                style={AuthStyles.input} 
                                placeholder="Confirm Password" 
                                secureTextEntry={!showPassword} 
                                value={formData.confirmPassword} 
                                onChangeText={(t) => handleInputChange('confirmPassword', t)} 
                                editable={!isLoading} 
                            />
                            <TouchableOpacity onPress={() => setShowPassword(p => !p)} disabled={isLoading}>
                                <Feather 
                                    name={showPassword ? "eye-off" : "eye"} 
                                    size={20} 
                                    style={AuthStyles.icon} 
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={AuthStyles.button} onPress={handleRegisterPress} disabled={isLoading}>
                            {isLoading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={AuthStyles.buttonText}>Sign Up</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.navigate('Login' as never)} disabled={isLoading}>
                            <Text style={AuthStyles.footerText}>
                                {'Already have an account? '}
                                <Text style={AuthStyles.footerLink}>Log In</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// Added local styles for image preview
const localStyles = StyleSheet.create({
    previewImage: {
        width: 100, 
        height: 100, 
        borderRadius: 50, 
        alignSelf: 'center', 
        marginBottom: 15
    }
});

export default RegisterScreen;