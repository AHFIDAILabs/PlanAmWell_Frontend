// screens/ConversationsListScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { IConversation } from "../types/backendType";
import { useAuth } from "../hooks/useAuth";
import { getUserConversations } from "../services/Chat";
import { getDoctorImageUri } from "../services/Doctor";
import socketService from "../services/socketService";
import BottomBar from "../components/common/BottomBar";
import DoctorBottomBar from "../components/common/DoctorBottomBar";

export const ConversationsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, getUserRole, isDoctor } = useAuth();
  const userRole = getUserRole();

  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentUserId = user?._id;

  // ===========================
  // LOAD CONVERSATIONS
  // ===========================
  const loadConversations = async () => {
    try {
      const convs = await getUserConversations();
      setConversations(convs);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  // ===========================
  // SOCKET LISTENERS
  // ===========================
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewMessage = (data: { conversationId: string; message: any }) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv._id === data.conversationId) {
            const unreadField = userRole === "Doctor" ? "doctor" : "user";
            return {
              ...conv,
              lastMessage: data.message,
              lastActivityAt: new Date().toISOString(),
              unreadCount: {
                ...conv.unreadCount,
                [unreadField]: conv.unreadCount[unreadField] + 1,
              },
            };
          }
          return conv;
        }).sort((a, b) => 
          new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
        )
      );
    };

    const handleMessagesRead = (data: { conversationId: string }) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv._id === data.conversationId) {
            const unreadField = userRole === "Doctor" ? "doctor" : "user";
            return {
              ...conv,
              unreadCount: {
                ...conv.unreadCount,
                [unreadField]: 0,
              },
            };
          }
          return conv;
        })
      );
    };

    socket.on("new-message", handleNewMessage);
    socket.on("messages-read", handleMessagesRead);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("messages-read", handleMessagesRead);
    };
  }, [userRole]);

  // ===========================
  // REFRESH
  // ===========================
  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  // ===========================
  // RENDER CONVERSATION
  // ===========================
  const renderConversation = ({ item }: { item: IConversation }) => {
    const otherParticipant =
      userRole === "Doctor" ? item.participants.userId : item.participants.doctorId;

    const otherParticipantName =
      userRole === "Doctor"
        ? otherParticipant.name || "Patient"
        : `Dr. ${(otherParticipant as any).firstName || ""} ${(otherParticipant as any).lastName || ""}`;

    const otherParticipantImage =
      userRole === "Doctor"
        ? (otherParticipant as any)?.userImage?.imageUrl ||
          (otherParticipant as any)?.userImage?.secure_url ||
          `https://ui-avatars.com/api/?name=${otherParticipant.name || "User"}`
        : getDoctorImageUri(otherParticipant as any);

    const unreadCount =
      userRole === "Doctor"
        ? item.unreadCount.doctor
        : item.unreadCount.user;

    const lastMessagePreview = item.lastMessage
      ? item.lastMessage.content.length > 50
        ? item.lastMessage.content.substring(0, 50) + "..."
        : item.lastMessage.content
      : "No messages yet";

    const lastMessageTime = item.lastMessage
      ? formatMessageTime(new Date(item.lastMessage.createdAt))
      : "";

    const appointment =
      typeof item.appointmentId === "object"
        ? item.appointmentId
        : null;

    return (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() =>
          navigation.navigate("ChatRoomScreen", {
            appointmentId:
              typeof item.appointmentId === "string"
                ? item.appointmentId
                :(item.appointmentId as any)._id,
            conversationId: item._id,
          })
        }
      >
        <Image
          source={{ uri: otherParticipantImage }}
          style={styles.avatar}
        />

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.participantName} numberOfLines={1}>
              {otherParticipantName}
            </Text>
            {lastMessageTime && (
              <Text style={styles.messageTime}>{lastMessageTime}</Text>
            )}
          </View>

          <View style={styles.conversationFooter}>
            <Text
              style={[
                styles.lastMessage,
                unreadCount > 0 && styles.unreadMessage,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage?.senderId === currentUserId && "You: "}
              {lastMessagePreview}
            </Text>

            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </View>

          {appointment && (
            <View style={styles.appointmentInfo}>
              <Ionicons name="calendar-outline" size={12} color="#999" />
              <Text style={styles.appointmentText}>
                {new Date(appointment.scheduledAt).toLocaleDateString()} at{" "}
                {new Date(appointment.scheduledAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Active video request indicator */}
        {item.activeVideoRequest?.status === "pending" && (
          <View style={styles.activeRequestBadge}>
            <Ionicons name="videocam" size={16} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
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
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item._id}
        renderItem={renderConversation}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#D81E5B"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              Your chats with doctors will appear here after appointments are
              confirmed
            </Text>
          </View>
        }
      />

      {isDoctor() ? (
        <DoctorBottomBar activeRoute="ConversationsListScreen" messagesCount={0} />
      ) : (
        <BottomBar activeRoute="ConversationsListScreen" cartItemCount={0} />
      )}
    </SafeAreaView>
  );
};

// ===========================
// HELPER FUNCTIONS
// ===========================
const formatMessageTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7)
    return date.toLocaleDateString("en-US", { weekday: "short" });

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F9FAFB",
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
  },
  listContent: {
    paddingVertical: 8,
  },
  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    position: "relative",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E0E0E0",
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    flex: 1,
  },
  messageTime: {
    fontSize: 12,
    color: "#999",
    marginLeft: 8,
  },
  conversationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  unreadMessage: {
    fontWeight: "600",
    color: "#111",
  },
  unreadBadge: {
    backgroundColor: "#D81E5B",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  appointmentInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  appointmentText: {
    fontSize: 12,
    color: "#999",
  },
  activeRequestBadge: {
    position: "absolute",
    top: 12,
    right: 20,
    backgroundColor: "#4CAF50",
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 20,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#BBB",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});