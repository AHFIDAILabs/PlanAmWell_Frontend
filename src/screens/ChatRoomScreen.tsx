// screens/ChatRoomScreen.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
  Linking,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import { AppStackParamList } from "../types/App";
import {
  IConversation,
  IMessage,
  IVideoCallRequest,
} from "../types/backendType";
import { useAuth } from "../hooks/useAuth";
import socketService from "../services/socketService";
import {
  getOrCreateConversation,
  sendMessage,
  markMessagesAsRead,
  updateTypingIndicator,
  requestVideoCall,
  respondToVideoCall,
  cancelVideoCallRequest,
  uploadChatFile,
} from "../services/Chat";
import { endAppointment } from "../services/Appointment";
import { getDoctorImageUri } from "../services/Doctor";

type ChatRoomRouteProps = RouteProp<AppStackParamList, "ChatRoomScreen">;

export const ChatRoomScreen: React.FC = () => {
  const route = useRoute<ChatRoomRouteProps>();
  const navigation = useNavigation<any>();
  const { user, getUserRole } = useAuth();
  const userRole = getUserRole();
  const insets = useSafeAreaInsets();
  const appointmentEndedRef = useRef(false);

  const { appointmentId, conversationId: initialConversationId } = route.params;

  const [conversation, setConversation] = useState<IConversation | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [videoRequestModal, setVideoRequestModal] = useState(false);
  const [incomingVideoRequest, setIncomingVideoRequest] =
    useState<IVideoCallRequest | null>(null);
  const [outgoingVideoRequest, setOutgoingVideoRequest] =
    useState<IVideoCallRequest | null>(null);
  const [requestCountdown, setRequestCountdown] = useState(60);
  // ── NEW: appointment-ended state ──────────────────────────────────────────
  const [appointmentEnded, setAppointmentEnded] = useState(false);
  const [endingAppointment, setEndingAppointment] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserId = user?._id;
  const isDoctor = userRole === "Doctor";

  // ─── Derived state ──────────────────────────────────────────────────────────
  const otherParticipant = useMemo(() => {
    if (!conversation?.participants) return null;
    if (typeof conversation.participants.doctorId === "string") return null;
    return isDoctor
      ? conversation.participants.userId
      : conversation.participants.doctorId;
  }, [conversation, isDoctor]);

  const otherParticipantName = useMemo(() => {
    if (!otherParticipant) return "...";
    return isDoctor
      ? (otherParticipant as any)?.name || "Patient"
      : `Dr. ${(otherParticipant as any)?.firstName || ""} ${(otherParticipant as any)?.lastName || ""}`.trim();
  }, [otherParticipant, isDoctor]);

  const otherParticipantImage = useMemo(() => {
    if (!otherParticipant) return "";
    return isDoctor
      ? (otherParticipant as any)?.userImage?.imageUrl ||
          (otherParticipant as any)?.userImage?.secure_url ||
          `https://ui-avatars.com/api/?name=${(otherParticipant as any)?.name || "User"}`
      : getDoctorImageUri(otherParticipant as any);
  }, [otherParticipant, isDoctor]);

  // ─── Load conversation ──────────────────────────────────────────────────────
  const loadConversation = useCallback(async () => {
    try {
      setLoading(true);
      if (!appointmentId) {
        Toast.show({
          type: "error",
          text1: "Cannot open chat",
          text2: "Missing appointment information",
        });
        setLoading(false);
        return;
      }
      const conv = await getOrCreateConversation(appointmentId);
      if (conv) {
        setConversation(conv);
        setMessages([...conv.messages]);

        // ── Only update appointmentEnded from server if we haven't
        //    already confirmed it ended locally ─────────────────────
        if (!appointmentEndedRef.current) {
          if (!conv.isActive) {
            appointmentEndedRef.current = true;
            setAppointmentEnded(true);
          }
        }

        await markMessagesAsRead(conv._id);
        setTimeout(
          () => flatListRef.current?.scrollToEnd({ animated: false }),
          150,
        );
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

  // ─── Socket: join room ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversation) return;
    socketService.joinAppointment(appointmentId);
    return () => {
      socketService.leaveAppointment(appointmentId);
    };
  }, [conversation, appointmentId]);

  // ─── Socket: listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversation) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewMessage = (data: {
      conversationId: string;
      message: IMessage;
    }) => {
      if (data.conversationId !== conversation._id) return;
      setMessages((prev) => [...prev, data.message]);
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
      markMessagesAsRead(conversation._id);
    };

    const handleTyping = (data: {
      conversationId: string;
      isTyping: boolean;
      senderRole: string;
    }) => {
      if (
        data.conversationId === conversation._id &&
        data.senderRole !== userRole
      ) {
        setOtherUserTyping(data.isTyping);
      }
    };

    const handleMessagesRead = (data: { conversationId: string }) => {
      if (data.conversationId !== conversation._id) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.senderId === currentUserId
            ? { ...msg, status: "read" as const }
            : msg,
        ),
      );
    };

    const handleVideoRequest = (data: { conversationId: string }) => {
      if (data.conversationId !== conversation._id) return;
      loadConversation().then(() => setVideoRequestModal(true));
    };

    const handleVideoResponse = (data: {
      conversationId: string;
      status: "accepted" | "declined" | "expired" | "cancelled";
    }) => {
      if (data.conversationId !== conversation._id) return;
      if (data.status === "accepted") {
        Toast.show({
          type: "success",
          text1: "Call Accepted",
          text2: "Connecting...",
        });
        setTimeout(() => {
          navigation.navigate("VideoCallScreen", {
            appointmentId,
            name: otherParticipantName,
            patientId: conversation.participants.userId._id,
            role: isDoctor ? "doctor" : "user",
            autoJoin: true,
          });
        }, 500);
      } else if (data.status === "declined") {
        Toast.show({ type: "error", text1: "Call Declined" });
      } else if (data.status === "expired") {
        Toast.show({ type: "info", text1: "Request Expired" });
      } else if (data.status === "cancelled") {
        Toast.show({ type: "info", text1: "Request Cancelled" });
      }
      setOutgoingVideoRequest(null);
      setIncomingVideoRequest(null);
      setVideoRequestModal(false);
      loadConversation();
    };

    // ── NEW: appointment ended (doctor manual OR cron auto-expiry) ────────────
    const handleAppointmentEnded = (data: { appointmentId: string }) => {
      if (data.appointmentId !== appointmentId) return;
      appointmentEndedRef.current = true;
      setAppointmentEnded(true);
      setConversation((prev) => (prev ? { ...prev, isActive: false } : prev));
      Toast.show({
        type: "info",
        text1: "Appointment Ended",
        text2: isDoctor
          ? "You have ended this appointment."
          : "This appointment has been ended by your doctor.",
      });
    };

    socket.on("new-message", handleNewMessage);
    socket.on("typing-indicator", handleTyping);
    socket.on("messages-read", handleMessagesRead);
    socket.on("video-call-request", handleVideoRequest);
    socket.on("video-call-response", handleVideoResponse);
    socket.on("appointment-ended", handleAppointmentEnded); // ← NEW

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("typing-indicator", handleTyping);
      socket.off("messages-read", handleMessagesRead);
      socket.off("video-call-request", handleVideoRequest);
      socket.off("video-call-response", handleVideoResponse);
      socket.off("appointment-ended", handleAppointmentEnded); // ← NEW
    };
  }, [
    conversation,
    currentUserId,
    userRole,
    appointmentId,
    navigation,
    loadConversation,
    otherParticipantName,
    isDoctor,
  ]);

  // ─── Video request countdown ────────────────────────────────────────────────
  useEffect(() => {
    if (!conversation?.activeVideoRequest) return;
    const expiresAt = new Date(
      conversation.activeVideoRequest.expiresAt,
    ).getTime();
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((expiresAt - Date.now()) / 1000),
      );
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

  useEffect(() => {
    if (!conversation?.activeVideoRequest) return;
    const request = conversation.activeVideoRequest;
    if (request.status !== "pending") return;
    if (request.requestedBy === currentUserId) {
      setOutgoingVideoRequest(request);
    } else {
      setIncomingVideoRequest(request);
      setVideoRequestModal(true);
    }
  }, [conversation?.activeVideoRequest, currentUserId]);

  // ─── End appointment (Doctor only) ─────────────────────────────────────────
  const handleEndAppointment = () => {
    Alert.alert(
      "End Appointment",
      "Are you sure you want to end this appointment? The chat will become read-only and the patient will be notified.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Appointment",
          style: "destructive",
          onPress: async () => {
            try {
              setEndingAppointment(true);

              await endAppointment(appointmentId);

              // ── Immediate UI update ───────────────────────────────────────
              appointmentEndedRef.current = true;
              setAppointmentEnded(true);
              setConversation((prev) =>
                prev ? { ...prev, isActive: false } : prev,
              );

              // ── Prompt doctor to write consultation note ─────────────────
              if (isDoctor) {
                const patientId =
                  conversation?.participants?.userId?._id ||
                  (conversation?.participants?.userId as any)?._id;

                const patientName =
                  (conversation?.participants?.userId as any)?.name ||
                  "Patient";

                if (patientId) {
                  setTimeout(() => {
                    Alert.alert(
                      "Write Consultation Note?",
                      "Would you like to write a consultation note for this patient? This becomes part of their medical record.",
                      [
                        { text: "Not Now", style: "cancel" },
                        {
                          text: "Write Note",
                          onPress: () =>
                            navigation.navigate("MedicalRecordEditorScreen", {
                              appointmentId,
                              patientId: String(patientId),
                              patientName,
                            }),
                        },
                      ],
                    );
                  }, 600); // allow UI to reflect ended state first
                }
              }
            } catch (error: any) {
              Toast.show({
                type: "error",
                text1: "Failed to end appointment",
                text2: error.message,
              });
            } finally {
              setEndingAppointment(false);
            }
          },
        },
      ],
    );
  };

  // ─── Send text message ──────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!inputText.trim() || !conversation || sending || appointmentEnded)
      return;
    const messageText = inputText.trim();
    setInputText("");

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateTypingIndicator(conversation._id, false);
    setIsTyping(false);

    try {
      setSending(true);
      const newMessage = await sendMessage(
        conversation._id,
        messageText,
        "text",
      );
      if (newMessage) {
        setMessages((prev) => [...prev, newMessage]);
        setTimeout(
          () => flatListRef.current?.scrollToEnd({ animated: true }),
          100,
        );
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to send message",
        text2: error.message,
      });
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  // ─── Typing indicator ───────────────────────────────────────────────────────
  const handleTextChange = (text: string) => {
    setInputText(text);
    if (!conversation || appointmentEnded) return;
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

  // ─── Upload + send ──────────────────────────────────────────────────────────
  const handleUploadAndSend = async (
    uri: string,
    mimeType: string,
    fileName: string,
    type: "image" | "document",
  ) => {
    if (!conversation || appointmentEnded) return;
    setShowAttachMenu(false);
    try {
      setUploading(true);
      const uploaded = await uploadChatFile(uri, mimeType, fileName);
      if (!uploaded) throw new Error("Upload returned empty response");

      const backendMessageType: "image" | "audio" | "document" =
        type === "image" ? "image" : "document";

      const newMessage = await sendMessage(
        conversation._id,
        uploaded.fileName,
        backendMessageType,
        uploaded.url,
      );

      if (newMessage) {
        setMessages((prev) => [...prev, newMessage]);
        setTimeout(
          () => flatListRef.current?.scrollToEnd({ animated: true }),
          100,
        );
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Upload failed",
        text2: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePickImage = async () => {
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photo library.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const fileName = asset.uri.split("/").pop() || "image.jpg";
    const mimeType = asset.mimeType || "image/jpeg";
    await handleUploadAndSend(asset.uri, mimeType, fileName, "image");
  };

  const handleTakePhoto = async () => {
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your camera.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await handleUploadAndSend(
      asset.uri,
      "image/jpeg",
      `photo_${Date.now()}.jpg`,
      "image",
    );
  };

  const handlePickDocument = async () => {
    setShowAttachMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType || "application/octet-stream";
      await handleUploadAndSend(asset.uri, mimeType, asset.name, "document");
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Could not open file picker",
        text2: error.message,
      });
    }
  };

  // ─── Video call handlers ────────────────────────────────────────────────────
  const handleRequestVideoCall = async () => {
    if (!conversation || appointmentEnded) return;
    if (conversation.activeVideoRequest?.status === "pending") {
      Toast.show({
        type: "info",
        text1: "Request Pending",
        text2: "A video call request is already active",
      });
      return;
    }
    try {
      const request = await requestVideoCall(conversation._id);
      if (request) {
        setOutgoingVideoRequest(request);
        Toast.show({
          type: "success",
          text1: "Request Sent",
          text2: "Waiting for response...",
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Request Failed",
        text2: error.message,
      });
    }
  };

  const handleRespondToVideoRequest = async (accept: boolean) => {
    if (!conversation || !incomingVideoRequest) return;
    try {
      const response = await respondToVideoCall(
        conversation._id,
        incomingVideoRequest._id!,
        accept,
      );
      if (response && accept) {
        Toast.show({
          type: "success",
          text1: "Joining Call",
          text2: "Connecting...",
        });
        setTimeout(() => {
          navigation.navigate("VideoCallScreen", {
            appointmentId: response.appointmentId,
            name: otherParticipantName,
            patientId: conversation.participants.userId._id,
            role: isDoctor ? "doctor" : "user",
            autoJoin: true,
          });
        }, 500);
      }
      setVideoRequestModal(false);
      setIncomingVideoRequest(null);
      loadConversation();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Response Failed",
        text2: error.message,
      });
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
      Toast.show({
        type: "error",
        text1: "Cancel Failed",
        text2: error.message,
      });
    }
  };

  // ─── Render message ─────────────────────────────────────────────────────────
  const renderMessage = ({ item }: { item: IMessage }) => {
    const isOwn = item.senderId === currentUserId;
    const isSystem = item.messageType === "system";
    const isImage = item.messageType === "image" && !!item.mediaUrl;
    const isDoc =
      (item.messageType === "audio" || item.messageType === "document") &&
      !!item.mediaUrl;

    if (isSystem) {
      return (
        <View style={styles.systemMsgContainer}>
          <Text style={styles.systemMsgText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isOwn ? styles.ownRow : styles.otherRow]}>
        <View
          style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}
        >
          {isImage && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => item.mediaUrl && Linking.openURL(item.mediaUrl)}
            >
              <Image
                source={{ uri: item.mediaUrl }}
                style={styles.imageMsg}
                resizeMode="cover"
              />
              {item.content && item.content !== item.mediaUrl && (
                <Text
                  style={[
                    styles.msgText,
                    isOwn ? styles.ownText : styles.otherText,
                    { marginTop: 4 },
                  ]}
                >
                  {item.content}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {isDoc && (
            <TouchableOpacity
              style={styles.docContainer}
              activeOpacity={0.8}
              onPress={() => item.mediaUrl && Linking.openURL(item.mediaUrl)}
            >
              <View style={[styles.docIconBox, isOwn && styles.docIconBoxOwn]}>
                <Ionicons
                  name="document-text"
                  size={24}
                  color={isOwn ? "#fff" : "#D81E5B"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.docName,
                    isOwn ? styles.ownText : styles.otherText,
                  ]}
                  numberOfLines={2}
                >
                  {item.content}
                </Text>
                <Text
                  style={[
                    styles.docTap,
                    isOwn ? { color: "#FFE0EB" } : { color: "#999" },
                  ]}
                >
                  Tap to open
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {!isImage && !isDoc && (
            <Text
              style={[
                styles.msgText,
                isOwn ? styles.ownText : styles.otherText,
              ]}
            >
              {item.content}
            </Text>
          )}

          <View style={styles.msgFooter}>
            <Text
              style={[
                styles.msgTime,
                isOwn ? styles.ownTime : styles.otherTime,
              ]}
            >
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {isOwn && (
              <Ionicons
                name={
                  item.status === "read"
                    ? "checkmark-done"
                    : item.status === "delivered"
                      ? "checkmark-done-outline"
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

  // ─── Loading screen ─────────────────────────────────────────────────────────
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

  // ─── Main render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="#111" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerInfo}>
          <Image
            source={{ uri: otherParticipantImage }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.headerName}>{otherParticipantName}</Text>
            {otherUserTyping && !appointmentEnded && (
              <Text style={styles.typingIndicator}>typing...</Text>
            )}
            {appointmentEnded && (
              <Text style={styles.endedBadge}>Appointment Ended</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Video call button — hidden when ended */}
        {!appointmentEnded && (
          <TouchableOpacity
            style={styles.videoButton}
            onPress={handleRequestVideoCall}
            disabled={!!outgoingVideoRequest}
          >
            <Ionicons
              name="videocam"
              size={24}
              color={outgoingVideoRequest ? "#999" : "#D81E5B"}
            />
          </TouchableOpacity>
        )}

        {/* End Appointment button — Doctor only, hidden when already ended */}
        {isDoctor && !appointmentEnded && (
          <TouchableOpacity
            style={styles.endButton}
            onPress={handleEndAppointment}
            disabled={endingAppointment}
          >
            {endingAppointment ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.endButtonText}>End</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── Outgoing call banner ── */}
      {outgoingVideoRequest && (
        <View style={styles.requestBanner}>
          <View style={styles.requestBannerContent}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.requestBannerText}>
              Waiting for response... ({requestCountdown}s)
            </Text>
          </View>
          <TouchableOpacity onPress={handleCancelVideoRequest}>
            <Text style={styles.requestBannerCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Upload progress banner ── */}
      {uploading && (
        <View style={styles.uploadBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.uploadBannerText}>Uploading file...</Text>
        </View>
      )}

      {/* ── Ended banner — visible to both parties ── */}
      {appointmentEnded && (
        <View style={styles.endedBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.endedBannerText}>
            {isDoctor
              ? "You ended this appointment. The chat is now read-only."
              : "This appointment has ended. The chat is now read-only."}
          </Text>
        </View>
      )}

      {/* ── Messages + Input ── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          }
        />

        {/* ── Attachment menu — hidden when ended ── */}
        {showAttachMenu && !appointmentEnded && (
          <View style={styles.attachMenu}>
            <TouchableOpacity
              style={styles.attachOption}
              onPress={handlePickImage}
            >
              <View
                style={[styles.attachIconBox, { backgroundColor: "#E8F5E9" }]}
              >
                <Ionicons name="image" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.attachLabel}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.attachOption}
              onPress={handleTakePhoto}
            >
              <View
                style={[styles.attachIconBox, { backgroundColor: "#E3F2FD" }]}
              >
                <Ionicons name="camera" size={24} color="#2196F3" />
              </View>
              <Text style={styles.attachLabel}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.attachOption}
              onPress={handlePickDocument}
            >
              <View
                style={[styles.attachIconBox, { backgroundColor: "#FFF3E0" }]}
              >
                <Ionicons name="document-text" size={24} color="#FF9800" />
              </View>
              <Text style={styles.attachLabel}>Document</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Input bar OR read-only footer ── */}
        {appointmentEnded ? (
          // Read-only footer shown to both parties
          <View
            style={[styles.endedFooter, { paddingBottom: insets.bottom + 8 }]}
          >
            <Ionicons name="lock-closed" size={16} color="#999" />
            <Text style={styles.endedFooterText}>
              This chat is now read-only
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.inputContainer,
              { paddingBottom: insets.bottom + 8 },
            ]}
          >
            <TouchableOpacity
              style={styles.attachButton}
              onPress={() => setShowAttachMenu((v) => !v)}
            >
              <Ionicons
                name={showAttachMenu ? "close" : "attach"}
                size={24}
                color="#D81E5B"
              />
            </TouchableOpacity>

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
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── Incoming video call modal ── */}
      <Modal
        visible={videoRequestModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!incomingVideoRequest) setVideoRequestModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.videoRequestModal}>
            <View style={styles.videoRequestHeader}>
              <Ionicons name="videocam" size={48} color="#D81E5B" />
              <Text style={styles.videoRequestTitle}>Video Call Request</Text>
              <Text style={styles.videoRequestSubtitle}>
                {otherParticipantName} wants to start a video call
              </Text>
              <Text style={styles.videoRequestCountdown}>
                Expires in {requestCountdown}s
              </Text>
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F5F5" },
  flex: { flex: 1 },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 16, color: "#666" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: { marginRight: 12 },
  headerInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
  },
  headerName: { fontSize: 16, fontWeight: "700", color: "#111" },
  typingIndicator: { fontSize: 12, color: "#4FC3F7", fontStyle: "italic" },
  endedBadge: { fontSize: 11, color: "#6B7280", fontStyle: "italic" },
  videoButton: { padding: 8 },

  // ── End appointment button ──────────────────────────────────────────────────
  endButton: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  endButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // ── Ended banner ────────────────────────────────────────────────────────────
  endedBanner: {
    backgroundColor: "#6B7280",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  endedBannerText: { color: "#fff", fontSize: 13, fontWeight: "600", flex: 1 },

  // ── Ended footer (replaces input bar) ───────────────────────────────────────
  endedFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  endedFooterText: { color: "#999", fontSize: 14 },

  requestBanner: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requestBannerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  requestBannerText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  requestBannerCancel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  uploadBanner: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  uploadBannerText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#999", marginTop: 16 },
  emptySubtext: { fontSize: 14, color: "#BBB", marginTop: 4 },

  systemMsgContainer: { alignItems: "center", marginVertical: 12 },
  systemMsgText: {
    fontSize: 12,
    color: "#999",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    textAlign: "center",
  },

  msgRow: { marginVertical: 4, maxWidth: "78%" },
  ownRow: { alignSelf: "flex-end" },
  otherRow: { alignSelf: "flex-start" },

  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  ownBubble: { backgroundColor: "#D81E5B", borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },

  msgText: { fontSize: 15, lineHeight: 20 },
  ownText: { color: "#fff" },
  otherText: { color: "#111" },

  msgFooter: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  msgTime: { fontSize: 11 },
  ownTime: { color: "#FFE0EB" },
  otherTime: { color: "#999" },

  imageMsg: {
    width: 220,
    height: 180,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
  },

  docContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 180,
    maxWidth: 240,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FFF0F6",
    justifyContent: "center",
    alignItems: "center",
  },
  docIconBoxOwn: { backgroundColor: "rgba(255,255,255,0.25)" },
  docName: { fontSize: 13, fontWeight: "600", flexWrap: "wrap" },
  docTap: { fontSize: 11, marginTop: 2 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 8,
  },
  attachButton: { padding: 8, justifyContent: "center", alignItems: "center" },
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
  sendButtonDisabled: { backgroundColor: "#CCC" },

  attachMenu: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  attachOption: { alignItems: "center", gap: 6 },
  attachIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  attachLabel: { fontSize: 11, fontWeight: "600", color: "#555" },

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
  videoRequestHeader: { alignItems: "center", marginBottom: 24 },
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
  videoRequestCountdown: { fontSize: 13, color: "#999", marginTop: 8 },
  videoRequestActions: { flexDirection: "row", gap: 12 },
  videoRequestButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  declineButton: { backgroundColor: "#F44336" },
  acceptButton: { backgroundColor: "#4CAF50" },
  videoRequestButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
