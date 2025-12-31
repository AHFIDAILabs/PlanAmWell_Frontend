import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
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
  isSocketConnected: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<boolean>;
  fetchNotifications: (filter?: FilterType) => Promise<void>;
  refreshUnreadCount: () => Promise<number>;
  refresh: () => Promise<void>;
  filter: FilterType;
  setFilter: React.Dispatch<React.SetStateAction<FilterType>>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
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
  
  // ✅ Use ref to track if socket is initialized
  const socketInitialized = useRef(false);

  const filteredNotifications =
    filter === "all"
      ? notifications
      : notifications.filter((n) => !n.isRead);

  // ✅ FIXED: Stable callback references using useCallback without dependencies
  const handleNewNotification = useCallback(
    (notification: INotification) => {
      console.log("📬 [Context] New notification received:", notification);
      
      setNotifications((prev) => {
        // Prevent duplicates
        if (prev.some((n) => n._id === notification._id)) {
          console.log("⚠️ [Context] Duplicate notification ignored");
          return prev;
        }
        console.log("✅ [Context] Adding notification to state");
        return [notification, ...prev];
      });
      
      if (!notification.isRead) {
        setUnreadCount((prev) => prev + 1);
      }
    },
    [setNotifications, setUnreadCount]
  );

  // Handle call ended
  const handleCallEnded = useCallback(
    (data: { appointmentId: string; callDuration?: number }) => {
      console.log("📞 [Context] Call ended:", data);
      
      setNotifications((prev) =>
        prev.map((n) => {
          if (
            n.metadata?.appointmentId === data.appointmentId &&
            (n.message.includes("joining the call") || n.message.includes("in the call"))
          ) {
            return {
              ...n,
              title: "Call Ended",
              message: `The consultation has ended${
                data.callDuration ? ` (${Math.floor(data.callDuration / 60)} minutes)` : ""
              }. Would you like to book another session?`,
              type: "call_ended" as const,
              isRead: false,
            };
          }
          return n;
        })
      );
    },
    [setNotifications]
  );

  // Handle socket connection status changes
  const handleConnect = useCallback(() => {
    console.log("🟢 [Context] Socket connected");
    setIsSocketConnected(true);
    
    // Refresh notifications on reconnect
    fetchNotifications(filter);
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount, filter]);

  const handleDisconnect = useCallback(() => {
    console.log("🔴 [Context] Socket disconnected");
    setIsSocketConnected(false);
  }, []);

  const handleConnected = useCallback((data: any) => {
    console.log("✅ [Context] Server confirmed connection:", data);
    setIsSocketConnected(true);
  }, []);

  // Refresh notifications
  const refresh = useCallback(async () => {
    await fetchNotifications(filter);
    await fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount, filter]);

  // ✅ CRITICAL FIX: Socket.IO setup - only run ONCE on mount
  useEffect(() => {
    if (socketInitialized.current) {
      console.log("⚠️ Socket already initialized, skipping...");
      return;
    }

    console.log("🔌 [Context] Initializing socket connection...");
    socketInitialized.current = true;

    const initSocket = async () => {
      try {
        await socketService.connect();
        const connected = socketService.isConnected();
        setIsSocketConnected(connected);
        
        console.log(`🔌 [Context] Socket connection status: ${connected}`);

        // ✅ Register all socket event listeners
        socketService.onNotification("notification", handleNewNotification);
        socketService.onNotification("patient-rejoin-call", handleNewNotification);
        socketService.onNotification("call-ended", handleCallEnded);
        socketService.onNotification("connect", handleConnect);
        socketService.onNotification("disconnect", handleDisconnect);
        socketService.onNotification("connected", handleConnected);

        console.log("✅ [Context] All socket listeners registered");
      } catch (error) {
        console.error("❌ [Context] Socket initialization failed:", error);
        setIsSocketConnected(false);
      }
    };

    initSocket();

    // ✅ Polling to check connection status (fallback)
    const interval = setInterval(() => {
      const connected = socketService.isConnected();
      setIsSocketConnected((prev) => {
        if (prev !== connected) {
          console.log(`🔄 [Context] Connection status changed: ${connected}`);
          if (connected) {
            // Refresh notifications on reconnect
            fetchNotifications(filter);
            fetchUnreadCount();
          }
        }
        return connected;
      });
    }, 5000);

    // ✅ Cleanup function - only runs on unmount
    return () => {
      console.log("🧹 [Context] Cleaning up socket listeners");
      clearInterval(interval);
      
      socketService.offNotification("notification", handleNewNotification);
      socketService.offNotification("patient-rejoin-call", handleNewNotification);
      socketService.offNotification("call-ended", handleCallEnded);
      socketService.offNotification("connect", handleConnect);
      socketService.offNotification("disconnect", handleDisconnect);
      socketService.offNotification("connected", handleConnected);
      
      // Don't disconnect socket here - let it persist across navigation
      // socketService.disconnect();
    };
  }, []); // ✅ Empty dependencies - only run once

  // Re-fetch on filter change
  useEffect(() => {
    fetchNotifications(filter);
  }, [filter, fetchNotifications]);

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
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
};