// screens/payment/PaymentMethodScreen.tsx
//
// Despite the filename (kept as-is to avoid a wider rename across the
// navigator/notification-handler/linking config that all reference this
// route by name), this is no longer a "pick a saved card" screen — there
// never was a way to add one, and the card that was "selected" was never
// even sent to the backend. Real checkout is fully hosted by whatever
// processor is behind checkoutUrl (the partner in production, or our own
// simulated page — see backend paymentController.ts), which shows its own
// payment-method picker. This screen just confirms the order and starts
// that hosted checkout, exactly like ConfirmOrderScreen.tsx already does
// for a fresh order.
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "../../hooks/useAuth";
import { useOrderDetails } from "../../hooks/useOrderDetails";
import { paymentService } from "../../services/payment";
import { getPlatformSettings } from "../../services/platformSettings";
import { AppStackParamList } from "../../types/App";

type NavigationProp = StackNavigationProp<AppStackParamList>;
type PaymentRouteProp = RouteProp<AppStackParamList, "PaymentMethodScreen">;

const PaymentMethodScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentRouteProp>();
  const { userToken } = useAuth();
  const { orderId, amount } = route.params;

  const { order, loading } = useOrderDetails(orderId, userToken!);
  const [simulated, setSimulated] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    getPlatformSettings()
      .then((s) => setSimulated(!s.orderPaymentEnabled))
      .catch(() => setSimulated(true));
  }, []);

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await paymentService.initiatePayment(userToken!, orderId);
      const checkoutUrl = res?.data?.checkoutUrl;
      if (!checkoutUrl) throw new Error("No checkout URL returned");

      await WebBrowser.openBrowserAsync(checkoutUrl, {
        dismissButtonStyle: "close",
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });

      // OrderDetailsScreen's own useOrderDetails hook re-verifies against
      // the backend on mount, so it always reflects the real outcome
      // whether or not the checkout page's own redirect (which lands here
      // via the planamwell://order-complete deep link) fired first.
      navigation.replace("OrderDetailsScreen", { orderId });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Payment failed",
        text2: err?.response?.data?.message || err.message,
      });
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Confirm & Pay</Text>
        <Text style={styles.subtitle}>Complete payment to finish this order</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#D81E5B" />
          </View>
        ) : (
          <>
            {order && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Order Summary</Text>
                <Text style={styles.orderNumber}>
                  #{order.orderNumber?.slice(0, 8)?.toUpperCase()}
                </Text>
                {order.items?.map((item: any, idx: number) => (
                  <View key={idx} style={styles.row}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name} × {item.qty}
                    </Text>
                    <Text style={styles.itemPrice}>₦{Number(item.price).toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total to pay</Text>
                <Text style={styles.totalValue}>₦{Number(order?.total ?? amount).toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment Method</Text>
              <View style={styles.paymentMethodRow}>
                <View style={styles.cardIconBox}>
                  <Ionicons name="card" size={24} color="#D81E5B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentMethodLabel}>
                    {simulated ? "Simulated Payment" : "Secure Hosted Checkout"}
                  </Text>
                  <Text style={styles.paymentMethodSub}>
                    {simulated
                      ? "Test mode — no real money is charged"
                      : "You'll choose card, bank, or USSD on the next screen"}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.payBtn} onPress={handlePay} disabled={paying}>
              {paying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.payBtnText}>Pay ₦{Number(order?.total ?? amount).toLocaleString()}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { padding: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#222", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#888", marginBottom: 24 },
  loadingBox: { paddingVertical: 60, alignItems: "center" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  orderNumber: { fontSize: 12, color: "#999", marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, gap: 12 },
  itemName: { flex: 1, fontSize: 14, color: "#444" },
  itemPrice: { fontSize: 14, color: "#333", fontWeight: "600" },

  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 15, fontWeight: "700", color: "#222" },
  totalValue: { fontSize: 20, fontWeight: "800", color: "#D81E5B" },

  paymentMethodRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF0F6",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentMethodLabel: { fontSize: 14, fontWeight: "600", color: "#333" },
  paymentMethodSub: { fontSize: 12, color: "#AAA", marginTop: 2 },

  payBtn: {
    backgroundColor: "#D81E5B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 20,
    marginTop: 4,
    shadowColor: "#D81E5B",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  payBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

export default PaymentMethodScreen;
