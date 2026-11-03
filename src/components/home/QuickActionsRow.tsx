import React from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { AppStackParamList } from "../../types/App";
import QuickActionFlipTile, { QuickAction } from "./QuickActionFlipTile";

type HomeNavigation = NavigationProp<AppStackParamList>;

const ACTIONS: QuickAction[] = [
  { label: "Consult a Doctor", icon: "video", route: "AllDoctorScreen" },
  { label: "Shop Pharmacy", icon: "shopping-bag", route: "ProductsScreen" },
  { label: "Community Hub", icon: "users", route: "CommunityHubScreen" },
  { label: "My Appointments", icon: "calendar", route: "MyAppointments" },
];

// A small set of task-oriented shortcuts, grouped by what a patient is
// trying to do rather than by which part of the catalog it lives in. Each
// tile hangs from a rope and permanently shows its own one action — no
// cycling or flipping.
export default function QuickActionsRow() {
  const navigation = useNavigation<HomeNavigation>();

  return (
    <View style={styles.wrapper}>
      <View style={styles.rail} />
      <View style={styles.row}>
        {ACTIONS.map((action) => (
          <QuickActionFlipTile
            key={action.label}
            item={action}
            onSelect={(selected) => navigation.navigate(selected.route as never)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 24 },
  rail: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C8A165",
    marginHorizontal: 6,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
});
