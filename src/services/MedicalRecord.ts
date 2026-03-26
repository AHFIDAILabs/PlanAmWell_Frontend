import axios, { AxiosResponse } from "axios";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { TOKEN_KEY } from "./Auth";
import { IMedicalRecord, IConsultationNote, IAccessRequest } from "../types/backendType";
 
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const BASE_URL   = `${SERVER_URL}/api/v1/medical-records`;
 
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
 
const getAuthToken = async (): Promise<string> => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw new Error("Authentication required.");
  return token;
};
 
// ── Doctor: create or update a consultation note ─────────────────────────────
export const saveConsultationNote = async (
  noteData: Partial<IConsultationNote> & {
    appointmentId: string;
    chiefComplaint: string;
    bloodGroup?: string;
    allergies?: string[];
  }
): Promise<IConsultationNote> => {
  const token = await getAuthToken();
  const response: AxiosResponse<ApiResponse<IConsultationNote>> = await axios.post(
    `${BASE_URL}/note`,
    noteData,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (response.data.success && response.data.data) return response.data.data;
  throw new Error(response.data.message || "Failed to save note.");
};
 
// ── Patient: get own record ───────────────────────────────────────────────────
export const getMyMedicalRecord = async (): Promise<IMedicalRecord | null> => {
  const token = await getAuthToken();
  const response: AxiosResponse<ApiResponse<IMedicalRecord>> = await axios.get(
    `${BASE_URL}/my`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (response.data.success) return response.data.data ?? null;
  throw new Error(response.data.message || "Failed to fetch record.");
};
 
// ── Doctor: get patient record (requires approved access) ────────────────────
export const getPatientRecord = async (
  patientId: string,
  appointmentId: string
): Promise<IMedicalRecord> => {
  const token = await getAuthToken();
  const response: AxiosResponse<ApiResponse<IMedicalRecord>> = await axios.get(
    `${BASE_URL}/patient/${patientId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params:  { appointmentId },
    }
  );
  if (response.data.success && response.data.data) return response.data.data;
  throw new Error(response.data.message || "Failed to fetch patient record.");
};
 
// ── Doctor: request access ────────────────────────────────────────────────────
export const requestRecordAccess = async (
  patientId: string,
  appointmentId: string
): Promise<IAccessRequest> => {
  const token = await getAuthToken();
  const response: AxiosResponse<ApiResponse<IAccessRequest>> = await axios.post(
    `${BASE_URL}/request-access`,
    { patientId, appointmentId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (response.data.success && response.data.data) return response.data.data;
  throw new Error(response.data.message || "Failed to send access request.");
};
 
// ── Doctor: check if access exists ───────────────────────────────────────────
export const checkRecordAccess = async (
  patientId: string
): Promise<{ hasAccess: boolean; hasPending: boolean; accessRequest: IAccessRequest | null }> => {
  const token = await getAuthToken();
  const response: AxiosResponse<ApiResponse<any>> = await axios.get(
    `${BASE_URL}/check-access/${patientId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (response.data.success) return response.data.data;
  throw new Error(response.data.message || "Failed to check access.");
};
 
// ── Patient: respond to access request ───────────────────────────────────────
export const respondToAccessRequest = async (
  requestId: string,
  approve: boolean
): Promise<IAccessRequest> => {
  const token = await getAuthToken();
  const response: AxiosResponse<ApiResponse<IAccessRequest>> = await axios.patch(
    `${BASE_URL}/access-request/${requestId}/respond`,
    { approve },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (response.data.success && response.data.data) return response.data.data;
  throw new Error(response.data.message || "Failed to respond.");
};
 
// ── Patient: get pending access requests ─────────────────────────────────────
export const getPendingAccessRequests = async (): Promise<IAccessRequest[]> => {
  const token = await getAuthToken();
  const response: AxiosResponse<ApiResponse<IAccessRequest[]>> = await axios.get(
    `${BASE_URL}/access-requests/pending`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (response.data.success) return response.data.data ?? [];
  throw new Error(response.data.message || "Failed to fetch requests.");
};
 
// ── Patient: get all access requests (history) ───────────────────────────────
export const getAllAccessRequests = async (): Promise<IAccessRequest[]> => {
  const token = await getAuthToken();
  const response: AxiosResponse<ApiResponse<IAccessRequest[]>> = await axios.get(
    `${BASE_URL}/access-requests`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (response.data.success) return response.data.data ?? [];
  throw new Error(response.data.message || "Failed to fetch requests.");
};
 
// ── Download and share PDF ────────────────────────────────────────────────────
export const downloadAndSharePDF = async (patientId: string): Promise<void> => {
  const token    = await getAuthToken();
  const fileUri  = `${FileSystem.cacheDirectory}PlanAmWell_MedicalRecord.pdf`;
 
  const downloadResult = await FileSystem.downloadAsync(
    `${BASE_URL}/pdf/${patientId}`,
    fileUri,
    { headers: { Authorization: `Bearer ${token}` } }
  );
 
  if (downloadResult.status !== 200) {
    throw new Error("Failed to download PDF.");
  }
 
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("Sharing is not available on this device.");
 
  await Sharing.shareAsync(fileUri, {
    mimeType: "application/pdf",
    dialogTitle: "Share Medical Record",
    UTI: "com.adobe.pdf",
  });
};