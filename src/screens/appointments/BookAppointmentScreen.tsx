// screens/BookAppointmentScreen.tsx
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { RFValue } from "react-native-responsive-fontsize";

import { AppStackParamList } from "../../types/App";
import { useAuth } from "../../hooks/useAuth";
import { IDoctor } from "../../types/backendType";

type DoctorRouteProps = RouteProp<AppStackParamList, "BookAppointmentScreen">;

// ── Placeholder rate ─────────────────────────────────────────────────────────
export const CONSULTATION_RATE = 15000; // ₦15,000 — swap this later per-doctor
export const CONSULTATION_RATE_LABEL = "₦15,000";

export const BookAppointmentScreen: React.FC = () => {
  const route      = useRoute<DoctorRouteProps>();
  const navigation = useNavigation<any>();
  const { user }   = useAuth();

  const doctor = route.params?.doctor as IDoctor;

  const [selectedDate, setSelectedDate]   = useState<Date | null>(null);
  const [selectedTime, setSelectedTime]   = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reason, setReason]               = useState("");
  const [notes, setNotes]                 = useState("");
  const [shareUserInfo, setShareUserInfo] = useState(true);

  // 14-day mini calendar
  const next14Days = useMemo(() => {
    const arr: { date: Date; day: string; dayNum: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push({
        date: d,
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
      });
    }
    return arr;
  }, []);

  const handleProceed = () => {
    if (!selectedDate || !selectedTime) {
      return Toast.show({ type: "error", text1: "Select a date and time" });
    }
    if (!reason.trim()) {
      return Toast.show({ type: "error", text1: "Please provide a reason for the visit" });
    }

    const scheduledAt = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      selectedTime.getHours(),
      selectedTime.getMinutes()
    );

    if (scheduledAt <= new Date()) {
      return Toast.show({ type: "error", text1: "Please select a future date and time" });
    }

    // Navigate to payment — pass everything needed to create the appointment after payment
    navigation.navigate("PaymentScreen", {
      doctor,
      scheduledAt: scheduledAt.toISOString(),
      reason,
      notes,
      shareUserInfo,
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <LinearGradient colors={["#FFE2F0", "#fff"]} style={styles.headerBg} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>

        <Text style={styles.title}>Book Appointment</Text>
        <Text style={styles.subtitle}>Dr. {doctor.firstName} {doctor.lastName}</Text>
        <Text style={styles.spec}>{doctor.specialization}</Text>

        {/* ── Rate card ─────────────────────────────────────────────────── */}
        <View style={styles.rateCard}>
          <View style={styles.rateLeft}>
            <Ionicons name="shield-checkmark" size={20} color="#D81E5B" />
            <Text style={styles.rateLabel}>Consultation Fee</Text>
          </View>
          <Text style={styles.rateValue}>{CONSULTATION_RATE_LABEL}</Text>
        </View>

        {/* ── Date picker ───────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>Select Date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateScroll}
        >
          {next14Days.map((d) => {
            const selected = selectedDate?.toDateString() === d.date.toDateString();
            return (
              <TouchableOpacity
                key={d.date.toDateString()}
                style={[styles.datePill, selected && styles.datePillActive]}
                onPress={() => setSelectedDate(d.date)}
              >
                <Text style={[styles.dateDay, selected && styles.dateTextActive]}>{d.day}</Text>
                <Text style={[styles.dateNum, selected && styles.dateTextActive]}>{d.dayNum}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Time picker ───────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>Select Time</Text>
        <TouchableOpacity style={styles.timeBtn} onPress={() => setShowTimePicker(true)}>
          <Ionicons name="time-outline" size={20} color="#D81E5B" />
          <Text style={styles.timeBtnText}>
            {selectedTime
              ? selectedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Tap to choose time"}
          </Text>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={selectedTime || new Date()}
            mode="time"
            onChange={(_, time) => {
              setShowTimePicker(false);
              if (time) setSelectedTime(time);
            }}
          />
        )}

        {/* ── Reason ────────────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>Reason for Visit</Text>
        <TextInput
          style={styles.input}
          placeholder="Describe your symptoms or concern…"
          placeholderTextColor="#AAA"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
        />

        {/* ── Notes ─────────────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>Additional Notes <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="Any other information for the doctor…"
          placeholderTextColor="#AAA"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {/* ── Share info toggle ─────────────────────────────────────────── */}
        <View style={styles.shareRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.shareTitle}>Share my profile with doctor</Text>
            <Text style={styles.shareSubtitle}>Name, email, phone, and health info</Text>
          </View>
          <Switch
            value={shareUserInfo}
            onValueChange={setShareUserInfo}
            trackColor={{ true: "#D81E5B", false: "#ccc" }}
            thumbColor="#fff"
          />
        </View>

        {/* ── Summary ───────────────────────────────────────────────────── */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>
          <Row icon="person" label="Doctor" value={`Dr. ${doctor.firstName} ${doctor.lastName}`} />
          <Row icon="calendar" label="Date" value={selectedDate
            ? selectedDate.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })
            : "Not selected"} />
          <Row icon="time" label="Time" value={selectedTime
            ? selectedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Not selected"} />
          <Row icon="cash" label="Fee" value={CONSULTATION_RATE_LABEL} highlight />
        </View>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.proceedBtn} onPress={handleProceed} activeOpacity={0.85}>
          <Ionicons name="lock-closed" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.proceedBtnText}>Proceed to Payment</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Payment is required to confirm your booking. You will only be charged once the appointment is accepted by the doctor.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
};

