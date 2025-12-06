import axios from 'axios';
import { IProduct } from '../types/backendType';

const API_URL = process.env.EXPO_PUBLIC_SERVER_URL;

export interface ChatbotMessage {
    message: string;
    userId?: string;
    sessionId?: string;
}

export interface ChatbotResponse {
    success: boolean;
    response: string;
    intent: 'buy' | 'info' | 'appointment' | 'general' | 'greeting';
    products: IProduct[];
    sessionId: string;
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
        }>;
        isActive: boolean;
        lastActivity: Date;
    };
}

export const chatbotService = {
    // Send message to chatbot
    sendMessage: async (data: ChatbotMessage): Promise<ChatbotResponse> => {
        try {
            const response = await axios.post(`${API_URL}/api/v1/chatbot/message`, data);
            return response.data;
        } catch (error: any) {
            console.error('Error sending message to chatbot:', error.response?.data || error.message);
            throw error;
        }
    },

    // Get conversation history
    getConversationHistory: async (sessionId: string): Promise<ConversationHistory> => {
        try {
            const response = await axios.get(`${API_URL}/api/v1/chatbot/conversation/${sessionId}`);
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

    // Get user conversations (authenticated users only)
    getUserConversations: async (userId: string, token: string): Promise<any> => {
        try {
            const response = await axios.get(`${API_URL}/api/v1/chatbot/conversations/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error: any) {
            console.error('Error fetching user conversations:', error.response?.data || error.message);
            throw error;
        }
    }
};