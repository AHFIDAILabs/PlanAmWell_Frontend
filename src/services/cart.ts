import axios, { AxiosResponse } from "axios";
import { ICartItem } from "../types/backendType";

// Define the base URL using the environment variable
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

if (!SERVER_URL) {
  console.error("SERVER_URL environment variable is not set!");
}

export interface ICartResponse {
  success: boolean;
  localCart?: any;  // from addToCart response
  data?: any;       // from getCart response
  partnerCart?: any;
}


export const cartService = {
  // Add items to cart
  addToCart: async (
    items: ICartItem[],
    sessionId: string,
    token?: string
  ): Promise<ICartResponse> => {
    const res: AxiosResponse<ICartResponse> = await axios.post(
      `${SERVER_URL}/api/v1/cart`,
      { items, sessionId },
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    );
    return res.data;
  },

  // Get cart
  getCart: async (sessionId: string, token?: string): Promise<ICartResponse> => {
    const res: AxiosResponse<ICartResponse> = await axios.get(`${SERVER_URL}/api/v1/cart`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      params: { sessionId },
    });
    return res.data;
  },

  // Update a single cart item
  updateItem: async (
    drugId: string,
    quantity: number,
    sessionId: string,
    token?: string,
    dosage?: string,
    specialInstructions?: string
  ): Promise<ICartResponse> => {
    const res: AxiosResponse<ICartResponse> = await axios.put(
      `${SERVER_URL}/api/v1/cart/update`,
      { drugId, quantity, sessionId, dosage, specialInstructions },
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    );
    return res.data;
  },

  // Remove item from cart
  removeItem: async (
    drugId: string,
    sessionId: string,
    token?: string
  ): Promise<ICartResponse> => {
    // Using query parameters for drugId in the URL path is usually clearer for DELETE
    // Note: Axios DELETE requests using `data` in the config object is the correct way
    const res: AxiosResponse<ICartResponse> = await axios.delete(
        `${SERVER_URL}/api/v1/cart/${drugId}`, 
        {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            data: { drugId, sessionId }, // Data sent in the request body
        }
    );
    return res.data;
  },

  // Clear cart (FIXED for authenticated context)
  clearCart: async (sessionId: string, token?: string): Promise<ICartResponse> => {
    // 💡 FIX: For a fully authenticated user, the backend should only need the token.
    // However, if supporting guest carts, sessionId in the body is necessary.
    // The issue is definitely the token not being validated.
    
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    
    // Log the action to see what's being sent
    console.log("🛒 Sending CLEAR CART request with Token:", !!token);
    
    const res: AxiosResponse<ICartResponse> = await axios.delete(`${SERVER_URL}/api/v1/cart`, {
      headers: headers,
      data: { sessionId }, // Data sent in the request body
    });
    return res.data;
  },
};