import axios, { AxiosResponse } from "axios";
import * as SecureStore from "expo-secure-store";
import { INotification, IAPIResponse, IAppointmentsSummary } from "../types/backendType";
import { TOKEN_KEY } from "../services/Auth";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const API_URL = `${SERVER_URL}/api/v1/notifications`;

let cachedAuthToken: string | null = null;

const getAuthToken = async (): Promise<string> => {
  if (cachedAuthToken) return cachedAuthToken;

  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw new Error("No auth token available for notifications");

  cachedAuthToken = token;
  return token;
};

const authHeader = async () => {
  const token = await getAuthToken();
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const notificationService = {
  async getNotifications(filter: "all" | "unread" = "all"): Promise<IAPIResponse<INotification[]>> {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<INotification[]>> = await axios.get(
      `${API_URL}?filter=${filter}`,
      headers
    );

    // ✅ Ensure every notification has userType (fallback if backend misses it)
    if (res.data.success && res.data.data) {
      res.data.data = res.data.data.map((n) => ({
        ...n,
        userType: n.userType || "User", // only default if missing
      }));
    }

    return res.data;
  },

  async getUnreadCount(): Promise<IAPIResponse<{ count: number }>> {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<{ count: number }>> = await axios.get(
      `${API_URL}/unread-count`,
      headers
    );
    return res.data;
  },

  async getUpcomingAppointmentsSummary(): Promise<IAPIResponse<IAppointmentsSummary>> {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<IAppointmentsSummary>> = await axios.get(
      `${API_URL}/appointments-summary`,
      headers
    );
    return res.data;
  },

  async markAsRead(notificationId: string): Promise<IAPIResponse<null>> {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<null>> = await axios.put(
      `${API_URL}/${notificationId}/read`,
      {},
      headers
    );
    return res.data;
  },

  async markAllAsRead(): Promise<IAPIResponse<null>> {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<null>> = await axios.put(
      `${API_URL}/read-all`,
      {},
      headers
    );
    return res.data;
  },

  async deleteNotification(notificationId: string): Promise<IAPIResponse<null>> {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<null>> = await axios.delete(
      `${API_URL}/${notificationId}`,
      headers
    );
    return res.data;
  },

  async createNotification(data: Partial<INotification>): Promise<IAPIResponse<INotification>> {
    const headers = await authHeader();
    const payload = { ...data, userType: data.userType || "User" }; // ✅ default only if missing
    const res: AxiosResponse<IAPIResponse<INotification>> = await axios.post(API_URL, payload, headers);
    return res.data;
  },

  clearCache() {
    cachedAuthToken = null;
  },
};
