import {IDoctor} from "./backendType"

import { NavigatorScreenParams } from '@react-navigation/native';
import { AuthStackParamList } from '../types/Auth';

export type AppStackParamList = {
  AuthStack: NavigatorScreenParams<AuthStackParamList>; // ✅

  AmWellChatModal: undefined;
  CartModal: undefined;

  ProductsScreen: { productId?: string };
  ProductList: { category: string; fromChat?: boolean };

  CheckoutScreen: undefined;
  PaymentMethodScreen: { orderId: string; amount: number };
  WebViewScreen: { url: string };

  HomeScreen: undefined;
  ProfileScreen: undefined;

  SettingsScreen: undefined;
  NotificationsScreen: undefined;
  HelpSupportScreen: undefined;
  PrivacySettingsScreen: undefined;

  DoctorScreen: { doctor: IDoctor };
  AllDoctorScreen: undefined;

  ArticleDetailScreen: { slug: string };
  AllArticleScreen: undefined;

  DoctorDashScreen: undefined;

  BookAppointmentScreen: { doctor: IDoctor };

  DoctorProfileScreen: { doctorId: string };

  MyAppointments: undefined;
  DoctorAvailability: undefined;
  ConsultationHistory: undefined;
  DoctorAppointment: undefined;

  VideoCallScreen: {
    appointmentId: string;
    name: string;
    patientId: string;
    role: 'doctor' | 'user';
  };

  AllActivePartnerScreen: undefined;

  IncomingCall: {
    appointmentId: string;
    callerName: string;
    callerImage?: string;
    callerType: 'Doctor' | 'Patient';
    channelName: string;
  };
};
