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
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import * as WebBrowser from "expo-web-browser";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getEventById, rsvpToEvent, cancelRsvp, initiateEventTicketPayment } from "../../services/Community";
import { ICommunityEvent } from "../../types/backendType";
import { EventBanner } from "../../components/community/EventBanner";
import { AppStackParamList } from "../../types/App";

type DetailRouteProp = RouteProp<AppStackParamList, "CommunityEventDetailScreen">;

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString()}`;
}

function buildReferralUrl(registrationUrl: string, referralCode?: string): string {
  try {
    const url = new URL(registrationUrl);
    url.searchParams.set("utm_source", "planamwell");
    url.searchParams.set("utm_medium", "community_hub");
    if (referralCode) url.searchParams.set("ref", referralCode);
    return url.toString();
  } catch {
    return registrationUrl;
  }
}

// The public, non-gated web page (web/src/app/events/[id]/page.tsx) — the
// only event URL that works for a recipient who isn't already signed in,
// unlike anything under /app/community which requires a session.
function publicEventUrl(eventId: string): string {
  return `https://planamwell.com/events/${eventId}`;
}

function toIcsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// RFC 5545 §3.3.11 — backslash-escape these four characters, and turn real
// newlines into the literal two-character sequence "\n".
function escapeIcsText(text: string): string {
  return text.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

function eventEndIso(event: ICommunityEvent): string {
  return event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 60 * 60 * 1000).toISOString();
}

