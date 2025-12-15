import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { IAppointment } from "../../types/backendType";

interface Props {
  appointment: IAppointment | null;
  visible: boolean;
  onClose: () => void;
  onAccept?: (appt: IAppointment) => void;
  onReject?: (appt: IAppointment) => void;
}

export default function AppointmentModal({ appointment, visible, onClose, onAccept, onReject }: Props) {
  if (!appointment) return null;

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'rejected': return '#F44336';
      case 'cancelled': return '#9E9E9E';
      case 'completed': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Drag Indicator */}
          <View style={styles.dragIndicator} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Appointment Details</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
              <Text style={styles.statusText}>{appointment.status.toUpperCase()}</Text>
            </View>

            {/* Patient Info */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={20} color="#666" />
                <Text style={styles.sectionLabel}>Patient</Text>
              </View>
              <Text style={styles.sectionValue}>
                {appointment.patientSnapshot?.name || 'Unknown Patient'}
              </Text>
            </View>

            {/* Scheduled Time */}
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

            {/* Consultation Type */}
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

            {/* Additional Notes */}
            {appointment.notes && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="chatbox" size={20} color="#666" />
                  <Text style={styles.sectionLabel}>Notes</Text>
                </View>
                <Text style={styles.sectionValue}>{appointment.notes}</Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons - Only show for pending appointments */}
          {appointment.status === "pending" && onAccept && onReject && (
            <View style={styles.actions}>
              <TouchableOpacity 
                style={[styles.button, styles.rejectButton]} 
                onPress={() => onReject(appointment)}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.acceptButton]} 
                onPress={() => onAccept(appointment)}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Close Button for non-pending appointments */}
          {appointment.status !== "pending" && (
            <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={onClose}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          )}
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
    maxHeight: "85%",
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
  },
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
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
  },
  rejectButton: {
    backgroundColor: "#F44336",
  },
  closeButton: {
    backgroundColor: "#2196F3",
    marginTop: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});