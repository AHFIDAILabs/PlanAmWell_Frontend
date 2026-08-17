import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY } from "./Auth";

const BASE = `${process.env.EXPO_PUBLIC_SERVER_URL}/api/v1/family`;

const authHeader = async () => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw new Error("No auth token");
  return { headers: { Authorization: `Bearer ${token}` } };
};

export interface IFamilyMember {
  _id: string;
  name: string;
  relationship: "Spouse" | "Child" | "Parent" | "Sibling" | "Other";
  gender?: "Male" | "Female" | "Other";
  dateOfBirth?: string;
  bloodGroup?: string;
  allergies?: string;
  notes?: string;
}

export type FamilyMemberInput = Omit<IFamilyMember, "_id">;

export const familyMemberService = {
  async getAll(): Promise<IFamilyMember[]> {
    const cfg = await authHeader();
    const res = await axios.get(BASE, cfg);
    return res.data.data;
  },

  async create(data: FamilyMemberInput): Promise<IFamilyMember> {
    const cfg = await authHeader();
    const res = await axios.post(BASE, data, cfg);
    return res.data.data;
  },

  async update(id: string, data: Partial<FamilyMemberInput>): Promise<IFamilyMember> {
    const cfg = await authHeader();
    const res = await axios.put(`${BASE}/${id}`, data, cfg);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    const cfg = await authHeader();
    await axios.delete(`${BASE}/${id}`, cfg);
  },
};
