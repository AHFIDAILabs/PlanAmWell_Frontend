import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { IProduct } from "../../types/backendType";

interface ProductCardProps {
  product: IProduct;
  onPress?: (product: IProduct) => void;
  onAddToCart?: (product: IProduct) => void;
}

export default function ProductCard({
  product,
  onPress,
  onAddToCart,
}: ProductCardProps) {
  const handlePress = () => onPress?.(product);
  const handleAddToCart = () => onAddToCart?.(product);

  const imageUrl =
    product.imageUrl ||
    "https://placehold.co/600x300/F0F0F0/D81E5B?text=No+Image";

  const isAvailable =
    product.stockQuantity > 0 && product.status !== "OUT_OF_STOCK";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      
      <View style={styles.imageWrapper}>
        <Image source={{ uri: imageUrl }} style={styles.image} />
      </View>

   
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {product.name}
        </Text>

        <Text style={styles.manufacturer} numberOfLines={1}>
          {product.manufacturerName || "PlanAmWell"}
        </Text>

        <Text style={styles.price}>₦{product.price?.toLocaleString()}</Text>

     
        <Text
          style={[
            styles.stockStatus,
            isAvailable ? styles.inStock : styles.outOfStock,
          ]}
        >
          {isAvailable
            ? `${product.stockQuantity} in stock`
            : "Out of Stock"}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.addBtn,
          !isAvailable && styles.addBtnDisabled,
        ]}
        onPress={handleAddToCart}
        disabled={!isAvailable}
        activeOpacity={0.7}
      >
        <Feather
          name="shopping-cart"
          size={18}
          color={isAvailable ? "#fff" : "#999"}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 26,
    width: "95%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  imageWrapper: {
    width: "100%",
    height: 180,
    overflow: "hidden",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  content: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
  },

  manufacturer: {
    fontSize: 13,
    color: "#777",
    marginTop: 3,
  },

  price: {
    fontSize: 18,
    color: "#D81E5B",
    fontWeight: "900",
    marginTop: 8,
  },

  stockStatus: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
  },

  inStock: {
    color: "#10B981",
  },

  outOfStock: {
    color: "#EF4444",
  },

  addBtn: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#D81E5B",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#D81E5B",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },

  addBtnDisabled: {
    backgroundColor: "#E5E5E5",
  },
});
