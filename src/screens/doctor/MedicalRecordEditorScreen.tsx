// screens/doctor/MedicalRecordEditorScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { AppStackParamList } from "../../types/App";
import {
  IPrescription,
  IDiagnosisEntry,
  ILabTest,
  IVitalSigns,
} from "../../types/backendType";
import { saveConsultationNote } from "../../services/MedicalRecord";

type RouteProps = RouteProp<AppStackParamList, "MedicalRecordEditorScreen">;

// ─── Small reusable section header ───────────────────────────────────────────
const SectionHeader = ({ title, icon }: { title: string; icon: string }) => (
  <View style={styles.sectionHeader}>
    <Ionicons name={icon as any} size={18} color="#D81E5B" />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ─── Labelled text input ──────────────────────────────────────────────────────
const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  optional,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
  optional?: boolean;
}) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.label}>
      {label}
      {optional && <Text style={styles.optional}> (optional)</Text>}
    </Text>
    <TextInput
      style={[styles.input, multiline && styles.inputMulti]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || label}
      placeholderTextColor="#bbb"
      multiline={multiline}
      keyboardType={keyboardType || "default"}
    />
  </View>
);

// ─── Empty prescription / diagnosis / labtest factories ───────────────────────
const emptyRx = (): IPrescription => ({
  drug: "",
  dosage: "",
  form: "",
  frequency: "",
  duration: "",
  instructions: "",
});
const emptyDx = (): IDiagnosisEntry => ({
  code: "",
  description: "",
  severity: undefined,
});
const emptyLab = (): ILabTest => ({
  name: "",
  result: "",
  unit: "",
  referenceRange: "",
  status: undefined,
});

