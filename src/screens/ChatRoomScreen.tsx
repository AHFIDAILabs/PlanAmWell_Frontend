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
  Share,
  Pressable,
  AppState,
  AppStateStatus,
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
import { Audio, AVPlaybackStatus } from "expo-av";

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
  editMessageService,
  deleteMessageService,
} from "../services/Chat";
import { endAppointment } from "../services/Appointment";
import { getDoctorImageUri } from "../services/Doctor";
import { messageQueueService } from "../services/messageQueueService";

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

  // Message actions
  const [selectedMessage, setSelectedMessage] = useState<IMessage | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<IMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<IMessage | null>(null);

  // Voice notes
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0–1, current message only
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Mirrors isLocked for use inside socket handlers (avoids stale closure)
  const isLockedRef = useRef(false);

  // Stop any in-flight recording/playback when leaving the screen
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  // Prevents useFocusEffect from double-firing on the very first mount
  const hasMountedRef = useRef(false);

  // Holds the conversation ID for socket handlers that run before
  // the `conversation` state settles — avoids stale closure mismatches
  const conversationIdRef = useRef<string | null>(null);

  // Holds the patient's user ID for use inside socket handlers (stale closure safe)
  const patientIdRef = useRef<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUserId = user?._id;
  const isDoctor = userRole === "Doctor";

  // Keep isLockedRef in sync with isLocked state
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  // ─── Offline queue flush ───────────────────────────────────────────────────
  // Flushes pending messages for this conversation when the app returns to the
  // foreground or when this screen gains focus after being away.
  const flushQueueRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    flushQueueRef.current = async () => {
      const convId = conversationIdRef.current;
      if (!convId) return;
      const queued = await messageQueueService.getForConversation(convId);
      if (queued.length === 0) return;
      for (const item of queued) {
        try {
          const sent = await sendMessage(
            item.conversationId,
            item.content,
            item.messageType,
            item.mediaUrl,
            item.replyTo as any,
          );
          if (sent) {
            await messageQueueService.remove(item.tempId);
            setMessages(prev =>
              dedupeMessages(prev.map(m => m._id === item.tempId ? sent : m))
            );
          }
        } catch {
          break; // still offline — stop and wait for next flush
        }
      }
    };
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') flushQueueRef.current?.();
    });
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      flushQueueRef.current?.();
    }, [])
  );

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
  const loadConversation = useCallback(async () => {
    try {
      setLoading(true);
      if (!appointmentId) {
        Toast.show({
          type: "error",
          text1: "Cannot open chat",
          text2: "Missing appointment information",
        });
        return;
      }

      const conv = await getOrCreateConversation(appointmentId);
      if (conv) {
        setConversation(conv);
        conversationIdRef.current = conv._id; // ← keep ref in sync immediately
        patientIdRef.current = String((conv.participants?.userId as any)?._id || '');

        // Replace messages wholesale on a full reload — de-dupe by _id
        setMessages(dedupeMessages([...conv.messages]));

        const locked = !conv.isActive;
        isLockedRef.current = locked;
        setIsLocked(locked);

        await markMessagesAsRead(conv._id);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 150);
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

  // ─── Mount: load once ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadConversation().then(() => {
      hasMountedRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Focus: reload from server on every return to this screen ────────────────
  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) return;
      loadConversation();
    }, [loadConversation])
  );

  // ─── Socket: join/leave appointment room ─────────────────────────────────────
  // Join as soon as we know the appointmentId (not gated on conversation state),
  // so the appointment-ended event arrives even before the conversation loads.
  useEffect(() => {
    socketService.joinAppointment(appointmentId);
    return () => {
      socketService.leaveAppointment(appointmentId);
    };
  }, [appointmentId]); // ← was gated on `conversation` — now fires immediately

  // ─── Socket: listeners ────────────────────────────────────────────────────────
  // NOTE: This effect only depends on stable values (refs, appointmentId, userRole)
  // so it never tears down/re-registers mid-conversation.  The conversationIdRef
  // lets us filter messages without capturing a stale `conversation` object.
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // ── FIX: De-duplicate on arrival using message _id ─────────────────────
    // The double-message bug happened because handleSendMessage added the
    // message optimistically AND the socket event added it again.
    // Solution: the server's new-message event is now the ONLY source for
    // incoming messages from the OTHER party.  Our own sends are added
    // optimistically but only if the _id isn't already present.
    const handleNewMessage = (data: {
      conversationId: string;
      message: IMessage;
    }) => {
      // Filter by conversation — use ref so this never becomes stale
      if (data.conversationId !== conversationIdRef.current) return;

      setMessages((prev) => {
        // Skip if we already have this message (optimistic add)
        if (prev.some((m) => m._id === data.message._id)) return prev;
        return [...prev, data.message];
      });

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      if (conversationIdRef.current) {
        markMessagesAsRead(conversationIdRef.current);
      }
    };

    const handleTyping = (data: {
      conversationId: string;
      isTyping: boolean;
      senderRole: string;
    }) => {
      if (
        data.conversationId === conversationIdRef.current &&
        data.senderRole !== userRole
      ) {
        setOtherUserTyping(data.isTyping);
      }
    };

    const handleMessagesRead = (data: { conversationId: string }) => {
      if (data.conversationId !== conversationIdRef.current) return;
      setMessages((prev) =>
        prev.map((msg) =>
          String(msg.senderId) === String(currentUserId)
            ? { ...msg, status: "read" as const }
            : msg
        )
      );
    };

    const handleVideoRequest = (data: { conversationId: string }) => {
      if (data.conversationId !== conversationIdRef.current) return;
      loadConversation().then(() => setVideoRequestModal(true));
    };

    const handleVideoResponse = (data: {
      conversationId: string;
      status: "accepted" | "declined" | "expired" | "cancelled";
      callType?: "audio" | "video";
    }) => {
      if (data.conversationId !== conversationIdRef.current) return;
      if (data.status === "accepted") {
        Toast.show({ type: "success", text1: "Call Accepted", text2: "Connecting..." });
        setTimeout(() => {
          navigation.navigate("VideoCallScreen", {
            appointmentId,
            name: otherParticipantName,
            patientId: patientIdRef.current || '',
            role: isDoctor ? "doctor" : "user",
            autoJoin: true,
            callType: data.callType,
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

    // ── FIX: appointment-ended now fires on BOTH appointment room AND
    // user room (backend patch), so the patient always receives it.
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

    const handleConversationUnlocked = (data: { conversationId: string }) => {
      if (data.conversationId !== conversationIdRef.current) return;
      isLockedRef.current = false;
      setIsLocked(false);
      setConversation((prev) => (prev ? { ...prev, isActive: true } : prev));
      Toast.show({
        type: "success",
        text1: "Chat Unlocked",
        text2: "You can now send messages again.",
      });
      loadConversation();
    };

    const handleMessageEdited = (data: {
      conversationId: string;
      messageId: string;
      content: string;
      editedAt: string;
    }) => {
      if (data.conversationId !== conversationIdRef.current) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId
            ? { ...m, content: data.content, isEdited: true, editedAt: data.editedAt }
            : m
        )
      );
    };

    const handleMessageDeleted = (data: {
      conversationId: string;
      messageId: string;
    }) => {
      if (data.conversationId !== conversationIdRef.current) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId
            ? { ...m, isDeleted: true, content: "This message was deleted", mediaUrl: undefined }
            : m
        )
      );
    };

    socket.on("new-message", handleNewMessage);
    socket.on("typing-indicator", handleTyping);
    socket.on("messages-read", handleMessagesRead);
    socket.on("video-call-request", handleVideoRequest);
    socket.on("video-call-response", handleVideoResponse);
    socket.on("appointment-ended", handleAppointmentEnded);
    socket.on("conversation-unlocked", handleConversationUnlocked);
    socket.on("message-edited", handleMessageEdited);
    socket.on("message-deleted", handleMessageDeleted);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("typing-indicator", handleTyping);
      socket.off("messages-read", handleMessagesRead);
      socket.off("video-call-request", handleVideoRequest);
      socket.off("video-call-response", handleVideoResponse);
      socket.off("appointment-ended", handleAppointmentEnded);
      socket.off("conversation-unlocked", handleConversationUnlocked);
      socket.off("message-edited", handleMessageEdited);
      socket.off("message-deleted", handleMessageDeleted);
    };
  }, [
    // ← Stable deps only — no `conversation` object here.
    // conversationIdRef handles filtering without re-registering listeners.
    appointmentId,
    currentUserId,
    userRole,
    isDoctor,
    navigation,
    loadConversation,
    otherParticipantName,
  ]);

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
    if (String(request.requestedBy) === String(currentUserId)) {
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

              isLockedRef.current = true;
              setIsLocked(true);
              setConversation((prev) =>
                prev ? { ...prev, isActive: false } : prev
              );

              Toast.show({
                type: "info",
                text1: "Appointment Ended",
                text2: "Chat is now read-only.",
              });
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
              setConversation((prev) =>
                prev ? { ...prev, isActive: true } : prev
              );
              await loadConversation();
              Toast.show({ type: "success", text1: "Chat unlocked." });
            } catch (error: any) {
              Toast.show({
                type: "error",
                text1: "Failed to unlock chat",
                text2: error.message,
              });
            } finally {
              setUnlocking(false);
            }
          },
        },
      ]
    );
  };

  // ─── Navigate to Note Editor ──────────────────────────────────────────────────
  const handleOpenNoteEditor = () => {
    const patientId =
      conversation?.participants?.userId?._id ||
      (conversation?.participants?.userId as any)?._id;
    const patientName =
      (conversation?.participants?.userId as any)?.name || "Patient";

    if (!patientId) {
      Toast.show({
        type: "error",
        text1: "Cannot open notes",
        text2: "Patient information not available.",
      });
      return;
    }

    navigation.navigate("MedicalRecordEditorScreen", {
      appointmentId,
      patientId: String(patientId),
      patientName,
    });
  };

  // ─── Send message ─────────────────────────────────────────────────────────────
  // FIX: Optimistic add is removed. We call the API, get the saved message back
  // (with its real _id), add it once locally, and the socket echo is de-duped
  // in handleNewMessage by _id. No more double messages.
  // FIX: `sending` no longer drives a spinner on the send button — the button
  // just disables briefly. This eliminates the "rolling" UX.
  const handleSendMessage = async () => {
    if (!inputText.trim() || !conversation || isLockedRef.current) return;

    // ── Edit mode ──────────────────────────────────────────────────────────
    if (editingMessage) {
      const newContent = inputText.trim();
      setInputText("");
      setEditingMessage(null);
      try {
        await editMessageService(conversation._id, editingMessage._id.toString(), newContent);
        setMessages((prev) =>
          prev.map((m) =>
            m._id === editingMessage._id
              ? { ...m, content: newContent, isEdited: true }
              : m
          )
        );
      } catch (error: any) {
        Toast.show({ type: "error", text1: "Failed to edit message", text2: error.message });
        setEditingMessage(editingMessage);
        setInputText(newContent);
      }
      return;
    }

    // ── Normal send ────────────────────────────────────────────────────────
    if (sending) return;
    const messageText = inputText.trim();
    const currentReply = replyingTo;
    setInputText("");
    setReplyingTo(null);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateTypingIndicator(conversation._id, false);
    setIsTyping(false);

    // Optimistic add — shown immediately while we await the network
    const tempId = `pending_${Date.now()}`;
    const replyPayload = currentReply
      ? {
          messageId: currentReply._id.toString(),
          content: currentReply.isDeleted ? "This message was deleted" : currentReply.content,
          senderType: currentReply.senderType,
        }
      : undefined;

    const optimisticMsg: IMessage = {
      _id: tempId,
      senderId: String(currentUserId),
      senderType: isDoctor ? "Doctor" : "User",
      content: messageText,
      messageType: "text",
      status: "sent",
      createdAt: new Date().toISOString(),
      replyTo: replyPayload,
      _pending: true,
    };
    setMessages((prev) => dedupeMessages([...prev, optimisticMsg]));
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      setSending(true);
      const newMessage = await sendMessage(
        conversation._id,
        messageText,
        "text",
        undefined,
        replyPayload
      );
      if (newMessage) {
        // Replace optimistic bubble with real server message
        setMessages((prev) =>
          dedupeMessages(prev.map((m) => (m._id === tempId ? newMessage : m)))
        );
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (error: any) {
      const isNetworkError = !error.response;
      if (isNetworkError) {
        // Queue for later and keep the pending bubble in the UI
        await messageQueueService.enqueue({
          tempId,
          conversationId: conversation._id,
          content: messageText,
          messageType: "text",
          replyTo: replyPayload,
        });
        Toast.show({
          type: "info",
          text1: "No connection",
          text2: "Message queued — will send when you're back online.",
        });
      } else {
        // Server error — remove optimistic bubble and let user retry
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
        setInputText(messageText);
        if (currentReply) setReplyingTo(currentReply);
        Toast.show({ type: "error", text1: "Failed to send", text2: error.message });
      }
    } finally {
      setSending(false);
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (!conversation || isLockedRef.current) return;
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

  // ─── Message long-press actions ──────────────────────────────────────────────
  const handleLongPressMessage = (message: IMessage) => {
    if (message.messageType === "system" || message.isDeleted) return;
    setSelectedMessage(message);
    setShowMessageMenu(true);
  };

  const handleMenuReply = () => {
    setShowMessageMenu(false);
    setReplyingTo(selectedMessage);
    setEditingMessage(null);
  };

  const handleMenuCopy = async () => {
    setShowMessageMenu(false);
    if (!selectedMessage) return;
    try {
      await Share.share({ message: selectedMessage.content });
    } catch (_) {}
  };

  const handleMenuEdit = () => {
    setShowMessageMenu(false);
    if (!selectedMessage) return;
    setEditingMessage(selectedMessage);
    setInputText(selectedMessage.content);
    setReplyingTo(null);
  };

  const handleMenuDelete = () => {
    setShowMessageMenu(false);
    if (!selectedMessage || !conversation) return;
    Alert.alert(
      "Delete Message",
      "Delete this message for everyone?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMessageService(conversation._id, selectedMessage._id.toString());
              setMessages((prev) =>
                prev.map((m) =>
                  m._id === selectedMessage._id
                    ? { ...m, isDeleted: true, content: "This message was deleted", mediaUrl: undefined }
                    : m
                )
              );
            } catch (error: any) {
              Toast.show({ type: "error", text1: "Failed to delete", text2: error.message });
            }
          },
        },
      ]
    );
  };

  // ─── Upload helpers ───────────────────────────────────────────────────────────
  const handleUploadAndSend = async (
    uri: string,
    mimeType: string,
    fileName: string,
    type: "image" | "document" | "audio",
    displayLabel?: string
  ) => {
    if (!conversation || isLockedRef.current) return;
    setShowAttachMenu(false);
    try {
      setUploading(true);
      const uploaded = await uploadChatFile(uri, mimeType, fileName);
      if (!uploaded) throw new Error("Upload returned empty response");
      const backendType: "image" | "audio" | "document" =
        type === "image" ? "image" : type === "audio" ? "audio" : "document";
      const newMessage = await sendMessage(
        conversation._id,
        displayLabel || uploaded.fileName,
        backendType,
        uploaded.url
      );
      if (newMessage) {
        setMessages((prev) => dedupeMessages([...prev, newMessage]));
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
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await handleUploadAndSend(
      asset.uri,
      asset.mimeType || "image/jpeg",
      asset.uri.split("/").pop() || "image.jpg",
      "image"
    );
  };

  const handleTakePhoto = async () => {
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your camera.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    await handleUploadAndSend(
      result.assets[0].uri,
      "image/jpeg",
      `photo_${Date.now()}.jpg`,
      "image"
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
      await handleUploadAndSend(
        asset.uri,
        asset.mimeType || "application/octet-stream",
        asset.name,
        "document"
      );
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Could not open file picker",
        text2: error.message,
      });
    }
  };

  // ─── Voice notes ────────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (!conversation || isLockedRef.current || isRecording) return;
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow microphone access to send voice notes.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setRecordingDuration(0);
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Could not start recording", text2: error.message });
    }
  };

  const cancelRecording = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    const recording = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingDuration(0);
    try {
      await recording?.stopAndUnloadAsync();
    } catch {
      // Already stopped/unloaded — safe to ignore
    }
  };

  const stopAndSendRecording = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    const recording = recordingRef.current;
    recordingRef.current = null;
    const duration = recordingDuration;
    setIsRecording(false);
    setRecordingDuration(0);

    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error("Recording failed — no file produced");
      if (duration < 1) {
        Toast.show({ type: "info", text1: "Recording too short" });
        return;
      }
      // Recording preset produces different containers per platform
      // (typically .m4a on Android, .caf on iOS) — match the real extension
      // instead of assuming one, so the mimetype we send is accurate.
      const ext = (uri.split(".").pop() || "m4a").toLowerCase();
      const mimeByExt: Record<string, string> = {
        m4a: "audio/m4a",
        caf: "audio/x-caf",
        mp4: "audio/mp4",
        aac: "audio/aac",
      };
      await handleUploadAndSend(
        uri,
        mimeByExt[ext] || "audio/mp4",
        `voice_${Date.now()}.${ext}`,
        "audio",
        formatDuration(duration)
      );
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Could not send voice note", text2: error.message });
    }
  };

  const handlePlayAudio = async (message: IMessage) => {
    if (!message.mediaUrl) return;
    try {
      // Tapping the message that's already playing pauses it
      if (playingMessageId === message._id) {
        await soundRef.current?.pauseAsync();
        setPlayingMessageId(null);
        return;
      }

      // Only one voice note plays at a time — stop whatever's currently loaded
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const onStatus = (status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        if (status.durationMillis) {
          setPlaybackProgress(status.positionMillis / status.durationMillis);
        }
        if (status.didJustFinish) {
          setPlayingMessageId(null);
          setPlaybackProgress(0);
        }
      };

      const { sound } = await Audio.Sound.createAsync(
        { uri: message.mediaUrl },
        { shouldPlay: true },
        onStatus
      );
      soundRef.current = sound;
      setPlayingMessageId(message._id);
      setPlaybackProgress(0);
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Could not play voice note" });
    }
  };

  // ─── Video call handlers ──────────────────────────────────────────────────────
  const handleRequestVideoCall = async (callType: "audio" | "video" = "video") => {
    if (!conversation || isLockedRef.current) return;
    if (conversation.activeVideoRequest?.status === "pending") {
      Toast.show({
        type: "info",
        text1: "Request Pending",
        text2: "A call request is already active",
      });
      return;
    }
    try {
      const request = await requestVideoCall(conversation._id, callType);
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
            role: isDoctor ? "doctor" : "user",
            autoJoin: true,
            callType: response.callType,
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
    const isOwn = String(item.senderId) === String(currentUserId);
    const isSystem = item.messageType === "system";
    const isDeleted = !!item.isDeleted;
    const isImage = !isDeleted && item.messageType === "image" && !!item.mediaUrl;
    const isAudioMsg = !isDeleted && item.messageType === "audio" && !!item.mediaUrl;
    const isDoc = !isDeleted && item.messageType === "document" && !!item.mediaUrl;
    const isPlayingThis = playingMessageId === item._id;

    if (isSystem) {
      return (
        <View style={styles.systemMsgContainer}>
          <Text style={styles.systemMsgText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <Pressable
        onLongPress={() => handleLongPressMessage(item)}
        delayLongPress={300}
        style={[styles.msgRow, isOwn ? styles.ownRow : styles.otherRow]}
      >
        <View
          style={[
            styles.bubble,
            isOwn ? styles.ownBubble : styles.otherBubble,
            isDeleted && styles.deletedBubble,
          ]}
        >
          {/* Reply preview */}
          {item.replyTo && !isDeleted && (
            <View style={[styles.replyPreview, isOwn && styles.replyPreviewOwn]}>
              <View style={[styles.replyBar, isOwn && styles.replyBarOwn]} />
              <Text
                style={[styles.replyPreviewText, isOwn && styles.replyPreviewTextOwn]}
                numberOfLines={2}
              >
                {item.replyTo.content}
              </Text>
            </View>
          )}

          {/* Deleted message */}
          {isDeleted && (
            <Text style={styles.deletedText}>
              <Ionicons name="ban-outline" size={13} /> This message was deleted
            </Text>
          )}

          {/* Image */}
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

          {/* Voice note */}
          {isAudioMsg && (
            <TouchableOpacity
              style={styles.audioContainer}
              activeOpacity={0.8}
              onPress={() => handlePlayAudio(item)}
            >
              <View style={[styles.audioPlayBtn, isOwn && styles.audioPlayBtnOwn]}>
                <Ionicons
                  name={isPlayingThis ? "pause" : "play"}
                  size={18}
                  color={isOwn ? "#D81E5B" : "#fff"}
                />
              </View>
              <View style={styles.audioBody}>
                <View style={styles.audioTrack}>
                  <View
                    style={[
                      styles.audioTrackFill,
                      isOwn && styles.audioTrackFillOwn,
                      { width: `${Math.round((isPlayingThis ? playbackProgress : 0) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={[styles.audioDuration, isOwn ? styles.ownText : styles.otherText]}>
                  {item.content || "Voice note"}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Document */}
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
                  style={[styles.docName, isOwn ? styles.ownText : styles.otherText]}
                  numberOfLines={2}
                >
                  {item.content}
                </Text>
                <Text style={[styles.docTap, isOwn ? { color: "#FFE0EB" } : { color: "#999" }]}>
                  Tap to open
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Plain text */}
          {!isImage && !isDoc && !isAudioMsg && !isDeleted && (
            <Text style={[styles.msgText, isOwn ? styles.ownText : styles.otherText]}>
              {item.content}
            </Text>
          )}

          {/* Footer: time + tick + edited */}
          {!isDeleted && (
            <View style={styles.msgFooter}>
              {item.isEdited && (
                <Text style={[styles.editedLabel, isOwn ? styles.ownTime : styles.otherTime]}>
                  edited{" "}
                </Text>
              )}
              <Text style={[styles.msgTime, isOwn ? styles.ownTime : styles.otherTime]}>
                {new Date(item.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {isOwn && item._pending && (
                <Ionicons name="time-outline" size={13} color="#B0BEC5" style={{ marginLeft: 4 }} />
              )}
              {isOwn && !item._pending && (
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
          )}
        </View>
      </Pressable>
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
            {otherUserTyping && !isLocked && (
              <Text style={styles.typingIndicator}>typing...</Text>
            )}
            {isLocked && (
              <Text style={styles.lockedBadge}>Chat locked</Text>
            )}
          </View>
        </TouchableOpacity>

        {!isLocked && (
          <TouchableOpacity
            style={styles.videoButton}
            onPress={() => handleRequestVideoCall("audio")}
            disabled={!!outgoingVideoRequest}
          >
            <Ionicons
              name="call"
              size={24}
              color={outgoingVideoRequest ? "#999" : "#D81E5B"}
            />
          </TouchableOpacity>
        )}

        {!isLocked && (
          <TouchableOpacity
            style={styles.videoButton}
            onPress={() => handleRequestVideoCall("video")}
            disabled={!!outgoingVideoRequest}
          >
            <Ionicons
              name="videocam"
              size={24}
              color={outgoingVideoRequest ? "#999" : "#D81E5B"}
            />
          </TouchableOpacity>
        )}

        {isDoctor && (
          <View style={styles.doctorControls}>
            {!isLocked && (
              <TouchableOpacity
                style={styles.noteButton}
                onPress={handleOpenNoteEditor}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="document-text-outline" size={22} color="#6366F1" />
              </TouchableOpacity>
            )}

            {!isLocked ? (
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
            ) : (
              <TouchableOpacity
                style={styles.unlockButton}
                onPress={handleUnlockConversation}
                disabled={unlocking}
              >
                {unlocking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="lock-open-outline" size={14} color="#fff" />
                    <Text style={styles.unlockButtonText}>Unlock</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ── Outgoing video call banner ── */}
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

      {/* ── Locked banner ── */}
      {isLocked && (
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed" size={16} color="#fff" />
          <Text style={styles.lockedBannerText}>
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

        {/* ── Attach menu ── */}
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

        {/* ── Reply bar ── */}
        {replyingTo && !isLocked && (
          <View style={styles.replyBarContainer}>
            <View style={styles.replyBarAccent} />
            <View style={styles.replyBarBody}>
              <Text style={styles.replyBarLabel}>Reply to</Text>
              <Text style={styles.replyBarContent} numberOfLines={1}>
                {replyingTo.isDeleted ? "This message was deleted" : replyingTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Editing bar ── */}
        {editingMessage && !isLocked && (
          <View style={styles.editingBar}>
            <Ionicons name="create-outline" size={18} color="#6366F1" />
            <View style={styles.replyBarBody}>
              <Text style={styles.editingBarLabel}>Editing message</Text>
              <Text style={styles.replyBarContent} numberOfLines={1}>
                {editingMessage.content}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => { setEditingMessage(null); setInputText(""); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Input area, recording bar, or locked footer ── */}
        {isLocked ? (
          <View style={[styles.lockedFooter, { paddingBottom: insets.bottom + 8 }]}>
            <Ionicons name="lock-closed" size={16} color="#999" />
            <Text style={styles.lockedFooterText}>
              {isDoctor
                ? "Chat locked — tap Unlock to reopen"
                : "This chat is read-only"}
            </Text>
          </View>
        ) : isRecording ? (
          <View style={[styles.recordingBar, { paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity
              onPress={cancelRecording}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTimer}>{formatDuration(recordingDuration)}</Text>
            <Text style={styles.recordingHint}>Recording voice note…</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={stopAndSendRecording}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="checkmark-circle" size={36} color="#10B981" />
            </TouchableOpacity>
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
              placeholder={editingMessage ? "Edit message..." : "Type a message..."}
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={handleTextChange}
              multiline
              maxLength={1000}
            />
            {inputText.trim() || editingMessage ? (
              <TouchableOpacity
                style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!inputText.trim() || sending}
              >
                <Ionicons name={editingMessage ? "checkmark" : "send"} size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.sendButton} onPress={startRecording}>
                <Ionicons name="mic" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── Message context menu ── */}
      <Modal
        visible={showMessageMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageMenu(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setShowMessageMenu(false)}>
          <View style={styles.menuSheet}>
            {/* Preview of selected message */}
            {selectedMessage && (
              <View style={styles.menuPreview}>
                <Text style={styles.menuPreviewText} numberOfLines={3}>
                  {selectedMessage.content}
                </Text>
              </View>
            )}

            {/* Actions */}
            <TouchableOpacity style={styles.menuItem} onPress={handleMenuReply}>
              <Ionicons name="return-down-back-outline" size={22} color="#333" />
              <Text style={styles.menuItemText}>Reply</Text>
            </TouchableOpacity>

            {selectedMessage?.messageType === "text" && (
              <TouchableOpacity style={styles.menuItem} onPress={handleMenuCopy}>
                <Ionicons name="copy-outline" size={22} color="#333" />
                <Text style={styles.menuItemText}>Copy</Text>
              </TouchableOpacity>
            )}

            {String(selectedMessage?.senderId) === String(currentUserId) &&
              selectedMessage?.messageType === "text" && (
                <TouchableOpacity style={styles.menuItem} onPress={handleMenuEdit}>
                  <Ionicons name="create-outline" size={22} color="#6366F1" />
                  <Text style={[styles.menuItemText, { color: "#6366F1" }]}>Edit</Text>
                </TouchableOpacity>
              )}

            {String(selectedMessage?.senderId) === String(currentUserId) && (
              <TouchableOpacity style={styles.menuItem} onPress={handleMenuDelete}>
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                <Text style={[styles.menuItemText, { color: "#EF4444" }]}>Delete</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.menuItem, styles.menuCancel]}
              onPress={() => setShowMessageMenu(false)}
            >
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

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
              <Ionicons
                name={incomingVideoRequest?.callType === "audio" ? "call" : "videocam"}
                size={48}
                color="#D81E5B"
              />
              <Text style={styles.videoRequestTitle}>
                {incomingVideoRequest?.callType === "audio" ? "Voice Call Request" : "Video Call Request"}
              </Text>
              <Text style={styles.videoRequestSubtitle}>
                {otherParticipantName} wants to start a {incomingVideoRequest?.callType === "audio" ? "voice" : "video"} call
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
                <Ionicons
                  name={incomingVideoRequest?.callType === "audio" ? "call" : "videocam"}
                  size={24}
                  color="#fff"
                />
                <Text style={styles.videoRequestButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Remove duplicate messages by _id — keeps the last occurrence (newest data). */
function dedupeMessages(msgs: IMessage[]): IMessage[] {
  const seen = new Map<string, IMessage>();
  for (const m of msgs) seen.set(m._id, m);
  return Array.from(seen.values());
}

/** Format seconds as m:ss, e.g. 75 → "1:15" */
function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

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
  headerName: { fontSize: 16, fontWeight: "700", color: "#111" },
  typingIndicator: { fontSize: 12, color: "#4FC3F7", fontStyle: "italic" },
  lockedBadge: { fontSize: 11, color: "#EF4444", fontStyle: "italic" },
  videoButton: { padding: 8 },

  doctorControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 4,
  },
  noteButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  endButton: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  endButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  unlockButton: {
    backgroundColor: "#16A34A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  unlockButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  lockedBanner: {
    backgroundColor: "#374151",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  lockedBannerText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
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
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
  },
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

  audioContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 170,
    maxWidth: 220,
  },
  audioPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF0F6",
    justifyContent: "center",
    alignItems: "center",
  },
  audioPlayBtnOwn: { backgroundColor: "rgba(255,255,255,0.25)" },
  audioBody: { flex: 1 },
  audioTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.1)",
    overflow: "hidden",
    marginBottom: 6,
  },
  audioTrackFill: {
    height: 3,
    backgroundColor: "#D81E5B",
  },
  audioTrackFillOwn: { backgroundColor: "#fff" },
  audioDuration: { fontSize: 12, fontWeight: "600" },

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
  attachButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
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
  sendButtonDisabled: { backgroundColor: "#CCC" },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 10,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
  },
  recordingTimer: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    fontVariant: ["tabular-nums"],
  },
  recordingHint: { fontSize: 13, color: "#999" },
  lockedFooter: {
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
  lockedFooterText: { color: "#999", fontSize: 14 },

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

  // ── Deleted message ──────────────────────────────────────────────────────────
  deletedBubble: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB", borderWidth: 1 },
  deletedText: { fontSize: 14, color: "#9CA3AF", fontStyle: "italic" },

  // ── Edited indicator ─────────────────────────────────────────────────────────
  editedLabel: { fontSize: 11, fontStyle: "italic" },

  // ── Reply preview inside bubble ───────────────────────────────────────────────
  replyPreview: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 8,
    marginBottom: 6,
    overflow: "hidden",
  },
  replyPreviewOwn: { backgroundColor: "rgba(255,255,255,0.18)" },
  replyBar: { width: 3, backgroundColor: "#fff", borderRadius: 2 },
  replyBarOwn: { backgroundColor: "#FFE0EB" },
  replyPreviewText: {
    flex: 1,
    fontSize: 12,
    color: "#555",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  replyPreviewTextOwn: { color: "#FFE0EB" },

  // ── Reply bar above input ─────────────────────────────────────────────────────
  replyBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  replyBarAccent: { width: 3, height: "100%", backgroundColor: "#D81E5B", borderRadius: 2 },
  replyBarBody: { flex: 1 },
  replyBarLabel: { fontSize: 12, fontWeight: "700", color: "#D81E5B", marginBottom: 2 },
  replyBarContent: { fontSize: 13, color: "#555" },

  // ── Editing bar above input ───────────────────────────────────────────────────
  editingBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderTopWidth: 1,
    borderTopColor: "#C7D2FE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  editingBarLabel: { fontSize: 12, fontWeight: "700", color: "#6366F1", marginBottom: 2 },

  // ── Message context menu ──────────────────────────────────────────────────────
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    overflow: "hidden",
  },
  menuPreview: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  menuPreviewText: { fontSize: 14, color: "#555", fontStyle: "italic" },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  menuItemText: { fontSize: 16, color: "#111" },
  menuCancel: { marginTop: 4, borderBottomWidth: 0 },
  menuCancelText: { fontSize: 16, color: "#999", textAlign: "center", flex: 1 },
});