// Enhanced NotificationsScreen.tsx - FULLY FIXED
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';

import { useNotifications } from '../../context/notificatonContext';
import socketService from '../../services/socketService';
import AppointmentModal from '../../components/appointment/AppointmentModal';
import { useAuth } from '../../hooks/useAuth';
import { useVideoCall } from '../../hooks/useVideoCall';
import {
  getDoctorAppointments,
  updateAppointment,
  getAppointmentById,
} from '../../services/Appointment';
import { IAppointment, INotification } from '../../types/backendType';
import BottomBar from '../../components/common/BottomBar';

// Extended status type including computed statuses
type ExtendedStatus = 
  | "pending" 
  | "confirmed" 
  | "in-progress" 
  | "completed" 
  | "cancelled" 
  | "rejected" 
  | "rescheduled"
  | "expired"
  | "call-ended"
  | "confirmed-upcoming"
  | "about-to-start";

const extractId = (field: any): string => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field._id) return String(field._id);
  return String(field);
};

// --- SAFE DATE PARSER ---
const parseDate = (dateField: any): Date | null => {
  if (!dateField) return null;

  if (typeof dateField === 'object') {
    if ('$date' in dateField) {
      if (typeof dateField.$date === 'object' && '$numberLong' in dateField.$date) {
        return new Date(Number(dateField.$date.$numberLong));
      }
      return new Date(dateField.$date);
    }
  }

  const d = new Date(dateField);
  return isNaN(d.getTime()) ? null : d;
};

// --- CHECK IF APPOINTMENT TIME HAS EXPIRED ---
const hasAppointmentExpired = (scheduledAt: Date): boolean => {
  const now = new Date();
  const appointmentTime = new Date(scheduledAt);
  const diffMinutes = (now.getTime() - appointmentTime.getTime()) / 60000;
  
  // Appointment expires 2 hours after scheduled time
  return diffMinutes > 120;
};

// --- CHECK IF APPOINTMENT IS JOINABLE ---
const isAppointmentJoinable = (appointment: IAppointment, currentRole: string): boolean => {
  const now = new Date();
  const scheduledAt = parseDate(appointment.scheduledAt);
  
  if (!scheduledAt) return false;
  
  const diffMinutes = (scheduledAt.getTime() - now.getTime()) / 60000;
  
  // Terminal states - never joinable
  if (['cancelled', 'rejected', 'completed'].includes(appointment.status)) {
    return false;
  }
  
  // Call already ended
  if (appointment.callStatus === 'ended') {
    return false;
  }
  
  // Check if expired (more than 2 hours past scheduled time)
  if (hasAppointmentExpired(scheduledAt)) {
    return false;
  }
  
  // Only confirmed appointments can be joined
  if (appointment.status !== 'confirmed') {
    return false;
  }
  
  // Doctor can join 15 minutes before
  if (currentRole === 'doctor') {
    return diffMinutes <= 15 && diffMinutes >= -120;
  }
  
  // Patient can join when doctor has started or within the time window
  return diffMinutes <= 15 && diffMinutes >= -120;
};

