import * as Linking from 'expo-linking';
import { LinkingOptions } from '@react-navigation/native';
import { AppStackParamList } from '../types/App';

export const linking: LinkingOptions<AppStackParamList> = {
  prefixes: [
    Linking.createURL('/'), // Expo dev
    'planamwell://',        // Mobile custom scheme
    'https://planamwell.com', // Universal links
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
        parse: {
          amount: Number,
        },
      },
      WebViewScreen: 'webview',

      SettingsScreen: 'settings',
      NotificationsScreen: 'notifications',
      HelpSupportScreen: 'help',
      PrivacySettingsScreen: 'privacy',

      AllDoctorScreen: 'doctors',
      DoctorScreen: 'doctor/:doctorId', // Pass doctor object via params
      DoctorProfileScreen: 'doctor-profile/:doctorId',
      DoctorDashScreen: 'doctor-dash',
      DoctorAvailability: 'doctor-availability',
      DoctorAppointment: 'doctor-appointment',
      BookAppointmentScreen: 'book/:doctorId',

      ArticleDetailScreen: 'article/:slug',
      AllArticleScreen: 'articles',

      MyAppointments: 'appointments',
      ConsultationHistory: 'consultations',

      VideoCallScreen: {
        path: 'video/:appointmentId',
        parse: {},
      },

      IncomingCall: {
        path: 'call/:appointmentId',
      },

      AllActivePartnerScreen: 'partners',

      AmWellChatModal: 'chat',

      // 🔥 NESTED AUTH STACK
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
