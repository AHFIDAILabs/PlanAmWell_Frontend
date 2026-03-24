// components/common/BottomBar.tsx
import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { CartContext } from "../../context/CartContext";
import CartModal from "../product/cartModal";

interface BottomBarProps {
  activeRoute: string;
}

const ALL_TABS = [
  { name: "Home", icon: "home", route: "HomeScreen" },
  { name: "Doctors", icon: "heart", route: "AllDoctorScreen" },
  { name: "Cart", icon: "shopping-cart", route: null, isCart: true },
  { name: "Shop", icon: "box", route: "ProductsScreen" },
  { name: "Profile", icon: "user", route: "ProfileScreen" },
  { name: "Partners", icon: "users", route: "AllActivePartnerScreen" },
  { name: "Alerts", icon: "bell", route: "NotificationsScreen" },
  { name: "Chat", icon: "message-circle", route: "ConversationsListScreen" },
  { name: "Schedule", icon: "calendar", route: "MyAppointments" },
  { name: "History", icon: "clock", route: "ConsultationHistory" },
];

// Tabs always shown regardless of active route
const PINNED_ROUTES = ["HomeScreen", null];

const BottomBar = ({ activeRoute }: BottomBarProps) => {
  const navigation = useNavigation();
  const { cart } = useContext(CartContext);
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const cartCount = cart?.items?.length || 0;

  // No random shuffle — order is deterministic
  const getDisplayedTabs = () => {
    const homeTab = ALL_TABS.find((t) => t.route === "HomeScreen")!;
    const cartTab = ALL_TABS.find((t) => t.isCart)!;
    const activeTab = ALL_TABS.find(
      (t) => t.route === activeRoute && t.route !== "HomeScreen" && !t.isCart,
    );

    const pinned = [homeTab, cartTab];
    const rest = ALL_TABS.filter(
      (t) => t !== homeTab && !t.isCart && t !== activeTab,
    );

    const result = [...pinned];
    if (activeTab) result.push(activeTab);

    // Fill remaining slots up to 5 — stable order, no shuffle
    for (const tab of rest) {
      if (result.length >= 5) break;
      result.push(tab);
    }

    return result;
  };

  const displayedTabs = getDisplayedTabs();

  const handleNavigate = (tab: (typeof ALL_TABS)[0]) => {
    if (tab.isCart) {
      setCartModalVisible(true);
      return;
    }

    if (tab.route === "HomeScreen") {
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: "HomeScreen" }] }),
      );
      return;
    }

    if (tab.route) {
      navigation.navigate(tab.route as never);
    }
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {displayedTabs.map((tab) => {
            const isActive = activeRoute === tab.route;
            const color = isActive ? "#D81E5B" : "#777";

            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tabButton}
                onPress={() => handleNavigate(tab)}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrapper}>
                  <Feather name={tab.icon as any} size={22} color={color} />

                  {tab.isCart && cartCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {cartCount > 99 ? "99+" : cartCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tabText, { color }]} numberOfLines={1}>
                  {tab.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      <CartModal
        visible={cartModalVisible}
        onClose={() => setCartModalVisible(false)}
      />
    </>
  );
};

export default BottomBar;

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#fff",
    borderTopWidth: 0.8,
    borderTopColor: "#EEE",
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
  tabText: {
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
    color: "#FFF",
    fontSize: 9,
    fontWeight: "bold",
  },
});
