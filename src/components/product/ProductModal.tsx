import React from "react";
import {
  Modal,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { IProduct } from "../../types/backendType";

interface ProductModalProps {
  visible: boolean;
  product: IProduct | null;
  onClose: () => void;
  onAddToCart?: (product: IProduct) => void;
}

export default function ProductModal({
  visible,
  product,
  onClose,
  onAddToCart,
}: ProductModalProps) {
  if (!product) return null;

  const imageUrl =
    product.imageUrl ||
    "https://placehold.co/600x300/F0F0F0/D81E5B?text=No+Image";

  const isAvailable =
    product.stockQuantity > 0 && product.status !== "OUT_OF_STOCK";

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={24} color="#111" />
            </TouchableOpacity>

            <Image source={{ uri: imageUrl }} style={styles.image} />

            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.manufacturer}>
              {product.manufacturerName || "PlanAmWell"}
            </Text>
            <Text style={styles.price}>₦{product.price?.toLocaleString()}</Text>
            <Text style={[styles.stockStatus, isAvailable ? styles.inStock : styles.outOfStock]}>
              {isAvailable
                ? `${product.stockQuantity} in stock`
                : "Out of Stock"}
            </Text>

            {isAvailable && onAddToCart && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => onAddToCart(product)}
              >
                <Feather name="shopping-cart" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Add to Cart</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    padding: 20,
  },
  closeBtn: {
    alignSelf: "flex-end",
  },
  image: {
    width: "100%",
    height: 250,
    borderRadius: 20,
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 5,
  },
  manufacturer: {
    fontSize: 14,
    color: "#777",
    marginBottom: 10,
  },
  price: {
    fontSize: 20,
    fontWeight: "900",
    color: "#D81E5B",
    marginBottom: 10,
  },
  stockStatus: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 15,
  },
  inStock: {
    color: "#10B981",
  },
  outOfStock: {
    color: "#EF4444",
  },
  addBtn: {
    backgroundColor: "#D81E5B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 30,
    gap: 8,
    marginBottom: 20,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
