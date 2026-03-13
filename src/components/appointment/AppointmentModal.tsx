// src/components/appointment/AppointmentModal.tsx
import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { IAppointment, IDoctor } from "../../types/backendType";
import { getDoctorImageUri } from "../../services/Doctor";

interface Props {
  appointment: IAppointment | null;
  visible: boolean;
  onClose: () => void;
  onAccept?: (appt: IAppointment) => void;
  onReject?: (appt: IAppointment) => void;
  onBookAgain?: () => void;
  onJoinCall?: (appt: IAppointment) => void;
  getEffectiveStatus: (appt: IAppointment) => string;
  role: "user" | "doctor";
  onOpenChat?: () => void;
}

export default function AppointmentModal({
  appointment,
  visible,
  onClose,
  onAccept,
  onReject,
  onBookAgain,
  onJoinCall,
  getEffectiveStatus,
  role,
  onOpenChat,
}: Props) {
  if (!appointment) return null;

  const doctor =
    typeof appointment.doctorId === "object"
      ? (appointment.doctorId as IDoctor)
      : null;
  const effectiveStatus = getEffectiveStatus(appointment);

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":    return "#10B981";
      case "pending":      return "#FBBF24";
      case "rejected":
      case "cancelled":    return "#9CA3AF";
      case "in-progress":  return "#EF4444";
      case "call-ended":   return "#6B7280";
      case "completed":    return "#6B7280";
      case "rescheduled":  return "#3B82F6";
      default:             return "#D1D5DB";
    }
  };

  // Check if scheduled time window (including grace period) has passed
  const isScheduledTimeExhausted = () => {
    if (!appointment.scheduledAt) return true;
    const appointmentTime = new Date(appointment.scheduledAt);
    const duration = appointment.duration || 30;
    const appointmentEndTime = new Date(
      appointmentTime.getTime() + duration * 60 * 1000
    );
    const now = new Date();
    const graceMinutesAfter = 15;
    const endWindow = new Date(
      appointmentEndTime.getTime() + graceMinutesAfter * 60 * 1000
    );
    return now > endWindow;
  };

  // User: call ended but time window still open → can call back
  const canCallBack = () => {
    if (role !== "user") return false;
    const isCallEnded =
      effectiveStatus === "call-ended" || appointment.callStatus === "ended";
    const timeNotExhausted = !isScheduledTimeExhausted();
    const isNotCancelled =
      effectiveStatus !== "cancelled" && effectiveStatus !== "rejected";
    return isCallEnded && timeNotExhausted && isNotCancelled;
  };

  // User: show "Book Again" when time window is fully exhausted
  const shouldShowBookAgain = () => {
    if (role !== "user") return false;
    const isCallEnded =
      effectiveStatus === "call-ended" ||
      effectiveStatus === "completed" ||
      appointment.callStatus === "ended";
    return isCallEnded && isScheduledTimeExhausted();
  };

  // Doctor: can start or rejoin call within ±15 min window
  const canStartOrRejoinCall = () => {
    if (role !== "doctor") return false;
    if (!appointment.scheduledAt) return false;

    const appointmentTime = new Date(appointment.scheduledAt);
    const duration = appointment.duration || 30;
    const appointmentEndTime = new Date(
      appointmentTime.getTime() + duration * 60 * 1000
    );
    const now = new Date();

    const startWindow = new Date(
      appointmentTime.getTime() - 15 * 60 * 1000
    );
    const endWindow = new Date(
      appointmentEndTime.getTime() + 15 * 60 * 1000
    );

    const isWithinWindow = now >= startWindow && now <= endWindow;
    const isConfirmed =
      effectiveStatus === "confirmed" ||
      effectiveStatus === "in-progress" ||
      effectiveStatus === "call-ended";
    const isNotTerminal =
      effectiveStatus !== "completed" &&
      effectiveStatus !== "cancelled" &&
      effectiveStatus !== "rejected";

    return isWithinWindow && isConfirmed && isNotTerminal;
  };

  // Minutes remaining until appointment end time
  const getRemainingMinutes = () => {
    if (!appointment.scheduledAt) return 0;
    const appointmentTime = new Date(appointment.scheduledAt);
    const duration = appointment.duration || 30;
    const appointmentEndTime = new Date(
      appointmentTime.getTime() + duration * 60 * 1000
    );
    const now = new Date();
    const remainingMs = appointmentEndTime.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return remainingMinutes > 0 ? remainingMinutes : 0;
  };

  const getCallButtonText = () => {
    if (appointment.callStatus === "in-progress") return "Rejoin Call";
    if (
      appointment.callStatus === "ended" ||
      effectiveStatus === "call-ended"
    ) {
      return role === "doctor" ? "Start New Call" : "Call Back";
    }
    if (effectiveStatus === "confirmed") return "Start Call";
    return "Join Call";
  };

  const showCallButton =
    (role === "doctor" && canStartOrRejoinCall()) ||
    (role === "user" && canCallBack());

  // Whether to show the Open Chat button
  const showChatButton =
    effectiveStatus === "confirmed" &&
    !!appointment.conversationId &&
    !!onOpenChat;

  // Show the default Close button only when no other primary action is present
  const showCloseButton =
    !(role === "doctor" && effectiveStatus === "pending") &&
    !showCallButton &&
    !shouldShowBookAgain();

  console.log("Modal Debug:", {
    role,
    effectiveStatus,
    callStatus: appointment.callStatus,
    canStartOrRejoin: canStartOrRejoinCall(),
    canCallBack: canCallBack(),
    shouldShowBookAgain: shouldShowBookAgain(),
    isTimeExhausted: isScheduledTimeExhausted(),
    remainingMinutes: getRemainingMinutes(),
    scheduledAt: appointment.scheduledAt,
    now: new Date().toISOString(),
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.dragIndicator} />

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Appointment Details</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {/* ── Scrollable body ── */}
          <ScrollView
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Status badge */}
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(effectiveStatus) },
              ]}
            >
              <Text style={styles.statusText}>
                {effectiveStatus.toUpperCase()}
              </Text>
            </View>

            {/* Doctor */}
            {doctor && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person" size={20} color="#666" />
                  <Text style={styles.sectionLabel}>Doctor</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Image
                    source={{ uri: getDoctorImageUri(doctor) }}
                    style={styles.avatar}
                  />
                  <Text style={styles.sectionValue}>
                    Dr. {doctor.firstName} {doctor.lastName} —{" "}
                    {doctor.specialization}
                  </Text>
                </View>
              </View>
            )}

            {/* Patient */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={20} color="#666" />
                <Text style={styles.sectionLabel}>Patient</Text>
              </View>
              <Text style={styles.sectionValue}>
                {appointment.patientSnapshot?.name || "Unknown"}
              </Text>
            </View>

            {/* Scheduled time */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={20} color="#666" />
                <Text style={styles.sectionLabel}>Scheduled Time</Text>
              </View>
              <Text style={styles.sectionValue}>
                {formatDate(appointment.scheduledAt)}
              </Text>
            </View>

            {/* Reason */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={20} color="#666" />
                <Text style={styles.sectionLabel}>Reason for Visit</Text>
              </View>
              <Text style={styles.sectionValue}>
                {appointment.reason || "No details provided"}
              </Text>
            </View>

            {/* Consultation type */}
            {appointment.consultationType && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="videocam" size={20} color="#666" />
                  <Text style={styles.sectionLabel}>Consultation Type</Text>
                </View>
                <Text style={styles.sectionValue}>
                  {appointment.consultationType}
                </Text>
              </View>
            )}

            {/* Notes */}
            {appointment.notes && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="chatbox" size={20} color="#666" />
                  <Text style={styles.sectionLabel}>Notes</Text>
                </View>
                <Text style={styles.sectionValue}>{appointment.notes}</Text>
              </View>
            )}

            {/* Call duration */}
            {appointment.callDuration &&
              (effectiveStatus === "call-ended" ||
                effectiveStatus === "completed") && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="timer" size={20} color="#666" />
                    <Text style={styles.sectionLabel}>Call Duration</Text>
                  </View>
                  <Text style={styles.sectionValue}>
                    {Math.floor(appointment.callDuration / 60)} min{" "}
                    {appointment.callDuration % 60} sec
                  </Text>
                </View>
              )}

            {/* Time remaining for call-back window */}
            {canCallBack() && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="time" size={20} color="#10B981" />
                  <Text style={[styles.sectionLabel, { color: "#10B981" }]}>
                    Time Remaining
                  </Text>
                </View>
                <Text
                  style={[
                    styles.sectionValue,
                    { color: "#10B981", fontWeight: "700" },
                  ]}
                >
                  {getRemainingMinutes()} minute
                  {getRemainingMinutes() !== 1 ? "s" : ""} left — You can call
                  back!
                </Text>
              </View>
            )}

            {/* Upcoming appointment status */}
            {effectiveStatus === "confirmed" && appointment.scheduledAt && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="time" size={20} color="#666" />
                  <Text style={styles.sectionLabel}>Status</Text>
                </View>
                <Text style={styles.sectionValue}>
                  {(() => {
                    const now = new Date();
                    const scheduled = new Date(appointment.scheduledAt);
                    const diffMins = Math.floor(
                      (scheduled.getTime() - now.getTime()) / 60000
                    );
                    if (diffMins < -15) return "Appointment in progress";
                    if (diffMins < 0)  return "Appointment starting now";
                    if (diffMins < 15) return `Starting in ${diffMins} minute${diffMins !== 1 ? "s" : ""}`;
                    return `Starts in ${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
                  })()}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* ── Action buttons ── */}
          <View style={styles.actionsContainer}>
            {/* Doctor: accept / reject pending appointment */}
            {role === "doctor" &&
              effectiveStatus === "pending" &&
              onAccept &&
              onReject && (
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    style={[styles.button, styles.rejectButton]}
                    onPress={() => onReject(appointment)}
                  >
                    <Text style={styles.buttonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.acceptButton]}
                    onPress={() => onAccept(appointment)}
                  >
                    <Text style={styles.buttonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              )}

            {/* Start / Rejoin / Call Back */}
            {showCallButton && onJoinCall && (
              <TouchableOpacity
                style={[styles.button, styles.callButton]}
                onPress={() => onJoinCall(appointment)}
              >
                <View style={styles.buttonInner}>
                  <Ionicons
                    name="videocam"
                    size={20}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.buttonText}>{getCallButtonText()}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* User: Book Again */}
            {role === "user" && shouldShowBookAgain() && onBookAgain && (
              <TouchableOpacity
                style={[styles.button, styles.bookAgainButton]}
                onPress={onBookAgain}
              >
                <View style={styles.buttonInner}>
                  <Ionicons
                    name="calendar"
                    size={20}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.buttonText}>Book Again</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Open Chat */}
            {showChatButton && (
              <TouchableOpacity
                style={[styles.button, styles.chatButton]}
                onPress={onOpenChat}
              >
                <View style={styles.buttonInner}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={20}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.buttonText}>Open Chat</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Default close */}
            {showCloseButton && (
              <TouchableOpacity
                style={[styles.button, styles.closeButton]}
                onPress={onClose}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 34,
    maxHeight: "90%",
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#222" },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionValue: {
    fontSize: 16,
    color: "#222",
    fontWeight: "500",
    lineHeight: 22,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEE",
  },
  actionsContainer: {
    paddingTop: 8,
    gap: 10,
  },
  rowActions: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  acceptButton:   { backgroundColor: "#4CAF50" },
  rejectButton:   { backgroundColor: "#F44336" },
  closeButton:    { backgroundColor: "#2196F3" },
  callButton:     { backgroundColor: "#10B981" },
  bookAgainButton:{ backgroundColor: "#D81E5B" },
  chatButton:     { backgroundColor: "#4FC3F7" },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});