import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from "react-native";
import { Shield, Lock, EyeOff, Trash2 } from "lucide-react-native";
import Header from "../../components/home/header"; // Adjust the path based on your project
import { SafeAreaView } from "react-native-safe-area-context";
import BottomBar from "../../components/common/BottomBar";

const PrivacySettingsScreen: React.FC = () => {
  const [showActivity, setShowActivity] = useState(true);
  const [personalization, setPersonalization] = useState(true);
  const [dataShare, setDataShare] = useState(false);

  return (
  <SafeAreaView style={{ flex: 1 }}>
  <ScrollView style={styles.container}>
      <Header title="Privacy Settings" />

      {/* Privacy Controls */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Privacy Controls</Text>

        <ToggleItem
          title="Show Activity Status"
          icon={<EyeOff size={20} />}
          value={showActivity}
          onToggle={setShowActivity}
        />

        <ToggleItem
          title="Personalized Recommendations"
          icon={<Shield size={20} />}
          value={personalization}
          onToggle={setPersonalization}
        />

        <ToggleItem
          title="Share Data with Vendors"
          icon={<Lock size={20} />}
          value={dataShare}
          onToggle={setDataShare}
        />
      </View>

      {/* Data Management */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Data Management</Text>

        <MenuItem title="Download Account Data" />
        <MenuItem title="Manage Cookies" />
        <MenuItem
          title="Delete My Account"
          icon={<Trash2 size={20} color="#D81E5B" />}
          highlighted
        />
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
    <BottomBar activeRoute="PrivacySettingsScreen" cartItemCount={0} />
    
    </SafeAreaView>
  );
};

// ------- Reusable Components -------

interface ToggleProps {
  title: string;
  icon?: React.ReactNode;
  value: boolean;
  onToggle: (v: boolean) => void;
}

const ToggleItem: React.FC<ToggleProps> = ({ title, icon, value, onToggle }) => (
  <View style={styles.menuRow}>
    <View style={styles.menuLeft}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={styles.menuText}>{title}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: "#DDD", true: "#D81E5B" }}
      thumbColor="#FFF"
    />
  </View>
);

interface MenuProps {
  title: string;
  icon?: React.ReactNode;
  highlighted?: boolean;
}

const MenuItem: React.FC<MenuProps> = ({ title, icon, highlighted }) => (
  <TouchableOpacity
    style={[styles.menuRow, highlighted && styles.highlightedRow]}
  >
    <View style={styles.menuLeft}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.menuText, highlighted && styles.highlightedText]}>
        {title}
      </Text>
    </View>
  </TouchableOpacity>
);

// ------- Styles -------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    padding: 16,
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
    color: "#333",
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuText: {
    fontSize: 15,
    color: "#333",
  },
  icon: {
    width: 26,
    marginRight: 10,
  },
  highlightedRow: {
    backgroundColor: "#FFF1F5",
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  highlightedText: {
    color: "#D81E5B",
    fontWeight: "700",
  },
});

export default PrivacySettingsScreen;
