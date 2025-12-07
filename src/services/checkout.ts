// services/checkout.ts - FIXED WITH COMPREHENSIVE LOGGING

import axios, { AxiosResponse } from "axios";
import { ICartItem } from "../types/backendType";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

export interface ICheckoutResponse {
  success: boolean;
  localOrder: any;
  partnerOrder: any;
  user: {
    id: string;
    isAnonymous: boolean;
    sessionId?: string;
    partnerId: string;
  };
}

export interface CheckoutDetails {
  name: string;
  phone: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  gender?: string;
  dateOfBirth?: string;
  homeAddress?: string;
  city?: string;
  state?: string;
  lga?: string;
  preferences?: {
    homeAddress?: string;
    city?: string;
    state?: string;
    lga?: string;
  };
}

export const checkoutServices = {
  checkout: async (
    cartItems: ICartItem[],
    sessionId: string | null,
    details?: CheckoutDetails,
    token?: string
  ): Promise<ICheckoutResponse> => {
    
    // ✅ BUILD PAYLOAD WITH ALL FIELDS
    const payload = {
      sessionId,
      items: cartItems.map((item) => ({
        drugId: item.drugId,
        quantity: item.quantity,
        dosage: item.dosage || "",
        specialInstructions: item.specialInstructions || "",
      })),
      // ✅ Explicitly include all fields from details
      name: details?.name,
      email: details?.email,
      phone: details?.phone,
      password: details?.password,
      confirmPassword: details?.confirmPassword,
      gender: details?.gender,
      dateOfBirth: details?.dateOfBirth,
      homeAddress: details?.homeAddress,
      city: details?.city,
      state: details?.state,
      lga: details?.lga,
      preferences: details?.preferences,
    };
    
    // ✅ COMPREHENSIVE LOGGING
    console.log("🛒 Checkout Service - Full Request Details:");
    console.log("   Endpoint:", `${SERVER_URL}/api/v1/checkout`);
    console.log("   Token Status:", token ? 'Authenticated' : 'Anonymous');
    console.log("   Has SessionId:", !!sessionId);
    console.log("\n📦 Payload being sent:");
    console.log("   Items count:", cartItems.length);
    console.log("   Name:", payload.name);
    console.log("   Email:", payload.email);
    console.log("   Phone:", payload.phone);
    console.log("   Gender:", payload.gender);
    console.log("   Date of Birth:", payload.dateOfBirth);
    console.log("   Home Address:", payload.homeAddress);
    console.log("   City:", payload.city);
    console.log("   State:", payload.state);
    console.log("   LGA:", payload.lga);
    console.log("   Has Preferences:", !!payload.preferences);
    console.log("   Preferences:", JSON.stringify(payload.preferences, null, 2));
    console.log("\n🔑 Auth Header:", token ? `Bearer ${token.substring(0, 20)}...` : 'None');

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res: AxiosResponse<ICheckoutResponse> = await axios.post(
        `${SERVER_URL}/api/v1/checkout`,
        payload,
        { headers }
      );
      
      console.log("✅ Checkout successful, user created/updated:", {
        userId: res.data.user.id,
        isAnonymous: res.data.user.isAnonymous,
        partnerId: res.data.user.partnerId,
      });
      
      return res.data;
    } catch (error: any) {
      console.error("❌ Checkout service failed:");
      console.error("   Status:", error.response?.status);
      console.error("   Message:", error.response?.data?.message || error.message);
      console.error("   Data:", JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  },
};