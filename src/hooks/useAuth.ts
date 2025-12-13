// hooks/useAuth.ts - FIXED VERSION
import { useState, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  createGuestSession,
  convertGuestToUser,
  logout,
  TOKEN_KEY,
  SESSION_ID_KEY,
  IS_ANONYMOUS_KEY,
  registerUser,
  loginUser,
} from '../services/Auth';
import { registerDoctor } from '../services/Doctor';
import {
  fetchUserProfile,
  updateUserProfile,
  UpdateUserData
} from '../services/User';
import { IUser, AuthEntity } from '../types/backendType';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushToken, removePushToken } from '../services/Auth';

import { AxiosError } from 'axios';
import { getExpoPushToken } from './usePushToken';

const HAS_SEEN_ONBOARDING = 'HAS_SEEN_ONBOARDING';

interface ConversionResult {
  success: boolean;
  token?: string;
  user?: IUser;
}

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [user, setUser] = useState<AuthEntity | null>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  const userLoadedRef = useRef(false);
  const didLoadRef = useRef(false);



  // ------------------------------------------------------------
  // REFRESH USER - FIXED
  // ------------------------------------------------------------
  const refreshUser = useCallback(async () => {
    if (!userToken) {
      console.log('[useAuth] No token available for refresh');
      return null;
    }
    
    try {
      console.log('[useAuth] 🔄 Refreshing user profile from server...');
      const refreshed = await fetchUserProfile(userToken);
      
      if (refreshed?.success && refreshed.data) {
        console.log('[useAuth] ✅ Profile refreshed successfully');
        console.log('[useAuth] 🖼️ New userImage:', refreshed.data.userImage);
        
        // Force state update with fresh data
        setUser(refreshed.data as AuthEntity);
        userLoadedRef.current = true;
        
        return refreshed.data;
      }
      
      console.warn('[useAuth] ⚠️ Refresh response invalid');
      return null;
    } catch (error) {
      console.error('[useAuth] ❌ refreshUser error:', error);
      return null;
    }
  }, [userToken]);

  // ------------------------------------------------------------
  // LOGOUT
  // ------------------------------------------------------------
