// components/chatBot/ChatInput.tsx
import React, { useState } from "react";
import {
    View,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Text,
    Modal,
    Pressable,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";

interface ChatInputProps {
    input: string;
    setInput: (text: string) => void;
    onSend: () => void;
    isListening: boolean;
    isBotThinking: boolean;
    onMicPress: () => void;
    MicIcon: "mic" | "mic-off" | "send";
    MicColor: string;
    onPickGallery: () => void;
    onPickCamera: () => void;
    onPickDocument: () => void;
}

export default function ChatInput({
    input, setInput, onSend,
    isListening, isBotThinking,
    onMicPress, MicIcon, MicColor,
    onPickGallery, onPickCamera, onPickDocument,
}: ChatInputProps) {
    const [showAttachMenu, setShowAttachMenu] = useState(false);

    const inputHasText = input.trim().length > 0;
    const actionIsSend = !isListening && inputHasText;

    const handleActionButton = isListening
        ? onMicPress
        : actionIsSend ? onSend : onMicPress;

    const finalIcon  = isListening ? MicIcon : actionIsSend ? "send" : MicIcon;
    const finalColor = actionIsSend ? "#FFF" : MicColor;
    const isDisabled = isBotThinking;

    const handleAttach = (action: () => void) => {
        setShowAttachMenu(false);
        setTimeout(action, 300); // let the modal dismiss before picker opens
    };

    return (
        <>
            <View style={styles.container}>
                {/* Attachment Button */}
                <TouchableOpacity
                    style={styles.iconButton}
                    activeOpacity={0.7}
                    disabled={isDisabled || isListening}
                    onPress={() => setShowAttachMenu(true)}
                >
                    <Feather name="paperclip" size={20} color={isDisabled || isListening ? "#CCC" : "#999"} />
                </TouchableOpacity>

                {/* Text Input */}
                <TextInput
                    style={styles.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder={isListening ? "Listening…" : "Ask AmWell a question…"}
                    placeholderTextColor="#999"
                    returnKeyType="send"
                    onSubmitEditing={handleActionButton}
                    editable={!isListening && !isBotThinking}
                    multiline
                />

                {/* Send / Mic Button */}
                <TouchableOpacity
                    style={[styles.actionButton, actionIsSend && styles.activeSend]}
                    onPress={handleActionButton}
                    disabled={isDisabled}
                    activeOpacity={0.8}
                >
                    {isBotThinking ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Feather name={finalIcon as any} size={20} color={finalColor} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Attachment Menu Modal */}
            <Modal
                visible={showAttachMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowAttachMenu(false)}
            >
                <Pressable style={styles.overlay} onPress={() => setShowAttachMenu(false)}>
                    <View style={styles.attachMenu}>
                        <Text style={styles.attachTitle}>Share with AmWell</Text>

                        <TouchableOpacity style={styles.attachItem} onPress={() => handleAttach(onPickCamera)}>
                            <View style={[styles.attachIcon, { backgroundColor: "#EEF2FF" }]}>
                                <Ionicons name="camera-outline" size={24} color="#4F46E5" />
                            </View>
                            <Text style={styles.attachLabel}>Camera</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.attachItem} onPress={() => handleAttach(onPickGallery)}>
                            <View style={[styles.attachIcon, { backgroundColor: "#FFF0F6" }]}>
                                <Ionicons name="image-outline" size={24} color="#D81E5B" />
                            </View>
                            <Text style={styles.attachLabel}>Gallery</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.attachItem} onPress={() => handleAttach(onPickDocument)}>
                            <View style={[styles.attachIcon, { backgroundColor: "#F0FDF4" }]}>
                                <Ionicons name="document-text-outline" size={24} color="#16A34A" />
                            </View>
                            <Text style={styles.attachLabel}>Document</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAttachMenu(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#FFF",
    },
    iconButton: {
        padding: 8,
        marginBottom: 2,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        backgroundColor: "#F7F7F7",
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginHorizontal: 8,
        fontSize: 15,
        color: "#1A1A1A",
    },
    actionButton: {
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F0F0F0",
        marginBottom: 2,
    },
    activeSend: {
        backgroundColor: "#D81E5B",
    },

    // Attachment menu
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    attachMenu: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 36,
    },
    attachTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#999",
        marginBottom: 16,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    attachItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#F5F5F5",
    },
    attachIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
    },
    attachLabel: {
        fontSize: 16,
        fontWeight: "500",
        color: "#1A1A1A",
    },
    cancelButton: {
        marginTop: 16,
        alignItems: "center",
        paddingVertical: 12,
        backgroundColor: "#F5F5F5",
        borderRadius: 12,
    },
    cancelText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666",
    },
});
