import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { IProduct } from "../../types/backendType";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Default width for a 2-column grid (screen - 2×16 side padding - 12 gap between cols)
const GRID_CARD_WIDTH = Math.floor((SCREEN_WIDTH - 16 * 2 - 12) / 2);

interface ProductCardProps {
  product: IProduct;
  onPress?: (product: IProduct) => void;
  onAddToCart?: (product: IProduct) => void;
  /** Override card width. Defaults to half-screen grid width. */
  cardWidth?: number;
}

export default function ProductCard({
  product,
  onPress,
  onAddToCart,
  cardWidth = GRID_CARD_WIDTH,
}: ProductCardProps) {
  const imageHeight = Math.round(cardWidth * 0.9);

  const imageUrl =
    product.imageUrl ||
    "https://placehold.co/400x400/F5F5F5/D81E5B?text=No+Image";

  const isAvailable =
    product.stockQuantity > 0 && product.status !== "OUT_OF_STOCK";

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      onPress={() => onPress?.(product)}
      activeOpacity={0.86}
    >
      {/* ── Product image ── */}
      <View style={[styles.imageBox, { width: cardWidth, height: imageHeight }]}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: cardWidth, height: imageHeight }}
          resizeMode="cover"
        />

        {/* Out-of-stock ribbon */}
        {!isAvailable && (
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText}>Sold Out</Text>
          </View>
        )}
      </View>

      {/* ── Info ── */}
      <View style={styles.info}>
        {/* Name */}
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Brand */}
        <Text style={styles.brand} numberOfLines={1}>
          {product.manufacturerName || "PlanAmWell"}
        </Text>

        {/* Price + Add button — flex space-between */}
        <View style={styles.bottomRow}>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>₦{product.price?.toLocaleString()}</Text>
            <Text
              style={[
                styles.stockLabel,
                isAvailable ? styles.inStock : styles.outOfStock,
              ]}
            >
              {isAvailable ? "In stock" : "Unavailable"}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.addBtn, !isAvailable && styles.addBtnDisabled]}
            onPress={() => isAvailable && onAddToCart?.(product)}
            disabled={!isAvailable}
            activeOpacity={0.8}
          >
            <Feather
              name="shopping-cart"
              size={13}
              color={isAvailable ? "#FFF" : "#AAA"}
            />
            <Text style={[styles.addBtnText, !isAvailable && styles.addBtnTextDisabled]}>
              Add
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.09,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  imageBox: {
    backgroundColor: "#F0F0F0",
    position: "relative",
  },

  ribbon: {
    position: "absolute",
    top: 10,
    left: 0,
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  ribbonText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  info: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    lineHeight: 20,
    marginBottom: 3,
  },
  brand: {
    fontSize: 12,
    color: "#999",
    marginBottom: 10,
  },

  // Bottom row: price block left, Add button right
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  priceBlock: {
    flex: 1,
  },
  price: {
    fontSize: 15,
    fontWeight: "800",
    color: "#D81E5B",
    marginBottom: 2,
  },
  stockLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  inStock: { color: "#10B981" },
  outOfStock: { color: "#EF4444" },

  // Add button
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#D81E5B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: "#D81E5B",
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  addBtnDisabled: {
    backgroundColor: "#EFEFEF",
    shadowOpacity: 0,
    elevation: 0,
  },
  addBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  addBtnTextDisabled: {
    color: "#AAA",
  },
});
