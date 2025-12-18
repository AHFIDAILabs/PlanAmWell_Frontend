// DoctorAppointmentsScreen.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  Easing,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { IDoctor, IAppointment } from "../../types/backendType";
import DoctorBottomBar from "../../components/common/DoctorBottomBar";
import { getDoctorAppointments } from "../../services/Appointment";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

/* ---------------- HELPERS ---------------- */
const getEffectiveStatus = (
  appt: IAppointment,
  callStatusMap: Record<string, string>
): string => {
  if (!appt?._id) return appt.status;

  const now = Date.now();
  const scheduledAt = new Date(appt.scheduledAt).getTime();
  const diffMinutes = (scheduledAt - now) / 60000;

  // Terminal backend states
  if (["cancelled", "rejected", "completed"].includes(appt.status)) {
    return appt.status;
  }

  // Ended window
  if (diffMinutes <= -120) return "call-ended";

  // Live call overrides
  const liveStatus = callStatusMap[appt._id];
  if (liveStatus) return liveStatus; // 'in-progress' or 'call-ended'

  // Confirmed but not started yet
  if (appt.status === "confirmed") {
    if (diffMinutes > 15) return "confirmed-upcoming"; // upcoming, not joinable
    if (diffMinutes <= 15 && diffMinutes >= 0) return "about-to-start"; // can show countdown
  }

  return appt.status; // fallback: pending, etc.
};

const getCountdownText = (appt: IAppointment | null | undefined) => {
  if (!appt) return "";
  const now = new Date();
  const scheduled = new Date(appt.scheduledAt);
  const diffMs = scheduled.getTime() - now.getTime();

  if (diffMs <= 0) return "Consultation in progress";

  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  return `Starts in ${mins}m ${secs}s`;
};

const canJoinConsultation = (appt: (IAppointment & { status?: string }) | null | undefined) => {
  if (!appt) return false;
  const status = typeof appt.status === "string" ? appt.status : undefined;
  if (!status || !["confirmed", "about-to-start"].includes(status)) return false;

  const now = new Date();
  const scheduled = new Date(appt.scheduledAt);
  const diffMinutes = (scheduled.getTime() - now.getTime()) / 60000;

  if (diffMinutes > 15) return false; // too early
  if (appt.consultationType === "in-person") return false;

  return true;
};

const statusLabelMap: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  "confirmed-upcoming": "Confirmed",
  "about-to-start": "Confirmed",
  "call-ended": "Call Ended",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
  "in-progress": "In Progress",
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
    case "confirmed-upcoming":
    case "about-to-start":
      return "#4CAF50";
    case "pending":
      return "#FFA500";
    case "rescheduled":
      return "#FF9800";
    case "completed":
      return "#2196F3";
    case "cancelled":
    case "rejected":
      return "#F44336";
    case "call-ended":
      return "#6B7280";
    case "in-progress":
      return "#EF4444";
    default:
      return "#9E9E9E";
  }
};

