import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useNotification } from '../../hooks/useNotifcation';
import { INotification } from '../../types/backendType';
import { notificationService } from '../../services/notification';

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');

  const {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    setNotifications,
  } = useNotification();

  useFocusEffect(
    useCallback(() => {
      fetchNotifications(filter);
    }, [filter])
  );

  const onRefresh = () => fetchNotifications(filter);

  const handleNotificationPress = async (notification: INotification) => {
    if (!notification.isRead) await markAsRead(notification._id);

    if (notification.type === 'appointment' && notification.metadata?.appointmentId) {
      navigation.navigate('ConsultationHistory');
    } else if (notification.type === 'order' && notification.metadata?.orderId) {
      navigation.navigate('OrderDetails', { orderId: notification.metadata.orderId });
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    Toast.show({ type: 'success', text1: 'All notifications marked as read' });
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      Toast.show({ type: 'success', text1: 'Notification deleted' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to delete notification' });
    }
  };

  const renderNotification = ({ item }: { item: INotification }) => {
    const iconMap: Record<string, string> = {
      appointment: 'calendar',
      order: 'shopping-bag',
      article: 'file-text',
      supplement: 'package',
      system: 'bell',
    };
    const colorMap: Record<string, string> = {
      appointment: '#D81E5B',
      order: '#4CAF50',
      article: '#2196F3',
      supplement: '#FF9800',
      system: '#9C27B0',
    };

    const icon = iconMap[item.type] || 'bell';
    const color = colorMap[item.type] || '#757575';

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Feather name={icon as any} size={20} color={color} />
        </View>

        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.notificationTime}>
            {new Date(item.createdAt).toLocaleTimeString()}
          </Text>
        </View>

        {!item.isRead && <View style={styles.unreadDot} />}

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteNotification(item._id)}
        >
          <Feather name="x" size={18} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {['all', 'unread'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.activeFilterTab]}
            onPress={() => setFilter(f as 'all' | 'unread')}
          >
            <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#D81E5B" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotification}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} colors={['#D81E5B']} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50 }}>No notifications</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  markAllText: { fontSize: 14, color: '#D81E5B', fontWeight: '600' },
  filterContainer: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#FFF' },
  filterTab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#F5F5F5' },
  activeFilterTab: { backgroundColor: '#D81E5B' },
  filterText: { fontSize: 14, color: '#666', fontWeight: '500' },
  activeFilterText: { color: '#FFF', fontWeight: '700' },
  notificationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  unreadCard: { borderLeftWidth: 4, borderLeftColor: '#D81E5B' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 4 },
  notificationMessage: { fontSize: 13, color: '#666', marginBottom: 4 },
  notificationTime: { fontSize: 11, color: '#999' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D81E5B', marginRight: 8 },
  deleteButton: { padding: 8 },
});
