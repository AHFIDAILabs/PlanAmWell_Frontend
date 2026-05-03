import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../hooks/useAuth";
import { IDoctor } from "../../types/backendType";

type DoctorStatus = "submitted" | "reviewing" | "approved" | "rejected";

const STATUS_CONFIG: Record<
  DoctorStatus,
  {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    badge: string;
    badgeColors: [string, string];
    title: string;
    subtitle: string;
    steps?: string[];
  }
> = {
  submitted: {
    icon: "time-outline",
    iconColor: "#F59E0B",
    badge: "Application Submitted",
    badgeColors: ["#FEF3C7", "#FDE68A"],
    title: "Your application is under review",
    subtitle:
      "Thank you for registering! Our admin team will review your credentials and get back to you within 24–48 hours.",
    steps: [
      "License verification",
      "Specialization review",
      "Background check",
      "Final approval",
    ],
  },
  reviewing: {
    icon: "search-outline",
    iconColor: "#3B82F6",
    badge: "Under Review",
    badgeColors: ["#DBEAFE", "#BFDBFE"],
    title: "We're reviewing your application",
    subtitle:
      "Great news! Your application is actively being reviewed by our medical team. This usually takes a few hours.",
    steps: [
      "License verification ✓",
      "Specialization review",
      "Background check",
      "Final approval",
    ],
  },
  approved: {
    icon: "checkmark-circle-outline",
    iconColor: "#10B981",
    badge: "Approved",
    badgeColors: ["#D1FAE5", "#A7F3D0"],
    title: "You're approved!",
    subtitle: "Please complete your profile to start seeing patients.",
  },
  rejected: {
    icon: "close-circle-outline",
    iconColor: "#EF4444",
    badge: "Not Approved",
    badgeColors: ["#FEE2E2", "#FECACA"],
    title: "Application not approved",
    subtitle:
      "Unfortunately your application was not approved at this time. Please check your notification for details or contact our support team.",
  },
};

export default function DoctorPendingScreen() {
  const { user, refreshUser, handleLogout, isDoctor } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const doctor = isDoctor() ? (user as IDoctor) : null;
  const status: DoctorStatus = (doctor?.status as DoctorStatus) ?? "submitted";
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.submitted;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D81E5B" />
        }
      >
        {/* Top gradient band */}
        <LinearGradient colors={["#D81E5B", "#FF6B95"]} style={styles.topBand}>
          <Text style={styles.appName}>PlanAmWell</Text>
          <Text style={styles.doctorPortal}>Doctor Portal</Text>
        </LinearGradient>

        {/* Card */}
        <View style={styles.card}>
          {/* Status Badge */}
          <LinearGradient
            colors={config.badgeColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.badge}
          >
            <Text style={[styles.badgeText, { color: config.iconColor }]}>
              {config.badge}
            </Text>
          </LinearGradient>

          {/* Icon */}
          <View style={[styles.iconCircle, { borderColor: config.iconColor + "30" }]}>
            <Ionicons name={config.icon} size={56} color={config.iconColor} />
          </View>

          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>{config.subtitle}</Text>

          {/* Progress steps */}
          {config.steps && (
            <View style={styles.stepsContainer}>
              <Text style={styles.stepsLabel}>Review Progress</Text>
              {config.steps.map((step, idx) => {
                const done = step.endsWith("✓");
                const label = done ? step.replace(" ✓", "") : step;
                return (
                  <View key={idx} style={styles.stepRow}>
                    <View
                      style={[
                        styles.stepDot,
                        { backgroundColor: done ? "#10B981" : "#E5E7EB" },
                      ]}
                    >
                      {done && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <Text style={[styles.stepText, done && styles.stepDone]}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Pull-to-refresh hint */}
          <View style={styles.refreshHint}>
            <Ionicons name="refresh-outline" size={14} color="#9CA3AF" />
            <Text style={styles.refreshHintText}>Pull down to check for updates</Text>
          </View>
        </View>

        {/* Doctor info strip */}
        {doctor && (
          <View style={styles.infoStrip}>
            <Ionicons name="person-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              Logged in as{" "}
              <Text style={styles.infoBold}>
                Dr. {doctor.firstName} {doctor.lastName}
              </Text>
            </Text>
          </View>
        )}

        {/* Contact support for rejected */}
        {status === "rejected" && (
          <View style={styles.supportBox}>
            <Ionicons name="mail-outline" size={18} color="#D81E5B" />
            <Text style={styles.supportText}>
              Contact{" "}
              <Text style={styles.supportLink}>support@planamwell.com</Text> for
              clarification or to reapply.
            </Text>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          © {new Date().getFullYear()} PlanAmWell · All rights reserved
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { flexGrow: 1, paddingBottom: 40 },

  topBand: {
    paddingTop: 28,
    paddingBottom: 60,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  appName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  doctorPortal: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  card: {
    marginHorizontal: 20,
    marginTop: -36,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    alignItems: "center",
  },

  badge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 50,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#FAFAFA",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },

  stepsContainer: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  stepsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  stepText: {
    fontSize: 14,
    color: "#6B7280",
  },
  stepDone: {
    color: "#10B981",
    fontWeight: "600",
  },

  refreshHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  refreshHintText: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  infoStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  infoText: { fontSize: 13, color: "#6B7280" },
  infoBold: { fontWeight: "700", color: "#111827" },

  supportBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#FFF1F4",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  supportText: { flex: 1, fontSize: 13, color: "#6B7280", lineHeight: 20 },
  supportLink: { color: "#D81E5B", fontWeight: "600" },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF5F5",
  },
  logoutText: { color: "#EF4444", fontWeight: "600", fontSize: 15 },

  footer: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 11,
    color: "#D1D5DB",
  },
});
