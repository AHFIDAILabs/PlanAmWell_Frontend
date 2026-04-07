// screens/payment/PaymentStatusScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { AppStackParamList } from "../../types/App";
import { useAuth } from "../../hooks/useAuth";
import { useOrderPaymentStatus } from "../../hooks/useOrderPaymentStatus";
import { Ionicons } from "@expo/vector-icons";

type RouteProps = RouteProp<AppStackParamList, "PaymentStatusScreen">;

const SUCCESS_REDIRECT_DELAY = 3000; // 3 seconds

export default function PaymentStatusScreen() {
  const { params } = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const { userToken } = useAuth();

  const { status, loading, refresh } = useOrderPaymentStatus(
    params.orderId,
    userToken!
  );

  const [showDelayMessage, setShowDelayMessage] = useState(false);

  /* ───────── Pending delay hint ───────── */
  useEffect(() => {
    if (status !== "pending") return;

    const timer = setTimeout(() => {
      setShowDelayMessage(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, [status]);

  /* ───────── ✅ AUTO REDIRECT AFTER SUCCESS ───────── */
  useEffect(() => {
    if (status !== "paid") return;

    const timer = setTimeout(() => {
      navigation.replace("MyOrders");
    }, SUCCESS_REDIRECT_DELAY);

    return () => clearTimeout(timer);
  }, [status, navigation]);

  /* ───────── Loading ───────── */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D81E5B" />
        <Text style={styles.subtitle}>Checking payment status…</Text>
      </View>
    );
  }

  /* ───────── Pending ───────── */
  if (status === "pending") {
    return (
      <View style={styles.center}>
        <Ionicons name="time-outline" size={80} color="#FF9800" />
        <Text style={styles.title}>Payment Processing</Text>

        <Text style={styles.subtitle}>
          Your payment is being confirmed.
        </Text>

        {showDelayMessage && (
          <Text style={styles.hint}>
            This is taking longer than usual. You can safely leave this screen —
            we’ll update your order once the payment is confirmed.
          </Text>
        )}

        <TouchableOpacity style={styles.secondaryBtn} onPress={refresh}>
          <Text style={styles.secondaryBtnText}>Refresh Status</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ───────── ✅ Failed (retry allowed) ───────── */
  if (status === "failed") {
    return (
      <View style={styles.center}>
        <Ionicons name="close-circle" size={80} color="#F44336" />
        <Text style={styles.title}>Payment Failed</Text>

        <Text style={styles.subtitle}>
          Your payment could not be completed.
        </Text>

        {/* ✅ Retry ONLY shown for failed state */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            navigation.replace("PaymentMethodScreen", {
              orderId: params.orderId,
            })
          }
        >
          <Text style={styles.primaryBtnText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.replace("MyOrders")}
        >
          <Text style={styles.secondaryBtnText}>View Order</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ───────── ✅ Success ───────── */
  return (
    <View style={styles.center}>
      <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
      <Text style={styles.title}>Payment Successful</Text>

      <Text style={styles.subtitle}>
        Your order has been confirmed. Redirecting…
      </Text>

      {/* Manual opt‑out */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.replace("MyOrders")}
      >
        <Text style={styles.primaryBtnText}>View Order Now</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ───────── Styles ───────── */

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: 16,
    textAlign: "center",
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: "#D81E5B",
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
    marginTop: 32,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryBtnText: {
    fontSize: 14,
    color: "#D81E5B",
    fontWeight: "600",
  },
});