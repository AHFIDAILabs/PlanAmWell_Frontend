import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY } from "./Auth";
import { IReview } from "../types/backendType";

const BASE = `${process.env.EXPO_PUBLIC_SERVER_URL}/api/v1/reviews`;

const authHeader = async () => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw new Error("No auth token");
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const reviewService = {
  async getDoctorReviews(doctorId: string, page = 1): Promise<{ reviews: IReview[]; total: number }> {
    const res = await axios.get(`${BASE}/doctor/${doctorId}?page=${page}&limit=10`);
    return res.data.data;
  },

  async checkCanReview(doctorId: string): Promise<{ canReview: boolean; hasReviewed: boolean; hasCompleted: boolean }> {
    const config = await authHeader();
    const res = await axios.get(`${BASE}/can-review/${doctorId}`, config);
    return res.data.data;
  },

  async submit(doctorId: string, rating: number, comment: string): Promise<{ review: IReview; newAvgRating: number }> {
    const config = await authHeader();
    const res = await axios.post(BASE, { doctorId, rating, comment }, config);
    return res.data.data;
  },
};
