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
    ConfirmOrderScreen: 'confirm-order',
    OrderDetailsScreen: {
      path: 'order-complete',  
      parse: {
        orderId: String,
      },
    },
    PaymentStatusScreen: {
      path: 'payment-status',
      parse: {
        orderId: String,
      },
    },
    PaymentMethodScreen: {
      path: 'payment/:orderId/:amount',
      parse: { amount: Number },
    },
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
    MyAppointments: 'appointments',
    ConsultationHistory: 'consultations',
    ChatRoomScreen: {
      path: 'chat-room',
      parse: {
        appointmentId: String,
        conversationId: String,
      },
    },
    ConversationsListScreen: 'messages',
    AmWellChatModal: 'chat',
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