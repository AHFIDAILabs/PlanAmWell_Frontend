import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { getMyAppointments, formatAppointmentTime, updateAppointment } from "../../services/Appointment";
import { getDoctorImageUri } from "../../services/Doctor";
import { IAppointment, IDoctor } from "../../types/backendType";

type TabType = "upcoming" | "pending" | "past";

export const ConsultationHistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [selectedAppointment, setSelectedAppointment] = useState<IAppointment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchAppointments = async () => {
    try {
      const data = await getMyAppointments();
      const mapped = (data || []).map((appt) => ({
        ...appt,
        scheduledAt: new Date(appt.scheduledAt),
      }));
      setAppointments(mapped);
    } catch (e) {
      console.error("Failed to fetch appointments", e);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load appointments",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateAppointment(appointmentId, { status: "cancelled" });
              Toast.show({
                type: "success",
                text1: "Cancelled",
                text2: "Appointment cancelled successfully",
              });
              setModalVisible(false);
              fetchAppointments();
            } catch (error: any) {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: error.message || "Failed to cancel appointment",
              });
            }
          },
        },
      ]
    );
  };

  // ✅ NEW: Check if user can join video call
  const canJoinCall = (appointment: IAppointment): boolean => {
    if (appointment.status !== 'confirmed') return false;

    const now = new Date();
    const scheduledTime = new Date(appointment.scheduledAt);
    const timeDiff = scheduledTime.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));

    // Can join 15 minutes before to 2 hours after
    return minutesDiff <= 15 && minutesDiff >= -120;
  };

  // ✅ NEW: Handle join video call
  const handleJoinCall = (appointment: IAppointment) => {
    if (!canJoinCall(appointment)) {
      const now = new Date();
      const scheduledTime = new Date(appointment.scheduledAt);
      const timeDiff = scheduledTime.getTime() - now.getTime();
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));

      if (minutesDiff > 15) {
        Alert.alert(
          'Too Early',
          `You can join the call 15 minutes before the scheduled time.\n\nTime remaining: ${minutesDiff} minutes`
        );
      } else {
        Alert.alert(
          'Call Window Expired',
          'The call window has expired. Please reschedule if needed.'
        );
      }
      return;
    }

    // Navigate to video call screen
    const doctor = typeof appointment.doctorId === 'object' 
      ? appointment.doctorId as IDoctor 
      : null;

    navigation.navigate('VideoCallScreen', {
      appointmentId: appointment._id,
      name: doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Doctor',
      doctorId: doctor?._id,
      role: 'user',
    });
  };

  const getFilteredAppointments = () => {
    const now = new Date();
    switch (activeTab) {
      case "upcoming":
        return appointments.filter(
          (a) => a.status === "confirmed" && a.scheduledAt >= now
        );
      case "pending":
        return appointments.filter((a) => a.status === "pending");
      case "past":
        return appointments.filter(
          (a) =>
            a.status === "completed" ||
            a.status === "cancelled" ||
            a.status === "rejected" ||
            (a.status === "confirmed" && a.scheduledAt < now)
        );
      default:
        return [];
    }
  };

  const getStatusConfig = (status: IAppointment["status"]) => {
    switch (status) {
      case "confirmed":
        return { color: "#4CAF50", icon: "checkmark-circle", label: "Confirmed" };
      case "pending":
        return { color: "#FF9800", icon: "time", label: "Pending" };
      case "rejected":
        return { color: "#F44336", icon: "close-circle", label: "Declined" };
      case "cancelled":
        return { color: "#9E9E9E", icon: "close-circle-outline", label: "Cancelled" };
      case "completed":
        return { color: "#607D8B", icon: "checkmark-done-circle", label: "Completed" };
      default:
        return { color: "#757575", icon: "help-circle", label: status };
    }
  };

  const getTimeUntil = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `in ${days} day${days > 1 ? "s" : ""}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? "s" : ""}`;
    if (minutes > 0) return `in ${minutes} min${minutes > 1 ? "s" : ""}`;
    return "Now";
  };

  const renderAppointmentCard = ({ item }: { item: IAppointment }) => {
    const doctor = typeof item.doctorId === "object" ? (item.doctorId as IDoctor) : null;
    const statusConfig = getStatusConfig(item.status);
    const isUpcoming = item.status === "confirmed" && item.scheduledAt >= new Date();
    const canJoin = canJoinCall(item);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedAppointment(item);
          setModalVisible(true);
        }}
      >
        {/* Doctor Info Row */}
        {doctor && (
          <View style={styles.doctorRow}>
            <Image
              source={{ uri: getDoctorImageUri(doctor) }}
              style={styles.avatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.doctorName}>
                Dr. {doctor.firstName} {doctor.lastName}
              </Text>
              <Text style={styles.specialty}>{doctor.specialization}</Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusConfig.color + "20" }]}
            >
              <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* Date & Time */}
        <View style={styles.detailRow}>
          <Feather name="calendar" size={16} color="#666" />
          <Text style={styles.detailText}>
            {formatAppointmentTime(item.scheduledAt)}
          </Text>
          {isUpcoming && (
            <Text style={[styles.countdown, canJoin && { color: '#10B981', fontWeight: '700' }]}>
              • {getTimeUntil(item.scheduledAt)}
            </Text>
          )}
        </View>

        {/* Reason */}
        {item.reason && (
          <View style={styles.detailRow}>
            <Feather name="file-text" size={16} color="#666" />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.reason}
            </Text>
          </View>
        )}

        {/* Action Button */}
        {canJoin && (
          <TouchableOpacity 
            style={styles.joinButton}
            onPress={() => handleJoinCall(item)}
          >
            <Feather name="video" size={18} color="#FFF" />
            <Text style={styles.joinButtonText}>Join Consultation</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const filteredAppointments = getFilteredAppointments();

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consultation History</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(["upcoming", "pending", "past"] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#D81E5B" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredAppointments}
          keyExtractor={(item) => item._id ?? Math.random().toString()}
          renderItem={renderAppointmentCard}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#D81E5B"]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="calendar" size={64} color="#CCC" />
              <Text style={styles.emptyText}>
                No {activeTab} appointments
              </Text>
            </View>
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        />
      )}

      {/* Detail Modal */}
      {selectedAppointment && (
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.dragIndicator} />

              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Appointment Details</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {/* Doctor Info */}
              {typeof selectedAppointment.doctorId === "object" && (
                <View style={styles.modalDoctorRow}>
                  <Image
                    source={{
                      uri: getDoctorImageUri(selectedAppointment.doctorId as IDoctor),
                    }}
                    style={styles.modalAvatar}
                  />
                  <View>
                    <Text style={styles.modalDoctorName}>
                      Dr. {(selectedAppointment.doctorId as IDoctor).firstName}{" "}
                      {(selectedAppointment.doctorId as IDoctor).lastName}
                    </Text>
                    <Text style={styles.modalSpecialty}>
                      {(selectedAppointment.doctorId as IDoctor).specialization}
                    </Text>
                  </View>
                </View>
              )}

              {/* Details */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionLabel}>📅 Date & Time</Text>
                <Text style={styles.sectionValue}>
                  {selectedAppointment.scheduledAt.toLocaleString()}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.sectionLabel}>⏱️ Duration</Text>
                <Text style={styles.sectionValue}>{selectedAppointment.duration} minutes</Text>
              </View>

              {selectedAppointment.reason && (
                <View style={styles.modalSection}>
                  <Text style={styles.sectionLabel}>📝 Reason</Text>
                  <Text style={styles.sectionValue}>{selectedAppointment.reason}</Text>
                </View>
              )}

              {selectedAppointment.notes && (
                <View style={styles.modalSection}>
                  <Text style={styles.sectionLabel}>💭 Notes</Text>
                  <Text style={styles.sectionValue}>{selectedAppointment.notes}</Text>
                </View>
              )}

              {/* Status Badge */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionLabel}>Status</Text>
                <View
                  style={[
                    styles.modalStatusBadge,
                    { backgroundColor: getStatusConfig(selectedAppointment.status).color },
                  ]}
                >
                  <Text style={styles.modalStatusText}>
                    {getStatusConfig(selectedAppointment.status).label}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                {canJoinCall(selectedAppointment) && (
                  <TouchableOpacity 
                    style={styles.joinCallButton}
                    onPress={() => {
                      setModalVisible(false);
                      handleJoinCall(selectedAppointment);
                    }}
                  >
                    <Feather name="video" size={20} color="#FFF" />
                    <Text style={styles.joinCallText}>Join Call</Text>
                  </TouchableOpacity>
                )}

                {(selectedAppointment.status === "pending" ||
                  selectedAppointment.status === "confirmed") && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelAppointment(selectedAppointment._id!)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel Appointment</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#333" },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 20,
    marginHorizontal: 4,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  activeTab: { backgroundColor: "#D81E5B" },
  tabText: { fontSize: 14, color: "#666", fontWeight: "500" },
  activeTabText: { color: "#FFF", fontWeight: "700" },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#EEE" },
  doctorName: { fontSize: 16, fontWeight: "700", color: "#333" },
  specialty: { fontSize: 13, color: "#666" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: "600" },

  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 12 },

  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  detailText: { fontSize: 14, color: "#333", flex: 1 },
  countdown: { fontSize: 12, color: "#4CAF50", fontWeight: "600" },

  joinButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  joinButtonText: { color: "#FFF", fontSize: 14, fontWeight: "700" },

  emptyState: { alignItems: "center", marginTop: 80 },
  emptyText: { fontSize: 16, color: "#999", marginTop: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: "80%",
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#CCC",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#333" },

  modalDoctorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 16,
  },
  modalAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#EEE" },
  modalDoctorName: { fontSize: 16, fontWeight: "700", color: "#333" },
  modalSpecialty: { fontSize: 14, color: "#666" },

  modalSection: { marginBottom: 16 },
  sectionLabel: { fontSize: 13, color: "#999", marginBottom: 4, fontWeight: "500" },
  sectionValue: { fontSize: 15, color: "#333", fontWeight: "500" },

  modalStatusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  modalStatusText: { color: "#FFF", fontSize: 13, fontWeight: "700" },

  modalActions: { marginTop: 20, gap: 12 },
  joinCallButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  joinCallText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  cancelButton: {
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#F44336",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: { color: "#F44336", fontSize: 16, fontWeight: "700" },
});