// ── Small helper component ────────────────────────────────────────────────────
const Row = ({
  icon, label, value, highlight,
}: {
  icon: string; label: string; value: string; highlight?: boolean;
}) => (
  <View style={styles.summaryRow}>
    <Ionicons name={icon as any} size={16} color="#888" />
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, highlight && { color: "#D81E5B", fontWeight: "700" }]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: "#fff" },
  headerBg:  { position: "absolute", top: 0, width: "100%", height: 200 },
  container: { padding: 20, paddingTop: 16, paddingBottom: 40 },

  backBtn: { marginBottom: 12 },
  title:   { fontSize: RFValue(26), fontWeight: "800", color: "#222", marginBottom: 4 },
  subtitle:{ fontSize: RFValue(16), fontWeight: "600", color: "#444" },
  spec:    { fontSize: RFValue(13), color: "#888", marginBottom: 20 },

  // Rate card
  rateCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF0F6",
    borderWidth: 1,
    borderColor: "#F9A8C9",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
  },
  rateLeft:  { flexDirection: "row", alignItems: "center", gap: 8 },
  rateLabel: { fontSize: RFValue(14), fontWeight: "600", color: "#444" },
  rateValue: { fontSize: RFValue(18), fontWeight: "800", color: "#D81E5B" },

  fieldLabel: {
    fontSize: RFValue(13),
    fontWeight: "700",
    color: "#555",
    marginBottom: 10,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optional: { fontWeight: "400", color: "#AAA" },

  // Date
  dateScroll: { marginBottom: 20 },
  datePill: {
    width: 58,
    height: 70,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  datePillActive: { backgroundColor: "#D81E5B", borderColor: "#D81E5B" },
  dateDay:        { fontSize: RFValue(11), color: "#777" },
  dateNum:        { fontSize: RFValue(18), fontWeight: "700", color: "#222", marginTop: 2 },
  dateTextActive: { color: "#fff" },

  // Time
  timeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    backgroundColor: "#FAFAFA",
  },
  timeBtnText: { fontSize: RFValue(15), color: "#333" },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 14,
    padding: 14,
    fontSize: RFValue(14),
    color: "#333",
    backgroundColor: "#FAFAFA",
    marginBottom: 20,
    minHeight: 60,
    textAlignVertical: "top",
  },

  // Share row
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  shareTitle:    { fontSize: RFValue(14), fontWeight: "600", color: "#333" },
  shareSubtitle: { fontSize: RFValue(12), color: "#999", marginTop: 2 },

  // Summary card
  summaryCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    gap: 12,
  },
  summaryTitle: { fontSize: RFValue(14), fontWeight: "700", color: "#222", marginBottom: 4 },
  summaryRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryLabel: { fontSize: RFValue(13), color: "#888", flex: 1 },
  summaryValue: { fontSize: RFValue(13), color: "#333", fontWeight: "600" },

  // CTA
  proceedBtn: {
    backgroundColor: "#D81E5B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#D81E5B",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  proceedBtnText: { color: "#fff", fontSize: RFValue(16), fontWeight: "700" },
  disclaimer:     { fontSize: RFValue(11), color: "#AAA", textAlign: "center", lineHeight: 16 },
});