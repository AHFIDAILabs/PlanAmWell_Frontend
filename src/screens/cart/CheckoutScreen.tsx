// ../screens/CheckoutScreen.tsx

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
import AuthStack from '../../navigations/AuthStack';

const CheckoutScreen = () => {
    const navigation = useNavigation<any>();
    const { cart, clearCart } = useContext(CartContext);
    const { user, userToken, isAnonymous, sessionId } = useAuth(); 
    const { checkout, loading: checkoutLoading } = useCheckout(); 

const userPreferences = (user?.preferences as Record<string, any>) || {};

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        address: '',
        city: '',
        state: '',
        lga: '',
        createAccount: false,
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || prev.name || '',
                email: user.email || prev.email || '',
                phone: user.phone || prev.phone || '',
                address: userPreferences?.address || user.homeAddress || prev.address || '',
                city: userPreferences?.city || user.city || prev.city || '',
                state: userPreferences?.state || user.state || prev.state || '',
                lga: userPreferences?.lga || user.lga || prev.lga || '',
                password: isAnonymous ? prev.password : '',
                confirmPassword: isAnonymous ? prev.confirmPassword : '',
                createAccount: isAnonymous && prev.createAccount,
            }));
        }
    }, [user, userPreferences, isAnonymous]);

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
        if (!formData.name || !formData.phone || !formData.address || !formData.state || !formData.lga) {
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
        return true;
    };

    const handlePlaceOrder = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            // 1️⃣ Checkout
            const checkoutDetails = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: isAnonymous ? formData.password : undefined,
                preferences: {
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    lga: formData.lga,
                },
            };
            const response = await checkout(cart?.items || [], checkoutDetails);

            // 2️⃣ Clear cart
            await clearCart();

            // 3️⃣ Initiate payment directly (partner API key injected at backend)
            const paymentData = await paymentService.initiatePayment(userToken || '', {
                orderId: response.localOrder._id,
                userId: user?._id || 'guest',
                paymentMethod: 'card', // default
                amount: response.localOrder.total,
                partnerReferenceCode: `REF_${Date.now()}`,
                customerEmail: formData.email!,
            });

            Toast.show({ type: 'success', text1: 'Payment Initiated', text2: 'Redirecting to payment gateway...' });

            // 4️⃣ Redirect to checkout URL
            if (paymentData.data?.checkoutUrl) {
                navigation.replace('WebViewScreen' as never, { url: paymentData.data.checkoutUrl });
            } else {
                Toast.show({ type: 'error', text1: 'Payment Failed', text2: 'No checkout URL returned.' });
            }
        } catch (error: any) {
            console.error('Checkout/Payment error:', error);
            Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.message || error.message || 'An error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F9F9F9' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.container}>
                {/* --- HEADER --- */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Feather name="arrow-left" size={24} color="#222" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Checkout</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {/* --- LOGIN/USER INFO BAR --- */}
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
                            <Text style={styles.loginInfoText}>Logged in as: <Text style={{ fontWeight: '700' }}>{user.email}</Text></Text>
                        </View>
                    )}

                    {/* --- ORDER SUMMARY --- */}
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

                    {/* --- SHIPPING DETAILS --- */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Shipping Details</Text>
                        <TextInput style={styles.input} placeholder="Full Name" value={formData.name} onChangeText={(t) => handleInputChange('name', t)} />
                        <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(t) => handleInputChange('email', t)} />
                        {isAnonymous && (
                            <>
                                <TextInput style={styles.input} placeholder='Password' secureTextEntry value={formData.password} onChangeText={(t) => handleInputChange('password', t)} />
                                <TextInput style={styles.input} placeholder='Confirm Password' secureTextEntry value={formData.confirmPassword} onChangeText={(t) => handleInputChange('confirmPassword', t)} />
                            </>
                        )}
                        <TextInput style={styles.input} placeholder="Phone Number" keyboardType="phone-pad" value={formData.phone} onChangeText={(t) => handleInputChange('phone', t)} />
                        <TextInput style={styles.input} placeholder="Address" value={formData.address} onChangeText={(t) => handleInputChange('address', t)} />

                        <View style={styles.row}>
                            <TextInput style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]} placeholder="City" value={formData.city} onChangeText={(t) => handleInputChange('city', t)} />
                            <TextInput style={[styles.input, { flex: 1, marginLeft: 8, marginBottom: 0 }]} placeholder="State" value={formData.state} onChangeText={(t) => handleInputChange('state', t)} />
                        </View>
                        <TextInput style={[styles.input, { marginTop: 12 }]} placeholder="LGA" value={formData.lga} onChangeText={(t) => handleInputChange('lga', t)} />
                    </View>

                    {/* --- CREATE ACCOUNT CHECKBOX --- */}
                    {isAnonymous && (
                        <View style={styles.section}>
                            <TouchableOpacity style={styles.checkboxContainer} onPress={() => handleInputChange('createAccount', !formData.createAccount)}>
                                <Feather name={formData.createAccount ? "check-square" : "square"} size={20} color="#D81E5B" />
                                <Text style={styles.checkboxLabel}>Create an account for faster checkout</Text>
                            </TouchableOpacity>
                            {formData.createAccount && (
                                <TextInput style={[styles.input, { marginTop: 10 }]} placeholder="Password" secureTextEntry value={formData.password} onChangeText={(t) => handleInputChange('password', t)} />
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* --- PLACE ORDER BUTTON --- */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.placeOrderBtn} onPress={handlePlaceOrder} disabled={loading || checkoutLoading}>
                        {(loading || checkoutLoading) ? <ActivityIndicator color="#FFF" /> : <Text style={styles.placeOrderText}>Place Order - ₦{totalAmountFixed}</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F9F9' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
    backBtn: { padding: 5 },
    content: { padding: 20, paddingBottom: 100 },
    section: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    loginInfoSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, backgroundColor: '#E0F7FA', borderColor: '#00BCD4', borderWidth: 1 },
    loggedInInfoSection: { paddingVertical: 10, backgroundColor: '#E6FFE6', borderColor: '#4CAF50', borderWidth: 1, justifyContent: 'center' },
    loginInfoText: { fontSize: 14, color: '#444' },
    loginInfoLink: { fontSize: 14, fontWeight: 'bold', color: '#D81E5B' },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 15, color: '#222' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    summaryLabel: { fontSize: 14, color: '#666' },
    summaryValue: { fontSize: 14, fontWeight: '600', color: '#222' },
    totalRow: { borderTopWidth: 1, borderTopColor: '#EEE', marginTop: 10, paddingTop: 10 },
    totalLabel: { fontSize: 16, fontWeight: '700', color: '#222' },
    totalValue: { fontSize: 16, fontWeight: '700', color: '#D81E5B' },
    input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14, backgroundColor: '#FAFAFA' },
    row: { flexDirection: 'row' },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
    checkboxLabel: { marginLeft: 10, fontSize: 14, color: '#444' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 20, borderTopWidth: 1, borderTopColor: '#EEE' },
    placeOrderBtn: { backgroundColor: '#D81E5B', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
    placeOrderText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default CheckoutScreen;



