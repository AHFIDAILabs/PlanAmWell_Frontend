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

  const initialFetchDone = useRef(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationService.getUnreadCount();
      if (res.success && res.data) {
        setUnreadCount(res.data.count);
        return res.data.count;
      }
      return 0;
    } catch {
      return 0;
    }
  }, []);

  const fetchNotifications = useCallback(async (filter: FilterType = "all") => {
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
  }, []);

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

  // Initial load only — socket events are managed by NotificationProvider
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
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};
