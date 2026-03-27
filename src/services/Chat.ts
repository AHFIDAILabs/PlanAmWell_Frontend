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
    if (response.data.success) return response.data.data;
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
    if (response.data.success) return response.data.data;
    return [];
  } catch (error: any) {
    console.error("[Chat] Failed to get conversations:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Send a message (text, image, or document)
 */
export const sendMessage = async (
  conversationId: string,
  content: string,
  messageType: "text" | "image" | "audio" | "document" = "text",
  mediaUrl?: string
): Promise<IMessage | null> => {
  try {
    const response = await axios.post(
      `${BASE_URL}/conversation/${conversationId}/message`,
      { content, messageType, mediaUrl }
    );
    if (response.data.success) return response.data.data;
    return null;
  } catch (error: any) {
    console.error("[Chat] Failed to send message:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Upload a file (image or document) to the chat media endpoint.
 * Uses the same axios instance so auth headers are automatically included.
 * Returns { url, fileType, fileName, mimeType } or null on failure.
 */
export const uploadChatFile = async (
  uri: string,
  mimeType: string,
  fileName: string
): Promise<{ url: string; fileType: "image" | "document"; fileName: string; mimeType: string } | null> => {
  try {
    // Build FormData — React Native's fetch/axios handles the file blob from a URI natively
    const formData = new FormData();
    formData.append("file", {
      uri,
      type: mimeType,
      name: fileName,
    } as any);

    // Use the shared axios instance so the Authorization header is included automatically
    const response = await axios.post(`${BASE_URL}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      // Give uploads more time than regular API calls
      timeout: 60000,
    });

    if (response.data.success) return response.data.data;
    return null;
  } catch (error: any) {
    console.error("[Chat] Upload failed:", error.response?.data || error.message);
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
      { params: { page, limit } }
    );
    if (response.data.success) return response.data.data;
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
    const response = await axios.post(`${BASE_URL}/conversation/${conversationId}/read`);
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
    await axios.post(`${BASE_URL}/conversation/${conversationId}/typing`, { isTyping });
  } catch (error: any) {
    // Non-critical — don't throw
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
    const response = await axios.post(`${BASE_URL}/conversation/${conversationId}/video-request`);
    if (response.data.success) return response.data.data;
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
    if (response.data.success) return response.data.data;
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

export const unlockConversation = async (conversationId: string): Promise<boolean> => {
  const response = await axios.patch(`${BASE_URL}/conversation/${conversationId}/unlock`);
  return response.data.success;
};