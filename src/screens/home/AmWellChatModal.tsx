import React, { useContext, useRef, useEffect } from "react";
import { 
    View, Text, StyleSheet, FlatList, KeyboardAvoidingView, 
    Platform, TouchableOpacity, ActivityIndicator, Image,
    Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import ChatInput from "../../components/chatBot/ChatInput"; 
import { useChatBot, Message } from "../../hooks/useChatBot"; 
import { useAuth } from "../../hooks/useAuth"; 
import { IProduct } from "../../types/backendType";
import Toast from "react-native-toast-message";
import { CartContext } from "../../context/CartContext";
import BottomBar from "../../components/common/BottomBar";
import { formatMessageTime, formatFullDateTime } from "../../utils/timeFormat";

export default function AmWellChatModal({ navigation }: { navigation: any }) {
    const { user, isAnonymous, sessionId: authSessionId } = useAuth();
    const userId = !isAnonymous && user?._id ? user._id : undefined;

    const { 
        messages, input, setInput, sendMessage, isRecording, 
        isBotThinking, handleMicPress, clearChat, MicIcon, MicColor 
    } = useChatBot(userId, authSessionId);

    const { addProduct } = useContext(CartContext);
    const flatListRef = useRef<FlatList>(null);

    // Auto-scroll logic: triggers when new messages arrive or bot starts "thinking"
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 150);
        }
    }, [messages.length, isBotThinking]);

    const handleAddToCart = async (product: IProduct) => {
        try {
            await addProduct(product);
            Toast.show({ type: 'success', text1: `${product.name} added to cart!` });
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Failed to add to cart', text2: err.message });
        }
    };

    const renderDateSeparator = (date: Date) => {
        const today = new Date();
        const messageDate = new Date(date);
        
        const isToday = today.toDateString() === messageDate.toDateString();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = yesterday.toDateString() === messageDate.toDateString();
        
        let label = '';
        if (isToday) label = 'Today';
        else if (isYesterday) label = 'Yesterday';
        else label = messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        return (
            <View style={styles.dateSeparator}>
                <Text style={styles.dateSeparatorText}>{label}</Text>
            </View>
        );
    };

    const renderProductCard = (product: IProduct) => (
        <View key={product?._id ? product._id.toString() : Math.random().toString()} style={styles.productCard}>
            <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.productManufacturer} numberOfLines={1}>{product.manufacturerName}</Text>
                <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>₦{product.price.toLocaleString()}</Text>
                    <TouchableOpacity style={styles.productButton} onPress={() => handleAddToCart(product)}>
                        <Text style={styles.productButtonText}>{"Add to Cart"}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        // Check if we need to show a date separator
        const showDateSeparator = index === 0 || 
            new Date(messages[index - 1].timestamp).toDateString() !== new Date(item.timestamp).toDateString();

        return (
            <>
                {showDateSeparator && renderDateSeparator(item.timestamp)}
                
                <TouchableOpacity
                    activeOpacity={1}
                    onLongPress={() => {
                        Alert.alert(
                            'Message Time',
                            formatFullDateTime(item.timestamp),
                            [{ text: 'OK' }]
                        );
                    }}
                    style={[
                        styles.messageContainer,
                        item.sender === 'user' ? styles.messageContainerUser : styles.messageContainerBot
                    ]}
                >
                    <View style={[
                        styles.messageBubble, 
                        item.sender === 'user' ? styles.userBubble : styles.botBubble
                    ]}>
                        <Text style={item.sender === 'user' ? styles.userText : styles.botText}>
                            {item.text}
                        </Text>

                        {item.audioUrl && (
                            <TouchableOpacity 
                                style={styles.audioButton} 
                                onPress={() => {/* Implement expo-av playback here */}}
                            >
                                <Feather name="play" size={20} color="#D81E5B" />
                                <Text style={styles.audioText}>{"Play audio"}</Text>
                            </TouchableOpacity>
                        )}

                        {item.products && item.products.length > 0 && (
                            <View style={styles.productsContainer}>
                                {item.products.map(renderProductCard)}
                            </View>
                        )}
                    </View>
                    
                    {/* Timestamp */}
                    <Text style={[
                        styles.timestamp,
                        item.sender === 'user' ? styles.timestampRight : styles.timestampLeft
                    ]}>
                        {formatMessageTime(item.timestamp)}
                    </Text>
                </TouchableOpacity>
            </>
        );
    };

    return (
        <SafeAreaView style={styles.fullScreen} edges={['top', 'left', 'right']}>
            {/* 1. Static Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>{"Ask AmWell Bot"}</Text>
                    <Text style={styles.headerSubtitle}>
                        {isAnonymous ? 'Guest Mode' : 'Your health assistant'}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={clearChat} style={styles.headerButton}>
                        <Feather name="trash-2" size={20} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                        <Feather name="x" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* 2. Main Chat Area */}
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

                {isBotThinking && (
                    <View style={[styles.messageBubble, styles.botBubble, styles.thinkingIndicator]}>
                        <ActivityIndicator size="small" color="#1A1A1A" style={{ marginRight: 8 }} />
                        <Text style={styles.botText}>{"AmWell is thinking..."}</Text>
                    </View>
                )}

                {/* 3. Input Area */}
                <View style={styles.inputWrapper}>
                    {isRecording && (
                        <View style={styles.recordingIndicator}>
                            <View style={styles.recordingDot} />
                            <Text style={styles.recordingText}>{"Recording... Tap mic to stop"}</Text>
                        </View>
                    )}
                    
                    <ChatInput 
                        input={input}
                        setInput={setInput}
                        onSend={() => sendMessage(undefined)} 
                        isListening={isRecording}
                        isBotThinking={isBotThinking}
                        onMicPress={handleMicPress}
                        MicIcon={MicIcon as any}
                        MicColor={MicColor}
                    />
                </View>
            </KeyboardAvoidingView>

            {/* BottomBar */}
            {input.length === 0 && !isRecording && (
                <BottomBar activeRoute="Chat" cartItemCount={0}/>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    fullScreen: { flex: 1, backgroundColor: '#FFF' },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 15, 
        borderBottomWidth: 1, 
        borderBottomColor: '#EEE',
        backgroundColor: '#FFF'
    },
    headerLeft: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
    headerSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerButton: { padding: 5 },
    chatList: { flex: 1, paddingHorizontal: 10 },
    chatListContent: { paddingBottom: 20, paddingTop: 10 },
    
    // Date Separator Styles
    dateSeparator: {
        alignItems: 'center',
        marginVertical: 15,
    },
    dateSeparatorText: {
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    
    // Message Container Styles
    messageContainer: {
        marginVertical: 4,
        maxWidth: '80%',
    },
    messageContainerUser: {
        alignSelf: 'flex-end',
    },
    messageContainerBot: {
        alignSelf: 'flex-start',
    },
    
    // Message Bubble Styles
    messageBubble: { 
        padding: 12, 
        borderRadius: 15,
    },
    userBubble: { 
        backgroundColor: '#D81E5B', 
        borderBottomRightRadius: 5 
    },
    botBubble: { 
        backgroundColor: '#F5F5F5', 
        borderBottomLeftRadius: 5 
    },
    userText: { color: '#FFF', fontSize: 15, lineHeight: 20 },
    botText: { color: '#1A1A1A', fontSize: 15, lineHeight: 20 },
    
    // Timestamp Styles
    timestamp: {
        fontSize: 11,
        color: '#999',
        marginTop: 4,
        marginHorizontal: 4,
    },
    timestampRight: {
        textAlign: 'right',
    },
    timestampLeft: {
        textAlign: 'left',
    },
    
    // Recording Indicator
    recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D81E5B', marginRight: 8 },
    recordingText: { color: '#D81E5B', fontWeight: '600', fontSize: 14 },
    recordingIndicator: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingVertical: 10,
        backgroundColor: '#FFE5EB',
        width: '100%',
    },
    
    // Thinking Indicator
    thinkingIndicator: { 
        flexDirection: "row", 
        alignItems: "center", 
        padding: 10, 
        marginHorizontal: 10, 
        marginBottom: 10,
        backgroundColor: '#F5F5F5'
    },
    
    // Product Card Styles
    productsContainer: { marginTop: 12, gap: 10 },
    productCard: { 
        backgroundColor: '#FFF', 
        borderRadius: 12, 
        padding: 10, 
        elevation: 2, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 4, 
        width: '100%', 
        flexDirection: 'row', 
        gap: 10 
    },
    productImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#F0F0F0' },
    productInfo: { flex: 1, justifyContent: 'space-between' },
    productName: { fontWeight: '600', fontSize: 14, color: '#1A1A1A', marginBottom: 2 },
    productManufacturer: { fontSize: 12, color: '#666', marginBottom: 4 },
    productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    productPrice: { fontSize: 16, fontWeight: 'bold', color: '#D81E5B' },
    productButton: { backgroundColor: '#D81E5B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
    productButtonText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
    
    // Audio Button
    audioButton: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
    audioText: { color: '#D81E5B', fontWeight: '500' },
    
    // Input Wrapper
    inputWrapper: {
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
});