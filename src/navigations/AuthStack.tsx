// Navigation/AuthStack.tsx (Previously RootNavigator.tsx)
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Onboarding from '../screens/home/Onboarding';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/home/HomeScreen';
import { AuthStackParamList } from '../types/Auth';

const Stack = createStackNavigator<AuthStackParamList>();

const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{ headerShown: false }}
    >

      <Stack.Screen name="Onboarding" component={Onboarding} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="HomeScreen" component={HomeScreen} /> 
    </Stack.Navigator>
  );
};


export default AuthStack;