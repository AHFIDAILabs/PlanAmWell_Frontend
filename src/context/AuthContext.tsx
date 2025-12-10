// context/AuthContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AuthEntity } from '../types/backendType';

export interface AuthContextType {
  loading: boolean;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  userToken: string | null;
  sessionId: string | null;
  user: AuthEntity | null;
  hasSeenOnboarding: boolean;
  handleConversion: (formData: any) => Promise<{ success: boolean; token?: string; user?: AuthEntity }>;
  handleLogout: () => Promise<void>;
  handleRegister: (data: any, role: 'User' | 'Doctor', imageUri?: string) => Promise<any>;
  handleLogin: (credentials: { email: string; password: string }, role: 'User' | 'Doctor') => Promise<AuthEntity>;
  updateUser: (userId: string, data: any, imageUri?: string) => Promise<AuthEntity | null>;
  completeOnboarding: () => Promise<void>;
  enableGuestMode: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  isDoctor: () => boolean;
  isDoctorApproved: () => boolean;
  getUserRole: () => 'User' | 'Doctor' | null;
  getInitialScreen: () => string;
  refreshUser: () => Promise<AuthEntity | null>;
  setToken: (newToken: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
