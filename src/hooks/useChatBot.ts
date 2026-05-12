import { useState, useRef, useEffect, useCallback } from "react";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import Toast from "react-native-toast-message";
import * as SecureStore from "expo-secure-store";
import { chatbotService } from "../services/Chatbot";
import { IProduct } from "../types/backendType";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Message {
    id: string;
    text: string;
    sender: "user" | "bot";
    products?: IProduct[];
    intent?: "buy" | "info" | "appointment" | "general" | "greeting" | "health";
    timestamp: Date;
    audioUrl?: string;
    mediaUrl?: string;
    mediaType?: "image" | "document";
    mediaName?: string;
}

const CHAT_SESSION_STORAGE_KEY = "chatbot_session_id";

const WELCOME_MESSAGE: Message = {
    id: "1",
    text: "Hello! I'm Ask AmWell, your confidential health assistant. How can I help you today?",
    sender: "bot",
    timestamp: new Date(),
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useChatBot = (userId?: string, authSessionId?: string | null) => {
    const [messages, setMessages]       = useState<Message[]>([WELCOME_MESSAGE]);
    const [input, setInput]             = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isBotThinking, setIsBotThinking] = useState(false);
    const [chatSessionId, setChatSessionId] = useState<string | null>(null);

    // Stable refs — used inside event callbacks to avoid stale closures
    const isBotThinkingRef  = useRef(false);
    const chatSessionIdRef  = useRef<string | null>(null);
    const transcriptRef     = useRef("");
    const sendTextRef       = useRef<((text: string) => Promise<void>) | undefined>(undefined);

    const hasLoadedHistory  = useRef(false);
    const isInitializing    = useRef(false);

    useEffect(() => { isBotThinkingRef.current = isBotThinking; }, [isBotThinking]);
    useEffect(() => { chatSessionIdRef.current = chatSessionId;  }, [chatSessionId]);

    // ── Session init & history load ───────────────────────────────────────────
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

                if (sessionToUse !== chatSessionIdRef.current) {
                    setChatSessionId(sessionToUse);
                    chatSessionIdRef.current = sessionToUse;
                }

                if (sessionToUse && !hasLoadedHistory.current) {
                    const history = await chatbotService.getConversationHistory(sessionToUse, userId);
                    if (history.success && history.conversation?.messages?.length) {
                        const loaded: Message[] = history.conversation.messages.map((msg, idx) => ({
                            id: `${idx}_${Date.now()}`,
                            text: msg.text,
                            sender: msg.sender,
                            products: msg.products,
                            intent: msg.intent as any,
                            audioUrl: msg.audioUrl,
                            timestamp: new Date(msg.timestamp),
                        }));
                        setMessages(loaded);
                        hasLoadedHistory.current = true;
                    }
                }
            } catch (err) {
                console.error("❌ Error initializing chatbot session:", err);
            } finally {
                setTimeout(() => { isInitializing.current = false; }, 500);
            }
        };
        initSession();
    }, [userId, authSessionId]);

    // ── Core send (stable — uses refs, not captured state) ───────────────────
    const sendTextMessage = useCallback(async (text: string) => {
        if (!text.trim() || isBotThinkingRef.current) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text,
            sender: "user",
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        setIsBotThinking(true);
        isBotThinkingRef.current = true;

        try {
            const response = await chatbotService.sendMessage({
                message: text,
                userId,
                sessionId: chatSessionIdRef.current || undefined,
            });

            if (response.sessionId && response.sessionId !== chatSessionIdRef.current) {
                setChatSessionId(response.sessionId);
                chatSessionIdRef.current = response.sessionId;
                if (!userId && !authSessionId) {
                    await SecureStore.setItemAsync(CHAT_SESSION_STORAGE_KEY, response.sessionId);
                }
            }

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                text: response.response,
                sender: "bot",
                products: response.products?.length ? response.products : undefined,
                intent: response.intent,
                audioUrl: response.audioUrl,
                timestamp: new Date(),
            }]);
        } catch (err: any) {
            console.error("Chat API Error:", err);
            Toast.show({ type: "error", text1: "Chat Error", text2: err.message || "Failed to get response." });
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I couldn't process your request. Please try again.",
                sender: "bot",
                timestamp: new Date(),
            }]);
        } finally {
            setIsBotThinking(false);
            isBotThinkingRef.current = false;
        }
    }, [userId, authSessionId]);

    // Keep a ref to the latest sendTextMessage (for use in speech events)
    useEffect(() => { sendTextRef.current = sendTextMessage; }, [sendTextMessage]);

    // Public send — reads from input state
    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text) return;
        setInput("");
        await sendTextMessage(text);
    }, [input, sendTextMessage]);

    // ── Speech recognition events ─────────────────────────────────────────────
    useSpeechRecognitionEvent("result", (event) => {
        const transcript = event.results[0]?.transcript ?? "";
        transcriptRef.current = transcript;
        setInput(transcript);
    });

    useSpeechRecognitionEvent("end", async () => {
        setIsListening(false);
        const text = transcriptRef.current.trim();
        transcriptRef.current = "";
        setInput("");
        if (text) await sendTextRef.current?.(text);
    });

    useSpeechRecognitionEvent("error", (event) => {
        console.warn("⚠️ Speech error:", event.error, event.message);
        setIsListening(false);
        transcriptRef.current = "";
        setInput("");
        if (event.error !== "aborted" && event.error !== "no-speech") {
            Toast.show({ type: "error", text1: "Voice Error", text2: "Could not recognise speech. Please try again." });
        }
    });

    const startListening = async () => {
        try {
            const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!granted) {
                Toast.show({ type: "info", text1: "Permission Required", text2: "Microphone access is needed for voice input." });
                return;
            }
            transcriptRef.current = "";
            setInput("");
            setIsListening(true);
            ExpoSpeechRecognitionModule.start({
                lang: "en-US",
                interimResults: true,
                maxAlternatives: 1,
                continuous: false,
            });
        } catch (err: any) {
            console.error("Failed to start speech recognition:", err);
            setIsListening(false);
            Toast.show({ type: "error", text1: "Voice Error", text2: "Could not start voice input." });
        }
    };

    const stopListening = () => {
        ExpoSpeechRecognitionModule.stop();
        // isListening will be set to false in the 'end' event handler
    };

    const handleMicPress = () => {
        if (isListening) stopListening();
        else startListening();
    };

    // ── Attachment handling ───────────────────────────────────────────────────

    const sendAttachment = useCallback(async (
        uri: string,
        mimeType: string,
        fileName: string,
        mediaType: "image" | "document"
    ) => {
        if (isBotThinkingRef.current) return;
        setIsBotThinking(true);
        isBotThinkingRef.current = true;

        try {
            const uploaded = await chatbotService.uploadFile(uri, mimeType, fileName);

            // Show the media bubble in local state
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: mediaType === "image" ? "📷 Image" : `📄 ${fileName}`,
                sender: "user",
                timestamp: new Date(),
                mediaUrl: uploaded.url,
                mediaType,
                mediaName: fileName,
            }]);

            // Tell the bot what was shared, get a response
            const contextText = mediaType === "image"
                ? "I just shared a health-related image. Can you help me understand it or provide any guidance?"
                : `I shared a document called "${fileName}". Can you help me with it?`;

            const response = await chatbotService.sendMessage({
                message: contextText,
                userId,
                sessionId: chatSessionIdRef.current || undefined,
            });

            if (response.sessionId && response.sessionId !== chatSessionIdRef.current) {
                setChatSessionId(response.sessionId);
                chatSessionIdRef.current = response.sessionId;
                if (!userId && !authSessionId) {
                    await SecureStore.setItemAsync(CHAT_SESSION_STORAGE_KEY, response.sessionId);
                }
            }

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                text: response.response,
                sender: "bot",
                products: response.products?.length ? response.products : undefined,
                intent: response.intent,
                timestamp: new Date(),
            }]);
        } catch (err: any) {
            console.error("Attachment error:", err);
            Toast.show({ type: "error", text1: "Upload Failed", text2: "Could not send attachment. Please try again." });
        } finally {
            setIsBotThinking(false);
            isBotThinkingRef.current = false;
        }
    }, [userId, authSessionId]);

    const pickFromGallery = useCallback(async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Toast.show({ type: "info", text1: "Permission Required", text2: "Gallery access is needed." });
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                quality: 0.7,
            });
            if (!result.canceled && result.assets[0]) {
                const { uri, mimeType: mt } = result.assets[0];
                const mimeType = mt || "image/jpeg";
                const fileName = uri.split("/").pop() || "image.jpg";
                await sendAttachment(uri, mimeType, fileName, "image");
            }
        } catch (err: any) {
            Toast.show({ type: "error", text1: "Error", text2: "Could not open gallery." });
        }
    }, [sendAttachment]);

    const pickFromCamera = useCallback(async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
                Toast.show({ type: "info", text1: "Permission Required", text2: "Camera access is needed." });
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ["images"],
                quality: 0.7,
            });
            if (!result.canceled && result.assets[0]) {
                const { uri, mimeType: mt } = result.assets[0];
                const mimeType = mt || "image/jpeg";
                const fileName = uri.split("/").pop() || "photo.jpg";
                await sendAttachment(uri, mimeType, fileName, "image");
            }
        } catch (err: any) {
            Toast.show({ type: "error", text1: "Error", text2: "Could not open camera." });
        }
    }, [sendAttachment]);

    const pickDocument = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    "application/pdf",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ],
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets[0]) {
                const { uri, mimeType: mt, name } = result.assets[0];
                const mimeType = mt || "application/pdf";
                const fileName = name || "document.pdf";
                await sendAttachment(uri, mimeType, fileName, "document");
            }
        } catch (err: any) {
            Toast.show({ type: "error", text1: "Error", text2: "Could not open document picker." });
        }
    }, [sendAttachment]);

    // ── Clear chat ────────────────────────────────────────────────────────────
    const clearChat = useCallback(async () => {
        try {
            if (chatSessionId) await chatbotService.clearConversation(chatSessionId);
            if (!userId && !authSessionId) await SecureStore.deleteItemAsync(CHAT_SESSION_STORAGE_KEY);
            setMessages([WELCOME_MESSAGE]);
            setChatSessionId(null);
            chatSessionIdRef.current = null;
            hasLoadedHistory.current = false;
            Toast.show({ type: "success", text1: "Chat Cleared", text2: "Your conversation has been cleared." });
        } catch (err) {
            console.error("Error clearing chat:", err);
            Toast.show({ type: "error", text1: "Error", text2: "Failed to clear conversation." });
        }
    }, [chatSessionId, userId, authSessionId]);

    return {
        messages,
        input,
        setInput,
        sendMessage,
        isListening,
        isBotThinking,
        handleMicPress,
        pickFromGallery,
        pickFromCamera,
        pickDocument,
        clearChat,
        sessionId: chatSessionId,
        MicIcon: isListening ? "mic-off" : ("mic" as const),
        MicColor: isListening ? "#f00" : "#D81E5B",
    };
};
