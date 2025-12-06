// checkoutServices.js (or equivalent service file)

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
  email: string;
  phone: string;
  password?: string; // included for guest conversion
  preferences?: any;
}

// Updated function signature to require sessionId
export const checkoutServices = {
  checkout: async (
    cartItems: ICartItem[],
    sessionId: string,
    details?: CheckoutDetails,
    token?: string
  ): Promise<ICheckoutResponse> => {
    const payload = {
      sessionId,
      items: cartItems.map((item) => ({
        drugId: item.drugId,
        quantity: item.quantity,
        dosage: item.dosage || "",
        specialInstructions: item.specialInstructions || "",
      })),
      ...details,
    };
    
    // 💡 CRITICAL LOGGING: Prepare headers and log the token state
    const authHeader = token ? `Bearer ${token}` : 'N/A (Anonymous/Guest)';
    const headers = token ? { headers: { Authorization: authHeader } } : undefined;

    console.log("🛒 Checkout Service Log:");
    console.log("   Endpoint:", `${SERVER_URL}/api/v1/checkout`);
    console.log("   Token Status:", token ? 'Authenticated' : 'Anonymous');
    console.log("   Authorization Header:", authHeader);


    try {
        const res: AxiosResponse<ICheckoutResponse> = await axios.post(
            `${SERVER_URL}/api/v1/checkout`,
            payload,
            headers
        );
        return res.data;
    } catch (error: any) {
        console.error("❌ Checkout service failed:", error.message);
        throw error;
    }
  },
};