import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import {
  getMyAppointments,
  formatAppointmentTime,
  getStatusColor,
} from "../../services/Appointment";
import { getDoctorImageUri } from "../../services/Doctor";
import { IAppointment, IDoctor } from "../../types/backendType";
import { useVideoCall } from "../../hooks/useVideoCall";

export const MyAppointmentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { getCallStatus } = useVideoCall();

  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * 🔄 Fetch appointments and normalize scheduledAt
   */
  const fetchAppointments = async () => {
    try {
      const data = await getMyAppointments();

      const mapped = (data || []).map((appt) => {
        let scheduledAt = new Date(appt.scheduledAt);

        // Handle MongoDB date object format
        if (
          appt.scheduledAt &&
          typeof appt.scheduledAt === "object" &&
          "$date" in appt.scheduledAt &&
          typeof (appt.scheduledAt as any).$date === "object" &&
          "$numberLong" in (appt.scheduledAt as any).$date
        ) {
          scheduledAt = new Date(
            Number((appt.scheduledAt as any).$date.$numberLong)
          );
        }

        return { ...appt, scheduledAt };
      });

      mapped.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

      setAppointments(mapped);
    } catch (e) {
      console.error("Failed to fetch appointments", e);
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

  useEffect(() => {
    const interval = setInterval(fetchAppointments, 15000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  /**
   * ✅ Handle appointment click based on status & call
   */
  const handleAppointmentPress = async (appt: IAppointment) => {
    try {
      const now = new Date();
      const diffMinutes = (appt.scheduledAt.getTime() - now.getTime()) / 60000;

      // In-progress call: join immediately
      if (appt.status === "in-progress" || appt.callStatus === "in-progress") {
        navigation.navigate("VideoCallScreen", {
          appointmentId: appt._id,
          name:
            typeof appt.doctorId === "object"
              ? `Dr. ${appt.doctorId.firstName} ${appt.doctorId.lastName}`
              : "Doctor",
          role: "User",
          autoJoin: true,
        });
        return;
      }

      // Check if confirmed and video/audio consultation
      if (
        appt.status === "confirmed" &&
        ["video", "audio"].includes(appt.consultationType || "")
      ) {
        const callStatus = await getCallStatus(appt._id!);

        if (callStatus.success && callStatus.data?.isActive) {
          // Active call, join
          navigation.navigate("VideoCallScreen", {
            appointmentId: appt._id,
            name:
              typeof appt.doctorId === "object"
                ? `Dr. ${appt.doctorId.firstName} ${appt.doctorId.lastName}`
                : "Doctor",
            role: "User",
            autoJoin: true,
          });
          return;
        }

        // Check time window: 15 minutes before / after
        if (diffMinutes > 15) {
          Alert.alert(
            "Too Early",
            `You can join this call 15 minutes before scheduled time. Time remaining: ${Math.ceil(
              diffMinutes - 15
            )} minutes`
          );
          return;
        }

        if (diffMinutes < -15) {
          Alert.alert("Call Expired", "The appointment time has already passed.");
          return;
        }

        Alert.alert(
          "Not Started",
          "The doctor hasn't started the call yet. Please wait."
        );
        return;
      }

      // Rescheduled: show details with updated time
      if (appt.status === "rescheduled") {
        navigation.navigate("AppointmentDetails", { appointment: appt });
        return;
      }

      // Cancelled / Rejected / Completed: view details
      if (["cancelled", "rejected", "completed"].includes(appt.status)) {
        navigation.navigate("AppointmentDetails", { appointment: appt });
        return;
      }

      // Pending: show details (waiting for doctor)
      if (appt.status === "pending") {
        navigation.navigate("AppointmentDetails", { appointment: appt });
        return;
      }

      console.warn("Unhandled appointment status:", appt.status);
    } catch (err: any) {
      console.error("Failed to handle appointment press:", err);
      Alert.alert("Error", err.message || "Something went wrong");
    }
  };

  const renderItem = ({ item }: { item: IAppointment }) => {
    const doctor =
      typeof item.doctorId === "object" ? (item.doctorId as IDoctor) : null;

    return (
      <TouchableOpacity style={styles.card} onPress={() => handleAppointmentPress(item)}>
        {doctor && (
          <View style={styles.doctorRow}>
            <Image
              source={{ uri: getDoctorImageUri(doctor) }}
              style={styles.avatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                Dr. {doctor.firstName} {doctor.lastName}
              </Text>
              <Text style={styles.spec}>{doctor.specialization}</Text>
            </View>
          </View>
        )}

        <View style={styles.divider} />

        <Text style={styles.time}>🕒 {formatAppointmentTime(item.scheduledAt)}</Text>

        <View style={styles.statusRow}>
          <View
            style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) }]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>My Appointments</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#D81E5B" />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item._id ?? Math.random().toString()}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#D81E5B"]} />
          }
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20 }}>No appointments yet</Text>
          }
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F9FAFB" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 10 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  doctorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EEE",
  },

  name: { fontSize: 16, fontWeight: "700" },
  spec: { fontSize: 13, color: "#666" },

  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 12 },

  time: { fontSize: 14, fontWeight: "600" },

  statusRow: { marginTop: 12, flexDirection: "row" },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
