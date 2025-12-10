import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { updateDoctorAvailabilityService } from "../../services/Doctor";
import Toast from "react-native-toast-message";

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function DoctorAvailabilityScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [availability, setAvailability] = useState<Record<string, { from: string; to: string }>>({});

  useEffect(() => {
    if (user?.availability) setAvailability(user.availability);
  }, [user]);

  const handleChange = (day: string, field: "from" | "to", value: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

const handleSave = async () => {
  try {
    // ✅ Pass only the availability object
    await updateDoctorAvailabilityService(availability);
    Toast.show({ type: "success", text1: "Availability updated" });
  } catch (error: any) {
    Toast.show({ type: "error", text1: "Failed to update", text2: error.message });
  }
};

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Set Your Availability</Text>

      {weekdays.map((day) => (
        <View key={day} style={styles.row}>
          <Text style={[styles.dayText, { color: colors.text }]}>{day}</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.textMuted }]}
            placeholder="From (09:00)"
            value={availability[day]?.from || ""}
            onChangeText={(text) => handleChange(day, "from", text)}
          />
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.textMuted }]}
            placeholder="To (17:00)"
            value={availability[day]?.to || ""}
            onChangeText={(text) => handleChange(day, "to", text)}
          />
        </View>
      ))}

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.saveText}>Save Availability</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 15, gap: 10 },
  dayText: { width: 80, fontSize: 16 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 14 },
  saveBtn: { padding: 15, borderRadius: 12, alignItems: "center", marginTop: 20 },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
