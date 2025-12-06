import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { HelpCircle, Phone, Mail, MessageSquare, FileText } from "lucide-react-native";
import Header from "../../components/home/header"; // Adjust path based on your project
import { SafeAreaView } from "react-native-safe-area-context";
import BottomBar from "../../components/common/BottomBar";

const HelpSupportScreen: React.FC = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
    <ScrollView style={styles.container}>
      <Header title="Help & Support" />

      {/* Support Options */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Support Options</Text>

        <MenuItem title="Help Center" icon={<HelpCircle size={20} />} />
        <MenuItem title="Contact Support" icon={<Phone size={20} />} />
        <MenuItem title="Email Us" icon={<Mail size={20} />} />
        <MenuItem title="Live Chat" icon={<MessageSquare size={20} />} />
      </View>

      {/* Legal Documentation */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Legal</Text>

        <MenuItem title="Terms & Conditions" icon={<FileText size={20} />} />
        <MenuItem title="Privacy Policy" icon={<FileText size={20} />} />
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
    <BottomBar activeRoute="HelpSupportScreen" cartItemCount={0} />
    
    </SafeAreaView>
  );
};

// ----- Reusable Menu Component -----

interface MenuProps {
  title: string;
  icon?: React.ReactNode;
}

const MenuItem: React.FC<MenuProps> = ({ title, icon }) => (
  <TouchableOpacity style={styles.menuRow}>
    <View style={styles.menuLeft}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={styles.menuText}>{title}</Text>
    </View>
  </TouchableOpacity>
);

// ---- Styles ----

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F7F7F7",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#444",
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    width: 26,
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    color: "#333",
  },
});

export default HelpSupportScreen;
