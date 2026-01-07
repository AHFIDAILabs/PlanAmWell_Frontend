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
import AppointmentModal from '../../components/appointment/AppointmentModal';
import { useAuth } from '../../hooks/useAuth';
import {
  getDoctorAppointments,
  updateAppointment,
  getAppointmentById,
} from '../../services/Appointment';
import { IAppointment, INotification } from '../../types/backendType';
import BottomBar from '../../components/common/BottomBar';

// --- Helpers ---
const parseDate = (dateField: any): Date | null => {
  if (!dateField) return null;
  const d = new Date(dateField);
  return isNaN(d.getTime()) ? null : d;
};

const hasAppointmentExpired = (scheduledAt: Date) => {
  const now = new Date();
  return (now.getTime() - scheduledAt.getTime()) / 60000 > 120; // 2 hours
};

const getAppointmentStatusMessage = (appt: IAppointment) => {
  const scheduledAt = parseDate(appt.scheduledAt);
  if (!scheduledAt) return { canJoin: false, message: 'Invalid appointment time', title: 'Error' };

  if (['cancelled', 'rejected', 'completed'].includes(appt.status)) {
    return { canJoin: false, message: `Appointment ${appt.status}`, title: `Appointment ${appt.status}` };
  }

  if (hasAppointmentExpired(scheduledAt) || appt.callStatus === 'ended') {
    return {
      canJoin: false,
      message: 'This appointment has expired or the call has ended. Book a new appointment?',
      title: 'Appointment Expired',
    };
  }

  if (appt.status === 'pending') {
    return { canJoin: false, message: 'Pending doctor confirmation', title: 'Pending Confirmation' };
  }

  return { canJoin: true, message: '', title: '' };
};

// --- Component ---
export const NotificationsScreen = () => {
  const { notifications, loading, markAsRead, refresh, filter } = useNotifications();
  const navigation = useNavigation<any>();
  const { isDoctor } = useAuth();

  const [selectedAppointment, setSelectedAppointment] = useState<IAppointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const currentRole = isDoctor() ? 'doctor' : 'user';

  // --- Fetch doctor's appointments ---
  const processAppointments = (data: any[]): IAppointment[] =>
    Array.isArray(data)
      ? data.map((appt) => ({
          ...appt,
          scheduledAt: parseDate(appt.scheduledAt) || new Date(),
          patientName:
            appt.patientSnapshot?.name ||
            `${(appt.userId as any)?.firstName || ''} ${(appt.userId as any)?.lastName || ''}`.trim() ||
            'Anonymous',
        }))
      : [];

  const fetchAppointments = async (): Promise<IAppointment[]> => {
    try {
      setLoadingAppointments(true);
      const data = await getDoctorAppointments();
      const appointmentsWithDates = processAppointments(data);
      setAppointments(appointmentsWithDates);
      return appointmentsWithDates;
    } catch (err) {
      console.error(err);
      setAppointments([]);
      return [];
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    if (currentRole === 'doctor') fetchAppointments();
  }, [currentRole]);

  // --- Appointment actions ---
  const updateAppointmentStatus = async (
    appt: IAppointment,
    status: 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'rescheduled',
    successMsg: string
  ) => {
    try {
      await updateAppointment(appt._id!, { status });
      Toast.show({ type: 'success', text1: successMsg });
      setShowModal(false);
      setSelectedAppointment(null);
      await fetchAppointments();
      refresh();
    } catch (err: any) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Failed to update appointment', text2: err.message });
    }
  };

  const handleAccept = (appt: IAppointment) => updateAppointmentStatus(appt, 'confirmed', 'Appointment confirmed');
  const handleReject = (appt: IAppointment) => updateAppointmentStatus(appt, 'rejected', 'Appointment rejected');

  // --- Handle notification press ---
  const handleNotificationPress = async (notification: INotification) => {
    try {
      if (!notification.isRead) await markAsRead(notification._id);

      if (notification.type === 'call_ended') {
        const appointmentId = notification.metadata?.appointmentId;
        if (!appointmentId) return;

        Alert.alert('Session Ended', 'Would you like to book another consultation?', [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Book Again',
            onPress: async () => {
              const appointment = await getAppointmentById(appointmentId);
              if (!appointment) return;
              const doctorId =
                typeof appointment.doctorId === 'object' ? appointment.doctorId._id : appointment.doctorId;
              navigation.navigate('BookAppointment', { doctorId });
            },
          },
        ]);
        return;
      }

      if (notification.type !== 'appointment') return;

      const appointmentId = notification.metadata?.appointmentId;
      if (!appointmentId) return Alert.alert('Error', 'Appointment ID missing');

      const appointment = await getAppointmentById(appointmentId);
      if (!appointment) return Alert.alert('Error', 'Appointment not found');

      const statusCheck = getAppointmentStatusMessage(appointment);

      if (!statusCheck.canJoin) {
        if (currentRole === 'doctor') {
          setSelectedAppointment(appointment);
          setShowModal(true);
        } else {
          Alert.alert(statusCheck.title, statusCheck.message);
        }
        return;
      }

      // If joinable (patients just navigate to appointment)
      if (currentRole === 'doctor') {
        setSelectedAppointment(appointment);
        setShowModal(true);
      } else {
        navigation.navigate('MyAppointments', { appointmentId });
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Something went wrong');
    }
  };

  // --- Render notification ---
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
          } }
          onAccept={handleAccept}
          onReject={handleReject}
          role={currentRole} getEffectiveStatus={function (appt: IAppointment): string {
            throw new Error('Function not implemented.');
          } }        />

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

// --- Styles ---
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
