import { useState, useEffect, useCallback, useRef } from "react";
import { notificationService } from "../services/notification";
import socketService from "../services/socketService";
import { INotification } from "../types/backendType";

type FilterType = "all" | "unread";

export const useNotificationsAPI = () => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  // Track if initial fetch is done
  const initialFetchDone = useRef(false);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationService.getUnreadCount();
      if (res.success && res.data) {
        setUnreadCount(res.data.count);
        return res.data.count;
      }
      return 0;
    } catch {
      return notifications.filter((n) => !n.isRead).length;
    }
  }, [notifications]);

  // Fetch notifications
  const fetchNotifications = useCallback(
    async (filter: FilterType = "all") => {
      setLoading(true);
      setError(null);
      try {
        const res = await notificationService.getNotifications(filter);
        if (res.success && res.data) {
          setNotifications(res.data);
          initialFetchDone.current = true;
        } else {
          throw new Error("Invalid notifications response");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch notifications");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      socketService.markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      setError(err.message);
      fetchNotifications();
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message);
      fetchNotifications();
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string): Promise<boolean> => {
    try {
      const target = notifications.find((n) => n._id === notificationId);
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      if (target && !target.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      return true;
    } catch (err: any) {
      setError(err.message || "Delete failed");
      return false;
    }
  };

  // Socket listeners setup
  useEffect(() => {
    // ✅ FIXED: Listen for "notification" event (matches backend emission)
    const handleNewNotification = (notification: INotification) => {
      console.log("📬 New notification received:", notification);
      
      // Add notification to top of list
      setNotifications((prev) => {
        // Prevent duplicates
        const exists = prev.some((n) => n._id === notification._id);
        if (exists) return prev;
        
        return [notification, ...prev];
      });

      // Increment unread count if not already read
      if (!notification.isRead) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const handleNotificationRead = (data: { notificationId: string }) => {
      console.log("✓ Notification marked as read:", data.notificationId);
      
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === data.notificationId ? { ...n, isRead: true } : n
        )
      );
      
      setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleNotificationDeleted = (data: { notificationId: string }) => {
      console.log("🗑️ Notification deleted:", data.notificationId);
      
      setNotifications((prev) => {
        const target = prev.find((n) => n._id === data.notificationId);
        if (target && !target.isRead) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return prev.filter((n) => n._id !== data.notificationId);
      });
    };

    const handleConnect = () => {
      console.log("🟢 Socket connected - fetching latest notifications");
      setIsSocketConnected(true);
      
      // Refresh notifications on reconnect
      if (initialFetchDone.current) {
        fetchNotifications();
        fetchUnreadCount();
      }
    };

    const handleDisconnect = () => {
      console.log("🔴 Socket disconnected");
      setIsSocketConnected(false);
    };

    const handleConnected = (data: any) => {
      console.log("✅ Server confirmed connection:", data);
      setIsSocketConnected(true);
    };

    // ✅ Register all socket listeners with correct event names
    socketService.onNotification("notification", handleNewNotification); // Changed from "new-notification"
    socketService.onNotification("notification-read", handleNotificationRead);
    socketService.onNotification("notification-deleted", handleNotificationDeleted);
    socketService.onNotification("connect", handleConnect);
    socketService.onNotification("connected", handleConnected); // Backend's confirmation
    socketService.onNotification("disconnect", handleDisconnect);

    // Check initial connection status
    const connectionInfo = socketService.getConnectionInfo();
    setIsSocketConnected(connectionInfo.connected);

    // Cleanup listeners on unmount
    return () => {
      socketService.offNotification("notification", handleNewNotification);
      socketService.offNotification("notification-read", handleNotificationRead);
      socketService.offNotification("notification-deleted", handleNotificationDeleted);
      socketService.offNotification("connect", handleConnect);
      socketService.offNotification("connected", handleConnected);
      socketService.offNotification("disconnect", handleDisconnect);
    };
  }, [fetchNotifications, fetchUnreadCount]);

  // Initial load
  useEffect(() => {
    fetchNotifications("all");
    fetchUnreadCount();
  }, []);

  return {
    notifications,
    setNotifications,
    unreadCount,
    setUnreadCount,
    loading,
    error,
    isSocketConnected,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};