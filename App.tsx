import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import ErrorBoundary from "./src/components/ErrorBoundary";
import * as Notifications from "expo-notifications";
import * as Updates from "expo-updates";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigations/AppNavigator";
import { linking } from "./src/navigations/linking";
import { CartProvider } from "./src/context/CartContext";
import { NotificationProvider } from "./src/context/notificatonContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AuthProvider } from "./src/context/AuthContext";
import { useAuth } from "./src/hooks/useAuth";
import Toast from "react-native-toast-message";
import socketService from "./src/services/socketService";
import pushNotificationService from "./src/services/pushNotificationService";
import notifee from "@notifee/react-native";
import {
  setupCallNotificationChannel,
  registerForegroundCallHandler,
  registerNotifeeEventHandlers,
  getInitialCallNotificationData,
  getFcmToken,
  registerFcmTokenRefreshListener,
} from "./src/services/callNotificationService";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { TOKEN_KEY, setupAxiosInterceptors, registerFcmToken } from "./src/services/Auth";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

// Registered on the shared `axios` default instance at module load — every
// service in the app imports plain `axios`, so this one call covers all of
// them. Must run before any component gets a chance to make a request, which
// module-load time guarantees (a useEffect would not — it fires after first
// render, by which point other mount effects may already be mid-request).
// This was previously defined but never actually called anywhere, so no
// request in the app auto-refreshed an expired token or retried on 401.
setupAxiosInterceptors();

/* ================= Notification Handler ================= */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;

    if (data?.type === "incoming_call") {
      return {
        shouldShowAlert: false,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

/* ================= OTA Update Check ================= */
async function checkForOTAUpdate() {
  // Never run in Expo Go / dev mode — Updates API is not available there
  if (__DEV__) return;

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      // Reloads the app immediately with the new bundle
      await Updates.reloadAsync();
    }
  } catch (e) {
    // Non-fatal — app continues with the cached bundle
    console.warn("[OTA] Update check failed:", e);
  }
}

