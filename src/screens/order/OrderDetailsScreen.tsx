// screens/orders/OrderDetailsScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppStackParamList } from "../../types/App";
import { useAuth } from "../../hooks/useAuth";
import { useOrderDetails } from "../../hooks/useOrderDetails";
import { Ionicons } from "@expo/vector-icons";

type RouteProps = RouteProp<AppStackParamList, "OrderDetailsScreen">;

const DELIVERY_STEPS = ["pending", "shipped", "delivered"];

function DeliveryTracker({ status }: { status: string }) {
  const current = DELIVERY_STEPS.indexOf(status?.toLowerCase());
  return (
    <View style={styles.trackerContainer}>
      {DELIVERY_STEPS.map((step, idx) => {
        const isCompleted = idx <= current;
        const isLast = idx === DELIVERY_STEPS.length - 1;
        return (
          <View key={step} style={styles.trackerStep}>
            <View style={styles.trackerDotRow}>
              <View style={[styles.trackerDot, isCompleted && styles.trackerDotActive]}>
                {isCompleted && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              {!isLast && (
                <View style={[styles.trackerLine, isCompleted && idx < current && styles.trackerLineActive]} />
              )}
            </View>
            <Text style={[styles.trackerLabel, isCompleted && styles.trackerLabelActive]}>
              {step.charAt(0).toUpperCase() + step.slice(1)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function OrderDetailsScreen() {
  const { params } = useRoute<RouteProps>();
  const { userToken } = useAuth();

  const { order, loading, verifying, refresh } = useOrderDetails(
    params.orderId,
    userToken!
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#D81E5B" />
        <Text style={styles.loadingText}>Loading order...</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#D81E5B" />
        <Text style={styles.errorText}>Order not found.</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.refreshText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isPaid = order.paymentStatus === "paid";
  const deliveryStatus = order.deliveryStatus ?? "pending";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9F9F9" }}>
      <ScrollView contentContainerStyle={styles.container}>

        <Text style={styles.title}>Order Details</Text>
        <Text style={styles.orderCode}>
          #{order.orderNumber?.slice(0, 8)?.toUpperCase()}
        </Text>

        {/* Payment Banner */}
        <View style={[styles.banner, isPaid ? styles.bannerSuccess : styles.bannerPending]}>
          <Ionicons
            name={isPaid ? "checkmark-circle" : "time-outline"}
            size={20}
            color={isPaid ? "#2e7d32" : "#e65100"}
          />
          <Text style={[styles.bannerText, isPaid ? styles.bannerTextSuccess : styles.bannerTextPending]}>
            {isPaid ? "Payment Confirmed" : "Awaiting Payment Confirmation"}
          </Text>
        </View>

        {/* Verifying indicator */}
        {verifying && (
          <View style={styles.verifyingRow}>
            <ActivityIndicator size="small" color="#D81E5B" />
            <Text style={styles.verifyingText}>Syncing status...</Text>
          </View>
        )}

        {/* Payment + Delivery Status */}
        <View style={styles.card}>
          <StatusRow label="Payment" value={order.paymentStatus} />
          <StatusRow label="Delivery" value={deliveryStatus} />
        </View>

        {/* Delivery Tracker */}
        <View style={styles.card}>
          <Text style={styles.heading}>Delivery Progress</Text>
          <DeliveryTracker status={deliveryStatus} />
        </View>

        {/* Delivery Address */}
        <View style={styles.card}>
          <Text style={styles.heading}>Delivery Address</Text>
          <Text style={styles.addressText}>{order.shippingAddress?.name}</Text>
          <Text style={styles.addressText}>{order.shippingAddress?.phone}</Text>
          <Text style={styles.addressText}>{order.shippingAddress?.addressLine}</Text>
          <Text style={styles.addressText}>
            {order.shippingAddress?.city}, {order.shippingAddress?.state}
          </Text>
        </View>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.heading}>Items</Text>
          {order.items?.map((item: any, idx: number) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.itemName}>{item.name} × {item.qty}</Text>
              <Text style={styles.itemPrice}>₦{Number(item.price).toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₦{Number(order.total).toLocaleString()}</Text>
          </View>
        </View>

        {/* Refresh */}
        <TouchableOpacity
          style={[styles.refreshBtn, verifying && styles.refreshBtnDisabled]}
          onPress={refresh}
          disabled={verifying}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.refreshText}>
            {verifying ? "Checking..." : "Refresh Status"}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const StatusRow = ({ label, value }: { label: string; value: string }) => {
  const isPositive = ["paid", "delivered", "shipped"].includes(value?.toLowerCase());
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, isPositive ? styles.statusPositive : styles.statusNeutral]}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 4, color: "#222" },
  orderCode: { fontSize: 13, color: "#999", marginBottom: 16 },
  loadingText: { marginTop: 10, color: "#555" },
  errorText: { fontSize: 16, color: "#555", marginTop: 12, marginBottom: 20 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  bannerSuccess: { backgroundColor: "#e8f5e9" },
  bannerPending: { backgroundColor: "#fff3e0" },
  bannerText: { fontWeight: "700", fontSize: 14 },
  bannerTextSuccess: { color: "#2e7d32" },
  bannerTextPending: { color: "#e65100" },
  verifyingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  verifyingText: { color: "#D81E5B", fontSize: 13 },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  heading: { fontWeight: "700", marginBottom: 10, fontSize: 15, color: "#222" },
  addressText: { fontSize: 14, color: "#555", marginBottom: 3 },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusLabel: { fontWeight: "700", color: "#444", fontSize: 14 },
  statusValue: { fontSize: 14, textTransform: "capitalize", fontWeight: "600" },
  statusPositive: { color: "#2e7d32" },
  statusNeutral: { color: "#e65100" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  itemName: { fontSize: 14, color: "#444", flex: 1 },
  itemPrice: { fontSize: 14, fontWeight: "600", color: "#222" },
  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 10 },
  totalLabel: { fontSize: 15, fontWeight: "800", color: "#222" },
  totalValue: { fontSize: 15, fontWeight: "800", color: "#D81E5B" },
  refreshBtn: {
    backgroundColor: "#D81E5B",
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  refreshBtnDisabled: { opacity: 0.6 },
  refreshText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  trackerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: 8,
  },
  trackerStep: {
    alignItems: "center",
    flex: 1,
  },
  trackerDotRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  trackerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  trackerDotActive: {
    backgroundColor: "#D81E5B",
  },
  trackerLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#ddd",
    position: "absolute",
    left: "60%",
    right: "-60%",
    top: 11,
    zIndex: -1,
  },
  trackerLineActive: {
    backgroundColor: "#D81E5B",
  },
  trackerLabel: {
    fontSize: 11,
    color: "#999",
    marginTop: 6,
    textAlign: "center",
  },
  trackerLabelActive: {
    color: "#D81E5B",
    fontWeight: "700",
  },
});