// src/components/appointment/AppointmentModal.tsx
import React from "react";
import {
  View, Text, Modal, TouchableOpacity,
  StyleSheet, ScrollView, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { IAppointment, IDoctor } from "../../types/backendType";
import { getDoctorImageUri } from "../../services/Doctor";
import { CONSULTATION_RATE_LABEL } from "../../screens/appointments/BookAppointmentScreen";

interface Props {
  appointment:      IAppointment | null;
  visible:          boolean;
  onClose:          () => void;
  onAccept?:        (appt: IAppointment) => void;
  onReject?:        (appt: IAppointment) => void;
  onBookAgain?:     () => void;
  onJoinCall?:      (appt: IAppointment) => void;
  onOpenChat?:      (appt: IAppointment) => void;
  getEffectiveStatus: (appt: IAppointment) => string;
  role:             "user" | "doctor";
}

export default function AppointmentModal({
  appointment,
  visible,
  onClose,
  onAccept,
  onReject,
  onBookAgain,
  onJoinCall,
  onOpenChat,
  getEffectiveStatus,
  role,
}: Props) {
  if (!appointment) return null;

  const doctor           = typeof appointment.doctorId === "object" ? (appointment.doctorId as IDoctor) : null;
  const effectiveStatus  = getEffectiveStatus(appointment);

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("en-US", {
      weekday: "short", year: "numeric", month: "short",
      day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":    return "#10B981";
      case "pending":      return "#FBBF24";
      case "rejected":
      case "cancelled":    return "#9CA3AF";
      case "in-progress":  return "#EF4444";
      case "call-ended":
      case "completed":    return "#6B7280";
      case "rescheduled":  return "#3B82F6";
      default:             return "#D1D5DB";
    }
  };

  const isScheduledTimeExhausted = () => {
    if (!appointment.scheduledAt) return true;
    const endTime  = new Date(new Date(appointment.scheduledAt).getTime() + (appointment.duration || 30) * 60000);
    const endWindow = new Date(endTime.getTime() + 15 * 60000);
    return new Date() > endWindow;
  };

  const canCallBack = () =>
    role === "user" &&
    (effectiveStatus === "call-ended" || appointment.callStatus === "ended") &&
    !isScheduledTimeExhausted() &&
    !["cancelled", "rejected"].includes(effectiveStatus);

  const shouldShowBookAgain = () =>
    role === "user" &&
    (effectiveStatus === "call-ended" || effectiveStatus === "completed" || appointment.callStatus === "ended") &&
    isScheduledTimeExhausted();

  const canStartOrRejoinCall = () => {
    if (role !== "doctor" || !appointment.scheduledAt) return false;
    const apptTime   = new Date(appointment.scheduledAt);
    const endTime    = new Date(apptTime.getTime() + (appointment.duration || 30) * 60000);
    const now        = new Date();
    const startWin   = new Date(apptTime.getTime() - 15 * 60000);
    const endWin     = new Date(endTime.getTime()  + 15 * 60000);
    return now >= startWin && now <= endWin &&
      ["confirmed", "in-progress", "call-ended"].includes(effectiveStatus) &&
      !["completed", "cancelled", "rejected"].includes(effectiveStatus);
  };

  const getRemainingMinutes = () => {
    if (!appointment.scheduledAt) return 0;
    const endTime = new Date(new Date(appointment.scheduledAt).getTime() + (appointment.duration || 30) * 60000);
    return Math.max(0, Math.ceil((endTime.getTime() - Date.now()) / 60000));
  };

  const getCallButtonText = () => {
    if (appointment.callStatus === "in-progress") return "Rejoin Call";
    if (appointment.callStatus === "ended" || effectiveStatus === "call-ended")
      return role === "doctor" ? "Start New Call" : "Call Back";
    return effectiveStatus === "confirmed" ? "Start Video Call" : "Join Call";
  };

  // ── Visibility logic ──────────────────────────────────────────────────────
  const showCallBtn   = (role === "doctor" && canStartOrRejoinCall()) || (role === "user" && canCallBack());

  // ✅ Chat button is now primary for confirmed appointments on both sides
  const showChatBtn   =
    effectiveStatus === "confirmed" &&
    !!appointment.conversationId &&
    !!onOpenChat;

  const showCloseBtn  =
    !showChatBtn &&
    !(role === "doctor" && effectiveStatus === "pending") &&
    !showCallBtn &&
    !shouldShowBookAgain();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.drag} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Appointment Details</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>

            {/* Status badge */}
            <View style={[styles.badge, { backgroundColor: getStatusColor(effectiveStatus) }]}>
              <Text style={styles.badgeText}>{effectiveStatus.toUpperCase()}</Text>
            </View>

            {/* ── Consultation fee ── */}
            <View style={styles.feeRow}>
              <Ionicons name="cash-outline" size={18} color="#D81E5B" />
              <Text style={styles.feeLabel}>Consultation Fee</Text>
              <Text style={styles.feeValue}>{CONSULTATION_RATE_LABEL}</Text>
            </View>

            {/* Doctor */}
            {doctor && (
              <View style={styles.section}>
                <SectionHeader icon="person" label="Doctor" />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Image source={{ uri: getDoctorImageUri(doctor) }} style={styles.avatar} />
                  <Text style={styles.sectionValue}>
                    Dr. {doctor.firstName} {doctor.lastName} — {doctor.specialization}
                  </Text>
                </View>
              </View>
            )}

            {/* Patient */}
            <View style={styles.section}>
              <SectionHeader icon="person" label="Patient" />
              <Text style={styles.sectionValue}>{appointment.patientSnapshot?.name || "Unknown"}</Text>
            </View>

            {/* Scheduled time */}
            <View style={styles.section}>
              <SectionHeader icon="calendar" label="Scheduled Time" />
              <Text style={styles.sectionValue}>{formatDate(appointment.scheduledAt)}</Text>
            </View>

            {/* Reason */}
            <View style={styles.section}>
              <SectionHeader icon="document-text" label="Reason for Visit" />
              <Text style={styles.sectionValue}>{appointment.reason || "No details provided"}</Text>
            </View>

            {/* Notes */}
            {appointment.notes && (
              <View style={styles.section}>
                <SectionHeader icon="chatbox" label="Notes" />
                <Text style={styles.sectionValue}>{appointment.notes}</Text>
              </View>
            )}

            {/* Call duration */}
            {!!appointment.callDuration && ["call-ended", "completed"].includes(effectiveStatus) && (
              <View style={styles.section}>
                <SectionHeader icon="timer" label="Call Duration" />
                <Text style={styles.sectionValue}>
                  {Math.floor(appointment.callDuration / 60)}m {appointment.callDuration % 60}s
                </Text>
              </View>
            )}

            {/* Callback window remaining */}
            {canCallBack() && (
              <View style={styles.section}>
                <SectionHeader icon="time" label="Time Remaining" color="#10B981" />
                <Text style={[styles.sectionValue, { color: "#10B981", fontWeight: "700" }]}>
                  {getRemainingMinutes()} min{getRemainingMinutes() !== 1 ? "s" : ""} left — You can call back!
                </Text>
              </View>
            )}

            {/* ✅ Chat prompt for confirmed appointments */}
            {showChatBtn && (
              <View style={styles.chatPrompt}>
                <Ionicons name="chatbubbles" size={20} color="#D81E5B" />
                <Text style={styles.chatPromptText}>
                  Your chat room is ready. Chat with your {role === "doctor" ? "patient" : "doctor"} or start a video call from inside the chat.
                </Text>
              </View>
            )}

          </ScrollView>

          {/* ── Action buttons ── */}
          <View style={styles.actions}>

            {/* Doctor: accept / reject */}
            {role === "doctor" && effectiveStatus === "pending" && onAccept && onReject && (
              <View style={styles.rowActions}>
                <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => onReject(appointment)}>
                  <Text style={styles.btnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={() => onAccept(appointment)}>
                  <Text style={styles.btnText}>Accept</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ✅ Open Chat — PRIMARY action for confirmed appointments */}
            {showChatBtn && (
              <TouchableOpacity
                style={[styles.btn, styles.chatBtn]}
                onPress={() => onOpenChat!(appointment)}
              >
                <Ionicons name="chatbubble" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>
                  {role === "doctor" ? "Chat with Patient" : "Open Chat Room"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Video call */}
            {showCallBtn && onJoinCall && (
              <TouchableOpacity style={[styles.btn, styles.callBtn]} onPress={() => onJoinCall(appointment)}>
                <Ionicons name="videocam" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>{getCallButtonText()}</Text>
              </TouchableOpacity>
            )}

            {/* Book Again */}
            {role === "user" && shouldShowBookAgain() && onBookAgain && (
              <TouchableOpacity style={[styles.btn, styles.bookAgainBtn]} onPress={onBookAgain}>
                <Ionicons name="calendar" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>Book Again</Text>
              </TouchableOpacity>
            )}

            {/* Default close */}
            {showCloseBtn && (
              <TouchableOpacity style={[styles.btn, styles.closeBtn]} onPress={onClose}>
                <Text style={styles.btnText}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SectionHeader = ({ icon, label, color = "#666" }: { icon: string; label: string; color?: string }) => (
  <View style={styles.sectionHeader}>
    <Ionicons name={icon as any} size={18} color={color} />
    <Text style={[styles.sectionLabel, { color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 34,
    maxHeight: "90%",
  },
  drag: {
    width: 40, height: 4, backgroundColor: "#ddd",
    borderRadius: 2, alignSelf: "center", marginBottom: 16,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#222" },

  badge: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, alignSelf: "flex-start", marginBottom: 16,
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: "#fff", letterSpacing: 0.5 },

  // Rate row
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF0F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  feeLabel: { flex: 1, fontSize: 14, color: "#555", fontWeight: "600" },
  feeValue: { fontSize: 16, fontWeight: "800", color: "#D81E5B" },

  section: { marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  sectionLabel:  { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionValue:  { fontSize: 15, color: "#222", fontWeight: "500", lineHeight: 22 },
  avatar:        { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EEE" },

  // Chat prompt banner
  chatPrompt: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF0F6",
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  chatPromptText: { flex: 1, fontSize: 13, color: "#555", lineHeight: 18 },

  // Actions
  actions:    { paddingTop: 8, gap: 10 },
  rowActions: { flexDirection: "row", gap: 12 },
  btn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText:      { fontSize: 15, fontWeight: "700", color: "#fff" },
  acceptBtn:    { backgroundColor: "#4CAF50" },
  rejectBtn:    { backgroundColor: "#F44336" },
  closeBtn:     { backgroundColor: "#2196F3" },
  callBtn:      { backgroundColor: "#10B981" },
  bookAgainBtn: { backgroundColor: "#D81E5B" },
  chatBtn:      { backgroundColor: "#D81E5B" },  // primary brand color — most prominent
});