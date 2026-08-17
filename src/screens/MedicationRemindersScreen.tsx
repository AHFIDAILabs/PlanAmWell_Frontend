import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Modal, TextInput, Switch, ScrollView,
  StatusBar, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const BASE = `${SERVER_URL}/api/v1/medication-reminders`;
const NOTIF_MAP_KEY = 'med_reminder_notif_ids';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Reminder {
  _id: string;
  drugName: string;
  dosage: string;
  frequency: FrequencyKey;
  times: string[];
  instructions?: string;
  color: string;
  isActive: boolean;
}

type FrequencyKey = 'once_daily' | 'twice_daily' | 'three_times_daily' | 'four_times_daily' | 'as_needed';

const FREQUENCY_LABELS: Record<FrequencyKey, string> = {
  once_daily:         'Once daily',
  twice_daily:        'Twice daily',
  three_times_daily:  '3× daily',
  four_times_daily:   '4× daily',
  as_needed:          'As needed',
};

const FREQUENCY_TIMES: Record<FrequencyKey, number> = {
  once_daily: 1, twice_daily: 2, three_times_daily: 3, four_times_daily: 4, as_needed: 1,
};

const PRESET_COLORS = ['#00897B', '#1976D2', '#E53935', '#F57C00', '#7B1FA2', '#388E3C'];

const EMPTY_FORM = {
  drugName: '', dosage: '', frequency: 'once_daily' as FrequencyKey,
  times: ['08:00'], instructions: '', color: '#00897B',
};

// ─── Notification helpers ─────────────────────────────────────────────────────
async function getNotifMap(): Promise<Record<string, string[]>> {
  const raw = await SecureStore.getItemAsync(NOTIF_MAP_KEY);
  return raw ? JSON.parse(raw) : {};
}
async function saveNotifMap(map: Record<string, string[]>) {
  await SecureStore.setItemAsync(NOTIF_MAP_KEY, JSON.stringify(map));
}

async function scheduleForReminder(reminder: Reminder): Promise<string[]> {
  const ids: string[] = [];
  for (const timeStr of reminder.times) {
    const [h, m] = timeStr.split(':').map(Number);
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `💊 ${reminder.drugName}`,
          body: reminder.dosage ? `${reminder.dosage}${reminder.instructions ? ' — ' + reminder.instructions : ''}` : 'Time to take your medication',
          data: { type: 'medication_reminder', reminderId: reminder._id },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: h,
          minute: m,
          repeats: true,
        },
      });
      ids.push(id);
    } catch (_) {}
  }
  return ids;
}

async function cancelForReminder(reminderId: string) {
  const map = await getNotifMap();
  const ids = map[reminderId] ?? [];
  for (const id of ids) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch (_) {}
  }
  delete map[reminderId];
  await saveNotifMap(map);
}

