import axios, { AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store'; // 💡 Changed import
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
    // NOTE: For login, the backend returns token/user directly, not wrapped in 'data'.
    // Adjusting type definition for frontend helper functions:
}

/**
 * Creates an anonymous guest session and stores the token.
 * POST /auth/guest
 */
export async function createGuestSession(): Promise<AuthResponse | null> {
  try {
    const response = await axios.post<AuthResponse>(`${BASE_URL}/guest`);
    
    const { token, sessionId, isAnonymous } = response.data;
    
    // Store credentials securely for persistence (using SecureStore)
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(SESSION_ID_KEY, sessionId);
    await SecureStore.setItemAsync(IS_ANONYMOUS_KEY, String(isAnonymous)); // Store boolean as string

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
    await SecureStore.deleteItemAsync(IS_ANONYMOUS_KEY); // Remove anonymous status

    console.log("Guest session converted to full user.");
    return response.data;

  } catch (error) {
    console.error('Error converting guest session:', error);
    return null;
  }
}

export async function registerUser(userData: UserData): Promise<AuthResponse | null> {
    try {
        const response = await axios.post<AuthResponse>(`${BASE_URL}/register`, userData);
        
        // Since backend only returns success: true and data: newUser (local only), 
        // we assume the success object looks like: { success: true, data: IUser }
        // The frontend will need to call login immediately afterward to get the token.
        if (response.data.success) {
             // Returning success status for the screen, but requires login step next
             return { success: true, user: response.data, token: '' } as unknown as AuthResponse;
        }
        return null;
    } catch (error) {
        console.error('Registration failed:', error);
        throw error; // Re-throw for screen to handle specific errors (e.g., 409)
    }
}

/**
 * PUBLIC - Login user
 * POST /auth/login
 */
export async function loginUser(
    credentials: { email: string; password: string }, 
    role: 'User' | 'Doctor' // Added role parameter
): Promise<AuthResponseData | null> {
    try {
        const endpoint = role === 'User' ? `${BASE_URL}/login` : `${BASE_URL}/doctor/login`;
        
        // Response type is assumed to be AuthResponseData (with token/user at root level)
        const response: AxiosResponse<AuthResponseData> = await axios.post(endpoint, credentials);
        
        if (response.data.token && response.data.user) {
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
}