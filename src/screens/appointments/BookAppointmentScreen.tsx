import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
} from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { RFValue } from "react-native-responsive-fontsize";

import { createAppointment } from "../../services/Appointment";
import { AppStackParamList } from "../../types/App";
import { useAuth } from "../../hooks/useAuth";

type DoctorRouteProps = RouteProp<AppStackParamList, "BookAppointmentScreen">;

const DURATION_OPTIONS = [15, 30, 45, 60];

export const BookAppointmentScreen: React.FC = () => {
  const route = useRoute<DoctorRouteProps>();
  const navigation = useNavigation();
  const { user } = useAuth();

  const doctor = route.params?.doctor ?? { firstName: "", lastName: "", _id: "" };

  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState(30);
  const [reason, setReason] = useState("");
  const [shareUserInfo, setShareUserInfo] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (shareUserInfo && user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
    } else {
      setName("");
      setEmail("");
      setPhone("");
    }
  }, [shareUserInfo, user]);

  const next14Days = useMemo(() => {
    const arr: { date: Date; day: string; dayNum: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push({
        date: d,
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
      });
    }
    return arr;
  }, []);

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !reason.trim()) {
      return Toast.show({
        type: "error",
        text1: "Missing info",
        text2: "Select date, time, and provide a reason.",
      });
    }

    if (!doctor._id) {
      return Toast.show({
        type: "error",
        text1: "Doctor info missing",
        text2: "Cannot book appointment without doctor details.",
      });
    }

    try {
      setLoading(true);
      const appointmentDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        selectedTime.getHours(),
        selectedTime.getMinutes()
      );

      await createAppointment({
        doctorId: doctor._id,
        scheduledAt: appointmentDate,
        duration,
        reason,
        notes,
        shareUserInfo,
      });

      Toast.show({
        type: "success",
        text1: "Appointment sent",
        text2: "Doctor will confirm or suggest a new time.",
      });

      setTimeout(() => navigation.goBack(), 1200);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to create appointment.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <LinearGradient colors={["#FFE2F0", "#fff"]} style={styles.headerBg} />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Book Appointment</Text>
        <Text style={styles.subtitle}>
          Dr. {doctor.firstName} {doctor.lastName}
        </Text>

        {/* Mini Calendar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 16 }}>
          {next14Days.map((d) => {
            const selected = selectedDate?.toDateString() === d.date.toDateString();
            return (
              <TouchableOpacity
                key={d.date.toDateString()}
                style={[styles.datePill, selected && { backgroundColor: "#D81E5B" }]}
                onPress={() => setSelectedDate(d.date)}
              >
                <Text style={[styles.dateDay, selected && { color: "#fff", fontWeight: "700" }]}>{d.day}</Text>
                <Text style={[styles.dateNum, selected && { color: "#fff", fontWeight: "700" }]}>{d.dayNum}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time Picker */}
        <TouchableOpacity style={styles.inputButton} onPress={() => setShowTimePicker(true)}>
          <Text style={styles.inputButtonText}>
            {selectedTime ? selectedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Select Time"}
          </Text>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={selectedTime || new Date()}
            mode="time"
            onChange={(event, time) => {
              setShowTimePicker(false);
              if (time) setSelectedTime(time);
            }}
          />
        )}

        {/* Duration Selector */}
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((d) => {
            const selected = duration === d;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.durationOption, selected && { backgroundColor: "#D81E5B" }]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.durationText, selected && { color: "#fff", fontWeight: "700" }]}>{d} mins</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Reason for appointment"
          placeholderTextColor="#999"
          value={reason}
          onChangeText={setReason}
          multiline
        />
        <TextInput
          style={styles.input}
          placeholder="Notes (optional)"
          placeholderTextColor="#999"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <View style={styles.shareInfoRow}>
          <Text style={styles.shareInfoText}>Share my information</Text>
          <Switch value={shareUserInfo} onValueChange={setShareUserInfo} />
        </View>

        {shareUserInfo && (
          <View style={styles.userInfo}>
            <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#999" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={email} onChangeText={setEmail} />
            <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#999" value={phone} onChangeText={setPhone} />
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleBook} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Appointment</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerBg: { position: "absolute", top: 0, width: "100%", height: 180 },
  container: { padding: 20, paddingTop: 50 },

  title: { fontSize: RFValue(26), fontWeight: "800", marginBottom: 6, color: "#222" },
  subtitle: { fontSize: RFValue(16), color: "#555", marginBottom: 20 },

  datePill: {
    width: 60,
    height: 75,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateDay: { fontSize: RFValue(12), color: "#555" },
  dateNum: { fontSize: RFValue(18), fontWeight: "600", color: "#222" },

  inputButton: { borderWidth: 1, borderColor: "#ccc", padding: 14, borderRadius: 12, marginBottom: 16 },
  inputButtonText: { fontSize: RFValue(16), color: "#333" },

  durationRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  durationOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D81E5B",
    backgroundColor: "#FFF0F6",
  },
  durationText: { fontSize: RFValue(14), color: "#D81E5B" },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    fontSize: RFValue(16),
    color: "#333",
    backgroundColor: "#fff",
  },

  shareInfoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  shareInfoText: { fontSize: RFValue(16), color: "#333", fontWeight: "500" },
  userInfo: { marginBottom: 16 },

  button: { backgroundColor: "#D81E5B", paddingVertical: 16, borderRadius: 20, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontSize: RFValue(16), fontWeight: "700" },
});
