import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { paymentService } from '../../services/payment';
import { AppStackParamList } from '../../types/App';
import Toast from 'react-native-toast-message';

type PaymentScreenRouteProp = RouteProp<AppStackParamList, 'PaymentMethodScreen'>;

const PaymentMethodScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<PaymentScreenRouteProp>();
  const { userToken, user } = useAuth();
  
  // Expect order details from navigation params
  const { orderId, amount } = route.params || {};

  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const res = await paymentService.getPaymentMethods(userToken || "");
      setMethods(res.data);
      // Auto-select default
      const defaultMethod = res.data.find((m: any) => m.isDefault);
      if (defaultMethod) setSelectedMethod(defaultMethod.id);
    } catch (error) {
      console.error("Failed to fetch payment methods", error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load payment methods',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!selectedMethod) {
      Toast.show({
        type: 'info',
        text1: 'Select Payment Method',
        text2: 'Please select a payment method to proceed.',
      });
      return;
    }

    setProcessing(true);
    try {
      const res = await paymentService.initiatePayment(userToken || "", {
        orderId,
        amount,
        paymentMethod: selectedMethod,
        email: user?.email || "",
        phone: user?.phone || "",
      });

      // Handle success - maybe open a webview or show success
      // For this demo, we assume success and go to Home or Order Success screen
      Toast.show({
        type: 'success',
        text1: 'Payment Initiated',
        text2: 'Please complete the payment.',
      });
      
      // In a real app, you might navigate to a WebView here with res.data.authorization_url
      // For now, we'll just go back to Home
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeScreen' as never }],
      });

    } catch (error: any) {
      console.error("Payment failed", error);
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: error.response?.data?.message || 'An error occurred.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.cardItem,
        selectedMethod === item.id && styles.selectedCard
      ]}
      onPress={() => setSelectedMethod(item.id)}
    >
      <View style={styles.cardLeft}>
        <View style={styles.cardIcon}>
            {item.type === 'Mastercard' ? (
                 <View style={[styles.mockIcon, { backgroundColor: '#EB001B' }]} />
            ) : (
                 <View style={[styles.mockIcon, { backgroundColor: '#1A1F71' }]} />
            )}
        </View>
        <View>
          <Text style={styles.cardNumber}>•••• •••• •••• {item.last4}</Text>
          <Text style={styles.cardExpiry}>Expires {item.expiry}</Text>
        </View>
      </View>
      
      <View style={styles.cardRight}>
        {item.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultText}>Default</Text></View>}
        <TouchableOpacity style={styles.actionBtn}>
            <Feather name="edit-2" size={18} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
            <Feather name="trash-2" size={18} color="#666" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D81E5B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={methods}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
            <TouchableOpacity style={styles.addNewBtn}>
                <Text style={styles.addNewText}>Add New Payment Method</Text>
            </TouchableOpacity>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity 
            style={styles.payBtn} 
            onPress={handlePay}
            disabled={processing}
        >
            {processing ? (
                <ActivityIndicator color="#FFF" />
            ) : (
                <Text style={styles.payText}>Pay ₦{amount}</Text>
            )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#FFF',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  backBtn: { padding: 5 },
  listContent: { padding: 20 },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  selectedCard: {
    borderColor: '#D81E5B',
    backgroundColor: '#FFF5F8',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { marginRight: 15 },
  mockIcon: { width: 32, height: 20, borderRadius: 4 },
  cardNumber: { fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 4 },
  cardExpiry: { fontSize: 12, color: '#888' },
  cardRight: { flexDirection: 'row', alignItems: 'center' },
  defaultBadge: {
    backgroundColor: '#FFE6EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 10,
  },
  defaultText: { fontSize: 10, color: '#D81E5B', fontWeight: '700' },
  actionBtn: { marginLeft: 10, padding: 5 },
  
  addNewBtn: {
    backgroundColor: '#D81E5B',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  addNewText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  footer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  payBtn: {
    backgroundColor: '#D81E5B',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  payText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default PaymentMethodScreen;
