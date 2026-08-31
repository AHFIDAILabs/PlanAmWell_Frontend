import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { getEvents } from "../../services/Community";
import { ICommunityEvent } from "../../types/backendType";
import { EventBanner } from "../../components/community/EventBanner";
import BottomBar from "../../components/common/BottomBar";

function formatEventTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return `${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}, ${time}`;
}

export default function CommunityHubScreen({ navigation }: any) {
  const [events, setEvents] = useState<ICommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getEvents();
      setEvents(data);
      setError(null);
    } catch (err: any) {
      setError("Could not load events. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const renderEvent = ({ item }: { item: ICommunityEvent }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate("CommunityEventDetailScreen", { eventId: item._id })}
    >
      <View style={styles.bannerWrap}>
        <EventBanner bannerImage={item.bannerImage} bannerPreset={item.bannerPreset} />
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        )}
        {!!item.ticketPriceKobo && (
          <View style={styles.ticketBadge}>
            <Text style={styles.ticketBadgeText}>₦{(item.ticketPriceKobo / 100).toLocaleString()}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formatEventTime(item.startsAt)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{item.isVirtual ? "Online" : item.location || "In person"}</Text>
        </View>
        {!!item.rsvpCount && (
          <Text style={styles.goingText}>
            {item.rsvpCount} {item.rsvpCount === 1 ? "person" : "people"} going
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <LinearGradient colors={["#D81E5B20", "#ffffff"]} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Community Hub</Text>
          <TouchableOpacity onPress={() => navigation.navigate("MyEventsScreen")}>
            <Text style={styles.myEventsLink}>My Events</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Live events, support groups, and community sessions.</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#D81E5B" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id}
          renderItem={renderEvent}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No upcoming events right now — check back soon.</Text>
            </View>
          }
        />
      )}

      <BottomBar activeRoute="CommunityHubScreen" cartItemCount={0} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 20, paddingVertical: 18, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#111" },
  myEventsLink: { fontSize: 13, fontWeight: "700", color: "#D81E5B" },
  subtitle: { fontSize: 13, color: "#666", marginTop: 4 },
  listContent: { padding: 16, paddingBottom: 120 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 24 },
  emptyText: { marginTop: 10, fontSize: 14, color: "#888", textAlign: "center" },

  card: {
    borderRadius: 18,
    backgroundColor: "#fff",
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  bannerWrap: { height: 120, width: "100%" },
  categoryBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: { fontSize: 11, fontWeight: "700", color: "#111" },
  ticketBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#D81E5B",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ticketBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  cardDescription: { fontSize: 13, color: "#666", marginTop: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 },
  metaText: { fontSize: 12, color: "#888" },
  metaDot: { fontSize: 12, color: "#ccc" },
  goingText: { fontSize: 12, fontWeight: "700", color: "#0058A4", marginTop: 4 },
});
