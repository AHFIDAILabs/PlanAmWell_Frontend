import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { IDoctor } from "../../types/backendType";
import { StackNavigationProp } from "@react-navigation/stack";
import { AppStackParamList } from "../../types/App";

interface DoctorBottomBarProps {
  activeRoute: string;
  messagesCount?: number;
}



const DoctorBottomBar = ({ activeRoute, messagesCount = 0 }: DoctorBottomBarProps) => {
const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth(); // Get logged-in doctor

  const tabs = [
    { name: "Home", icon: "home-outline", route: "DoctorDashScreen" },
    { name: "Appointments", icon: "calendar-outline", route: "DoctorAppointment" },
    { name: "Messages", icon: "chatbubble-outline", route: "DoctorMessagesScreen" },
    { name: "Profile", icon: "person-outline", route: "DoctorProfileScreen" },
  ];

  const openAddAppointment = () => console.log("Add New Appointment");

const handleNavigate = (tab: typeof tabs[0]) => {
  if (tab.route === "DoctorProfileScreen") {
    // Extract doctor from AuthEntity
    const doctor = (user as any)?.doctor || user; // fallback if user is doctor itself
    if (!doctor) {
      console.warn("No doctor found in user object");
      return;
    }
    (navigation.navigate as any)(tab.route, { doctor });
  } else {
    (navigation.navigate as any)(tab.route);
  }
};

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const isActive = activeRoute === tab.route;
          const color = isActive ? colors.primary : colors.text;

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabButton}
              onPress={() => handleNavigate(tab)}
            >
              <Ionicons name={tab.icon as any} size={24} color={color} />
              <Text style={[styles.tabLabel, { color }]}>{tab.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Messages Badge */}
      {messagesCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{messagesCount > 99 ? "99+" : messagesCount}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default DoctorBottomBar;

const styles = StyleSheet.create({
  safeArea: {
    borderTopWidth: 0.5,
    borderTopColor: "#EEE",
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 5,
    position: "relative",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },

  badge: {
    position: "absolute",
    bottom: 52,
    right: "38%",
    backgroundColor: "#D81E5B",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});
