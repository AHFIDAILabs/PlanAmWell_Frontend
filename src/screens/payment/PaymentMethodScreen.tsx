import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../../hooks/useAuth";
import { paymentService } from "../../services/payment";
import { AppStackParamList } from "../../types/App";

type NavigationProp = StackNavigationProp<AppStackParamList>;
type PaymentRouteProp = RouteProp<AppStackParamList, "PaymentMethodScreen">;

const PaymentMethodScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentRouteProp>();
  const { userToken } = useAuth();

  const { orderId, amount } = route.params;

  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  /* ───────────────────────── Fetch methods ───────────────────────── */

  const fetchPaymentMethods = async () => {
    try {
      const res = await paymentService.getPaymentMethods(userToken!);
      const data = res.data ?? [];

      setMethods(data);

      const defaultMethod = data.find((m: any) => m.isDefault);
      if (defaultMethod) {
        setSelectedMethodId(defaultMethod._id);
      }
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load payment methods",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  /* ───────────────────────── Actions ───────────────────────── */

  const makeDefault = async (id: string) => {
    try {
      await paymentService.setDefaultPaymentMethod(userToken!, id);
      Toast.show({ type: "success", text1: "Default updated" });
      fetchPaymentMethods();
    } catch {
      Toast.show({ type: "error", text1: "Failed to update default" });
    }
  };

  const deleteMethod = (id: string) => {
    Alert.alert(
      "Delete Payment Method",
      "Are you sure you want to remove this payment method?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await paymentService.deletePaymentMethod(userToken!, id);
              Toast.show({ type: "success", text1: "Payment method removed" });
              fetchPaymentMethods();
            } catch {
              Toast.show({ type: "error", text1: "Failed to delete method" });
            }
          },
        },
      ]
    );
  };

  const handlePay = async () => {
    if (!selectedMethodId) {
      Toast.show({
        type: "info",
        text1: "Select a payment method",
      });
      return;
    }

    setProcessing(true);
    try {
      const res = await paymentService.initiatePayment(userToken!, {
        orderId,
        paymentMethod: "card",
      });

      const checkoutUrl = res?.data?.checkoutUrl;
      if (!checkoutUrl) throw new Error("No checkout URL");

      navigation.navigate("WebViewScreen", { url: checkoutUrl });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Payment failed",
        text2: err.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  /* ───────────────────────── Render Item ───────────────────────── */

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selectedMethodId === item._id;

    return (
      <TouchableOpacity
        style={[styles.cardItem, isSelected && styles.selectedCard]}
        onPress={() => setSelectedMethodId(item._id)}
      >
        <View style={styles.cardLeft}>
          <View style={styles.cardIcon} />
          <View>
            <Text style={styles.cardNumber}>
              •••• •••• •••• {item.last4}
            </Text>
            {item.expiryMonth && item.expiryYear && (
              <Text style={styles.cardExpiry}>
                Expires {item.expiryMonth}/{item.expiryYear}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.cardRight}>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => makeDefault(item._id)}
          >
            <Feather name="edit-2" size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => deleteMethod(item._id)}
          >
            <Feather name="trash-2" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  /* ───────────────────────── UI ───────────────────────── */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D81E5B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={methods}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addNewBtn}
            // onPress={() => navigation.navigate("AddPaymentMethodScreen")}
          >
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

/* ───────────────────────── Styles ───────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 20 },
  cardItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  selectedCard: {
    borderColor: "#D81E5B",
    backgroundColor: "#FFF5F8",
  },
  cardLeft: { flexDirection: "row", alignItems: "center" },
  cardIcon: { width: 32, height: 20, borderRadius: 4, backgroundColor: "#CCC" },
  cardNumber: { fontSize: 16, fontWeight: "600" },
  cardExpiry: { fontSize: 12, color: "#888" },
  cardRight: { flexDirection: "row", alignItems: "center" },
  defaultBadge: {
    backgroundColor: "#FFE6EC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 10,
  },
  defaultText: { fontSize: 10, fontWeight: "700", color: "#D81E5B" },
  actionBtn: { marginLeft: 10 },
  addNewBtn: {
    backgroundColor: "#D81E5B",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  addNewText: { color: "#FFF", fontWeight: "700" },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    backgroundColor: "#FFF",
  },
  payBtn: {
    backgroundColor: "#D81E5B",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  payText: { color: "#FFF", fontWeight: "700" },
});

export default PaymentMethodScreen;
