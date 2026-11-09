// screens/order/MyOrdersScreen.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import { AppStackParamList } from "../../types/App";
import { useAuth } from "../../hooks/useAuth";
import { statusTone } from "../../utils/orderStatus";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

type NavigationProp = StackNavigationProp<AppStackParamList>;

interface Order {
  _id: string;
  orderNumber: string;
  items: { name?: string; productId?: string; qty: number }[];
  total: number;
  paymentStatus: string;
  deliveryStatus?: string;
  createdAt: string;
}

function StatusBadge({ value }: { value?: string }) {
  if (!value) return null;
  const tone = statusTone(value);
  const style = tone === "positive" ? styles.badgePositive : tone === "negative" ? styles.badgeNegative : styles.badgeNeutral;
  const textStyle =
    tone === "positive" ? styles.badgeTextPositive : tone === "negative" ? styles.badgeTextNegative : styles.badgeTextNeutral;
  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.badgeText, textStyle]}>{value}</Text>
    </View>
  );
}

export default function MyOrdersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userToken } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!userToken) return;
    try {
      const res = await axios.get(`${SERVER_URL}/api/v1/orders/my`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const list: Order[] = res.data?.data || [];
      setOrders(list);
      setError(null);

      // Active-verify payment only for still-pending orders — mirrors the
      // web order history list's verifyPendingOrders. Delivery status is
      // intentionally left as a passive read here (kept partner-driven via
      // the webhook/admin refresh/order-detail screen's own active pull,
      // not re-pulled per row on every list view).
      const pending = list.filter((o) => o.paymentStatus === "pending");
      if (pending.length > 0) {
        await Promise.allSettled(
          pending.map(async (order) => {
            try {
              const paymentRes = await axios.get(
                `${SERVER_URL}/api/v1/payment/by-order/${order._id}`,
                { headers: { Authorization: `Bearer ${userToken}` } }
              );
              const paymentReference = paymentRes.data?.data?.paymentReference;
              if (paymentReference) {
                await axios.post(
                  `${SERVER_URL}/api/v1/payment/verify`,
                  { paymentReference },
                  { headers: { Authorization: `Bearer ${userToken}` } }
                );
              }
            } catch {
              // Best-effort — leave this order's status as-is on failure.
            }
          })
        );
        const refreshed = await axios.get(`${SERVER_URL}/api/v1/orders/my`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        setOrders(refreshed.data?.data || list);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load your orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#D81E5B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#222" />
        </TouchableOpacity>
        <Text style={styles.title}>My Orders</Text>
        <View style={{ width: 22 }} />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#D81E5B"]} />}
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyState}>
              <Feather name="shopping-bag" size={40} color="#CCC" />
              <Text style={styles.emptyText}>You haven&apos;t placed any orders yet.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("OrderDetailsScreen", { orderId: item._id })}
          >
            <View style={styles.cardTopRow}>
              <Text style={styles.orderNumber}>Order #{item.orderNumber?.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Text>
            </View>
            <View style={styles.cardBottomRow}>
              <Text style={styles.itemsCount}>
                {item.items.length} item{item.items.length === 1 ? "" : "s"}
              </Text>
              <Text style={styles.total}>₦{Number(item.total ?? 0).toLocaleString()}</Text>
            </View>
            <View style={styles.badgeRow}>
              <StatusBadge value={item.paymentStatus} />
              <StatusBadge value={item.deliveryStatus} />
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F8F8" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F8F8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: "800", color: "#222" },
  errorText: { color: "#C62828", textAlign: "center", marginTop: 12 },
  listContent: { padding: 16, paddingTop: 4, flexGrow: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 80, gap: 12 },
  emptyText: { color: "#999", fontSize: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  orderNumber: { fontWeight: "700", fontSize: 14, color: "#222" },
  date: { fontSize: 12, color: "#999" },
  cardBottomRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  itemsCount: { fontSize: 13, color: "#777" },
  total: { fontSize: 14, fontWeight: "700", color: "#222" },
  badgeRow: { flexDirection: "row", gap: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  badgePositive: { backgroundColor: "#E8F5E9" },
  badgeTextPositive: { color: "#2e7d32" },
  badgeNeutral: { backgroundColor: "#FFF3E0" },
  badgeTextNeutral: { color: "#e65100" },
  badgeNegative: { backgroundColor: "#FDECEA" },
  badgeTextNegative: { color: "#C62828" },
});
