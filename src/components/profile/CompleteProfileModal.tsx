/**
 * CompleteProfileModal.tsx
 *
 * A reusable bottom-sheet-style modal that prompts the user to fill in
 * whichever profile fields are still missing.
 *
 * Usage — appointment booking:
 * ─────────────────────────────
 *   const [showProfile, setShowProfile] = useState(false);
 *
 *   const handleBookAppointment = async () => {
 *     try {
 *       await bookAppointment(payload);
 *     } catch (err: any) {
 *       if (err.response?.data?.code === 'PROFILE_INCOMPLETE') {
 *         setShowProfile(true);   // open modal
 *         return;
 *       }
 *       // ... handle other errors
 *     }
 *   };
 *
 *   <CompleteProfileModal
 *     visible={showProfile}
 *     onClose={() => setShowProfile(false)}
 *     onSaved={() => {
 *       setShowProfile(false);
 *       handleBookAppointment(); // retry the action
 *     }}
 *   />
 *
 * Usage — checkout:
 * ─────────────────
 *   Checkout already collects these fields inline via the checkout form,
 *   but you can use this modal for the "quick fill" case when the user
 *   is already logged in and you just need to pre-fill their profile
 *   before sending the order.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Toast from "react-native-toast-message";
import { RFValue } from "react-native-responsive-fontsize";
import { useAuth } from "../../hooks/useAuth"; // adjust path as needed

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfileFields {
  phone: string;
  gender: string;
  dateOfBirth: string;
  homeAddress: string;
  city: string;
  state: string;
  lga: string;
}

interface Props {
  visible: boolean;
  /** Called when the user dismisses without saving */
  onClose: () => void;
  /** Called after a successful save — use this to retry the blocked action */
  onSaved: () => void;
  /**
   * Optional: pass in the field labels returned by the backend
   * (e.g. ["Phone number", "Date of birth"]) to pre-highlight missing fields.
   * If omitted, all fields are shown.
   */
  missingFields?: string[];
}

// ─── Component ───────────────────────────────────────────────────────────────

const INITIAL: ProfileFields = {
  phone: "",
  gender: "",
  dateOfBirth: "",
  homeAddress: "",
  city: "",
  state: "",
  lga: "",
};

