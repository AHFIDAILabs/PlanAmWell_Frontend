import { useState, useRef, useEffect, useCallback } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import Toast from 'react-native-toast-message';
import * as SecureStore from 'expo-secure-store';
import { chatbotService } from "../services/Chatbot";
import { IProduct } from "../types/backendType";

// --- Types ---
export interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    products?: IProduct[];
    intent?: 'buy' | 'info' | 'appointment' | 'general' | 'greeting' | 'health';
    timestamp: Date;
    audioUrl?: string;  // URL from backend Cloudinary
}

const CHAT_SESSION_STORAGE_KEY = "chatbot_session_id";

export const useChatBot = (userId?: string, authSessionId?: string | null) => {
    const [messages, setMessages] = useState<Message[]>([
        { 
            id: "1", 
            text: "Hello! I'm Ask AmWell, your confidential health assistant. How can I help you today?", 
            sender: "bot",
            timestamp: new Date()
        },
    ]);
    const [input, setInput] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isBotThinking, setIsBotThinking] = useState(false);
    const [chatSessionId, setChatSessionId] = useState<string | null>(null);
    const recordingRef = useRef<Audio.Recording | null>(null);
    
    const hasLoadedHistory = useRef(false);
    const isInitializing = useRef(false);

    // Initialize session & load history
    useEffect(() => {
        const initSession = async () => {
            if (isInitializing.current) return;
            isInitializing.current = true;

            try {
                let sessionToUse: string | null = null;

                if (userId) sessionToUse = `chat_${userId}`;
                else if (authSessionId) sessionToUse = authSessionId;
                else {
                    let stored = await SecureStore.getItemAsync(CHAT_SESSION_STORAGE_KEY);
                    if (!stored) {
                        stored = `guest_chat_${Date.now()}`;
                        await SecureStore.setItemAsync(CHAT_SESSION_STORAGE_KEY, stored);
                    }
                    sessionToUse = stored;
                }

                if (sessionToUse !== chatSessionId) setChatSessionId(sessionToUse);

                if (sessionToUse && !hasLoadedHistory.current) {
                    const history = await chatbotService.getConversationHistory(sessionToUse);
                    if (history.success && history.conversation?.messages?.length) {
                       // Inside the initSession / history mapping:
const loaded: Message[] = history.conversation.messages.map((msg, idx) => ({
    id: `${idx}_${Date.now()}`,
    text: msg.text,
    sender: msg.sender,
    products: msg.products,
    intent: msg.intent as any,
    // Fix: Match the backend audio object structure
    audioUrl: msg.audioUrl, 
    timestamp: new Date(msg.timestamp),
}));
                        setMessages(loaded);
                        hasLoadedHistory.current = true;
                    }
                }

            } catch (err) {
                console.error('❌ Error initializing session:', err);
            } finally {
                setTimeout(() => { isInitializing.current = false; }, 500);
            }
        };

        initSession();
    }, [userId, authSessionId]);

    // Request microphone permission
    useEffect(() => {
        (async () => {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== "granted") {
                Toast.show({ type: 'info', text1: 'Permission Required', text2: 'Microphone access is needed for voice chat.' });
            }
        })();
    }, []);

    // Send text or voice message
    const sendMessage = useCallback(async (voiceFile?: { uri: string, type: string, name: string }) => {
        const messageContent = voiceFile ? '' : input;
        if ((!messageContent && !voiceFile) || isBotThinking) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: messageContent || "Voice message",
            sender: "user",
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        if (!voiceFile) setInput("");

        setIsBotThinking(true);
        try {
            const payload: any = { userId, sessionId: chatSessionId || undefined };
            if (voiceFile) payload.file = voiceFile;
            else payload.message = messageContent;

            const response = await chatbotService.sendMessage(payload);

            if (response.sessionId && response.sessionId !== chatSessionId) {
                setChatSessionId(response.sessionId);
                if (!userId && !authSessionId) await SecureStore.setItemAsync(CHAT_SESSION_STORAGE_KEY, response.sessionId);
            }

            const botMessage: Message = {
    id: (Date.now() + 1).toString(),
    text: response.response,
    sender: "bot",
    products: response.products.length ? response.products : undefined,
    intent: response.intent,
    // Fix: Match the backend audio object structure
    audioUrl: response.audioUrl, 
    timestamp: new Date()
};
            setMessages(prev => [...prev, botMessage]);

        } catch (err: any) {
            console.error("Chat API Error:", err);
            Toast.show({ type: 'error', text1: 'Chat Error', text2: err.message || "Failed to get response." });
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I couldn't process your request.",
                sender: "bot",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsBotThinking(false);
            if (!voiceFile) setInput("");
        }
    }, [input, isBotThinking, chatSessionId, userId, authSessionId]);

