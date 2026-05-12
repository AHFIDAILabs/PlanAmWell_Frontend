import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { IProduct } from "../../types/backendType";

interface ProductCardProps {
  product: IProduct;
  onPress?: (product: IProduct) => void;
  onAddToCart?: (product: IProduct) => void;
}

export default function ProductCard({ product, onPress, onAddToCart }: ProductCardProps) {
  const imageUrl =
    product.imageUrl || "https://placehold.co/300x200/F8F8F8/D81E5B?text=Product";

  const isAvailable = product.stockQuantity > 0 && product.status !== "OUT_OF_STOCK";

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(product)} activeOpacity={0.88}>
      {/* Image */}
      <View style={styles.imageWrapper}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        {!isAvailable && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>Sold Out</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.brand} numberOfLines={1}>
          {product.manufacturerName || "PlanAmWell"}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.price}>₦{product.price?.toLocaleString()}</Text>
          <TouchableOpacity
            style={[styles.cartBtn, !isAvailable && styles.cartBtnDisabled]}
            onPress={() => onAddToCart?.(product)}
            disabled={!isAvailable}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={isAvailable ? "shopping-cart" : "x"}
              size={14}
              color={isAvailable ? "#FFF" : "#AAA"}
            />
          </TouchableOpacity>
        </View>

        <Text style={[styles.stock, isAvailable ? styles.inStock : styles.outOfStock]}>
          {isAvailable ? `${product.stockQuantity} in stock` : "Unavailable"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    flex: 1,
  },

  imageWrapper: {
    width: "100%",
    height: 110,
    backgroundColor: "#F5F5F5",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  soldOutText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.5,
  },

  body: {
    padding: 10,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
    lineHeight: 18,
    marginBottom: 3,
  },
  brand: {
    fontSize: 11,
    color: "#888",
    marginBottom: 8,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: "800",
    color: "#D81E5B",
    flexShrink: 1,
  },
  cartBtn: {
    backgroundColor: "#D81E5B",
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    shadowColor: "#D81E5B",
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  cartBtnDisabled: {
    backgroundColor: "#EEE",
    shadowOpacity: 0,
    elevation: 0,
  },

  stock: {
    fontSize: 11,
    fontWeight: "600",
  },
  inStock: { color: "#10B981" },
  outOfStock: { color: "#EF4444" },
});
