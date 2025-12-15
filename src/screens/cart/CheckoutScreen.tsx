// screens/cart/CheckoutScreen.tsx - FINAL FIXED VERSION with Selectors and DatePicker

import React, { useContext, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CartContext } from '../../context/CartContext';
import { useAuth } from '../../hooks/useAuth';
import { useCheckout } from '../../hooks/useCheckout';
import { paymentService } from '../../services/payment';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { CheckoutDetails } from '../../services/checkout';
// --- Date Picker Imports ---
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { format } from 'date-fns'; 
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Gender Options ---
const GENDER_OPTIONS = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
];

/**
 * Custom Component for Date of Birth Selection (Calendar)
 */
interface DatePickerProps {
    label: string;
    value: string;
    onDateChange: (dateString: string) => void;
    inputStyle: any;
}

const DatePickerInput: React.FC<DatePickerProps> = ({ label, value, onDateChange, inputStyle }) => {
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    const showDatePicker = () => {
        setDatePickerVisibility(true);
    };

    const hideDatePicker = () => {
        setDatePickerVisibility(false);
    };

    const handleConfirm = (date: Date) => {
        const dateString = format(date, 'yyyy-MM-dd');
        onDateChange(dateString);
        hideDatePicker();
    };

    return (
        <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity onPress={showDatePicker} style={[inputStyle, styles.dateInput]}>
                <Text style={value ? styles.dateValue : styles.datePlaceholder}>
                    {value || "YYYY-MM-DD"}
                </Text>
                <Feather name="calendar" size={18} color="#999" />
            </TouchableOpacity>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleConfirm}
                onCancel={hideDatePicker}
                date={value ? new Date(value) : new Date(1995, 0, 1)}
                maximumDate={new Date()} 
            />
        </View>
    );
};

/**
 * Custom Component for Gender Selection
 */
interface SelectorProps {
    label: string;
    value: string;
    options: { label: string, value: string }[];
    onSelect: (value: string) => void;
}

