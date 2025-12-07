// Navigation/AppNavigator.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
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
import NotificationsScreen from "../screens/notification/notification";
import AllDoctorsScreen from "../screens/doctor/AllDoctorsScreen";
import DoctorDashboardScreen from "../screens/doctor/DoctorDashboard";
import { IDoctor } from "../types/backendType";

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
  return user && 'specialization' in user && 'licenseNumber' in user;
};

export default function AppNavigator() {
  const { loading, isAuthenticated, isAnonymous, hasSeenOnboarding, user } = useAuth();

  if (loading) return <LoadingScreen />;

  const getInitialRoute = (): keyof AppStackParamList => {
    console.log('🔍 Determining initial route...');
    console.log('   hasSeenOnboarding:', hasSeenOnboarding);
    console.log('   isAuthenticated:', isAuthenticated);
    console.log('   isAnonymous:', isAnonymous);
    console.log('   user:', user);

    // 1. First time user - show onboarding
    if (!hasSeenOnboarding) {
      console.log('   → AuthStack (Onboarding)');
      return "AuthStack";
    }

    // 2. Authenticated guest (browsing mode)
    if (isAuthenticated && isAnonymous) {
      console.log('   → HomeScreen (Guest)');
      return "HomeScreen";
    }

    // 3. Authenticated user/doctor
    if (isAuthenticated && !isAnonymous && user) {
      // Check if it's a doctor by checking for doctor-specific fields
      if (isDoctor(user)) {
        console.log('   User is a doctor, status:', user.status);
        // Check if approved
        if (user.status === 'approved') {
          console.log('   → DoctorDashScreen (Approved Doctor)');
          return "DoctorDashScreen";
        } else {
          console.log('   → HomeScreen (Doctor not approved)');
          return "HomeScreen";
        }
      }
      // Regular user
      console.log('   → HomeScreen (Regular User)');
      return "HomeScreen";
    }

    // 4. Not authenticated
    console.log('   → AuthStack (Not authenticated)');
    return "AuthStack";
  };

  const initialRoute = getInitialRoute();

  return (
    <RootStack.Navigator 
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <RootStack.Screen name="AuthStack" component={AuthStack} />
      
      <RootStack.Screen name="HomeScreen" component={HomeScreen} />
      <RootStack.Screen name="ProductsScreen" component={ProductsScreen} />
      <RootStack.Screen name="ProductList" component={Productlist} />
      <RootStack.Screen name="AllDoctorScreen" component={AllDoctorsScreen} />
      
      <RootStack.Screen name="ProfileScreen" component={ProfileScreen} />
      
      <RootStack.Screen name="CheckoutScreen" component={CheckoutScreen} />
      <RootStack.Screen name="PaymentMethodScreen" component={PaymentMethodScreen} />
      <RootStack.Screen name="WebViewScreen" component={WebViewScreen} />
      <RootStack.Screen name="NotificationsScreen" component={NotificationsScreen} />
      <RootStack.Screen name="SettingsScreen" component={SettingsScreen} />
      <RootStack.Screen name="PrivacySettingsScreen" component={PrivacySettingsScreen} />
      <RootStack.Screen name="HelpSupportScreen" component={HelpSupportScreen} />
      <RootStack.Screen name="DoctorScreen" component={DoctorScreen} />
      <RootStack.Screen name="ArticleDetailScreen" component={ArticleDetailScreen} />
      <RootStack.Screen name="AllArticleScreen" component={AllArticlesScreen} />
      <RootStack.Screen name="DoctorDashScreen" component={DoctorDashboardScreen} />
      
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