// Navigation/AppNavigator.tsx - FIXED
import React, { useEffect } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import AuthStack from "./AuthStack";
import HomeScreen from "../screens/home/HomeScreen";
import AmWellChatModal from "../screens/home/AmWellChatModal";
import ProductsScreen from "../screens/product/ProductScreen";
import Productlist from "../screens/product/ProductList";
import CheckoutScreen from "../screens/cart/CheckoutScreen";
import PaymentMethodScreen from "../screens/payment/PaymentMethodScreen";
import WebViewScreen from "../screens/payment/WebViewScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import PrivacySettingsScreen from "../screens/setting/PrivacySettingsScreen";
import HelpSupportScreen from "../screens/setting/HelpSupport";
import { DoctorScreen } from "../screens/doctor/DoctorScreen";
import ArticleDetailScreen from "../screens/advocacy/articleDetailScreen";
import AllArticlesScreen from "../screens/advocacy/AllContentScreen";
import SettingsScreen from "../screens/setting/Setting";
import { NotificationsScreen } from "../screens/notification/notification";
import AllDoctorsScreen from "../screens/doctor/AllDoctorsScreen";
import DoctorDashboardScreen from "../screens/doctor/DoctorDashboard";
import { IDoctor } from "../types/backendType";
import { BookAppointmentScreen } from "../screens/appointments/BookAppointmentScreen";
import { MyAppointmentsScreen } from "../screens/appointments/MyAppointmentsScreen";
import DoctorProfileScreen from "../screens/doctor/DoctorProfileScreen";
import DoctorAvailabilityScreen from "../screens/doctor/DoctorAvailabilityScreen";
import { ConsultationHistoryScreen } from "../screens/appointments/ConsultationHistoryScreen";
import AllActivePartnerScreen from "../screens/partner/AllActivePartnerScreen";
import DoctorAppointmentsScreen from "../screens/doctor/DoctorAppointmentsScreen";
import VideoCallScreen from "../screens/video/VideoCallScreen";

import { AppStackParamList } from "../types/App";

const RootStack = createStackNavigator<AppStackParamList>();

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#D81E5B" />
    <Text style={styles.loadingText}>Initializing Session...</Text>
  </View>
);

// Helper to check if user is a doctor
const isDoctor = (user: any): user is IDoctor => {
  return user && "specialization" in user && "licenseNumber" in user;
};

// Helper to check if user is an approved doctor
const isApprovedDoctor = (user: any): boolean => {
  return isDoctor(user) && user.status === "approved";
};

export default function AppNavigator() {
  const { loading, isAuthenticated, isAnonymous, hasSeenOnboarding, user } = useAuth();

  if (loading) return <LoadingScreen />;

  const getInitialRoute = (): keyof AppStackParamList => {
    if (!hasSeenOnboarding) {
      return "AuthStack";
    }

    if (isAuthenticated && isAnonymous) {
      return "HomeScreen";
    }

    if (isAuthenticated && !isAnonymous && user) {
      if (isApprovedDoctor(user)) {
        return "DoctorDashScreen";
      }
      return "HomeScreen";
    }

    return "AuthStack";
  };

  const initialRoute = getInitialRoute();

  return (
    <RootStack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      {/* Auth */}
      <RootStack.Screen name="AuthStack" component={AuthStack} />

      {/* Main Screens */}
      <RootStack.Screen name="HomeScreen" component={HomeScreen} />
      <RootStack.Screen name="ProductsScreen" component={ProductsScreen} />
      <RootStack.Screen name="ProductList" component={Productlist} />
      <RootStack.Screen name="AllDoctorScreen" component={AllDoctorsScreen} />

      {/* Profile & Settings */}
      <RootStack.Screen name="ProfileScreen" component={ProfileScreen} />
      <RootStack.Screen name="SettingsScreen" component={SettingsScreen} />
      <RootStack.Screen name="PrivacySettingsScreen" component={PrivacySettingsScreen} />
      <RootStack.Screen name="HelpSupportScreen" component={HelpSupportScreen} />

      {/* Cart & Payment */}
      <RootStack.Screen name="CheckoutScreen" component={CheckoutScreen} />
      <RootStack.Screen name="PaymentMethodScreen" component={PaymentMethodScreen} />
      <RootStack.Screen name="WebViewScreen" component={WebViewScreen} />

      {/* Notifications */}
      <RootStack.Screen name="NotificationsScreen" component={NotificationsScreen} />

      {/* Doctor Screens */}
      <RootStack.Screen name="DoctorScreen" component={DoctorScreen} />
      <RootStack.Screen name="DoctorDashScreen" component={DoctorDashboardScreen} />
      <RootStack.Screen name="DoctorAppointment" component={DoctorAppointmentsScreen} />
      <RootStack.Screen name="DoctorProfileScreen" component={DoctorProfileScreen} />
      <RootStack.Screen name="DoctorAvailability" component={DoctorAvailabilityScreen} />

      {/* Appointments */}
      <RootStack.Screen name="BookAppointmentScreen" component={BookAppointmentScreen} />
      <RootStack.Screen name="MyAppointments" component={MyAppointmentsScreen} />
      <RootStack.Screen name="ConsultationHistory" component={ConsultationHistoryScreen} />
      <RootStack.Screen name="VideoCallScreen" component={VideoCallScreen} />

      {/* Advocacy */}
      <RootStack.Screen name="ArticleDetailScreen" component={ArticleDetailScreen} />
      <RootStack.Screen name="AllArticleScreen" component={AllArticlesScreen} />

      {/* Partners */}
      <RootStack.Screen name="AllActivePartnerScreen" component={AllActivePartnerScreen} />

      {/* Modals */}
      <RootStack.Screen
        name="AmWellChatModal"
        component={AmWellChatModal}
        options={{ presentation: "modal" }}
      />
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#D81E5B",
  },
});