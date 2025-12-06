import axios, { AxiosResponse } from "axios";
import { INotification, IAPIResponse } from "../types/backendType";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const API_URL = `${SERVER_URL}/api/v1/notifications`;

// Token helper
const authHeader = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

export const notificationService = {
  getNotifications: async (
    filter: "all" | "unread" = "all"
  ): Promise<IAPIResponse<INotification[]>> => {
    const res: AxiosResponse<IAPIResponse<INotification[]>> = await axios.get(
      `${API_URL}?filter=${filter}`,
      authHeader()
    );
    return res.data;
  },

  markAsRead: async (
    notificationId: string
  ): Promise<IAPIResponse<null>> => {
    const res: AxiosResponse<IAPIResponse<null>> = await axios.patch(
      `${API_URL}/${notificationId}/read`,
      {},
      authHeader()
    );
    return res.data;
  },

  markAllAsRead: async (): Promise<IAPIResponse<null>> => {
    const res: AxiosResponse<IAPIResponse<null>> = await axios.patch(
      `${API_URL}/read-all`,
      {},
      authHeader()
    );
    return res.data;
  },

  deleteNotification: async (
    notificationId: string
  ): Promise<IAPIResponse<null>> => {
    const res: AxiosResponse<IAPIResponse<null>> = await axios.delete(
      `${API_URL}/${notificationId}`,
      authHeader()
    );
    return res.data;
  },

  createNotification: async (
    data: Partial<INotification>
  ): Promise<IAPIResponse<INotification>> => {
    const res: AxiosResponse<IAPIResponse<INotification>> = await axios.post(
      API_URL,
      data,
      authHeader()
    );
    return res.data;
  },
};
