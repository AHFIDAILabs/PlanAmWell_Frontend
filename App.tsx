// App.tsx - FIXED with pushNotificationService integration
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigations/AppNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { CartProvider } from './src/context/CartContext';
import { NotificationProvider } from './src/context/notificatonContext';
import Toast from 'react-native-toast-message';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { useAuth } from './src/hooks/useAuth';
import socketService from './src/services/socketService';
import pushNotificationService from './src/services/pushNotificationService'; // ✅ ADDED
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from './src/services/Auth';
import axios from 'axios';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

// ✅ CRITICAL: Configure notification handler to NOT show banner for incoming calls
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;

    // ✅ For incoming calls, don't show in-app banner (show full screen instead)
    if (data.type === 'incoming_call') {
      return {
        shouldShowAlert: false,   // ✅ Don't show banner
        shouldPlaySound: true,    // ✅ Let system play ringtone
        shouldSetBadge: true,
        shouldShowBanner: false,  // ✅ Don't show banner
        shouldShowList: false,    // ✅ Don't add to notification center yet
      };
    }

    // For other notifications, show normal banner
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

function AppContent() {
  const { darkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const navigationRef = useRef<any>(null);

  /**
   * 🔌 Initialize Socket.IO when user is authenticated
   */
  useEffect(() => {
    const initializeSocket = async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      
      if (token && isAuthenticated) {
        try {
          await socketService.connect();
          console.log('✅ Socket.IO connected in App.tsx');
        } catch (error) {
          console.error('❌ Socket.IO connection failed:', error);
        }
      } else {
        console.log('⚠️ No token or not authenticated, skipping socket connection');
      }
    };

    initializeSocket();

    return () => {
      if (!isAuthenticated) {
        socketService.disconnect();
        console.log('🔌 Socket.IO disconnected (user logged out)');
      }
    };
  }, [isAuthenticated]);

  /**
   * 📲 Initialize push notifications - UPDATED
   */
  useEffect(() => {
    const initializePushNotifications = async () => {
      if (!isAuthenticated) return;

      try {
        console.log('🔔 Initializing push notifications...');

        // 1. Configure push notification service
        pushNotificationService.configure();

        // 2. Set navigation reference for deep linking
        if (navigationRef.current) {
          pushNotificationService.setNavigationRef(navigationRef.current);
          console.log('✅ Navigation ref set for push notifications');
        }

        // 3. Register for push notifications
        const pushToken = await pushNotificationService.registerForPushNotifications();
        
        if (pushToken) {
          console.log('✅ Push token registered:', pushToken.substring(0, 30) + '...');
          
          // 4. Send token to backend
          await sendPushTokenToBackend(pushToken);
        } else {
          console.warn('⚠️ Push token not obtained');
        }

        // 5. Check if app was opened via notification
        await pushNotificationService.getInitialNotification();

        console.log('✅ Push notifications initialized');
      } catch (error) {
        console.error('❌ Push notification initialization failed:', error);
      }
    };

    initializePushNotifications();
  }, [isAuthenticated]);

  /**
   * 📤 Send push token to backend
   */
  const sendPushTokenToBackend = async (pushToken: string) => {
    try {
      const authToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!authToken) {
        console.warn('⚠️ No auth token, cannot save push token');
        return;
      }

      await axios.post(
        `${SERVER_URL}/api/v1/users/push-token`,
        { pushToken },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Push token saved to backend');
    } catch (error: any) {
      console.error('❌ Failed to save push token to backend:', error.message);
    }
  };

  /**
   * 🔔 Listen for notifications - UPDATED
   */
  useEffect(() => {
    // ✅ Handle notifications received in foreground
    notificationListener.current = pushNotificationService.handleNotificationReceived(
      (notification) => {
        const { title, body, data } = notification.request.content;

        console.log('📬 Foreground notification:', data);

        // ✅ For incoming calls, navigation is handled by pushNotificationService
        if (data.type === 'incoming_call') {
          console.log('📞 Incoming call notification - navigating to IncomingCall screen');
          return; // Don't show toast for incoming calls
        }

        // Show toast for other notifications
        Toast.show({
          type: 'info',
          text1: title || 'New Notification',
          text2: body || '',
          position: 'top',
          visibilityTime: 4000,
          onPress: () => {
            handleNotificationNavigation(data);
          },
        });
      }
    );

    // ✅ Handle notification tapped (background/killed state)
    responseListener.current = pushNotificationService.handleNotificationResponse(
      (response) => {
        const data = response.notification.request.content.data;
        
        console.log('👆 Notification tapped:', data);

        // ✅ For incoming calls, navigation is handled by pushNotificationService
        if (data.type === 'incoming_call') {
          console.log('📞 Incoming call tapped - navigating to IncomingCall screen');
          return;
        }

        // Navigate for other notification types
        handleNotificationNavigation(data);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  /**
   * 🧭 Handle navigation based on notification data
   */
  const handleNotificationNavigation = (data: any) => {
    if (!navigationRef.current || !data) return;

    try {
      if (data.type === 'appointment' && data.appointmentId) {
        navigationRef.current?.navigate('ConsultationHistory', {
          appointmentId: data.appointmentId,
          highlightAppointment: true,
        });
      } else if (data.type === 'order' && data.orderId) {
        navigationRef.current?.navigate('OrderDetails', { 
          orderId: data.orderId 
        });
      } else if (data.type === 'article' && data.articleId) {
        navigationRef.current?.navigate('ArticleDetail', { 
          articleId: data.articleId 
        });
      } else if (data.type === 'supplement' && data.productId) {
        navigationRef.current?.navigate('ProductDetail', { 
          productId: data.productId 
        });
      } else {
        navigationRef.current?.navigate('NotificationsScreen');
      }

      console.log('✅ Navigated based on notification type:', data.type);
    } catch (error) {
      console.error('❌ Navigation failed:', error);
    }
  };

  return (
    <>
      <StatusBar style={darkMode ? "light" : "dark"} />

      <AuthProvider>
        <NotificationProvider>
          <CartProvider>
            <NavigationContainer ref={navigationRef}>
              <AppNavigator />
            </NavigationContainer>
          </CartProvider>
        </NotificationProvider>
      </AuthProvider>

      <Toast />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}