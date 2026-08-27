import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { getEventById, rsvpToEvent, cancelRsvp } from "../../services/Community";
import { ICommunityEvent } from "../../types/backendType";
import { EventBanner } from "../../components/community/EventBanner";
import { AppStackParamList } from "../../types/App";

type DetailRouteProp = RouteProp<AppStackParamList, "CommunityEventDetailScreen">;

export default function CommunityEventDetailScreen() {
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation<any>();
  const { eventId } = route.params;

  const [event, setEvent] = useState<ICommunityEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showRsvpModal, setShowRsvpModal] = useState(false);
  const [chosenName, setChosenName] = useState("");
  const [reminderOptIn, setReminderOptIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEventById(eventId);
      setEvent(data);
      setError(null);
    } catch (err) {
      setError("Could not load this event.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const rsvped = !!event?.myRsvp;

  function openRsvpModal() {
    setChosenName(event?.myRsvp?.chosenName ?? "");
    setReminderOptIn(event?.myRsvp?.reminderOptIn ?? false);
    setRsvpError(null);
    setShowRsvpModal(true);
  }

  async function handleRsvp() {
    if (!chosenName.trim()) {
      setRsvpError("Please enter a name to RSVP with.");
      return;
    }
    setSaving(true);
    setRsvpError(null);
    const result = await rsvpToEvent(eventId, chosenName.trim(), reminderOptIn);
    setSaving(false);
    if (result.success) {
      setShowRsvpModal(false);
      Toast.show({ type: "success", text1: "You're RSVP'd!" });
      load();
    } else {
      setRsvpError(result.message || "Could not RSVP to this event.");
    }
  }

  async function handleCancelRsvp() {
    setCancelling(true);
    try {
      await cancelRsvp(eventId);
      Toast.show({ type: "success", text1: "RSVP cancelled" });
      load();
    } catch {
      Toast.show({ type: "error", text1: "Could not cancel RSVP" });
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#D81E5B" />
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyText}>{error || "Event not found."}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={styles.backLink}>&larr; Back to Community Hub</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.bannerWrap}>
          <EventBanner bannerImage={event.bannerImage} bannerPreset={event.bannerPreset} size="lg" />
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          {event.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{event.category}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {!!event.rsvpCount && (
            <Text style={styles.goingText}>
              {event.rsvpCount} {event.rsvpCount === 1 ? "person" : "people"} going
            </Text>
          )}
          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>DATE &amp; TIME</Text>
              <Text style={styles.metaValue}>
                {new Date(event.startsAt).toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>WHERE</Text>
              <Text style={styles.metaValue}>{event.isVirtual ? "Online" : event.location || "In person"}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>ABOUT THIS EVENT</Text>
          <Text style={styles.description}>{event.description}</Text>

          {rsvped && (
            <Text style={styles.rsvpedText}>
              You&apos;re RSVP&apos;d as <Text style={{ fontWeight: "700" }}>{event.myRsvp?.chosenName}</Text>.
            </Text>
          )}

          <View style={styles.actionsRow}>
            {rsvped ? (
              <>
                <TouchableOpacity style={styles.outlineButton} onPress={openRsvpModal}>
                  <Text style={styles.outlineButtonText}>Edit RSVP</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.outlineButton} onPress={handleCancelRsvp} disabled={cancelling}>
                  {cancelling ? (
                    <ActivityIndicator size="small" color="#D81E5B" />
                  ) : (
                    <Text style={styles.outlineButtonText}>Cancel RSVP</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.primaryButton} onPress={openRsvpModal}>
                <Text style={styles.primaryButtonText}>RSVP to this event</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showRsvpModal} animationType="slide" transparent onRequestClose={() => setShowRsvpModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowRsvpModal(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>RSVP</Text>

            <Text style={styles.inputLabel}>Chosen name (pseudonym)</Text>
            <TextInput
              style={styles.input}
              value={chosenName}
              onChangeText={setChosenName}
              placeholder="How should we address you at this event?"
              placeholderTextColor="#999"
            />

            <View style={styles.reminderRow}>
              <Text style={styles.reminderLabel}>Remind me before this event starts</Text>
              <Switch value={reminderOptIn} onValueChange={setReminderOptIn} trackColor={{ false: "#DDD", true: "#D81E5B" }} thumbColor="#fff" />
            </View>

            {rsvpError && <Text style={styles.errorText}>{rsvpError}</Text>}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setShowRsvpModal(false)}>
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleRsvp} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>Confirm RSVP</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyText: { fontSize: 14, color: "#888", textAlign: "center" },
  backLink: { fontSize: 14, fontWeight: "700", color: "#D81E5B" },

  bannerWrap: { height: 220, width: "100%" },
  backButton: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadge: {
    position: "absolute",
    bottom: 16,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  categoryBadgeText: { fontSize: 12, fontWeight: "700", color: "#111" },

  content: { padding: 20 },
  goingText: { fontSize: 12, fontWeight: "700", color: "#0058A4" },
  title: { fontSize: 22, fontWeight: "700", color: "#111", marginTop: 6 },

  metaGrid: { flexDirection: "row", marginTop: 20, gap: 24 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 11, fontWeight: "700", color: "#999", letterSpacing: 0.3 },
  metaValue: { fontSize: 14, color: "#111", marginTop: 4, fontWeight: "600" },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#999", letterSpacing: 0.3, marginTop: 24 },
  description: { fontSize: 14, color: "#333", marginTop: 6, lineHeight: 20 },

  rsvpedText: { fontSize: 13, color: "#15803D", marginTop: 20 },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 24 },
  primaryButton: {
    flex: 1,
    backgroundColor: "#D81E5B",
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  outlineButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#D81E5B",
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonText: { color: "#D81E5B", fontSize: 14, fontWeight: "700" },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 32 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#333", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111",
  },
  reminderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 },
  reminderLabel: { fontSize: 13, color: "#333", flex: 1, marginRight: 10 },
  errorText: { fontSize: 13, color: "#DC2626", marginTop: 12 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 22 },
});
