import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Header from "../components/home/header";
import BottomBar from "../components/common/BottomBar";
import { familyMemberService, IFamilyMember, FamilyMemberInput } from "../services/familyMemberService";

const RELATIONSHIPS = ["Spouse", "Child", "Parent", "Sibling", "Other"] as const;
const GENDERS = ["Male", "Female", "Other"] as const;
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const REL_COLORS: Record<string, string> = {
  Spouse: "#D81E5B",
  Child: "#1976D2",
  Parent: "#388E3C",
  Sibling: "#F57C00",
  Other: "#7B1FA2",
};

// ── Empty form state ──────────────────────────────────────────────────────────
const emptyForm = (): FamilyMemberInput => ({
  name: "",
  relationship: "Spouse",
  gender: undefined,
  dateOfBirth: undefined,
  bloodGroup: undefined,
  allergies: undefined,
  notes: undefined,
});

// ── Member card ───────────────────────────────────────────────────────────────
const MemberCard: React.FC<{
  member: IFamilyMember;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ member, onEdit, onDelete }) => {
  const color = REL_COLORS[member.relationship] ?? "#555";
  const initials = member.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const age = member.dateOfBirth
    ? Math.floor((Date.now() - new Date(member.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <View style={styles.card}>
      <View style={[styles.avatarCircle, { backgroundColor: color + "22" }]}>
        <Text style={[styles.avatarText, { color }]}>{initials}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.memberName}>{member.name}</Text>
          <View style={[styles.relBadge, { backgroundColor: color + "22" }]}>
            <Text style={[styles.relText, { color }]}>{member.relationship}</Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          {age !== null && <Text style={styles.metaText}>{age} yrs</Text>}
          {member.gender && <Text style={styles.metaText}>{member.gender}</Text>}
          {member.bloodGroup && (
            <View style={styles.bloodBadge}>
              <Text style={styles.bloodText}>{member.bloodGroup}</Text>
            </View>
          )}
        </View>

        {member.allergies ? (
          <Text style={styles.allergyText} numberOfLines={1}>
            Allergies: {member.allergies}
          </Text>
        ) : null}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity onPress={onEdit} style={styles.iconBtn}>
          <Feather name="edit-2" size={16} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.iconBtn}>
          <Feather name="trash-2" size={16} color="#D81E5B" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
const FamilyProfilesScreen: React.FC = () => {
  const [members, setMembers] = useState<IFamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FamilyMemberInput>(emptyForm());
  const [showDobPicker, setShowDobPicker] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await familyMemberService.getAll();
      setMembers(data);
    } catch {
      Alert.alert("Error", "Could not load family profiles.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalVisible(true);
  };

  const openEdit = (m: IFamilyMember) => {
    setEditingId(m._id);
    setForm({
      name: m.name,
      relationship: m.relationship,
      gender: m.gender,
      dateOfBirth: m.dateOfBirth,
      bloodGroup: m.bloodGroup,
      allergies: m.allergies,
      notes: m.notes,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Validation", "Name is required.");
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        const updated = await familyMemberService.update(editingId, form);
        setMembers(prev => prev.map(m => m._id === editingId ? updated : m));
      } else {
        const created = await familyMemberService.create(form);
        setMembers(prev => [created, ...prev]);
      }
      setModalVisible(false);
    } catch {
      Alert.alert("Error", "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Remove Member", `Remove ${name} from your family profiles?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await familyMemberService.remove(id);
            setMembers(prev => prev.filter(m => m._id !== id));
          } catch {
            Alert.alert("Error", "Could not remove member.");
          }
        },
      },
    ]);
  };

  const dobLabel = form.dateOfBirth
    ? new Date(form.dateOfBirth).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
    : "Select date of birth";

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Family Profiles" />

      {loading ? (
        <ActivityIndicator size="large" color="#D81E5B" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {members.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={64} color="#DDD" />
              <Text style={styles.emptyTitle}>No family members yet</Text>
              <Text style={styles.emptySubtitle}>Add profiles to book appointments on their behalf</Text>
            </View>
          ) : (
            members.map(m => (
              <MemberCard
                key={m._id}
                member={m}
                onEdit={() => openEdit(m)}
                onDelete={() => handleDelete(m._id, m.name)}
              />
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <BottomBar activeRoute="ProfileScreen" cartItemCount={0} />

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editingId ? "Edit Member" : "Add Family Member"}</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Name */}
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Jane Doe"
                placeholderTextColor="#AAA"
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              {/* Relationship */}
              <Text style={styles.label}>Relationship *</Text>
              <View style={styles.chipRow}>
                {RELATIONSHIPS.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.chip, form.relationship === r && styles.chipActive]}
                    onPress={() => setForm(f => ({ ...f, relationship: r }))}
                  >
                    <Text style={[styles.chipText, form.relationship === r && styles.chipTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Gender */}
              <Text style={styles.label}>Gender</Text>
              <View style={styles.chipRow}>
                {GENDERS.map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, form.gender === g && styles.chipActive]}
                    onPress={() => setForm(f => ({ ...f, gender: f.gender === g ? undefined : g }))}
                  >
                    <Text style={[styles.chipText, form.gender === g && styles.chipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date of Birth */}
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowDobPicker(true)}>
                <Text style={{ color: form.dateOfBirth ? "#222" : "#AAA" }}>{dobLabel}</Text>
              </TouchableOpacity>
              {showDobPicker && (
                <DateTimePicker
                  value={form.dateOfBirth ? new Date(form.dateOfBirth) : new Date()}
                  mode="date"
                  maximumDate={new Date()}
                  onChange={(_, date) => {
                    setShowDobPicker(false);
                    if (date) setForm(f => ({ ...f, dateOfBirth: date.toISOString() }));
                  }}
                />
              )}

              {/* Blood Group */}
              <Text style={styles.label}>Blood Group</Text>
              <View style={styles.chipRow}>
                {BLOOD_GROUPS.map(bg => (
                  <TouchableOpacity
                    key={bg}
                    style={[styles.chip, form.bloodGroup === bg && styles.chipActive]}
                    onPress={() => setForm(f => ({ ...f, bloodGroup: f.bloodGroup === bg ? undefined : bg }))}
                  >
                    <Text style={[styles.chipText, form.bloodGroup === bg && styles.chipTextActive]}>{bg}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Allergies */}
              <Text style={styles.label}>Allergies</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Penicillin, Peanuts"
                placeholderTextColor="#AAA"
                value={form.allergies ?? ""}
                onChangeText={v => setForm(f => ({ ...f, allergies: v || undefined }))}
              />

              {/* Notes */}
              <Text style={styles.label}>Health Notes</Text>
              <TextInput
                style={[styles.input, { minHeight: 70 }]}
                placeholder="Any chronic conditions, medications, etc."
                placeholderTextColor="#AAA"
                value={form.notes ?? ""}
                onChangeText={v => setForm(f => ({ ...f, notes: v || undefined }))}
                multiline
                textAlignVertical="top"
              />

              {/* Actions */}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editingId ? "Save Changes" : "Add Member"}</Text>
                  )}
                </TouchableOpacity>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default FamilyProfilesScreen;

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  scroll: { padding: 16 },

  // Empty state
  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#555", marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: "#AAA", textAlign: "center", marginTop: 6, paddingHorizontal: 30 },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: "700" },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  memberName: { fontSize: 16, fontWeight: "700", color: "#222" },
  relBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  relText: { fontSize: 11, fontWeight: "600" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  metaText: { fontSize: 12, color: "#777" },
  bloodBadge: { backgroundColor: "#FFE0E0", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  bloodText: { fontSize: 11, color: "#C62828", fontWeight: "600" },
  allergyText: { fontSize: 12, color: "#F57C00", fontStyle: "italic" },
  cardActions: { gap: 8 },
  iconBtn: { padding: 6 },

  // FAB
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#D81E5B",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#D81E5B",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "92%",
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: "#DDD", alignSelf: "center", marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#222", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#FAFAFA",
    justifyContent: "center",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
  },
  chipActive: { backgroundColor: "#D81E5B", borderColor: "#D81E5B" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#555" },
  chipTextActive: { color: "#FFF" },

  // Modal buttons
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#DDD", alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#777" },
  saveBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: "#D81E5B", alignItems: "center",
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
});
