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
import { AppStackParamList } from "../../types/App";
import { useAuth } from "../../hooks/useAuth";
import { useOrderDetails } from "../../hooks/useOrderDetails";
import { Ionicons } from "@expo/vector-icons";

type RouteProps = RouteProp<AppStackParamList, "OrderDetailsScreen">;

export default function OrderDetailsScreen() {
  const { params } = useRoute<RouteProps>();
  const { userToken } = useAuth();

  const { order, loading, refresh } = useOrderDetails(
    params.orderId,
    userToken!
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D81E5B" />
        <Text>Loading order...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Order Details</Text>

      <Status label="Payment" value={order.paymentStatus} />
      <Status label="Delivery" value={order.deliveryStatus} />

      <View style={styles.card}>
        <Text style={styles.heading}>Delivery Address</Text>
        <Text>{order.shippingAddress?.addressLine}</Text>
        <Text>{order.shippingAddress?.city}, {order.shippingAddress?.state}</Text>
        <Text>{order.shippingAddress?.phone}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Items</Text>
        {order.items.map((item: any, idx: number) => (
          <View key={idx} style={styles.row}>
            <Text>{item.name} × {item.qty}</Text>
            <Text>₦{item.price}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.total}>Total: ₦{order.total}</Text>

      <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
        <Ionicons name="refresh" size={18} color="#fff" />
        <Text style={styles.refreshText}>Refresh Status</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const Status = ({ label, value }: any) => (
  <View style={styles.statusRow}>
    <Text style={styles.statusLabel}>{label}:</Text>
    <Text style={styles.statusValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 20 },
  statusRow: { flexDirection: "row", marginBottom: 8 },
  statusLabel: { fontWeight: "700" },
  statusValue: { marginLeft: 8, textTransform: "capitalize" },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 16 },
  heading: { fontWeight: "700", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  total: { fontSize: 18, fontWeight: "800", textAlign: "right" },
  refreshBtn: {
    backgroundColor: "#D81E5B",
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  refreshText: { color: "#fff", fontWeight: "700" },
});