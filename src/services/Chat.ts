// services/Chat.ts
import axios from "axios";
import { IConversation, IMessage, IVideoCallRequest } from "../types/backendType";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const BASE_URL = `${SERVER_URL}/api/v1/chat`;

/**
 * Get or create conversation for an appointment
 */
export const getOrCreateConversation = async (
  appointmentId: string
): Promise<IConversation | null> => {
  try {
    const response = await axios.get(`${BASE_URL}/conversation/${appointmentId}`);
    
    if (response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error: any) {
    console.error("[Chat] Failed to get conversation:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get all conversations for current user
 */
export const getUserConversations = async (): Promise<IConversation[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/conversations`);
    
    if (response.data.success) {
      return response.data.data;
    }
    return [];
  } catch (error: any) {
    console.error("[Chat] Failed to get conversations:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Send a message
 */
export const sendMessage = async (
  conversationId: string,
  content: string,
  messageType: "text" | "image" | "audio" = "text",
  mediaUrl?: string
): Promise<IMessage | null> => {
  try {
    const response = await axios.post(
      `${BASE_URL}/conversation/${conversationId}/message`,
      {
        content,
        messageType,
        mediaUrl,
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error: any) {
    console.error("[Chat] Failed to send message:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get messages (paginated)
 */
export const getMessages = async (
  conversationId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: IMessage[]; total: number; hasMore: boolean } | null> => {
  try {
    const response = await axios.get(
      `${BASE_URL}/conversation/${conversationId}/messages`,
      {
        params: { page, limit },
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error: any) {
    console.error("[Chat] Failed to get messages:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (conversationId: string): Promise<boolean> => {
  try {
    const response = await axios.post(
      `${BASE_URL}/conversation/${conversationId}/read`
    );
    
    return response.data.success;
  } catch (error: any) {
    console.error("[Chat] Failed to mark as read:", error.response?.data || error.message);
    return false;
  }
};

/**
 * Update typing indicator
 */
export const updateTypingIndicator = async (
  conversationId: string,
  isTyping: boolean
): Promise<void> => {
  try {
    await axios.post(`${BASE_URL}/conversation/${conversationId}/typing`, {
      isTyping,
    });
  } catch (error: any) {
    console.error("[Chat] Failed to update typing:", error.response?.data || error.message);
  }
};

/**
 * Request video call
 */
export const requestVideoCall = async (
  conversationId: string
): Promise<IVideoCallRequest | null> => {
  try {
    const response = await axios.post(
      `${BASE_URL}/conversation/${conversationId}/video-request`
    );
    
    if (response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error: any) {
    console.error("[Chat] Failed to request video call:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Respond to video call request
 */
export const respondToVideoCall = async (
  conversationId: string,
  requestId: string,
  accept: boolean
): Promise<{ accepted: boolean; appointmentId: string } | null> => {
  try {
    const response = await axios.post(
      `${BASE_URL}/conversation/${conversationId}/video-request/${requestId}/respond`,
      { accept }
    );
    
    if (response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error: any) {
    console.error("[Chat] Failed to respond to video call:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Cancel video call request
 */
export const cancelVideoCallRequest = async (
  conversationId: string,
  requestId: string
): Promise<boolean> => {
  try {
    const response = await axios.delete(
      `${BASE_URL}/conversation/${conversationId}/video-request/${requestId}`
    );
    
    return response.data.success;
  } catch (error: any) {
    console.error("[Chat] Failed to cancel video call:", error.response?.data || error.message);
    return false;
  }
};