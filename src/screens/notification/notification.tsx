// src/screens/NotificationsScreen.tsx
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
import { getDoctorAppointments, updateAppointment } from '../../services/Appointment';
import Toast from 'react-native-toast-message';

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
  const { user } = useAuth();

  // ✅ Fetch appointments when screen loads (for doctors only)
useEffect(() => {
  if (user?.roles === 'doctor') {
    fetchAppointments();
  }
}, [user?.roles]);


  const fetchAppointments = async () => {
    try {
      setLoadingAppointments(true);
      const data = await getDoctorAppointments();
      
      if (!Array.isArray(data)) {
        setAppointments([]);
        return;
      }

      const appointmentsWithDates = data.map(appt => ({
        ...appt,
        scheduledAt: new Date(appt.scheduledAt),
        patientName:
          appt.patientSnapshot?.name ||
          `${(appt.userId as any)?.firstName || ""} ${(appt.userId as any)?.lastName || ""}`.trim() ||
          "Anonymous",
      }));

      setAppointments(appointmentsWithDates);
    } catch (error: any) {
      console.error('Failed to fetch appointments:', error);
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  /**
   * 🧪 Test Socket.IO connection
   */
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
          {
            text: 'OK',
            style: 'cancel',
          },
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
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    }
  };

  const handleAccept = async (appt: IAppointment) => {
    try {
      await updateAppointment(appt._id!, { status: "confirmed" });
      Toast.show({ type: "success", text1: "Appointment confirmed" });
      setShowModal(false);
      setSelectedAppointment(null);
      fetchAppointments(); // Refresh appointments list
      refresh(); // Refresh notifications
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
      setShowModal(false);
      setSelectedAppointment(null);
      fetchAppointments(); // Refresh appointments list
      refresh(); // Refresh notifications
    } catch (error: any) {
      Toast.show({ 
        type: "error", 
        text1: "Failed to reject", 
        text2: error.response?.data?.message || error.message 
      });
    }
  };

 const handleNotificationPress = async (notification: any) => {
  if (!notification.isRead) {
    await markAsRead(notification._id);
  }

  if (notification.type !== 'appointment') return;

  const appointmentId = notification.metadata?.appointmentId;
  if (!appointmentId) {
    Alert.alert('Error', 'Appointment ID missing');
    return;
  }

 // 🚫 Doctors NEVER navigate from notifications
if (user?.roles === 'doctor') {
  let appointment = appointments.find(a => a._id === appointmentId);

  if (!appointment) {
    await fetchAppointments();
    appointment = appointments.find(a => a._id === appointmentId);
  }

  if (!appointment) {
    Alert.alert('Appointment not found', 'Pull to refresh and try again.');
    return;
  }

  setSelectedAppointment(appointment);
  setShowModal(true);
  return;
}

// 👤 Users only
navigation.navigate('MyAppointments', { appointmentId });
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
          
          {/* ✅ Connection Status Indicator */}
          <TouchableOpacity
            style={[
              styles.connectionIndicator,
              isSocketConnected ? styles.connected : styles.disconnected,
            ]}
            onPress={testConnection}
          >
            <Text style={styles.connectionText}>
              {isSocketConnected ? '🟢 Live' : '🔴 Offline'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ✅ Filter Tabs */}
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

        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotification}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {filter === 'unread' 
                  ? 'No unread notifications' 
                  : 'No notifications yet'}
              </Text>
              
              {/* Debug Info */}
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

        {/* ✅ Appointment Modal */}
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

        {/* ✅ Loading Indicator */}
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  connectionIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  connected: {
    backgroundColor: '#e8f5e9',
  },
  disconnected: {
    backgroundColor: '#ffebee',
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: '#2196F3',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
  },
  notificationItem: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  unreadNotification: {
    backgroundColor: '#f0f8ff',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
  },
  notificationMessage: {
    color: '#666',
    marginTop: 4,
    fontSize: 14,
  },
  notificationTime: {
    color: '#999',
    fontSize: 12,
    marginTop: 8,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginBottom: 16,
  },
  reconnectButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  reconnectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});