// --- GET APPOINTMENT STATUS MESSAGE ---
const getAppointmentStatusMessage = (appointment: IAppointment): { canJoin: boolean; message: string; title: string } => {
  const now = new Date();
  const scheduledAt = parseDate(appointment.scheduledAt);
  
  if (!scheduledAt) {
    return { canJoin: false, message: 'Invalid appointment time', title: 'Error' };
  }
  
  const diffMinutes = (scheduledAt.getTime() - now.getTime()) / 60000;
  
  // Terminal states
  if (appointment.status === 'cancelled') {
    return { canJoin: false, message: 'This appointment was cancelled.', title: 'Appointment Cancelled' };
  }
  
  if (appointment.status === 'rejected') {
    return { canJoin: false, message: 'This appointment was rejected by the doctor.', title: 'Appointment Rejected' };
  }
  
  if (appointment.status === 'completed') {
    return { canJoin: false, message: 'This appointment has been completed.', title: 'Appointment Completed' };
  }
  
  // Check if expired
  if (hasAppointmentExpired(scheduledAt)) {
    return { 
      canJoin: false, 
      message: 'This appointment has expired. The consultation window ended 2 hours after the scheduled time.\n\nWould you like to book a new appointment?', 
      title: 'Appointment Expired' 
    };
  }
  
  // Call ended but within window
  if (appointment.callStatus === 'ended') {
    return { 
      canJoin: false, 
      message: 'This call has ended. Would you like to book another appointment?', 
      title: 'Call Ended' 
    };
  }
  
  // Too early
  if (diffMinutes > 15) {
    const hoursUntil = Math.floor(diffMinutes / 60);
    const minutesUntil = Math.ceil(diffMinutes % 60);
    const timeString = hoursUntil > 0 
      ? `${hoursUntil} hour${hoursUntil > 1 ? 's' : ''} ${minutesUntil} minute${minutesUntil > 1 ? 's' : ''}`
      : `${minutesUntil} minute${minutesUntil > 1 ? 's' : ''}`;
    
    return { 
      canJoin: false, 
      message: `You can join 15 minutes before the scheduled time.\n\nTime remaining: ${timeString}`, 
      title: 'Too Early' 
    };
  }
  
  // Pending appointment
  if (appointment.status === 'pending') {
    return { 
      canJoin: false, 
      message: 'This appointment is pending confirmation from the doctor.', 
      title: 'Pending Confirmation' 
    };
  }
  
  // Can join
  return { canJoin: true, message: '', title: '' };
};

