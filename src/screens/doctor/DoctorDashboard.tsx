import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "../../hooks/useAuth";
import { IDoctor, IAppointment } from "../../types/backendType";
import { getDoctorAppointments, updateAppointment } from "../../services/Appointment";
import { updateDoctorAvailabilityService, fetchMyDoctorProfile } from "../../services/Doctor";
import { useTheme } from "../../context/ThemeContext";
import { notificationService } from "../../services/notification";

// Helper function to format time as 10:30 AM
const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function DoctorDashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const doctorUser = user && (user as any).status === "approved" ? (user as IDoctor) : null;

  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<IAppointment | null>(null);
  const [availability, setAvailability] = useState<Record<string, any>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [messagesCount, setMessagesCount] = useState(5);
  const [notificationCount, setNotificationCount] = useState(0);


 useEffect(() => {
  if (authLoading) return;
  if (!doctorUser) {
    navigation.replace("HomeScreen");
    return;
  }
  fetchAppointments();
  fetchAvailability();
  fetchNotificationCount(); // ✅ Add this
}, [authLoading, doctorUser]);


  const fetchAvailability = async () => {
    try {
      setAvailabilityLoading(true);
      const doctorProfile = await fetchMyDoctorProfile();
      if (doctorProfile) setAvailability(doctorProfile.availability || {});
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Failed to load availability", text2: error.message });
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const fetchAppointments = async () => {
    if (!doctorUser?._id) return;
    try {
      setAppointmentsLoading(true);
      const data = await getDoctorAppointments();
      if (!Array.isArray(data)) return setAppointments([]);

      const appointmentsWithDates = data
        .map(appt => ({
          ...appt,
          scheduledAt: new Date(appt.scheduledAt),
          patientName:
            appt.patientSnapshot?.name ||
            `${(appt.userId as any)?.firstName || ""} ${(appt.userId as any)?.lastName || ""}`.trim() ||
            "Anonymous",
        }))
        .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

      setAppointments(appointmentsWithDates);
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Failed to load appointments", text2: error.message });
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const fetchNotificationCount = async () => {
  try {
    const response = await notificationService.getUnreadCount();
    if (response.success) {
      setNotificationCount(response.data.count);
    }
  } catch (error) {
    console.error('Failed to fetch notification count:', error);
  }
};

const onRefresh = async () => {
  setRefreshing(true);
  await fetchAppointments();
  await fetchNotificationCount(); // ✅ Add this
  setRefreshing(false);
};
  const getNextAppointment = () => {
    const now = new Date();
    const futureConfirmed = appointments
      .filter(a => a.status === "confirmed" && new Date(a.scheduledAt) <= now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    return futureConfirmed[0] || null;
  };

  const handleAccept = async (appt: IAppointment) => {
    try {
      await updateAppointment(appt._id!, { status: "confirmed" });
      Toast.show({ type: "success", text1: "Appointment confirmed" });
      fetchAppointments();
      setShowModal(false);
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Failed to confirm", text2: error.message });
    }
  };

  const handleReject = async (appt: IAppointment) => {
    try {
      await updateAppointment(appt._id!, { status: "rejected" });
      Toast.show({ type: "success", text1: "Appointment rejected" });
      fetchAppointments();
      setShowModal(false);
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Failed to reject", text2: error.message });
    }
  };

  const openAppointmentModal = (appt: IAppointment) => {
    setSelectedAppointment(appt);
    setShowModal(true);
  };

const handleUpdateAvailability = async (newAvailability: Record<string, any>) => {
  try {
    setAvailabilityLoading(true);
    
    // ✅ Pass only the availability object
    const updatedDoctor = await updateDoctorAvailabilityService(newAvailability);

    if (updatedDoctor) {
      setAvailability(updatedDoctor.availability || {});
      Toast.show({ type: "success", text1: "Availability updated successfully" });
    }
  } catch (error: any) {
    Toast.show({ type: "error", text1: "Failed to update availability", text2: error.message });
  } finally {
    setAvailabilityLoading(false);
  }
};


  const getStatusColor = (status: IAppointment["status"]) => {
    switch (status) {
      case "confirmed": return colors.success;
      case "pending": return colors.primary;
      case "rejected": return colors.error;
      case "rescheduled": return colors.secondary;
      case "cancelled":
      case "completed": return colors.textMuted;
      default: return colors.textMuted;
    }
  };

  const getStatusIcon = (status: IAppointment["status"]): string => {
    switch (status) {
      case "confirmed": return "checkmark-circle";
      case "pending": return "time";
      case "rejected": return "close-circle";
      case "rescheduled": return "refresh-circle";
      case "cancelled": return "close-circle-outline";
      case "completed": return "checkmark-done-circle";
      default: return "help-circle";
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getAvatarUri = () => {
    if (!doctorUser) return "";
    if (typeof doctorUser.profileImage === "string") return doctorUser.profileImage;
    return doctorUser.profileImage?.imageUrl || doctorUser.profileImage?.secure_url ||
      `https://ui-avatars.com/api/?name=${doctorUser.firstName}+${doctorUser.lastName}`;
  };

  const scheduleData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dayAppointments = appointments.filter(
      (a) => a.scheduledAt.toDateString() === date.toDateString()
    );
    return {
      date: date.getDate(),
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      appointments: dayAppointments.length,
      fullDate: date,
    };
  });

  const todayAppointmentsCount = useMemo(
    () => appointments.filter(a => a.scheduledAt.toDateString() === new Date().toDateString()).length,
    [appointments]
  );

  const pendingRequestsCount = useMemo(
    () => appointments.filter(a => a.status === "pending").length,
    [appointments]
  );

  const nextAppointment = getNextAppointment();

  const selectedDateAppointments = useMemo(
    () => appointments
      .filter(a => a.scheduledAt.getDate() === selectedDate)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()),
    [appointments, selectedDate]
  );

  if (authLoading || appointmentsLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading appointments...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const doctorLastName = doctorUser?.lastName || doctorUser?.firstName || "Doctor";

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Dashboard Header */}
        <LinearGradient colors={["#D81E5B20", "#ffffff"]} style={styles.headerGradient}>
          <View style={styles.headerTop}>
            <View style={styles.doctorInfo}>
              <TouchableOpacity onPress={() => navigation.navigate("DoctorProfileScreen", { doctor: doctorUser })}>
                <Image source={{ uri: getAvatarUri() }} style={styles.avatar} />
              </TouchableOpacity>
              <View>
                <Text style={[styles.greeting, { color: colors.textMuted }]}>{getGreeting()},</Text>
                <Text style={[styles.doctorName, { color: colors.text }]}>Dr. {doctorLastName}</Text>
              </View>
            </View>
           <TouchableOpacity 
  onPress={() => navigation.navigate("NotificationsScreen")}
  style={{ position: 'relative' }}
>
  <Ionicons name="notifications-outline" size={24} color={colors.text} />
  {notificationCount > 0 && (
    <View style={{
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: '#D81E5B',
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    }}>
      <Text style={{
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
      }}>
        {notificationCount > 9 ? '9+' : notificationCount}
      </Text>
    </View>
  )}
</TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={[styles.statsRow, { marginTop: 10 }]}>
          <View style={[styles.statItem, { backgroundColor: colors.card }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Today's Appointments</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{todayAppointmentsCount}</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.card }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Pending Requests</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{pendingRequestsCount}</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.card }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Messages</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{messagesCount}</Text>
          </View>
        </View>

        {/* Next Appointment */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Up Next</Text>
          {nextAppointment ? (
            <LinearGradient colors={["#D81E5B20", "#ffffff"]} style={[styles.upNextCard, { padding: 20 }]}>
              <Text style={[styles.upNextTime, { color: colors.primary }]}>{formatTime(nextAppointment.scheduledAt)} - Video Consultation</Text>
              <Text style={[styles.upNextPatient, { color: colors.text }]}>{nextAppointment.patientSnapshot?.name}</Text>
              <Text style={[styles.upNextCondition, { color: colors.textMuted }]} numberOfLines={2}>{nextAppointment.reason || "No details provided"}</Text>

              <View style={styles.upNextActions}>
                <TouchableOpacity style={[styles.joinButton, { backgroundColor: colors.primary }]} onPress={() => console.log("Join Call")}>
                  <Text style={styles.joinButtonText}>Join Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.viewDetailsButton, { backgroundColor: colors.card }]} onPress={() => openAppointmentModal(nextAppointment)}>
                  <Text style={[styles.viewDetailsButtonText, { color: colors.text }]}>View Details</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          ) : (
            <View style={[styles.upNextCard, styles.emptyStateCard, { backgroundColor: colors.card, padding: 20 }]}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No confirmed appointments scheduled soon.</Text>
            </View>
          )}
        </View>

        {/* Schedule & Availability */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Schedule</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scheduleScroll}>
            {scheduleData.map((item) => {
              const isSelected = item.date === selectedDate;
              return (
                <TouchableOpacity key={item.date} style={[styles.scheduleDate, isSelected && { backgroundColor: colors.primary }]} onPress={() => setSelectedDate(item.date)}>
                  <Text style={[styles.dayText, isSelected && { color: colors.background }]}>{item.day}</Text>
                  <Text style={[styles.dateText, isSelected && { color: colors.background }]}>{item.date}</Text>
                  {item.appointments > 0 && <View style={[styles.appointmentDot, isSelected && { backgroundColor: colors.background }]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Availability</Text>
            {availabilityLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              Object.keys(availability).map((day) => (
                <View key={day} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ color: colors.text }}>{day}</Text>
                  <TouchableOpacity
                    onPress={() => handleUpdateAvailability({ ...availability, [day]: !availability[day] })}
                    style={{
                      paddingVertical: 4,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: availability[day] ? colors.success : colors.error,
                    }}
                  >
                    <Text style={{ color: "#fff" }}>{availability[day] ? "Available" : "Unavailable"}</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <View style={styles.appointmentList}>
            {selectedDateAppointments.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No appointments for this day</Text>
              </View>
            ) : (
              selectedDateAppointments.map((appt) => (
                <TouchableOpacity key={appt._id} style={[styles.appointmentCard, { backgroundColor: colors.card }]} onPress={() => openAppointmentModal(appt)}>
                  <View style={styles.appointmentLeft}>
                    <Text style={[styles.appointmentTime, { color: colors.text }]}>{formatTime(appt.scheduledAt)}</Text>
                  </View>
                  <View style={styles.appointmentRight}>
                    <Text style={[styles.appointmentPatient, { color: colors.text }]}>{appt.patientSnapshot?.name}</Text>
                    <Text style={[styles.appointmentType, { color: colors.textMuted }]} numberOfLines={1}>{appt.reason || appt.status}</Text>
                  </View>
                  <Ionicons name={getStatusIcon(appt.status) as any} size={24} color={getStatusColor(appt.status)} style={styles.appointmentIcon} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => console.log("Add Appointment")}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Appointment Modal */}
      {selectedAppointment && (
        <Modal visible={showModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.bottomSheet}>
              <View style={styles.dragIndicator} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Appointment Details</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close-circle" size={28} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={styles.sheetSection}>
                <Text style={styles.sectionLabel}>👤 Patient</Text>
                <Text style={styles.sectionValue}>{selectedAppointment.patientSnapshot?.name}</Text>
              </View>
              <View style={styles.sheetSection}>
                <Text style={styles.sectionLabel}>💡 Reason</Text>
                <Text style={styles.sectionValue}>{selectedAppointment.reason || "No details provided"}</Text>
              </View>
              <View style={styles.sheetSection}>
                <Text style={styles.sectionLabel}>⏰ Scheduled</Text>
                <Text style={styles.sectionValue}>{selectedAppointment.scheduledAt.toLocaleString()}</Text>
              </View>
              <View style={styles.sheetSection}>
                <Text style={styles.sectionLabel}>📌 Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedAppointment.status) }]}>
                  <Text style={styles.statusBadgeText}>{selectedAppointment.status.toUpperCase()}</Text>
                </View>
              </View>
              {selectedAppointment.notes && (
                <View style={styles.sheetSection}>
                  <Text style={styles.sectionLabel}>📝 Notes</Text>
                  <Text style={styles.sectionValue}>{selectedAppointment.notes}</Text>
                </View>
              )}
              <View style={styles.sheetActions}>
                {selectedAppointment.status === "pending" && (
                  <>
                    <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: "#4CAF50" }]} onPress={() => handleAccept(selectedAppointment)}>
                      <Text style={styles.btnText}>✅ Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.rejectBtn, { backgroundColor: "#F44336" }]} onPress={() => handleReject(selectedAppointment)}>
                      <Text style={styles.btnText}>❌ Reject</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 8, fontSize: 14 },
  headerGradient: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  doctorInfo: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
  greeting: { fontSize: 14 },
  doctorName: { fontSize: 20, fontWeight: "bold" },
  statsRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20 },
  statItem: { flex: 1, marginHorizontal: 4, borderRadius: 12, padding: 12, alignItems: "center" },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 18, fontWeight: "bold", marginTop: 4 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  upNextCard: { borderRadius: 12, marginBottom: 12 },
  emptyStateCard: { borderRadius: 12, padding: 20, justifyContent: "center", alignItems: "center" },
  emptyText: { marginTop: 8, fontSize: 14 },
  upNextTime: { fontSize: 16, fontWeight: "bold" },
  upNextPatient: { fontSize: 14, fontWeight: "bold", marginTop: 4 },
  upNextCondition: { fontSize: 12, marginTop: 2 },
  upNextActions: { flexDirection: "row", marginTop: 10 },
  joinButton: { flex: 1, padding: 8, borderRadius: 8, marginRight: 6, alignItems: "center" },
  joinButtonText: { color: "#fff", fontWeight: "bold" },
  viewDetailsButton: { flex: 1, padding: 8, borderRadius: 8, marginLeft: 6, alignItems: "center" },
  viewDetailsButtonText: { fontWeight: "bold" },
  scheduleScroll: { flexDirection: "row" },
  scheduleDate: { width: 60, marginRight: 12, padding: 8, borderRadius: 12, alignItems: "center" },
  dayText: { fontSize: 12 },
  dateText: { fontSize: 16, fontWeight: "bold" },
  appointmentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D81E5B", marginTop: 4 },
  appointmentList: { marginTop: 12 },
  appointmentCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 12, marginBottom: 8 },
  appointmentLeft: { width: 70 },
  appointmentTime: { fontWeight: "bold" },
  appointmentRight: { flex: 1, marginLeft: 12 },
  appointmentPatient: { fontSize: 14, fontWeight: "bold" },
  appointmentType: { fontSize: 12 },
  appointmentIcon: { marginLeft: 8 },
  fab: { position: "absolute", bottom: 20, right: 20, width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  bottomSheet: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  dragIndicator: { width: 40, height: 4, backgroundColor: "#ccc", borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: "bold" },
  sheetSection: { marginBottom: 12 },
  sectionLabel: { fontSize: 12, color: "#888" },
  sectionValue: { fontSize: 14, fontWeight: "bold" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: "flex-start" },
  statusBadgeText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  sheetActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  acceptBtn: { flex: 1, padding: 12, borderRadius: 12, marginRight: 6, alignItems: "center" },
  rejectBtn: { flex: 1, padding: 12, borderRadius: 12, marginLeft: 6, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "bold" },
});
