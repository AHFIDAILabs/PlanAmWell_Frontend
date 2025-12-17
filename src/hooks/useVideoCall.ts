// hooks/useVideoCall.ts - ENHANCED VERSION WITH ERROR HANDLING & RETRY LOGIC
import { useState, useCallback, useRef } from "react";
import axios, { AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import { Alert } from "react-native";
import { TOKEN_KEY } from "../services/Auth";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const API_URL = `${SERVER_URL}/api/v1/video`;

export interface VideoTokenResponse {
  token: string;
  channelName: string;
  uid: number;
  appId: string;
  expiresAt: string;
  appointment?: {
    id: string;
    scheduledAt: string;
    doctorName: string;
    patientName: string;
  };
}

export type CallIssueType = "audio" | "video" | "network" | "other";

interface VideoCallError {
  type: 'network' | 'auth' | 'timing' | 'permission' | 'unknown';
  message: string;
  canRetry: boolean;
  originalError?: any;
}

export const useVideoCall = () => {
  const [loading, setLoading] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callData, setCallData] = useState<VideoTokenResponse | null>(null);
  const [error, setError] = useState<VideoCallError | null>(null);
  const callStartTime = useRef<number | null>(null);
  const isRetrying = useRef(false);

  /**
   * Parse error and determine if it's retryable
   */
  const parseError = useCallback((error: any): VideoCallError => {
    // Network errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return {
        type: 'network',
        message: 'Connection timeout. Please check your internet connection.',
        canRetry: true,
        originalError: error,
      };
    }

    // Axios errors with response
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const responseMessage = error.response.data?.message || '';

      // Timing errors (too early or too late)
      if (status === 400 && responseMessage.includes('15 minutes')) {
        return {
          type: 'timing',
          message: responseMessage,
          canRetry: false,
          originalError: error,
        };
      }

      // Auth errors
      if (status === 401 || status === 403) {
        return {
          type: 'auth',
          message: 'Authentication failed. Please log in again.',
          canRetry: false,
          originalError: error,
        };
      }

      // Other 400 errors
      if (status === 400) {
        return {
          type: 'permission',
          message: responseMessage || 'Cannot join this call.',
          canRetry: false,
          originalError: error,
        };
      }

      // Server errors (5xx)
      if (status >= 500) {
        return {
          type: 'network',
          message: 'Server error. Please try again.',
          canRetry: true,
          originalError: error,
        };
      }
    }

    // Network errors without response
    if (axios.isAxiosError(error) && !error.response) {
      return {
        type: 'network',
        message: 'Cannot reach server. Please check your internet connection.',
        canRetry: true,
        originalError: error,
      };
    }

    // Unknown errors
    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred.',
      canRetry: true,
      originalError: error,
    };
  }, []);

  /**
   * Show user-friendly error alert
   */
  const showErrorAlert = useCallback((parsedError: VideoCallError, onRetry?: () => void) => {
    const buttons: any[] = [];

    if (parsedError.canRetry && onRetry) {
      buttons.push({
        text: 'Retry',
        onPress: onRetry,
      });
    }

    buttons.push({
      text: parsedError.canRetry ? 'Cancel' : 'OK',
      style: 'cancel',
    });

    Alert.alert(
      parsedError.type === 'timing' ? 'Too Early' : 'Connection Error',
      parsedError.message,
      buttons
    );
  }, []);

  /** 
   * Fetch Agora RTC Token with enhanced error handling
   */
  const getVideoToken = useCallback(
    async (appointmentId: string, retries = 2): Promise<VideoTokenResponse> => {
      try {
        setLoading(true);
        setError(null);

        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) {
          throw new Error("Authentication token not found. Please log in again.");
        }

        console.log(`🎥 Fetching video token for appointment: ${appointmentId}`);

        const response = await axios.post(
          `${API_URL}/token`,
          { appointmentId },
          { 
            headers: { 
              Authorization: `Bearer ${token}`, 
              "Content-Type": "application/json" 
            }, 
            timeout: 15000 
          }
        );

        if (!response.data?.success || !response.data?.data) {
          throw new Error("Invalid response from video service");
        }

        const data: VideoTokenResponse = response.data.data;
        setCallData(data);
        
        console.log('✅ Video token received successfully');
        console.log(`   Channel: ${data.channelName}`);
        console.log(`   UID: ${data.uid}`);
        
        return data;

      } catch (error: any) {
        console.error("❌ Failed to get video token:", error);

        const parsedError = parseError(error);
        setError(parsedError);

        // Retry logic for retryable errors
        if (parsedError.canRetry && retries > 0 && !isRetrying.current) {
          console.warn(`🔄 Retrying video token fetch... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait before retry
          return getVideoToken(appointmentId, retries - 1);
        }

        throw parsedError;
      } finally {
        setLoading(false);
      }
    },
    [parseError]
  );

  /** 
   * Start Call with comprehensive error handling
   */
  const startCall = useCallback(
    async (appointmentId: string): Promise<VideoTokenResponse> => {
      try {
        console.log('🚀 Starting video call...');
        
        const tokenData = await getVideoToken(appointmentId);
        
        callStartTime.current = Date.now();
        setCallActive(true);
        
        console.log('✅ Call started successfully');
        
        return tokenData;
      } catch (error: any) {
        console.error('❌ Failed to start call:', error);
        
        // If it's already a parsed error, just rethrow
        if (error.type) {
          throw error;
        }
        
        // Otherwise parse it
        const parsedError = parseError(error);
        setError(parsedError);
        throw parsedError;
      }
    },
    [getVideoToken, parseError]
  );

  /** 
   * Start call with user-friendly error handling and retry prompt
   */
  const startCallWithErrorHandling = useCallback(
    async (appointmentId: string): Promise<VideoTokenResponse | null> => {
      try {
        return await startCall(appointmentId);
      } catch (error: any) {
        const parsedError = error.type ? error : parseError(error);
        
        // Show error alert with retry option
        showErrorAlert(parsedError, () => {
          isRetrying.current = true;
          startCallWithErrorHandling(appointmentId).finally(() => {
            isRetrying.current = false;
          });
        });
        
        return null;
      }
    },
    [startCall, parseError, showErrorAlert]
  );

  /** 
   * End call and notify backend
   */
  const endCall = useCallback(
    async (appointmentId: string, notes?: string) => {
      try {
        console.log('🔴 Ending video call...');
        
        setCallActive(false);
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        
        if (!token) {
          console.warn('No auth token found, skipping backend notification');
          return;
        }

        const duration = callStartTime.current 
          ? Math.floor((Date.now() - callStartTime.current) / 1000) 
          : 0;

        await axios.post(
          `${API_URL}/end-call`,
          { appointmentId, callDuration: duration, notes },
          { 
            headers: { 
              Authorization: `Bearer ${token}`, 
              "Content-Type": "application/json" 
            }, 
            timeout: 10000 
          }
        );
        
        console.log(`✅ Call ended successfully (duration: ${duration}s)`);
        
        callStartTime.current = null;
        setCallData(null);
        setError(null);
        
      } catch (err: any) {
        console.warn("⚠️ Failed to notify backend about call end:", err.message);
        // Don't throw - ending call should always succeed on client side
      }
    },
    []
  );

  /** 
   * Get call status
   */
 const getCallStatus = useCallback(
    async (appointmentId: string) => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) throw new Error("Authentication required");

        const response = await axios.get(
          `${API_URL}/call-status/${appointmentId}`, 
          { 
            headers: { Authorization: `Bearer ${token}` }, 
            timeout: 10000 
          }
        );
        
return {
        success: true,
        data: response.data, 
        message: 'Call status fetched'
    };      } catch (error: any) {
        console.error('Failed to get call status:', error);
        const parsedError = parseError(error);
        throw parsedError;
      }
    }, 
    [parseError]
  );

  /** 
   * Report call issues
   */
  const reportCallIssue = useCallback(
    async (appointmentId: string, issueType: CallIssueType, description?: string) => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) throw new Error("Authentication required");

        await axios.post(
          `${API_URL}/report-issue`,
          { appointmentId, issueType, description },
          { 
            headers: { 
              Authorization: `Bearer ${token}`, 
              "Content-Type": "application/json" 
            }, 
            timeout: 10000 
          }
        );
        
        console.log("⚠️ Call issue reported:", issueType, description);
      } catch (err: any) {
        console.warn("Failed to report call issue:", err.message);
        // Don't throw - reporting is best-effort
      }
    },
    []
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setCallActive(false);
    setCallData(null);
    setError(null);
    callStartTime.current = null;
  }, []);

  return { 
    loading, 
    callActive, 
    callData, 
    error,
    getVideoToken, 
    startCall,
    startCallWithErrorHandling, // New: handles errors automatically
    endCall, 
    getCallStatus, 
    reportCallIssue,
    clearError,
    reset,
  };
};