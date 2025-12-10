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
    intent?: 'buy' | 'info' | 'appointment' | 'general' | 'greeting';
    timestamp: Date;
}


const OPENAI_WHISPER_KEY = process.env.EXPO_PUBLIC_WHISPER_API_KEY || "";
const WHISPER_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
const CHAT_SESSION_STORAGE_KEY = "chatbot_session_id";


export const useChatBot = (userId?: string, authSessionId?: string | null) => {
    const [messages, setMessages] = useState<Message[]>([
        { 
            id: "1", 
            text: "Hello! I'm Ask AmWell, your confidential health assistant. I can help you find services, products, and doctors - and you can book or order directly through our chat!\n\n💡 Tip: Click the speaker icon (🔊) below to have my responses read aloud to you!\n\nHow can I help you today?", 
            sender: "bot",
            timestamp: new Date()
        },
    ]);
    const [input, setInput] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isBotThinking, setIsBotThinking] = useState(false);
    const [chatSessionId, setChatSessionId] = useState<string | null>(null);
    const recordingRef = useRef<Audio.Recording | null>(null);
    
    // ✅ ADD: Refs to prevent duplicate API calls
    const hasLoadedHistory = useRef(false);
    const isInitializing = useRef(false);

    // Initialize session
    useEffect(() => {
        const initSession = async () => {
            // ✅ PREVENT duplicate initialization
            if (isInitializing.current) {
                console.log('⏭️ Skipping duplicate initialization');
                return;
            }
            
            isInitializing.current = true;
            
            try {
                let sessionToUse: string | null = null;

                if (userId) {
                    // Registered user: use userId directly
                    sessionToUse = `chat_${userId}`;
                } else if (authSessionId) {
                    sessionToUse = authSessionId;
                } else {
                    // Guest user
                    let storedSession = await SecureStore.getItemAsync(CHAT_SESSION_STORAGE_KEY);
                    if (!storedSession) {
                        storedSession = `guest_chat_${Date.now()}`;
                        await SecureStore.setItemAsync(CHAT_SESSION_STORAGE_KEY, storedSession);
                    }
                    sessionToUse = storedSession;
                }

                console.log('🔑 Session ID:', sessionToUse);
                
                // ✅ Only update if session changed
                if (sessionToUse !== chatSessionId) {
                    setChatSessionId(sessionToUse);
                }

                // ✅ Load conversation history only once
                if (sessionToUse && !hasLoadedHistory.current) {
                    try {
                        console.log('📡 Fetching conversation history...');
                        const history = await chatbotService.getConversationHistory(sessionToUse);
                        
                        if (history.success && history.conversation?.messages?.length > 0) {
                            const loadedMessages: Message[] = history.conversation.messages.map((msg, idx) => ({
                                id: `${idx}_${Date.now()}`,
                                text: msg.text,
                                sender: msg.sender,
                                products: msg.products,
                                intent: msg.intent as any,
                                timestamp: new Date(msg.timestamp),
                            }));
                            
                            console.log(`✅ Loaded ${loadedMessages.length} previous messages`);
                            setMessages(loadedMessages);
                            hasLoadedHistory.current = true;
                        } else {
                            console.log('📝 No previous messages, starting fresh');
                        }
                    } catch (err: any) {
                        if (err.response?.status === 404 || err.message?.includes("Conversation not found")) {
                            console.log('📝 No previous conversation found');
                        } else {
                            console.error('❌ Error fetching conversation history:', err.message);
                        }
                    }
                }

            } catch (error) {
                console.error('❌ Error initializing session:', error);
            } finally {
                // ✅ Reset after a short delay to prevent rapid re-initialization
                setTimeout(() => {
                    isInitializing.current = false;
                }, 500);
            }
        };

        initSession();
    }, [userId, authSessionId]);

    // Request Microphone Permission
    useEffect(() => {
        (async () => {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== "granted") {
                Toast.show({
                    type: 'info',
                    text1: 'Permission Required',
                    text2: 'Microphone access is needed for voice chat.',
                });
            }
        })();
    }, []);


    const sendMessage = useCallback(async (voiceInput: string | null = null) => {
        const messageContent = voiceInput || input;
        if (!messageContent.trim() || isBotThinking) return;

        const userMessage: Message = { 
            id: Date.now().toString(), 
            text: messageContent, 
            sender: "user",
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        if (!voiceInput) setInput("");

        setIsBotThinking(true);

        try {
            const response = await chatbotService.sendMessage({
                message: messageContent,
                userId,
                sessionId: chatSessionId || undefined
            });

            if (response.sessionId && response.sessionId !== chatSessionId) {
                setChatSessionId(response.sessionId);
                if (!userId && !authSessionId) {
                    await SecureStore.setItemAsync(CHAT_SESSION_STORAGE_KEY, response.sessionId);
                }
            }

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: response.response,
                sender: "bot",
                products: response.products.length > 0 ? response.products : undefined,
                intent: response.intent,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (err: any) {
            console.error("Chat API Error:", err);
            Toast.show({ 
                type: 'error', 
                text1: 'Chat Error', 
                text2: err.message || "Failed to get response." 
            });

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I couldn't process your request. Please try again.",
                sender: "bot",
                timestamp: new Date()
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsBotThinking(false);
            if (!voiceInput) setInput("");
        }
    }, [input, isBotThinking, userId, chatSessionId, authSessionId]);


    const startRecording = async () => {
        try {
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            recordingRef.current = newRecording;
            setIsRecording(true);
            setInput("Recording...");
        } catch (err) {
            console.error("Failed to start recording:", err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to start microphone.' });
            setIsRecording(false);
            setInput("");
        }
    };

    const stopRecording = async () => {
        setIsRecording(false);
        setInput("Transcribing...");

        const currentRecording = recordingRef.current;
        if (!currentRecording) return;

        const uri = currentRecording.getURI();
        let transcribedText = "";

        try {
            await currentRecording.stopAndUnloadAsync();

            if (!uri) throw new Error("Recording URI is null.");
            if (!OPENAI_WHISPER_KEY) throw new Error("Whisper API Key is missing.");

            const formData = new FormData();
            formData.append('file', { uri, name: uri.split('/').pop() || 'recording.m4a', type: 'audio/m4a' } as any);
            formData.append('model', 'whisper-1');

            const response = await fetch(WHISPER_ENDPOINT, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${OPENAI_WHISPER_KEY}` },
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Transcription failed: ${response.status}. Body: ${errorText.substring(0, 100)}`);
            }

            const data = await response.json();
            transcribedText = data.text || '';
            setInput(transcribedText);

            if (transcribedText.trim()) {
                await sendMessage(transcribedText);
            } else {
                setInput("");
            }

        } catch (err: any) {
            console.error("Transcription Error:", err);
            Toast.show({ type: 'error', text1: 'Transcription Failed', text2: err.message || "Could not process audio." });
            setInput("");
        } finally {
            if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
            recordingRef.current = null;
        }
    };

    const handleMicPress = () => {
        if (isRecording) stopRecording();
        else startRecording();
    };

    // Clear chat history
    const clearChat = useCallback(async () => {
        try {
            if (chatSessionId) {
                await chatbotService.clearConversation(chatSessionId);
                if (!userId && !authSessionId) {
                    await SecureStore.deleteItemAsync(CHAT_SESSION_STORAGE_KEY);
                }
            }

            setMessages([
                { 
                    id: "1", 
                    text: "Hello! I'm Ask AmWell, your confidential health assistant. How can I help you today?", 
                    sender: "bot", 
                    timestamp: new Date() 
                },
            ]);

            setChatSessionId(null);
            hasLoadedHistory.current = false; // ✅ Reset history flag

            Toast.show({ 
                type: 'success', 
                text1: 'Chat Cleared', 
                text2: 'Your conversation has been cleared.' 
            });
        } catch (error) {
            console.error('Error clearing chat:', error);
            Toast.show({ 
                type: 'error', 
                text1: 'Error', 
                text2: 'Failed to clear conversation.' 
            });
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