/* ================= App Content ================= */
function AppContent() {
  const { darkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigationRef = useRef<any>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  /* ============ OTA UPDATE — runs once on mount, before anything else ============ */
  useEffect(() => {
    checkForOTAUpdate();
  }, []);

  /* ============ SOCKET INIT + GLOBAL CALL-RINGING LISTENER ============ */
  useEffect(() => {
    let socket: any = null;

    const handleCallRinging = (data: any) => {
      console.log("📞 Global call-ringing received:", data);
      if (!navigationRef.current || !data?.appointmentId) return;

      // Don't navigate if already on IncomingCall or VideoCallScreen
      const currentRoute = navigationRef.current.getCurrentRoute?.();
      if (
        currentRoute?.name === "IncomingCall" ||
        currentRoute?.name === "VideoCallScreen"
      ) return;

      navigationRef.current.navigate("IncomingCall", {
        appointmentId:  data.appointmentId,
        callerName:     data.callerName    || "Incoming Call",
        callerImage:    data.callerImage,
        callerType:     data.callerType,
        channelName:    data.channelName,
        conversationId: data.conversationId,
        videoRequestId: data.videoRequestId,
        callType:       data.callType,
      });
    };

    const initSocket = async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token && isAuthenticated) {
        await socketService.connect();
        console.log("✅ Socket connected");
        // Register global call-ringing listener AFTER socket is connected
        socket = socketService.getSocket();
        if (socket) {
          socket.on("call-ringing", handleCallRinging);
        }
      }
    };

    initSocket();

    return () => {
      if (socket) socket.off("call-ringing", handleCallRinging);
      socketService.disconnect();
      console.log("🔌 Socket disconnected");
    };
  }, [isAuthenticated]);

  /* ============ PUSH & DEEP LINK INIT ============ */
  useEffect(() => {
    if (!isAuthenticated) return;

    const initPushAndLinking = async () => {
      pushNotificationService.configure();
      // NOTE: setNavigationRef is called in NavigationContainer.onReady to avoid
      // a timing race where navigationRef.current is still null here.

      // Register device push token. Not wrapped in try/catch previously —
      // this call posted to a route that doesn't exist on the backend
      // (`/api/v1/users/push-token`; the real one is `/api/v1/auth/register-push-token`),
      // so it threw on every launch and silently aborted everything below it
      // in this function, including the Android notifee permission/channel
      // setup a few lines down — a direct cause of calls never ringing.
      try {
        const token = await pushNotificationService.registerForPushNotifications();
        if (token) await sendPushTokenToBackend(token);
      } catch (err) {
        console.error("[App] Failed to register Expo push token:", err);
      }

      // Raw FCM device token — separate delivery path, only used to wake
      // incoming-call ringing when the app is backgrounded/killed.
      try {
        const fcmToken = await getFcmToken();
        const authToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (fcmToken && authToken) await registerFcmToken(fcmToken, authToken);
      } catch (err) {
        console.error("[App] Failed to register FCM token:", err);
      }

      // Full-screen incoming-call notifications (Android only — this is the
      // notifee + RNFirebase Messaging layer that rings even when the app is
      // fully killed, which expo-notifications' own background handler can't
      // reliably do).
      if (Platform.OS === "android") {
        await setupCallNotificationChannel();
        await notifee.requestPermission();
      }

      // Handle cold-start / app launched via push notification
      const initialNotification =
        await pushNotificationService.getInitialNotification();

      if (initialNotification) {
        const data = initialNotification.notification.request.content.data;
        if (data) handleNavigationFromData(data);
      }

      // Handle cold-start / app launched by tapping the full-screen call
      // notification (or its Accept action) while fully killed.
      const initialCallData = await getInitialCallNotificationData();
      if (initialCallData) handleNavigationFromData(initialCallData);
    };

    initPushAndLinking();
  }, [isAuthenticated]);

  /* ============ FOREGROUND CALL NOTIFICATION HANDLERS ============ */
  useEffect(() => {
    if (!isAuthenticated || Platform.OS !== "android") return;

    const unsubscribeForegroundMessages = registerForegroundCallHandler();
    const unsubscribeNotifeeEvents = registerNotifeeEventHandlers(handleNavigationFromData);
    const unsubscribeFcmRefresh = registerFcmTokenRefreshListener((refreshedToken) => {
      SecureStore.getItemAsync(TOKEN_KEY).then((authToken) => {
        if (authToken) registerFcmToken(refreshedToken, authToken).catch(() => {});
      });
    });

    return () => {
      unsubscribeForegroundMessages();
      unsubscribeNotifeeEvents();
      unsubscribeFcmRefresh();
    };
  }, [isAuthenticated]);

  /* ============ SAVE PUSH TOKEN ============ */
  const sendPushTokenToBackend = async (pushToken: string) => {
    const authToken = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!authToken) return;

    await axios.post(
      `${SERVER_URL}/api/v1/auth/register-push-token`,
      { token: pushToken },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
  };

  /* ============ LISTENERS ================= */
  useEffect(() => {
    notificationListener.current =
      pushNotificationService.handleNotificationReceived((notification) => {
        const data = notification.request.content.data;
        if (!data) return;

        if (data.type === "incoming_call") {
          // Foreground incoming call — navigate directly (socket may have handled it already,
          // but navigating twice to IncomingCall is idempotent due to the screen guard above)
          handleNavigationFromData(data);
          return;
        }

        Toast.show({
          type: "info",
          text1: notification.request.content.title || "Notification",
          text2: notification.request.content.body || "",
          onPress: () => handleNavigationFromData(data),
        });
      });

    responseListener.current =
      pushNotificationService.handleNotificationResponse((response) => {
        const data = response.notification.request.content.data;
        if (!data) return;

        // incoming_call taps must also navigate — user tapped the notification banner
        handleNavigationFromData(data);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  /* ==================== NAVIGATION HANDLER ==================== */
  const handleNavigationFromData = (data: any) => {
    if (!navigationRef.current || !data) return;

    try {
      // 1️⃣ Deep link overrides everything
      if (data.deepLink) {
        navigationRef.current.navigate(data.deepLink);
        return;
      }

      // 2️⃣ Specific types
      switch (data.type) {
        case "appointment":
          navigationRef.current.navigate("ConsultationHistory", {
            appointmentId: data.appointmentId,
          });
          break;

        case "order":
          navigationRef.current.navigate("PaymentMethodScreen", {
            orderId: data.orderId,
            amount: data.amount,
          });
          break;

        case "doctor":
          navigationRef.current.navigate("DoctorProfileScreen", {
            doctorId: data.doctorId,
          });
          break;

        case "article":
          navigationRef.current.navigate("ArticleDetailScreen", {
            slug: data.slug,
          });
          break;

        case "video":
          navigationRef.current.navigate("VideoCallScreen", {
            appointmentId: data.appointmentId,
            name: data.name,
            patientId: data.patientId,
            role: data.role,
          });
          break;

        case "incoming_call": {
          const cur = navigationRef.current.getCurrentRoute?.();
          if (cur?.name === "IncomingCall" || cur?.name === "VideoCallScreen") break;
          navigationRef.current.navigate("IncomingCall", {
            appointmentId:  data.appointmentId,
            callerName:     data.callerName,
            callerImage:    data.callerImage,
            callerType:     data.callerType,
            channelName:    data.channelName,
            conversationId: data.conversationId,
            videoRequestId: data.videoRequestId,
            callType:       data.callType,
          });
          break;
        }

        default:
          navigationRef.current.navigate("HomeScreen");
      }
    } catch (error) {
      console.error("❌ Navigation failed:", error);
    }
  };

  return (
    <>
      <StatusBar style={darkMode ? "light" : "dark"} />
      <AuthProvider>
        <NotificationProvider>
          <CartProvider>
            <NavigationContainer
              ref={navigationRef}
              linking={linking}
              fallback={null}
              onReady={() => {
                if (navigationRef.current) {
                  pushNotificationService.setNavigationRef(navigationRef.current);
                }
              }}
            >
              <AppNavigator />
            </NavigationContainer>
          </CartProvider>
        </NotificationProvider>
      </AuthProvider>

      <Toast />
    </>
  );
}

/* ================= ROOT ================= */
export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}