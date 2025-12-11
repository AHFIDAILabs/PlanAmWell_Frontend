// screens/doctor/DoctorProfileScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { IDoctor } from "../../types/backendType";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { notificationService } from "../../services/notification";
import DoctorBottomBar from "../../components/common/DoctorBottomBar";

type DoctorProfileRouteProps = RouteProp<{ params: { doctor?: IDoctor } }, "params">;

export default function DoctorProfileScreen() {
  const route = useRoute<DoctorProfileRouteProps>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user, handleLogout, isDoctor } = useAuth();

  // Fallback: use route param first, then logged-in doctor
  const [doctor, setDoctor] = useState<IDoctor | null>(
    route.params?.doctor || (isDoctor() ? (user as IDoctor) : null)
  );

  const [editVisible, setEditVisible] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  if (!doctor) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, textAlign: "center", marginTop: 50 }}>
          Doctor not found
        </Text>
      </SafeAreaView>
    );
  }

  const fetchNotificationCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      if (response.success) {
        setNotificationCount(response.data.count);
      }
    } catch (error) {
      console.error("Failed to fetch notification count:", error);
    }
  };

  useEffect(() => {
    fetchNotificationCount();
  }, []);

  const getAvatarUri = () => {
    if (avatar) return avatar;
    if (typeof doctor.profileImage === "string") return doctor.profileImage;
    const img: any = doctor.profileImage;
    return (
      img?.imageUrl ||
      img?.secure_url ||
      `https://ui-avatars.com/api/?name=${doctor.firstName}+${doctor.lastName}`
    );
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleLogouts = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await handleLogout();
          navigation.reset({
            index: 0,
            routes: [{ name: "AuthStack" as never }],
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={26} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>

          <TouchableOpacity onPress={handleLogouts}>
            <Ionicons name="log-out-outline" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={pickImage}>
            <Image source={{ uri: getAvatarUri() }} style={styles.avatar} />
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Verified Badge */}
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>
              Dr. {doctor.firstName} {doctor.lastName}
            </Text>
            {(doctor as any).verified && (
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
            )}
          </View>

          {doctor.specialization && (
            <Text style={[styles.specialty, { color: colors.primary }]}>
              {doctor.specialization}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => setEditVisible(true)}
          >
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.actionText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtnOutline, { borderColor: colors.primary }]}>
            <Ionicons name="settings-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionTextOutline, { color: colors.primary }]}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        {doctor.bio && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.sectionText, { color: colors.textMuted }]}>{doctor.bio}</Text>
          </View>
        )}

        {/* Contact */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Info</Text>

          {doctor.email && (
            <View style={styles.infoCard}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>{doctor.email}</Text>
            </View>
          )}

          {doctor.phone && (
            <View style={styles.infoCard}>
              <Ionicons name="call-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>{doctor.phone}</Text>
            </View>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: "#F44336" }]}
          onPress={handleLogouts}
        >
          <Ionicons name="log-out-outline" size={20} color="#F44336" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>

            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="First Name"
              value={doctor.firstName}
              onChangeText={(text) => setDoctor({ ...doctor, firstName: text })}
            />

            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Last Name"
              value={doctor.lastName}
              onChangeText={(text) => setDoctor({ ...doctor, lastName: text })}
            />

            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Bio"
              multiline
              value={doctor.bio}
              onChangeText={(text) => setDoctor({ ...doctor, bio: text })}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Text style={{ color: colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Bar */}
      <DoctorBottomBar activeRoute="DoctorProfileScreen" messagesCount={notificationCount} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },

  profileCard: {
    margin: 20,
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 25,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },

  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 5,
    backgroundColor: "#000",
    padding: 6,
    borderRadius: 20,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },

  name: { fontSize: 22, fontWeight: "700" },

  specialty: { fontSize: 14, fontWeight: "500", marginTop: 4 },

  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },

  actionBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
  },

  actionBtnOutline: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
  },

  actionText: {
    color: "#fff",
    fontWeight: "600",
  },

  actionTextOutline: {
    fontWeight: "600",
  },

  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },

  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 10 },

  sectionText: { fontSize: 14, lineHeight: 20 },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: "rgba(0,0,0,0.03)",
    gap: 10,
  },

  infoText: { fontSize: 14 },

  logoutBtn: {
    marginTop: 40,
    marginHorizontal: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },

  logoutText: {
    color: "#F44336",
    fontWeight: "700",
    fontSize: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000055",
    justifyContent: "flex-end",
  },

  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
});
