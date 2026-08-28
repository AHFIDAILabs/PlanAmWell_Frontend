import axios from "axios";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

export const paymentService = {
  // Real checkout is fully hosted by whatever processor is behind
  // checkoutUrl (partner-hosted page in production, or our own simulated
  // page — see backend/src/controllers/paymentController.ts) — it shows its
  // own card/bank/USSD picker, so this app never collects card details
  // itself and doesn't need a "select payment method" step.
  initiatePayment: async (token: string, orderId: string) => {
    const res = await axios.post(
      `${SERVER_URL}/api/v1/payment/initiate`,
      { orderId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data; // { success, data: { checkoutUrl, paymentReference, transactionId, status } }
  },

  verifyPayment: async (token: string, paymentReference: string) => {
    const res = await axios.post(
      `${SERVER_URL}/api/v1/payment/verify`,
      { paymentReference },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  },
};
