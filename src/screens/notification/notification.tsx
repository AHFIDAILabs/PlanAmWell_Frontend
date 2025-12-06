import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Bell, Calendar, Package, FileText, Pill, Route } from 'lucide-react-native';
import { useNotifications } from '../../context/notificatonContext';
import { INotification } from '../../types/backendType';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomBar from '../../components/common/BottomBar';

const NotificationsScreen: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead, filter, setFilter } =
    useNotifications();

  const formatTime = (date: string) => {
    const notificationDate = new Date(date);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / 1000 / 60);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return 'Yesterday, ' + notificationDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const groupByDate = (notifications: INotification[]) => {
    const today: INotification[] = [];
    const yesterday: INotification[] = [];

    notifications.forEach(n => {
      const diffHours = Math.floor((new Date().getTime() - new Date(n.createdAt).getTime()) / 1000 / 60 / 60);
      if (diffHours < 24) today.push(n);
      else yesterday.push(n);
    });

    return { today, yesterday };
  };

  const { today, yesterday } = groupByDate(notifications);

  return (
<SafeAreaView style={{ flex: 1, paddingTop: 50 }}>
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAll}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          onPress={() => setFilter('all')}
          style={[styles.filterButton, filter === 'all' && styles.filterActive]}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter('unread')}
          style={[styles.filterButton, filter === 'unread' && styles.filterActive]}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>Unread</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <View style={styles.listContainer}>
        {today.length > 0 && (
          <View style={styles.group}>
            <Text style={styles.groupTitle}>Today</Text>
            {today.map(notification => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={markAsRead}
                formatTime={formatTime}
              />
            ))}
          </View>
        )}

        {yesterday.length > 0 && (
          <View style={styles.group}>
            <Text style={styles.groupTitle}>Yesterday</Text>
            {yesterday.map(notification => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={markAsRead}
                formatTime={formatTime}
              />
            ))}
          </View>
        )}

        {notifications.length === 0 && (
          <View style={styles.emptyContainer}>
            <Bell color="#ccc" size={64} />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        )}
      </View>
    </ScrollView>
    <BottomBar activeRoute={Route.name} cartItemCount={0} />
</SafeAreaView>
  );
};

// ---------------- Notification Item ----------------
interface NotificationItemProps {
  notification: INotification;
  onMarkAsRead: (id: string) => void;
  formatTime: (date: string) => string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead, formatTime }) => {
  const iconMap = {
    supplement: Pill,
    order: Package,
    appointment: Calendar,
    article: FileText,
  };

  const iconColors: Record<INotification['type'], string> = {
    supplement: '#FDE2FF',
    order: '#E0F2FE',
    appointment: '#DCFCE7',
    article: '#FEF3C7',
    system: '#E5E7EB',
  };

  const Icon = iconMap[notification.type as keyof typeof iconMap] || Bell;

  return (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => !notification.isRead && onMarkAsRead(notification._id)}
    >
      <View style={[styles.iconWrapper, { backgroundColor: iconColors[notification.type] }]}>
        <Icon color="#D81E5B" size={20} />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{notification.title}</Text>
        <Text style={styles.itemMessage}>{notification.message}</Text>
        <Text style={styles.itemTime}>{formatTime(notification.createdAt)}</Text>
      </View>
      {!notification.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  markAll: { color: '#D81E5B', fontWeight: '500' },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, marginVertical: 8 },
  filterButton: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, alignItems: 'center' },
  filterActive: { backgroundColor: '#D81E5B' },
  filterText: { color: '#4B5563', fontSize: 14, fontWeight: '500' },
  filterTextActive: { color: '#FFF' },
  listContainer: { paddingHorizontal: 16 },
  group: { marginBottom: 16 },
  groupTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  emptyText: { color: '#9CA3AF', marginTop: 8 },
  itemContainer: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 8 },
  iconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemContent: { flex: 1 },
  itemTitle: { fontWeight: '600', fontSize: 14, color: '#111', marginBottom: 2 },
  itemMessage: { fontSize: 13, color: '#4B5563', marginBottom: 2 },
  itemTime: { fontSize: 11, color: '#9CA3AF' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D81E5B', marginLeft: 8, marginTop: 6 },
});

export default NotificationsScreen;
