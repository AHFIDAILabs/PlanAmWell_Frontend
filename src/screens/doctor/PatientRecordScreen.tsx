import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { AppStackParamList } from "../../types/App";
import { IMedicalRecord, IConsultationNote } from "../../types/backendType";
import {
  getPatientRecord,
  downloadAndSharePDF,
} from "../../services/MedicalRecord";

type RouteProps = RouteProp<AppStackParamList, "PatientRecordScreen">;

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={pStyles.section}>
    <Text style={pStyles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Row = ({ label, value }: { label: string; value?: string }) =>
  value ? (
    <Text style={pStyles.row}>
      <Text style={pStyles.rowLabel}>{label}: </Text>
      {value}
    </Text>
  ) : null;

export default function PatientRecordScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const { patientId, patientName, appointmentId } = route.params;

  const [record, setRecord] = useState<IMedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getPatientRecord(patientId, appointmentId);
        setRecord(data);
      } catch (err: any) {
        Toast.show({
          type: "error",
          text1: "Failed to load record",
          text2: err.message,
        });
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadAndSharePDF(patientId);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Download failed",
        text2: err.message,
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading)
    return (
      <SafeAreaView style={pStyles.screen}>
        <ActivityIndicator
          size="large"
          color="#D81E5B"
          style={{ marginTop: 40 }}
        />
      </SafeAreaView>
    );

  if (!record) return null;

  const p = record.patientSnapshot;

  return (
    <SafeAreaView style={pStyles.screen} edges={["top"]}>
      <View style={pStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={pStyles.headerTitle}>{patientName}</Text>
          <Text style={pStyles.headerSub}>Medical Record</Text>
        </View>
        <TouchableOpacity
          style={pStyles.downloadBtn}
          onPress={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="download-outline" size={16} color="#fff" />
              <Text style={pStyles.downloadText}>PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={pStyles.scroll}>
        {/* Patient Info */}
        <Section title="Patient Information">
          <Row label="Name" value={p.name} />
          <Row label="Gender" value={p.gender} />
          <Row label="Date of Birth" value={p.dateOfBirth} />
          <Row label="Phone" value={p.phone} />
          <Row label="Blood Group" value={p.bloodGroup} />
          <Row label="Allergies" value={p.allergies?.join(", ")} />
          <Row label="Address" value={p.homeAddress} />
        </Section>

        {/* Consultation notes (newest first) */}
        {[...record.consultationNotes].reverse().map((note, idx) => (
          <NoteCard
            key={note._id}
            note={note}
            index={record.consultationNotes.length - idx}
          />
        ))}

        {record.consultationNotes.length === 0 && (
          <Text style={pStyles.empty}>No consultation notes yet.</Text>
        )}

        {/* Access log */}
        {record.accessLog.length > 0 && (
          <Section title="Access Log">
            {record.accessLog.map((entry, i) => (
              <Text key={i} style={pStyles.logEntry}>
                {entry.doctorName} —{" "}
                {new Date(entry.accessedAt).toLocaleString()}
              </Text>
            ))}
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NoteCard({ note, index }: { note: IConsultationNote; index: number }) {
  const [expanded, setExpanded] = useState(index === 1); // expand latest by default

  return (
    <View style={pStyles.noteCard}>
      <TouchableOpacity
        style={pStyles.noteHeader}
        onPress={() => setExpanded((v) => !v)}
      >
        <View style={{ flex: 1 }}>
          <Text style={pStyles.noteDate}>
            {new Date(note.consultationDate).toLocaleDateString()}
          </Text>
          <Text style={pStyles.noteDoctor}>
            {note.doctorName} · {note.doctorSpecialization}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#666"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={pStyles.noteBody}>
          <Row label="Chief Complaint" value={note.chiefComplaint} />

          {note.vitalSigns && Object.values(note.vitalSigns).some(Boolean) && (
            <View style={pStyles.subSection}>
              <Text style={pStyles.subTitle}>Vital Signs</Text>
              <Row label="BP" value={note.vitalSigns.bloodPressure} />
              <Row label="Pulse" value={note.vitalSigns.pulse} />
              <Row label="Temperature" value={note.vitalSigns.temperature} />
              <Row label="Weight" value={note.vitalSigns.weight} />
              <Row label="Height" value={note.vitalSigns.height} />
              <Row label="BMI" value={note.vitalSigns.bmi} />
              <Row
                label="O₂ Saturation"
                value={note.vitalSigns.oxygenSaturation}
              />
            </View>
          )}

          {note.diagnosis.length > 0 && (
            <View style={pStyles.subSection}>
              <Text style={pStyles.subTitle}>Diagnosis</Text>
              {note.diagnosis.map((d, i) => (
                <Text key={i} style={pStyles.bulletItem}>
                  • {d.description}
                  {d.code ? ` (${d.code})` : ""}
                  {d.severity ? ` — ${d.severity}` : ""}
                </Text>
              ))}
            </View>
          )}

          {note.prescriptions.length > 0 && (
            <View style={pStyles.subSection}>
              <Text style={pStyles.subTitle}>Prescriptions</Text>
              {note.prescriptions.map((rx, i) => (
                <Text key={i} style={pStyles.bulletItem}>
                  • {rx.drug} {rx.dosage} ({rx.form}) — {rx.frequency} for{" "}
                  {rx.duration}
                  {rx.instructions ? `\n  ${rx.instructions}` : ""}
                </Text>
              ))}
            </View>
          )}

          {note.labTests.length > 0 && (
            <View style={pStyles.subSection}>
              <Text style={pStyles.subTitle}>Lab Tests</Text>
              {note.labTests.map((t, i) => (
                <Text key={i} style={pStyles.bulletItem}>
                  • {t.name}
                  {t.result ? `: ${t.result} ${t.unit || ""}` : " (pending)"}
                  {t.status ? ` — ${t.status}` : ""}
                </Text>
              ))}
            </View>
          )}

          {note.followUpInstructions && (
            <Row label="Follow-up" value={note.followUpInstructions} />
          )}
          {note.followUpDate && (
            <Row
              label="Follow-up Date"
              value={new Date(note.followUpDate).toLocaleDateString()}
            />
          )}
        </View>
      )}
    </View>
  );
}

const pStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  headerSub: { fontSize: 12, color: "#666" },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D81E5B",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  downloadText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  scroll: { padding: 16 },

  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D81E5B",
    marginBottom: 8,
  },
  row: { fontSize: 13, color: "#333", marginBottom: 4 },
  rowLabel: { fontWeight: "600", color: "#111" },

  noteCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    overflow: "hidden",
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  noteDate: { fontSize: 14, fontWeight: "700", color: "#111" },
  noteDoctor: { fontSize: 12, color: "#666", marginTop: 2 },
  noteBody: { padding: 14 },

  subSection: { marginTop: 10 },
  subTitle: { fontSize: 13, fontWeight: "700", color: "#444", marginBottom: 6 },
  bulletItem: { fontSize: 13, color: "#333", marginBottom: 4, lineHeight: 18 },

  logEntry: { fontSize: 12, color: "#666", marginBottom: 4 },
  empty: { textAlign: "center", color: "#aaa", marginTop: 40, fontSize: 15 },
});
