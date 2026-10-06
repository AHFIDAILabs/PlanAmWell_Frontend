import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNotifications } from "../../context/notificatonContext";
import { AppStackParamList } from "../../types/App";

type NavigationProp = StackNavigationProp<AppStackParamList, "NotificationsScreen">;

interface HomeGreetingProps {
  name: string;
  highlight: boolean;
}

// The screen's opening moment. The greeting is the first thing a returning
// patient reads, so it carries the primary visual weight here. The app name
// stays present but small, since the user already knows which app they are
// in; the confidentiality line reinforces the one promise this product is
// built on, right where every session begins.
export default function HomeGreeting({ name, highlight }: HomeGreetingProps) {
  const navigation = useNavigation<NavigationProp>();
  const { unreadCount } = useNotifications();

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.row}>
        <View style={styles.textColumn}>
          <Animated.Text
            entering={FadeInUp.delay(80).duration(600)}
            style={[styles.greeting, highlight && styles.greetingHighlight]}
          >
            Welcome, {name}
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(140).duration(600)} style={styles.wordmark}>
            PlanAmWell
          </Animated.Text>
          <View style={styles.privacyRow}>
            <Feather name="lock" size={12} color="#8A8A8A" />
            <Text style={styles.privacyText}>Private and confidential</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.bell} onPress={() => navigation.navigate("NotificationsScreen")}>
          <Feather name="bell" size={20} color="#D81E5B" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "transparent" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  textColumn: { flex: 1, paddingRight: 12 },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  greetingHighlight: {
    color: "#D81E5B",
  },
  wordmark: {
    fontSize: 13,
    color: "#999",
    marginTop: 2,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  privacyText: {
    fontSize: 12,
    color: "#8A8A8A",
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D81E5B",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
