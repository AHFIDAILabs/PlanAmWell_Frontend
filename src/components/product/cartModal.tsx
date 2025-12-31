import React, { useContext, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  FlatList,
  Dimensions,
  Platform,
} from "react-native";
import { CartContext } from "../../context/CartContext";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AppStackParamList } from "../../types/App";
import { SafeAreaView } from "react-native-safe-area-context";

interface CartModalProps {
  visible: boolean;
  onClose: () => void;
}

type NavigationProp = StackNavigationProp<AppStackParamList>;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const CartModal = ({ visible, onClose }: CartModalProps) => {
  const { cart, removeItem, refreshCart, updateItem } = useContext(CartContext);
  const navigation = useNavigation<NavigationProp>();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      refreshCart();
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const totalAmount =
    cart?.items?.reduce(
      (sum, item) => sum + (Number(item.price ?? 0) * Number(item.quantity ?? 0)),
      0
    ) ?? 0;

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.cartItem}>
      <Text style={styles.itemName}>{item.drugName}</Text>
      <View style={styles.qtyContainer}>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() =>
            item.quantity > 1
              ? updateItem(item.drugId, item.quantity - 1)
              : removeItem(item.drugId)
          }
        >
          <Feather name="minus" size={16} color="#D81E5B" />
        </TouchableOpacity>

        <Text style={styles.qtyText}>{item.quantity}</Text>

        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => updateItem(item.drugId, item.quantity + 1)}
        >
          <Feather name="plus" size={16} color="#D81E5B" />
        </TouchableOpacity>
      </View>

      <Text style={styles.itemPrice}>{item.dosage}</Text>
      <Text style={styles.itemPrice}>₦{item.price}</Text>

      <TouchableOpacity
        onPress={() => removeItem(item.drugId)}
        style={styles.removeBtn}
      >
        <Feather name="trash-2" size={18} color="#D81E5B" />
      </TouchableOpacity>
    </View>
  );

  const handleCheckoutPress = () => {
    onClose();
    navigation.navigate("CheckoutScreen");
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />

      <Animated.View
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Cart</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color="#222" />
          </TouchableOpacity>
        </View>

        {cart?.items?.length ? (
          <>
            <FlatList
              data={cart.items}
              renderItem={renderItem}
              keyExtractor={(item, index) => item.drugId ?? index.toString()}
              contentContainerStyle={{
                paddingBottom: Platform.OS === "ios" ? 120 : 100,
              }}
              style={{ maxHeight: SCREEN_HEIGHT * 0.6 }}
            />

            <SafeAreaView edges={["bottom"]} style={styles.footer}>
              <Text style={styles.totalText}>Total: ₦{totalAmount}</Text>
              <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckoutPress}>
                <Text style={styles.checkoutText}>Checkout</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Feather name="shopping-bag" size={55} color="#D81E5B" />
            <Text style={styles.emptyText}>Your cart is empty</Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

export default CartModal;

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  modalContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 15,
    elevation: 10,
  },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.6,
    borderBottomColor: "#F1F1F1",
  },
  itemName: { flex: 1, fontWeight: "600", fontSize: 15 },
  itemPrice: { marginRight: 15, fontWeight: "700", color: "#D81E5B" },
  removeBtn: { backgroundColor: "#FFE6EC", padding: 6, borderRadius: 6 },
  footer: { paddingVertical: 15, borderTopWidth: 1, borderTopColor: "#EEE", backgroundColor: "#FFF" },
  totalText: { fontSize: 17, fontWeight: "700", marginBottom: 10 },
  checkoutBtn: {
    backgroundColor: "#D81E5B",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  checkoutText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  emptyContainer: { marginTop: 120, justifyContent: "center", alignItems: "center" },
  emptyText: { marginTop: 15, fontSize: 16, color: "#777" },

  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
    backgroundColor: "#FFF5F8",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  qtyBtn: { padding: 5 },
  qtyText: { paddingHorizontal: 8, fontSize: 15, fontWeight: "700", color: "#222" },
});
