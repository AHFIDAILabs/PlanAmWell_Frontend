import axios from "axios";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

export const paymentService = {
  // Fetch saved payment methods for the authenticated user
  getPaymentMethods: async (token: string) => {
    const res = await axios.get(`${SERVER_URL}/api/v1/payment/methods`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  // Initiate a partner payment
  initiatePayment: async (
    token: string,
    data: {
      orderId: string;
      userId: string;
      paymentMethod: "card" | "paystack" | "bank_transfer";
      amount: number;
      partnerReferenceCode: string;
      customerEmail: string;
    }
  ) => {
    const res = await axios.post(`${SERVER_URL}/api/v1/payment/initiate`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Return only the backend response data (structured by your backend)
    return res.data;
  },

  // Optionally, add verifyPayment if needed
  verifyPayment: async (
    token: string,
    data: {
      paymentReference: string;
    }
  ) => {
    const res = await axios.post(`${SERVER_URL}/api/v1/payment/verify`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
};
