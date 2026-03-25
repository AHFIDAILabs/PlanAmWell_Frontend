// screens/PaymentScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { RFValue } from "react-native-responsive-fontsize";
import Toast from "react-native-toast-message";

import { AppStackParamList } from "../../types/App";
import { createAppointment } from "../../services/Appointment";
import { CONSULTATION_RATE_LABEL } from "../appointments/BookAppointmentScreen";
import { IDoctor } from "../../types/backendType";

type PaymentRouteProps = RouteProp<AppStackParamList, "PaymentScreen">;

// ── Simulated payment steps ───────────────────────────────────────────────────
type PaymentStep = "summary" | "processing" | "success" | "failed";

export const PaymentScreen: React.FC = () => {
  const route      = useRoute<PaymentRouteProps>();
  const navigation = useNavigation<any>();

  const { doctor, scheduledAt, reason, notes, shareUserInfo } = route.params;

  const [step, setStep]           = useState<PaymentStep>("summary");
  const [creatingAppt, setCreatingAppt] = useState(false);

  const scheduledDate = new Date(scheduledAt);

  const formatDateTime = (d: Date) =>
    d.toLocaleString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

  // ── Simulate payment then create appointment ──────────────────────────────
  const handlePay = async () => {
    // Step 1: show processing spinner
    setStep("processing");

    // Simulate network delay (replace with real Paystack call later)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      setCreatingAppt(true);

      // Step 2: Create appointment (payment is considered "paid" / simulated)
      await createAppointment({
        doctorId: (doctor as IDoctor)._id,
        scheduledAt: scheduledDate,
        // Duration is no longer chosen by patient — set a sensible default
        duration: 30,
        reason,
        notes,
        shareUserInfo,
        // paymentReference will be wired here when real payment is integrated
        paymentReference: `SIM_${Date.now()}`,
        paymentStatus: "paid",
      });

      setStep("success");
    } catch (error: any) {
      console.error("[Payment] Appointment creation failed:", error);
      setStep("failed");
    } finally {
      setCreatingAppt(false);
    }
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "HomeScreen" }],
    });
  };

  const handleViewAppointments = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "MyAppointments" }],
    });
  };

  // ── Processing screen ─────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#D81E5B" />
          <Text style={styles.processingTitle}>Processing Payment…</Text>
          <Text style={styles.processingSubtitle}>Please wait, do not close the app</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <SafeAreaView style={styles.screen}>
        <LinearGradient colors={["#E8F5E9", "#fff"]} style={StyleSheet.absoluteFill} />
        <View style={styles.centeredContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          </View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSubtitle}>
            Your appointment request has been sent to{"\n"}
            Dr. {(doctor as IDoctor).firstName} {(doctor as IDoctor).lastName}.
          </Text>

          <View style={styles.successInfo}>
            <InfoRow icon="calendar" text={formatDateTime(scheduledDate)} />
            <InfoRow icon="cash" text={`${CONSULTATION_RATE_LABEL} paid`} />
            <InfoRow
              icon="information-circle"
              text="You'll be notified once the doctor confirms. A chat room will open automatically."
            />
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleViewAppointments}>
            <Text style={styles.primaryBtnText}>View My Appointments</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleGoHome}>
            <Text style={styles.secondaryBtnText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Failed screen ─────────────────────────────────────────────────────────
  if (step === "failed") {
    return (
      <SafeAreaView style={styles.screen}>
        <LinearGradient colors={["#FFEBEE", "#fff"]} style={StyleSheet.absoluteFill} />
        <View style={styles.centeredContainer}>
          <Ionicons name="close-circle" size={80} color="#F44336" />
          <Text style={styles.successTitle}>Payment Failed</Text>
          <Text style={styles.successSubtitle}>
            Something went wrong. Your card was not charged.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep("summary")}>
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleGoHome}>
            <Text style={styles.secondaryBtnText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Summary screen (default) ──────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Confirm & Pay</Text>
        <Text style={styles.subtitle}>Review your appointment before paying</Text>

        {/* ── Order summary ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appointment Summary</Text>

          <SummaryRow icon="person"    label="Doctor"   value={`Dr. ${(doctor as IDoctor).firstName} ${(doctor as IDoctor).lastName}`} />
          <SummaryRow icon="medical"   label="Specialty" value={(doctor as IDoctor).specialization} />
          <SummaryRow icon="calendar"  label="Date & Time" value={formatDateTime(scheduledDate)} />
          <SummaryRow icon="document-text" label="Reason" value={reason} />
          {notes ? <SummaryRow icon="chatbox" label="Notes" value={notes} /> : null}
        </View>

        {/* ── Payment breakdown ──────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Breakdown</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Consultation Fee</Text>
            <Text style={styles.breakdownValue}>{CONSULTATION_RATE_LABEL}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Service Charge</Text>
            <Text style={styles.breakdownValue}>₦0</Text>
          </View>
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{CONSULTATION_RATE_LABEL}</Text>
          </View>
        </View>

        {/* ── Simulated payment method ───────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          <View style={styles.paymentMethodRow}>
            <View style={styles.cardIconBox}>
              <Ionicons name="card" size={24} color="#D81E5B" />
            </View>
            <View>
              <Text style={styles.paymentMethodLabel}>Simulated Payment</Text>
              <Text style={styles.paymentMethodSub}>Real payment will be wired here</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
          </View>
        </View>

        {/* ── Notice ────────────────────────────────────────────────────── */}
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={18} color="#2196F3" />
          <Text style={styles.noticeText}>
            Your payment is held securely. If the doctor declines, you will be fully refunded.
          </Text>
        </View>

        {/* ── Pay button ────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.payBtn}
          onPress={handlePay}
          disabled={creatingAppt}
          activeOpacity={0.85}
        >
          <Ionicons name="lock-closed" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.payBtnText}>Pay {CONSULTATION_RATE_LABEL}</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By tapping Pay, you agree to our Terms of Service and Refund Policy.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Helper components ─────────────────────────────────────────────────────────
const SummaryRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={styles.summaryRow}>
    <Ionicons name={icon as any} size={16} color="#999" style={{ marginTop: 2 }} />
    <View style={{ flex: 1 }}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  </View>
);

const InfoRow = ({ icon, text }: { icon: string; text: string }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon as any} size={18} color="#4CAF50" />
    <Text style={styles.infoText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: "#F9FAFB" },
  container: { padding: 20, paddingBottom: 40 },

  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },

  backBtn:  { marginBottom: 12 },
  title:    { fontSize: RFValue(26), fontWeight: "800", color: "#222", marginBottom: 4 },
  subtitle: { fontSize: RFValue(14), color: "#888", marginBottom: 24 },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: RFValue(14),
    fontWeight: "700",
    color: "#333",
    marginBottom: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Summary rows
  summaryRow:   { flexDirection: "row", gap: 10, marginBottom: 12 },
  summaryLabel: { fontSize: RFValue(12), color: "#999" },
  summaryValue: { fontSize: RFValue(14), color: "#222", fontWeight: "600", marginTop: 1 },

  // Breakdown
  breakdownRow:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  breakdownLabel:{ fontSize: RFValue(14), color: "#666" },
  breakdownValue:{ fontSize: RFValue(14), color: "#333", fontWeight: "600" },
  totalRow:      { borderTopWidth: 1, borderTopColor: "#EEE", paddingTop: 12, marginTop: 4 },
  totalLabel:    { fontSize: RFValue(16), fontWeight: "700", color: "#222" },
  totalValue:    { fontSize: RFValue(18), fontWeight: "800", color: "#D81E5B" },

  // Payment method
  paymentMethodRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  cardIconBox: {
    width: 44, height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF0F6",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentMethodLabel: { fontSize: RFValue(14), fontWeight: "600", color: "#333" },
  paymentMethodSub:   { fontSize: RFValue(12), color: "#AAA" },

  // Notice
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  noticeText: { flex: 1, fontSize: RFValue(12), color: "#1565C0", lineHeight: 18 },

  // Pay button
  payBtn: {
    backgroundColor: "#D81E5B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#D81E5B",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  payBtnText: { color: "#fff", fontSize: RFValue(16), fontWeight: "700" },
  disclaimer: { fontSize: RFValue(11), color: "#BBB", textAlign: "center", lineHeight: 16 },

  // Processing
  processingTitle:    { fontSize: RFValue(20), fontWeight: "700", color: "#333", marginTop: 20 },
  processingSubtitle: { fontSize: RFValue(14), color: "#999", marginTop: 8 },

  // Success / Failed
  successIcon:     { marginBottom: 20 },
  successTitle:    { fontSize: RFValue(24), fontWeight: "800", color: "#222", textAlign: "center", marginBottom: 10 },
  successSubtitle: { fontSize: RFValue(14), color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  successInfo: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    width: "100%",
    marginBottom: 24,
    gap: 14,
  },
  infoRow:  { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoText: { flex: 1, fontSize: RFValue(13), color: "#444", lineHeight: 18 },

  primaryBtn: {
    backgroundColor: "#D81E5B",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnText:  { color: "#fff", fontSize: RFValue(15), fontWeight: "700" },
  secondaryBtn:    { paddingVertical: 12, alignItems: "center" },
  secondaryBtnText:{ color: "#888", fontSize: RFValue(14) },
});