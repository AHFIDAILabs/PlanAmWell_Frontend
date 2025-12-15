// DoctorDashboardScreen.tsx - WITH MODERN CALENDAR AVAILABILITY UI

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "../../hooks/useAuth";
import { IDoctor, IAppointment } from "../../types/backendType";
import { getDoctorAppointments, updateAppointment } from "../../services/Appointment";
import { updateDoctorAvailabilityService, fetchMyDoctorProfile } from "../../services/Doctor";
import { useTheme } from "../../context/ThemeContext";
import { notificationService } from "../../services/notification";
import DoctorBottomBar from "../../components/common/DoctorBottomBar";
import { Alert } from "react-native";
import AppointmentModal from "../../components/appointment/AppointmentModal";



const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function DoctorDashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const doctorUser = user && (user as any).status === "approved" ? (user as IDoctor) : null;

  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<IAppointment | null>(null);
  const [availability, setAvailability] = useState<Record<string, any>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [messagesCount, setMessagesCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!doctorUser) {
      navigation.replace("HomeScreen");
      return;
    }
    
    fetchAppointments();
    fetchAvailability();
    fetchNotificationCount();
  }, [authLoading, doctorUser]);

  const fetchAvailability = async () => {
    try {
      setAvailabilityLoading(true);
      const doctorProfile = await fetchMyDoctorProfile();
      if (doctorProfile) {
        // Initialize with default structure if empty
        const defaultAvailability = DAYS_OF_WEEK.reduce((acc, day) => ({
          ...acc,
          [day]: { available: false, from: "09:00", to: "17:00" }
        }), {});
        
        setAvailability({ ...defaultAvailability, ...doctorProfile.availability });
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Failed to load availability", text2: error.message });
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const fetchAppointments = async () => {
    if (!doctorUser?._id) return;
    try {
      setAppointmentsLoading(true);
      const data = await getDoctorAppointments();
      if (!Array.isArray(data)) return setAppointments([]);

      const appointmentsWithDates = data
        .map(appt => ({
          ...appt,
          scheduledAt: new Date(appt.scheduledAt),
          patientName:
            appt.patientSnapshot?.name ||
            `${(appt.userId as any)?.firstName || ""} ${(appt.userId as any)?.lastName || ""}`.trim() ||
            "Anonymous",
        }))
        .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

      setAppointments(appointmentsWithDates);
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Failed to load appointments", text2: error.message });
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      if (response.success) {
        setNotificationCount(response.data.count);
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    await fetchNotificationCount();
    setRefreshing(false);
  };

  const getNextAppointment = () => {
    const now = new Date();
    const futureConfirmed = appointments
      .filter(a => a.status === "confirmed" && new Date(a.scheduledAt) >= now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    return futureConfirmed[0] || null;
  };

  const handleAccept = async (appt: IAppointment) => {
    try {
      await updateAppointment(appt._id!, { status: "confirmed" });
      Toast.show({ type: "success", text1: "Appointment confirmed" });
      fetchAppointments();
      setShowModal(false);
    } catch (error: any) {
      Toast.show({ 
        type: "error", 
        text1: "Failed to confirm", 
        text2: error.response?.data?.message || error.message 
      });
    }
  };

  const handleReject = async (appt: IAppointment) => {
    try {
      await updateAppointment(appt._id!, { status: "rejected" });
      Toast.show({ type: "success", text1: "Appointment rejected" });
      fetchAppointments();
      setShowModal(false);
    } catch (error: any) {
      Toast.show({ 
        type: "error", 
        text1: "Failed to reject", 
        text2: error.response?.data?.message || error.message 
      });
    }
  };

  const openAppointmentModal = (appt: IAppointment) => {
    setSelectedAppointment(appt);
    setShowModal(true);
  };

  const toggleAvailability = (day: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        available: !prev[day]?.available
      }
    }));
  };

  const updateTime = (day: string, field: 'from' | 'to', value: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSaveAvailability = async () => {
    try {
      setAvailabilityLoading(true);
      const updatedDoctor = await updateDoctorAvailabilityService(availability);
      if (updatedDoctor) {
        setAvailability(updatedDoctor.availability || {});
        Toast.show({ type: "success", text1: "Availability updated successfully" });
        setShowAvailabilityModal(false);
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Failed to update availability", text2: error.message });
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const setAllDaysAvailability = (available: boolean) => {
    const updated: Record<string, any> = {};
    DAYS_OF_WEEK.forEach(day => {
      updated[day] = { ...availability[day], available };
    });
    setAvailability(updated);
  };

  const setWeekdaysOnly = () => {
  const updated: Record<string, any> = {};
  DAYS_OF_WEEK.forEach(day => {
    updated[day] = {
      ...availability[day],
      available: !["Saturday", "Sunday"].includes(day),
    };
  });
  setAvailability(updated);
};

const handleJoinCall = (appointment: IAppointment) => {
 navigation.getParent()?.navigate('VideoCallScreen', {
    appointmentId: appointment._id,
    name: appointment.patientSnapshot?.name,
    patientId: appointment.userId,
    role: 'doctor',
  });
};

console.log(navigation.getState().routeNames);



  const getStatusColor = (status: IAppointment["status"]) => {
    switch (status) {
      case "confirmed": return colors.success;
      case "pending": return colors.primary;
      case "rejected": return colors.error;
      case "rescheduled": return colors.secondary;
      case "cancelled":
      case "completed": return colors.textMuted;
      default: return colors.textMuted;
    }
  };

  const getStatusIcon = (status: IAppointment["status"]): string => {
    switch (status) {
      case "confirmed": return "checkmark-circle";
      case "pending": return "time";
      case "rejected": return "close-circle";
      case "rescheduled": return "refresh-circle";
      case "cancelled": return "close-circle-outline";
      case "completed": return "checkmark-done-circle";
      default: return "help-circle";
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getAvatarUri = () => {
    if (!doctorUser) return "";
    if (typeof doctorUser.profileImage === "string") return doctorUser.profileImage;
    return doctorUser.profileImage?.imageUrl || doctorUser.profileImage?.secure_url ||
      `https://ui-avatars.com/api/?name=${doctorUser.firstName}+${doctorUser.lastName}`;
  };

  const scheduleData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dayAppointments = appointments.filter(
      (a) => a.scheduledAt.toDateString() === date.toDateString()
    );
    return {
      date: date.getDate(),
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      appointments: dayAppointments.length,
      fullDate: date,
    };
  });

  const todayAppointmentsCount = useMemo(
    () => appointments.filter(a => a.scheduledAt.toDateString() === new Date().toDateString()).length,
    [appointments]
  );

  const pendingRequestsCount = useMemo(
    () => appointments.filter(a => a.status === "pending").length,
    [appointments]
  );

  const availableDaysCount = useMemo(
    () => Object.values(availability).filter((d: any) => d?.available).length,
    [availability]
  );

  const totalWeeklyHours = useMemo(() => {
    return Object.values(availability)
      .filter((d: any) => d?.available)
      .reduce((sum, d: any) => {
        if (!d?.from || !d?.to) return sum;
        const from = new Date(`2000-01-01T${d.from}`);
        const to = new Date(`2000-01-01T${d.to}`);
        return sum + (to.getTime() - from.getTime()) / (1000 * 60 * 60);
      }, 0);
  }, [availability]);

  const nextAppointment = getNextAppointment();

  const selectedDateAppointments = useMemo(
    () => appointments
      .filter(a => a.scheduledAt.getDate() === selectedDate)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()),
    [appointments, selectedDate]
  );

  if (authLoading || appointmentsLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading appointments...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const doctorLastName = doctorUser?.lastName || doctorUser?.firstName || "Doctor";

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Dashboard Header */}
        <LinearGradient colors={["#D81E5B20", "#ffffff"]} style={styles.headerGradient}>
          <View style={styles.headerTop}>
            <View style={styles.doctorInfo}>
              <TouchableOpacity onPress={() => navigation.navigate("DoctorProfileScreen", { doctor: doctorUser })}>
                <Image source={{ uri: getAvatarUri() }} style={styles.avatar} />
              </TouchableOpacity>
              <View>
                <Text style={[styles.greeting, { color: colors.textMuted }]}>{getGreeting()},</Text>
                <Text style={[styles.doctorName, { color: colors.text }]}>Dr. {doctorLastName}</Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => navigation.navigate("NotificationsScreen")}
              style={{ position: 'relative' }}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

       {/* Stats */}
<View style={[styles.statsRow, { marginTop: 10 }]}>
  {/* Today's Appointments */}
  <TouchableOpacity
    style={[styles.statItem, { backgroundColor: colors.card }]}
    onPress={() => navigation.navigate("DoctorAppointment", { filter: "today" })}
  >
    <Text style={[styles.statLabel, { color: colors.textMuted }]}>
      Today's Appointments
    </Text>
    <Text style={[styles.statValue, { color: colors.text }]}>
      {todayAppointmentsCount}
    </Text>
  </TouchableOpacity>

  {/* Pending Requests */}
  <TouchableOpacity
    style={[styles.statItem, { backgroundColor: colors.card }]}
    onPress={() =>
      navigation.navigate("DoctorAppointment", { status: "pending" })
    }
  >
    <Text style={[styles.statLabel, { color: colors.textMuted }]}>
      Pending Requests
    </Text>
    <Text style={[styles.statValue, { color: colors.text }]}>
      {pendingRequestsCount}
    </Text>
  </TouchableOpacity>

  {/* Messages */}
  <TouchableOpacity
    style={[styles.statItem, { backgroundColor: colors.card }]}
    onPress={() => navigation.navigate("NotificationsScreen")}
  >
    <Text style={[styles.statLabel, { color: colors.textMuted }]}>
      Messages
    </Text>
    <Text style={[styles.statValue, { color: colors.text }]}>
      {messagesCount}
    </Text>
  </TouchableOpacity>
</View>


        {/* Next Appointment */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Up Next</Text>
          {nextAppointment ? (
            <LinearGradient colors={["#D81E5B20", "#ffffff"]} style={[styles.upNextCard, { padding: 20 }]}>
              <Text style={[styles.upNextTime, { color: colors.primary }]}>{formatTime(nextAppointment.scheduledAt)} - Video Consultation</Text>
              <Text style={[styles.upNextPatient, { color: colors.text }]}>{nextAppointment.patientSnapshot?.name}</Text>
              <Text style={[styles.upNextCondition, { color: colors.textMuted }]} numberOfLines={2}>{nextAppointment.reason || "No details provided"}</Text>

              <View style={styles.upNextActions}>
                <TouchableOpacity style={[styles.joinButton, { backgroundColor: colors.primary }]} onPress={() => nextAppointment && handleJoinCall(nextAppointment)}>
                  <Text style={styles.joinButtonText}>Join Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.viewDetailsButton, { backgroundColor: colors.card }]} onPress={() => openAppointmentModal(nextAppointment)}>
                  <Text style={[styles.viewDetailsButtonText, { color: colors.text }]}>View Details</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          ) : (
            <View style={[styles.upNextCard, styles.emptyStateCard, { backgroundColor: colors.card, padding: 20 }]}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No confirmed appointments scheduled soon.</Text>
            </View>
          )}
        </View>

        {/* Modern Availability Calendar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Availability</Text>
            <TouchableOpacity 
              style={[styles.manageBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowAvailabilityModal(true)}
            >
              <Ionicons name="calendar" size={16} color="#fff" />
              <Text style={styles.manageBtnText}>Manage</Text>
            </TouchableOpacity>
          </View>

          <LinearGradient 
            colors={["#4F46E5", "#7C3AED"]} 
            style={styles.availabilitySummary}
          >
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Available Days</Text>
              <Text style={styles.summaryValue}>{availableDaysCount}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Hours</Text>
              <Text style={styles.summaryValue}>{totalWeeklyHours.toFixed(0)}h</Text>
            </View>
          </LinearGradient>

          {/* Quick Preview of Available Days */}
          <View style={styles.daysPreview}>
            {DAYS_OF_WEEK.map(day => {
              const dayData = availability[day];
              const isAvailable = dayData?.available;
              return (
                <View key={day} style={[
                  styles.dayChip,
                  { backgroundColor: isAvailable ? '#10B981' : '#E5E7EB' }
                ]}>
                  <Text style={[
                    styles.dayChipText,
                    { color: isAvailable ? '#fff' : '#6B7280' }
                  ]}>
                    {day.slice(0, 3)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Schedule</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scheduleScroll}>
            {scheduleData.map((item) => {
              const isSelected = item.date === selectedDate;
              return (
                <TouchableOpacity key={item.date} style={[styles.scheduleDate, isSelected && { backgroundColor: colors.primary }]} onPress={() => setSelectedDate(item.date)}>
                  <Text style={[styles.dayText, isSelected && { color: colors.background }]}>{item.day}</Text>
                  <Text style={[styles.dateText, isSelected && { color: colors.background }]}>{item.date}</Text>
                  {item.appointments > 0 && <View style={[styles.appointmentDot, isSelected && { backgroundColor: colors.background }]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.appointmentList}>
            {selectedDateAppointments.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No appointments for this day</Text>
              </View>
            ) : (
              selectedDateAppointments.map((appt) => (
                <TouchableOpacity key={appt._id} style={[styles.appointmentCard, { backgroundColor: colors.card }]} onPress={() => openAppointmentModal(appt)}>
                  <View style={styles.appointmentLeft}>
                    <Text style={[styles.appointmentTime, { color: colors.text }]}>{formatTime(appt.scheduledAt)}</Text>
                  </View>
                  <View style={styles.appointmentRight}>
                    <Text style={[styles.appointmentPatient, { color: colors.text }]}>{appt.patientSnapshot?.name}</Text>
                    <Text style={[styles.appointmentType, { color: colors.textMuted }]} numberOfLines={1}>{appt.reason || appt.status}</Text>
                  </View>
                  <Ionicons name={getStatusIcon(appt.status) as any} size={24} color={getStatusColor(appt.status)} style={styles.appointmentIcon} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Availability Management Modal */}
      <Modal visible={showAvailabilityModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.availabilityModal, { backgroundColor: colors.background }]}>
            <View style={styles.availabilityModalHeader}>
              <Text style={[styles.availabilityModalTitle, { color: colors.text }]}>
                Manage Availability
              </Text>
              <TouchableOpacity onPress={() => setShowAvailabilityModal(false)}>
                <Ionicons name="close-circle" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.availabilityModalContent}>
              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity 
                  style={styles.quickActionBtn}
                  onPress={() => setAllDaysAvailability(true)}
                >
                  <Text style={styles.quickActionText}>✅ Enable All</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickActionBtn}
                  onPress={() => setWeekdaysOnly()}
                >
                  <Text style={styles.quickActionText}>📅 Weekdays Only</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickActionBtn}
                  onPress={() => setAllDaysAvailability(false)}
                >
                  <Text style={styles.quickActionText}>❌ Disable All</Text>
                </TouchableOpacity>
              </View>

              {/* Days Configuration */}
              {DAYS_OF_WEEK.map((day) => {
                const dayData = availability[day] || { available: false, from: "09:00", to: "17:00" };
                return (
                  <View key={day} style={[styles.dayCard, { 
                    backgroundColor: colors.card,
                    borderColor: dayData.available ? '#10B981' : colors.border
                  }]}>
                    <View style={styles.dayCardHeader}>
                      <View style={styles.dayCardLeft}>
                        <View style={[styles.dayBadge, { 
                          backgroundColor: dayData.available ? '#10B981' : '#E5E7EB' 
                        }]}>
                          <Text style={[styles.dayBadgeText, {
                            color: dayData.available ? '#fff' : '#6B7280'
                          }]}>
                            {day.slice(0, 3)}
                          </Text>
                        </View>
                        <View>
                          <Text style={[styles.dayName, { color: colors.text }]}>{day}</Text>
                          <Text style={[styles.dayStatus, { 
                            color: dayData.available ? '#10B981' : '#6B7280' 
                          }]}>
                            {dayData.available ? '✓ Available' : '✗ Unavailable'}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => toggleAvailability(day)}
                        style={[styles.toggle, {
                          backgroundColor: dayData.available ? '#10B981' : '#E5E7EB'
                        }]}
                      >
                        <View style={[styles.toggleThumb, {
                          transform: [{ translateX: dayData.available ? 20 : 0 }]
                        }]} />
                      </TouchableOpacity>
                    </View>

                    {dayData.available && (
                      <View style={[styles.timeInputs, { backgroundColor: colors.background }]}>
                        <View style={styles.timeInputGroup}>
                          <Text style={[styles.timeLabel, { color: colors.textMuted }]}>From</Text>
                          <TextInput
                            style={[styles.timeInput, { 
                              color: colors.text,
                              borderColor: colors.border
                            }]}
                            value={dayData.from}
                            onChangeText={(text) => updateTime(day, 'from', text)}
                            placeholder="09:00"
                          />
                        </View>
                        <Ionicons name="arrow-forward" size={20} color={colors.textMuted} />
                        <View style={styles.timeInputGroup}>
                          <Text style={[styles.timeLabel, { color: colors.textMuted }]}>To</Text>
                          <TextInput
                            style={[styles.timeInput, { 
                              color: colors.text,
                              borderColor: colors.border
                            }]}
                            value={dayData.to}
                            onChangeText={(text) => updateTime(day, 'to', text)}
                            placeholder="17:00"
                          />
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveAvailabilityBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveAvailability}
              disabled={availabilityLoading}
            >
              {availabilityLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveAvailabilityBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Appointment Modal */}
   <AppointmentModal
  appointment={selectedAppointment}
  visible={showModal}
  onClose={() => setShowModal(false)}
  onAccept={handleAccept}
  onReject={handleReject}
/>


            <DoctorBottomBar activeRoute="DoctorDashboardScreen" messagesCount={0} />

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 120,
  },

  /* ---------------- HEADER ---------------- */

  headerGradient: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  doctorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 50,
    backgroundColor: "#ddd",
  },

  greeting: {
    fontSize: 14,
    opacity: 0.8,
  },

  doctorName: {
    fontSize: 20,
    fontWeight: "700",
  },

  notificationBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#D81E5B",
    paddingHorizontal: 6,
    height: 18,
    minWidth: 18,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },

  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  /* ---------------- STATS ---------------- */

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 5,
  },

  statItem: {
    width: "32%",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },

  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },


  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  manageBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },



  upNextCard: {
    borderRadius: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  upNextTime: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },

  upNextPatient: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },

  upNextCondition: {
    fontSize: 13,
    lineHeight: 18,
  },

  upNextActions: {
    flexDirection: "row",
    marginTop: 16,
    gap: 10,
  },

  joinButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },

  joinButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  viewDetailsButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },

  viewDetailsButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },

  emptyStateCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    opacity: 0.8,
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    textAlign: "center",
  },

  /* ---------------- AVAILABILITY SUMMARY ---------------- */

  availabilitySummary: {
    marginTop: 10,
    padding: 18,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryItem: {
    alignItems: "center",
    flex: 1,
  },

  summaryLabel: {
    color: "#EDE9FE",
    fontSize: 13,
    marginBottom: 4,
  },

  summaryValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  summaryDivider: {
    width: 1,
    height: "70%",
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  daysPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },

  dayChip: {
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  dayChipText: {
    fontWeight: "700",
    fontSize: 12,
  },

 

  scheduleScroll: {
    paddingVertical: 12,
  },

  scheduleDate: {
    padding: 12,
    marginRight: 10,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    width: 70,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  dayText: {
    fontSize: 12,
  },

  dateText: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 2,
  },

  appointmentDot: {
    width: 8,
    height: 8,
    borderRadius: 50,
    backgroundColor: "#111",
    marginTop: 4,
  },

  appointmentList: {
    marginTop: 16,
  },

  appointmentCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  appointmentLeft: {
    width: 70,
  },

  appointmentTime: {
    fontSize: 16,
    fontWeight: "700",
  },

  appointmentRight: {
    flex: 1,
  },

  appointmentPatient: {
    fontSize: 16,
    fontWeight: "600",
  },

  appointmentType: {
    fontSize: 12,
    marginTop: 3,
  },

  appointmentIcon: {
    marginLeft: 10,
  },

  /* ---------------- FAB ---------------- */

  fab: {
    position: "absolute",
    bottom: 26,
    right: 26,
    width: 60,
    height: 60,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",

    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  /* ---------------- MODAL ---------------- */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  availabilityModal: {
    maxHeight: "85%",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 10,
  },

  availabilityModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  availabilityModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },

  availabilityModalContent: {
    marginTop: 10,
  },

  /* QUICK ACTIONS */
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  quickActionBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: "center",
  },

  quickActionText: {
    fontSize: 13,
    fontWeight: "600",
  },

  /* DAY CARDS */

  dayCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
  },

  dayCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dayCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  dayBadge: {
    width: 42,
    height: 42,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },

  dayBadgeText: {
    fontWeight: "700",
  },

  dayName: {
    fontSize: 16,
    fontWeight: "700",
  },

  dayStatus: {
    fontSize: 12,
    marginTop: 2,
  },

  toggle: {
    width: 48,
    height: 26,
    borderRadius: 20,
    padding: 3,
    justifyContent: "center",
  },

  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 20,
    backgroundColor: "#fff",
  },

  /* TIME INPUTS */

  timeInputs: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },

  timeInputGroup: {
    flex: 1,
  },

  timeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },

  timeInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    fontSize: 14,
  },

  saveAvailabilityBtn: {
    paddingVertical: 14,
    marginTop: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  saveAvailabilityBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  /* LOADING */

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  loadingText: {
    fontSize: 15,
  },



bottomSheet: {
  backgroundColor: "#fff",
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  paddingHorizontal: 20,
  paddingTop: 14,
  paddingBottom: 30,
  width: "100%",
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: -3 },
  elevation: 10,
},

dragIndicator: {
  width: 50,
  height: 5,
  backgroundColor: "#ccc",
  borderRadius: 3,
  alignSelf: "center",
  marginBottom: 12,
},

sheetHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 18,
},

sheetTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: "#222",
},

sheetSection: {
  marginBottom: 18,
},

sectionLabel: {
  fontSize: 14,
  fontWeight: "600",
  color: "#666",
  marginBottom: 4,
},

sectionValue: {
  fontSize: 16,
  color: "#222",
  fontWeight: "500",
},

statusBadge: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  alignSelf: "flex-start",
  marginTop: 6,
},

statusBadgeText: {
  fontSize: 13,
  fontWeight: "700",
  color: "#fff",
  letterSpacing: 0.5,
},

sheetActions: {
  marginTop: 8,
  flexDirection: "row",
  justifyContent: "space-between",
},

acceptBtn: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: "center",
  marginRight: 8,
},

rejectBtn: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: "center",
  marginLeft: 8,
},

btnText: {
  fontSize: 16,
  fontWeight: "700",
  color: "#fff",
},

});
