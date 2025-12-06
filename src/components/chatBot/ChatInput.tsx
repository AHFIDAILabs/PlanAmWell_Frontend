// components/chatBot/ChatInput.tsx
import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons'; 

interface ChatInputProps {
    input: string;
    setInput: (text: string) => void;
    onSend: () => void;
    isListening: boolean;
    isBotThinking: boolean;
    onMicPress: () => void;
    MicIcon: 'mic' | 'mic-off' | 'send';
    MicColor: string;
}

export default function ChatInput({ input, setInput, onSend, isListening, isBotThinking, onMicPress, MicIcon, MicColor }: ChatInputProps) {
    
    // 1. Prioritize state: If listening, the action is STOP. If not listening, check if input is ready to send.
    const inputHasText = input.trim().length > 0;
    const actionIsSend = !isListening && inputHasText;

    // 2. Determine the action handler
    const handleActionButton = isListening 
        ? onMicPress // If listening, click stops recording
        : actionIsSend 
            ? onSend // If text and not listening, click sends message
            : onMicPress; // Otherwise, click starts recording (default mic)
    
    // 3. Determine icon and color based on priority
    const finalIcon = isListening 
        ? MicIcon // Will be 'mic-off' from the hook
        : actionIsSend 
            ? "send" 
            : MicIcon; // Will be 'mic' from the hook
            
    const finalColor = actionIsSend ? "#FFF" : MicColor;
    
    // 💡 FIX: The button should only be disabled if the bot is thinking (isBotThinking). 
    // It must be enabled when isListening is true so the user can tap to stop.
    const isDisabled = isBotThinking;


    return (
        <View style={styles.container}>
            {/* Attachment Button */}
            <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} disabled={isDisabled}>
                <Feather name="paperclip" size={20} color="#999" />
            </TouchableOpacity>

            {/* Text Input */}
            <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={isListening ? "Listening..." : "Ask AskAmWell a question..."}
                placeholderTextColor="#999"
                returnKeyType="send"
                onSubmitEditing={handleActionButton}
                editable={!isListening && !isBotThinking}
            />

            {/* Send/Mic Button */}
            <TouchableOpacity 
                style={[styles.actionButton, actionIsSend && styles.activeSend]} 
                onPress={handleActionButton}
                // 💡 Now only disabled when bot is thinking
                disabled={isDisabled}
                activeOpacity={0.8}
            >
                {isBotThinking ? (
                    <ActivityIndicator size="small" color="#FFF" />
                ) : (
                    <Feather 
                        name={finalIcon as any} 
                        size={20} 
                        color={finalColor} 
                    />
                )}
            </TouchableOpacity>
        </View>
    );
}

// ----------------------
// Styles
// ----------------------
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        backgroundColor: '#FFF',
    },
    iconButton: {
        padding: 5,
    },
    input: {
        flex: 1,
        height: 40,
        backgroundColor: '#F7F7F7',
        borderRadius: 20,
        paddingHorizontal: 15,
        marginHorizontal: 10,
        fontSize: 16,
    },
    actionButton: {
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F0F0', // Default background for mic/disabled
    },
    activeSend: {
        backgroundColor: '#D81E5B', // Pink when ready to send
    },
});