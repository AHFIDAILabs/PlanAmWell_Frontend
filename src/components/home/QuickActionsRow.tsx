import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { AppStackParamList } from "../../types/App";
import { RADIUS, SHADOW } from "../../theme/layout";

type HomeNavigation = NavigationProp<AppStackParamList>;

const ACTIONS: { label: string; icon: keyof typeof Feather.glyphMap; route: keyof AppStackParamList }[] = [
  { label: "Consult a Doctor", icon: "video", route: "AllDoctorScreen" },
  { label: "Shop Pharmacy", icon: "shopping-bag", route: "ProductsScreen" },
  { label: "Community Hub", icon: "users", route: "CommunityHubScreen" },
  { label: "My Appointments", icon: "calendar", route: "MyAppointments" },
];

// A small set of task-oriented shortcuts, grouped by what a patient is
// trying to do rather than by which part of the catalog it lives in. These
// are the four things a returning patient is most likely to want on opening
// the app.
export default function QuickActionsRow() {
  const navigation = useNavigation<HomeNavigation>();

  return (
    <View style={styles.row}>
      {ACTIONS.map((action) => (
        <TouchableOpacity
          key={action.label}
          style={styles.tile}
          activeOpacity={0.8}
          onPress={() => navigation.navigate(action.route as never)}
        >
          <View style={styles.iconCircle}>
            <Feather name={action.icon} size={20} color="#D81E5B" />
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  tile: {
    flex: 1,
    alignItems: "center",
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
