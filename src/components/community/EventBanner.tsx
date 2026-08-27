import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { EventBannerPreset } from "../../types/backendType";

interface PresetSpec {
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string, ...string[]];
}

// Kept in sync by hand with backend/src/models/Event.ts (EVENT_BANNER_PRESETS)
// and web/src/components/community/EventBanner.tsx — same 5 keys, same
// colors, so a preset picked in the admin dashboard looks the same here.
const PRESETS: Record<EventBannerPreset, PresetSpec> = {
  "support-circle": { icon: "people", colors: ["#d81e5b", "#b10045"] },
  workshop: { icon: "book", colors: ["#feae2c", "#835500"] },
  "qa-session": { icon: "chatbubbles", colors: ["#0b71cd", "#0058a4"] },
  wellness: { icon: "shield-checkmark", colors: ["#d81e5b", "#0b71cd"] },
  celebration: { icon: "star", colors: ["#d81e5b", "#feae2c", "#0b71cd"] },
};

export function EventBanner({
  bannerImage,
  bannerPreset,
  size = "sm",
  style,
}: {
  bannerImage?: { url: string } | null;
  bannerPreset?: EventBannerPreset | null;
  size?: "sm" | "lg";
  style?: any;
}) {
  if (bannerImage?.url) {
    return <Image source={{ uri: bannerImage.url }} style={[styles.fill, style]} resizeMode="cover" />;
  }

  const preset = (bannerPreset && PRESETS[bannerPreset]) || PRESETS.celebration;
  const iconSize = size === "lg" ? 56 : 32;

  return (
    <LinearGradient
      colors={preset.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.fill, styles.center, style]}
    >
      <View style={[styles.blob, size === "lg" ? styles.blobLg : styles.blobSm, styles.blobTopLeft]} />
      <View style={[styles.blob, size === "lg" ? styles.blobLg : styles.blobSm, styles.blobBottomRight]} />
      <Ionicons name={preset.icon} size={iconSize} color="rgba(255,255,255,0.9)" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { width: "100%", height: "100%" },
  center: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  blob: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },
  blobSm: { width: 64, height: 64 },
  blobLg: { width: 120, height: 120 },
  blobTopLeft: { top: -20, left: -20 },
  blobBottomRight: { bottom: -24, right: -12 },
});
