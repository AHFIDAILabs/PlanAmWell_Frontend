import * as Linking from 'expo-linking';
import { LinkingOptions } from '@react-navigation/native';
import { AppStackParamList } from '../types/App';

export const linking: LinkingOptions<AppStackParamList> = {
  prefixes: [
    Linking.createURL('/'),
    'planamwell://',
    'https://planamwell.com',
  ],

  config: {
    screens: {
      HomeScreen: 'home',
      ProfileScreen: 'profile',

      ProductsScreen: 'products',
      ProductList: 'products/:category',

      CheckoutScreen: 'checkout',
      PaymentMethodScreen: {
        path: 'payment/:orderId/:amount',
        parse: { amount: Number },
      },
      OrdersScreen: 'orders',       // ✅ Added
      SettingsScreen: 'settings',
      NotificationsScreen: 'notifications',
      HelpSupportScreen: 'help',
      PrivacySettingsScreen: 'privacy',

      AllDoctorScreen: 'doctors',
      DoctorScreen: 'doctor/:doctorId',
      DoctorProfileScreen: 'doctor-profile/:doctorId',
      DoctorDashScreen: 'doctor-dash',
      DoctorAvailability: 'doctor-availability',
      DoctorAppointment: 'doctor-appointment',
      BookAppointmentScreen: 'book/:doctorId',

      ArticleDetailScreen: 'article/:slug',
      AllArticleScreen: 'articles',

      MyAppointments: 'appointments',   // ✅ Fixed key name
      ConsultationHistory: 'consultations',

      // ✅ Added — patient/doctor chat room
      ChatRoomScreen: {
        path: 'chat-room',
        parse: {
          appointmentId: String,
          conversationId: String,
        },
      },
      ConversationsListScreen: 'messages',    // ✅ Added

      AmWellChatModal: 'chat',                // ✅ Kept — AI chatbot

      VideoCallScreen: {
        path: 'video/:appointmentId',
      },
      IncomingCall: {
        path: 'call/:appointmentId',
      },

      AllActivePartnerScreen: 'partners',

      AuthStack: {
        path: 'auth',
        screens: {
          Splash: 'splash',
          Onboarding: 'onboarding',
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
          ResetPassword: 'reset/:token',
        },
      },
    },
  },
};