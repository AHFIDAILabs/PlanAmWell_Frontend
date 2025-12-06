import React, { useContext } from "react";
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import ChatInput from "../../components/chatBot/ChatInput"; 
import { useChatBot, Message } from "../../hooks/useChatBot"; 
import { useAuth } from "../../hooks/useAuth"; // Import useAuth
import { IProduct } from "../../types/backendType";
import Toast from "react-native-toast-message";
import { CartContext } from "../../context/CartContext";
import BottomBar from "../../components/common/BottomBar";
import { Route } from "lucide-react-native";

export default function AmWellChatModal({ navigation }: { navigation: any }) {
    // Get userId from useAuth hook
    const { user, isAnonymous, sessionId: authSessionId } = useAuth();
    const userId = !isAnonymous && user?._id ? user._id : undefined;
    
    const { 
        messages, 
        input, 
        setInput, 
        sendMessage, 
        isRecording, 
        isBotThinking, 
        handleMicPress, 
        clearChat,
        MicIcon, 
        MicColor 
    } = useChatBot(userId, authSessionId); // Pass both userId and sessionId
    
    const { addProduct } = useContext(CartContext);

    const handleAddToCart = async (product: IProduct) => {
        try {
            await addProduct(product);
            Toast.show({ 
                type: 'success', 
                text1: `${product.name} added to cart!` 
            });
        } catch (err: any) {
            Toast.show({ 
                type: 'error', 
                text1: 'Failed to add to cart', 
                text2: err.message 
            });
        }
    };

    const renderProductCard = (product: IProduct) => (
        <View key={product._id} style={styles.productCard}>
            <Image 
                source={{ uri: product.imageUrl }} 
                style={styles.productImage} 
                resizeMode="cover" 
            />
            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                </Text>
                <Text style={styles.productManufacturer} numberOfLines={1}>
                    {product.manufacturerName}
                </Text>
                <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>
                        ₦{product.price.toLocaleString()}
                    </Text>
                    <TouchableOpacity 
                        style={styles.productButton} 
                        onPress={() => handleAddToCart(product)}
                    >
                        <Text style={styles.productButtonText}>Add to Cart</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderMessage = ({ item }: { item: Message }) => (
        <View style={[
            styles.messageBubble, 
            item.sender === 'user' ? styles.userBubble : styles.botBubble
        ]}>
            <Text style={item.sender === 'user' ? styles.userText : styles.botText}>
                {item.text}
            </Text>
            
            {item.products && item.products.length > 0 && (
                <View style={styles.productsContainer}>
                    {item.products.map(renderProductCard)}
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.fullScreen}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>Ask AmWell Bot</Text>
                    <Text style={styles.headerSubtitle}>
                        {isAnonymous ? 'Guest Mode' : 'Your health assistant'}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity 
                        onPress={clearChat} 
                        style={styles.headerButton}
                    >
                        <Feather name="trash-2" size={20} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()}
                        style={styles.headerButton}
                    >
                        <Feather name="x" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                </View>
            </View>
            
            {isRecording && (
                <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingText}>
                        Recording... Tap mic to stop
                    </Text>
                </View>
            )}

            <FlatList
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                style={styles.chatList}
                contentContainerStyle={styles.chatListContent}
            />

            {isBotThinking && (
                <View style={[styles.messageBubble, styles.botBubble, styles.thinkingIndicator]}>
                    <ActivityIndicator size="small" color="#1A1A1A" style={{ marginRight: 8 }} />
                    <Text style={styles.botText}>AmWell is thinking...</Text>
                </View>
            )}

            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ChatInput 
                    input={input}
                    setInput={setInput}
                    onSend={() => sendMessage(null)} 
                    isListening={isRecording}
                    isBotThinking={isBotThinking}
                    onMicPress={handleMicPress}
                    MicIcon={MicIcon as any}
                    MicColor={MicColor}
                />
            </KeyboardAvoidingView>
            <BottomBar activeRoute={Route.name} cartItemCount={0}/>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    fullScreen: { 
        flex: 1, 
        backgroundColor: '#FFF' 
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    headerLeft: {
        flex: 1,
    },
    headerTitle: { 
        fontSize: 18, 
        fontWeight: 'bold',
        color: '#1A1A1A'
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 2
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    headerButton: {
        padding: 5
    },
    chatList: { 
        flex: 1,
        paddingHorizontal: 10 
    },
    chatListContent: {
        paddingBottom: 20,
        paddingTop: 10
    },
    recordingIndicator: { 
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8, 
        backgroundColor: '#FFE5EB',
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D81E5B',
        marginRight: 8
    },
    recordingText: {
        color: '#D81E5B', 
        fontWeight: '600',
        fontSize: 14
    },
    thinkingIndicator: {
        flexDirection: "row", 
        alignItems: "center",
        padding: 10,
        marginHorizontal: 10,
        marginBottom: 10
    },
    
    // Message Styling
    messageBubble: {
        padding: 12,
        borderRadius: 15,
        marginVertical: 4,
        maxWidth: '80%',
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#D81E5B',
        borderBottomRightRadius: 5,
    },
    botBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#F5F5F5',
        borderBottomLeftRadius: 5,
    },
    userText: { 
        color: '#FFF',
        fontSize: 15,
        lineHeight: 20
    },
    botText: { 
        color: '#1A1A1A',
        fontSize: 15,
        lineHeight: 20
    },

    // Products Container
    productsContainer: {
        marginTop: 12,
        gap: 10
    },

    // Product Card Styles
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
    productImage: { 
        width: 80, 
        height: 80, 
        borderRadius: 8,
        backgroundColor: '#F0F0F0'
    },
    productInfo: {
        flex: 1,
        justifyContent: 'space-between'
    },
    productName: { 
        fontWeight: '600',
        fontSize: 14,
        color: '#1A1A1A',
        marginBottom: 2
    },
    productManufacturer: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4
    },
    productFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4
    },
    productPrice: { 
        fontSize: 16,
        fontWeight: 'bold',
        color: '#D81E5B'
    },
    productButton: { 
        backgroundColor: '#D81E5B', 
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        alignItems: 'center'
    },
    productButtonText: { 
        color: '#FFF', 
        fontWeight: '600',
        fontSize: 13
    },
});