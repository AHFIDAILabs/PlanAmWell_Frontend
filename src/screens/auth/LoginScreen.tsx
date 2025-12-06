import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { AuthStyles } from '../../styles/AuthStyles'; 

type Role = 'User' | 'Doctor';

const LoginScreen = ({ navigation }: { navigation: any }) => {
    const { handleLogin, loading: authLoading } = useAuth();
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
            // 💡 FIX: Pass the role to the generalized handleLogin function
            await handleLogin({ email, password }, role); 
            
            Toast.show({ type: 'success', text1: 'Success', text2: `Logged in as ${role}!` });
            navigation.navigate('HomeScreen'); 
        } catch (error: any) {
            // Catches errors including 403 Forbidden for unapproved doctors
            const errorMessage = error.response?.data?.message || error.message || 'Login failed. Check credentials.';
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
                                <Feather 
                                    name={showPassword ? "eye-off" : "eye"} 
                                    size={20} 
                                    style={AuthStyles.icon} 
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={AuthStyles.button} onPress={handleLoginPress} disabled={isLoading}>
                            {isLoading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={AuthStyles.buttonText}>Continue</Text>
                            )}
                        </TouchableOpacity>

                        <Text style={AuthStyles.divider}>or continue with</Text>

                        <View style={AuthStyles.socialContainer}>
                            <TouchableOpacity style={AuthStyles.socialButton}><Feather name="globe" size={24} color="#666" /></TouchableOpacity>
                            <TouchableOpacity style={AuthStyles.socialButton}><Feather name="user" size={24} color="#666" /></TouchableOpacity>
                            <TouchableOpacity style={AuthStyles.socialButton}><Feather name="facebook" size={24} color="#666" /></TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={() => navigation.navigate('Register' as never)} disabled={isLoading}>
                            <Text style={AuthStyles.footerText}>
                                Don't have an account? <Text style={AuthStyles.footerLink}>Sign up</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default LoginScreen;