export default function MedicalRecordEditorScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const { appointmentId, patientId, patientName } = route.params;

  const [saving, setSaving] = useState(false);

  // Core fields
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");

  // Patient extras (doctor fills if known)
  const [bloodGroup, setBloodGroup] = useState("");
  const [allergies, setAllergies] = useState(""); // comma-separated → array on save

  // Vitals
  const [vitals, setVitals] = useState<IVitalSigns>({});
  const updateVital = (key: keyof IVitalSigns, val: string) =>
    setVitals((prev) => ({ ...prev, [key]: val }));

  // Dynamic lists
  const [diagnoses, setDiagnoses] = useState<IDiagnosisEntry[]>([emptyDx()]);
  const [prescriptions, setPrescriptions] = useState<IPrescription[]>([
    emptyRx(),
  ]);
  const [labTests, setLabTests] = useState<ILabTest[]>([]);

  // ── Dynamic list helpers ──────────────────────────────────────────────────
  const updateDx = (i: number, key: keyof IDiagnosisEntry, val: string) =>
    setDiagnoses((prev) =>
      prev.map((d, idx) => (idx === i ? { ...d, [key]: val } : d)),
    );

  const updateRx = (i: number, key: keyof IPrescription, val: string) =>
    setPrescriptions((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)),
    );

  const updateLab = (i: number, key: keyof ILabTest, val: string) =>
    setLabTests((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, [key]: val } : l)),
    );

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!chiefComplaint.trim()) {
      Toast.show({ type: "error", text1: "Chief complaint is required." });
      return;
    }

    // Filter out empty entries
    const cleanDx = diagnoses.filter((d) => d.description.trim());
    const cleanRx = prescriptions.filter(
      (r) => r.drug.trim() && r.dosage.trim(),
    );
    const cleanLab = labTests.filter((l) => l.name.trim());

    try {
      setSaving(true);
      await saveConsultationNote({
        appointmentId,
        chiefComplaint: chiefComplaint.trim(),
        vitalSigns: Object.values(vitals).some(Boolean) ? vitals : undefined,
        diagnosis: cleanDx,
        prescriptions: cleanRx,
        labTests: cleanLab,
        followUpInstructions: followUpInstructions.trim() || undefined,
        followUpDate: followUpDate.trim() || undefined,
        privateNotes: privateNotes.trim() || undefined,
        bloodGroup: bloodGroup.trim() || undefined,
        allergies: allergies.trim()
          ? allergies
              .split(",")
              .map((a) => a.trim())
              .filter(Boolean)
          : undefined,
      });

      Toast.show({ type: "success", text1: "Consultation note saved." });
navigation.navigate("ChatRoomScreen", { 
  appointmentId, 
  conversationId: undefined,
  keepLocked: true   // signal to ChatRoomScreen to stay locked
});
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to save note",
        text2: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── Render 
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Consultation Note</Text>
          <Text style={styles.headerSub}>{patientName}</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Chief Complaint ── */}
          <SectionHeader
            title="Chief Complaint *"
            icon="alert-circle-outline"
          />
          <Field
            label="Chief Complaint"
            value={chiefComplaint}
            onChangeText={setChiefComplaint}
            placeholder="e.g. Persistent headache for 3 days"
            multiline
          />

          {/* ── Patient Info (extras) ── */}
          <SectionHeader title="Patient Info" icon="person-outline" />
          <Field
            label="Blood Group"
            value={bloodGroup}
            onChangeText={setBloodGroup}
            placeholder="e.g. O+"
            optional
          />
          <Field
            label="Known Allergies"
            value={allergies}
            onChangeText={setAllergies}
            placeholder="e.g. Penicillin, Aspirin (comma-separated)"
            optional
          />

          {/* ── Vital Signs ── */}
          <SectionHeader title="Vital Signs" icon="pulse-outline" />
          <View style={styles.vitalsGrid}>
            {[
              {
                key: "bloodPressure",
                label: "Blood Pressure",
                placeholder: "120/80 mmHg",
              },
              { key: "pulse", label: "Pulse", placeholder: "72 bpm" },
              {
                key: "temperature",
                label: "Temperature",
                placeholder: "37.2°C",
              },
              { key: "weight", label: "Weight", placeholder: "70 kg" },
              { key: "height", label: "Height", placeholder: "175 cm" },
              { key: "bmi", label: "BMI", placeholder: "22.9" },
              {
                key: "oxygenSaturation",
                label: "O₂ Saturation",
                placeholder: "98%",
              },
            ].map(({ key, label, placeholder }) => (
              <View key={key} style={styles.vitalField}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={(vitals as any)[key] || ""}
                  onChangeText={(v) => updateVital(key as keyof IVitalSigns, v)}
                  placeholder={placeholder}
                  placeholderTextColor="#bbb"
                />
              </View>
            ))}
          </View>

          {/* ── Diagnosis ── */}
          <SectionHeader title="Diagnosis" icon="medical-outline" />
          {diagnoses.map((dx, i) => (
            <View key={i} style={styles.listCard}>
              <View style={styles.listCardHeader}>
                <Text style={styles.listCardLabel}>Diagnosis {i + 1}</Text>
                {diagnoses.length > 1 && (
                  <TouchableOpacity
                    onPress={() =>
                      setDiagnoses((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
              <Field
                label="Description *"
                value={dx.description}
                onChangeText={(v) => updateDx(i, "description", v)}
                placeholder="e.g. Hypertension Stage 1"
              />
              <Field
                label="ICD-10 Code"
                value={dx.code || ""}
                onChangeText={(v) => updateDx(i, "code", v)}
                placeholder="e.g. I10"
                optional
              />
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>
                  Severity<Text style={styles.optional}> (optional)</Text>
                </Text>
                <View style={styles.chipRow}>
                  {(["mild", "moderate", "severe"] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.chip,
                        dx.severity === s && styles.chipActive,
                      ]}
                      onPress={() =>
                        updateDx(i, "severity", dx.severity === s ? "" : s)
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          dx.severity === s && styles.chipTextActive,
                        ]}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setDiagnoses((p) => [...p, emptyDx()])}
          >
            <Ionicons name="add-circle-outline" size={18} color="#D81E5B" />
            <Text style={styles.addBtnText}>Add Diagnosis</Text>
          </TouchableOpacity>

          {/* ── Prescriptions ── */}
          <SectionHeader title="Prescriptions" icon="flask-outline" />
          {prescriptions.map((rx, i) => (
            <View key={i} style={styles.listCard}>
              <View style={styles.listCardHeader}>
                <Text style={styles.listCardLabel}>Prescription {i + 1}</Text>
                {prescriptions.length > 1 && (
                  <TouchableOpacity
                    onPress={() =>
                      setPrescriptions((p) => p.filter((_, idx) => idx !== i))
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
              <Field
                label="Drug Name *"
                value={rx.drug}
                onChangeText={(v) => updateRx(i, "drug", v)}
                placeholder="e.g. Amoxicillin"
              />
              <Field
                label="Dosage *"
                value={rx.dosage}
                onChangeText={(v) => updateRx(i, "dosage", v)}
                placeholder="e.g. 500mg"
              />
              <Field
                label="Form *"
                value={rx.form}
                onChangeText={(v) => updateRx(i, "form", v)}
                placeholder="e.g. Tablet, Capsule, Syrup"
              />
              <Field
                label="Frequency *"
                value={rx.frequency}
                onChangeText={(v) => updateRx(i, "frequency", v)}
                placeholder="e.g. Twice daily"
              />
              <Field
                label="Duration *"
                value={rx.duration}
                onChangeText={(v) => updateRx(i, "duration", v)}
                placeholder="e.g. 7 days"
              />
              <Field
                label="Instructions"
                value={rx.instructions || ""}
                onChangeText={(v) => updateRx(i, "instructions", v)}
                placeholder="e.g. Take after meals"
                optional
              />
            </View>
          ))}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setPrescriptions((p) => [...p, emptyRx()])}
          >
            <Ionicons name="add-circle-outline" size={18} color="#D81E5B" />
            <Text style={styles.addBtnText}>Add Prescription</Text>
          </TouchableOpacity>

          {/* ── Lab Tests ── */}
          <SectionHeader title="Lab Tests" icon="beaker-outline" />
          {labTests.length === 0 && (
            <Text style={styles.emptyHint}>No lab tests added yet.</Text>
          )}
          {labTests.map((lab, i) => (
            <View key={i} style={styles.listCard}>
              <View style={styles.listCardHeader}>
                <Text style={styles.listCardLabel}>Lab Test {i + 1}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setLabTests((p) => p.filter((_, idx) => idx !== i))
                  }
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <Field
                label="Test Name *"
                value={lab.name}
                onChangeText={(v) => updateLab(i, "name", v)}
                placeholder="e.g. Full Blood Count"
              />
              <Field
                label="Result"
                value={lab.result || ""}
                onChangeText={(v) => updateLab(i, "result", v)}
                placeholder="e.g. 14.5"
                optional
              />
              <Field
                label="Unit"
                value={lab.unit || ""}
                onChangeText={(v) => updateLab(i, "unit", v)}
                placeholder="e.g. g/dL"
                optional
              />
              <Field
                label="Reference Range"
                value={lab.referenceRange || ""}
                onChangeText={(v) => updateLab(i, "referenceRange", v)}
                placeholder="e.g. 12–16 g/dL"
                optional
              />
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>
                  Status<Text style={styles.optional}> (optional)</Text>
                </Text>
                <View style={styles.chipRow}>
                  {(["normal", "abnormal", "pending"] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.chip,
                        lab.status === s && styles.chipActive,
                      ]}
                      onPress={() =>
                        updateLab(i, "status", lab.status === s ? "" : s)
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          lab.status === s && styles.chipTextActive,
                        ]}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setLabTests((p) => [...p, emptyLab()])}
          >
            <Ionicons name="add-circle-outline" size={18} color="#D81E5B" />
            <Text style={styles.addBtnText}>Add Lab Test</Text>
          </TouchableOpacity>

          {/* ── Follow-up ── */}
          <SectionHeader title="Follow-up" icon="calendar-outline" />
          <Field
            label="Follow-up Instructions"
            value={followUpInstructions}
            onChangeText={setFollowUpInstructions}
            multiline
            optional
            placeholder="e.g. Return in 2 weeks for BP check"
          />
          <Field
            label="Follow-up Date (YYYY-MM-DD)"
            value={followUpDate}
            onChangeText={setFollowUpDate}
            optional
            placeholder="e.g. 2025-04-10"
          />

          {/* ── Private Notes ── */}
          <SectionHeader title="Private Notes" icon="lock-closed-outline" />
          <Text style={styles.privateHint}>
            These notes are visible only to you — not shared with the patient or
            other doctors.
          </Text>
          <Field
            label="Private Notes"
            value={privateNotes}
            onChangeText={setPrivateNotes}
            multiline
            optional
            placeholder="Your personal clinical observations..."
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  headerSub: { fontSize: 12, color: "#666", marginTop: 2 },
  saveBtn: {
    backgroundColor: "#D81E5B",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnDisabled: { backgroundColor: "#ccc" },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  scroll: { padding: 16 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111" },

  fieldWrap: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 4 },
  optional: { fontSize: 12, color: "#aaa", fontWeight: "400" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
  },
  inputMulti: { minHeight: 80, textAlignVertical: "top" },

  vitalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vitalField: { width: "47%" },

  listCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    elevation: 1,
  },
  listCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  listCardLabel: { fontSize: 13, fontWeight: "700", color: "#D81E5B" },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    marginBottom: 4,
  },
  addBtnText: { color: "#D81E5B", fontWeight: "600", fontSize: 14 },

  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 },
  chip: {
    borderWidth: 1,
    borderColor: "#D81E5B",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  chipActive: { backgroundColor: "#D81E5B" },
  chipText: { fontSize: 13, color: "#D81E5B", fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  emptyHint: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 8,
    fontStyle: "italic",
  },
  privateHint: {
    color: "#888",
    fontSize: 12,
    marginBottom: 10,
    fontStyle: "italic",
  },
});