/* ---------------- SCREEN ---------------- */
export default function DoctorAppointmentsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const doctor = (user as any)?.doctor || (user as IDoctor);

  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<IAppointment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const [callStatusMap, setCallStatusMap] = useState<Record<string, string>>({}); // live call states

  const slideAnim = useRef(new Animated.Value(height)).current;

  /* -------- Countdown tick -------- */
  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadedDoctorId = (user as any)?.doctor?._id || (user as IDoctor)?._id || null;
    if (loadedDoctorId) setDoctorId(loadedDoctorId);
  }, [user]);

  useEffect(() => {
    if (!doctorId) return;

    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const response = await getDoctorAppointments([doctorId]);
        setAppointments(response || []);
      } catch (err) {
        console.error("Failed to fetch appointments:", err);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [doctorId]);

  const openModal = (appointment: IAppointment) => {
    setSelectedAppointment(appointment);
    setModalVisible(true);
    Animated.timing(slideAnim, {
      toValue: height * 0.25,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      setModalVisible(false);
      setSelectedAppointment(null);
    });
  };

  const handleJoinConsultation = () => {
    if (!selectedAppointment) return;

    closeModal();

    navigation.navigate("VideoCallScreen", {
      appointmentId: selectedAppointment._id,
      patientId:
        typeof selectedAppointment.userId === "object" && selectedAppointment.userId !== null
          ? (selectedAppointment.userId as any)._id
          : selectedAppointment.userId,
      role: "doctor",
      consultationType: selectedAppointment.consultationType || "video",
    });
  };

  const renderAppointment = ({ item }: { item: IAppointment }) => {
    const effectiveStatus = getEffectiveStatus(item, callStatusMap);
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.row}>
          <Text style={[styles.patientName, { color: colors.text }]}>
            Patient: {item.patientSnapshot?.name || "Anonymous"}
          </Text>
          <Text style={[styles.status, { color: getStatusColor(effectiveStatus) }]}>
            {statusLabelMap[effectiveStatus] || effectiveStatus}
          </Text>
        </View>
        <Text style={[styles.detail, { color: colors.textMuted }]}>
          {new Date(item.scheduledAt).toLocaleString()}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => openModal(item)}
        >
          <Text style={styles.buttonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Appointments</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      ) : appointments.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={50} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, marginTop: 10 }}>No appointments yet</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item, index) => item._id ?? index.toString()}
          renderItem={renderAppointment}
          contentContainerStyle={{ padding: 16 }}
        />
      )}

      {/* Modal */}
      {modalVisible && selectedAppointment && (
        <Pressable style={styles.modalOverlay} onPress={closeModal} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.modalContainer,
              { top: slideAnim, backgroundColor: colors.card, maxHeight: height * 0.85 },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Appointment Details</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Patient: <Text style={styles.modalValue}>{selectedAppointment.patientSnapshot?.name || "Anonymous"}</Text>
              </Text>

              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Status:{" "}
                <Text style={{ color: getStatusColor(getEffectiveStatus(selectedAppointment, callStatusMap)) }}>
                  {statusLabelMap[getEffectiveStatus(selectedAppointment, callStatusMap)]}
                </Text>
              </Text>

              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Scheduled Time: <Text style={styles.modalValue}>{new Date(selectedAppointment.scheduledAt).toLocaleString()}</Text>
              </Text>

              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Consultation Type: <Text style={styles.modalValue}>{selectedAppointment.consultationType || "Video"}</Text>
              </Text>

              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Reason: <Text style={styles.modalValue}>{selectedAppointment.reason || "N/A"}</Text>
              </Text>

              {/* Countdown */}
              {["confirmed", "about-to-start"].includes(getEffectiveStatus(selectedAppointment, callStatusMap)) && (
                <Text style={[styles.countdown, { color: colors.textMuted }]}>
                  {getCountdownText(selectedAppointment)}
                </Text>
              )}

              {/* Join Button */}
              {canJoinConsultation({ ...(selectedAppointment as any), status: getEffectiveStatus(selectedAppointment, callStatusMap) }) && (
                <TouchableOpacity
                  style={[styles.joinButton, { backgroundColor: colors.primary }]}
                  onPress={handleJoinConsultation}
                >
                  <Ionicons name="videocam" size={18} color="#fff" />
                  <Text style={styles.joinButtonText}>Join Consultation</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Animated.View>
        </Pressable>
      )}

      <DoctorBottomBar activeRoute="DoctorAppointmentsScreen" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontWeight: "700" },

  card: { borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  patientName: { fontWeight: "600" },
  status: { fontWeight: "700" },
  detail: { fontSize: 13, marginTop: 4 },

  button: { marginTop: 10, borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700" },

  empty: { flex: 1, justifyContent: "center", alignItems: "center" },

  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalContainer: { position: "absolute", left: 0, right: 0, height: height * 0.75, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalLabel: { marginTop: 10, fontWeight: "600" },
  modalValue: { fontWeight: "400" },

  countdown: { marginTop: 12, textAlign: "center" },

  joinButton: { marginTop: 20, paddingVertical: 14, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  joinButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
