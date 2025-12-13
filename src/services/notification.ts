import axios, { AxiosResponse } from "axios";
import * as SecureStore from "expo-secure-store";
import {
  INotification,
  IAPIResponse,
  IAppointmentsSummary,
} from "../types/backendType";
import { TOKEN_KEY } from "../services/Auth";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const API_URL = `${SERVER_URL}/api/v1/notifications`;

/**
 * 🔐 Cached auth token (prevents repeated SecureStore reads)
 */
let cachedAuthToken: string | null = null;

/**
 * 🔐 Get auth token safely
 */
const getAuthToken = async (): Promise<string> => {
  if (cachedAuthToken) return cachedAuthToken;

  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) {
    throw new Error("No auth token available for notifications");
  }

  cachedAuthToken = token;
  return token;
};

/**
 * 🔑 Authorization header
 */
const authHeader = async () => {
  const token = await getAuthToken();

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const notificationService = {
  /**
   * 📥 Get notifications
   */
  async getNotifications(
    filter: "all" | "unread" = "all"
  ): Promise<IAPIResponse<INotification[]>> {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<INotification[]>> = await axios.get(
      `${API_URL}?filter=${filter}`,
      headers
    );
    return res.data;
  },

  /**
   * 🔢 Get unread count
   */
  async getUnreadCount(): Promise<IAPIResponse<{ count: number }>> {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<{ count: number }>> =
      await axios.get(`${API_URL}/unread-count`, headers);
    return res.data;
  },

  /**
   * 📊 Upcoming appointments summary
   */
  async getUpcomingAppointmentsSummary(): Promise<
    IAPIResponse<IAppointmentsSummary>
  > {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<IAppointmentsSummary>> =
      await axios.get(`${API_URL}/appointments-summary`, headers);
    return res.data;
  },

  /**
   * ✅ Mark one as read
   */
  async markAsRead(
    notificationId: string
  ): Promise<IAPIResponse<null>> {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<null>> = await axios.put(
      `${API_URL}/${notificationId}/read`,
      {},
      headers
    );
    return res.data;
  },

  /**
   * ✅ Mark all as read
   */
  async markAllAsRead(): Promise<IAPIResponse<null>> {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<null>> = await axios.put(
      `${API_URL}/read-all`,
      {},
      headers
    );
    return res.data;
  },

  /**
   * 🗑️ Delete notification
   */
  async deleteNotification(
    notificationId: string
  ): Promise<IAPIResponse<null>> {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<null>> = await axios.delete(
      `${API_URL}/${notificationId}`,
      headers
    );
    return res.data;
  },

  /**
   * ➕ Create notification (system/admin)
   */
  async createNotification(
    data: Partial<INotification>
  ): Promise<IAPIResponse<INotification>> {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<INotification>> =
      await axios.post(API_URL, data, headers);
    return res.data;
  },

  /**
   * 🧹 Clear cached token (call on logout)
   */
  clearCache() {
    cachedAuthToken = null;
  },
};
