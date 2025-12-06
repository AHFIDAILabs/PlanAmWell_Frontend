import {IDoctor} from "./backendType"

export type AppStackParamList = {
  AuthStack: undefined;
  AmWellChatModal: undefined;
  CartModal: undefined;

  ProductsScreen: { productId?: string };
  ProductList: { category: string; fromChat?: boolean };

  CheckoutScreen: undefined;
  PaymentMethodScreen: { orderId: string; amount: number };
  WebViewScreen: { url: string };

  HomeScreen: undefined;
  ProfileScreen: undefined;

  // ✅ Newly added screens
  SettingsScreen: undefined;
  NotificationsScreen: undefined;
  HelpSupportScreen: undefined;
  PrivacySettingsScreen: undefined;
  DoctorScreen:  { doctor: IDoctor };
  AllDoctorScreen: undefined;
  ArticleDetailScreen: { slug: string };
  AllArticleScreen: undefined;
  DoctorDashScreen: undefined

};

