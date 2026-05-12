import React, { useContext, useRef, useEffect, useState } from "react";
import {
    View, Text, StyleSheet, FlatList, KeyboardAvoidingView,
    Platform, TouchableOpacity, ActivityIndicator, Image,
    Alert, Linking, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import ChatInput from "../../components/chatBot/ChatInput";
import { useChatBot, Message } from "../../hooks/useChatBot";
import { useAuth } from "../../hooks/useAuth";
import { IProduct } from "../../types/backendType";
import Toast from "react-native-toast-message";
import { CartContext } from "../../context/CartContext";
import BottomBar from "../../components/common/BottomBar";
import { formatMessageTime, formatFullDateTime } from "../../utils/timeFormat";

const WHATSAPP_BUSINESS_NUMBER = "+2348012345678";
const WHATSAPP_GREETING = "Hello, I need help with my health needs";

export default function AmWellChatModal({ navigation }: { navigation: any }) {
    const { user, isAnonymous, sessionId: authSessionId } = useAuth();
    const userId = !isAnonymous && user?._id ? user._id : undefined;

    const {
        messages, input, setInput, sendMessage,
        isListening, isBotThinking,
        handleMicPress, clearChat,
        pickFromGallery, pickFromCamera, pickDocument,
        MicIcon, MicColor,
    } = useChatBot(userId, authSessionId);

    const { addProduct } = useContext(CartContext);
    const flatListRef = useRef<FlatList>(null);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
        }
    }, [messages.length, isBotThinking]);

    const handleAddToCart = async (product: IProduct) => {
        try {
            await addProduct(product);
            Toast.show({ type: "success", text1: `${product.name} added to cart!` });
        } catch (err: any) {
            Toast.show({ type: "error", text1: "Failed to add to cart", text2: err.message });
        }
    };

    const openWhatsApp = async () => {
        try {
            const message = encodeURIComponent(WHATSAPP_GREETING);
            const whatsappURL = `whatsapp://send?phone=${WHATSAPP_BUSINESS_NUMBER}&text=${message}`;
            const canOpen = await Linking.canOpenURL(whatsappURL);

            if (canOpen) {
                await Linking.openURL(whatsappURL);
                setShowWhatsAppModal(false);
                Toast.show({ type: "success", text1: "Opening WhatsApp" });
            } else {
                Alert.alert(
                    "WhatsApp Not Found",
                    "WhatsApp is not installed. Would you like to:",
                    [
                        {
                            text: "Install WhatsApp",
                            onPress: () => {
                                const storeURL = Platform.OS === "ios"
                                    ? "https://apps.apple.com/app/whatsapp-messenger/id310633997"
                                    : "https://play.google.com/store/apps/details?id=com.whatsapp";
                                Linking.openURL(storeURL);
                            },
                        },
                        {
                            text: "Use Web WhatsApp",
                            onPress: () => Linking.openURL(`https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${message}`),
                        },
                        { text: "Cancel", style: "cancel" },
                    ]
                );
            }
        } catch {
            Alert.alert("Error", "Could not open WhatsApp. Please try again.", [{ text: "OK" }]);
        }
    };

    // ── Renderers ─────────────────────────────────────────────────────────────

    const renderDateSeparator = (date: Date) => {
        const today = new Date();
        const messageDate = new Date(date);
        const isToday = today.toDateString() === messageDate.toDateString();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = yesterday.toDateString() === messageDate.toDateString();

        const label = isToday ? "Today"
            : isYesterday ? "Yesterday"
            : messageDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

        return (
            <View style={styles.dateSeparator}>
                <Text style={styles.dateSeparatorText}>{label}</Text>
            </View>
        );
    };

    const renderProductCard = (product: IProduct) => (
        <View key={product?._id?.toString() ?? Math.random().toString()} style={styles.productCard}>
            <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.productManufacturer} numberOfLines={1}>{product.manufacturerName}</Text>
                <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>₦{product.price.toLocaleString()}</Text>
                    <TouchableOpacity style={styles.productButton} onPress={() => handleAddToCart(product)}>
                        <Text style={styles.productButtonText}>Add to Cart</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const showDateSeparator = index === 0 ||
            new Date(messages[index - 1].timestamp).toDateString() !== new Date(item.timestamp).toDateString();
        const isUser = item.sender === "user";

        return (
            <>
                {showDateSeparator && renderDateSeparator(item.timestamp)}

                <TouchableOpacity
                    activeOpacity={1}
                    onLongPress={() =>
                        Alert.alert("Message Time", formatFullDateTime(item.timestamp), [{ text: "OK" }])
                    }
                    style={[
                        styles.messageContainer,
                        isUser ? styles.messageContainerUser : styles.messageContainerBot,
                    ]}
                >
                    <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
                        {/* Shared image */}
                        {item.mediaUrl && item.mediaType === "image" && (
                            <TouchableOpacity
                                onPress={() => Linking.openURL(item.mediaUrl!)}
                                activeOpacity={0.85}
                            >
                                <Image
                                    source={{ uri: item.mediaUrl }}
                                    style={styles.mediaThumbnail}
                                    resizeMode="cover"
                                />
                            </TouchableOpacity>
                        )}

                        {/* Shared document */}
                        {item.mediaUrl && item.mediaType === "document" && (
                            <TouchableOpacity
                                style={styles.documentRow}
                                onPress={() => Linking.openURL(item.mediaUrl!)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="document-text-outline" size={28} color={isUser ? "#FFD6E5" : "#D81E5B"} />
                                <Text
                                    style={[styles.documentName, isUser ? styles.documentNameUser : styles.documentNameBot]}
                                    numberOfLines={2}
                                >
                                    {item.mediaName ?? "Document"}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Text (hidden for pure media bubbles that have no real text) */}
                        {!!item.text && item.text !== "📷 Image" && (
                            <Text style={isUser ? styles.userText : styles.botText}>{item.text}</Text>
                        )}

                        {/* Bot audio */}
                        {item.audioUrl && (
                            <TouchableOpacity style={styles.audioButton}>
                                <Feather name="play" size={20} color="#D81E5B" />
                                <Text style={styles.audioText}>Play audio</Text>
                            </TouchableOpacity>
                        )}

                        {/* Product cards */}
                        {item.products && item.products.length > 0 && (
                            <View style={styles.productsContainer}>
                                {item.products.map(renderProductCard)}
                            </View>
                        )}
                    </View>

                    <Text style={[styles.timestamp, isUser ? styles.timestampRight : styles.timestampLeft]}>
                        {item.timestamp ? formatMessageTime(item.timestamp) : ""}
                    </Text>
                </TouchableOpacity>
            </>
        );
    };

    return (
        <SafeAreaView style={styles.fullScreen} edges={["top", "left", "right"]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>Ask AmWell Bot</Text>
                    <Text style={styles.headerSubtitle}>
                        {isAnonymous ? "Guest Mode" : "Your health assistant"}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={() => setShowWhatsAppModal(true)} style={styles.whatsappButton}>
                        <Ionicons name="logo-whatsapp" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={clearChat} style={styles.headerButton}>
                        <Feather name="trash-2" size={20} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                        <Feather name="x" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Privacy assurance banner — always visible */}
            <View style={styles.privacyBanner}>
                <Ionicons name="lock-closed" size={13} color="#16A34A" />
                <Text style={styles.privacyBannerText}>
                    Your conversation is private &amp; confidential
                </Text>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    style={styles.chatList}
                    contentContainerStyle={styles.chatListContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />

                {/* Bot thinking indicator */}
                {isBotThinking && (
                    <View style={[styles.messageBubble, styles.botBubble, styles.thinkingIndicator]}>
                        <ActivityIndicator size="small" color="#1A1A1A" style={{ marginRight: 8 }} />
                        <Text style={styles.botText}>AmWell is thinking…</Text>
                    </View>
                )}

                {/* Input area */}
                <View style={styles.inputWrapper}>
                    {isListening && (
                        <View style={styles.listeningIndicator}>
                            <View style={styles.listeningDot} />
                            <Text style={styles.listeningText}>Listening… tap mic to stop</Text>
                        </View>
                    )}

                    <ChatInput
                        input={input}
                        setInput={setInput}
                        onSend={sendMessage}
                        isListening={isListening}
                        isBotThinking={isBotThinking}
                        onMicPress={handleMicPress}
                        MicIcon={MicIcon as any}
                        MicColor={MicColor}
                        onPickGallery={pickFromGallery}
                        onPickCamera={pickFromCamera}
                        onPickDocument={pickDocument}
                    />
                </View>
            </KeyboardAvoidingView>

            {/* BottomBar */}
            {input.length === 0 && !isListening && (
                <BottomBar activeRoute="Chat" cartItemCount={0} />
            )}

            {/* WhatsApp Modal */}
            <Modal
                visible={showWhatsAppModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowWhatsAppModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowWhatsAppModal(false)}
                >
                    <View style={styles.modalContent}>
                        <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
                            <View style={styles.modalHeader}>
                                <View style={styles.modalWhatsappIconContainer}>
                                    <Ionicons name="logo-whatsapp" size={50} color="#25D366" />
                                </View>
                                <Text style={styles.modalTitle}>Chat on WhatsApp</Text>
                                <Text style={styles.modalSubtitle}>
                                    Get instant responses on WhatsApp! Our AI assistant is available 24/7.
                                </Text>
                            </View>

                            <View style={styles.benefitsContainer}>
                                {["24/7 instant responses", "Search & order products", "Get health information", "Book appointments"].map(b => (
                                    <View key={b} style={styles.benefitItem}>
                                        <Feather name="check-circle" size={20} color="#25D366" />
                                        <Text style={styles.benefitText}>{b}</Text>
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity style={styles.openWhatsappButton} onPress={openWhatsApp}>
                                <Ionicons name="logo-whatsapp" size={22} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.openWhatsappButtonText}>Open WhatsApp</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.continueAppButton} onPress={() => setShowWhatsAppModal(false)}>
                                <Text style={styles.continueAppButtonText}>Continue in App</Text>
                            </TouchableOpacity>

                            <View style={styles.phoneContainer}>
                                <Text style={styles.phoneLabel}>Or message us directly at:</Text>
                                <Text style={styles.phoneNumber}>{WHATSAPP_BUSINESS_NUMBER}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    fullScreen:  { flex: 1, backgroundColor: "#FFF" },
    header: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        padding: 15, borderBottomWidth: 1, borderBottomColor: "#EEE", backgroundColor: "#FFF",
    },
    headerLeft:     { flex: 1 },
    headerTitle:    { fontSize: 18, fontWeight: "bold", color: "#1A1A1A" },
    headerSubtitle: { fontSize: 13, color: "#555", marginTop: 2 },
    headerRight:    { flexDirection: "row", alignItems: "center", gap: 10 },
    headerButton:   { padding: 8, minWidth: 40, minHeight: 40, justifyContent: "center", alignItems: "center" },
    whatsappButton: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: "#25D366",
        justifyContent: "center", alignItems: "center",
        elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 3,
    },

    chatList:        { flex: 1, paddingHorizontal: 10 },
    chatListContent: { paddingBottom: 20, paddingTop: 10 },

    dateSeparator:     { alignItems: "center", marginVertical: 15 },
    dateSeparatorText: {
        backgroundColor: "#F0F0F0", paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: 12, fontSize: 13, color: "#555", fontWeight: "500",
    },

    messageContainer:     { marginVertical: 4, maxWidth: "82%" },
    messageContainerUser: { alignSelf: "flex-end" },
    messageContainerBot:  { alignSelf: "flex-start" },

    messageBubble: { padding: 12, borderRadius: 15 },
    userBubble:    { backgroundColor: "#D81E5B", borderBottomRightRadius: 5 },
    botBubble:     { backgroundColor: "#F5F5F5", borderBottomLeftRadius: 5 },
    userText:      { color: "#FFF", fontSize: 15, lineHeight: 20 },
    botText:       { color: "#1A1A1A", fontSize: 15, lineHeight: 20 },

    timestamp:      { fontSize: 12, color: "#888", marginTop: 4, marginHorizontal: 4 },
    timestampRight: { textAlign: "right" },
    timestampLeft:  { textAlign: "left" },

    // Media
    mediaThumbnail: {
        width: 200, height: 160, borderRadius: 10, marginBottom: 6, backgroundColor: "#EEE",
    },
    documentRow: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingVertical: 4, marginBottom: 4,
    },
    documentName:     { flex: 1, fontSize: 14, fontWeight: "500" },
    documentNameUser: { color: "#FFD6E5" },
    documentNameBot:  { color: "#1A1A1A" },

    // Listening indicator
    listeningIndicator: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        paddingVertical: 10, backgroundColor: "#FFE5EB",
    },
    listeningDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: "#D81E5B", marginRight: 8 },
    listeningText: { color: "#D81E5B", fontWeight: "600", fontSize: 14 },

    thinkingIndicator: {
        flexDirection: "row", alignItems: "center",
        padding: 10, marginHorizontal: 10, marginBottom: 10,
        backgroundColor: "#F5F5F5", borderRadius: 15,
    },

    productsContainer: { marginTop: 12, gap: 10 },
    productCard: {
        backgroundColor: "#FFF", borderRadius: 12, padding: 10, elevation: 2,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 4, flexDirection: "row", gap: 10,
    },
    productImage:        { width: 80, height: 80, borderRadius: 8, backgroundColor: "#F0F0F0" },
    productInfo:         { flex: 1, justifyContent: "space-between" },
    productName:         { fontWeight: "600", fontSize: 14, color: "#1A1A1A", marginBottom: 2 },
    productManufacturer: { fontSize: 13, color: "#555", marginBottom: 4 },
    productFooter:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
    productPrice:        { fontSize: 16, fontWeight: "bold", color: "#D81E5B" },
    productButton:       { backgroundColor: "#D81E5B", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, minHeight: 36 },
    productButtonText:   { color: "#FFF", fontWeight: "600", fontSize: 14 },

    audioButton: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 },
    audioText:   { color: "#D81E5B", fontWeight: "500" },

    inputWrapper: { backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#EEE" },

    privacyBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        paddingVertical: 5,
        backgroundColor: "#F0FDF4",
        borderBottomWidth: 1,
        borderBottomColor: "#D1FAE5",
    },
    privacyBannerText: {
        fontSize: 13,
        color: "#16A34A",
        fontWeight: "500",
    },

    // WhatsApp Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContent: {
        backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingTop: 24, paddingHorizontal: 20, paddingBottom: 40,
        elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1, shadowRadius: 8,
    },
    modalHeader: { alignItems: "center", marginBottom: 24 },
    modalWhatsappIconContainer: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: "#E8F8F0",
        justifyContent: "center", alignItems: "center", marginBottom: 16,
    },
    modalTitle:    { fontSize: 24, fontWeight: "bold", color: "#1A1A1A", marginBottom: 8 },
    modalSubtitle: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },

    benefitsContainer: { marginBottom: 24 },
    benefitItem:       { flexDirection: "row", alignItems: "center", marginBottom: 12, paddingLeft: 10 },
    benefitText:       { fontSize: 15, color: "#1A1A1A", marginLeft: 12, fontWeight: "500" },

    openWhatsappButton: {
        backgroundColor: "#25D366", flexDirection: "row", alignItems: "center",
        justifyContent: "center", paddingVertical: 16, borderRadius: 12, marginBottom: 12,
        elevation: 2, shadowColor: "#25D366", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3, shadowRadius: 4,
    },
    openWhatsappButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },

    continueAppButton:     { backgroundColor: "#F5F5F5", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginBottom: 16 },
    continueAppButtonText: { color: "#1A1A1A", fontSize: 16, fontWeight: "600" },

    phoneContainer: { alignItems: "center", paddingTop: 16, borderTopWidth: 1, borderTopColor: "#EEE" },
    phoneLabel:     { fontSize: 14, color: "#555", marginBottom: 4 },
    phoneNumber:    { fontSize: 16, fontWeight: "bold", color: "#25D366" },
});
