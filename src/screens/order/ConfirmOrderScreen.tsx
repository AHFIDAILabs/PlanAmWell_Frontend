// screens/orders/ConfirmOrderScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_SERVER_URL;
type ConfirmOrderParams = {
  ConfirmOrderScreen: {
    localOrder: any;
  };
};

export default function ConfirmOrderScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<RouteProp<ConfirmOrderParams, 'ConfirmOrderScreen'>>();
  const { userToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const { localOrder } = params;

  const handleConfirmOrder = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/checkout/confirm`,
        { orderId: localOrder._id },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );

      const { checkoutUrl, orderId } = res.data;

      navigation.replace('WebViewScreen', {
        url: checkoutUrl,
        orderId,
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.response?.data?.message || 'Failed to confirm order. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const order = localOrder;
  const items = order?.items || [];
  const shipping = order?.shippingAddress || {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F9F9' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Order</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Items</Text>
          {items.map((item: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name} × {item.qty}</Text>
              <Text style={styles.itemPrice}>₦{(item.price * item.qty).toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.itemRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₦{Number(order?.total || 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Address</Text>
          <Text style={styles.addressText}>{shipping.name}</Text>
          <Text style={styles.addressText}>{shipping.phone}</Text>
          <Text style={styles.addressText}>{shipping.addressLine}</Text>
          <Text style={styles.addressText}>{shipping.city}, {shipping.state}</Text>
        </View>

        {/* Notice */}
        <View style={styles.noticeBox}>
          <Feather name="info" size={16} color="#D81E5B" />
          <Text style={styles.noticeText}>
            You will be redirected to a secure payment page after confirming your order.
          </Text>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirmOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmText}>
              Confirm & Pay — ₦{Number(order?.total || 0).toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  backBtn: { padding: 5 },
  content: { padding: 20, paddingBottom: 120 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemName: { fontSize: 14, color: '#444', flex: 1 },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#222' },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#222' },
  totalValue: { fontSize: 16, fontWeight: '700', color: '#D81E5B' },
  addressText: { fontSize: 14, color: '#555', marginBottom: 4 },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF0F5',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFCCD9',
  },
  noticeText: { fontSize: 13, color: '#D81E5B', flex: 1, lineHeight: 18 },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  confirmBtn: {
    backgroundColor: '#D81E5B',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});