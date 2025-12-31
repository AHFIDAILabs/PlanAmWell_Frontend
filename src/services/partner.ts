// services/partnerService.ts
import axios from "axios";
import { IImage } from "../types/backendType";

const BASE_URL = process.env.EXPO_PUBLIC_SERVER_URL;
// ==================== AXIOS INSTANCE ====================
const partnerApi = axios.create({
  baseURL: `${BASE_URL}/api/v1/partners`,
});

// ==================== RESPONSE INTERCEPTOR ====================
partnerApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("❌ [partnerApi] Unauthorized");
    }
    return Promise.reject(error);
  }
);

// ==================== TYPES ====================
export interface Partner {
  _id: string;
  name: string;
  socialLinks: string[];
  profession: string;
  businessAddress: string;
  partnerImage?: IImage;
  partnerType: "individual" | "business";
  email?: string;
  phone?: string;
  description?: string;
  website?: string;
  isActive: boolean;
  createdBy: any;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerFilters {
  partnerType?: "individual" | "business";
  profession?: string;
}

// ==================== SERVICES ====================

/**
 * Get active partners (Public)
 */
export const getActivePartnersService = async (filters?: PartnerFilters) => {
  const { data } = await axios.get(`${BASE_URL}/api/v1/partners/active`, {
    params: filters,
  });
  return data?.data || [];
};

/**
 * Get single partner by ID (Public)
 */
export const getPartnerByIdService = async (partnerId: string) => {
  const { data } = await axios.get(`${BASE_URL}/partners/${partnerId}`);
  return data?.data;
};

// ==================== EXPORT ====================
export default {
  getActivePartnersService,
  getPartnerByIdService,
};
