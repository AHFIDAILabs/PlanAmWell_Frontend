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

export const MyAppointmentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * 🔄 Fetch appointments and map scheduledAt safely
   */
  const fetchAppointments = async () => {
    try {
      const data = await getMyAppointments();

      const mapped = (data || []).map((appt) => {
        let scheduledAt = new Date(appt.scheduledAt); // default

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

        return {
          ...appt,
          scheduledAt,
        };
      });

      // Optional: sort by scheduledAt ascending
      mapped.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

      setAppointments(mapped);
    } catch (e) {
      console.error("Failed to fetch appointments", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ Auto refresh when screen opens
  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [])
  );

  // ✅ Polling every 15 seconds (real-time feel)
  useEffect(() => {
    const interval = setInterval(fetchAppointments, 15000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const renderItem = ({ item }: { item: IAppointment }) => {
    const doctor =
      typeof item.doctorId === "object"
        ? (item.doctorId as IDoctor)
        : null;

    return (
      <View style={styles.card}>
        {doctor && (
          <TouchableOpacity
            style={styles.doctorRow}
            onPress={() =>
              navigation.navigate("DoctorProfileScreen", {
                doctorId: doctor._id,
              })
            }
          >
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
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        <Text style={styles.time}>
          🕒 {formatAppointmentTime(item.scheduledAt)}
        </Text>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>
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
          keyExtractor={(item) =>
            item._id ??
            item.createdAt?.toString() ??
            Math.random().toString()
          }
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#D81E5B"]}
            />
          }
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              No appointments yet
            </Text>
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
