import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Rect, Ellipse } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { RADIUS, SHADOW } from "../../theme/layout";

export interface QuickAction {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
}

interface QuickActionFlipTileProps {
  items: QuickAction[];
  startIndex: number;
  intervalMs: number;
  onSelect: (item: QuickAction) => void;
}

const FLIP_DURATION = 600;
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

function TileContent({ item }: { item: QuickAction }) {
  return (
    <>
      <View style={styles.iconCircle}>
        <Feather name={item.icon} size={20} color="#D81E5B" />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {item.label}
      </Text>
    </>
  );
}

// Each tile cycles through the full set of quick actions on its own timer,
// flipping like a single page of a notepad hinged at the top: the current
// face lifts and rotates back and over, and the next item is already
// waiting on the reverse side. Tapping the tile navigates to whichever
// action is showing at that moment.
export default function QuickActionFlipTile({
  items,
  startIndex,
  intervalMs,
  onSelect,
}: QuickActionFlipTileProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex % items.length);
  const progress = useSharedValue(0);

  function advance() {
    setCurrentIndex((i) => (i + 1) % items.length);
  }

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      progress.value = withTiming(
        1,
        { duration: FLIP_DURATION, easing: Easing.inOut(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(advance)();
            progress.value = 0;
          }
        }
      );
    }, intervalMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, intervalMs]);

  const current = items[currentIndex];
  const next = items[(currentIndex + 1) % items.length];

  const frontStyle = useAnimatedStyle(() => ({
    opacity: progress.value < 0.5 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateX: `${-progress.value * 90}deg` }],
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: progress.value >= 0.5 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateX: `${90 - progress.value * 90}deg` }],
  }));

  return (
    <View style={styles.column}>
      <RopeClip />
      <Pressable style={styles.tileWrapper} onPress={() => onSelect(current)}>
        <Animated.View style={[styles.face, frontStyle]}>
          <TileContent item={current} />
        </Animated.View>
        <Animated.View style={[styles.face, styles.faceAbsolute, backStyle]}>
          <TileContent item={next} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1, alignItems: "center" },
  tileWrapper: {
    width: "100%",
    height: TILE_HEIGHT,
  },
  face: {
    width: "100%",
    height: TILE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    paddingHorizontal: 6,
    ...SHADOW.low,
    backfaceVisibility: "hidden",
    transformOrigin: "top",
  },
  faceAbsolute: {
    position: "absolute",
    top: 0,
    left: 0,
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
