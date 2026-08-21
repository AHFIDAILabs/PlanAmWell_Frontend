// screens/doctor/DoctorProfileScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { IDoctor } from "../../types/backendType";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { notificationService } from "../../services/notification";
import DoctorBottomBar from "../../components/common/DoctorBottomBar";
import { updateDoctorProfile } from "../../services/Doctor";

export default function DoctorProfileScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user, handleLogout, isDoctor, refreshUser } = useAuth();

  const [doctor, setDoctor] = useState<IDoctor | null>(
    isDoctor() ? (user as IDoctor) : null
  );
  const [editVisible, setEditVisible] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [saving, setSaving] = useState(false);

  // Local avatar URI selected from picker (before save)
  const [pickedAvatarUri, setPickedAvatarUri] = useState<string | null>(null);

  // Edit form — separate from displayed doctor so Cancel always restores original
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    contactNumber: "",
    yearsOfExperience: "",
    specialization: "",
  });

  // ─── Hooks must all be before any conditional return ──────────
  useEffect(() => {
    notificationService.getUnreadCount().then((res) => {
      if (res.success) setNotificationCount(res.data.count);
    }).catch(() => {});
  }, []);

  // Sync local doctor state when user changes (e.g. after refresh)
  useEffect(() => {
    if (isDoctor() && user) setDoctor(user as IDoctor);
  }, [user]);

  // ─── Early return after all hooks ─────────────────────────────
  if (!doctor) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, textAlign: "center", marginTop: 50 }}>
          Doctor not found
        </Text>
      </SafeAreaView>
    );
  }

  // ─── Avatar resolution ────────────────────────────────────────
  const getAvatarUri = (): string => {
    if (pickedAvatarUri) return pickedAvatarUri;
    const img: any = doctor.doctorImage;
    if (img?.imageUrl) return img.imageUrl;
    if (img?.secure_url) return img.secure_url;
    if (typeof doctor.profileImage === "string" && doctor.profileImage)
      return doctor.profileImage;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      `${doctor.firstName} ${doctor.lastName}`
    )}&background=D81E5B&color=fff&size=200`;
  };

  // ─── Open edit modal ──────────────────────────────────────────
  const openEdit = () => {
    setEditForm({
      firstName: doctor.firstName ?? "",
      lastName: doctor.lastName ?? "",
      bio: doctor.bio ?? "",
      contactNumber: doctor.contactNumber ?? "",
      yearsOfExperience: doctor.yearsOfExperience?.toString() ?? "",
      specialization: doctor.specialization ?? "",
    });
    setPickedAvatarUri(null);
    setEditVisible(true);
  };

  // ─── Pick image ───────────────────────────────────────────────
  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Toast.show({ type: "error", text1: "Permission denied", text2: "Please enable photo library access." });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });
      if (!result.canceled && result.assets[0]) {
        setPickedAvatarUri(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error("❌ Image picker failed:", error);
      Toast.show({ type: "error", text1: "Could not open image picker", text2: error?.message });
    }
  };

  // ─── Save profile ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      Toast.show({ type: "error", text1: "Name is required." });
      return;
    }

    setSaving(true);
    try {
      const updatedDoctor = await updateDoctorProfile(
        doctor._id.toString(),
        {
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          bio: editForm.bio.trim(),
          contactNumber: editForm.contactNumber.trim(),
          yearsOfExperience: Number(editForm.yearsOfExperience) || undefined,
          specialization: editForm.specialization.trim(),
        } as any,
        undefined,
        pickedAvatarUri ?? undefined
      );

      // Use response data directly (it has doctorImage populated)
      if (updatedDoctor) {
        setDoctor(updatedDoctor);
      }
      // Also sync auth context in background
      refreshUser().catch(() => {});

      Toast.show({ type: "success", text1: "Profile updated!" });
      setEditVisible(false);
      setPickedAvatarUri(null);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Failed to save",
        text2: err?.response?.data?.message || err?.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── Logout ───────────────────────────────────────────────────
  const handleLogoutPress = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await handleLogout();
          navigation.reset({ index: 0, routes: [{ name: "AuthStack" as never }] });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Profile</Text>
          <TouchableOpacity onPress={handleLogoutPress}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* ── Profile Card ── */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.avatarWrap} onPress={() => { openEdit(); }}>
            <Image source={{ uri: getAvatarUri() }} style={styles.avatar} />
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>
              Dr. {doctor.firstName} {doctor.lastName}
            </Text>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          </View>

          <Text style={[styles.specialty, { color: colors.primary }]}>
            {doctor.specialization}
          </Text>

          {doctor.yearsOfExperience != null && (
            <Text style={[styles.experience, { color: colors.textMuted }]}>
              {doctor.yearsOfExperience} year{doctor.yearsOfExperience !== 1 ? "s" : ""} experience
            </Text>
          )}
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={openEdit}
          >
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.actionText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: colors.primary }]}
            onPress={() => (navigation as any).navigate("DoctorAvailability")}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionTextOutline, { color: colors.primary }]}>
              Availability
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── About ── */}
        {doctor.bio ? (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.sectionText, { color: colors.textMuted }]}>{doctor.bio}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.section, styles.emptySection, { backgroundColor: colors.card }]}
            onPress={openEdit}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, marginTop: 6, fontSize: 14 }}>
              Add a bio to help patients know you better
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Contact Info ── */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Info</Text>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>{doctor.email}</Text>
          </View>

          {doctor.contactNumber ? (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>{doctor.contactNumber}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.infoRow} onPress={openEdit}>
              <Ionicons name="call-outline" size={20} color="#9CA3AF" />
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Add contact number</Text>
            </TouchableOpacity>
          )}

          {/* Verification block */}
          <View style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#16A34A" />
              <Text style={styles.verificationTitle}>Doctor Verification</Text>
              {doctor.licenseNumber ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color="#FFF" />
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
              ) : (
                <View style={[styles.verifiedBadge, { backgroundColor: "#F59E0B" }]}>
                  <Ionicons name="time-outline" size={13} color="#FFF" />
                  <Text style={styles.verifiedBadgeText}>Pending</Text>
                </View>
              )}
            </View>

            <View style={styles.licenseRow}>
              <Text style={styles.licenseLabel}>License No.</Text>
              <Text style={styles.licenseValue}>
                {doctor.licenseNumber || "Not provided"}
              </Text>
            </View>
            <View style={styles.licenseRow}>
              <Text style={styles.licenseLabel}>Issuing Body</Text>
              <Text style={styles.licenseValue}>
                {(doctor as any).issuingBody || "Medical & Dental Council of Nigeria (MDCN)"}
              </Text>
            </View>
            <View style={styles.licenseRow}>
              <Text style={styles.licenseLabel}>Valid Through</Text>
              <Text style={styles.licenseValue}>
                {(doctor as any).licenseValidYear || "On File"}
              </Text>
            </View>
            {!doctor.licenseNumber && (
              <Text style={styles.verificationNote}>
                🔍 Verification in progress. Our team will review your credentials shortly.
              </Text>
            )}
          </View>
        </View>

        {/* ── Ratings ── */}
        {(doctor.ratings ?? 0) > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Rating</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={22} color="#FBBF24" />
              <Text style={[styles.ratingText, { color: colors.text }]}>
                {doctor.ratings?.toFixed(1)}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                ({doctor.reviews?.length ?? 0} review{(doctor.reviews?.length ?? 0) !== 1 ? "s" : ""})
              </Text>
            </View>
          </View>
        )}

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutPress}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ═══════════════════ Edit Profile Modal ═══════════════════ */}
      <Modal visible={editVisible} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              {/* Modal header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setEditVisible(false)} disabled={saving}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Avatar in modal */}
                <TouchableOpacity style={styles.modalAvatarWrap} onPress={pickImage}>
                  <Image
                    source={{ uri: pickedAvatarUri || getAvatarUri() }}
                    style={styles.modalAvatar}
                  />
                  <View style={styles.modalCameraBadge}>
                    <Ionicons name="camera" size={14} color="#fff" />
                  </View>
                </TouchableOpacity>
                <Text style={[styles.avatarHint, { color: colors.textMuted }]}>
                  Tap photo to change
                </Text>

                {/* First Name */}
                <Text style={[styles.label, { color: colors.textMuted }]}>First Name *</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border ?? "#E5E7EB", backgroundColor: colors.background }]}
                  value={editForm.firstName}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, firstName: v }))}
                  placeholder="First name"
                  placeholderTextColor={colors.textMuted}
                />

                {/* Last Name */}
                <Text style={[styles.label, { color: colors.textMuted }]}>Last Name *</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border ?? "#E5E7EB", backgroundColor: colors.background }]}
                  value={editForm.lastName}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, lastName: v }))}
                  placeholder="Last name"
                  placeholderTextColor={colors.textMuted}
                />

                {/* Specialization */}
                <Text style={[styles.label, { color: colors.textMuted }]}>Specialization</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border ?? "#E5E7EB", backgroundColor: colors.background }]}
                  value={editForm.specialization}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, specialization: v }))}
                  placeholder="e.g. Cardiology"
                  placeholderTextColor={colors.textMuted}
                />

                {/* Contact Number */}
                <Text style={[styles.label, { color: colors.textMuted }]}>Contact Number</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border ?? "#E5E7EB", backgroundColor: colors.background }]}
                  value={editForm.contactNumber}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, contactNumber: v }))}
                  placeholder="+234 800 000 0000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />

                {/* Years of Experience */}
                <Text style={[styles.label, { color: colors.textMuted }]}>Years of Experience</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border ?? "#E5E7EB", backgroundColor: colors.background }]}
                  value={editForm.yearsOfExperience}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, yearsOfExperience: v }))}
                  placeholder="e.g. 8"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />

                {/* Bio */}
                <Text style={[styles.label, { color: colors.textMuted }]}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textarea, { color: colors.text, borderColor: colors.border ?? "#E5E7EB", backgroundColor: colors.background }]}
                  value={editForm.bio}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, bio: v }))}
                  placeholder="Tell patients about yourself..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {/* Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border ?? "#E5E7EB" }]}
                    onPress={() => setEditVisible(false)}
                    disabled={saving}
                  >
                    <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.saveText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },

  profileCard: {
    margin: 16,
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarWrap: { position: "relative" },
  avatar: { width: 110, height: 110, borderRadius: 55 },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#D81E5B",
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  name: { fontSize: 20, fontWeight: "700" },
  specialty: { fontSize: 14, fontWeight: "500", marginTop: 4 },
  experience: { fontSize: 13, marginTop: 3 },

  actionsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    paddingVertical: 13,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 13,
  },
  actionText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  actionTextOutline: { fontWeight: "600", fontSize: 14 },

  section: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptySection: { alignItems: "center", paddingVertical: 22 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  sectionText: { fontSize: 14, lineHeight: 21 },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  infoText: { fontSize: 14, flex: 1 },

  verificationCard: {
    marginTop: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  verificationHeader: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10,
  },
  verificationTitle: { fontWeight: "700", fontSize: 14, flex: 1, color: "#166534" },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#16A34A", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  verifiedBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  licenseRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  licenseLabel: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  licenseValue: { fontSize: 13, color: "#1A1A1A", fontWeight: "600", flex: 1, textAlign: "right" },
  verificationNote: { fontSize: 12, color: "#92400E", marginTop: 8, lineHeight: 17 },

  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingText: { fontSize: 20, fontWeight: "700" },

  logoutBtn: {
    marginTop: 24,
    marginHorizontal: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    backgroundColor: "#FFF5F5",
  },
  logoutText: { color: "#EF4444", fontWeight: "700", fontSize: 15 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: "92%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },

  modalAvatarWrap: { alignSelf: "center", position: "relative", marginBottom: 4 },
  modalAvatar: { width: 80, height: 80, borderRadius: 40 },
  modalCameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#D81E5B",
    padding: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarHint: { textAlign: "center", fontSize: 12, marginBottom: 16 },

  label: { fontSize: 12, fontWeight: "600", marginBottom: 4, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 2,
  },
  textarea: { minHeight: 90, textAlignVertical: "top", paddingTop: 12 },

  modalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
  },
  cancelText: { fontWeight: "600", fontSize: 15 },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
