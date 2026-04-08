import axios from "axios";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

export type PaymentMethodType = "card" | "bank";

export const paymentService = {
  /* ─────────────────────────────────────────────
   * PAYMENT METHODS
   * ───────────────────────────────────────────── */

  // ✅ Get saved payment methods
  getPaymentMethods: async (token: string) => {
    const res = await axios.get(`${SERVER_URL}/api/v1/payment/methods`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data; // { success, data: PaymentMethod[] }
  },

  // ✅ Add a new payment method (token-based, PCI-safe)
  addPaymentMethod: async (
    token: string,
    payload: {
      provider: "paystack" | "stripe";
      type: PaymentMethodType;
      last4: string;
      brand?: string;
      expiryMonth?: number;
      expiryYear?: number;
      authorizationCode: string; // provider token
      isDefault?: boolean;
    }
  ) => {
    const res = await axios.post(
      `${SERVER_URL}/api/v1/payment/methods`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.data;
  },

  // ✅ Set a payment method as default
  setDefaultPaymentMethod: async (token: string, methodId: string) => {
    const res = await axios.patch(
      `${SERVER_URL}/api/v1/payment/methods/${methodId}`,
      { isDefault: true },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.data;
  },

  // ✅ Delete a payment method
  deletePaymentMethod: async (token: string, methodId: string) => {
    const res = await axios.delete(
      `${SERVER_URL}/api/v1/payment/methods/${methodId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.data;
  },

  /* ─────────────────────────────────────────────
   * PAYMENTS
   * ───────────────────────────────────────────── */

  // ✅ Initiate payment for an order (already correct)
  initiatePayment: async (
    token: string,
    payload: {
      orderId: string;
      paymentMethod: "card" | "paystack" | "bank_transfer";
    }
  ) => {
    const res = await axios.post(
      `${SERVER_URL}/api/v1/payment/initiate`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.data;
  },

  // ❌ Legacy – keep only if still referenced elsewhere
  verifyPayment: async (
    token: string,
    data: {
      paymentReference: string;
    }
  ) => {
    const res = await axios.post(
      `${SERVER_URL}/api/v1/payment/verify`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.data;
  },
};