const GenderSelector: React.FC<SelectorProps> = ({ label, value, options, onSelect }) => {
    return (
        <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.selectorContainer}>
                {options.map((option) => (
                    <TouchableOpacity
                        key={option.value}
                        style={[
                            styles.selectorOption,
                            value === option.value && styles.selectorSelected,
                        ]}
                        onPress={() => onSelect(option.value)}
                    >
                        <Text style={[
                            styles.selectorText,
                            value === option.value && styles.selectorSelectedText,
                        ]}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};


const CheckoutScreen = () => {
    const navigation = useNavigation<any>();
    
    const { cart, clearCartLocal } = useContext(CartContext); 
    
    const { 
        user, 
        userToken, 
        isAnonymous, 
        sessionId,
        handleConversion,
        refreshUser,
        setToken, 
    } = useAuth();
    
    const { checkout, loading: checkoutLoading } = useCheckout({
        isAnonymous,
        handleConversion,
        userToken,
        sessionId,
        refreshUser,
        setUserToken: setToken, 
    });

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        homeAddress: '',
        city: '',
        state: '',
        lga: '',
        gender: '',  
        dateOfBirth: "",
        sessionId: sessionId,
        createAccount: false,
    });

    useEffect(() => {
        if (!user) return;

        const prefs = user.preferences as any;

        setFormData(prev => ({
            ...prev,
            name: user.name || prev.name || '',
            email: user.email || prev.email || '',
            phone: user.phone || prev.phone || '',
            
            homeAddress: user.homeAddress || prefs?.homeAddress || prefs?.address || prev.homeAddress || '',
            city: user.city || prefs?.city || prev.city || '',
            state: user.state || prefs?.state || prev.state || '',
            lga: user.lga || prefs?.lga || prev.lga || '',
            
            gender: user.gender || prev.gender || '',
            dateOfBirth: user.dateOfBirth || prev.dateOfBirth || '',
            
            password: isAnonymous ? prev.password : '',
            confirmPassword: isAnonymous ? prev.confirmPassword : '',
        }));
    }, [user, isAnonymous]); 

    const totalAmount =
        cart?.items?.reduce(
            (sum, item) => sum + (Number(item.price ?? 0) * Number(item.quantity ?? 0)),
            0
        ) ?? 0;
    const totalAmountFixed = totalAmount.toFixed(2);

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = () => {

        if (!cart?.items || cart.items.length === 0) {
            Toast.show({ type: 'error', text1: 'Cart Empty', text2: 'Please add items to your cart.' });
            return false;
        }
        if (!userToken && !sessionId) {
            Toast.show({ type: 'error', text1: 'Session Error', text2: 'Please refresh or re-add items to start a new session.' });
            return false;
        }
        if (!formData.name || !formData.phone || !formData.homeAddress || !formData.state || !formData.lga) {
            Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please fill in all required fields.' });
            return false;
        }
        if (isAnonymous && !formData.email) {
            Toast.show({ type: 'error', text1: 'Missing Email', text2: 'Email is required for guest checkout.' });
            return false;
        }
        const passwordRequired = isAnonymous && (formData.createAccount || !userToken);
        if (passwordRequired && (!formData.password || formData.password !== formData.confirmPassword)) {
            Toast.show({ type: 'error', text1: 'Password Error', text2: 'Password is required or passwords do not match.' });
            return false;
        }

        if (!formData.gender) {
            Toast.show({ type: 'error', text1: 'Missing Gender', text2: 'Gender is required.' });
            return false;
        }

        if (!formData.dateOfBirth) {
            Toast.show({ type: 'error', text1: 'Missing Date of Birth', text2: 'Please provide DOB.' });
            return false;
        }

        return true;
    };

    const handlePlaceOrder = async () => {
        if (!validateForm()) return;

        setLoading(true);

        try {
            const checkoutDetails: CheckoutDetails = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: isAnonymous ? formData.password : undefined,
                confirmPassword: isAnonymous ? formData.confirmPassword : undefined,

                gender: formData.gender?.toLowerCase(),
                dateOfBirth: formData.dateOfBirth || undefined,

                homeAddress: formData.homeAddress,
                city: formData.city,
                state: formData.state,
                lga: formData.lga,

                preferences: {
                    homeAddress: formData.homeAddress,
                    city: formData.city,
                    state: formData.state,
                    lga: formData.lga,
                },
            };

            console.log('[CheckoutScreen] Starting checkout...');
            const response = await checkout(cart?.items || [], checkoutDetails);
            console.log('[CheckoutScreen] Checkout successful:', response);

            clearCartLocal(); 

            const token = userToken;

            if (!token) {
                Toast.show({ type: 'error', text1: 'Payment Error', text2: 'No valid user token available' });
                return;
            }

            console.log('[CheckoutScreen] Initiating payment...');
            const paymentData = await paymentService.initiatePayment(token, {
                orderId: response.localOrder._id,
                userId: response.localOrder.userId,
                paymentMethod: 'card',
                amount: response.localOrder.total,
                partnerReferenceCode: `REF_${Date.now()}`,
                customerEmail: formData.email!,
            });

            if (paymentData.data?.checkoutUrl) {
                console.log('[CheckoutScreen] Navigating to payment...');
                navigation.replace('WebViewScreen' as never, { url: paymentData.data.checkoutUrl });
            } else {
                Toast.show({ type: 'error', text1: 'Payment Failed', text2: 'No checkout URL returned.' });
            }
        } catch (error: any) {
            console.error('[CheckoutScreen] Checkout/Payment error:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.message || error.message || 'An error occurred.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
            style={{ flex: 1, backgroundColor: '#F9F9F9' }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Feather name="arrow-left" size={24} color="#222" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Checkout</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>

                    {isAnonymous && (
                        <View style={[styles.section, styles.loginInfoSection]}>
                            <Text style={styles.loginInfoText}>Already have an account?</Text>
                            <TouchableOpacity onPress={() => navigation.navigate("AuthStack", { screen: "Login" })}>
                                <Text style={styles.loginInfoLink}>Log In</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {!isAnonymous && user?.email && (
                        <View style={[styles.section, styles.loggedInInfoSection]}>
                            <Text style={styles.loginInfoText}>
                                <Text>Logged in as: </Text><Text style={{ fontWeight: '700' }}>{user.email}</Text>
                            </Text>
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Order Summary</Text>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Items ({cart?.items?.length || 0})</Text>
                            <Text style={styles.summaryValue}>₦{totalAmountFixed}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Delivery</Text>
                            <Text style={styles.summaryValue}>Free</Text>
                        </View>
                        <View style={[styles.summaryRow, styles.totalRow]}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>₦{totalAmountFixed}</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Shipping Details</Text>

                        <Text style={styles.label}>Full Name</Text>
                        <TextInput 
                            style={styles.input} 
                            value={formData.name} 
                            onChangeText={(t) => handleInputChange('name', t)} 
                        />

                        <Text style={styles.label}>Email</Text>
                        <TextInput 
                            style={styles.input} 
                            keyboardType="email-address" 
                            autoCapitalize="none" 
                            value={formData.email} 
                            onChangeText={(t) => handleInputChange('email', t)} 
                        />

                        {isAnonymous && (
                            <>
                                <Text style={styles.label}>Password</Text>
                                <TextInput 
                                    style={styles.input} 
                                    secureTextEntry 
                                    value={formData.password} 
                                    onChangeText={(t) => handleInputChange('password', t)} 
                                />

                                <Text style={styles.label}>Confirm Password</Text>
                                <TextInput 
                                    style={styles.input} 
                                    secureTextEntry 
                                    value={formData.confirmPassword} 
                                    onChangeText={(t) => handleInputChange('confirmPassword', t)} 
                                />
                            </>
                        )}

                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput 
                            style={styles.input} 
                            keyboardType="phone-pad" 
                            value={formData.phone} 
                            onChangeText={(t) => handleInputChange('phone', t)} 
                        />
                        
                        <GenderSelector
                            label="Gender"
                            value={formData.gender}
                            options={GENDER_OPTIONS}
                            onSelect={(v) => handleInputChange('gender', v)}
                        />

                        <DatePickerInput
                            label="Date of Birth"
                            value={formData.dateOfBirth}
                            onDateChange={(d) => handleInputChange('dateOfBirth', d)}
                            inputStyle={styles.input}
                        />

                        <Text style={styles.label}>Address</Text>
                        <TextInput 
                            style={styles.input} 
                            value={formData.homeAddress} 
                            onChangeText={(t) => handleInputChange('homeAddress', t)} 
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.label}>City</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={formData.city} 
                                    onChangeText={(t) => handleInputChange('city', t)} 
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.label}>State</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={formData.state} 
                                    onChangeText={(t) => handleInputChange('state', t)} 
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>LGA</Text>
                        <TextInput 
                            style={[styles.input, { marginTop: 12 }]} 
                            value={formData.lga} 
                            onChangeText={(t) => handleInputChange('lga', t)} 
                        />
                    </View>

                    {isAnonymous && (
                        <View style={styles.section}>
                            <TouchableOpacity 
                                style={styles.checkboxContainer} 
                                onPress={() => handleInputChange('createAccount', !formData.createAccount)}
                            >
                                <Feather 
                                    name={formData.createAccount ? "check-square" : "square"} 
                                    size={20} 
                                    color="#D81E5B" 
                                />
                                <Text style={styles.checkboxLabel}>
                                    Create an account for faster checkout
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={styles.placeOrderBtn} 
                        onPress={handlePlaceOrder} 
                        disabled={loading || checkoutLoading}
                    >
                        {(loading || checkoutLoading) ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.placeOrderText}>
                                Place Order - ₦{totalAmountFixed}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F9F9' },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingTop: 50, 
        paddingBottom: 15, 
        backgroundColor: '#FFF', 
        borderBottomWidth: 1, 
        borderBottomColor: '#EEE' 
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
    backBtn: { padding: 5 },
    content: { padding: 20, paddingBottom: 100 },
    section: { 
        backgroundColor: '#FFF', 
        borderRadius: 12, 
        padding: 15, 
        marginBottom: 20, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 1 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 3, 
        elevation: 2 
    },
    loginInfoSection: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingVertical: 10, 
        backgroundColor: '#E0F7FA', 
        borderColor: '#00BCD4', 
        borderWidth: 1 
    },
    loggedInInfoSection: { 
        paddingVertical: 10, 
        backgroundColor: '#E6FFE6', 
        borderColor: '#4CAF50', 
        borderWidth: 1, 
        justifyContent: 'center' 
    },
    loginInfoText: { fontSize: 14, color: '#444' },
    loginInfoLink: { fontSize: 14, fontWeight: 'bold', color: '#D81E5B' },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 15, color: '#222' },
    label: { fontSize: 14, fontWeight: '500', color: '#555', marginBottom: 4 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    summaryLabel: { fontSize: 14, color: '#666' },
    summaryValue: { fontSize: 14, fontWeight: '600', color: '#222' },
    totalRow: { borderTopWidth: 1, borderTopColor: '#EEE', marginTop: 10, paddingTop: 10 },
    totalLabel: { fontSize: 16, fontWeight: '700', color: '#222' },
    totalValue: { fontSize: 16, fontWeight: '700', color: '#D81E5B' },
    input: { 
        borderWidth: 1, 
        borderColor: '#DDD', 
        borderRadius: 8, 
        padding: 12, 
        marginBottom: 12, 
        fontSize: 14, 
        backgroundColor: '#FAFAFA' 
    },

    dateInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 48, 
    },
    dateValue: {
        fontSize: 14,
        color: '#222',
    },
    datePlaceholder: {
        fontSize: 14,
        color: '#999',
    },

    selectorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 8,
    },
    selectorOption: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
    },
    selectorSelected: {
        borderColor: '#D81E5B',
        backgroundColor: '#FFE6EF', 
    },
    selectorText: {
        fontSize: 14,
        color: '#555',
    },
    selectorSelectedText: {
        fontWeight: '700',
        color: '#D81E5B',
    },
    row: { flexDirection: 'row' },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
    checkboxLabel: { marginLeft: 10, fontSize: 14, color: '#444' },
    footer: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        backgroundColor: '#FFF', 
        padding: 20, 
        borderTopWidth: 1, 
        borderTopColor: '#EEE' ,
    },
    placeOrderBtn: { 
        backgroundColor: '#D81E5B', 
        paddingVertical: 15, 
        borderRadius: 12, 
        alignItems: 'center', 
        justifyContent: 'center', 
    },
    placeOrderText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default CheckoutScreen;