const handleLogout = useCallback(async () => {
  if (userToken) {
    await removePushToken('', userToken); 
    // backend should remove by userId
  }

  await logout();
  setUser(null);
  setUserToken(null);
  setSessionId(null);
  setIsAnonymous(true);
  setIsAuthenticated(false);
}, [userToken]);


  // ------------------------------------------------------------
  // LOAD USER PROFILE
  // ------------------------------------------------------------
  const loadUserProfile = useCallback(
    async (token: string) => {
      if (userLoadedRef.current) {
        console.log('[useAuth] Profile already loaded, skipping...');
        return user;
      }

      try {
        console.log('[useAuth] Loading user profile...');
        const response = await fetchUserProfile(token);
        if (response?.success && response.data) {
          console.log('[useAuth] Profile loaded successfully');
          setUser(response.data as AuthEntity);
          setIsAnonymous(false);
          setIsAuthenticated(true);
          userLoadedRef.current = true;
          return response.data;
        }
      } catch (err) {
        const error = err as AxiosError;
        if (error.response?.status === 401) {
          console.warn('[useAuth] Token expired, logging out...');
          handleLogout();
        } else {
          console.error('[useAuth] Failed to fetch user profile:', err);
        }
      }
      return null;
    },
    [handleLogout]
  );

  // ------------------------------------------------------------
  // ONBOARDING
  // ------------------------------------------------------------
  const completeOnboarding = useCallback(async () => {
    try {
      await SecureStore.setItemAsync(HAS_SEEN_ONBOARDING, 'true');
      setHasSeenOnboarding(true);
      console.log('[useAuth] Onboarding completed');
    } catch (error) {
      console.error('[useAuth] Failed to save onboarding status:', error);
    }
  }, []);

  const resetOnboarding = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(HAS_SEEN_ONBOARDING);
      setHasSeenOnboarding(false);
      console.log('[useAuth] Onboarding reset');
    } catch (error) {
      console.error('[useAuth] Failed to reset onboarding status:', error);
    }
  }, []);

  // ------------------------------------------------------------
  // GUEST MODE
  // ------------------------------------------------------------
  const enableGuestMode = useCallback(async () => {
    try {
      console.log('[useAuth] Enabling guest mode...');
      setIsAnonymous(true);
      setIsAuthenticated(false); 
      setUser({ id: 'guest', role: 'Guest' } as any);
      await SecureStore.setItemAsync(IS_ANONYMOUS_KEY, 'true');
      console.log('[useAuth] Guest mode enabled');
    } catch (error) {
      console.error('[useAuth] Failed to enable guest mode:', error);
    }
  }, []);

  // ------------------------------------------------------------
  // INITIAL AUTH LOAD
  // ------------------------------------------------------------
  useEffect(() => {
    // Prevent multiple calls
    if (didLoadRef.current) return;
    didLoadRef.current = true;

    (async () => {
      console.log('[useAuth] Starting initial auth load...');
      
      try {
        const [token, storedSessionId, storedIsAnonymous, seenOnboarding] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(SESSION_ID_KEY),
          SecureStore.getItemAsync(IS_ANONYMOUS_KEY),
          SecureStore.getItemAsync(HAS_SEEN_ONBOARDING),
        ]);

        const isAnon = storedIsAnonymous === 'true';
        setHasSeenOnboarding(seenOnboarding === 'true');

        console.log('[useAuth] Stored values:', {
          hasToken: !!token,
          hasSession: !!storedSessionId,
          isAnonymous: isAnon,
          hasSeenOnboarding: seenOnboarding === 'true',
        });

        if (token) {
          // Have existing token
          setUserToken(token);
          setIsAnonymous(isAnon);
          setIsAuthenticated(!isAnon);

          if (storedSessionId) setSessionId(storedSessionId);

          if (!isAnon && !userLoadedRef.current) {
            // Real user - load profile
            console.log('[useAuth] Loading profile for real user...');
            await loadUserProfile(token);
          } else if (isAnon) {
            // Guest user
            console.log('[useAuth] Setting up guest user...');
            setUser({ id: 'guest', role: 'Guest' } as any);
            setIsAuthenticated(false); // Guests can browse
          }
        } else {
          // No token - create guest session
          console.log('[useAuth] No token found, creating guest session...');
          const guest = await createGuestSession();
          if (guest) {
            console.log('[useAuth] Guest session created');
            setUserToken(guest.token);
            setSessionId(guest.sessionId);
            setIsAnonymous(true);
            setIsAuthenticated(false); // Not authenticated until onboarding
            setUser({ id: 'guest', role: 'Guest' } as any);
          } else {
            console.error('[useAuth] Failed to create guest session');
          }
        }
      } catch (e) {
        console.error('[useAuth] Error restoring session:', e);
      } finally {
        console.log('[useAuth] Initial auth load complete, setting loading to false');
        setLoading(false);
      }
    })();
  }, [loadUserProfile]); // Only run once on mount

  // ------------------------------------------------------------
  // REGISTER / LOGIN
  // ------------------------------------------------------------
  const handleRegister = useCallback(
    async (data: any, role: 'User' | 'Doctor', imageUri?: string) => {
      setLoading(true);
      try {
        console.log(`[useAuth] Registering ${role}...`);
        let response;
        if (role === 'Doctor') {
          if (!imageUri) throw new Error("Doctor registration requires a profile image.");
          response = await registerDoctor(data, imageUri);
        } else {
          response = await registerUser(data);
        }

        if (response) {
          await completeOnboarding();
          console.log(`[useAuth] ${role} registered successfully`);
          return response;
        }
        throw new Error(`${role} registration failed.`);
      } finally {
        setLoading(false);
      }
    },
    [completeOnboarding]
  );