// 1. Add a cleanup function to ensure no stale recording exists
const cleanupRecording = async () => {
    try {
        if (recordingRef.current) {
            // Check if it's still recording before stopping
            const status = await recordingRef.current.getStatusAsync();
            if (status.canRecord) {
                await recordingRef.current.stopAndUnloadAsync();
            }
            recordingRef.current = null;
        }
    } catch (err) {
        console.error("Cleanup error:", err);
    }
};

const startRecording = async () => {
    try {
        // ALWAYS cleanup before starting a new one
        await cleanupRecording();

        await Audio.setAudioModeAsync({ 
            allowsRecordingIOS: true, 
            playsInSilentModeIOS: true 
        });

        const recordingOptions = {
            android: {
                extension: '.m4a',
                outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                audioEncoder: Audio.AndroidAudioEncoder.AAC,
                sampleRate: 16000,
                numberOfChannels: 1,
                bitRate: 64000,
            },
            ios: {
                extension: '.m4a',
                audioQuality: Audio.IOSAudioQuality.LOW,
                sampleRate: 16000,
                numberOfChannels: 1,
                bitRate: 64000,
                linearPCMBitDepth: 16,
                linearPCMIsBigEndian: false,
                linearPCMIsFloat: false,
            },
            web: {}
        };

        const { recording } = await Audio.Recording.createAsync(recordingOptions);
        recordingRef.current = recording;
        setIsRecording(true);
        setInput("Recording...");
    } catch (err) {
        console.error("Failed to start recording:", err);
        Toast.show({ type: 'error', text1: 'Mic Error', text2: 'Please try again.' });
        setIsRecording(false);
        setInput("");
    }
};

const stopRecording = async () => {
    setIsRecording(false);
    const recording = recordingRef.current;
    if (!recording) return;

    setInput("Transcribing...");
    try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        
        // Clear the ref immediately after unloading
        recordingRef.current = null;

        if (!uri) throw new Error("Recording URI is null.");

        const fileInfo = { 
            uri, 
            type: 'audio/m4a', 
            name: uri.split('/').pop() || 'voice.m4a' 
        };
        
        await sendMessage(fileInfo);
    } catch (err: any) {
        console.error("Recording error:", err);
        Toast.show({ type: 'error', text1: 'Failed', text2: "Could not process audio." });
    } finally {
        recordingRef.current = null;
        setInput("");
    }
};

    const handleMicPress = () => { if (isRecording) stopRecording(); else startRecording(); };

    const clearChat = useCallback(async () => {
        try {
            if (chatSessionId) await chatbotService.clearConversation(chatSessionId);
            if (!userId && !authSessionId) await SecureStore.deleteItemAsync(CHAT_SESSION_STORAGE_KEY);
            setMessages([{ id: "1", text: "Hello! I'm Ask AmWell, your confidential health assistant. How can I help you today?", sender: "bot", timestamp: new Date() }]);
            setChatSessionId(null);
            hasLoadedHistory.current = false;
            Toast.show({ type: 'success', text1: 'Chat Cleared', text2: 'Your conversation has been cleared.' });
        } catch (err) {
            console.error('Error clearing chat:', err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to clear conversation.' });
        }
    }, [chatSessionId, userId, authSessionId]);

    return {
        messages,
        input,
        setInput,
        sendMessage,
        isRecording,
        isBotThinking,
        handleMicPress,
        clearChat,
        sessionId: chatSessionId,
        MicIcon: isRecording ? "mic-off" : "mic" as const,
        MicColor: isRecording ? "#f00" : "#D81E5B"
    };
};
