import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { CartContext } from "../../context/CartContext";
import CartModal from "../product/cartModal";

interface BottomBarProps {
  activeRoute: string;
cartItemCount: number // Mock cart count

}

const BottomBar = ({ activeRoute }: BottomBarProps) => {
  const navigation = useNavigation();
  const { cart } = useContext(CartContext);

  const [cartModalVisible, setCartModalVisible] = useState(false);
const cartCount = cart?.items?.length || 0;
  const openCart = () => setCartModalVisible(true);

  const tabs = [
    { name: "Home", icon: "home", route: "HomeScreen" },
    { name: "Doctors", icon: "heart", route: "AllDoctorScreen" },
    { name: "Cart", icon: "shopping-cart", action: openCart },
    { name: "Products", icon: "box", route: "ProductsScreen" },
    { name: "Profile", icon: "user", route: "ProfileScreen" },
  ];

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {tabs.map((tab) => {
            const isActive = activeRoute === tab.route;
            const color = isActive ? "#D81E5B" : "#777";

            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tabButton}
                onPress={() =>
                  tab.action ? tab.action() : navigation.navigate(tab.route as never)
                }
              >
                {tab.name === "Cart" && cartCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
                  </View>
                )}

                <Feather name={tab.icon as any} size={24} color={color} />
                <Text style={[styles.tabText, { color }]}>{tab.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      <CartModal visible={cartModalVisible} onClose={() => setCartModalVisible(false)} />
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
  container: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 6 },
  tabButton: { flex: 1, alignItems: "center", paddingTop: 8 },
  tabText: { fontSize: 11, marginTop: 4, fontWeight: "600" },
  badge: {
    position: "absolute",
    top: -2,
    right: 25,
    backgroundColor: "#D81E5B",
    width: 20,
    height: 20,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
});
