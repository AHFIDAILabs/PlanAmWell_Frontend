// components/common/BottomBar.tsx
import React, { useContext, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { CartContext } from "../../context/CartContext";
import CartModal from "../product/cartModal";

interface BottomBarProps {
    activeRoute: string;
    cartItemCount?: number;
}

// ── Primary 5 tabs always visible ────────────────────────────────────────────
const PRIMARY_TABS = [
    { name: "Home",    icon: "home",          route: "HomeScreen" },
    { name: "Doctors", icon: "user-check",    route: "AllDoctorScreen" },
    { name: "Cart",    icon: "shopping-cart", route: null, isCart: true },
    { name: "Shop",    icon: "box",           route: "ProductsScreen" },
    { name: "More",    icon: "grid",          route: null, isMore: true },
];

// ── Secondary items shown in the "More" sheet ─────────────────────────────────
const MORE_ITEMS = [
    { name: "My Chat",    icon: "message-circle", route: "ConversationsListScreen" },
    { name: "Schedule",  icon: "calendar",        route: "MyAppointments" },
    { name: "Alerts",    icon: "bell",            route: "NotificationsScreen" },
    { name: "Profile",   icon: "user",            route: "ProfileScreen" },
    { name: "Partners",  icon: "users",           route: "AllActivePartnerScreen" },
    { name: "History",   icon: "clock",           route: "ConsultationHistory" },
];

const BottomBar = ({ activeRoute }: BottomBarProps) => {
    const navigation    = useNavigation();
    const { cart }      = useContext(CartContext);
    const [cartVisible, setCartVisible] = useState(false);
    const [moreVisible, setMoreVisible] = useState(false);
    const cartCount = cart?.items?.length ?? 0;

    const navigate = (route: string) => {
        setMoreVisible(false);
        if (route === "HomeScreen") {
            navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "HomeScreen" }] }));
        } else {
            navigation.navigate(route as never);
        }
    };

    const handlePrimary = (tab: typeof PRIMARY_TABS[0]) => {
        if (tab.isCart)  { setCartVisible(true); return; }
        if (tab.isMore)  { setMoreVisible(true); return; }
        if (tab.route)   { navigate(tab.route); }
    };

    return (
        <>
            <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
                <View style={styles.bar}>
                    {PRIMARY_TABS.map((tab) => {
                        const active = activeRoute === tab.route;
                        const color  = active ? "#D81E5B" : "#777";

                        return (
                            <TouchableOpacity
                                key={tab.name}
                                style={[styles.tab, active && styles.tabActive]}
                                onPress={() => handlePrimary(tab)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.iconWrap}>
                                    <Feather name={tab.icon as any} size={22} color={color} />
                                    {tab.isCart && cartCount > 0 && (
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>
                                                {cartCount > 99 ? "99+" : cartCount}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.label, { color }]} numberOfLines={1}>
                                    {tab.name}
                                </Text>
                                {active && <View style={styles.activeDot} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </SafeAreaView>

            {/* Cart modal */}
            <CartModal visible={cartVisible} onClose={() => setCartVisible(false)} />

            {/* "More" bottom sheet */}
            <Modal
                visible={moreVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setMoreVisible(false)}
            >
                <Pressable style={styles.overlay} onPress={() => setMoreVisible(false)}>
                    <SafeAreaView style={styles.sheet} edges={["bottom"]}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>More</Text>
                        <View style={styles.grid}>
                            {MORE_ITEMS.map((item) => (
                                <TouchableOpacity
                                    key={item.name}
                                    style={styles.gridItem}
                                    onPress={() => navigate(item.route)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.gridIcon}>
                                        <Feather name={item.icon as any} size={22} color="#D81E5B" />
                                    </View>
                                    <Text style={styles.gridLabel}>{item.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </SafeAreaView>
                </Pressable>
            </Modal>
        </>
    );
};

export default BottomBar;

const styles = StyleSheet.create({
    safeArea:   { backgroundColor: "#FFF", borderTopWidth: 0.8, borderTopColor: "#EEE" },
    bar:        { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 4 },

    tab: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 4,
        borderRadius: 12,
        position: "relative",
        minHeight: 52,
    },
    tabActive:  { backgroundColor: "#FFF0F6" },

    iconWrap:   { position: "relative", width: 28, height: 28, alignItems: "center", justifyContent: "center" },

    label:      { fontSize: 10, marginTop: 3, fontWeight: "600", letterSpacing: 0.2 },

    activeDot:  { position: "absolute", bottom: -2, width: 4, height: 4, borderRadius: 2, backgroundColor: "#D81E5B" },

    badge: {
        position: "absolute", top: -4, right: -6,
        backgroundColor: "#D81E5B",
        minWidth: 16, height: 16, borderRadius: 8,
        paddingHorizontal: 3, justifyContent: "center", alignItems: "center",
        zIndex: 20,
    },
    badgeText:  { color: "#FFF", fontSize: 9, fontWeight: "bold" },

    // More sheet
    overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    sheet:      { backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#DDD", alignSelf: "center", marginBottom: 16 },
    sheetTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 16 },

    grid:       { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    gridItem:   { width: "30%", alignItems: "center", paddingVertical: 12 },
    gridIcon:   { width: 52, height: 52, borderRadius: 14, backgroundColor: "#FFF0F6", justifyContent: "center", alignItems: "center", marginBottom: 6 },
    gridLabel:  { fontSize: 12, fontWeight: "600", color: "#1A1A1A", textAlign: "center" },
});
