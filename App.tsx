import React, { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
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
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { TOKEN_KEY } from "./src/services/Auth";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

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

/* ================= App Content ================= */
function AppContent() {
  const { darkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigationRef = useRef<any>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  /* ============ SOCKET INIT ============ */
  useEffect(() => {
    const initSocket = async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token && isAuthenticated) {
        await socketService.connect();
        console.log("✅ Socket connected");
      }
    };
    initSocket();
    return () => {
      socketService.disconnect();
      console.log("🔌 Socket disconnected");
    };
  }, [isAuthenticated]);

  /* ============ PUSH & DEEP LINK INIT ============ */
  useEffect(() => {
    if (!isAuthenticated) return;

    const initPushAndLinking = async () => {
      pushNotificationService.configure();

      if (navigationRef.current) {
        pushNotificationService.setNavigationRef(navigationRef.current);
      }

      // Register device push token
      const token = await pushNotificationService.registerForPushNotifications();
      if (token) await sendPushTokenToBackend(token);

      // Handle cold-start / app launched via push notification
      const initialNotification =
        await pushNotificationService.getInitialNotification();

      if (initialNotification) {
        const data = initialNotification.notification.request.content.data;
        if (data) handleNavigationFromData(data);
      }
    };

    initPushAndLinking();
  }, [isAuthenticated]);

  /* ============ SAVE PUSH TOKEN ============ */
  const sendPushTokenToBackend = async (pushToken: string) => {
    const authToken = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!authToken) return;

    await axios.post(
      `${SERVER_URL}/api/v1/users/push-token`,
      { pushToken },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
  };

  /* ============ LISTENERS ================= */
  useEffect(() => {
    notificationListener.current =
      pushNotificationService.handleNotificationReceived((notification) => {
        const data = notification.request.content.data;
        if (!data || data.type === "incoming_call") return;

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
        if (!data || data.type === "incoming_call") return;

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

        case "incoming_call":
          navigationRef.current.navigate("IncomingCall", {
            appointmentId: data.appointmentId,
            callerName: data.callerName,
            callerImage: data.callerImage,
            callerType: data.callerType,
            channelName: data.channelName,
          });
          break;

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
              linking={linking} // ✅ Deep linking enabled
              fallback={null}
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
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
