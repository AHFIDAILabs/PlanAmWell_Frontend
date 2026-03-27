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
import {
  RouteProp,
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import { AppStackParamList } from "../types/App";
import { IConversation, IMessage, IVideoCallRequest } from "../types/backendType";
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
  unlockConversation,
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

  const { appointmentId } = route.params;

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
  const [incomingVideoRequest, setIncomingVideoRequest] = useState<IVideoCallRequest | null>(null);
  const [outgoingVideoRequest, setOutgoingVideoRequest] = useState<IVideoCallRequest | null>(null);
  const [requestCountdown, setRequestCountdown] = useState(60);
  const [isLocked, setIsLocked] = useState(false);
  const [endingAppointment, setEndingAppointment] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // isLockedRef mirrors isLocked for use inside socket handlers (avoids stale closure)
  const isLockedRef = useRef(false);

  // hasMountedRef: prevents useFocusEffect from firing a reload on the very first
  // mount (the mount useEffect handles the first load)
  const hasMountedRef = useRef(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserId = user?._id;
  const isDoctor = userRole === "Doctor";

  // Keep isLockedRef in sync
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  // ─── Derived state ────────────────────────────────────────────────────────────
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

  // ─── loadConversation ─────────────────────────────────────────────────────────
  // The ONLY function that sets lock state. Always trusts server's isActive.
  const loadConversation = useCallback(async () => {
    try {
      setLoading(true);
      if (!appointmentId) {
        Toast.show({ type: "error", text1: "Cannot open chat", text2: "Missing appointment information" });
        return;
      }
      const conv = await getOrCreateConversation(appointmentId);
      if (conv) {
        setConversation(conv);
        setMessages([...conv.messages]);

        // Server's isActive is the single source of truth — always apply it
        const locked = !conv.isActive;
        isLockedRef.current = locked;
        setIsLocked(locked);

        await markMessagesAsRead(conv._id);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 150);
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Failed to load chat", text2: error.message });
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  // ─── Mount: load once ─────────────────────────────────────────────────────────
  // Fires exactly once. Sets hasMountedRef = true after completion so
  // useFocusEffect knows the first load is done and can take over on refocus.
  useEffect(() => {
    loadConversation().then(() => {
      hasMountedRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty array = mount only, intentional

  // ─── Focus: reload from server on every return to this screen ────────────────
  // Skips the first mount focus (hasMountedRef guards it).
  // This is what keeps lock state correct after navigating to/from note editor,
  // video call screen, or any other screen.
  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) return;
      loadConversation();
    }, [loadConversation])
  );

  // ─── Socket: join room ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversation) return;
    socketService.joinAppointment(appointmentId);
    return () => { socketService.leaveAppointment(appointmentId); };
  }, [conversation, appointmentId]);

  // ─── Socket: listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversation) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewMessage = (data: { conversationId: string; message: IMessage }) => {
      if (data.conversationId !== conversation._id) return;
      setMessages((prev) => [...prev, data.message]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      markMessagesAsRead(conversation._id);
    };

    const handleTyping = (data: { conversationId: string; isTyping: boolean; senderRole: string }) => {
      if (data.conversationId === conversation._id && data.senderRole !== userRole) {
        setOtherUserTyping(data.isTyping);
      }
    };

    const handleMessagesRead = (data: { conversationId: string }) => {
      if (data.conversationId !== conversation._id) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.senderId === currentUserId ? { ...msg, status: "read" as const } : msg
        )
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
        Toast.show({ type: "success", text1: "Call Accepted", text2: "Connecting..." });
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

    // Backend emits this when doctor calls endAppointment
    const handleAppointmentEnded = (data: { appointmentId: string }) => {
      if (data.appointmentId !== appointmentId) return;
      isLockedRef.current = true;
      setIsLocked(true);
      setConversation((prev) => (prev ? { ...prev, isActive: false } : prev));
      Toast.show({
        type: "info",
        text1: "Appointment Ended",
        text2: isDoctor
          ? "You have ended this appointment. Chat is now read-only."
          : "This appointment has been ended by your doctor.",
      });
    };

    // Backend emits this when a new appointment is confirmed (auto-unlock)
    const handleConversationUnlocked = (data: { conversationId: string }) => {
      if (data.conversationId !== conversation._id) return;
      isLockedRef.current = false;
      setIsLocked(false);
      setConversation((prev) => (prev ? { ...prev, isActive: true } : prev));
      Toast.show({
        type: "success",
        text1: "Chat Unlocked",
        text2: "A new appointment has been confirmed. You can chat again.",
      });
      loadConversation();
    };

    socket.on("new-message", handleNewMessage);
    socket.on("typing-indicator", handleTyping);
    socket.on("messages-read", handleMessagesRead);
    socket.on("video-call-request", handleVideoRequest);
    socket.on("video-call-response", handleVideoResponse);
    socket.on("appointment-ended", handleAppointmentEnded);
    socket.on("conversation-unlocked", handleConversationUnlocked);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("typing-indicator", handleTyping);
      socket.off("messages-read", handleMessagesRead);
      socket.off("video-call-request", handleVideoRequest);
      socket.off("video-call-response", handleVideoResponse);
      socket.off("appointment-ended", handleAppointmentEnded);
      socket.off("conversation-unlocked", handleConversationUnlocked);
    };
  }, [conversation, currentUserId, userRole, appointmentId, navigation, loadConversation, otherParticipantName, isDoctor]);

  // ─── Video request countdown ──────────────────────────────────────────────────
  useEffect(() => {
    if (!conversation?.activeVideoRequest) return;
    const expiresAt = new Date(conversation.activeVideoRequest.expiresAt).getTime();
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
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

  // ─── End Appointment ──────────────────────────────────────────────────────────
  const handleEndAppointment = () => {
    Alert.alert(
      "End Appointment",
      "Are you sure? The chat will become read-only. You can unlock it manually or it will auto-unlock when a new appointment is confirmed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Appointment",
          style: "destructive",
          onPress: async () => {
            try {
              setEndingAppointment(true);
              await endAppointment(appointmentId);

              // Lock immediately (socket event is also coming — idempotent)
              isLockedRef.current = true;
              setIsLocked(true);
              setConversation((prev) => (prev ? { ...prev, isActive: false } : prev));

              const patientId =
                conversation?.participants?.userId?._id ||
                (conversation?.participants?.userId as any)?._id;
              const patientName =
                (conversation?.participants?.userId as any)?.name || "Patient";

              if (patientId) {
                setTimeout(() => {
                  Alert.alert(
                    "Write Consultation Note?",
                    "Would you like to write a consultation note for this patient?",
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
                    ]
                  );
                }, 600);
              }
            } catch (error: any) {
              Toast.show({ type: "error", text1: "Failed to end appointment", text2: error.message });
            } finally {
              setEndingAppointment(false);
            }
          },
        },
      ]
    );
  };

  // ─── Manual Unlock ────────────────────────────────────────────────────────────
  const handleUnlockConversation = () => {
    Alert.alert(
      "Unlock Chat",
      "This will reopen the chat so both you and the patient can send messages again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock",
          onPress: async () => {
            if (!conversation) return;
            try {
              setUnlocking(true);
              await unlockConversation(conversation._id);
              isLockedRef.current = false;
              setIsLocked(false);
              setConversation((prev) => (prev ? { ...prev, isActive: true } : prev));
              await loadConversation();
              Toast.show({ type: "success", text1: "Chat unlocked." });
            } catch (error: any) {
              Toast.show({ type: "error", text1: "Failed to unlock chat", text2: error.message });
            } finally {
              setUnlocking(false);
            }
          },
        },
      ]
    );
  };

  // ─── Send message ─────────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!inputText.trim() || !conversation || sending || isLocked) return;
    const messageText = inputText.trim();
    setInputText("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateTypingIndicator(conversation._id, false);
    setIsTyping(false);
    try {
      setSending(true);
      const newMessage = await sendMessage(conversation._id, messageText, "text");
      if (newMessage) {
        setMessages((prev) => [...prev, newMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Failed to send message", text2: error.message });
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (!conversation || isLocked) return;
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

  // ─── Upload helpers ───────────────────────────────────────────────────────────
  const handleUploadAndSend = async (uri: string, mimeType: string, fileName: string, type: "image" | "document") => {
    if (!conversation || isLocked) return;
    setShowAttachMenu(false);
    try {
      setUploading(true);
      const uploaded = await uploadChatFile(uri, mimeType, fileName);
      if (!uploaded) throw new Error("Upload returned empty response");
      const backendType: "image" | "audio" | "document" = type === "image" ? "image" : "document";
      const newMessage = await sendMessage(conversation._id, uploaded.fileName, backendType, uploaded.url);
      if (newMessage) {
        setMessages((prev) => [...prev, newMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Upload failed", text2: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handlePickImage = async () => {
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Please allow access to your photo library."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await handleUploadAndSend(asset.uri, asset.mimeType || "image/jpeg", asset.uri.split("/").pop() || "image.jpg", "image");
  };

  const handleTakePhoto = async () => {
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Please allow access to your camera."); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    await handleUploadAndSend(result.assets[0].uri, "image/jpeg", `photo_${Date.now()}.jpg`, "image");
  };

  const handlePickDocument = async () => {
    setShowAttachMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      await handleUploadAndSend(asset.uri, asset.mimeType || "application/octet-stream", asset.name, "document");
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Could not open file picker", text2: error.message });
    }
  };

  // ─── Video call handlers ──────────────────────────────────────────────────────
  const handleRequestVideoCall = async () => {
    if (!conversation || isLocked) return;
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
      const response = await respondToVideoCall(conversation._id, incomingVideoRequest._id!, accept);
      if (response && accept) {
        Toast.show({ type: "success", text1: "Joining Call", text2: "Connecting..." });
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

  // ─── Render message ───────────────────────────────────────────────────────────
  const renderMessage = ({ item }: { item: IMessage }) => {
    const isOwn = item.senderId === currentUserId;
    const isSystem = item.messageType === "system";
    const isImage = item.messageType === "image" && !!item.mediaUrl;
    const isDoc = (item.messageType === "audio" || item.messageType === "document") && !!item.mediaUrl;

    if (isSystem) {
      return (
        <View style={styles.systemMsgContainer}>
          <Text style={styles.systemMsgText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isOwn ? styles.ownRow : styles.otherRow]}>
        <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
          {isImage && (
            <TouchableOpacity activeOpacity={0.85} onPress={() => item.mediaUrl && Linking.openURL(item.mediaUrl)}>
              <Image source={{ uri: item.mediaUrl }} style={styles.imageMsg} resizeMode="cover" />
              {item.content && item.content !== item.mediaUrl && (
                <Text style={[styles.msgText, isOwn ? styles.ownText : styles.otherText, { marginTop: 4 }]}>{item.content}</Text>
              )}
            </TouchableOpacity>
          )}
          {isDoc && (
            <TouchableOpacity style={styles.docContainer} activeOpacity={0.8} onPress={() => item.mediaUrl && Linking.openURL(item.mediaUrl)}>
              <View style={[styles.docIconBox, isOwn && styles.docIconBoxOwn]}>
                <Ionicons name="document-text" size={24} color={isOwn ? "#fff" : "#D81E5B"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.docName, isOwn ? styles.ownText : styles.otherText]} numberOfLines={2}>{item.content}</Text>
                <Text style={[styles.docTap, isOwn ? { color: "#FFE0EB" } : { color: "#999" }]}>Tap to open</Text>
              </View>
            </TouchableOpacity>
          )}
          {!isImage && !isDoc && (
            <Text style={[styles.msgText, isOwn ? styles.ownText : styles.otherText]}>{item.content}</Text>
          )}
          <View style={styles.msgFooter}>
            <Text style={[styles.msgTime, isOwn ? styles.ownTime : styles.otherTime]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
            {isOwn && (
              <Ionicons
                name={item.status === "read" ? "checkmark-done" : item.status === "delivered" ? "checkmark-done-outline" : "checkmark"}
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
            {otherUserTyping && !isLocked && <Text style={styles.typingIndicator}>typing...</Text>}
            {isLocked && <Text style={styles.endedBadge}>Chat locked</Text>}
          </View>
        </TouchableOpacity>

        {!isLocked && (
          <TouchableOpacity style={styles.videoButton} onPress={handleRequestVideoCall} disabled={!!outgoingVideoRequest}>
            <Ionicons name="videocam" size={24} color={outgoingVideoRequest ? "#999" : "#D81E5B"} />
          </TouchableOpacity>
        )}

        {isDoctor && !isLocked && (
          <TouchableOpacity style={styles.endButton} onPress={handleEndAppointment} disabled={endingAppointment}>
            {endingAppointment
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.endButtonText}>End</Text>}
          </TouchableOpacity>
        )}
        {isDoctor && isLocked && (
          <TouchableOpacity style={styles.unlockButton} onPress={handleUnlockConversation} disabled={unlocking}>
            {unlocking
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="lock-open-outline" size={14} color="#fff" /><Text style={styles.unlockButtonText}>Unlock</Text></>}
          </TouchableOpacity>
        )}
      </View>

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

      {uploading && (
        <View style={styles.uploadBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.uploadBannerText}>Uploading file...</Text>
        </View>
      )}

      {isLocked && (
        <View style={styles.endedBanner}>
          <Ionicons name="lock-closed" size={16} color="#fff" />
          <Text style={styles.endedBannerText}>
            {isDoctor
              ? "Appointment ended. Chat is read-only. Tap Unlock to reopen."
              : "This appointment has ended. The chat is read-only."}
          </Text>
        </View>
      )}

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
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          }
        />

        {showAttachMenu && !isLocked && (
          <View style={styles.attachMenu}>
            <TouchableOpacity style={styles.attachOption} onPress={handlePickImage}>
              <View style={[styles.attachIconBox, { backgroundColor: "#E8F5E9" }]}>
                <Ionicons name="image" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.attachLabel}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={handleTakePhoto}>
              <View style={[styles.attachIconBox, { backgroundColor: "#E3F2FD" }]}>
                <Ionicons name="camera" size={24} color="#2196F3" />
              </View>
              <Text style={styles.attachLabel}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={handlePickDocument}>
              <View style={[styles.attachIconBox, { backgroundColor: "#FFF3E0" }]}>
                <Ionicons name="document-text" size={24} color="#FF9800" />
              </View>
              <Text style={styles.attachLabel}>Document</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLocked ? (
          <View style={[styles.endedFooter, { paddingBottom: insets.bottom + 8 }]}>
            <Ionicons name="lock-closed" size={16} color="#999" />
            <Text style={styles.endedFooterText}>
              {isDoctor ? "Chat locked — tap Unlock to reopen" : "This chat is read-only"}
            </Text>
          </View>
        ) : (
          <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity style={styles.attachButton} onPress={() => setShowAttachMenu((v) => !v)}>
              <Ionicons name={showAttachMenu ? "close" : "attach"} size={24} color="#D81E5B" />
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
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal visible={videoRequestModal} animationType="slide" transparent onRequestClose={() => { if (!incomingVideoRequest) setVideoRequestModal(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.videoRequestModal}>
            <View style={styles.videoRequestHeader}>
              <Ionicons name="videocam" size={48} color="#D81E5B" />
              <Text style={styles.videoRequestTitle}>Video Call Request</Text>
              <Text style={styles.videoRequestSubtitle}>{otherParticipantName} wants to start a video call</Text>
              <Text style={styles.videoRequestCountdown}>Expires in {requestCountdown}s</Text>
            </View>
            <View style={styles.videoRequestActions}>
              <TouchableOpacity style={[styles.videoRequestButton, styles.declineButton]} onPress={() => handleRespondToVideoRequest(false)}>
                <Ionicons name="close-circle" size={24} color="#fff" />
                <Text style={styles.videoRequestButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.videoRequestButton, styles.acceptButton]} onPress={() => handleRespondToVideoRequest(true)}>
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
  screen: { flex: 1, backgroundColor: "#F5F5F5" },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 16, color: "#666" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E0E0E0" },
  backButton: { marginRight: 12 },
  headerInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E0E0E0" },
  headerName: { fontSize: 16, fontWeight: "700", color: "#111" },
  typingIndicator: { fontSize: 12, color: "#4FC3F7", fontStyle: "italic" },
  endedBadge: { fontSize: 11, color: "#EF4444", fontStyle: "italic" },
  videoButton: { padding: 8 },
  endButton: { backgroundColor: "#EF4444", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 8, minWidth: 44, alignItems: "center", justifyContent: "center" },
  endButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  unlockButton: { backgroundColor: "#16A34A", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8, flexDirection: "row", alignItems: "center", gap: 4 },
  unlockButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  endedBanner: { backgroundColor: "#374151", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  endedBannerText: { color: "#fff", fontSize: 13, fontWeight: "600", flex: 1 },
  endedFooter: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 16, paddingTop: 14, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#E0E0E0" },
  endedFooterText: { color: "#999", fontSize: 14 },
  requestBanner: { backgroundColor: "#4CAF50", paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  requestBannerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  requestBannerText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  requestBannerCancel: { color: "#fff", fontSize: 14, fontWeight: "700", textDecorationLine: "underline" },
  uploadBanner: { backgroundColor: "#FF9800", paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  uploadBannerText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  messagesList: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 8 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#999", marginTop: 16 },
  emptySubtext: { fontSize: 14, color: "#BBB", marginTop: 4 },
  systemMsgContainer: { alignItems: "center", marginVertical: 12 },
  systemMsgText: { fontSize: 12, color: "#999", backgroundColor: "#F0F0F0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, textAlign: "center" },
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
  imageMsg: { width: 220, height: 180, borderRadius: 12, backgroundColor: "#E0E0E0" },
  docContainer: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 180, maxWidth: 240 },
  docIconBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#FFF0F6", justifyContent: "center", alignItems: "center" },
  docIconBoxOwn: { backgroundColor: "rgba(255,255,255,0.25)" },
  docName: { fontSize: 13, fontWeight: "600", flexWrap: "wrap" },
  docTap: { fontSize: 11, marginTop: 2 },
  inputContainer: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 10, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#E0E0E0", gap: 8 },
  attachButton: { padding: 8, justifyContent: "center", alignItems: "center" },
  input: { flex: 1, backgroundColor: "#F5F5F5", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, color: "#111" },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#D81E5B", justifyContent: "center", alignItems: "center" },
  sendButtonDisabled: { backgroundColor: "#CCC" },
  attachMenu: { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingVertical: 14, paddingHorizontal: 20 },
  attachOption: { alignItems: "center", gap: 6 },
  attachIconBox: { width: 52, height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  attachLabel: { fontSize: 11, fontWeight: "600", color: "#555" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  videoRequestModal: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400 },
  videoRequestHeader: { alignItems: "center", marginBottom: 24 },
  videoRequestTitle: { fontSize: 20, fontWeight: "700", color: "#111", marginTop: 16 },
  videoRequestSubtitle: { fontSize: 15, color: "#666", marginTop: 8, textAlign: "center" },
  videoRequestCountdown: { fontSize: 13, color: "#999", marginTop: 8 },
  videoRequestActions: { flexDirection: "row", gap: 12 },
  videoRequestButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  declineButton: { backgroundColor: "#F44336" },
  acceptButton: { backgroundColor: "#4CAF50" },
  videoRequestButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});