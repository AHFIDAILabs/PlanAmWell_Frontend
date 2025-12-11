import { useState, useCallback, useRef } from "react";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY } from "../services/Auth";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const API_URL = `${SERVER_URL}/api/v1/video`;

export interface VideoTokenResponse {
  token: string;
  channelName: string;
  uid: number;
  appId: string;
  expiresAt: string;
}

export const useVideoCall = () => {
  const [loading, setLoading] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callData, setCallData] = useState<VideoTokenResponse | null>(null);
  const callStartTime = useRef<number | null>(null);

  /** Fetch Agora RTC Token */
  const getVideoToken = useCallback(async (appointmentId: string): Promise<VideoTokenResponse> => {
    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync(TOKEN_KEY);

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.post(
        `${API_URL}/token`,
        { appointmentId },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000, // 10 second timeout
        }
      );

      if (!response.data?.data) {
        throw new Error('Invalid response from server');
      }

      const data: VideoTokenResponse = response.data.data;
      setCallData(data);

      return data;
    } catch (error: any) {
      console.error("❌ Failed to get video token:", error);
      
      // Better error messages
      if (error.response?.status === 403) {
        throw new Error('You are not authorized to join this call');
      } else if (error.response?.status === 404) {
        throw new Error('Appointment not found');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Connection timeout. Please check your internet.');
      } else {
        throw new Error('Failed to connect to video service');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /** Start Call */
  const startCall = useCallback(
    async (appointmentId: string): Promise<VideoTokenResponse> => {
      const tokenData = await getVideoToken(appointmentId);

      callStartTime.current = Date.now();
      setCallActive(true);

      return tokenData;
    },
    [getVideoToken]
  );

  /** End call and notify backend */
  const endCall = useCallback(async (appointmentId: string, notes?: string) => {
    try {
      setCallActive(false);

      const token = await SecureStore.getItemAsync(TOKEN_KEY);

      if (!token) {
        console.warn('No auth token found when ending call');
        return;
      }

      const duration = callStartTime.current
        ? Math.floor((Date.now() - callStartTime.current) / 1000)
        : 0;

      await axios.post(
        `${API_URL}/end-call`,
        { 
          appointmentId, 
          callDuration: duration, 
          notes 
        },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }
      );

      callStartTime.current = null;
      setCallData(null);
    } catch (error: any) {
      console.error('Error ending call:', error);
      // Don't throw - call already ended on client side
    }
  }, []);

  return {
    loading,
    callActive,
    callData,
    getVideoToken,
    startCall,
    endCall,
  };
};
