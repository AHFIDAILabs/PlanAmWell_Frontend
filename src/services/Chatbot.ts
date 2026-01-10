import axios from 'axios';
import { IProduct } from '../types/backendType';

const API_URL = process.env.EXPO_PUBLIC_SERVER_URL;

export interface ChatbotMessage {
    message?: string;
    userId?: string;
    sessionId?: string;
    file?: { uri: string; type: string; name: string }; // for voice messages
}

export interface ChatbotResponse {
    success: boolean;
    response: string;
    intent: 'buy' | 'info' | 'appointment' | 'general' | 'greeting' | 'health';
    products: IProduct[];
    sessionId: string;
    audioUrl?: string; // optional: URL for bot audio playback
}

export interface ConversationHistory {
    success: boolean;
    conversation: {
        _id: string;
        userId: string | null;
        sessionId: string;
        messages: Array<{
            sender: 'user' | 'bot';
            text: string;
            products?: IProduct[];
            intent?: string;
            timestamp: Date;
            audioUrl?: string;
        }>;
        isActive: boolean;
        lastActivity: Date;
    };
}

export const chatbotService = {
    // Send message (text or audio)
    sendMessage: async (data: ChatbotMessage): Promise<ChatbotResponse> => {
        try {
            let response;
            if (data.file) {
                // Send as multipart/form-data
                const formData = new FormData();
                formData.append('file', {
                    uri: data.file.uri,
                    name: data.file.name,
                    type: data.file.type,
                } as any);
                if (data.userId) formData.append('userId', data.userId);
                if (data.sessionId) formData.append('sessionId', data.sessionId);

                response = await axios.post(`${API_URL}/api/v1/chatbot/message`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                // Send as JSON
                response = await axios.post(`${API_URL}/api/v1/chatbot/message`, data);
            }

            return response.data;
        } catch (error: any) {
            console.error('Error sending message to chatbot:', error.response?.data || error.message);
            throw error;
        }
    },

    // Get conversation history
 // In chatbot service
getConversationHistory: async (sessionId: string, userId?: string): Promise<ConversationHistory> => {
    try {
        const params = userId ? `?userId=${userId}` : '';
        const response = await axios.get(
            `${API_URL}/api/v1/chatbot/conversation/${sessionId}${params}`
        );
        return response.data;
    } catch (error: any) {
        console.error('Error fetching conversation history:', error.response?.data || error.message);
        throw error;
    }
},

    // Clear conversation
    clearConversation: async (sessionId: string): Promise<{ success: boolean; message: string }> => {
        try {
            const response = await axios.delete(`${API_URL}/api/v1/chatbot/conversation/${sessionId}`);
            return response.data;
        } catch (error: any) {
            console.error('Error clearing conversation:', error.response?.data || error.message);
            throw error;
        }
    },

    // Get user conversations (authenticated)
    getUserConversations: async (userId: string, token: string): Promise<any> => {
        try {
            const response = await axios.get(`${API_URL}/api/v1/chatbot/conversations/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (error: any) {
            console.error('Error fetching user conversations:', error.response?.data || error.message);
            throw error;
        }
    },
};
