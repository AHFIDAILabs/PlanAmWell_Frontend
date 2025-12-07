import axios, { AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
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
export const SESSION_ID_KEY = 'sessionId';
export const IS_ANONYMOUS_KEY = 'isAnonymous';

// --- Auth Response Interfaces ---
interface AuthResponseData {
    token: string;
    user: AuthEntity; // Can be IUser or IDoctor
    message: string;
    refreshToken?: string;
}

interface GenericAPIResponse<T> {
    success: boolean;
    data?: T;
}

/**
 * Creates an anonymous guest session and stores the token.
 * POST /auth/guest
 */
export async function createGuestSession(): Promise<AuthResponse | null> {
  try {
    const response = await axios.post<AuthResponse>(`${BASE_URL}/guest`);
    
    const { token, sessionId, isAnonymous } = response.data;
    
    // Store credentials securely for persistence
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(SESSION_ID_KEY, sessionId);
    await SecureStore.setItemAsync(IS_ANONYMOUS_KEY, String(isAnonymous));

    console.log("Guest session created and token stored.");
    return response.data;

  } catch (error) {
    console.error('Error creating guest session:', error);
    return null;
  }
}

/**
 * Converts an existing guest session to a full user account.
 * POST /auth/convert
 */
export async function convertGuestToUser(sessionId: string, userData: UserData): Promise<AuthResponse | null> {
  try {
    const response = await axios.post<AuthResponse>(`${BASE_URL}/convert`, {
      sessionId,
      ...userData,
    });

    const { token } = response.data;
    
    // Update stored credentials (new token and non-anonymous status)
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(IS_ANONYMOUS_KEY, 'false'); // Update to false
    await SecureStore.deleteItemAsync(SESSION_ID_KEY); // Remove session ID after conversion

    console.log("Guest session converted to full user.");
    return response.data;

  } catch (error) {
    console.error('Error converting guest session:', error);
    return null;
  }
}

/**
 * Register a new user
 * POST /auth/register
 */
export async function registerUser(userData: UserData): Promise<AuthResponse | null> {
    try {
        const response = await axios.post<AuthResponse>(`${BASE_URL}/register`, userData);
        
        if (response.data.success) {
             // Return success status - user needs to login afterward
             return { success: true, user: response.data, token: '' } as unknown as AuthResponse;
        }
        return null;
    } catch (error) {
        console.error('Registration failed:', error);
        throw error;
    }
}

/**
 * Login user or doctor
 * POST /auth/login or /auth/doctor/login
 */
export async function loginUser(
    credentials: { email: string; password: string }, 
    role: 'User' | 'Doctor'
): Promise<AuthResponseData | null> {
    try {
        const endpoint = role === 'User' ? `${BASE_URL}/login` : `${BASE_URL}/doctor/login`;
        
        const response: AxiosResponse<AuthResponseData> = await axios.post(endpoint, credentials);
        
        if (response.data.token && response.data.user) {
            // 🔥 CRITICAL: Store the token immediately after successful login
            await SecureStore.setItemAsync(TOKEN_KEY, response.data.token);
            await SecureStore.setItemAsync(IS_ANONYMOUS_KEY, 'false');
            
            // Clear any guest session data
            await SecureStore.deleteItemAsync(SESSION_ID_KEY);
            
            console.log(`${role} logged in successfully, token stored.`);
            return response.data;
        }
        return null;
    } catch (error) {
        console.error(`${role} Login failed:`, error);
        throw error;
    }
}

/**
 * Clears all authentication tokens upon logout.
 */
export async function logout() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(SESSION_ID_KEY);
  await SecureStore.deleteItemAsync(IS_ANONYMOUS_KEY);
  console.log("Logged out, all tokens cleared.");
}