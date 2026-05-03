import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Shield, Lock, EyeOff, Trash2, Download, Cookie } from "lucide-react-native";
import Header from "../../components/home/header";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomBar from "../../components/common/BottomBar";
import { useAuth } from "../../hooks/useAuth";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY } from "../../services/Auth";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

const PrivacySettingsScreen: React.FC = () => {
  const [showActivity, setShowActivity] = useState(true);
  const [personalization, setPersonalization] = useState(true);
  const [dataShare, setDataShare] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const { handleLogout } = useAuth();
  const navigation = useNavigation();

  const openDeleteModal = () => {
    setPassword("");
    setDeleteModalVisible(true);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", style: "destructive", onPress: openDeleteModal },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (!password.trim()) {
      Toast.show({ type: "error", text1: "Please enter your password." });
      return;
    }

    setDeleting(true);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      await axios.delete(`${SERVER_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password },
      });

      setDeleteModalVisible(false);
      Toast.show({ type: "success", text1: "Account deleted." });

      // Brief delay to show the toast, then logout
      setTimeout(async () => {
        await handleLogout();
        navigation.reset({ index: 0, routes: [{ name: "AuthStack" as never }] });
      }, 1200);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to delete account. Please try again.";
      Toast.show({ type: "error", text1: "Error", text2: msg });
    } finally {
      setDeleting(false);
    }
  };

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

          <MenuItem
            title="Download Account Data"
            icon={<Download size={20} />}
            onPress={() =>
              Toast.show({
                type: "info",
                text1: "Data Export",
                text2: "We'll email your data to your registered address within 48 hours.",
              })
            }
          />
          <MenuItem
            title="Manage Cookies"
            icon={<Cookie size={20} />}
            onPress={() =>
              Alert.alert(
                "Cookie Settings",
                "PlanAmWell only uses essential cookies required for the app to function. No advertising cookies are used.",
                [{ text: "OK" }]
              )
            }
          />
          <MenuItem
            title="Delete My Account"
            icon={<Trash2 size={20} color="#D81E5B" />}
            highlighted
            onPress={confirmDeleteAccount}
          />
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Delete Account Password Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Account Deletion</Text>
            <Text style={styles.modalSubtitle}>
              Enter your password to permanently delete your account. This cannot be undone.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Your password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.deleteBtn, deleting && { opacity: 0.7 }]}
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteBtnText}>Delete My Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalBtn}
              onPress={() => setDeleteModalVisible(false)}
              disabled={deleting}
            >
              <Text style={styles.cancelModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  onPress?: () => void;
}

const MenuItem: React.FC<MenuProps> = ({ title, icon, highlighted, onPress }) => (
  <TouchableOpacity
    style={[styles.menuRow, highlighted && styles.highlightedRow]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.menuLeft}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.menuText, highlighted && styles.highlightedText]}>{title}</Text>
    </View>
  </TouchableOpacity>
);

// ------- Styles -------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7", padding: 16 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#333", marginBottom: 12 },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  menuLeft: { flexDirection: "row", alignItems: "center" },
  menuText: { fontSize: 15, color: "#333" },
  icon: { width: 26, marginRight: 10 },
  highlightedRow: { backgroundColor: "#FFF1F5", borderRadius: 10, paddingHorizontal: 8 },
  highlightedText: { color: "#D81E5B", fontWeight: "700" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: "#6B7280", lineHeight: 20, marginBottom: 20 },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
    marginBottom: 16,
  },
  deleteBtn: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  deleteBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelModalBtn: { paddingVertical: 12, alignItems: "center" },
  cancelModalText: { color: "#6B7280", fontWeight: "600", fontSize: 15 },
});

export default PrivacySettingsScreen;
