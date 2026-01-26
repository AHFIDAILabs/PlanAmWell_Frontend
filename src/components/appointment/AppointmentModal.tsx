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
}: Props) {
  if (!appointment) return null;

  const doctor = typeof appointment.doctorId === "object" ? (appointment.doctorId as IDoctor) : null;
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
      case "confirmed": return "#10B981";
      case "pending": return "#FBBF24";
      case "rejected":
      case "cancelled": return "#9CA3AF";
      case "in-progress": return "#EF4444";
      case "call-ended": return "#6B7280";
      case "completed": return "#6B7280";
      case "rescheduled": return "#3B82F6";
      default: return "#D1D5DB";
    }
  };

  // ✅ Check if scheduled time has been exhausted
  const isScheduledTimeExhausted = () => {
    if (!appointment.scheduledAt) return true;
    
    const appointmentTime = new Date(appointment.scheduledAt);
    const duration = appointment.duration || 30; // Default 30 minutes
    const appointmentEndTime = new Date(appointmentTime.getTime() + duration * 60 * 1000);
    const now = new Date();
    
    // Add 15 minute grace period after scheduled end time
    const graceMinutesAfter = 15;
    const endWindow = new Date(appointmentEndTime.getTime() + graceMinutesAfter * 60 * 1000);
    
    return now > endWindow;
  };

  // ✅ Check if user can call back (call ended but time not exhausted)
  const canCallBack = () => {
    if (role !== "user") return false;
    
    const isCallEnded = effectiveStatus === "call-ended" || appointment.callStatus === "ended";
    const timeNotExhausted = !isScheduledTimeExhausted();
    const isNotCancelled = effectiveStatus !== "cancelled" && effectiveStatus !== "rejected";
    
    return isCallEnded && timeNotExhausted && isNotCancelled;
  };

  // ✅ Check if user should see "Book Again" (time exhausted)
  const shouldShowBookAgain = () => {
    if (role !== "user") return false;
    
    const isCallEnded = effectiveStatus === "call-ended" || 
                        effectiveStatus === "completed" || 
                        appointment.callStatus === "ended";
    const timeExhausted = isScheduledTimeExhausted();
    
    return isCallEnded && timeExhausted;
  };

  // ✅ Check if doctor can start/rejoin call
  const canStartOrRejoinCall = () => {
    if (role !== "doctor") return false;
    if (!appointment.scheduledAt) return false;
    
    const appointmentTime = new Date(appointment.scheduledAt);
    const duration = appointment.duration || 30;
    const appointmentEndTime = new Date(appointmentTime.getTime() + duration * 60 * 1000);
    const now = new Date();
    
    const graceMinutesBefore = 15;
    const graceMinutesAfter = 15;
    
    const startWindow = new Date(appointmentTime.getTime() - graceMinutesBefore * 60 * 1000);
    const endWindow = new Date(appointmentEndTime.getTime() + graceMinutesAfter * 60 * 1000);
    
    const isWithinWindow = now >= startWindow && now <= endWindow;
    
    const isConfirmed = effectiveStatus === "confirmed" || 
                        effectiveStatus === "in-progress" || 
                        effectiveStatus === "call-ended";
    
    const isNotCompleted = effectiveStatus !== "completed" && 
                           effectiveStatus !== "cancelled" && 
                           effectiveStatus !== "rejected";
    
    return isWithinWindow && isConfirmed && isNotCompleted;
  };

  // ✅ Get remaining time in minutes
  const getRemainingMinutes = () => {
    if (!appointment.scheduledAt) return 0;
    
    const appointmentTime = new Date(appointment.scheduledAt);
    const duration = appointment.duration || 30;
    const appointmentEndTime = new Date(appointmentTime.getTime() + duration * 60 * 1000);
    const now = new Date();
    
    const remainingMs = appointmentEndTime.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    
    return remainingMinutes > 0 ? remainingMinutes : 0;
  };

  const getCallButtonText = () => {
    if (appointment.callStatus === "in-progress") {
      return "Rejoin Call";
    } else if (appointment.callStatus === "ended" || effectiveStatus === "call-ended") {
      return role === "doctor" ? "Start New Call" : "Call Back";
    } else if (effectiveStatus === "confirmed") {
      return "Start Call";
    } else {
      return "Join Call";
    }
  };

  const showCallButton = (role === "doctor" && canStartOrRejoinCall()) || 
                         (role === "user" && canCallBack());

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.dragIndicator} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Appointment Details</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(effectiveStatus) }]}>
              <Text style={styles.statusText}>{effectiveStatus.toUpperCase()}</Text>
            </View>

            {doctor && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person" size={20} color="#666" />
                  <Text style={styles.sectionLabel}>Doctor</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Image source={{ uri: getDoctorImageUri(doctor) }} style={styles.avatar} />
                  <Text style={styles.sectionValue}>
                    Dr. {doctor.firstName} {doctor.lastName} - {doctor.specialization}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={20} color="#666" />
                <Text style={styles.sectionLabel}>Patient</Text>
              </View>
              <Text style={styles.sectionValue}>{appointment.patientSnapshot?.name || "Unknown"}</Text>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={20} color="#666" />
                <Text style={styles.sectionLabel}>Scheduled Time</Text>
              </View>
              <Text style={styles.sectionValue}>{formatDate(appointment.scheduledAt)}</Text>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={20} color="#666" />
                <Text style={styles.sectionLabel}>Reason for Visit</Text>
              </View>
              <Text style={styles.sectionValue}>{appointment.reason || "No details provided"}</Text>
            </View>

            {appointment.consultationType && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="videocam" size={20} color="#666" />
                  <Text style={styles.sectionLabel}>Consultation Type</Text>
                </View>
                <Text style={styles.sectionValue}>{appointment.consultationType}</Text>
              </View>
            )}

            {appointment.notes && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="chatbox" size={20} color="#666" />
                  <Text style={styles.sectionLabel}>Notes</Text>
                </View>
                <Text style={styles.sectionValue}>{appointment.notes}</Text>
              </View>
            )}

            {/* Show call duration if call has ended */}
            {appointment.callDuration && (effectiveStatus === "call-ended" || effectiveStatus === "completed") && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="timer" size={20} color="#666" />
                  <Text style={styles.sectionLabel}>Call Duration</Text>
                </View>
                <Text style={styles.sectionValue}>
                  {Math.floor(appointment.callDuration / 60)} min {appointment.callDuration % 60} sec
                </Text>
              </View>
            )}

            {/* ✅ Show remaining time if call ended but time not exhausted */}
            {canCallBack() && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="time" size={20} color="#10B981" />
                  <Text style={[styles.sectionLabel, { color: "#10B981" }]}>Time Remaining</Text>
                </View>
                <Text style={[styles.sectionValue, { color: "#10B981", fontWeight: "700" }]}>
                  {getRemainingMinutes()} minute{getRemainingMinutes() !== 1 ? 's' : ''} left - You can call back!
                </Text>
              </View>
            )}

            {/* ✅ Show time remaining for upcoming appointments */}
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
                    const diffMs = scheduled.getTime() - now.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    
                    if (diffMins < -15) {
                      return "Appointment in progress";
                    } else if (diffMins < 0) {
                      return "Appointment starting now";
                    } else if (diffMins < 15) {
                      return `Starting in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
                    } else {
                      return `Starts in ${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
                    }
                  })()}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* ACTION BUTTONS */}
          <View style={{ paddingVertical: 16 }}>
            <ScrollView
              horizontal={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Doctor: Pending appointments */}
              {role === "doctor" && effectiveStatus === "pending" && onAccept && onReject && (
                <View style={styles.actions}>
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

              {/* ✅ Doctor: Start/Rejoin call OR User: Call Back */}
              {showCallButton && onJoinCall && (
                <TouchableOpacity 
                  style={[styles.button, styles.callButton, { marginTop: 12 }]} 
                  onPress={() => onJoinCall(appointment)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="videocam" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>{getCallButtonText()}</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* ✅ User: Book Again (only when time is exhausted) */}
              {role === "user" && shouldShowBookAgain() && onBookAgain && (
                <TouchableOpacity 
                  style={[styles.button, styles.bookAgainButton, { marginTop: 12 }]} 
                  onPress={onBookAgain}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="calendar" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Book Again</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Default close button */}
              {!((role === "doctor" && effectiveStatus === "pending") || 
                  showCallButton ||
                  (role === "user" && shouldShowBookAgain())) && (
                <TouchableOpacity 
                  style={[styles.button, styles.closeButton, { marginTop: 12 }]} 
                  onPress={onClose}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
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
    marginBottom: 20 
  },
  statusText: { 
    fontSize: 12, 
    fontWeight: "700", 
    color: "#fff", 
    letterSpacing: 0.5 
  },
  section: { 
    marginBottom: 20, 
    paddingBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: "#f0f0f0" 
  },
  sectionHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 8, 
    gap: 8 
  },
  sectionLabel: { 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#666", 
    textTransform: "uppercase", 
    letterSpacing: 0.5 
  },
  sectionValue: { 
    fontSize: 16, 
    color: "#222", 
    fontWeight: "500", 
    lineHeight: 22 
  },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: "#EEE" 
  },
  actions: { 
    flexDirection: "row", 
    gap: 12, 
    marginTop: 16 
  },
  button: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: "center" 
  },
  acceptButton: { backgroundColor: "#4CAF50" },
  rejectButton: { backgroundColor: "#F44336" },
  closeButton: { backgroundColor: "#2196F3" },
  callButton: { backgroundColor: "#10B981" },
  bookAgainButton: { backgroundColor: "#D81E5B" },
  buttonText: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#fff" 
  },
});