async function upsertNotifications(reminder: Reminder) {
  await cancelForReminder(reminder._id);
  if (!reminder.isActive) return;
  const ids = await scheduleForReminder(reminder);
  if (ids.length) {
    const map = await getNotifMap();
    map[reminder._id] = ids;
    await saveNotifMap(map);
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MedicationRemindersScreen() {
  const navigation = useNavigation();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [timePickerIndex, setTimePickerIndex] = useState<number | null>(null);

  // ── Load ──
  const loadReminders = useCallback(async () => {
    try {
      const res = await axios.get(BASE);
      if (res.data.success) setReminders(res.data.data);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Enable notifications to receive medication reminders.');
      }
    })();
    loadReminders();
  }, [loadReminders]);

  // ── Sync times array length when frequency changes ──
  const handleFrequencyChange = useCallback((freq: FrequencyKey) => {
    const count = FREQUENCY_TIMES[freq];
    setForm(prev => {
      const newTimes = Array.from({ length: count }, (_, i) => prev.times[i] ?? '08:00');
      return { ...prev, frequency: freq, times: newTimes };
    });
  }, []);

  const setTime = useCallback((index: number, time: Date) => {
    const hh = String(time.getHours()).padStart(2, '0');
    const mm = String(time.getMinutes()).padStart(2, '0');
    setForm(prev => {
      const times = [...prev.times];
      times[index] = `${hh}:${mm}`;
      return { ...prev, times };
    });
    setTimePickerIndex(null);
  }, []);

  // ── Open modal ──
  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setModalVisible(true);
  }, []);

  const openEdit = useCallback((r: Reminder) => {
    setEditingId(r._id);
    setForm({
      drugName: r.drugName, dosage: r.dosage, frequency: r.frequency,
      times: [...r.times], instructions: r.instructions ?? '', color: r.color,
    });
    setModalVisible(true);
  }, []);

  // ── Save ──
  const handleSave = useCallback(async () => {
    if (!form.drugName.trim()) {
      Alert.alert('Required', 'Please enter a drug name.'); return;
    }
    setSaving(true);
    try {
      const payload = {
        drugName: form.drugName.trim(), dosage: form.dosage.trim(),
        frequency: form.frequency, times: form.times,
        instructions: form.instructions.trim(), color: form.color,
      };
      let saved: Reminder;
      if (editingId) {
        const res = await axios.put(`${BASE}/${editingId}`, payload);
        saved = res.data.data;
        setReminders(prev => prev.map(r => r._id === editingId ? saved : r));
      } else {
        const res = await axios.post(BASE, payload);
        saved = res.data.data;
        setReminders(prev => [saved, ...prev]);
      }
      await upsertNotifications(saved);
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', 'Could not save reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [editingId, form]);

  // ── Toggle active ──
  const handleToggle = useCallback(async (reminder: Reminder) => {
    try {
      const res = await axios.patch(`${BASE}/${reminder._id}/toggle`);
      const updated: Reminder = res.data.data;
      setReminders(prev => prev.map(r => r._id === updated._id ? updated : r));
      await upsertNotifications(updated);
    } catch (_) {
      Alert.alert('Error', 'Could not update reminder.');
    }
  }, []);

  // ── Delete ──
  const handleDelete = useCallback((reminder: Reminder) => {
    Alert.alert(
      'Delete Reminder',
      `Remove "${reminder.drugName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${BASE}/${reminder._id}`);
              await cancelForReminder(reminder._id);
              setReminders(prev => prev.filter(r => r._id !== reminder._id));
            } catch (_) {
              Alert.alert('Error', 'Could not delete reminder.');
            }
          },
        },
      ]
    );
  }, []);

  // ── Render reminder card ──
  const renderItem = useCallback(({ item }: { item: Reminder }) => (
    <View style={[styles.card, !item.isActive && styles.cardInactive]}>
      <View style={[styles.colorBar, { backgroundColor: item.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.drugName}>{item.drugName}</Text>
            {item.dosage ? <Text style={styles.dosage}> · {item.dosage}</Text> : null}
          </View>
          <Switch
            value={item.isActive}
            onValueChange={() => handleToggle(item)}
            thumbColor={item.isActive ? item.color : '#ccc'}
            trackColor={{ false: '#ddd', true: item.color + '66' }}
          />
        </View>
        <Text style={styles.freqLabel}>{FREQUENCY_LABELS[item.frequency]}</Text>
        <View style={styles.timesRow}>
          {item.times.map((t, i) => (
            <View key={i} style={[styles.timeBadge, { borderColor: item.color }]}>
              <Feather name="clock" size={11} color={item.color} />
              <Text style={[styles.timeText, { color: item.color }]}> {t}</Text>
            </View>
          ))}
        </View>
        {item.instructions ? <Text style={styles.instructions}>{item.instructions}</Text> : null}
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => openEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="edit-2" size={16} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={{ marginTop: 12 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="trash-2" size={16} color="#E53935" />
        </TouchableOpacity>
      </View>
    </View>
  ), [handleToggle, openEdit, handleDelete]);

  // ── Time picker trigger time ──
  const pickerInitialDate = (() => {
    if (timePickerIndex === null) return new Date();
    const t = form.times[timePickerIndex] ?? '08:00';
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  })();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="arrow-left" size={22} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medication Reminders</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#00897B" size="large" /></View>
      ) : reminders.length === 0 ? (
        <View style={styles.center}>
          <Feather name="activity" size={48} color="#B2DFDB" />
          <Text style={styles.emptyTitle}>No reminders yet</Text>
          <Text style={styles.emptyText}>Tap the + button to add your first medication reminder.</Text>
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Feather name="plus" size={26} color="#FFF" />
      </TouchableOpacity>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editingId ? 'Edit Reminder' : 'New Reminder'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={22} color="#555" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Drug name */}
              <Text style={styles.label}>Drug / Medication name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Amoxicillin, Paracetamol"
                value={form.drugName}
                onChangeText={v => setForm(p => ({ ...p, drugName: v }))}
              />

              {/* Dosage */}
              <Text style={styles.label}>Dosage</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 500mg, 1 tablet"
                value={form.dosage}
                onChangeText={v => setForm(p => ({ ...p, dosage: v }))}
              />

              {/* Frequency */}
              <Text style={styles.label}>Frequency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {(Object.keys(FREQUENCY_LABELS) as FrequencyKey[]).map(key => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.freqChip, form.frequency === key && styles.freqChipActive]}
                    onPress={() => handleFrequencyChange(key)}
                  >
                    <Text style={[styles.freqChipText, form.frequency === key && styles.freqChipTextActive]}>
                      {FREQUENCY_LABELS[key]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Times */}
              <Text style={styles.label}>Reminder time{form.times.length > 1 ? 's' : ''}</Text>
              <View style={styles.timesGrid}>
                {form.times.map((t, i) => (
                  <TouchableOpacity key={i} style={styles.timeButton} onPress={() => setTimePickerIndex(i)}>
                    <Feather name="clock" size={15} color="#00897B" />
                    <Text style={styles.timeButtonText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Instructions */}
              <Text style={styles.label}>Instructions (optional)</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                placeholder="e.g. Take with food"
                value={form.instructions}
                onChangeText={v => setForm(p => ({ ...p, instructions: v }))}
                multiline
              />

              {/* Color */}
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorSwatch, { backgroundColor: c }, form.color === c && styles.colorSwatchSelected]}
                    onPress={() => setForm(p => ({ ...p, color: c }))}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Save Reminder</Text>}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Time picker */}
      <DateTimePickerModal
        isVisible={timePickerIndex !== null}
        mode="time"
        date={pickerInitialDate}
        onConfirm={d => timePickerIndex !== null && setTime(timePickerIndex, d)}
        onCancel={() => setTimePickerIndex(null)}
        is24Hour
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#212121' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#444', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  list: { padding: 12 },

  card: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 14, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
    overflow: 'hidden',
  },
  cardInactive: { opacity: 0.55 },
  colorBar: { width: 5 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'baseline', flex: 1, flexWrap: 'wrap' },
  drugName: { fontSize: 15, fontWeight: '700', color: '#212121' },
  dosage: { fontSize: 13, color: '#666' },
  freqLabel: { fontSize: 12, color: '#888', marginBottom: 6 },
  timesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeBadge: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  timeText: { fontSize: 12, fontWeight: '600' },
  instructions: { fontSize: 12, color: '#888', marginTop: 6, fontStyle: 'italic' },
  cardActions: { paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#00897B', alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#00897B', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 10, maxHeight: '90%',
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#212121' },

  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: '#212121', marginBottom: 16, backgroundColor: '#FAFAFA',
  },

  freqChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
    borderColor: '#E0E0E0', backgroundColor: '#F5F5F5', marginRight: 8,
  },
  freqChipActive: { backgroundColor: '#00897B', borderColor: '#00897B' },
  freqChipText: { fontSize: 13, color: '#555' },
  freqChipTextActive: { color: '#FFF', fontWeight: '600' },

  timesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  timeButton: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#00897B', backgroundColor: '#F0FAF9',
  },
  timeButtonText: { fontSize: 14, fontWeight: '700', color: '#00897B', marginLeft: 6 },

  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  colorSwatch: { width: 30, height: 30, borderRadius: 15 },
  colorSwatchSelected: { borderWidth: 3, borderColor: '#212121' },

  saveBtn: {
    backgroundColor: '#00897B', borderRadius: 24, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  saveBtnDisabled: { backgroundColor: '#B2DFDB' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
