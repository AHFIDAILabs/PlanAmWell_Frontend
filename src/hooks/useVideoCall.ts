// hooks/useVideoCall.ts
import { useCallback, useRef } from "react";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY } from "../services/Auth";

// RTCIceServer is a plain object type — no import from react-native-webrtc needed
interface RTCIceServer {
  urls:        string | string[];
  username?:   string;
  credential?: string;
}

const API_URL = `${process.env.EXPO_PUBLIC_SERVER_URL}/api/v1/video`;

// ── Public types ─────────────────────────────────────────────────────────────

export interface VideoTokenResponse {
  channelName:      string;
  callStatus:       string;
  callType:         "audio" | "video";
  isInitiator:      boolean;
  doctorName:       string;
  patientName:      string;
  participantCount?: number;
}

export type CallIssueType = "audio" | "video" | "network" | "other";

// ── Internal helpers ─────────────────────────────────────────────────────────

const getAuthHeader = async (): Promise<{ Authorization: string }> => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw new Error("Authentication token not found. Please log in again.");
  return { Authorization: `Bearer ${token}` };
};

const extractErrorMessage = (err: any): string => {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (msg) return msg;
    if (!err.response) return "Cannot reach server. Check your internet connection.";
    if (err.response.status === 401 || err.response.status === 403)
      return "Session expired. Please log in again.";
    if (err.response.status === 400)
      return err.response.data?.message || "Invalid request.";
  }
  return err?.message || "An unexpected error occurred.";
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useVideoCall = () => {
  const callStartTime = useRef<number | null>(null);

  /**
   * Register with the backend and get call session data.
   * Called by BOTH the initiator (before ringing) and the receiver (on accept).
   * Throws a human-readable string on failure — caller must handle it.
   */
  const startCall = useCallback(
    async (appointmentId: string, callType: "audio" | "video" = "video"): Promise<VideoTokenResponse> => {
      console.log(`🎥 startCall → appointment ${appointmentId} (${callType})`);
      const headers = await getAuthHeader();

      const response = await axios.post(
        `${API_URL}/token`,
        { appointmentId, callType },
        { headers: { ...headers, "Content-Type": "application/json" }, timeout: 15000 }
      );

      if (!response.data?.success || !response.data?.data) {
        throw new Error("Invalid response from video service");
      }

      const data: VideoTokenResponse = response.data.data;
      callStartTime.current = Date.now();

      console.log(`✅ Call session ready — channel: ${data.channelName}, initiator: ${data.isInitiator}`);
      return data;
    },
    []
  );

  /**
   * Notify the backend that the call has ended.
   * Never throws — ending should always succeed on the client side.
   */
  const endCall = useCallback(async (appointmentId: string): Promise<void> => {
    try {
      console.log(`🔴 endCall → appointment ${appointmentId}`);
      const headers = await getAuthHeader();

      const duration = callStartTime.current
        ? Math.floor((Date.now() - callStartTime.current) / 1000)
        : 0;

      await axios.post(
        `${API_URL}/end-call`,
        { appointmentId, callDuration: duration },
        { headers: { ...headers, "Content-Type": "application/json" }, timeout: 10000 }
      );

      callStartTime.current = null;
      console.log(`✅ endCall confirmed (duration: ${duration}s)`);
    } catch (err: any) {
      console.warn("⚠️ endCall notification failed (non-fatal):", err.message);
    }
  }, []);

  /**
   * Decline a ringing appointment-based call.
   * Never throws.
   */
  const declineCall = useCallback(async (appointmentId: string): Promise<void> => {
    try {
      const headers = await getAuthHeader();
      await axios.post(
        `${API_URL}/decline`,
        { appointmentId },
        { headers: { ...headers, "Content-Type": "application/json" }, timeout: 8000 }
      );
      console.log(`📵 declineCall sent for appointment ${appointmentId}`);
    } catch (err: any) {
      console.warn("⚠️ declineCall failed (non-fatal):", err.message);
    }
  }, []);

  /**
   * Fetch ICE server config from the backend.
   * Falls back to hardcoded defaults if the server is unreachable so calls
   * still work even if this request times out.
   */
  const getIceServers = useCallback(async (): Promise<RTCIceServer[]> => {
    const fallback: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls:       'turn:openrelay.metered.ca:80',
        username:   'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls:       'turn:openrelay.metered.ca:443',
        username:   'openrelayproject',
        credential: 'openrelayproject',
      },
    ];

    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_URL}/ice-servers`, {
        headers,
        timeout: 5000,
      });
      const servers = response.data?.data?.iceServers;
      if (Array.isArray(servers) && servers.length > 0) {
        console.log(`✅ ICE servers fetched from backend (${servers.length} entries)`);
        return servers;
      }
    } catch (err: any) {
      console.warn('⚠️ Could not fetch ICE servers from backend, using fallback:', err.message);
    }

    return fallback;
  }, []);

  /**
   * Fetch current call status.
   * Returns a safe default on error — never throws.
   */
  const getCallStatus = useCallback(async (appointmentId: string) => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(
        `${API_URL}/call-status/${appointmentId}`,
        { headers, timeout: 10000 }
      );
      return response.data;
    } catch (err: any) {
      console.warn("⚠️ getCallStatus failed:", err.message);
      return { success: false, data: { callStatus: "idle", isActive: false } };
    }
  }, []);

  /**
   * Report a technical issue. Best-effort, never throws.
   */
  const reportCallIssue = useCallback(
    async (appointmentId: string, issueType: CallIssueType, description?: string) => {
      try {
        const headers = await getAuthHeader();
        await axios.post(
          `${API_URL}/report-issue`,
          { appointmentId, issueType, description },
          { headers: { ...headers, "Content-Type": "application/json" }, timeout: 10000 }
        );
      } catch (err: any) {
        console.warn("⚠️ reportCallIssue failed (non-fatal):", err.message);
      }
    },
    []
  );

  return {
    startCall,
    endCall,
    declineCall,
    getCallStatus,
    getIceServers,
    reportCallIssue,
    extractErrorMessage,
  };
};