const handleLogin = useCallback(
  async (
    credentials: { email: string; password: string },
    role: 'User' | 'Doctor'
  ) => {
    setLoading(true);

    try {
      console.log(`[useAuth] Logging in ${role}...`);
      const response = await loginUser(credentials, role);

      if (!response?.token || !response?.user) {
        throw new Error('Login failed: Invalid response from server.');
      }

      // ✅ Persist auth first
      setUserToken(response.token);
      setUser(response.user);
      setIsAnonymous(false);
      setIsAuthenticated(true);

      // ✅ Register push notifications
      try {
        const pushToken = await getExpoPushToken ();
        if (pushToken) {
          await registerPushToken(pushToken, response.token);
          console.log('[useAuth] Push token registered');
        }
      } catch (pushError) {
        console.error('[useAuth] Failed to register push token:', pushError);
        // Don't fail login if push token registration fails
      }

      // ✅ Force React Navigation to wait for user state
      userLoadedRef.current = false;
      await new Promise(resolve => setTimeout(resolve, 100));
      userLoadedRef.current = true;

      // ✅ Mark onboarding
      await completeOnboarding();

      console.log(`[useAuth] ${role} logged in successfully`);

      return response.user;
    } catch (err) {
      console.error('[useAuth] Login failed', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, 
  [completeOnboarding]
);


  // ------------------------------------------------------------
  // PROFILE UPDATE - SIMPLIFIED (not used for images anymore)
  // ------------------------------------------------------------
  const updateUser = useCallback(
    async (userId: string, data: UpdateUserData, imageUri?: string) => {
      if (!userToken) return null;
      setLoading(true);
      try {
        const res = await updateUserProfile(userId, userToken, data, imageUri);
        if (res?.success && res.data) {
          setUser(res.data as AuthEntity);
          userLoadedRef.current = true;
          return res.data;
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userToken]
  );

  // ------------------------------------------------------------
  // CONVERT GUEST TO USER
  // ------------------------------------------------------------
  const handleConversion = useCallback(
    async (formData: any): Promise<ConversionResult> => {
      if (!sessionId) return { success: false };
      setLoading(true);
      try {
        const res = await convertGuestToUser(sessionId, formData);
        if (res?.token) {
          setUserToken(res.token);
          setIsAnonymous(false);
          setIsAuthenticated(true);
          if (res.user) setUser(res.user);
          userLoadedRef.current = true;
          await completeOnboarding();

          // ------------------------------------------------------------
  // SET USER TOKEN (for updating after conversion)
  // ------------------------------------------------------------
  const setToken = useCallback((newToken: string) => {
    console.log('[useAuth] Updating token in context');
    setUserToken(newToken);
  }, []);

  return { success: true, token: res.token, user: res.user };
        }
        return { success: false };
      } finally {
        setLoading(false);
      }
    },
    [sessionId, completeOnboarding]
  );

  // ------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------
  

  const setToken = useCallback((newToken: string) => {
    console.log('[useAuth] Updating token in context');
    setUserToken(newToken);
  }, []);
  
  const isDoctor = useCallback((): boolean => 
  !!(user && 'specialization' in user && 'licenseNumber' in user), 
  [user]
);

const isDoctorApproved = useCallback((): boolean => 
  isDoctor() && 'status' in user! && user!.status === 'approved',
  [user, isDoctor]
);

  
  const getUserRole = useCallback(() => {
    if (!user) return null;
    if ('specialization' in user && 'licenseNumber' in user) return 'Doctor';
    return 'User';
  }, [user]);

  const getInitialScreen = useCallback(() => {
    if (!isAuthenticated && !isAnonymous) return 'AuthStack';
    if (isAuthenticated && !isAnonymous && isDoctor() && isDoctorApproved()) {
      return 'DoctorDashScreen';
    }
    return 'HomeScreen';
  }, [isAuthenticated, isAnonymous, isDoctor, isDoctorApproved]);

  return {
    loading,
    isAuthenticated,
    isAnonymous,
    userToken,
    sessionId,
    user,
    hasSeenOnboarding,
    handleConversion,
    handleLogout,
    handleRegister,
    handleLogin,
    updateUser,
    completeOnboarding,
    enableGuestMode,
    resetOnboarding,
    isDoctor,
    isDoctorApproved,
    getUserRole,
    getInitialScreen,
    refreshUser,
    setToken, 
  };
}