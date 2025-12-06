import React, { useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../context/ThemeContext";

interface DoctorCardProps {
  name: string;
  specialty: string;
  avatar: number | { uri: string };
  rating?: number;
  onPress?: () => void;
  online?: boolean;
}

const DEFAULT_DOC_ASSET = require("../../assets/images/doc_1.jpeg");
const { width } = Dimensions.get("window");
const CARD_SIZE = width * 0.46;

export default function DoctorCard({
  name,
  specialty,
  avatar,
  onPress,
  rating = 4.7,
  online = true,
}: DoctorCardProps) {
  const { darkMode } = useTheme();

  const imageSource =
    typeof avatar === "number"
      ? avatar
      : avatar?.uri
      ? avatar
      : DEFAULT_DOC_ASSET;

  // Press animation
  const scale = useRef(new Animated.Value(1)).current;

  const animatePressIn = () =>
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 12,
    }).start();

  const animatePressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={animatePressIn}
      onPressOut={animatePressOut}
      onPress={onPress}
      style={styles.touchWrapper}
    >
      <Animated.View
        style={[
          styles.card,
          darkMode && styles.cardDark,
          { transform: [{ scale }] },
        ]}
      >
        <LinearGradient
          colors={["#D81E5B33", "#ffffff00"]}
          style={styles.gradientRing}
        >
          <Image source={imageSource} style={styles.avatar} />
        </LinearGradient>

        {online && <View style={styles.onlineBadge} />}

        <Text
          numberOfLines={1}
          style={[styles.name, darkMode && styles.nameDark]}
        >
          {name}
        </Text>

        <Text
          numberOfLines={1}
          style={[styles.specialty, darkMode && styles.specialtyDark]}
        >
          {specialty}
        </Text>

        <View
          style={[
            styles.ratingBox,
            darkMode && styles.ratingBoxDark,
          ]}
        >
          <Feather name="star" size={14} color="#D81E5B" />
          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchWrapper: {
    width: CARD_SIZE,
    alignItems: "center",
  },

  card: {
    width: CARD_SIZE,
    paddingVertical: 20,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },

  cardDark: {
    backgroundColor: "#1A1A1A",
    shadowOpacity: 0.3,
    borderWidth: 1,
    borderColor: "#333",
  },

  gradientRing: {
    padding: 3,
    borderRadius: 100,
    marginBottom: 14,
  },

  avatar: {
    width: CARD_SIZE * 0.5,
    height: CARD_SIZE * 0.5,
    borderRadius: 100,
  },

  onlineBadge: {
    width: 13,
    height: 13,
    backgroundColor: "#4CD964",
    borderRadius: 20,
    position: "absolute",
    top: 26,
    right: 32,
    borderWidth: 2,
    borderColor: "#FFF",
  },

  name: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#111",
  },
  nameDark: {
    color: "#fff",
  },

  specialty: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#777",
    marginTop: 3,
  },
  specialtyDark: {
    color: "#BEBEBE",
  },

  ratingBox: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D81E5B40",
  },

  ratingBoxDark: {
    backgroundColor: "#222",
    borderColor: "#FFD70055",
  },

  ratingText: {
    marginLeft: 4,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#D81E5B",
  },
});
