// hooks/useAuth.ts

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
import { AxiosError } from 'axios';

// Onboarding key for SecureStore
const HAS_SEEN_ONBOARDING = 'HAS_SEEN_ONBOARDING';

interface ConversionResult {
  success: boolean;
  token?: string;
  user?: IUser; // Conversion always results in a regular user
}

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [user, setUser] = useState<AuthEntity | null>(null); // State holds IUser or IDoctor
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  const userLoadedRef = useRef(false);

  // ------------------------------------------------------------
  // LOGOUT
  // ------------------------------------------------------------
  const handleLogout = useCallback(async () => {
    await logout();
    setUser(null);
    setUserToken(null);
    setSessionId(null);
    setIsAnonymous(true);
    setIsAuthenticated(false);
    userLoadedRef.current = false;
    // Don't reset hasSeenOnboarding - they've already seen it
  }, []);

  // ------------------------------------------------------------
  // LOAD USER PROFILE
  // ------------------------------------------------------------
  const loadUserProfile = useCallback(
    async (token: string) => {
      try {
        // Assuming fetchUserProfile handles fetching either IUser or IDoctor based on token role
        const response = await fetchUserProfile(token); 

        if (response?.success && response.data) {
          setUser(response.data as AuthEntity); // Asserting data is AuthEntity
          setIsAnonymous(false);
          setIsAuthenticated(true);
          userLoadedRef.current = true;
          return response.data;
        }
      } catch (err) {
        const error = err as AxiosError;
        if (error.response?.status === 401) {
          console.warn('Token expired. Logging out...');
          handleLogout();
        } else {
          console.error('Failed to fetch user profile:', err);
        }
      }
      return null;
    },
    [handleLogout]
  );

  // ------------------------------------------------------------
  // COMPLETE ONBOARDING
  // ------------------------------------------------------------
 const completeOnboarding = useCallback(async () => {
  try {
    await SecureStore.setItemAsync(HAS_SEEN_ONBOARDING, 'true');
    setHasSeenOnboarding(true);
  } catch (error) {
    console.error('Failed to save onboarding status:', error);
  }
}, []);

