import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Rect, Ellipse } from "react-native-svg";
import { RADIUS, SHADOW } from "../../theme/layout";

export interface QuickAction {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
}

interface QuickActionFlipTileProps {
  item: QuickAction;
  onSelect: (item: QuickAction) => void;
}

const TILE_HEIGHT = 92;

// A small rope-and-clothespin illustration hanging above each tile, drawn in
// plain SVG shapes rather than a stock icon.
function RopeClip() {
  return (
    <Svg width={22} height={34} viewBox="0 0 22 34">
      <Path d="M11 0 L11 15" stroke="#B58B5A" strokeWidth={2} />
      <Ellipse cx={11} cy={17} rx={6} ry={3} fill="none" stroke="#8A6639" strokeWidth={1.5} />
      <Rect x={2} y={15} width={7} height={18} rx={3} fill="#C89B65" />
      <Rect x={13} y={15} width={7} height={18} rx={3} fill="#C89B65" />
    </Svg>
  );
}

// Each tile hangs from its own rope and permanently shows one quick action —
// no cycling or flipping. Tapping it navigates straight to that action.
export default function QuickActionFlipTile({ item, onSelect }: QuickActionFlipTileProps) {
  return (
    <View style={styles.column}>
      <RopeClip />
      <Pressable style={styles.tile} onPress={() => onSelect(item)}>
        <View style={styles.iconCircle}>
          <Feather name={item.icon} size={20} color="#D81E5B" />
        </View>
        <Text style={styles.label} numberOfLines={2}>
          {item.label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1, alignItems: "center" },
  tile: {
    width: "100%",
    height: TILE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    paddingHorizontal: 6,
    ...SHADOW.low,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF0F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    lineHeight: 14,
  },
});
