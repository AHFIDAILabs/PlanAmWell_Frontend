import React2, { useEffect, useState } from "react";
import {
  View as V,
  Text as T,
  ScrollView as SV,
  TouchableOpacity as TO,
  ActivityIndicator as AI,
  StyleSheet as SS,
  Alert as A,
} from "react-native";
import { SafeAreaView as SAV } from "react-native-safe-area-context";
import { Ionicons as II } from "@expo/vector-icons";
import { useNavigation as uN } from "@react-navigation/native";
import Toast2 from "react-native-toast-message";
import { IMedicalRecord, IAccessRequest } from "../../types/backendType";
import {
  getMyMedicalRecord,
  getAllAccessRequests,
  respondToAccessRequest,
  downloadAndSharePDF,
} from "../../services/MedicalRecord";

// NOTE: This file exports two components. In your project split them into
// separate files if preferred — they are combined here for delivery.

export function MyMedicalRecordScreen() {
  const navigation = uN<any>();
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
      Toast2.show({
        type: "error",
        text1: "Failed to load",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRespond = async (requestId: string, approve: boolean) => {
    try {
      await respondToAccessRequest(requestId, approve);
      Toast2.show({
        type: "success",
        text1: approve ? "Access granted." : "Access denied.",
      });
      load();
    } catch (err: any) {
      Toast2.show({
        type: "error",
        text1: "Failed to respond",
        text2: err.message,
      });
    }
  };

  const handleDownload = async () => {
    if (!record) return;
    try {
      setDownloading(true);
      await downloadAndSharePDF(record.patientId);
    } catch (err: any) {
      Toast2.show({
        type: "error",
        text1: "Download failed",
        text2: err.message,
      });
    } finally {
      setDownloading(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");

  if (loading)
    return (
      <SAV style={mStyles.screen}>
        <AI size="large" color="#D81E5B" style={{ marginTop: 60 }} />
      </SAV>
    );

  return (
    <SAV style={mStyles.screen} edges={["top"]}>
      {/* Header */}
      <V style={mStyles.header}>
        <TO onPress={() => navigation.goBack()}>
          <II name="chevron-back" size={26} color="#111" />
        </TO>
        <T style={mStyles.headerTitle}>My Medical Record</T>
        {record && (
          <TO
            style={mStyles.downloadBtn}
            onPress={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <AI size="small" color="#fff" />
            ) : (
              <>
                <II name="download-outline" size={16} color="#fff" />
                <T style={mStyles.downloadText}>PDF</T>
              </>
            )}
          </TO>
        )}
      </V>

      {/* Tabs */}
      <V style={mStyles.tabBar}>
        <TO
          style={[mStyles.tab, activeTab === "record" && mStyles.tabActive]}
          onPress={() => setActiveTab("record")}
        >
          <T
            style={[
              mStyles.tabText,
              activeTab === "record" && mStyles.tabTextActive,
            ]}
          >
            My Record
          </T>
        </TO>
        <TO
          style={[mStyles.tab, activeTab === "access" && mStyles.tabActive]}
          onPress={() => setActiveTab("access")}
        >
          <T
            style={[
              mStyles.tabText,
              activeTab === "access" && mStyles.tabTextActive,
            ]}
          >
            Access Requests
            {pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}
          </T>
        </TO>
      </V>

      <SV contentContainerStyle={mStyles.scroll}>
        {activeTab === "record" &&
          (record ? (
            <>
              {/* Patient snapshot */}
              <V style={mStyles.card}>
                <T style={mStyles.cardTitle}>Personal Information</T>
                {[
                  ["Name", record.patientSnapshot.name],
                  ["Gender", record.patientSnapshot.gender],
                  ["Date of Birth", record.patientSnapshot.dateOfBirth],
                  ["Blood Group", record.patientSnapshot.bloodGroup],
                  ["Allergies", record.patientSnapshot.allergies?.join(", ")],
                ].map(([label, value]) =>
                  value ? (
                    <T key={label} style={mStyles.infoRow}>
                      <T style={mStyles.infoLabel}>{label}: </T>
                      {value}
                    </T>
                  ) : null,
                )}
              </V>

              <T style={mStyles.subHeading}>
                {record.consultationNotes.length} Consultation
                {record.consultationNotes.length !== 1 ? "s" : ""} on Record
              </T>

              {[...record.consultationNotes].reverse().map((note, i) => (
                <V key={note._id} style={mStyles.noteCard}>
                  <T style={mStyles.noteDate}>
                    {new Date(note.consultationDate).toLocaleDateString()}
                  </T>
                  <T style={mStyles.noteDoctor}>
                    {note.doctorName} · {note.doctorSpecialization}
                  </T>
                  <T style={mStyles.noteComplaint}>{note.chiefComplaint}</T>
                  {note.diagnosis.length > 0 && (
                    <T style={mStyles.noteDx}>
                      Dx: {note.diagnosis.map((d) => d.description).join(", ")}
                    </T>
                  )}
                  {note.prescriptions.length > 0 && (
                    <T style={mStyles.noteRx}>
                      Rx: {note.prescriptions.map((r) => r.drug).join(", ")}
                    </T>
                  )}
                </V>
              ))}
            </>
          ) : (
            <V style={mStyles.empty}>
              <II name="document-text-outline" size={60} color="#ccc" />
              <T style={mStyles.emptyText}>No medical record yet.</T>
              <T style={mStyles.emptySubText}>
                Your record is created after your first consultation.
              </T>
            </V>
          ))}

        {activeTab === "access" && (
          <>
            {requests.length === 0 ? (
              <V style={mStyles.empty}>
                <II name="shield-checkmark-outline" size={60} color="#ccc" />
                <T style={mStyles.emptyText}>No access requests yet.</T>
              </V>
            ) : (
              requests.map((req) => {
                const doctor = req.requestingDoctorId as any;
                const doctorName = doctor?.firstName
                  ? `Dr. ${doctor.lastName || doctor.firstName}`
                  : "A doctor";
                const spec = doctor?.specialization || "";
                return (
                  <V key={req._id} style={mStyles.requestCard}>
                    <V style={mStyles.requestTop}>
                      <V style={{ flex: 1 }}>
                        <T style={mStyles.requestDoctor}>{doctorName}</T>
                        {spec ? (
                          <T style={mStyles.requestSpec}>{spec}</T>
                        ) : null}
                        <T style={mStyles.requestDate}>
                          Requested:{" "}
                          {new Date(req.requestedAt).toLocaleString()}
                        </T>
                      </V>
                      <V
                        style={[
                          mStyles.statusBadge,
                          {
                            backgroundColor:
                              req.status === "pending"
                                ? "#FEF3C7"
                                : req.status === "approved"
                                  ? "#DCFCE7"
                                  : req.status === "denied"
                                    ? "#FEE2E2"
                                    : "#F3F4F6",
                          },
                        ]}
                      >
                        <T
                          style={[
                            mStyles.statusText,
                            {
                              color:
                                req.status === "pending"
                                  ? "#D97706"
                                  : req.status === "approved"
                                    ? "#16A34A"
                                    : req.status === "denied"
                                      ? "#DC2626"
                                      : "#6B7280",
                            },
                          ]}
                        >
                          {req.status.charAt(0).toUpperCase() +
                            req.status.slice(1)}
                        </T>
                      </V>
                    </V>
                    {req.status === "pending" && (
                      <V style={mStyles.requestActions}>
                        <TO
                          style={mStyles.denyBtn}
                          onPress={() => handleRespond(req._id, false)}
                        >
                          <T style={mStyles.denyBtnText}>Deny</T>
                        </TO>
                        <TO
                          style={mStyles.approveBtn}
                          onPress={() => handleRespond(req._id, true)}
                        >
                          <T style={mStyles.approveBtnText}>Approve</T>
                        </TO>
                      </V>
                    )}
                  </V>
                );
              })
            )}
          </>
        )}
      </SV>
    </SAV>
  );
}

const mStyles = SS.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#111" },
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

  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#D81E5B" },
  tabText: { fontSize: 14, color: "#888", fontWeight: "600" },
  tabTextActive: { color: "#D81E5B" },

  scroll: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D81E5B",
    marginBottom: 10,
  },
  infoRow: { fontSize: 13, color: "#333", marginBottom: 5 },
  infoLabel: { fontWeight: "600", color: "#111" },

  subHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#444",
    marginBottom: 10,
    marginTop: 4,
  },

  noteCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  noteDate: { fontSize: 13, fontWeight: "700", color: "#111" },
  noteDoctor: { fontSize: 12, color: "#666", marginTop: 2, marginBottom: 6 },
  noteComplaint: { fontSize: 13, color: "#333", marginBottom: 4 },
  noteDx: { fontSize: 12, color: "#D81E5B", fontWeight: "600" },
  noteRx: { fontSize: 12, color: "#2196F3", fontWeight: "600", marginTop: 2 },

  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  requestTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  requestDoctor: { fontSize: 14, fontWeight: "700", color: "#111" },
  requestSpec: { fontSize: 12, color: "#666", marginTop: 2 },
  requestDate: { fontSize: 11, color: "#999", marginTop: 4 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  requestActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  denyBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  denyBtnText: { color: "#EF4444", fontWeight: "700" },
  approveBtn: {
    flex: 1,
    backgroundColor: "#16A34A",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  approveBtnText: { color: "#fff", fontWeight: "700" },

  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#999", marginTop: 16 },
  emptySubText: {
    fontSize: 13,
    color: "#bbb",
    marginTop: 6,
    textAlign: "center",
  },
});
