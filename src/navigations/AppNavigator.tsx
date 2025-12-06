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

import { AppStackParamList } from "../types/App";

const RootStack = createStackNavigator<AppStackParamList>();

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#D81E5B" />
    <Text style={styles.loadingText}>Initializing Session...</Text>
  </View>
);

export default function AppNavigator() {
  const { loading, isAuthenticated, isAnonymous, user } = useAuth();

  if (loading) return <LoadingScreen />;

  // Determine initial route based on user status
const getInitialRoute = () => {
  // If not authenticated AND not anonymous → Show Auth/Onboarding
  if (!isAuthenticated && isAnonymous) {
    return "AuthStack";
  }

  // If anonymous/guest mode → Show HomeScreen with limited access
  if (isAuthenticated) {
    return "HomeScreen";
  }

  // Check if user is a doctor
  if (user && 'role' in user && user.role === 'Doctor') {
    if ('approvalStatus' in user && user.approvalStatus === 'Approved') {
      return "DoctorDashScreen";
    }
    return "HomeScreen";
  }

  // Regular authenticated user → HomeScreen
  return "HomeScreen";
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
      <RootStack.Screen name="CheckoutScreen" component={CheckoutScreen} />

      {isAuthenticated && !isAnonymous && (
        <>
          <RootStack.Screen name="ProfileScreen" component={ProfileScreen} />
          <RootStack.Screen name="PaymentMethodScreen" component={PaymentMethodScreen} />
          <RootStack.Screen name="WebViewScreen" component={WebViewScreen} />
          <RootStack.Screen name="NotificationsScreen" component={NotificationsScreen} />
          <RootStack.Screen name="SettingsScreen" component={SettingsScreen} />
          <RootStack.Screen name="PrivacySettingsScreen" component={PrivacySettingsScreen} />
          <RootStack.Screen name="HelpSupportScreen" component={HelpSupportScreen} />
          <RootStack.Screen name="DoctorScreen" component={DoctorScreen} />
          <RootStack.Screen name="AllDoctorScreen" component={AllDoctorsScreen} />
          <RootStack.Screen name="ArticleDetailScreen" component={ArticleDetailScreen} />
          <RootStack.Screen name="AllArticleScreen" component={AllArticlesScreen} />
          
          {user && 'role' in user && user.role === 'Doctor' && 
           'approvalStatus' in user && user.approvalStatus === 'Approved' && (
            <RootStack.Screen name="DoctorDashScreen" component={DoctorDashboardScreen} />
          )}

          <RootStack.Screen
            name="AmWellChatModal"
            component={AmWellChatModal}
            options={{ presentation: "modal" }}
          />
        </>
      )}
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