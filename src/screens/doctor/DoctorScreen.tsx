import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useRoute } from "@react-navigation/native";

import Header from "../../components/home/header";
import BottomBar from "../../components/common/BottomBar";
// Removed unused imports: fetchApprovedDoctors, fetchDoctorProfile
import { AppStackParamList } from "../../types/App";

type DoctorRouteProps = RouteProp<AppStackParamList, "DoctorScreen">;


export const DoctorScreen: React.FC = () => {
  const route = useRoute<DoctorRouteProps>();
  const doctor = route.params?.doctor;

  if (!doctor) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ fontWeight: 'bold' }}>Error: Doctor data not found.</Text>
      </SafeAreaView>
    );
  }

  // 💡 FIX APPLIED HERE: Prioritize the 'profileImage' string URL
  const doctorImageUri =
    typeof doctor.profileImage === "string" // Check the profileImage field first
      ? doctor.profileImage
      : typeof doctor.doctorImage === "string" // Fallback to doctorImage if it's a string
      ? doctor.doctorImage
      : doctor.doctorImage?.imageUrl || // Fallback to nested imageUrl
        "https://placehold.co/150x150?text=No+Image"; // Final placeholder


  return (
    <SafeAreaView style={StyleSheet.absoluteFill}>
      <Header />

      <ScrollView contentContainerStyle={styles.container}>
        <LinearGradient
          colors={["#D81E5B20", "#ffffff00"]}
          style={styles.headerBg}
        />

        {/* This now uses the corrected doctorImageUri */}
        <Image source={{ uri: doctorImageUri }} style={styles.avatar} />

        <Text style={styles.name}>
          {doctor.firstName} {doctor.lastName}
        </Text>
        <Text style={styles.specialty}>{doctor.specialization}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {doctor.yearsOfExperience || 0}+
            </Text>
            <Text style={styles.statLabel}>Years</Text>
          </View>

          <View style={styles.stat}>
            <Text style={styles.statValue}>1.2k</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>

          <View style={styles.stat}>
            <Text style={styles.statValue}>{doctor.ratings || 0}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Bio</Text>

        <Text style={styles.about}>{doctor.bio || "No bio available."}</Text>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Book Appointment</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomBar activeRoute="AllDoctorScreen" cartItemCount={0} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: "center" },
  headerBg: { position: "absolute", top: 0, width: "100%", height: 250 },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 80,
    marginTop: 40,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "#D81E5B55",
  },
  name: { fontSize: 24, fontWeight: "700" },
  specialty: { fontSize: 16, color: "#777", marginBottom: 20 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
    marginTop: 10,
  },
  stat: { alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700", color: "#D81E5B" },
  statLabel: { fontSize: 12, color: "#777" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 25, alignSelf: "flex-start" },
  about: { fontSize: 15, color: "#555", lineHeight: 22, marginTop: 8 },
  button: { backgroundColor: "#D81E5B", paddingVertical: 14, borderRadius: 14, width: "100%", marginTop: 30 },
  buttonText: { color: "#fff", fontSize: 16, textAlign: "center", fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});