import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY } from "../../services/Auth";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, RouteProp, useRoute, CompositeNavigationProp } from "@react-navigation/native";

import Header from "../../components/home/header";
import BottomBar from "../../components/common/BottomBar";
import { AppStackParamList } from "../../types/App";
import { AuthStackParamList } from "../../types/Auth";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getDoctorImageUri } from "../../services/Doctor";
import { useAuth } from "../../hooks/useAuth";

// ── Composite Navigation Type ─────────────────────────────────────────
type DoctorScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AppStackParamList, "DoctorScreen">,   // AppStack
  NativeStackNavigationProp<AuthStackParamList, "Register"> // AuthStack
>;

type DoctorRouteProps = RouteProp<AppStackParamList, "DoctorScreen">;

// ── Component ───────────────────────────────────────────────────────────
export const DoctorScreen: React.FC = () => {
  const route = useRoute<DoctorRouteProps>();
  const navigation = useNavigation<DoctorScreenNavigationProp>();
  const doctor = route.params?.doctor;
  const {isAnonymous} = useAuth();

  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // ── Handle Book Appointment Press ──────────────────────────────
const handleBookPress = async () => {
  try {
    // Check if user is anonymous / guest
    if (isAnonymous) {
      setShowRegisterModal(true);
      return;
    }

    // ✅ User is registered → navigate to booking screen
    navigation.navigate("BookAppointmentScreen", { doctor });
  } catch (error) {
    console.error("Auth check failed:", error);
  }
};

  // ── Modal Actions ─────────────────────────────────────────────
  const handleRegister = () => {
    setShowRegisterModal(false);
    navigation.navigate("Register"); // navigate to registration
  };

  const handleCancelModal = () => {
    setShowRegisterModal(false);
  };

  // ── Doctor Image URI ──────────────────────────────────────────
  const doctorImageUri = getDoctorImageUri(doctor);

  return (
    <SafeAreaView style={StyleSheet.absoluteFill}>
      <Header />

      <ScrollView contentContainerStyle={styles.container}>
        <LinearGradient
          colors={["#D81E5B20", "#ffffff00"]}
          style={styles.headerBg}
        />

        <Image source={{ uri: doctorImageUri }} style={styles.avatar} />

        <Text style={styles.name}>
          {doctor.firstName} {doctor.lastName}
        </Text>
        <Text style={styles.specialty}>{doctor.specialization}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{doctor.yearsOfExperience || 0}+</Text>
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

        <TouchableOpacity
          style={styles.button}
          onPress={handleBookPress}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Book Appointment</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomBar activeRoute="AllDoctorScreen" cartItemCount={0} />

      {/* ── Registration Modal ─────────────────────────────── */}
      <Modal
        visible={showRegisterModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Registration Required</Text>
            <Text style={styles.modalMessage}>
              You need to register to book an appointment.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#D81E5B" }]}
                onPress={handleRegister}
              >
                <Text style={styles.modalButtonText}>Register Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#aaa" }]}
                onPress={handleCancelModal}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ───────────────────────────────────────────────────────────
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
  name: { fontSize: 26, fontWeight: "700" },
  specialty: { fontSize: 16, color: "#555", marginBottom: 20 },
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
  button: {
    backgroundColor: "#D81E5B",
    paddingVertical: 16,
    borderRadius: 16,
    width: "100%",
    marginTop: 30,
    alignItems: "center",
    shadowColor: "#D81E5B",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // ── Modal styles ───────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  modalMessage: { fontSize: 15, color: "#555", textAlign: "center", marginBottom: 20 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: "center",
  },
  modalButtonText: { color: "#fff", fontWeight: "600" },
});