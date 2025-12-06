import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigations/AppNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { CartProvider } from './src/context/CartContext';
import { NotificationProvider } from './src/context/notificatonContext';
import Toast from 'react-native-toast-message';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

function AppContent() {
  const { darkMode } = useTheme();

  return (
    <>
      <StatusBar style={darkMode ? "light" : "dark"} />

      <NotificationProvider>
        <CartProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </CartProvider>
      </NotificationProvider>

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