// Add this function
const enableGuestMode = useCallback(async () => {
  try {
    setIsAnonymous(true);
    setIsAuthenticated(true);
    // Optionally set a guest user object
    setUser({ id: 'guest', role: 'Guest' } as any);
  } catch (error) {
    console.error('Failed to enable guest mode:', error);
  }
}, []);

  // ------------------------------------------------------------
  // RESET ONBOARDING (for testing purposes)
  // ------------------------------------------------------------
  const resetOnboarding = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(HAS_SEEN_ONBOARDING);
      setHasSeenOnboarding(false);
    } catch (error) {
      console.error('Failed to reset onboarding status:', error);
    }
  }, []);

  // ------------------------------------------------------------
  // INITIAL AUTH LOAD
  // ------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedSessionId = await SecureStore.getItemAsync(SESSION_ID_KEY);
        const storedIsAnonymous = await SecureStore.getItemAsync(IS_ANONYMOUS_KEY);
        const seenOnboarding = await SecureStore.getItemAsync(HAS_SEEN_ONBOARDING);
        
        const isAnon = storedIsAnonymous === 'true';

        // Set onboarding status
        setHasSeenOnboarding(seenOnboarding === 'true');

        if (token && storedSessionId) {
          setUserToken(token);
          setSessionId(storedSessionId);
          setIsAnonymous(isAnon);
          setIsAuthenticated(true);

          if (!isAnon) {
            // Registered user or approved doctor - load profile
            await loadUserProfile(token);
          }
        } else {
          // New install → create guest session
          const guest = await createGuestSession();
          if (guest) {
            setUserToken(guest.token);
            setSessionId(guest.sessionId);
            setIsAnonymous(true);
            setIsAuthenticated(true);
          }
        }
      } catch (e) {
        console.error('Error restoring session:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadUserProfile]);

  // ------------------------------------------------------------
  // GENERALIZED REGISTER (Handles User and Doctor)
  // ------------------------------------------------------------
  const handleRegister = useCallback(
    async (
      data: any, // Contains user or doctor specific fields
      role: 'User' | 'Doctor',
      imageUri?: string 
    ) => {
      setLoading(true);
      try {
        let response;
        if (role === 'Doctor') {
          if (!imageUri) throw new Error("Doctor registration requires a profile image.");
          response = await registerDoctor(data, imageUri); // Calls doctor service
        } else {
          response = await registerUser(data); // Calls user service
        }

        if (response) {
          // Mark onboarding as complete after successful registration
          await completeOnboarding();
          return response;
        }
        throw new Error(`${role} registration failed.`);
      } catch (e) {
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [completeOnboarding]
  );

  // ------------------------------------------------------------
  // GENERALIZED LOGIN (Handles User and Approved Doctor)
  // ------------------------------------------------------------
  const handleLogin = useCallback(
    async (credentials: { email: string; password: string }, role: 'User' | 'Doctor') => {
      setLoading(true);
      try {
        // Calls the generalized loginUser (which now uses the role parameter to hit the correct endpoint)
        const response = await loginUser(credentials, role); 
        
        if (response?.token && response?.user) {
          await SecureStore.setItemAsync(TOKEN_KEY, response.token);
          await SecureStore.setItemAsync(IS_ANONYMOUS_KEY, 'false');

          setUserToken(response.token);
          setUser(response.user); 
          setIsAnonymous(false);
          setIsAuthenticated(true);
          userLoadedRef.current = true;

          // Mark onboarding as complete after successful login
          await completeOnboarding();

          return response.user;
        }
        throw new Error('Login failed: Invalid response from server.');
      } catch (e) {
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [completeOnboarding]
  );

  // ------------------------------------------------------------
  // UPDATE PROFILE
  // ------------------------------------------------------------
  const updateUser = useCallback(
    async (userId: string, data: UpdateUserData, imageUri?: string) => {
      if (!userToken) return null;
      setLoading(true);

      try {
        const res = await updateUserProfile(userId, userToken, data, imageUri);
        if (res?.success && res.data) {
          setUser(res.data as AuthEntity); // Update state with the updated entity
          userLoadedRef.current = true;
          return res.data;
        }
        return null;
      } catch (err) {
        console.error('Profile update failed:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userToken]
  );

  // ------------------------------------------------------------
  // CONVERT GUEST → REAL USER (Remains the same, specific to User)
  // ------------------------------------------------------------
  const handleConversion = useCallback(
    async (formData: any): Promise<ConversionResult> => {
      if (!sessionId) return { success: false };

      setLoading(true);
      try {
        const res = await convertGuestToUser(sessionId, formData);

        if (res?.token) {
          await SecureStore.setItemAsync(TOKEN_KEY, res.token);
          await SecureStore.setItemAsync(IS_ANONYMOUS_KEY, 'false');

          setUserToken(res.token);
          setIsAnonymous(false);

          if (res.user) {
            setUser(res.user);
          }

          userLoadedRef.current = true;

          // Mark onboarding as complete after successful conversion
          await completeOnboarding();

          return { success: true, token: res.token, user: res.user };
        }

        return { success: false };
      } catch (error) {
        console.error('Conversion failed:', error);
        return { success: false };
      } finally {
        setLoading(false);
      }
    },
    [sessionId, completeOnboarding]
  );

  // ------------------------------------------------------------
  // REFRESH USER
  // ------------------------------------------------------------
  const refreshUser = useCallback(() => {
    if (userToken) {
      loadUserProfile(userToken);
    }
  }, [userToken, loadUserProfile]);

  // ------------------------------------------------------------
  // HELPER: Check if user is a doctor
  // ------------------------------------------------------------
  const isDoctor = useCallback(() => {
    return user && 'role' in user && user.role === 'Doctor';
  }, [user]);

  // ------------------------------------------------------------
  // HELPER: Check if doctor is approved
  // ------------------------------------------------------------
  const isDoctorApproved = useCallback(() => {
    return isDoctor() && 'approvalStatus' in user! && user!.approvalStatus === 'Approved';
  }, [user, isDoctor]);

  // ------------------------------------------------------------
  // HELPER: Get user role
  // ------------------------------------------------------------
  const getUserRole = useCallback(() => {
    if (!user) return null;
    if ('role' in user) return user.role;
    return 'User'; // Default to User if role field doesn't exist
  }, [user]);

  // ------------------------------------------------------------
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
    refreshUser,
    updateUser,
    completeOnboarding,
      enableGuestMode, // ADD THIS
    resetOnboarding, // Useful for development/testing
    isDoctor,
    isDoctorApproved,
    getUserRole,
  };
}