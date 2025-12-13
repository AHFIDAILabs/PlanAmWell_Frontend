// src/context/NotificationContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { useNotificationsAPI } from "../hooks/useNotificationsAPI";
import { INotification } from "../types/backendType";
import socketService from "../services/socketService";

type FilterType = "all" | "unread";

interface NotificationContextProps {
  notifications: INotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  isSocketConnected: boolean; // ✅ Added connection status
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<boolean>;
  fetchNotifications: (filter?: FilterType) => Promise<void>;
  refreshUnreadCount: () => Promise<number>;
  refresh: () => Promise<void>; // ✅ Added refresh method
  filter: FilterType;
  setFilter: React.Dispatch<React.SetStateAction<FilterType>>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const {
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
  } = useNotificationsAPI();

  const [filter, setFilter] = useState<FilterType>("all");
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // ✅ Filtered notifications based on current filter
  const filteredNotifications =
    filter === "all" 
      ? notifications 
      : notifications.filter((n) => !n.isRead);

  /**
   * 🔔 Handle new notification from Socket.IO
   */
  const handleNewNotification = useCallback(
    (notification: INotification) => {
      console.log("[Socket.IO] 🔔 New notification received:", notification);

      setNotifications((prev) => {
        // ✅ Prevent duplicates
        const exists = prev.some((n) => n._id === notification._id);
        if (exists) {
          console.log("[Socket.IO] ⚠️ Duplicate notification ignored");
          return prev;
        }

        // ✅ Prepend new notification
        return [notification, ...prev];
      });

      // ✅ Increment unread count only if notification is unread
      if (!notification.isRead) {
        setUnreadCount((prev) => prev + 1);
      }

      // Optional: Trigger in-app notification banner/toast
      // showNotificationToast(notification);
    },
    [setNotifications, setUnreadCount]
  );

  /**
   * 🔄 Refresh all notification data
   */
  const refresh = useCallback(async () => {
    await fetchNotifications(filter);
    await fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount, filter]);

  /**
   * 🔌 Socket.IO Setup
   */
  useEffect(() => {
    // ✅ Connect socket when component mounts
    const initializeSocket = async () => {
      try {
        await socketService.connect();
        setIsSocketConnected(socketService.isConnected());

        // ✅ Listen for new notifications
        socketService.onNotification(handleNewNotification);

        console.log("[NotificationContext] ✅ Socket.IO initialized");
      } catch (error) {
        console.error("[NotificationContext] ❌ Socket initialization failed:", error);
        setIsSocketConnected(false);
      }
    };

    initializeSocket();

    // ✅ Check connection status periodically
    const connectionCheckInterval = setInterval(() => {
      setIsSocketConnected(socketService.isConnected());
    }, 5000); // Check every 5 seconds

    // ✅ Cleanup on unmount
    return () => {
      clearInterval(connectionCheckInterval);
      socketService.offNotification(handleNewNotification);
      // Don't disconnect socket here - it might be used elsewhere
      // Socket will be disconnected on logout in Auth service
    };
  }, [handleNewNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications: filteredNotifications,
        unreadCount,
        loading,
        error,
        isSocketConnected,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        fetchNotifications,
        refreshUnreadCount: fetchUnreadCount,
        refresh,
        filter,
        setFilter,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextProps => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};