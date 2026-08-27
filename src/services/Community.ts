// services/Community.ts
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { ICommunityEvent, IMyEventRsvp } from "../types/backendType";
import { TOKEN_KEY } from "./Auth";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const API_URL = `${SERVER_URL}/api/v1/events`;

const getAuthHeader = async (): Promise<Record<string, string>> => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getEvents = async (): Promise<ICommunityEvent[]> => {
  const headers = await getAuthHeader();
  const res = await axios.get(API_URL, { headers });
  return res.data?.data ?? [];
};

export const getEventById = async (id: string): Promise<ICommunityEvent> => {
  const headers = await getAuthHeader();
  const res = await axios.get(`${API_URL}/${id}`, { headers });
  return res.data?.data;
};

export const rsvpToEvent = async (
  id: string,
  chosenName: string,
  reminderOptIn: boolean
): Promise<{ success: boolean; message?: string }> => {
  const headers = await getAuthHeader();
  try {
    await axios.post(`${API_URL}/${id}/rsvp`, { chosenName, reminderOptIn }, { headers });
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.response?.data?.message || "Could not RSVP to this event." };
  }
};

export const cancelRsvp = async (id: string): Promise<void> => {
  const headers = await getAuthHeader();
  await axios.delete(`${API_URL}/${id}/rsvp`, { headers });
};

export const getMyRsvps = async (): Promise<IMyEventRsvp[]> => {
  const headers = await getAuthHeader();
  const res = await axios.get(`${API_URL}/mine/rsvps`, { headers });
  return res.data?.data ?? [];
};
