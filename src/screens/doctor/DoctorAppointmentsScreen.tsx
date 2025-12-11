import React, { useEffect, useState, useRef } from "react";
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

export default function DoctorAppointmentsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const doctor = (user as any)?.doctor || (user as IDoctor);

  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  const [selectedAppointment, setSelectedAppointment] = useState<IAppointment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Animation
  const slideAnim = useRef(new Animated.Value(height)).current;

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
      toValue: height * 0.25, // Modal top position (75% height)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "#4CAF50"; // green
      case "pending":
        return "#FFA500"; // orange
      case "rescheduled":
        return "#FF9800"; // darker orange
      case "completed":
        return "#2196F3"; // blue
      case "cancelled":
      case "rejected":
        return "#F44336"; // red
      default:
        return "#9E9E9E"; // grey
    }
  };

  const renderAppointment = ({ item }: { item: IAppointment }) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.row}>
        <Text style={[styles.patientName, { color: colors.text }]}>
          Patient: {item.patientSnapshot?.name || "Anonymous"}
        </Text>
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>
      <Text style={[styles.detail, { color: colors.textMuted }]}>
        Date: {new Date(item.scheduledAt).toLocaleString()}
      </Text>
      <Text style={[styles.detail, { color: colors.textMuted }]}>
        Duration: {item.duration || 30} mins
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => openModal(item)}
      >
        <Text style={styles.buttonText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );

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

      {/* Animated Bottom Sheet */}
      {modalVisible && (
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Animated.View
            style={[
              styles.modalContainer,
              { top: slideAnim, backgroundColor: colors.card },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Appointment Details
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Patient Name: <Text style={styles.modalValue}>{selectedAppointment?.patientSnapshot?.name || "Anonymous"}</Text>
              </Text>
              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Email: <Text style={styles.modalValue}>{selectedAppointment?.patientSnapshot?.email || "N/A"}</Text>
              </Text>
              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Phone: <Text style={styles.modalValue}>{selectedAppointment?.patientSnapshot?.phone || "N/A"}</Text>
              </Text>
              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Status: <Text style={{ color: getStatusColor(selectedAppointment?.status || "") }}>{selectedAppointment?.status}</Text>
              </Text>
              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Scheduled At: <Text style={styles.modalValue}>{selectedAppointment ? new Date(selectedAppointment.scheduledAt).toLocaleString() : ""}</Text>
              </Text>
              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Duration: <Text style={styles.modalValue}>{selectedAppointment?.duration || 30} mins</Text>
              </Text>
              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Reason: <Text style={styles.modalValue}>{selectedAppointment?.reason || "N/A"}</Text>
              </Text>
              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Notes: <Text style={styles.modalValue}>{selectedAppointment?.notes || "N/A"}</Text>
              </Text>
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
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  patientName: { fontWeight: "600" },
  status: { fontWeight: "700" },
  detail: { fontSize: 13 },
  button: { marginTop: 10, borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },

  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    height: height * 0.75,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 10,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalLabel: { fontWeight: "600", marginTop: 10 },
  modalValue: { fontWeight: "400" },
});
