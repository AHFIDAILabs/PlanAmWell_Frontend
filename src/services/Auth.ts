// services/Auth.ts - COMPLETE VERSION WITH TOKEN REFRESH
import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { UserData, AuthResponse } from '../types/Auth';
import { AuthEntity } from '../types/backendType';

// Define the base URL using the environment variable
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const BASE_URL = `${SERVER_URL}/api/v1/auth`; 

if (!SERVER_URL) {
  console.error("SERVER_URL environment variable is not set!");
}

// ---------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------
export const TOKEN_KEY = 'Token';
export const REFRESH_TOKEN_KEY = 'RefreshToken';
export const SESSION_ID_KEY = 'sessionId';
export const IS_ANONYMOUS_KEY = 'isAnonymous';

// ---------------------------------------------------------------------
// Auth Response Interfaces
// ---------------------------------------------------------------------
interface AuthResponseData {
    token: string;
    user: AuthEntity;
    message: string;
    refreshToken?: string;
}

interface GenericAPIResponse<T> {
    success: boolean;
    data?: T;
}

interface DecodedToken {
  id: string;
  role: string;
  name: string;
  exp: number;
  iat: number;
}

// ---------------------------------------------------------------------
// Token Management
// ---------------------------------------------------------------------

/**
 * Check if token is expired or will expire in next 5 minutes
 */
const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    const currentTime = Date.now() / 1000;
    const bufferTime = 5 * 60; // 5 minutes buffer
    
    const willExpire = decoded.exp < (currentTime + bufferTime);
    
    if (willExpire) {
      console.log('[Auth] Token will expire soon or is expired');
      console.log('[Auth] Expires at:', new Date(decoded.exp * 1000).toISOString());
      console.log('[Auth] Current time:', new Date().toISOString());
    }
    
    return willExpire;
  } catch (error) {
    console.error('[Auth] Error decoding token:', error);
    return true;
  }
};

/**
 * Refresh the access token using refresh token
 */
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      console.log('[Auth] ⚠️ No refresh token available');
      return null;
    }

    console.log('[Auth] 🔄 Refreshing access token...');
    
    const response = await axios.post(`${BASE_URL}/refreshToken`, {
      refreshToken,
    });

    if (response.data.success && response.data.token) {
      const newToken = response.data.token;
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      
      console.log('[Auth] ✅ Access token refreshed successfully');
      return newToken;
    }

    console.log('[Auth] ❌ Token refresh failed - no token in response');
    return null;
  } catch (error: any) {
    console.error('[Auth] ❌ Failed to refresh token:', error.response?.data || error.message);
    
    // If refresh token is invalid/expired, clear everything
    if (error.response?.status === 401) {
      console.log('[Auth] Refresh token invalid, clearing all tokens');
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
    
    return null;
  }
};

/**
 * Get valid token - refreshes if expired
 */
export const getValidToken = async (): Promise<string | null> => {
  try {
    let token = await SecureStore.getItemAsync(TOKEN_KEY);
    
    if (!token) {
      console.log('[Auth] No token found in storage');
      return null;
    }

    // Check if token is expired or about to expire
    if (isTokenExpired(token)) {
      console.log('[Auth] Token expired, attempting refresh...');
      token = await refreshAccessToken();
      
      if (!token) {
        console.log('[Auth] Failed to refresh token');
        return null;
      }
    }

    return token;
  } catch (error) {
    console.error('[Auth] Error getting valid token:', error);
    return null;
  }
};

// ---------------------------------------------------------------------
// Axios Interceptors Setup
// ---------------------------------------------------------------------

let isInterceptorSetup = false;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  
  failedQueue = [];
};

/**
 * Setup axios interceptors for automatic token refresh
 */