export const NotificationsScreen = () => {
  const {
    notifications,
    unreadCount,
    loading,
    isSocketConnected,
    markAsRead,
    refresh,
    filter,
    setFilter,
  } = useNotifications();

  const navigation = useNavigation<any>();
  const { isDoctor } = useAuth();
  const { getCallStatus } = useVideoCall();

  const [selectedAppointment, setSelectedAppointment] = useState<IAppointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [activeCallAlerts, setActiveCallAlerts] = useState<Set<string>>(new Set());

  const currentRole = isDoctor() ? 'doctor' : 'user';

  const processAppointments = (data: any[]): IAppointment[] => {
    if (!Array.isArray(data)) return [];
    return data.map((appt) => ({
      ...appt,
      scheduledAt: parseDate(appt.scheduledAt) || new Date(),
      patientName:
        appt.patientSnapshot?.name ||
        `${(appt.userId as any)?.firstName || ''} ${(appt.userId as any)?.lastName || ''}`.trim() ||
        'Anonymous',
    })) as IAppointment[];
  };

  useEffect(() => {
    const handleRejoinCall = (data: any) => {
      const { appointmentId, patientName, doctorName } = data;
      if (activeCallAlerts.has(appointmentId)) return;

      setActiveCallAlerts((prev) => new Set(prev).add(appointmentId));

      const nameToShow = currentRole === 'doctor' ? patientName : doctorName || 'Doctor';

      Alert.alert(
        '📞 Ongoing Call',
        `${nameToShow} is in the call and waiting for you.`,
        [
          { text: 'Ignore', style: 'cancel', onPress: () => removeActiveCallAlert(appointmentId) },
          {
            text: 'Join Now',
            onPress: async () => {
              try {
                const appointment = await getAppointmentById(appointmentId);
                if (!appointment) throw new Error('Appointment not found');

                // Check if appointment is still joinable
                const statusCheck = getAppointmentStatusMessage(appointment);
                if (!statusCheck.canJoin) {
                  Alert.alert(statusCheck.title, statusCheck.message);
                  removeActiveCallAlert(appointmentId);
                  return;
                }

                navigation.navigate('VideoCallScreen', {
                  appointmentId: appointment._id,
                  name: nameToShow,
                  role: currentRole === 'doctor' ? 'Doctor' : 'User',
                  autoJoin: true,
                  fromNotification: true,
                });
              } catch (error: any) {
                Toast.show({
                  type: 'error',
                  text1: 'Failed to join call',
                  text2: error.message || 'Try again from appointments',
                });
              } finally {
                removeActiveCallAlert(appointmentId);
              }
            },
          },
        ],
        { cancelable: false }
      );

      setTimeout(() => removeActiveCallAlert(appointmentId), 30000);
    };

    socketService.onNotification('patient-rejoin-call', handleRejoinCall);
    return () => socketService.offNotification('patient-rejoin-call', handleRejoinCall);
  }, [currentRole, activeCallAlerts, navigation]);

  const removeActiveCallAlert = (id: string) => {
    setActiveCallAlerts((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  useEffect(() => {
    if (currentRole === 'doctor') fetchAppointments();
  }, [currentRole]);

  const fetchAppointments = async (): Promise<IAppointment[]> => {
    try {
      setLoadingAppointments(true);
      const data = await getDoctorAppointments();
      const appointmentsWithDates = processAppointments(data);
      setAppointments(appointmentsWithDates);
      return appointmentsWithDates;
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      setAppointments([]);
      return [];
    } finally {
      setLoadingAppointments(false);
    }
  };

  const updateAppointmentStatus = async (
    appt: IAppointment,
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected' | 'rescheduled',
    successMsg: string
  ) => {
    try {
      const payload = { status, ...(appt.userId && { userId: extractId(appt.userId) }) };
      await updateAppointment(appt._id!, payload);
      Toast.show({ type: 'success', text1: successMsg });
      setShowModal(false);
      setSelectedAppointment(null);
      await fetchAppointments();
      refresh();
    } catch (error: any) {
      console.error('Failed to update appointment:', error);
      Toast.show({ type: 'error', text1: 'Failed to update appointment', text2: error.message });
    }
  };

  const handleAccept = (appt: IAppointment) => updateAppointmentStatus(appt, 'confirmed', 'Appointment confirmed');
  const handleReject = (appt: IAppointment) => updateAppointmentStatus(appt, 'rejected', 'Appointment rejected');

  const handleNotificationPress = async (notification: INotification) => {
    try {
      if (!notification.isRead) await markAsRead(notification._id);

      if (notification.type === 'call_ended') {
        const appointmentId = notification.metadata?.appointmentId;
        if (!appointmentId) return;

        Alert.alert(
          'Session Ended',
          'Would you like to book another consultation?',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Book Again',
              onPress: async () => {
                try {
                  const appointment = await getAppointmentById(appointmentId);
                  if (!appointment) throw new Error('Appointment not found');

                  const doctorId =
                    typeof appointment.doctorId === 'object'
                      ? appointment.doctorId._id
                      : appointment.doctorId;

                  navigation.navigate('BookAppointment', { doctorId });
                } catch (error: any) {
                  Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: error.message || 'Could not load appointment details',
                  });
                }
              },
            },
          ]
        );
        return;
      }

      if (notification.type !== 'appointment') return;

      const appointmentId = notification.metadata?.appointmentId;
      if (!appointmentId) return Alert.alert('Error', 'Appointment ID missing');

      const appointment = await getAppointmentById(appointmentId);
      if (!appointment) return Alert.alert('Error', 'Appointment not found');

      appointment.scheduledAt = parseDate(appointment.scheduledAt) || new Date();

      // Check appointment status
      const statusCheck = getAppointmentStatusMessage(appointment);
      
      if (!statusCheck.canJoin) {
        // Show appropriate message based on status
        if (hasAppointmentExpired(appointment.scheduledAt as Date) || 
            appointment.callStatus === 'ended') {
          Alert.alert(
            statusCheck.title,
            statusCheck.message,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Book New Appointment',
                onPress: async () => {
                  const doctorId =
                    typeof appointment.doctorId === 'object'
                      ? appointment.doctorId._id
                      : appointment.doctorId;

                  navigation.navigate('BookAppointment', { doctorId });
                },
              },
            ]
          );
        } else {
          Alert.alert(statusCheck.title, statusCheck.message);
        }
        
        // Still show modal for doctors to manage appointments
        if (currentRole === 'doctor') {
          setSelectedAppointment(appointment);
          setShowModal(true);
        }
        return;
      }

      // Check if call is active
      try {
        const callStatus = await getCallStatus(appointment._id!);
        const isCallActive = callStatus.success && callStatus.data?.isActive;

        const nameToShow =
          currentRole === 'doctor'
            ? appointment.patientSnapshot?.name || 'Patient'
            : typeof appointment.doctorId === 'object' && appointment.doctorId && 'firstName' in appointment.doctorId
            ? `${(appointment.doctorId as any).firstName} ${(appointment.doctorId as any).lastName || ''}`.trim()
            : 'Doctor';

        if (isCallActive) {
          // Call is active, join directly
          navigation.navigate('VideoCallScreen', {
            appointmentId: appointment._id,
            name: nameToShow,
            role: currentRole === 'doctor' ? 'Doctor' : 'User',
            autoJoin: true,
            fromNotification: true,
          });
        } else {
          // Call not active yet
          if (currentRole === 'doctor') {
            // Doctors can start the call
            setSelectedAppointment(appointment);
            setShowModal(true);
          } else {
            // Patients see a prompt
            Alert.alert(
              'Call Not Started',
              'The doctor has not started the call yet. You can wait or try again later.',
              [
                { text: 'OK', style: 'cancel' },
                {
                  text: 'View Appointment',
                  onPress: () => navigation.navigate('MyAppointments', { appointmentId }),
                },
              ]
            );
          }
        }
      } catch (error) {
        console.error('Error checking call status:', error);
        // On error, show appointment details
        if (currentRole === 'doctor') {
          setSelectedAppointment(appointment);
          setShowModal(true);
        } else {
          navigation.navigate('MyAppointments', { appointmentId });
        }
      }
    } catch (error: any) {
      console.error('Error handling notification:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    }
  };

  const navigateToAppointments = () =>
    navigation.navigate(currentRole === 'doctor' ? 'DoctorAppointment' : 'MyAppointments');

  const renderNotification = ({ item }: { item: INotification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
      disabled={loadingAppointments}
    >
      <View style={styles.notificationHeader}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.notificationMessage}>{item.message}</Text>
      <Text style={styles.notificationTime}>
        {parseDate(item.createdAt)?.toLocaleString() ?? 'Unknown Date'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotification}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </Text>
            </View>
          }
        />

        <AppointmentModal
          appointment={selectedAppointment}
          visible={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedAppointment(null);
          }}
          onAccept={handleAccept}
          onReject={handleReject}
          onBookAgain={() => {
            if (!selectedAppointment) return;
            navigation.navigate('BookAppointment', {
              doctorId:
                typeof selectedAppointment.doctorId === 'object'
                  ? selectedAppointment.doctorId._id
                  : selectedAppointment.doctorId,
            });
            setShowModal(false);
            setSelectedAppointment(null);
          }}
          getEffectiveStatus={(appt) => (appt?.status ? String(appt.status).toLowerCase() : 'unknown')}
          role={currentRole}
        />

        {loadingAppointments && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Loading appointments...</Text>
          </View>
        )}
      </View>
      <BottomBar activeRoute="NotificationScreen" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  notificationItem: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  unreadNotification: { backgroundColor: '#f0f8ff' },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  notificationTitle: { fontWeight: 'bold', fontSize: 16, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2196F3' },
  notificationMessage: { color: '#666', marginTop: 4, fontSize: 14 },
  notificationTime: { color: '#999', fontSize: 12, marginTop: 8 },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 16, marginTop: 16, marginBottom: 16 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#fff', fontSize: 16, fontWeight: '600' },
});