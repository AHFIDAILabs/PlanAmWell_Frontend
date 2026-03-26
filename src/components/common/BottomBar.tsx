// components/common/BottomBar.tsx
import React, { useContext, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { CartContext } from "../../context/CartContext";
import CartModal from "../product/cartModal";

interface BottomBarProps {
  activeRoute: string;
  cartItemCount: number;
}

const ALL_TABS = [
  { name: "Home", icon: "home", route: "HomeScreen" },
  { name: "Doctors", icon: "heart", route: "AllDoctorScreen" },
  { name: "Cart", icon: "shopping-cart", route: null, isCart: true },
  { name: "Shop", icon: "box", route: "ProductsScreen" },
  { name: "Chat", icon: "message-circle", route: "ConversationsListScreen" },
  { name: "Schedule", icon: "calendar", route: "MyAppointments" },
  { name: "Alerts", icon: "bell", route: "NotificationsScreen" },
  { name: "Profile", icon: "user", route: "ProfileScreen" },
  { name: "Partners", icon: "users", route: "AllActivePartnerScreen" },
  { name: "History", icon: "clock", route: "ConsultationHistory" },
];

const BottomBar = ({ activeRoute }: BottomBarProps) => {
  const navigation = useNavigation();
  const { cart } = useContext(CartContext);
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const cartCount = cart?.items?.length || 0;
  const scrollRef = useRef<ScrollView>(null);

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
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          bounces={false}
        >
          {ALL_TABS.map((tab) => {
            const isActive = activeRoute === tab.route;
            const color = isActive ? "#D81E5B" : "#777";

            return (
              <TouchableOpacity
                key={tab.name}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => handleNavigate(tab)}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrapper}>
                  <Feather name={tab.icon as any} size={22} color={color} />

                  {/* Cart badge */}
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

                {/* Active indicator dot */}
                {isActive && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginHorizontal: 2,
    borderRadius: 12,
    minWidth: 60,
    position: "relative",
  },
  tabButtonActive: {
    backgroundColor: "#FFF0F6",
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
  activeDot: {
    position: "absolute",
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D81E5B",
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
