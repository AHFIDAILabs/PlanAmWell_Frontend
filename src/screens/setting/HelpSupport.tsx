import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import {
  HelpCircle,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  ChevronRight,
  MessageCircle,
} from "lucide-react-native";
import Header from "../../components/home/header";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomBar from "../../components/common/BottomBar";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AppStackParamList } from "../../types/App";

const SUPPORT_EMAIL = "support@planamwell.com";
const SUPPORT_PHONE = "+2348000000000";
const SUPPORT_WHATSAPP = "2348000000000"; // international format without +

const HelpSupportScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();

  const openEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=PlanAmWell Support`).catch(() =>
      Alert.alert("Email", `Please email us at: ${SUPPORT_EMAIL}`)
    );
  };

  const openPhone = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() =>
      Alert.alert("Contact", `Please call us at: ${SUPPORT_PHONE}`)
    );
  };

  const openFAQ = () => {
    Alert.alert(
      "Help Center",
      "Our full Help Center is available at support.planamwell.com. We're here to help!",
      [{ text: "OK" }]
    );
  };

  const openLiveChat = () => {
    Alert.alert(
      "Live Chat",
      "Live chat is available Monday–Friday, 8am–6pm WAT. Please email us outside those hours.",
      [
        { text: "Email Instead", onPress: openEmail },
        { text: "OK" },
      ]
    );
  };

  const openWhatsApp = () => {
    const msg = encodeURIComponent("Hello PlanAmWell Support, I need help with the app.");
    Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}?text=${msg}`).catch(() =>
      Alert.alert("WhatsApp", `Please message us on WhatsApp at ${SUPPORT_PHONE}`)
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <Header title="Help & Support" />

        {/* Support Options */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Support Options</Text>

          <MenuItem
            title="Help Center"
            subtitle="Browse FAQs and guides"
            icon={<HelpCircle size={20} color="#3B82F6" />}
            onPress={openFAQ}
          />
          <MenuItem
            title="Call Support"
            subtitle={SUPPORT_PHONE}
            icon={<Phone size={20} color="#10B981" />}
            onPress={openPhone}
          />
          <MenuItem
            title="Email Us"
            subtitle={SUPPORT_EMAIL}
            icon={<Mail size={20} color="#D81E5B" />}
            onPress={openEmail}
          />
          <MenuItem
            title="Live Chat"
            subtitle="Mon–Fri, 8am–6pm WAT"
            icon={<MessageSquare size={20} color="#8B5CF6" />}
            onPress={openLiveChat}
          />
          <MenuItem
            title="WhatsApp Support"
            subtitle="Quick reply, works on slow connections"
            icon={<MessageCircle size={20} color="#25D366" />}
            onPress={openWhatsApp}
            isLast
          />
        </View>

        {/* Legal Documentation */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <MenuItem
            title="Terms & Conditions"
            icon={<FileText size={20} color="#6B7280" />}
            onPress={() => navigation.navigate("TermsOfServiceScreen")}
          />
          <MenuItem
            title="Privacy Policy"
            icon={<FileText size={20} color="#6B7280" />}
            onPress={() => navigation.navigate("PrivacyPolicyScreen")}
            isLast
          />
        </View>

        {/* App version */}
        <Text style={styles.version}>PlanAmWell v1.0.0</Text>

        <View style={{ height: 30 }} />
      </ScrollView>
      <BottomBar activeRoute="HelpSupportScreen" cartItemCount={0} />
    </SafeAreaView>
  );
};

// ----- Reusable Menu Component -----

interface MenuProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
}

const MenuItem: React.FC<MenuProps> = ({ title, subtitle, icon, onPress, isLast }) => (
  <TouchableOpacity
    style={[styles.menuRow, !isLast && styles.menuBorder]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.menuLeft}>
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <View>
        <Text style={styles.menuText}>{title}</Text>
        {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
      </View>
    </View>
    <ChevronRight size={18} color="#C4C4C4" />
  </TouchableOpacity>
);

// ---- Styles ----

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F7F7F7" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#444",
    marginVertical: 12,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  menuBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  menuLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuText: { fontSize: 15, color: "#333", fontWeight: "500" },
  menuSub: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  version: { textAlign: "center", color: "#C4C4C4", fontSize: 12, marginBottom: 8 },
});

export default HelpSupportScreen;
