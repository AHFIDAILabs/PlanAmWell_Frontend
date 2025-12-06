import { IUser } from "./backendType";

export type AuthStackParamList = {
    Onboarding: undefined;
    Splash: undefined;
    HomeScreen: undefined;
    CheckoutScreen: undefined; 
    
    Login: undefined; 
    Register: undefined;    
    ForgotPassword: undefined;
    ResetPassword: { token: string };
    // Add other screens specific to the Auth stack
};

export interface UserData {
    name: string;
    email: string;
    phone: string;
    password?: string;
}

export interface AuthResponse {
    success: boolean;
    sessionId: string;
    token: string;
    isAnonymous: boolean;
    user?: IUser;
}