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

const BASE_FLIP_INTERVAL_MS = 3200;
// Each tile starts on a different item and flips on a slightly offset timer,
// so the row doesn't flip in perfect unison on every cycle.
const STAGGER_MS = 260;

// A small set of task-oriented shortcuts, grouped by what a patient is
// trying to do rather than by which part of the catalog it lives in. Each
// tile hangs from a rope and cycles through all four actions on its own, so
// the full set is visible across the row over time instead of being fixed
// one-to-one with a position.
export default function QuickActionsRow() {
  const navigation = useNavigation<HomeNavigation>();

  return (
    <View style={styles.wrapper}>
      <View style={styles.rail} />
      <View style={styles.row}>
        {ACTIONS.map((_, position) => (
          <QuickActionFlipTile
            key={position}
            items={ACTIONS}
            startIndex={position}
            intervalMs={BASE_FLIP_INTERVAL_MS + position * STAGGER_MS}
            onSelect={(action) => navigation.navigate(action.route as never)}
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
