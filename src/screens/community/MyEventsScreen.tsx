import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getMyRsvps } from "../../services/Community";
import { IMyEventRsvp } from "../../types/backendType";
import { EventBanner } from "../../components/community/EventBanner";

export default function MyEventsScreen() {
  const navigation = useNavigation<any>();
  const [rsvps, setRsvps] = useState<IMyEventRsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyRsvps();
      setRsvps(data.filter((r) => !!r.eventId));
      setError(null);
    } catch {
      setError("Could not load your events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const renderItem = ({ item }: { item: IMyEventRsvp }) => {
    const event = item.eventId;
    const isPast = new Date(event.startsAt) < new Date();
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("CommunityEventDetailScreen", { eventId: event._id })}
      >
        <View style={styles.bannerWrap}>
          <EventBanner bannerImage={event.bannerImage} bannerPreset={event.bannerPreset} />
          {isPast && (
            <View style={styles.pastBadge}>
              <Text style={styles.pastBadgeText}>Past</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          {event.category && <Text style={styles.category}>{event.category}</Text>}
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={styles.meta}>
            {new Date(event.startsAt).toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
          <Text style={styles.rsvpAs}>RSVP&apos;d as {item.chosenName}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Events</Text>
        <View style={{ width: 22 }} />
      </View>

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
          data={rsvps}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>You haven&apos;t RSVP&apos;d to any events yet.</Text>
              <TouchableOpacity onPress={() => navigation.navigate("CommunityHubScreen")}>
                <Text style={styles.browseLink}>Browse events &rarr;</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 24 },
  emptyText: { marginTop: 10, fontSize: 14, color: "#888", textAlign: "center" },
  browseLink: { marginTop: 10, fontSize: 14, fontWeight: "700", color: "#D81E5B" },
  listContent: { padding: 16, paddingBottom: 40 },

  card: {
    flexDirection: "row",
    borderRadius: 16,
    backgroundColor: "#fff",
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  bannerWrap: { width: 90, height: 90 },
  pastBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pastBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  cardBody: { flex: 1, padding: 12, justifyContent: "center" },
  category: { fontSize: 10, fontWeight: "700", color: "#0B71CD", textTransform: "uppercase" },
  title: { fontSize: 14, fontWeight: "700", color: "#111", marginTop: 2 },
  meta: { fontSize: 12, color: "#888", marginTop: 3 },
  rsvpAs: { fontSize: 11, color: "#15803D", marginTop: 3 },
});
