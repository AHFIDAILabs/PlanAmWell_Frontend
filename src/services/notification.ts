import axios, { AxiosResponse } from "axios";
import * as SecureStore from "expo-secure-store";
import { 
  INotification, 
  IAPIResponse, 
  IAppointmentsSummary 
} from "../types/backendType";
import { TOKEN_KEY } from '../services/Auth';


const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const API_URL = `${SERVER_URL}/api/v1/notifications`;

/**
 * 🔐 Get auth token from SecureStore
 */
const getAuthToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
};

/**
 * 🔑 Create authorization header
 */
const authHeader = async () => {
const token = await getAuthToken();
console.log("Notification token:", token);
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const notificationService = {
  /**
   * 📥 Get all notifications
   */
  getNotifications: async (
    filter: "all" | "unread" = "all"
  ): Promise<IAPIResponse<INotification[]>> => {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<INotification[]>> = await axios.get(
      `${API_URL}?filter=${filter}`,
      headers
    );
    return res.data;
  },

  /**
   * 🔢 Get unread notification count
   */
  getUnreadCount: async (): Promise<IAPIResponse<{ count: number }>> => {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<{ count: number }>> = await axios.get(
      `${API_URL}/unread-count`,
      headers
    );
    return res.data;
  },

  /**
   * 📊 Get upcoming appointments summary
   */
  getUpcomingAppointmentsSummary: async (): Promise<
    IAPIResponse<IAppointmentsSummary>
  > => {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<IAppointmentsSummary>> = await axios.get(
      `${API_URL}/appointments-summary`, 
      headers
    );
    return res.data;
  },

  /**
   * ✅ Mark notification as read
   */
  markAsRead: async (notificationId: string): Promise<IAPIResponse<null>> => {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<null>> = await axios.put(
      `${API_URL}/${notificationId}/read`,
      {},
      headers
    );
    return res.data;
  },

  /**
   * ✅ Mark all notifications as read
   */
  markAllAsRead: async (): Promise<IAPIResponse<null>> => {
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
  deleteNotification: async (
    notificationId: string
  ): Promise<IAPIResponse<null>> => {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<null>> = await axios.delete(
      `${API_URL}/${notificationId}`,
      headers
    );
    return res.data;
  },

  /**
   * ➕ Create notification (admin/system use)
   */
  createNotification: async (
    data: Partial<INotification>
  ): Promise<IAPIResponse<INotification>> => {
    const headers = await authHeader();
    const res: AxiosResponse<IAPIResponse<INotification>> = await axios.post(
      API_URL,
      data,
      headers
    );
    return res.data;
  },
};