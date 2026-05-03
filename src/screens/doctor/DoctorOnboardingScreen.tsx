import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../../hooks/useAuth";
import { IDoctor } from "../../types/backendType";
import { AppStackParamList } from "../../types/App";
import {
  updateDoctorAvailabilityService,
  completeDoctorProfileService,
  updateDoctorProfile,
} from "../../services/Doctor";

type Nav = StackNavigationProp<AppStackParamList, "DoctorOnboardingScreen">;

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface DaySchedule {
  available: boolean;
  from: string;
  to: string;
}

type Availability = Record<string, DaySchedule>;

const DEFAULT_AVAILABILITY: Availability = Object.fromEntries(
  WEEKDAYS.map((day) => [
    day,
    {
      available: !["Saturday", "Sunday"].includes(day),
      from: "09:00",
      to: "17:00",
    },
  ])
);

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressSegment,
            { backgroundColor: i < step ? "#D81E5B" : "#F3F4F6" },
          ]}
        />
      ))}
    </View>
  );
}

function TimeInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      style={styles.timeInput}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType="numbers-and-punctuation"
      maxLength={5}
    />
  );
}

export default function DoctorOnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const { user, refreshUser, isDoctor } = useAuth();
  const doctor = isDoctor() ? (user as IDoctor) : null;

  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 2;

  // ─── Step 1: Profile ────────────────────────────────────────
  const [bio, setBio] = useState(doctor?.bio ?? "");
  const [yearsOfExperience, setYearsOfExperience] = useState(
    doctor?.yearsOfExperience?.toString() ?? ""
  );
  const [contactNumber, setContactNumber] = useState(
    doctor?.contactNumber ?? ""
  );
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // ─── Step 2: Availability ────────────────────────────────────
  const [availability, setAvailability] = useState<Availability>(
    doctor?.availability
      ? Object.fromEntries(
          WEEKDAYS.map((day) => [
            day,
            {
              available: !!doctor.availability![day]?.available,
              from: doctor.availability![day]?.from ?? "09:00",
              to: doctor.availability![day]?.to ?? "17:00",
            },
          ])
        )
      : DEFAULT_AVAILABILITY
  );
  const [savingAvailability, setSavingAvailability] = useState(false);

  // ─── Pick image ──────────────────────────────────────────────
  const pickAvatar = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  // ─── Step 1 → Step 2 ────────────────────────────────────────
  const handleNextStep = useCallback(async () => {
    if (!bio.trim()) {
      Toast.show({ type: "error", text1: "Please add a bio." });
      return;
    }
    if (!yearsOfExperience || isNaN(Number(yearsOfExperience))) {
      Toast.show({
        type: "error",
        text1: "Enter a valid years of experience.",
      });
      return;
    }
    if (!contactNumber.trim()) {
      Toast.show({ type: "error", text1: "Please enter a contact number." });
      return;
    }

    setSavingProfile(true);
    try {
      await updateDoctorProfile(
        doctor!._id.toString(),
        {
          bio: bio.trim(),
          yearsOfExperience: Number(yearsOfExperience),
          contactNumber: contactNumber.trim(),
        } as any,
        undefined,
        avatarUri ?? undefined
      );
      setStep(2);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Failed to save profile.",
        text2: err?.message,
      });
    } finally {
      setSavingProfile(false);
    }
  }, [bio, yearsOfExperience, contactNumber, avatarUri, doctor]);

  // ─── Step 2 → Done ──────────────────────────────────────────
  const handleFinish = useCallback(async () => {
    const anyAvailable = Object.values(availability).some((d) => d.available);
    if (!anyAvailable) {
      Toast.show({
        type: "error",
        text1: "Please enable at least one working day.",
      });
      return;
    }

    // Validate time format HH:MM
    for (const [day, sched] of Object.entries(availability)) {
      if (!sched.available) continue;
      const timeRx = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!timeRx.test(sched.from) || !timeRx.test(sched.to)) {
        Toast.show({
          type: "error",
          text1: `Invalid time for ${day}. Use HH:MM format.`,
        });
        return;
      }
      if (sched.from >= sched.to) {
        Toast.show({
          type: "error",
          text1: `${day}: Start time must be before end time.`,
        });
        return;
      }
    }

    setSavingAvailability(true);
    try {
      await updateDoctorAvailabilityService(availability);
      await completeDoctorProfileService();
      await refreshUser();

      Toast.show({
        type: "success",
        text1: "Welcome to PlanAmWell! 🎉",
        text2: "Your profile is ready.",
      });

      navigation.replace("DoctorDashScreen");
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Failed to save availability.",
        text2: err?.message,
      });
    } finally {
      setSavingAvailability(false);
    }
  }, [availability, refreshUser, navigation]);

  const toggleDay = (day: string, value: boolean) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], available: value },
    }));
  };

  const updateTime = (day: string, field: "from" | "to", value: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const existingAvatar =
    avatarUri ??
    (typeof doctor?.profileImage === "string" ? doctor.profileImage : null) ??
    (doctor?.doctorImage ? (doctor.doctorImage as any)?.imageUrl : null);

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <LinearGradient colors={["#D81E5B", "#FF6B95"]} style={styles.header}>
          <Text style={styles.headerTitle}>
            {step === 1 ? "Complete Your Profile" : "Set Your Schedule"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {step === 1
              ? "Help patients learn more about you"
              : "Tell patients when you're available"}
          </Text>
          <ProgressBar step={step} total={TOTAL_STEPS} />
          <Text style={styles.stepLabel}>
            Step {step} of {TOTAL_STEPS}
          </Text>
        </LinearGradient>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ═══════════════ STEP 1: Profile ═══════════════ */}
          {step === 1 && (
            <>
              {/* Avatar picker */}
              <View style={styles.avatarSection}>
                <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap}>
                  {existingAvatar ? (
                    <Image
                      source={{ uri: existingAvatar }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons
                        name="camera-outline"
                        size={32}
                        color="#D81E5B"
                      />
                    </View>
                  )}
                  <View style={styles.avatarBadge}>
                    <Ionicons name="pencil" size={12} color="#fff" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.avatarHint}>
                  {existingAvatar ? "Tap to change photo" : "Add a profile photo"}
                </Text>
              </View>

              {/* Bio */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Bio <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell patients about yourself, your approach to medicine, and your expertise..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{bio.length} characters</Text>
              </View>

              {/* Years of Experience */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Years of Experience <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={yearsOfExperience}
                  onChangeText={setYearsOfExperience}
                  placeholder="e.g. 8"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </View>

              {/* Contact Number */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Contact Number <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={contactNumber}
                  onChangeText={setContactNumber}
                  placeholder="+234 800 000 0000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleNextStep}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>
                      Next: Set Availability
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* ═══════════════ STEP 2: Availability ═══════════════ */}
          {step === 2 && (
            <>
              <Text style={styles.availNote}>
                Toggle the days you work and set your hours. Patients will only
                be able to book on enabled days.
              </Text>

              {WEEKDAYS.map((day) => {
                const sched = availability[day];
                return (
                  <View key={day} style={styles.dayCard}>
                    <View style={styles.dayHeader}>
                      <Text
                        style={[
                          styles.dayName,
                          !sched.available && styles.dayNameOff,
                        ]}
                      >
                        {day}
                      </Text>
                      <Switch
                        value={sched.available}
                        onValueChange={(v) => toggleDay(day, v)}
                        trackColor={{ false: "#E5E7EB", true: "#FECDD3" }}
                        thumbColor={sched.available ? "#D81E5B" : "#9CA3AF"}
                      />
                    </View>

                    {sched.available && (
                      <View style={styles.timeRow}>
                        <View style={styles.timeField}>
                          <Text style={styles.timeLabel}>From</Text>
                          <TimeInput
                            value={sched.from}
                            onChange={(v) => updateTime(day, "from", v)}
                            placeholder="09:00"
                          />
                        </View>
                        <Ionicons
                          name="arrow-forward-outline"
                          size={16}
                          color="#9CA3AF"
                          style={{ marginTop: 22 }}
                        />
                        <View style={styles.timeField}>
                          <Text style={styles.timeLabel}>To</Text>
                          <TimeInput
                            value={sched.to}
                            onChange={(v) => updateTime(day, "to", v)}
                            placeholder="17:00"
                          />
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}

              <View style={styles.stepBtns}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setStep(1)}
                >
                  <Ionicons name="arrow-back" size={18} color="#D81E5B" />
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1 }]}
                  onPress={handleFinish}
                  disabled={savingAvailability}
                >
                  {savingAvailability ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>
                        Finish & Go to Dashboard
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },

  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
  },

  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 40 },

  // Avatar
  avatarSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  avatarWrap: { position: "relative" },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF1F4",
    borderWidth: 2,
    borderColor: "#FECDD3",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#D81E5B",
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarHint: { marginTop: 10, fontSize: 13, color: "#6B7280" },

  // Fields
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
  required: { color: "#EF4444" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  textarea: {
    minHeight: 110,
    paddingTop: 12,
  },
  charCount: {
    marginTop: 4,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
  },

  // Buttons
  primaryBtn: {
    flexDirection: "row",
    backgroundColor: "#D81E5B",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: "#D81E5B",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  stepBtns: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D81E5B",
    backgroundColor: "#FFF1F4",
  },
  backBtnText: { color: "#D81E5B", fontWeight: "600", fontSize: 15 },

  // Availability
  availNote: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 20,
    backgroundColor: "#EFF6FF",
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  dayCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  dayNameOff: { color: "#9CA3AF" },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  timeField: { flex: 1 },
  timeLabel: { fontSize: 12, color: "#6B7280", marginBottom: 4, fontWeight: "500" },
  timeInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    textAlign: "center",
    fontWeight: "600",
  },
});
