// Enhanced NotificationsScreen.tsx - WITH CALL REJOIN NOTIFICATIONS

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

// ✅ Helper to safely extract ID from object or string
const extractId = (field: any): string => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field._id) {
    return typeof field._id === 'string' ? field._id : String(field._id);
  }
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
  const { user, isDoctor } = useAuth();
  const { getCallStatus } = useVideoCall();

  const isCurrentUserDoctor = isDoctor();
  const currentRole = isCurrentUserDoctor ? 'Doctor' : 'user';

  // Helper function to process raw appointment data
  const processAppointments = (data: any[]): IAppointment[] => {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map(appt => ({
      ...appt,
      scheduledAt: new Date(appt.scheduledAt),
      patientName:
        appt.patientSnapshot?.name ||
        `${(appt.userId as any)?.firstName || ""} ${(appt.userId as any)?.lastName || ""}`.trim() ||
        "Anonymous",
    })) as IAppointment[];
  };

  // ✅ NEW: Listen for patient rejoining calls
  useEffect(() => {
    if (!isCurrentUserDoctor) return;

    console.log('🎧 Setting up patient-rejoin-call listener for doctor');

    const handlePatientRejoin = (data: any) => {
      console.log('🔔 Patient rejoined call:', data);
      
      const { appointmentId, patientName, channelName } = data;

      // Prevent duplicate alerts
      if (activeCallAlerts.has(appointmentId)) {
        console.log('⏭️ Alert already shown for this appointment');
        return;
      }

      setActiveCallAlerts(prev => new Set(prev).add(appointmentId));

      // Show alert to doctor
      Alert.alert(
        '📞 Patient Waiting',
        `${patientName} has joined the video call and is waiting for you.`,
        [
          {
            text: 'Ignore',
            style: 'cancel',
            onPress: () => {
              setActiveCallAlerts(prev => {
                const newSet = new Set(prev);
                newSet.delete(appointmentId);
                return newSet;
              });
            },
          },
          {
            text: 'Join Now',
            onPress: async () => {
              try {
                // Fetch appointment details
                const appointment = await getAppointmentById(appointmentId);
                
                if (appointment) {
                  navigation.navigate('VideoCallScreen', {
                    appointmentId: appointment._id,
                    name: patientName,
                    role: 'Doctor',
                    autoJoin: true,
                    fromNotification: true,
                  });
                }
              } catch (error) {
                console.error('Failed to join call:', error);
                Toast.show({
                  type: 'error',
                  text1: 'Failed to join call',
                  text2: 'Please try again from appointments',
                });
              } finally {
                setActiveCallAlerts(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(appointmentId);
                  return newSet;
                });
              }
            },
          },
        ],
        { cancelable: false }
      );

      // Auto-dismiss alert from set after 30 seconds
      setTimeout(() => {
        setActiveCallAlerts(prev => {
          const newSet = new Set(prev);
          newSet.delete(appointmentId);
          return newSet;
        });
      }, 30000);
    };

    socketService.onNotification('patient-rejoin-call', handlePatientRejoin);

    return () => {
      console.log('🧹 Cleaning up patient-rejoin-call listener');
      socketService.offNotification('patient-rejoin-call', handlePatientRejoin);
    };
  }, [isCurrentUserDoctor, navigation, activeCallAlerts]);

  // Fetch appointments when screen loads (for doctors only)
  useEffect(() => {
    if (currentRole === 'Doctor') {
      fetchAppointments();
    }
  }, [currentRole]);

  const fetchAppointments = async (): Promise<IAppointment[]> => {
    try {
      setLoadingAppointments(true);
      const data = await getDoctorAppointments();
      const appointmentsWithDates = processAppointments(data);
      setAppointments(appointmentsWithDates);
      return appointmentsWithDates;
    } catch (error: any) {
      console.error('Failed to fetch appointments:', error);
      setAppointments([]);
      return [];
    } finally {
      setLoadingAppointments(false);
    }
  };

  const testConnection = () => {
    const info = socketService.getConnectionInfo();
    console.log('📊 Full Connection Info:', info);
    
    if (info.connected) {
      socketService.ping();
      Alert.alert(
        '✅ Socket Connected',
        `Transport: ${info.transport}\nSocket ID: ${info.socketId}`,
        [
          {
            text: 'Send Test Ping',
            onPress: () => {
              socketService.ping();
              console.log('🏓 Test ping sent');
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert(
        '❌ Socket Disconnected',
        'Would you like to try reconnecting?',
        [
          {
            text: 'Reconnect',
            onPress: () => {
              console.log('🔄 Manual reconnection triggered');
              socketService.reconnect();
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  // ✅ FIXED: Extract only the ID before sending to backend
  const handleAccept = async (appt: IAppointment) => {
    try {
      console.log('🟢 Accepting appointment:', appt._id);
      
      const updatePayload = {
        status: "confirmed" as const,
        ...(appt.userId && { userId: extractId(appt.userId) }),
      };

      console.log('📤 Update payload:', JSON.stringify(updatePayload, null, 2));
      
      await updateAppointment(appt._id!, updatePayload);
      
      Toast.show({ 
        type: "success", 
        text1: "Appointment confirmed" 
      });
      
      setShowModal(false);
      setSelectedAppointment(null);
      
      await fetchAppointments();
      refresh();
      
    } catch (error: any) {
      console.error('❌ Failed to accept appointment:', error);
      Toast.show({ 
        type: "error", 
        text1: "Failed to confirm", 
        text2: error.response?.data?.message || error.message 
      });
    }
  };

  const handleReject = async (appt: IAppointment) => {
    try {
      console.log('🔴 Rejecting appointment:', appt._id);
      
      const updatePayload = {
        status: "rejected" as const,
        ...(appt.userId && { userId: extractId(appt.userId) }),
      };

      console.log('📤 Update payload:', JSON.stringify(updatePayload, null, 2));
      
      await updateAppointment(appt._id!, updatePayload);
      
      Toast.show({ 
        type: "success", 
        text1: "Appointment rejected" 
      });
      
      setShowModal(false);
      setSelectedAppointment(null);
      
      await fetchAppointments();
      refresh();
      
    } catch (error: any) {
      console.error('❌ Failed to reject appointment:', error);
      Toast.show({ 
        type: "error", 
        text1: "Failed to reject", 
        text2: error.response?.data?.message || error.message 
      });
    }
  };

  const handleNotificationPress = async (notification: any) => {
    try {
      if (!notification.isRead) await markAsRead(notification._id);

      if (notification.type !== 'appointment') return;

      const appointmentId = notification.metadata?.appointmentId;
      if (!appointmentId) {
        Alert.alert('Error', 'Appointment ID missing');
        return;
      }

      let appointment: IAppointment | null = null;
      try {
        appointment = await getAppointmentById(appointmentId);
        if (appointment) {
          appointment.scheduledAt = new Date(appointment.scheduledAt);
        }
      } catch {
        appointment = null;
      }

      if (!appointment) {
        Alert.alert('Appointment not found', 'Try refreshing and try again.');
        return;
      }

      const now = new Date();
      const diffMinutes = (appointment.scheduledAt.getTime() - now.getTime()) / 60000;

      const callStatus = await getCallStatus(appointment._id!);
      const canJoin =
        (callStatus.success && callStatus.data?.isActive) ||
        (currentRole === 'Doctor' && diffMinutes <= 15 && appointment.status === 'confirmed');

      if (canJoin) {
        const doctorDetails = appointment.doctorId;
        const doctorName =
          typeof doctorDetails === 'object' && doctorDetails !== null && 'firstName' in doctorDetails
            ? `${doctorDetails.firstName} ${doctorDetails.lastName}`
            : 'Doctor';

        navigation.navigate('VideoCallScreen', {
          appointmentId: appointment._id,
          name: doctorName,
          role: currentRole === 'Doctor' ? 'Doctor' : 'User',
          autoJoin: true,
          fromNotification: true,
        });
        return;
      }

      if (currentRole === 'Doctor') {
        setSelectedAppointment(appointment);
        setShowModal(true);
        return;
      }

      navigation.navigate('MyAppointments', { appointmentId });
    } catch (error: any) {
      console.error('Error handling notification:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    }
  };

  const navigateToAppointments = () => {
    if (currentRole === 'Doctor') {
      navigation.navigate('DoctorAppointment');
    } else {
      navigation.navigate('MyAppointments');
    }
  };

  const renderNotification = ({ item }: any) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification,
      ]}
      onPress={() => handleNotificationPress(item)}
      disabled={loadingAppointments}
    >
      <View style={styles.notificationHeader}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.notificationMessage}>{item.message}</Text>
      <Text style={styles.notificationTime}>
        {new Date(item.createdAt).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Notifications ({unreadCount})
          </Text>
          
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={navigateToAppointments}
            >
              <Ionicons name="calendar" size={20} color="#2196F3" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.connectionIndicator,
                isSocketConnected ? styles.connected : styles.disconnected,
              ]}
              onPress={testConnection}
            >
              <Text style={styles.connectionText}>
                {isSocketConnected ? '🟢' : '🔴'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.activeFilter]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'unread' && styles.activeFilter]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>
              Unread
            </Text>
          </TouchableOpacity>
        </View>

        {currentRole === 'Doctor' && (
          <TouchableOpacity 
            style={styles.quickActionBanner}
            onPress={navigateToAppointments}
          >
            <View style={styles.quickActionContent}>
              <Ionicons name="calendar" size={24} color="#2196F3" />
              <View style={styles.quickActionText}>
                <Text style={styles.quickActionTitle}>View All Appointments</Text>
                <Text style={styles.quickActionSubtext}>
                  Tap here to see your full schedule
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>
        )}

        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotification}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {filter === 'unread' 
                  ? 'No unread notifications' 
                  : 'No notifications yet'}
              </Text>
              
              {!isSocketConnected && (
                <TouchableOpacity
                  style={styles.reconnectButton}
                  onPress={() => socketService.reconnect()}
                >
                  <Text style={styles.reconnectButtonText}>
                    🔄 Reconnect Socket
                  </Text>
                </TouchableOpacity>
              )}
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
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#fff', fontSize: 16, fontWeight: '600' },
});