function buildIcs(event: ICommunityEvent, publicUrl: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PlanAmWell//Community Hub//EN",
    "BEGIN:VEVENT",
    `UID:${event._id}@planamwell.com`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(event.startsAt)}`,
    `DTEND:${toIcsDate(eventEndIso(event))}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.isVirtual ? "Online" : event.location ?? "In person")}`,
    `URL:${publicUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

function buildGoogleCalendarUrl(event: ICommunityEvent, publicUrl: string): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toIcsDate(event.startsAt)}/${toIcsDate(eventEndIso(event))}`,
    details: `${event.description}\n\n${publicUrl}`,
    location: event.isVirtual ? "Online" : event.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

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
  const [paying, setPaying] = useState(false);
  const [registering, setRegistering] = useState(false);

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

  const isTicketed = !!event?.ticketPriceKobo;
  const rsvpStatus = event?.myRsvp?.status;
  const rsvped = rsvpStatus === "going";
  const awaitingPayment = rsvpStatus === "pending_payment";

  function openRsvpModal() {
    setChosenName(event?.myRsvp?.chosenName ?? "");
    setReminderOptIn(event?.myRsvp?.reminderOptIn ?? false);
    setRsvpError(null);
    setShowRsvpModal(true);
  }

  async function startTicketPayment() {
    setPaying(true);
    setRsvpError(null);
    const result = await initiateEventTicketPayment(eventId);
    setPaying(false);
    if (result.success && result.checkoutUrl) {
      await WebBrowser.openBrowserAsync(result.checkoutUrl, {
        dismissButtonStyle: "close",
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
      load();
      return;
    }
    setRsvpError(result.message || "Could not start payment. Please try again.");
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
    if (!result.success) {
      setRsvpError(result.message || "Could not RSVP to this event.");
      return;
    }
    setShowRsvpModal(false);
    if (result.requiresPayment) {
      load();
      await startTicketPayment();
    } else {
      Toast.show({ type: "success", text1: "You're RSVP'd!" });
      load();
    }
  }

  async function handleRegisterWithOrganizer() {
    if (!event?.registrationUrl) return;
    setRegistering(true);
    try {
      await WebBrowser.openBrowserAsync(buildReferralUrl(event.registrationUrl, event.referralCode), {
        dismissButtonStyle: "close",
      });
    } finally {
      setRegistering(false);
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

  async function handleShareEvent() {
    if (!event) return;
    try {
      const url = publicEventUrl(event._id);
      await Share.share(
        Platform.OS === "ios"
          ? { title: event.title, url, message: event.title }
          : { title: event.title, message: `${event.title}\n${url}` }
      );
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  }

  async function shareIcsFile() {
    if (!event) return;
    const url = publicEventUrl(event._id);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Toast.show({ type: "error", text1: "Sharing isn't available on this device" });
        return;
      }
      const fileUri = `${FileSystem.cacheDirectory}${event._id}.ics`;
      await FileSystem.writeAsStringAsync(fileUri, buildIcs(event, url));
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/calendar",
        UTI: "com.apple.ical.ics",
        dialogTitle: "Add to Calendar",
      });
    } catch {
      Toast.show({ type: "error", text1: "Could not create calendar file" });
    }
  }

  async function handleAddToCalendar() {
    if (!event) return;
    const url = publicEventUrl(event._id);
    Alert.alert("Add to Calendar", undefined, [
      {
        text: "Google Calendar",
        onPress: () => WebBrowser.openBrowserAsync(buildGoogleCalendarUrl(event, url)),
      },
      { text: "Apple / Outlook (.ics)", onPress: shareIcsFile },
      { text: "Cancel", style: "cancel" },
    ]);
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
          {isTicketed && (
            <View style={styles.ticketBadge}>
              <Text style={styles.ticketBadgeText}>{formatNaira(event.ticketPriceKobo!)}</Text>
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
          {event.organizerName && <Text style={styles.organizerText}>Hosted by {event.organizerName}</Text>}

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
          {awaitingPayment && (
            <Text style={styles.awaitingText}>
              You started an RSVP but haven&apos;t completed payment yet — finish below to secure your spot.
            </Text>
          )}

          {rsvpError && <Text style={styles.errorText}>{rsvpError}</Text>}

          <View style={styles.actionsRow}>
            {awaitingPayment ? (
              <>
                <TouchableOpacity style={styles.primaryButton} onPress={startTicketPayment} disabled={paying}>
                  {paying ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Complete Payment ({formatNaira(event.ticketPriceKobo!)})</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.outlineButton} onPress={handleCancelRsvp} disabled={cancelling}>
                  {cancelling ? (
                    <ActivityIndicator size="small" color="#D81E5B" />
                  ) : (
                    <Text style={styles.outlineButtonText}>Cancel</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : rsvped ? (
              <>
                {!isTicketed && (
                  <TouchableOpacity style={styles.outlineButton} onPress={openRsvpModal}>
                    <Text style={styles.outlineButtonText}>Edit RSVP</Text>
                  </TouchableOpacity>
                )}
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
                <Text style={styles.primaryButtonText}>
                  {isTicketed ? `Get Ticket (${formatNaira(event.ticketPriceKobo!)})` : "RSVP to this event"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {event.registrationUrl && (
            <>
              <TouchableOpacity
                style={styles.registerButton}
                onPress={handleRegisterWithOrganizer}
                disabled={registering}
              >
                {registering ? (
                  <ActivityIndicator size="small" color="#0058A4" />
                ) : (
                  <Text style={styles.registerButtonText}>Register with {event.organizerName || "organizer"}</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.registerHint}>
                Opens {event.organizerName || "the organizer"}&apos;s own registration page — we don&apos;t collect
                or share your details there.
              </Text>
            </>
          )}

          <View style={styles.shareRow}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShareEvent}>
              <Ionicons name="share-outline" size={16} color="#0058A4" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={handleAddToCalendar}>
              <Ionicons name="calendar-outline" size={16} color="#0058A4" />
              <Text style={styles.shareButtonText}>Add to Calendar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showRsvpModal} animationType="slide" transparent onRequestClose={() => setShowRsvpModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowRsvpModal(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{isTicketed ? "Get Your Ticket" : "RSVP"}</Text>

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

            {isTicketed && (
              <Text style={styles.ticketHint}>
                You&apos;ll be taken to payment ({formatNaira(event.ticketPriceKobo!)}) next — your spot is only
                confirmed once payment completes.
              </Text>
            )}

            {rsvpError && <Text style={styles.errorText}>{rsvpError}</Text>}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setShowRsvpModal(false)}>
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleRsvp} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{isTicketed ? "Continue to Payment" : "Confirm RSVP"}</Text>
                )}
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
  ticketBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "#D81E5B",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  ticketBadgeText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  content: { padding: 20 },
  goingText: { fontSize: 12, fontWeight: "700", color: "#0058A4" },
  title: { fontSize: 22, fontWeight: "700", color: "#111", marginTop: 6 },
  organizerText: { fontSize: 13, color: "#666", marginTop: 4 },

  metaGrid: { flexDirection: "row", marginTop: 20, gap: 24 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 11, fontWeight: "700", color: "#999", letterSpacing: 0.3 },
  metaValue: { fontSize: 14, color: "#111", marginTop: 4, fontWeight: "600" },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#999", letterSpacing: 0.3, marginTop: 24 },
  description: { fontSize: 14, color: "#333", marginTop: 6, lineHeight: 20 },

  rsvpedText: { fontSize: 13, color: "#15803D", marginTop: 20 },
  awaitingText: { fontSize: 13, color: "#B45309", marginTop: 20 },

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
  registerButton: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#0058A4",
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  registerButtonText: { color: "#0058A4", fontSize: 14, fontWeight: "700" },
  registerHint: { fontSize: 12, color: "#999", marginTop: 8, lineHeight: 16 },
  ticketHint: { fontSize: 12, color: "#666", marginTop: 12, lineHeight: 16 },
  shareRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#0058A4",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  shareButtonText: { color: "#0058A4", fontSize: 13, fontWeight: "600" },

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
