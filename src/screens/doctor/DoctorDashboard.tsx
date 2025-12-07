import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function DoctorDashboardScreen({ navigation }: any) {
  const [selectedDate, setSelectedDate] = useState(19);

  // Mock doctor info - replace with API data
  const doctorInfo = {
    name: "Dr. Chen",
    avatar: "https://i.pravatar.cc/100?img=8",
    todayAppointments: 8,
    pendingRequests: 3,
    messages: 5,
  };

  // Up Next appointment
  const nextAppointment = {
    time: "10:30 AM",
    type: "Video Consultation",
    patientName: "Isabella Rossi",
    condition: "Follow-up consultation regarding recent test results",
  };

  // Schedule data with day names
  const scheduleData = [
    { date: 18, day: "Wed", appointments: 0 },
    { date: 19, day: "Thu", appointments: 3 },
    { date: 20, day: "Fri", appointments: 5 },
    { date: 21, day: "Sat", appointments: 2 },
    { date: 22, day: "Sun", appointments: 0 },
  ];

  // Today's appointments
  const appointments = [
    {
      id: "1",
      time: "11:00 AM",
      patientName: "Olivia Martinez",
      type: "In-Person Consultation",
      status: "confirmed",
    },
    {
      id: "2",
      time: "01:30 PM",
      patientName: "Benjamin Carter",
      type: "Video Consultation",
      status: "confirmed",
    },
    {
      id: "3",
      time: "04:00 PM",
      patientName: "Sophia Nguyen",
      type: "Annual Checkup",
      status: "pending",
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "#10B981";
      case "pending":
        return "#3B82F6";
      default:
        return "#6B7280";
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.doctorInfo}>
              <Image source={{ uri: doctorInfo.avatar }} style={styles.avatar} />
              <Text style={styles.greeting}>
                {getGreeting()}, {doctorInfo.name}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
              <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Today's Appointments</Text>
              <Text style={styles.statValue}>{doctorInfo.todayAppointments}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Pending Requests</Text>
              <Text style={styles.statValue}>{doctorInfo.pendingRequests}</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Messages</Text>
            <Text style={styles.statValue}>{doctorInfo.messages}</Text>
          </View>
        </View>

        {/* Up Next Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Up Next</Text>
          <View style={styles.upNextCard}>
            <View style={styles.upNextHeader}>
              <Text style={styles.upNextTime}>{nextAppointment.time}</Text>
              <Text style={styles.upNextType}>{nextAppointment.type}</Text>
            </View>
            <Text style={styles.upNextPatient}>{nextAppointment.patientName}</Text>
            <Text style={styles.upNextCondition} numberOfLines={2}>
              {nextAppointment.condition}
            </Text>
            <View style={styles.upNextActions}>
              <TouchableOpacity style={styles.joinButton}>
                <Text style={styles.joinButtonText}>Join Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.viewDetailsButton}>
                <Text style={styles.viewDetailsButtonText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* My Schedule Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Schedule</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scheduleScroll}
            contentContainerStyle={styles.scheduleContent}
          >
            {scheduleData.map((item) => {
              const isSelected = item.date === selectedDate;
              return (
                <TouchableOpacity
                  key={item.date}
                  style={[
                    styles.scheduleDate,
                    isSelected && styles.scheduleDateActive,
                  ]}
                  onPress={() => setSelectedDate(item.date)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextActive,
                    ]}
                  >
                    {item.day}
                  </Text>
                  <Text
                    style={[
                      styles.dateText,
                      isSelected && styles.dateTextActive,
                    ]}
                  >
                    {item.date}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Appointment List */}
          <View style={styles.appointmentList}>
            {appointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentLeft}>
                  <Text style={styles.appointmentTime}>{appointment.time}</Text>
                  <Text style={styles.appointmentLabel}>AM</Text>
                </View>
                <View style={styles.appointmentRight}>
                  <Text style={styles.appointmentPatient}>
                    {appointment.patientName}
                  </Text>
                  <Text style={styles.appointmentType}>{appointment.type}</Text>
                </View>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: getStatusColor(appointment.status) },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => console.log("Add Appointment")}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  
  // Header Card
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  doctorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
  },
  greeting: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },

  // Up Next Card
  upNextCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  upNextHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  upNextTime: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EF4444",
  },
  upNextType: {
    fontSize: 12,
    color: "#EF4444",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  upNextPatient: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  upNextCondition: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
  },
  upNextActions: {
    flexDirection: "row",
    gap: 12,
  },
  joinButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  viewDetailsButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },

  // Schedule
  scheduleScroll: {
    marginBottom: 20,
  },
  scheduleContent: {
    gap: 12,
  },
  scheduleDate: {
    width: 60,
    height: 70,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  scheduleDateActive: {
    backgroundColor: "#EF4444",
  },
  dayText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  dayTextActive: {
    color: "#FEE2E2",
  },
  dateText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  dateTextActive: {
    color: "#fff",
  },

  // Appointment List
  appointmentList: {
    gap: 12,
  },
  appointmentCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  appointmentLeft: {
    alignItems: "center",
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  appointmentLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  appointmentRight: {
    flex: 1,
  },
  appointmentPatient: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  appointmentType: {
    fontSize: 13,
    color: "#6B7280",
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
});