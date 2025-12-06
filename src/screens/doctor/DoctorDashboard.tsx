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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function DoctorDashboardScreen({ navigation }: any) {
    const [selectedDate, setSelectedDate] = useState(19);

    // Mock data - replace with actual data from your backend
    const doctorInfo = {
        name: "Dr. Chen",
        greeting: "Good Morning",
        todayAppointments: 8,
        pendingRequests: 3,
        upcomingConsults: 5,
    };

    const upcomingAppointments = [
        {
            id: "1",
            patientName: "Olivia Martinez",
            condition: "Follow-up consultation regarding recent test results",
            time: "10:00 AM",
            type: "video",
        },
        {
            id: "2",
            patientName: "Benjamin Carter",
            condition: "Initial Consultation",
            time: "11:30 AM",
            type: "in-person",
        },
        {
            id: "3",
            patientName: "Sophia Raymond",
            condition: "Routine Checkup",
            time: "2:00 PM",
            type: "video",
        },
    ];

    const scheduleData = [
        { date: 18, appointments: 0 },
        { date: 19, appointments: 3 },
        { date: 20, appointments: 5 },
        { date: 21, appointments: 2 },
        { date: 22, appointments: 4 },
    ];

    const renderScheduleDate = (item: any) => {
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
                        styles.scheduleDateText,
                        isSelected && styles.scheduleDateTextActive,
                    ]}
                >
                    {item.date}
                </Text>
                {item.appointments > 0 && (
                    <View
                        style={[
                            styles.appointmentBadge,
                            isSelected && styles.appointmentBadgeActive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.appointmentBadgeText,
                                isSelected && styles.appointmentBadgeTextActive,
                            ]}
                        >
                            {item.appointments}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderAppointmentCard = (appointment: any) => {
        return (
            <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                    <View style={styles.appointmentInfo}>
                        <Image
                            source={{ uri: `https://i.pravatar.cc/100?img=${appointment.id}` }}
                            style={styles.patientImage}
                        />
                        <View style={styles.appointmentDetails}>
                            <Text style={styles.patientName}>
                                {appointment.patientName}
                            </Text>
                            <Text style={styles.appointmentCondition} numberOfLines={2}>
                                {appointment.condition}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.appointmentTime}>
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={styles.timeText}>{appointment.time}</Text>
                    </View>
                </View>
                <View style={styles.appointmentActions}>
                    <TouchableOpacity style={styles.joinButton}>
                        <Ionicons
                            name={appointment.type === "video" ? "videocam" : "location"}
                            size={16}
                            color="#fff"
                        />
                        <Text style={styles.joinButtonText}>
                            {appointment.type === "video" ? "Join Call" : "View Details"}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.detailsButton}>
                        <Text style={styles.detailsButtonText}>View Details</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header with Gradient */}
                <LinearGradient
                    colors={["#4A90E2", "#357ABD"]}
                    style={styles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.headerTop}>
                        <View style={styles.greetingContainer}>
                            <Text style={styles.greeting}>
                                {doctorInfo.greeting}, {doctorInfo.name}
                            </Text>
                            <TouchableOpacity>
                                <Ionicons name="settings-outline" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Stats Cards */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Today</Text>
                            <Text style={styles.statValue}>{doctorInfo.todayAppointments}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Pending Requests</Text>
                            <Text style={styles.statValue}>{doctorInfo.pendingRequests}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>Upcoming</Text>
                            <Text style={styles.statValue}>{doctorInfo.upcomingConsults}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Up Next Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Up Next</Text>
                        <TouchableOpacity>
                            <Ionicons name="chevron-forward" size={20} color="#D81E5B" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.upNextCard}>
                        <View style={styles.upNextContent}>
                            <View style={styles.upNextLeft}>
                                <Text style={styles.upNextLabel}>Next Appointment</Text>
                                <Text style={styles.upNextPatient}>Olivia Martinez</Text>
                                <Text style={styles.upNextCondition} numberOfLines={2}>
                                    Follow-up consultation regarding recent test results
                                </Text>
                            </View>
                            <View style={styles.upNextRight}>
                                <Text style={styles.upNextTime}>10:00</Text>
                                <Text style={styles.upNextAmPm}>AM</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.joinCallButton}>
                            <Text style={styles.joinCallButtonText}>Join Call</Text>
                        </TouchableOpacity>
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
                        {scheduleData.map(renderScheduleDate)}
                    </ScrollView>

                    {/* Appointment List */}
                    <View style={styles.appointmentList}>
                        {upcomingAppointments.map(renderAppointmentCard)}
                    </View>
                </View>
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 30,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTop: {
        marginBottom: 20,
    },
    greetingContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    greeting: {
        fontSize: 24,
        fontFamily: "Inter_700Bold",
        color: "#fff",
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: 12,
        padding: 12,
        alignItems: "center",
    },
    statLabel: {
        fontSize: 12,
        fontFamily: "Inter_400Regular",
        color: "#fff",
        marginBottom: 4,
    },
    statValue: {
        fontSize: 24,
        fontFamily: "Inter_700Bold",
        color: "#fff",
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: "Inter_700Bold",
        color: "#1A1A1A",
    },
    upNextCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: "#F0F0F0",
    },
    upNextContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    upNextLeft: {
        flex: 1,
        marginRight: 12,
    },
    upNextLabel: {
        fontSize: 12,
        fontFamily: "Inter_400Regular",
        color: "#D81E5B",
        marginBottom: 4,
    },
    upNextPatient: {
        fontSize: 18,
        fontFamily: "Inter_700Bold",
        color: "#1A1A1A",
        marginBottom: 6,
    },
    upNextCondition: {
        fontSize: 13,
        fontFamily: "Inter_400Regular",
        color: "#666",
        lineHeight: 18,
    },
    upNextRight: {
        alignItems: "center",
        justifyContent: "center",
    },
    upNextTime: {
        fontSize: 28,
        fontFamily: "Inter_700Bold",
        color: "#1A1A1A",
    },
    upNextAmPm: {
        fontSize: 14,
        fontFamily: "Inter_600SemiBold",
        color: "#666",
    },
    joinCallButton: {
        backgroundColor: "#D81E5B",
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
    },
    joinCallButtonText: {
        fontSize: 14,
        fontFamily: "Inter_600SemiBold",
        color: "#fff",
    },
    scheduleScroll: {
        marginBottom: 20,
    },
    scheduleContent: {
        gap: 12,
    },
    scheduleDate: {
        width: 60,
        height: 80,
        backgroundColor: "#fff",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#E0E0E0",
    },
    scheduleDateActive: {
        backgroundColor: "#D81E5B",
        borderColor: "#D81E5B",
    },
    scheduleDateText: {
        fontSize: 24,
        fontFamily: "Inter_700Bold",
        color: "#1A1A1A",
    },
    scheduleDateTextActive: {
        color: "#fff",
    },
    appointmentBadge: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "#4A90E2",
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 6,
    },
    appointmentBadgeActive: {
        backgroundColor: "#fff",
    },
    appointmentBadgeText: {
        fontSize: 11,
        fontFamily: "Inter_700Bold",
        color: "#fff",
    },
    appointmentBadgeTextActive: {
        color: "#D81E5B",
    },
    appointmentList: {
        gap: 16,
    },
    appointmentCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: "#F0F0F0",
    },
    appointmentHeader: {
        marginBottom: 12,
    },
    appointmentInfo: {
        flexDirection: "row",
        marginBottom: 8,
    },
    patientImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#f5f5f5",
    },
    appointmentDetails: {
        flex: 1,
        marginLeft: 12,
        justifyContent: "center",
    },
    patientName: {
        fontSize: 16,
        fontFamily: "Inter_600SemiBold",
        color: "#1A1A1A",
        marginBottom: 4,
    },
    appointmentCondition: {
        fontSize: 13,
        fontFamily: "Inter_400Regular",
        color: "#666",
        lineHeight: 18,
    },
    appointmentTime: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    timeText: {
        fontSize: 13,
        fontFamily: "Inter_600SemiBold",
        color: "#666",
    },
    appointmentActions: {
        flexDirection: "row",
        gap: 12,
    },
    joinButton: {
        flex: 1,
        backgroundColor: "#4A90E2",
        borderRadius: 8,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    joinButtonText: {
        fontSize: 14,
        fontFamily: "Inter_600SemiBold",
        color: "#fff",
    },
    detailsButton: {
        flex: 1,
        backgroundColor: "#F0F0F0",
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    detailsButtonText: {
        fontSize: 14,
        fontFamily: "Inter_600SemiBold",
        color: "#1A1A1A",
    },
    fab: {
        position: "absolute",
        bottom: 30,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#D81E5B",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});