export const CompleteProfileModal: React.FC<Props> = ({
  visible,
  onClose,
  onSaved,
  missingFields,
}) => {
  const { user, updateUser } = useAuth(); // assumes useAuth exposes user + updateProfile
  const [form, setForm] = useState<ProfileFields>(INITIAL);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pre-fill with existing data when the modal opens
  useEffect(() => {
    if (visible && user) {
      setForm({
        phone: user.phone || "",
        gender: user.gender || "",
        dateOfBirth: user.dateOfBirth || "",
        homeAddress: user.homeAddress || "",
        city: user.city || "",
        state: user.state || "",
        lga: user.lga || "",
      });
    }
  }, [visible, user]);

  const set = (field: keyof ProfileFields, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleGender = () =>
    Alert.alert("Select Gender", undefined, [
      { text: "Male", onPress: () => set("gender", "male") },
      { text: "Female", onPress: () => set("gender", "female") },
      { text: "Other", onPress: () => set("gender", "other") },
      { text: "Cancel", style: "cancel" },
    ]);

  const handleSave = async () => {
    // Validate — at minimum we require phone, gender, dateOfBirth
    if (!form.phone.trim()) {
      Toast.show({ type: "error", text1: "Phone number is required" });
      return;
    }
    if (!form.gender) {
      Toast.show({ type: "error", text1: "Please select your gender" });
      return;
    }
    if (!form.dateOfBirth) {
      Toast.show({ type: "error", text1: "Date of birth is required" });
      return;
    }

    if (!user || !user._id) {
      Toast.show({ type: "error", text1: "User not found" });
      return;
    }

    setSaving(true);
    try {
      await updateUser(user._id, form);
      Toast.show({ type: "success", text1: "Profile updated!" });
      onSaved();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Failed to update profile",
        text2: err.response?.data?.message || err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {showDatePicker && (
        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="date"
          onConfirm={(date) => {
            set("dateOfBirth", date.toISOString().split("T")[0]);
            setShowDatePicker(false);
          }}
          onCancel={() => setShowDatePicker(false)}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.overlay}
      >
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Complete your profile</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="x" size={RFValue(22)} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={s.sheetSub}>
            We need a few more details before you can continue.
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Phone */}
            <Label>Phone Number</Label>
            <View style={s.inputBox}>
              <Feather name="phone" size={RFValue(18)} style={s.icon} />
              <TextInput
                style={s.input}
                placeholder="+234 801 234 5678"
                placeholderTextColor="#bbb"
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(v) => set("phone", v)}
              />
            </View>

            {/* Gender */}
            <Label>Gender</Label>
            <TouchableOpacity style={s.inputBox} onPress={handleGender}>
              <Feather name="users" size={RFValue(18)} style={s.icon} />
              <Text style={[s.input, { color: form.gender ? "#111" : "#bbb" }]}>
                {form.gender
                  ? form.gender.charAt(0).toUpperCase() + form.gender.slice(1)
                  : "Select gender"}
              </Text>
              <Feather name="chevron-down" size={RFValue(18)} style={s.icon} />
            </TouchableOpacity>

            {/* Date of Birth */}
            <Label>Date of Birth</Label>
            <TouchableOpacity
              style={s.inputBox}
              onPress={() => setShowDatePicker(true)}
            >
              <Feather name="calendar" size={RFValue(18)} style={s.icon} />
              <Text
                style={[s.input, { color: form.dateOfBirth ? "#111" : "#bbb" }]}
              >
                {form.dateOfBirth || "YYYY-MM-DD"}
              </Text>
            </TouchableOpacity>

            {/* Address */}
            <Label>Home Address (optional)</Label>
            <View style={s.inputBox}>
              <Feather name="home" size={RFValue(18)} style={s.icon} />
              <TextInput
                style={s.input}
                placeholder="Street address"
                placeholderTextColor="#bbb"
                value={form.homeAddress}
                onChangeText={(v) => set("homeAddress", v)}
              />
            </View>

            <View style={s.row}>
              <View style={[s.inputBox, { flex: 1, marginRight: 8 }]}>
                <TextInput
                  style={s.input}
                  placeholder="City"
                  placeholderTextColor="#bbb"
                  value={form.city}
                  onChangeText={(v) => set("city", v)}
                />
              </View>
              <View style={[s.inputBox, { flex: 1 }]}>
                <TextInput
                  style={s.input}
                  placeholder="State"
                  placeholderTextColor="#bbb"
                  value={form.state}
                  onChangeText={(v) => set("state", v)}
                />
              </View>
            </View>

            <View style={s.inputBox}>
              <Feather name="map-pin" size={RFValue(18)} style={s.icon} />
              <TextInput
                style={s.input}
                placeholder="LGA"
                placeholderTextColor="#bbb"
                value={form.lga}
                onChangeText={(v) => set("lga", v)}
              />
            </View>

            {/* Save */}
            <TouchableOpacity
              style={s.btn}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnTxt}>Save &amp; Continue</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Tiny helper ─────────────────────────────────────────────────────────────
const Label = ({ children }: { children: string }) => (
  <Text style={s.label}>{children}</Text>
);

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: RFValue(20),
    borderTopRightRadius: RFValue(20),
    padding: RFValue(20),
    maxHeight: "90%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: RFValue(6),
  },
  sheetTitle: { fontSize: RFValue(18), fontWeight: "700", color: "#111" },
  sheetSub: { fontSize: RFValue(13), color: "#888", marginBottom: RFValue(18) },

  label: {
    fontSize: RFValue(12),
    color: "#555",
    fontWeight: "600",
    marginBottom: RFValue(6),
    marginTop: RFValue(4),
  },

  row: { flexDirection: "row" },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: RFValue(8),
    paddingHorizontal: RFValue(12),
    paddingVertical: Platform.OS === "ios" ? RFValue(11) : RFValue(7),
    marginBottom: RFValue(12),
  },
  input: {
    flex: 1,
    fontSize: RFValue(14),
    color: "#111",
    marginLeft: RFValue(6),
    paddingVertical: 0,
  },
  icon: { color: "#aaa" },

  btn: {
    backgroundColor: "#D81E5B",
    borderRadius: RFValue(8),
    paddingVertical: RFValue(14),
    alignItems: "center",
    marginTop: RFValue(8),
  },
  btnTxt: { color: "#fff", fontSize: RFValue(15), fontWeight: "700" },
});

export default CompleteProfileModal;
