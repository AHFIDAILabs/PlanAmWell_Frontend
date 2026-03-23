// screens/ChatRoomScreen.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { AppStackParamList } from "../types/App";
import { IConversation, IMessage, IVideoCallRequest } from "../types/backendType";
import { useAuth } from "../hooks/useAuth";
import socketService from "../services/socketService";
import {
  getOrCreateConversation,
  sendMessage,
  getMessages,
  markMessagesAsRead,
  updateTypingIndicator,
  requestVideoCall,
  respondToVideoCall,
  cancelVideoCallRequest,
} from "../services/Chat";
import { getDoctorImageUri } from "../services/Doctor";

type ChatRoomRouteProps = RouteProp<AppStackParamList, "ChatRoomScreen">;

export const ChatRoomScreen: React.FC = () => {
  const route = useRoute<ChatRoomRouteProps>();
  const navigation = useNavigation<any>();
  const { user, getUserRole } = useAuth();
  const userRole = getUserRole();

  const { appointmentId, conversationId: initialConversationId } = route.params;

  const [conversation, setConversation] = useState<IConversation | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [videoRequestModal, setVideoRequestModal] = useState(false);
  const [incomingVideoRequest, setIncomingVideoRequest] = useState<IVideoCallRequest | null>(null);
  const [outgoingVideoRequest, setOutgoingVideoRequest] = useState<IVideoCallRequest | null>(null);
  const [requestCountdown, setRequestCountdown] = useState(60);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserId = user?._id;

  // ✅ FIX 1: Derive otherParticipant safely with useMemo — no early return
  const otherParticipant = useMemo(() => {
    if (!conversation?.participants) return null;
    if (typeof conversation.participants.doctorId === "string") return null;
    return userRole === "Doctor"
      ? conversation.participants.userId
      : conversation.participants.doctorId;
  }, [conversation, userRole]);

  // ✅ Derive display values safely
  const otherParticipantName = useMemo(() => {
    if (!otherParticipant) return "...";
    return userRole === "Doctor"
      ? (otherParticipant as any)?.name || "Patient"
      : `Dr. ${(otherParticipant as any)?.firstName || ""} ${(otherParticipant as any)?.lastName || ""}`.trim();
  }, [otherParticipant, userRole]);

  const otherParticipantImage = useMemo(() => {
    if (!otherParticipant) return "";
    return userRole === "Doctor"
      ? (otherParticipant as any)?.userImage?.imageUrl ||
        (otherParticipant as any)?.userImage?.secure_url ||
        `https://ui-avatars.com/api/?name=${(otherParticipant as any)?.name || "User"}`
      : getDoctorImageUri(otherParticipant as any);
  }, [otherParticipant, userRole]);

  // ===========================
  // LOAD CONVERSATION
  // ===========================
  const loadConversation = useCallback(async () => {
    try {
      setLoading(true);
      const conv = await getOrCreateConversation(appointmentId);

      if (conv) {
        setConversation(conv);
        setMessages([...conv.messages].reverse());
        await markMessagesAsRead(conv._id);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load chat",
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // ✅ FIX 2: Join the socket room so real-time events actually arrive
  useEffect(() => {
    if (!conversation) return;

    socketService.joinAppointment(appointmentId);

    return () => {
      socketService.leaveAppointment(appointmentId);
    };
  }, [conversation, appointmentId]);

  // ===========================
  // SOCKET LISTENERS
  // ===========================
  useEffect(() => {
    if (!conversation) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewMessage = (data: { conversationId: string; message: IMessage }) => {
      if (data.conversationId === conversation._id) {
        setMessages((prev) => [...prev, data.message]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        markMessagesAsRead(conversation._id);
      }
    };

    const handleTyping = (data: {
      conversationId: string;
      isTyping: boolean;
      senderRole: string;
    }) => {
      if (data.conversationId === conversation._id && data.senderRole !== userRole) {
        setOtherUserTyping(data.isTyping);
      }
    };

    const handleMessagesRead = (data: { conversationId: string }) => {
      if (data.conversationId === conversation._id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.senderId === currentUserId
              ? { ...msg, status: "read" as const }
              : msg
          )
        );
      }
    };

    const handleVideoRequest = (data: {
      conversationId: string;
      requesterName: string;
      requestId: string;
    }) => {
      if (data.conversationId === conversation._id) {
        loadConversation().then(() => {
          setVideoRequestModal(true);
        });
      }
    };

    const handleVideoResponse = (data: {
      conversationId: string;
      status: "accepted" | "declined" | "expired" | "cancelled";
      requestId: string;
    }) => {
      if (data.conversationId === conversation._id) {
        if (data.status === "accepted") {
          Toast.show({ type: "success", text1: "Call Accepted", text2: "Connecting..." });
          setTimeout(() => {
            navigation.navigate("VideoCallScreen", {
              appointmentId,
              name: otherParticipantName,
              patientId: conversation.participants.userId._id,
              role: userRole === "Doctor" ? "doctor" : "user",
              autoJoin: true,
            });
          }, 500);
        } else if (data.status === "declined") {
          Toast.show({ type: "error", text1: "Call Declined", text2: "The other party declined" });
        } else if (data.status === "expired") {
          Toast.show({ type: "info", text1: "Request Expired", text2: "The video call request timed out" });
        } else if (data.status === "cancelled") {
          Toast.show({ type: "info", text1: "Request Cancelled" });
        }

        setOutgoingVideoRequest(null);
        setIncomingVideoRequest(null);
        setVideoRequestModal(false);
        loadConversation();
      }
    };

    socket.on("new-message", handleNewMessage);
    socket.on("typing-indicator", handleTyping);
    socket.on("messages-read", handleMessagesRead);
    socket.on("video-call-request", handleVideoRequest);
    socket.on("video-call-response", handleVideoResponse);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("typing-indicator", handleTyping);
      socket.off("messages-read", handleMessagesRead);
      socket.off("video-call-request", handleVideoRequest);
      socket.off("video-call-response", handleVideoResponse);
    };
  }, [conversation, currentUserId, userRole, appointmentId, navigation,
      loadConversation, otherParticipantName]);

  // ===========================
  // REQUEST COUNTDOWN
  // ===========================
  useEffect(() => {
    if (!conversation?.activeVideoRequest) return;

    const request = conversation.activeVideoRequest;
    const expiresAt = new Date(request.expiresAt).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setRequestCountdown(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        setVideoRequestModal(false);
        setIncomingVideoRequest(null);
        setOutgoingVideoRequest(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [conversation?.activeVideoRequest]);

  // Check active video request on load
  useEffect(() => {
    if (!conversation?.activeVideoRequest) return;

    const request = conversation.activeVideoRequest;
    if (request.status === "pending") {
      if (request.requestedBy === currentUserId) {
        setOutgoingVideoRequest(request);
      } else {
        setIncomingVideoRequest(request);
        setVideoRequestModal(true);
      }
    }
  }, [conversation?.activeVideoRequest, currentUserId]);

  // ===========================
  // SEND MESSAGE
  // ===========================
  const handleSendMessage = async () => {
    if (!inputText.trim() || !conversation || sending) return;

    const messageText = inputText.trim();
    setInputText("");

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    updateTypingIndicator(conversation._id, false);
    setIsTyping(false);

    try {
      setSending(true);
      const newMessage = await sendMessage(conversation._id, messageText);

      if (newMessage) {
        setMessages((prev) => [...prev, newMessage]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Failed to send message", text2: error.message });
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  // ===========================
  // TYPING INDICATOR
  // ===========================
  const handleTextChange = (text: string) => {
    setInputText(text);
    if (!conversation) return;

    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      updateTypingIndicator(conversation._id, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingIndicator(conversation._id, false);
    }, 2000);
  };

  // ===========================
  // VIDEO CALL HANDLERS
  // ===========================
  const handleRequestVideoCall = async () => {
    if (!conversation) return;

    if (conversation.activeVideoRequest?.status === "pending") {
      Toast.show({ type: "info", text1: "Request Pending", text2: "A video call request is already active" });
      return;
    }

    try {
      const request = await requestVideoCall(conversation._id);
      if (request) {
        setOutgoingVideoRequest(request);
        Toast.show({ type: "success", text1: "Request Sent", text2: "Waiting for response..." });
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Request Failed", text2: error.message });
    }
  };

  const handleRespondToVideoRequest = async (accept: boolean) => {
    if (!conversation || !incomingVideoRequest) return;

    try {
      const response = await respondToVideoCall(
        conversation._id,
        incomingVideoRequest._id!,
        accept
      );

      if (response && accept) {
        Toast.show({ type: "success", text1: "Joining Call", text2: "Connecting..." });
        setTimeout(() => {
          navigation.navigate("VideoCallScreen", {
            appointmentId: response.appointmentId,
            name: otherParticipantName,
            patientId: conversation.participants.userId._id,
            role: userRole === "Doctor" ? "doctor" : "user",
            autoJoin: true,
          });
        }, 500);
      }

      setVideoRequestModal(false);
      setIncomingVideoRequest(null);
      loadConversation();
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Response Failed", text2: error.message });
    }
  };

  const handleCancelVideoRequest = async () => {
    if (!conversation || !outgoingVideoRequest) return;

    try {
      await cancelVideoCallRequest(conversation._id, outgoingVideoRequest._id!);
      setOutgoingVideoRequest(null);
      Toast.show({ type: "info", text1: "Request Cancelled" });
      loadConversation();
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Cancel Failed", text2: error.message });
    }
  };

  // ===========================
  // RENDER MESSAGE
  // ===========================
  const renderMessage = ({ item }: { item: IMessage }) => {
    const isOwnMessage = item.senderId === currentUserId;
    const isSystem = item.messageType === "system";

    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        <View style={[styles.messageBubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
            {isOwnMessage && (
              <Ionicons
                name={
                  item.status === "read" ? "checkmark-done"
                  : item.status === "delivered" ? "checkmark-done-outline"
                  : "checkmark"
                }
                size={14}
                color={item.status === "read" ? "#4FC3F7" : "#B0BEC5"}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  // ===========================
  // RENDER
  // ===========================
  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D81E5B" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#111" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerInfo}>
          <Image source={{ uri: otherParticipantImage }} style={styles.avatar} />
          <View>
            <Text style={styles.headerName}>{otherParticipantName}</Text>
            {otherUserTyping && <Text style={styles.typingIndicator}>typing...</Text>}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.videoButton}
          onPress={handleRequestVideoCall}
          disabled={!!outgoingVideoRequest}
        >
          <Ionicons name="videocam" size={24} color={outgoingVideoRequest ? "#999" : "#D81E5B"} />
        </TouchableOpacity>
      </View>

      {/* Outgoing Request Banner */}
      {outgoingVideoRequest && (
        <View style={styles.requestBanner}>
          <View style={styles.requestBannerContent}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.requestBannerText}>Waiting for response... ({requestCountdown}s)</Text>
          </View>
          <TouchableOpacity onPress={handleCancelVideoRequest}>
            <Text style={styles.requestBannerCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        }
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={20} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Video Request Modal */}
      <Modal
        visible={videoRequestModal}
        animationType="slide"
        transparent
        onRequestClose={() => { if (!incomingVideoRequest) setVideoRequestModal(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.videoRequestModal}>
            <View style={styles.videoRequestHeader}>
              <Ionicons name="videocam" size={48} color="#D81E5B" />
              <Text style={styles.videoRequestTitle}>Video Call Request</Text>
              <Text style={styles.videoRequestSubtitle}>
                {otherParticipantName} wants to start a video call
              </Text>
              <Text style={styles.videoRequestCountdown}>Expires in {requestCountdown}s</Text>
            </View>
            <View style={styles.videoRequestActions}>
              <TouchableOpacity
                style={[styles.videoRequestButton, styles.declineButton]}
                onPress={() => handleRespondToVideoRequest(false)}
              >
                <Ionicons name="close-circle" size={24} color="#fff" />
                <Text style={styles.videoRequestButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.videoRequestButton, styles.acceptButton]}
                onPress={() => handleRespondToVideoRequest(true)}
              >
                <Ionicons name="videocam" size={24} color="#fff" />
                <Text style={styles.videoRequestButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  typingIndicator: {
    fontSize: 12,
    color: "#4FC3F7",
    fontStyle: "italic",
  },
  videoButton: {
    padding: 8,
  },
  requestBanner: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requestBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  requestBannerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  requestBannerCancel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#BBB",
    marginTop: 4,
  },
  systemMessageContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  systemMessageText: {
    fontSize: 12,
    color: "#999",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    textAlign: "center",
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: "75%",
  },
  ownMessage: {
    alignSelf: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: "#D81E5B",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: "#fff",
  },
  otherMessageText: {
    color: "#111",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  ownMessageTime: {
    color: "#FFE0EB",
  },
  otherMessageTime: {
    color: "#999",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: "#111",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#D81E5B",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#CCC",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  videoRequestModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  videoRequestHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  videoRequestTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginTop: 16,
  },
  videoRequestSubtitle: {
    fontSize: 15,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  videoRequestCountdown: {
    fontSize: 13,
    color: "#999",
    marginTop: 8,
  },
  videoRequestActions: {
    flexDirection: "row",
    gap: 12,
  },
  videoRequestButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  declineButton: {
    backgroundColor: "#F44336",
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
  },
  videoRequestButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});