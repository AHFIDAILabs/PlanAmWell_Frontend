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
import { registerForPushNotificationsAsync } from './src/utils/notifications';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from './src/services/Auth';

// ✅ Configure how notifications are handled
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
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

    // ✅ Cleanup on unmount or logout
    return () => {
      if (!isAuthenticated) {
        socketService.disconnect();
        console.log('🔌 Socket.IO disconnected (user logged out)');
      }
    };
  }, [isAuthenticated]);

  /**
   * 📲 Register for push notifications when authenticated
   */
  useEffect(() => {
    const setupPushNotifications = async () => {
      if (isAuthenticated) {
        try {
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            console.log('✅ Push notification token registered:', pushToken);
            // TODO: Send pushToken to your backend to save it
            // await sendPushTokenToBackend(pushToken);
          }
        } catch (error) {
          console.error('❌ Push notification registration failed:', error);
        }
      }
    };

    setupPushNotifications();
  }, [isAuthenticated]);

  /**
   * 🔔 Listen for notifications
   */
  useEffect(() => {
    // ✅ Listen for notifications received while app is open (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📩 Notification received (foreground):', notification);
        
        const { title, body, data } = notification.request.content;

        // ✅ Show custom toast for foreground notifications
        Toast.show({
          type: 'info',
          text1: title || 'New Notification',
          text2: body || '',
          position: 'top',
          visibilityTime: 4000,
          onPress: () => {
            // Handle toast tap - navigate based on data
            handleNotificationNavigation(data);
          },
        });
      }
    );

    // ✅ Listen for user tapping on notifications (background/killed state)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification tapped:', response);
        const data = response.notification.request.content.data;
        
        // Navigate based on notification type
        handleNotificationNavigation(data);
      }
    );

    // ✅ Cleanup listeners
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
      // ✅ Navigate based on notification type
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
        // Default: go to notifications screen
        navigationRef.current?.navigate('Notifications');
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