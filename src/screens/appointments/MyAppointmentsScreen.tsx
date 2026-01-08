// src/screens/MyAppointmentsScreen.tsx - COMPLETE WITH SOCKET SUPPORT

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

import { getMyAppointments, formatAppointmentTime } from "../../services/Appointment";
import { getDoctorImageUri } from "../../services/Doctor";
import { IAppointment, IDoctor } from "../../types/backendType";
import { useVideoCall } from "../../hooks/useVideoCall";
import AppointmentModal from "../../components/appointment/AppointmentModal";
import BottomBar from "../../components/common/BottomBar";
import socketService from "../../services/socketService"; // Correct import

export const MyAppointmentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { getCallStatus } = useVideoCall();

  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [callStatusMap, setCallStatusMap] = useState<{ [key: string]: string }>({});
  const [selectedAppointment, setSelectedAppointment] = useState<IAppointment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [joiningCall, setJoiningCall] = useState<string | null>(null);

  const getEffectiveStatus = useCallback(
    (appt: IAppointment): string => {
      if (!appt?._id) return appt.status;

      const now = Date.now();
      const scheduledAt = new Date(appt.scheduledAt).getTime();
      const diffMinutes = (scheduledAt - now) / 60000;

      if (appt.callStatus === "ended") return "call-ended";
      if (appt.callStatus === "in-progress" || appt.callStatus === "ringing") return "in-progress";
      if (["cancelled", "rejected", "completed"].includes(appt.status)) return appt.status;
      if (diffMinutes <= -120) return "call-ended";

      const liveStatus = callStatusMap[appt._id];
      if (liveStatus) return liveStatus;

      return appt.status;
    },
    [callStatusMap]
  );

  const fetchAppointments = async () => {
    try {
      const data = await getMyAppointments();

      const mapped = (data || []).map((appt) => {
        let scheduledAt = new Date(appt.scheduledAt);

        if (appt.scheduledAt && typeof appt.scheduledAt === "object" && "$date" in appt.scheduledAt) {
          scheduledAt = new Date(Number((appt.scheduledAt as any).$date.$numberLong));
        }

        return { ...appt, scheduledAt };
      });

      mapped.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
      setAppointments(mapped);

      const now = new Date();
      const statusPromises = mapped
        .filter((appt) => {
          const diffMinutes = (appt.scheduledAt.getTime() - now.getTime()) / 60000;
          return (
            appt.status === "confirmed" &&
            diffMinutes <= 15 &&
            diffMinutes > -120 &&
            appt.callStatus !== "ended"
          );
        })
        .map(async (appt) => {
          try {
            const statusResp = await getCallStatus(appt._id!);
            if (statusResp.success && statusResp.data) {
              return { id: appt._id!, isActive: statusResp.data.isActive === true };
            }
            return { id: appt._id!, isActive: false };
          } catch (err) {
            return { id: appt._id!, isActive: false };
          }
        });

      const statusResults = await Promise.all(statusPromises);

      const newStatusMap: { [key: string]: string } = {};
      statusResults.forEach((result) => {
        const appt = mapped.find((a) => a._id === result.id);
        if (!appt) return;
        const now = new Date();
        const diffMinutes = (appt.scheduledAt.getTime() - now.getTime()) / 60000;

        if (diffMinutes > 15) newStatusMap[result.id] = "confirmed";
        else if (diffMinutes <= 15 && diffMinutes >= 0)
          newStatusMap[result.id] = result.isActive ? "in-progress" : "confirmed";
        else if (diffMinutes < 0 && diffMinutes >= -120)
          newStatusMap[result.id] = result.isActive ? "in-progress" : "confirmed";
        else newStatusMap[result.id] = "call-ended";
      });

      setCallStatusMap(newStatusMap);
    } catch (e) {
      console.error("❌ Failed to fetch appointments:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Socket listeners
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleCallEnded = (data: { appointmentId: string; callDuration?: number; endedBy?: string }) => {
      setAppointments((prev) =>
        prev.map((appt) =>
          appt._id === data.appointmentId
            ? { ...appt, callStatus: "ended", callDuration: data.callDuration, status: "completed" }
            : appt
        )
      );
      setCallStatusMap((prev) => ({ ...prev, [data.appointmentId]: "call-ended" }));

      if (selectedAppointment?._id === data.appointmentId) {
        setSelectedAppointment((prev) =>
          prev ? { ...prev, callStatus: "ended", callDuration: data.callDuration, status: "completed" } : null
        );
      }
    };

    const handleCallStarted = (data: { appointmentId: string }) => {
      setAppointments((prev) =>
        prev.map((appt) =>
          appt._id === data.appointmentId ? { ...appt, callStatus: "in-progress" } : appt
        )
      );
      setCallStatusMap((prev) => ({ ...prev, [data.appointmentId]: "in-progress" }));
    };

    const handleCallRinging = (data: { appointmentId: string }) => {
      setAppointments((prev) =>
        prev.map((appt) => (appt._id === data.appointmentId ? { ...appt, callStatus: "ringing" } : appt))
      );
      setCallStatusMap((prev) => ({ ...prev, [data.appointmentId]: "in-progress" }));
    };

    const handleAppointmentUpdated = (data: { appointment: IAppointment }) => {
      setAppointments((prev) =>
        prev.map((appt) => (appt._id === data.appointment._id ? { ...appt, ...data.appointment } : appt))
      );
    };

    socket.on("call-ended", handleCallEnded);
    socket.on("call-started", handleCallStarted);
    socket.on("call-ringing", handleCallRinging);
    socket.on("appointment-updated", handleAppointmentUpdated);

    return () => {
      socket.off("call-ended", handleCallEnded);
      socket.off("call-started", handleCallStarted);
      socket.off("call-ringing", handleCallRinging);
      socket.off("appointment-updated", handleAppointmentUpdated);
    };
  }, [selectedAppointment]);

  // Join rooms
  useEffect(() => {
    if (appointments.length === 0) return;
    appointments.forEach((appt) => appt._id && socketService.joinAppointment(appt._id));
    return () => {
      appointments.forEach((appt) => appt._id && socketService.leaveAppointment(appt._id));
    };
  }, [appointments.length]);

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const relevantAppointments = appointments.filter((appt) => {
        const diffMinutes = (appt.scheduledAt.getTime() - now.getTime()) / 60000;
        return appt.status === "confirmed" && diffMinutes <= 15 && diffMinutes > -120 && appt.callStatus !== "ended";
      });
      if (relevantAppointments.length > 0) fetchAppointments();
    }, 15000);
    return () => clearInterval(interval);
  }, [appointments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const handleAppointmentPress = async (appt: IAppointment) => {
    const now = new Date();
    const diffMinutes = (appt.scheduledAt.getTime() - now.getTime()) / 60000;
    const effectiveStatus = getEffectiveStatus(appt);

    if (effectiveStatus === "call-ended" || appt.callStatus === "ended") {
      setSelectedAppointment(appt);
      setModalVisible(true);
      return;
    }

    if (["cancelled", "rejected", "completed"].includes(appt.status)) {
      setSelectedAppointment(appt);
      setModalVisible(true);
      return;
    }

    if (diffMinutes > 15) {
      Alert.alert(
        "Too Early",
        `You can join 15 minutes before the scheduled time.\n\nTime remaining: ${Math.ceil(diffMinutes - 15)} minutes`
      );
      return;
    }

    if (diffMinutes <= -120) {
      Alert.alert("Call Ended", "This call has ended and can no longer be joined.");
      return;
    }

    try {
      setJoiningCall(appt._id!);
      const response = await getCallStatus(appt._id!);

      const { isActive } = response.data ?? { isActive: false };
      const doctorName =
        typeof appt.doctorId === "object" ? `Dr. ${appt.doctorId.firstName} ${appt.doctorId.lastName}` : "Doctor";

      if (isActive) {
        navigation.navigate("VideoCallScreen", {
          appointmentId: appt._id,
          name: doctorName,
          role: "User",
          autoJoin: true,
          fromAppointmentList: true,
        });
      } else {
        Alert.alert("Start Video Call?", "The doctor has not started the call yet.", [
          { text: "Wait", style: "cancel" },
          {
            text: "Start Call",
            onPress: () =>
              navigation.navigate("VideoCallScreen", {
                appointmentId: appt._id,
                name: doctorName,
                role: "User",
                autoJoin: true,
                fromAppointmentList: true,
              }),
          },
        ]);
      }
    } catch (error) {
      Alert.alert("Error", "Unable to check call status. Please try again.");
    } finally {
      setJoiningCall(null);
    }
  };

  const handleBookAgain = () => {
    if (!selectedAppointment) return;
    setModalVisible(false);

    const doctor = typeof selectedAppointment.doctorId === "object" ? selectedAppointment.doctorId : null;
    if (!doctor) return;

    navigation.navigate("BookAppointmentScreen", { doctor });
  };

  const renderItem = ({ item }: { item: IAppointment }) => {
    const doctor = typeof item.doctorId === "object" ? (item.doctorId as IDoctor) : null;
    const effectiveStatus = getEffectiveStatus(item);
    const now = new Date();
    const diffMinutes = (item.scheduledAt.getTime() - now.getTime()) / 60000;
    const canJoin =
      item.status === "confirmed" && diffMinutes <= 15 && diffMinutes > -120 && item._id && item.callStatus !== "ended" && effectiveStatus !== "call-ended";
    const isJoining = joiningCall === item._id;

    return (
      <TouchableOpacity style={[styles.card, isJoining && styles.cardDisabled]} onPress={() => handleAppointmentPress(item)} disabled={isJoining}>
        {doctor && (
          <View style={styles.doctorRow}>
            <Image source={{ uri: getDoctorImageUri(doctor) }} style={styles.avatar} />
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

        {diffMinutes > 0 && diffMinutes <= 60 && (
          <Text style={styles.countdown}>⏰ Starts in {Math.ceil(diffMinutes)} minutes</Text>
        )}

        <View style={styles.statusRow}>
          <View style={[styles.statusPill, { backgroundColor: getStatusColor(effectiveStatus) }]}>
            <Text style={styles.statusText}>{effectiveStatus === "in-progress" ? "🔴 LIVE" : effectiveStatus.toUpperCase()}</Text>
          </View>

          {canJoin && !isJoining && (
            <TouchableOpacity style={styles.joinButton} onPress={() => handleAppointmentPress(item)}>
              <Text style={styles.joinButtonText}>{effectiveStatus === "in-progress" ? "JOIN NOW" : "JOIN CALL"}</Text>
            </TouchableOpacity>
          )}

          {isJoining && (
            <View style={styles.joiningIndicator}>
              <ActivityIndicator size="small" color="#10B981" />
              <Text style={styles.joiningText}>Checking...</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>My Appointments</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#D81E5B" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item._id ?? Math.random().toString()}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#D81E5B"]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No appointments yet</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}

      <AppointmentModal
        appointment={selectedAppointment}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onBookAgain={handleBookAgain}
        getEffectiveStatus={getEffectiveStatus}
        role="user"
      />

      <BottomBar activeRoute={"MyAppointmentsScreen"} />
    </SafeAreaView>
  );
};

// Status colors
export const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "#FBBF24";
    case "confirmed":
      return "#10B981";
    case "in-progress":
      return "#EF4444";
    case "call-ended":
      return "#6B7280";
    case "completed":
      return "#3B82F6";
    case "cancelled":
    case "rejected":
      return "#9CA3AF";
    case "rescheduled":
      return "#8B5CF6";
    default:
      return "#D1D5DB";
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F9FAFB" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16, color: "#111" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  cardDisabled: { opacity: 0.6 },
  doctorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#E5E7EB" },
  name: { fontSize: 17, fontWeight: "700", color: "#111" },
  spec: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 14 },
  time: { fontSize: 15, fontWeight: "600", color: "#374151" },
  countdown: { fontSize: 13, color: "#F59E0B", fontWeight: "600", marginTop: 6 },
  statusRow: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  statusPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  joinButton: { flex: 1, backgroundColor: "#10B981", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  joinButtonText: { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  joiningIndicator: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  joiningText: { color: "#10B981", fontSize: 14, fontWeight: "600" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, color: "#9CA3AF", textAlign: "center" },
});