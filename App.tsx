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

// ✅ Configure how notifications are handled (updated API)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, // ✅ Added
    shouldShowList: true,   // ✅ Added
  }),
});

function AppContent() {
  const { darkMode } = useTheme();
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    // ✅ Listen for notifications received while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📩 Notification received:', notification);
      // Show a custom toast
      Toast.show({
        type: 'info',
        text1: notification.request.content.title || 'New Notification',
        text2: notification.request.content.body || '',
        position: 'top',
      });
    });

    // ✅ Listen for user tapping on notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      const data = response.notification.request.content.data;

      // Handle navigation based on notification type
      if (navigationRef.current) {
        if (data.appointmentId) {
          // Navigate to appointments
          navigationRef.current?.navigate('ConsultationHistory');
        } else if (data.orderId) {
          // Navigate to order details
          navigationRef.current?.navigate('OrderDetails', { orderId: data.orderId });
        }
      }
    });

    // ✅ Cleanup (fixed method name)
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

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