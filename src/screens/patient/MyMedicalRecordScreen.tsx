import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { IMedicalRecord, IAccessRequest, IConsultationNote } from "../../types/backendType";
import {
  getMyMedicalRecord,
  getAllAccessRequests,
  respondToAccessRequest,
  downloadAndSharePDF,
} from "../../services/MedicalRecord";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}yr ago`;
}

function groupByYear(notes: IConsultationNote[]): [string, IConsultationNote[]][] {
  const map: Record<string, IConsultationNote[]> = {};
  for (const n of notes) {
    const yr = new Date(n.consultationDate).getFullYear().toString();
    (map[yr] = map[yr] || []).push(n);
  }
  return Object.entries(map).sort(([a], [b]) => Number(b) - Number(a));
}

const SEVERITY_COLOR: Record<string, string> = {
  mild: "#388E3C",
  moderate: "#F57C00",
  severe: "#C62828",
};

// ─── Timeline card ────────────────────────────────────────────────────────────

function TimelineCard({
  note,
  isLast,
  accent,
}: {
  note: IConsultationNote;
  isLast: boolean;
  accent: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasPrescriptions = note.prescriptions.length > 0;
  const hasLabs = note.labTests.length > 0;
  const hasExtra = hasPrescriptions || hasLabs || !!note.followUpDate || !!note.followUpInstructions;

  return (
    <View style={tStyles.row}>
      {/* Timeline spine */}
      <View style={tStyles.spine}>
        <View style={[tStyles.node, { borderColor: accent, backgroundColor: accent }]}>
          <Ionicons name="medkit" size={10} color="#FFF" />
        </View>
        {!isLast && <View style={tStyles.line} />}
      </View>

      {/* Card */}
      <View style={tStyles.card}>
        {/* Date chip */}
        <View style={tStyles.dateRow}>
          <Text style={tStyles.date}>{formatDate(note.consultationDate)}</Text>
          <Text style={tStyles.relDate}>{relativeTime(note.consultationDate)}</Text>
        </View>

        {/* Doctor */}
        <View style={tStyles.doctorRow}>
          <View style={[tStyles.doctorAvatar, { backgroundColor: accent + "22" }]}>
            <Ionicons name="person" size={14} color={accent} />
          </View>
          <View>
            <Text style={tStyles.doctorName}>{note.doctorName}</Text>
            <Text style={tStyles.doctorSpec}>{note.doctorSpecialization}</Text>
          </View>
        </View>

        {/* Chief complaint */}
        <View style={tStyles.complaintBox}>
          <Text style={tStyles.complaintLabel}>Chief Complaint</Text>
          <Text style={tStyles.complaint}>{note.chiefComplaint}</Text>
        </View>

        {/* Diagnoses */}
        {note.diagnosis.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <Text style={tStyles.sectionLabel}>Diagnosis</Text>
            <View style={tStyles.chipRow}>
              {note.diagnosis.map((d, i) => (
                <View
                  key={i}
                  style={[
                    tStyles.chip,
                    {
                      backgroundColor:
                        (SEVERITY_COLOR[d.severity ?? ""] ?? "#1976D2") + "18",
                      borderColor: SEVERITY_COLOR[d.severity ?? ""] ?? "#1976D2",
                    },
                  ]}
                >
                  <Text
                    style={[
                      tStyles.chipText,
                      { color: SEVERITY_COLOR[d.severity ?? ""] ?? "#1976D2" },
                    ]}
                  >
                    {d.description}
                    {d.severity ? ` · ${d.severity}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Prescriptions (always visible summary) */}
        {hasPrescriptions && (
          <View style={{ marginBottom: 8 }}>
            <Text style={tStyles.sectionLabel}>Prescriptions</Text>
            {note.prescriptions.slice(0, expanded ? undefined : 2).map((rx, i) => (
              <View key={i} style={tStyles.rxRow}>
                <View style={[tStyles.rxDot, { backgroundColor: accent }]} />
                <Text style={tStyles.rxText}>
                  <Text style={{ fontWeight: "700" }}>{rx.drug}</Text>
                  {rx.dosage ? ` ${rx.dosage}` : ""}
                  {rx.frequency ? ` · ${rx.frequency}` : ""}
                  {rx.duration ? ` · ${rx.duration}` : ""}
                </Text>
              </View>
            ))}
            {!expanded && note.prescriptions.length > 2 && (
              <Text style={[tStyles.moreText, { color: accent }]}>
                +{note.prescriptions.length - 2} more
              </Text>
            )}
          </View>
        )}

        {/* Expanded details */}
        {expanded && (
          <>
            {hasLabs && (
              <View style={{ marginBottom: 8 }}>
                <Text style={tStyles.sectionLabel}>Lab Tests</Text>
                {note.labTests.map((lab, i) => (
                  <View key={i} style={tStyles.labRow}>
                    <Text style={tStyles.labName}>{lab.name}</Text>
                    {lab.result && (
                      <Text
                        style={[
                          tStyles.labStatus,
                          {
                            color:
                              lab.status === "abnormal"
                                ? "#C62828"
                                : lab.status === "normal"
                                  ? "#388E3C"
                                  : "#888",
                          },
                        ]}
                      >
                        {lab.result} {lab.unit ?? ""}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {note.followUpDate && (
              <View style={tStyles.followUpRow}>
                <Ionicons name="calendar-outline" size={13} color="#888" />
                <Text style={tStyles.followUpText}>
                  {"  Follow-up: "}
                  <Text style={{ fontWeight: "700" }}>{formatDate(note.followUpDate)}</Text>
                </Text>
              </View>
            )}

            {note.followUpInstructions && (
              <Text style={tStyles.followUpInstr}>{note.followUpInstructions}</Text>
            )}
          </>
        )}

        {/* Expand / Collapse */}
        {hasExtra && (
          <TouchableOpacity style={tStyles.expandBtn} onPress={() => setExpanded(e => !e)}>
            <Text style={[tStyles.expandText, { color: accent }]}>
              {expanded ? "Show less" : "Show more"}
            </Text>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={13}
              color={accent}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Stats banner ─────────────────────────────────────────────────────────────

function StatsBanner({ record }: { record: IMedicalRecord }) {
  const notes = record.consultationNotes;
  const uniqueDoctors = new Set(notes.map(n => n.doctorName)).size;
  const lastNote = notes.length > 0 ? notes[notes.length - 1] : null;
  const lastVisit = lastNote ? relativeTime(lastNote.consultationDate) : "—";

  return (
    <View style={sStyles.banner}>
      <View style={sStyles.stat}>
        <Text style={sStyles.statNum}>{notes.length}</Text>
        <Text style={sStyles.statLabel}>Consultations</Text>
      </View>
      <View style={sStyles.divider} />
      <View style={sStyles.stat}>
        <Text style={sStyles.statNum}>{uniqueDoctors}</Text>
        <Text style={sStyles.statLabel}>Doctors</Text>
      </View>
      <View style={sStyles.divider} />
      <View style={sStyles.stat}>
        <Text style={sStyles.statNum}>{lastVisit}</Text>
        <Text style={sStyles.statLabel}>Last Visit</Text>
      </View>
    </View>
  );
}

// ─── Accent colours per year ──────────────────────────────────────────────────
const YEAR_ACCENTS = ["#D81E5B", "#1976D2", "#388E3C", "#7B1FA2", "#F57C00"];

// ─── Main screen ──────────────────────────────────────────────────────────────

export function MyMedicalRecordScreen() {
  const navigation = useNavigation<any>();
  const [record, setRecord] = useState<IMedicalRecord | null>(null);
  const [requests, setRequests] = useState<IAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"record" | "access">("record");
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [rec, reqs] = await Promise.all([
        getMyMedicalRecord(),
        getAllAccessRequests(),
      ]);
      setRecord(rec);
      setRequests(reqs);
    } catch (err: any) {
      Toast.show({ type: "error", text1: "Failed to load", text2: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRespond = async (requestId: string, approve: boolean) => {
    try {
      await respondToAccessRequest(requestId, approve);
      Toast.show({ type: "success", text1: approve ? "Access granted." : "Access denied." });
      load();
    } catch (err: any) {
      Toast.show({ type: "error", text1: "Failed to respond", text2: err.message });
    }
  };

  const handleDownload = async () => {
    if (!record) return;
    try {
      setDownloading(true);
      await downloadAndSharePDF(record.patientId);
    } catch (err: any) {
      Toast.show({ type: "error", text1: "Download failed", text2: err.message });
    } finally {
      setDownloading(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");

  if (loading) return (
    <SafeAreaView style={mStyles.screen}>
      <ActivityIndicator size="large" color="#D81E5B" style={{ marginTop: 60 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={mStyles.screen} edges={["top"]}>
      {/* Header */}
      <View style={mStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={mStyles.headerTitle}>Health Record</Text>
        {record && (
          <TouchableOpacity style={mStyles.downloadBtn} onPress={handleDownload} disabled={downloading}>
            {downloading ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name="download-outline" size={16} color="#fff" />
                <Text style={mStyles.downloadText}>PDF</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={mStyles.tabBar}>
        <TouchableOpacity style={[mStyles.tab, activeTab === "record" && mStyles.tabActive]} onPress={() => setActiveTab("record")}>
          <Text style={[mStyles.tabText, activeTab === "record" && mStyles.tabTextActive]}>Timeline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[mStyles.tab, activeTab === "access" && mStyles.tabActive]} onPress={() => setActiveTab("access")}>
          <Text style={[mStyles.tabText, activeTab === "access" && mStyles.tabTextActive]}>
            Access Requests{pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={mStyles.scroll}>

        {/* ── Timeline tab ── */}
        {activeTab === "record" && (
          record ? (
            <>
              {/* Patient snapshot card */}
              <View style={mStyles.snapshotCard}>
                <View style={mStyles.snapshotLeft}>
                  <View style={mStyles.avatarCircle}>
                    <Ionicons name="person" size={22} color="#D81E5B" />
                  </View>
                  <View>
                    <Text style={mStyles.patientName}>{record.patientSnapshot.name}</Text>
                    <Text style={mStyles.patientMeta}>
                      {[
                        record.patientSnapshot.gender,
                        record.patientSnapshot.bloodGroup ? `Blood: ${record.patientSnapshot.bloodGroup}` : null,
                      ].filter(Boolean).join("  ·  ")}
                    </Text>
                    {record.patientSnapshot.allergies && record.patientSnapshot.allergies.length > 0 && (
                      <View style={mStyles.allergyRow}>
                        <Ionicons name="alert-circle" size={11} color="#F57C00" />
                        <Text style={mStyles.allergyText}>
                          {"  "}Allergies: {record.patientSnapshot.allergies.join(", ")}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Stats */}
              <StatsBanner record={record} />

              {/* Timeline */}
              {groupByYear([...record.consultationNotes].reverse()).map(([year, notes], yi) => {
                const accent = YEAR_ACCENTS[yi % YEAR_ACCENTS.length];
                return (
                  <View key={year}>
                    <View style={mStyles.yearHeaderRow}>
                      <View style={[mStyles.yearDot, { backgroundColor: accent }]} />
                      <Text style={[mStyles.yearLabel, { color: accent }]}>{year}</Text>
                      <View style={mStyles.yearLine} />
                    </View>
                    {notes.map((note, i) => (
                      <TimelineCard
                        key={note._id}
                        note={note}
                        isLast={i === notes.length - 1}
                        accent={accent}
                      />
                    ))}
                  </View>
                );
              })}
            </>
          ) : (
            <View style={mStyles.empty}>
              <Ionicons name="document-text-outline" size={60} color="#ccc" />
              <Text style={mStyles.emptyText}>No medical record yet.</Text>
              <Text style={mStyles.emptySubText}>Your record is created after your first consultation.</Text>
            </View>
          )
        )}

        {/* ── Access requests tab ── */}
        {activeTab === "access" && (
          requests.length === 0 ? (
            <View style={mStyles.empty}>
              <Ionicons name="shield-checkmark-outline" size={60} color="#ccc" />
              <Text style={mStyles.emptyText}>No access requests yet.</Text>
            </View>
          ) : (
            requests.map(req => {
              const doctor = req.requestingDoctorId as any;
              const doctorName = doctor?.firstName ? `Dr. ${doctor.lastName || doctor.firstName}` : "A doctor";
              const spec = doctor?.specialization || "";
              return (
                <View key={req._id} style={mStyles.requestCard}>
                  <View style={mStyles.requestTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={mStyles.requestDoctor}>{doctorName}</Text>
                      {spec ? <Text style={mStyles.requestSpec}>{spec}</Text> : null}
                      <Text style={mStyles.requestDate}>Requested: {new Date(req.requestedAt).toLocaleString()}</Text>
                    </View>
                    <View style={[mStyles.statusBadge, {
                      backgroundColor: req.status === "pending" ? "#FEF3C7" : req.status === "approved" ? "#DCFCE7" : req.status === "denied" ? "#FEE2E2" : "#F3F4F6",
                    }]}>
                      <Text style={[mStyles.statusText, {
                        color: req.status === "pending" ? "#D97706" : req.status === "approved" ? "#16A34A" : req.status === "denied" ? "#DC2626" : "#6B7280",
                      }]}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  {req.status === "pending" && (
                    <View style={mStyles.requestActions}>
                      <TouchableOpacity style={mStyles.denyBtn} onPress={() => handleRespond(req._id, false)}>
                        <Text style={mStyles.denyBtnText}>Deny</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={mStyles.approveBtn} onPress={() => handleRespond(req._id, true)}>
                        <Text style={mStyles.approveBtnText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Stats banner styles ───────────────────────────────────────────────────────
const sStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 14,
    marginBottom: 20,
    paddingVertical: 14,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  stat: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "800", color: "#D81E5B" },
  statLabel: { fontSize: 11, color: "#888", marginTop: 2 },
  divider: { width: 1, backgroundColor: "#F0F0F0", marginVertical: 4 },
});

// ─── Timeline card styles ──────────────────────────────────────────────────────
const tStyles = StyleSheet.create({
  row: { flexDirection: "row", marginBottom: 0 },
  spine: { width: 32, alignItems: "center" },
  node: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, marginTop: 14,
  },
  line: { width: 2, flex: 1, backgroundColor: "#E0E0E0", marginTop: 2 },

  card: {
    flex: 1, backgroundColor: "#FFF", borderRadius: 14,
    padding: 14, marginBottom: 12, marginLeft: 6,
    elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
  },
  dateRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  date: { fontSize: 13, fontWeight: "700", color: "#212121" },
  relDate: { fontSize: 11, color: "#9E9E9E", backgroundColor: "#F5F5F5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  doctorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  doctorAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  doctorName: { fontSize: 13, fontWeight: "700", color: "#212121" },
  doctorSpec: { fontSize: 11, color: "#888", marginTop: 1 },

  complaintBox: { backgroundColor: "#F9F9F9", borderRadius: 8, padding: 10, marginBottom: 10 },
  complaintLabel: { fontSize: 10, fontWeight: "700", color: "#9E9E9E", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  complaint: { fontSize: 13, color: "#333", lineHeight: 18 },

  sectionLabel: { fontSize: 10, fontWeight: "700", color: "#9E9E9E", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: "600" },

  rxRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  rxDot: { width: 5, height: 5, borderRadius: 3, marginTop: 5, marginRight: 8 },
  rxText: { flex: 1, fontSize: 12, color: "#444", lineHeight: 17 },
  moreText: { fontSize: 12, fontWeight: "600", marginTop: 2 },

  labRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  labName: { fontSize: 12, color: "#444" },
  labStatus: { fontSize: 12, fontWeight: "600" },

  followUpRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  followUpText: { fontSize: 12, color: "#666" },
  followUpInstr: { fontSize: 12, color: "#888", marginTop: 4, fontStyle: "italic" },

  expandBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10, alignSelf: "flex-start" },
  expandText: { fontSize: 12, fontWeight: "600" },
});

// ─── Screen-level styles ───────────────────────────────────────────────────────
const mStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16, backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#E0E0E0",
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#111" },
  downloadBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#D81E5B", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
  },
  downloadText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  tabBar: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E0E0E0" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#D81E5B" },
  tabText: { fontSize: 14, color: "#888", fontWeight: "600" },
  tabTextActive: { color: "#D81E5B" },

  scroll: { padding: 16, paddingBottom: 40 },

  snapshotCard: {
    backgroundColor: "#FFF", borderRadius: 14, padding: 16,
    marginBottom: 14, elevation: 1,
    shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3,
  },
  snapshotLeft: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#FFE5EB", alignItems: "center", justifyContent: "center",
  },
  patientName: { fontSize: 16, fontWeight: "700", color: "#111" },
  patientMeta: { fontSize: 12, color: "#888", marginTop: 3 },
  allergyRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  allergyText: { fontSize: 11, color: "#F57C00", fontWeight: "600" },

  yearHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, marginTop: 4 },
  yearDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  yearLabel: { fontSize: 15, fontWeight: "800", marginRight: 10 },
  yearLine: { flex: 1, height: 1, backgroundColor: "#E0E0E0" },

  requestCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  requestTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  requestDoctor: { fontSize: 14, fontWeight: "700", color: "#111" },
  requestSpec: { fontSize: 12, color: "#666", marginTop: 2 },
  requestDate: { fontSize: 11, color: "#999", marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" },
  statusText: { fontSize: 12, fontWeight: "700" },
  requestActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  denyBtn: { flex: 1, borderWidth: 1, borderColor: "#EF4444", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  denyBtnText: { color: "#EF4444", fontWeight: "700" },
  approveBtn: { flex: 1, backgroundColor: "#16A34A", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  approveBtnText: { color: "#fff", fontWeight: "700" },

  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#999", marginTop: 16 },
  emptySubText: { fontSize: 13, color: "#bbb", marginTop: 6, textAlign: "center" },
});
