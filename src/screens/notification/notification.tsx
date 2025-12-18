// Enhanced NotificationsScreen.tsx - Users & Doctors can rejoin ongoing calls
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
import { useNotifications } from '../../context/notificatonContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import socketService from '../../services/socketService';
import { useNavigation } from '@react-navigation/native';
import { IAppointment } from '../../types/backendType';
import AppointmentModal from '../../components/appointment/AppointmentModal';
import { useAuth } from '../../hooks/useAuth';
import { getDoctorAppointments, updateAppointment, getAppointmentById } from '../../services/Appointment';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useVideoCall } from '../../hooks/useVideoCall';

// Helper to safely extract ID
const extractId = (field: any): string => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field._id) return String(field._id);
  return String(field);
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
  const [selectedAppointment, setSelectedAppointment] = useState<IAppointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [activeCallAlerts, setActiveCallAlerts] = useState<Set<string>>(new Set());
  const { isDoctor } = useAuth();
  const { getCallStatus } = useVideoCall();

  const isCurrentUserDoctor = isDoctor();
  const currentRole = isCurrentUserDoctor ? 'doctor' : 'user';

  // Process appointments
  const processAppointments = (data: any[]): IAppointment[] => {
    if (!Array.isArray(data)) return [];
    return data.map(appt => ({
      ...appt,
      scheduledAt: new Date(appt.scheduledAt),
      patientName:
        appt.patientSnapshot?.name ||
        `${(appt.userId as any)?.firstName || ''} ${(appt.userId as any)?.lastName || ''}`.trim() ||
        'Anonymous',
    })) as IAppointment[];
  };

  // Rejoin call listener (doctor & user)
  useEffect(() => {
    const handleRejoinCall = (data: any) => {
      const { appointmentId, patientName } = data;
      if (activeCallAlerts.has(appointmentId)) return;
      setActiveCallAlerts(prev => new Set(prev).add(appointmentId));

      const roleName = currentRole === 'doctor' ? 'Patient' : 'Doctor';
      const nameToShow = currentRole === 'doctor' ? patientName : data.doctorName || 'Doctor';

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
    setActiveCallAlerts(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  // Fetch appointments for doctors
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

  const testConnection = () => {
    const info = socketService.getConnectionInfo();
    if (info.connected) {
      socketService.ping();
      Alert.alert('✅ Socket Connected', `Transport: ${info.transport}\nSocket ID: ${info.socketId}`);
    } else {
      Alert.alert('❌ Socket Disconnected', 'Try reconnecting?', [
        { text: 'Reconnect', onPress: () => socketService.reconnect() },
        { text: 'Cancel', style: 'cancel' },
      ]);
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

  // Notification press (allow rejoin)
  const handleNotificationPress = async (notification: any) => {
    try {
      if (!notification.isRead) await markAsRead(notification._id);
      if (notification.type !== 'appointment') return;

      const appointmentId = notification.metadata?.appointmentId;
      if (!appointmentId) return Alert.alert('Error', 'Appointment ID missing');

      const appointment = await getAppointmentById(appointmentId);
      if (!appointment) return Alert.alert('Appointment not found');

      appointment.scheduledAt = new Date(appointment.scheduledAt);
      const now = new Date();
      const diffMinutes = (appointment.scheduledAt.getTime() - now.getTime()) / 60000;
      const callStatus = await getCallStatus(appointment._id!);
      const canJoin =
        callStatus.success && callStatus.data?.isActive ||
        (currentRole === 'doctor' && diffMinutes <= 15 && appointment.status === 'confirmed');

      if (canJoin) {
        const nameToShow =
          currentRole === 'doctor'
            ? appointment.patientSnapshot?.name || 'Patient'
            : (typeof appointment.doctorId === 'object' && appointment.doctorId && 'firstName' in appointment.doctorId)
            ? `${(appointment.doctorId as any).firstName} ${(appointment.doctorId as any).lastName || ''}`.trim()
            : 'Doctor';

        navigation.navigate('VideoCallScreen', {
          appointmentId: appointment._id,
          name: nameToShow,
          role: currentRole === 'doctor' ? 'Doctor' : 'User',
          autoJoin: true,
          fromNotification: true,
        });
        return;
      }

      if (currentRole === 'doctor') {
        setSelectedAppointment(appointment);
        setShowModal(true);
      } else {
        navigation.navigate('MyAppointments', { appointmentId });
      }
    } catch (error: any) {
      console.error('Error handling notification:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    }
  };

  const navigateToAppointments = () =>
    navigation.navigate(currentRole === 'doctor' ? 'DoctorAppointment' : 'MyAppointments');

  const renderNotification = ({ item }: any) => (
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
      <Text style={styles.notificationTime}>{new Date(item.createdAt).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications ({unreadCount})</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.viewAllButton} onPress={navigateToAppointments}>
              <Ionicons name="calendar" size={20} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.connectionIndicator, isSocketConnected ? styles.connected : styles.disconnected]}
              onPress={testConnection}
            >
              <Text style={styles.connectionText}>{isSocketConnected ? '🟢' : '🔴'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          {(['all', 'unread'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.activeFilter]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
                {f === 'all' ? 'All' : 'Unread'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick action for doctors */}
        {currentRole === 'doctor' && (
          <TouchableOpacity style={styles.quickActionBanner} onPress={navigateToAppointments}>
            <View style={styles.quickActionContent}>
              <Ionicons name="calendar" size={24} color="#2196F3" />
              <View style={styles.quickActionText}>
                <Text style={styles.quickActionTitle}>View All Appointments</Text>
                <Text style={styles.quickActionSubtext}>Tap here to see your full schedule</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>
        )}

        {/* Notifications list */}
        <FlatList
          data={notifications}
          keyExtractor={item => item._id}
          renderItem={renderNotification}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </Text>
              {!isSocketConnected && (
                <TouchableOpacity style={styles.reconnectButton} onPress={() => socketService.reconnect()}>
                  <Text style={styles.reconnectButtonText}>🔄 Reconnect Socket</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />

        {/* Appointment Modal */}
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
          getEffectiveStatus={appt => (appt?.status ? String(appt.status).toLowerCase() : 'unknown')}
          role={currentRole}
        />

        {loadingAppointments && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Loading appointments...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  viewAllButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center' },
  connectionIndicator: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  connected: { backgroundColor: '#e8f5e9' },
  disconnected: { backgroundColor: '#ffebee' },
  connectionText: { fontSize: 12, fontWeight: '600' },
  filterContainer: { flexDirection: 'row', padding: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterTab: { flex: 1, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center' },
  activeFilter: { backgroundColor: '#2196F3' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#666' },
  activeFilterText: { color: '#fff' },
  quickActionBanner: { margin: 12, borderRadius: 12, backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BFDBFE' },
  quickActionContent: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  quickActionText: { flex: 1 },
  quickActionTitle: { fontSize: 16, fontWeight: '600', color: '#1E40AF', marginBottom: 2 },
  quickActionSubtext: { fontSize: 13, color: '#64748B' },
  notificationItem: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  unreadNotification: { backgroundColor: '#f0f8ff' },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  notificationTitle: { fontWeight: 'bold', fontSize: 16, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2196F3' },
  notificationMessage: { color: '#666', marginTop: 4, fontSize: 14 },
  notificationTime: { color: '#999', fontSize: 12, marginTop: 8 },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 16, marginTop: 16, marginBottom: 16 },
  reconnectButton: { marginTop: 16, padding: 12, backgroundColor: '#2196F3', borderRadius: 8 },
  reconnectButtonText: { color: '#fff', fontWeight: 'bold' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#fff', fontSize: 16, fontWeight: '600' },
});