export const setupAxiosInterceptors = () => {
  if (isInterceptorSetup) {
    console.log('[Auth] Interceptors already setup, skipping...');
    return;
  }

  console.log('[Auth] Setting up axios interceptors...');

  // Request interceptor - add fresh token to all requests
  axios.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Skip token refresh for auth endpoints
      if (config.url?.includes('/auth/login') || 
          config.url?.includes('/auth/register') ||
          config.url?.includes('/auth/refreshToken') ||
          config.url?.includes('/auth/guest')) {
        return config;
      }

      // Get valid token (will refresh if needed)
      const token = await getValidToken();
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle 401 errors
  axios.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // If error is not 401 or already retried, reject
      if (error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axios(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      console.log('[Auth] 401 error detected, attempting token refresh...');
      
      try {
        const newToken = await refreshAccessToken();

        if (newToken) {
          console.log('[Auth] Token refreshed, retrying original request');
          processQueue(null, newToken);
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          
          return axios(originalRequest);
        } else {
          console.log('[Auth] Token refresh failed, user must re-login');
          processQueue(new Error('Token refresh failed'), null);
          
          // Clear tokens
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
          
          return Promise.reject(error);
        }
      } catch (refreshError) {
        console.error('[Auth] Error during token refresh:', refreshError);
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );

  isInterceptorSetup = true;
  console.log('[Auth] ✅ Axios interceptors setup complete');
};

// ---------------------------------------------------------------------
// Auth Functions
// ---------------------------------------------------------------------

/**
 * Creates an anonymous guest session and stores the token.
 */
export async function createGuestSession(): Promise<AuthResponse | null> {
  try {
    const response = await axios.post<AuthResponse>(`${BASE_URL}/guest`);
    
    const { token, sessionId, isAnonymous } = response.data;
    
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(SESSION_ID_KEY, sessionId);
    await SecureStore.setItemAsync(IS_ANONYMOUS_KEY, String(isAnonymous));

    console.log('[Auth] Guest session created and token stored.');
    return response.data;
  } catch (error) {
    console.error('[Auth] Error creating guest session:', error);
    return null;
  }
}

/**
 * Converts an existing guest session to a full user account.
 */
export async function convertGuestToUser(sessionId: string, userData: UserData): Promise<AuthResponse | null> {
  try {
    const response = await axios.post<AuthResponse>(`${BASE_URL}/convert`, {
      sessionId,
      ...userData,
    });

    const { token, refreshToken } = response.data;
    
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(IS_ANONYMOUS_KEY, 'false');
    
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
    
    await SecureStore.deleteItemAsync(SESSION_ID_KEY);

    console.log('[Auth] Guest session converted to full user.');
    return response.data;
  } catch (error) {
    console.error('[Auth] Error converting guest session:', error);
    return null;
  }
}

/**
 * Register a new user
 */
export async function registerUser(userData: UserData): Promise<AuthResponse | null> {
  try {
    const response = await axios.post<AuthResponse>(`${BASE_URL}/register`, userData);
    
    if (response.data.success) {
      return { success: true, user: response.data, token: '' } as unknown as AuthResponse;
    }
    return null;
  } catch (error) {
    console.error('[Auth] Registration failed:', error);
    throw error;
  }
}

/**
 * Login user or doctor
 */
export async function loginUser(
  credentials: { email: string; password: string }, 
  role: 'User' | 'Doctor'
): Promise<AuthResponseData | null> {
  try {
    const endpoint = role === 'User' ? `${BASE_URL}/login` : `${BASE_URL}/doctor/login`;
    
    console.log(`[Auth] Logging in ${role}...`);
    const response: AxiosResponse<AuthResponseData> = await axios.post(endpoint, credentials);
    
    if (response.data.token && response.data.user) {
      // Store both access token and refresh token
      await SecureStore.setItemAsync(TOKEN_KEY, response.data.token);
      await SecureStore.setItemAsync(IS_ANONYMOUS_KEY, 'false');
      
      // Store refresh token if provided
      if (response.data.refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.data.refreshToken);
        console.log('[Auth] Refresh token stored');
      } else {
        console.warn('[Auth] ⚠️ No refresh token received from server');
      }
      
      // Clear any guest session data
      await SecureStore.deleteItemAsync(SESSION_ID_KEY);
      
      console.log(`[Auth] ${role} logged in successfully, tokens stored.`);
      return response.data;
    }
    return null;
  } catch (error) {
    console.error(`[Auth] ${role} Login failed:`, error);
    throw error;
  }
}

/**
 * Register Expo push token
 */
export async function registerPushToken(token: string, authToken: string): Promise<boolean> {
  try {
    const response = await axios.post(
      `${BASE_URL}/register-push-token`,
      { token },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    if (response.data.success) {
      console.log('[Auth] Push token registered successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Auth] Failed to register push token:', error);
    return false;
  }
}

/**
 * Remove Expo push token (on logout)
 */
export async function removePushToken(token: string, authToken: string): Promise<boolean> {
  try {
    const response = await axios.post(
      `${BASE_URL}/remove-push-token`,
      { token },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    if (response.data.success) {
      console.log('[Auth] Push token removed successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Auth] Failed to remove push token:', error);
    return false;
  }
}

/**
 * Clears all authentication tokens upon logout.
 */
export async function logout() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(SESSION_ID_KEY);
  await SecureStore.deleteItemAsync(IS_ANONYMOUS_KEY);
  console.log('[Auth] Logged out, all tokens cleared.');
}