// components/common/DoctorBottomBar.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { StackNavigationProp } from "@react-navigation/stack";
import { AppStackParamList } from "../../types/App";

interface DoctorBottomBarProps {
  activeRoute: string;
  messagesCount?: number;
}

const DoctorBottomBar = ({ activeRoute, messagesCount = 0 }: DoctorBottomBarProps) => {
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();

  // ✅ All tabs have a valid route. Short labels prevent overflow.
  const tabs = [
    { name: "Home",     icon: "home-outline",          route: "DoctorDashScreen" },
    { name: "Schedule", icon: "calendar-outline",       route: "DoctorAppointment" },
    { name: "Chat",     icon: "chatbubble-outline",     route: "ConversationsListScreen" },
    { name: "Alerts",   icon: "notifications-outline",  route: "NotificationsScreen" },
    { name: "Profile",  icon: "person-outline",         route: "DoctorProfileScreen" },
  ];

  const handleNavigate = (tab: typeof tabs[0]) => {
    // Reset stack to Home
    if (tab.route === "DoctorDashScreen") {
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: "DoctorDashScreen" }] })
      );
      return;
    }

    // Profile needs doctor data passed
    if (tab.route === "DoctorProfileScreen") {
      const doctor = (user as any)?.doctor || user;
      if (!doctor) return;
      navigation.navigate("DoctorProfileScreen", { doctor } as any);
      return;
    }

    navigation.navigate(tab.route as any);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const isActive = activeRoute === tab.route;
          const color = isActive ? colors.primary : colors.textMuted ?? "#888";

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabButton}
              onPress={() => handleNavigate(tab)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                <Ionicons name={tab.icon as any} size={22} color={color} />
                {/* ✅ Badge sits inside the icon wrapper — reliable positioning */}
                {tab.route === "ConversationsListScreen" && messagesCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {messagesCount > 99 ? "99+" : messagesCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.tabLabel, { color }]}
                numberOfLines={1}
              >
                {tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

export default DoctorBottomBar;

const styles = StyleSheet.create({
  safeArea: {
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 2,
  },
  iconWrapper: {
    position: "relative",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "#D81E5B",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
});