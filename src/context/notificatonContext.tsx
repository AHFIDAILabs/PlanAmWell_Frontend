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
import pushNotificationService from "../services/pushNotificationService";

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

  // Real-time incoming-call ringing — was previously only wired in App.tsx,
  // gated behind that component's OWN separate useAuth() instance's
  // isAuthenticated flag. useAuth() has no shared state across call sites
  // (plain useState, no context/store), so a login performed through
  // LoginScreen's own useAuth() instance never propagated to App.tsx's copy
  // unless the whole app was restarted — meaning a patient/doctor who logged
  // in during the current app session (not a fresh cold start) never got
  // this listener registered at all, and never saw an incoming call ring in
  // over the socket. Registered here instead, alongside the other listeners
  // this provider already keeps alive via the token-driven reconnect loop
  // below, independent of any auth-hook instance.
  const handleCallRinging = useCallback((data: any) => {
    console.log("📞 [Context] incoming-call received:", data);
    pushNotificationService.navigateToIncomingCall(data);
  }, []);

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

  // Registers listeners once at mount — appListeners persist across
  // reconnects regardless of whether the connect attempt below succeeds. The
  // actual connection is driven purely by token presence (via
  // socketService.connect() re-reading SecureStore each call), not by any
  // isAuthenticated flag: this provider mounts once at app boot, often
  // before login has even started, and every screen's login/register call
  // goes through its own separate useAuth() instance with no shared state to
  // react to — so instead of trying to detect "the user just logged in", the
  // poller below just keeps retrying connect() until it succeeds, which
  // naturally picks up a freshly-issued token the moment one exists.
  useEffect(() => {
    console.log("🔌 [Context] Initializing socket connection...");

    socketService.onNotification("notification", handleNewNotification);
    socketService.onNotification("patient-rejoin-call", handleNewNotification);
    socketService.onNotification("call-ended", handleCallEnded);
    socketService.onNotification("incoming-call", handleCallRinging);
    socketService.onNotification("connect", handleConnect);
    socketService.onNotification("disconnect", handleDisconnect);
    socketService.onNotification("connected", handleConnected);

    const attemptConnect = async () => {
      try {
        const connected = await socketService.connect();
        setIsSocketConnected(connected);
        console.log(`🔌 [Context] Socket connection status: ${connected}`);

        if (connected) {
          // Resync immediately once the socket is actually up — don't rely
          // solely on the "connect" listener above, since it's attached from
          // inside connect()'s own success handler and so only fires on a
          // LATER reconnect, never on the connection that just happened. A
          // notification created in the gap between login and this resolving
          // (e.g. right after registering, while a cold Render instance is
          // still waking up) would otherwise sit unseen until a manual pull.
          fetchNotifications(filter);
          fetchUnreadCount();
        }
      } catch (error) {
        console.error("❌ [Context] Socket initialization failed:", error);
        setIsSocketConnected(false);
      }
    };

    attemptConnect();

    // ✅ Keeps retrying connect() (not just checking status) until it
    // succeeds — this is what actually picks up a token that didn't exist
    // yet on the first attempt (fresh login/registration), and also serves
    // as the fallback resync for a drop/reconnect the listeners above miss.
    const interval = setInterval(() => {
      if (socketService.isConnected()) {
        setIsSocketConnected(true);
        return;
      }
      attemptConnect();
    }, 5000);

    return () => {
      console.log("🧹 [Context] Cleaning up socket listeners");
      clearInterval(interval);

      socketService.offNotification("notification", handleNewNotification);
      socketService.offNotification("patient-rejoin-call", handleNewNotification);
      socketService.offNotification("call-ended", handleCallEnded);
      socketService.offNotification("incoming-call", handleCallRinging);
      socketService.offNotification("connect", handleConnect);
      socketService.offNotification("disconnect", handleDisconnect);
      socketService.offNotification("connected", handleConnected);

      // Don't disconnect socket here - let it persist across navigation.
      // App.tsx owns the actual connect()/disconnect() lifecycle tied to
      // login state; this effect only manages listeners + resync.
    };
  }, []);

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