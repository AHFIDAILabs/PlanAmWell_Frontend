import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Toast from "react-native-toast-message";
import { useAuth } from "../../hooks/useAuth";
import { updateDoctorAvailabilityService } from "../../services/Doctor";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DaySlot { from: string; to: string; enabled: boolean }
type AvailMap = Record<string, DaySlot>;
type PickerTarget = { day: string; field: "from" | "to" } | null;

// ─── Constants ────────────────────────────────────────────────────────────────
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_OPTIONS = [15, 30, 45, 60];
const DEFAULT_FROM = "09:00";
const DEFAULT_TO   = "17:00";
const ACCENT = "#D81E5B";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function countSlots(from: string, to: string, duration: number): number {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const mins = (th * 60 + tm) - (fh * 60 + fm);
  return mins > 0 ? Math.floor(mins / duration) : 0;
}

function initFromUserAvailability(raw: any): { avail: AvailMap; duration: number } {
  const avail: AvailMap = {};
  let duration = 30;
  for (const day of WEEKDAYS) {
    const v = raw?.[day];
    avail[day] = v
      ? { from: v.from ?? DEFAULT_FROM, to: v.to ?? DEFAULT_TO, enabled: true }
      : { from: DEFAULT_FROM, to: DEFAULT_TO, enabled: false };
  }
  if (typeof raw?.slotDuration === "number") duration = raw.slotDuration;
  return { avail, duration };
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DoctorAvailabilityScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [avail, setAvail] = useState<AvailMap>(() => {
    const { avail } = initFromUserAvailability(user?.availability);
    return avail;
  });
  const [slotDuration, setSlotDuration] = useState<number>(() => {
    const { duration } = initFromUserAvailability(user?.availability);
    return duration;
  });
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.availability) {
      const { avail: a, duration: d } = initFromUserAvailability(user.availability);
      setAvail(a);
      setSlotDuration(d);
    }
  }, [user?.availability]);

  const toggleDay = useCallback((day: string) => {
    setAvail(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  }, []);

  const openPicker = useCallback((day: string, field: "from" | "to") => {
    setPickerTarget({ day, field });
  }, []);

  const handlePickerConfirm = useCallback((date: Date) => {
    if (!pickerTarget) return;
    const { day, field } = pickerTarget;
    setAvail(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: dateToTime(date) },
    }));
    setPickerTarget(null);
  }, [pickerTarget]);

  const handleSave = async () => {
    // Build API payload: only include enabled days
    const payload: Record<string, any> = { slotDuration };
    for (const day of WEEKDAYS) {
      if (avail[day].enabled) {
        payload[day] = { from: avail[day].from, to: avail[day].to };
      }
    }
    try {
      setSaving(true);
      await updateDoctorAvailabilityService(payload);
      Toast.show({ type: "success", text1: "Availability saved", text2: "Patients can now book your open slots." });
    } catch (err: any) {
      Toast.show({ type: "error", text1: "Save failed", text2: err.message });
    } finally {
      setSaving(false);
    }
  };

  const activeDays = WEEKDAYS.filter(d => avail[d].enabled);
  const pickerInitDate = pickerTarget
    ? timeToDate(avail[pickerTarget.day][pickerTarget.field])
    : new Date();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Availability</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Weekly overview strip */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Weekly Overview</Text>
          <View style={styles.overviewStrip}>
            {WEEKDAYS.map((day, i) => {
              const on = avail[day].enabled;
              return (
                <TouchableOpacity key={day} style={styles.overviewItem} onPress={() => toggleDay(day)}>
                  <View style={[styles.overviewDot, on && { backgroundColor: ACCENT }]}>
                    <Text style={[styles.overviewDotText, on && { color: "#FFF" }]}>{DAY_SHORT[i].slice(0, 1)}</Text>
                  </View>
                  <Text style={[styles.overviewDayText, on && { color: ACCENT }]}>{DAY_SHORT[i]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.overviewSub}>
            {activeDays.length === 0 ? "No days active" : `${activeDays.length} day${activeDays.length > 1 ? "s" : ""} active`}
          </Text>
        </View>

        {/* Slot duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Slot Duration</Text>
          <View style={styles.durationRow}>
            {SLOT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.durationChip, slotDuration === opt && styles.durationChipActive]}
                onPress={() => setSlotDuration(opt)}
              >
                <Text style={[styles.durationChipText, slotDuration === opt && styles.durationChipTextActive]}>
                  {opt} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Day rows */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Schedule</Text>
          {WEEKDAYS.map((day) => {
            const slot = avail[day];
            const slots = slot.enabled ? countSlots(slot.from, slot.to, slotDuration) : 0;
            return (
              <View key={day} style={[styles.dayRow, !slot.enabled && styles.dayRowOff]}>
                {/* Toggle + name */}
                <View style={styles.dayLeft}>
                  <Switch
                    value={slot.enabled}
                    onValueChange={() => toggleDay(day)}
                    thumbColor={slot.enabled ? ACCENT : "#ccc"}
                    trackColor={{ false: "#E0E0E0", true: ACCENT + "55" }}
                    style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                  />
                  <View>
                    <Text style={[styles.dayName, slot.enabled && styles.dayNameActive]}>{day}</Text>
                    {slot.enabled && (
                      <Text style={styles.slotCount}>{slots} slot{slots !== 1 ? "s" : ""}</Text>
                    )}
                  </View>
                </View>

                {/* Time pickers */}
                {slot.enabled ? (
                  <View style={styles.timeRow}>
                    <TouchableOpacity style={styles.timePill} onPress={() => openPicker(day, "from")}>
                      <Feather name="sunrise" size={12} color={ACCENT} />
                      <Text style={styles.timePillText}>{slot.from}</Text>
                    </TouchableOpacity>
                    <Feather name="arrow-right" size={12} color="#BBB" style={{ marginHorizontal: 4 }} />
                    <TouchableOpacity style={styles.timePill} onPress={() => openPicker(day, "to")}>
                      <Feather name="sunset" size={12} color={ACCENT} />
                      <Text style={styles.timePillText}>{slot.to}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.unavailableText}>Unavailable</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Summary */}
        {activeDays.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Schedule Preview</Text>
            {activeDays.map(day => {
              const s = avail[day];
              const count = countSlots(s.from, s.to, slotDuration);
              return (
                <View key={day} style={styles.summaryRow}>
                  <View style={[styles.summaryDot, { backgroundColor: ACCENT }]} />
                  <Text style={styles.summaryDay}>{day.slice(0, 3)}</Text>
                  <Text style={styles.summaryTime}>{s.from} – {s.to}</Text>
                  <Text style={styles.summarySlots}>{count} slots</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Time picker */}
      <DateTimePickerModal
        isVisible={pickerTarget !== null}
        mode="time"
        date={pickerInitDate}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerTarget(null)}
        is24Hour
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F5" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: "#E0E0E0",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  saveBtn: {
    backgroundColor: ACCENT, paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20, minWidth: 60, alignItems: "center",
  },
  saveBtnDisabled: { backgroundColor: "#F0A0B8" },
  saveBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },

  scroll: { padding: 16 },

  overviewCard: {
    backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
  },
  overviewTitle: { fontSize: 13, fontWeight: "700", color: "#555", marginBottom: 12 },
  overviewStrip: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  overviewItem: { alignItems: "center", gap: 4 },
  overviewDot: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#F0F0F0", alignItems: "center", justifyContent: "center",
  },
  overviewDotText: { fontSize: 13, fontWeight: "700", color: "#AAA" },
  overviewDayText: { fontSize: 10, color: "#AAA", fontWeight: "600" },
  overviewSub: { fontSize: 12, color: "#888", textAlign: "center" },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#555", marginBottom: 10 },

  durationRow: { flexDirection: "row", gap: 10 },
  durationChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#E0E0E0", backgroundColor: "#FFF",
  },
  durationChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  durationChipText: { fontSize: 13, color: "#555", fontWeight: "600" },
  durationChipTextActive: { color: "#FFF" },

  dayRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 8,
    elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2,
  },
  dayRowOff: { opacity: 0.6 },
  dayLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  dayName: { fontSize: 14, fontWeight: "600", color: "#999" },
  dayNameActive: { color: "#111" },
  slotCount: { fontSize: 11, color: "#888", marginTop: 1 },
  timeRow: { flexDirection: "row", alignItems: "center" },
  timePill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#FFF0F4", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: ACCENT + "44",
  },
  timePillText: { fontSize: 13, fontWeight: "700", color: ACCENT },
  unavailableText: { fontSize: 12, color: "#CCC", fontStyle: "italic" },

  summaryCard: {
    backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 8,
    borderLeftWidth: 4, borderLeftColor: ACCENT,
    elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2,
  },
  summaryTitle: { fontSize: 13, fontWeight: "700", color: "#555", marginBottom: 10 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  summaryDot: { width: 7, height: 7, borderRadius: 4 },
  summaryDay: { width: 28, fontSize: 12, fontWeight: "700", color: "#333" },
  summaryTime: { flex: 1, fontSize: 12, color: "#555" },
  summarySlots: { fontSize: 12, color: ACCENT, fontWeight: "600" },
});
