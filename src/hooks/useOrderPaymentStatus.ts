// hooks/useOrderPaymentStatus.ts
import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

export const useOrderPaymentStatus = (orderId: string, token: string) => {
  const [status, setStatus] = useState<"pending" | "paid" | "failed">("pending");
  const [loading, setLoading] = useState(true);

  // ✅ Move fetchStatus OUTSIDE useEffect
  const fetchStatus = useCallback(async () => {
    try {
      const res = await axios.get(
        `${SERVER_URL}/api/v1/orders/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const paymentStatus = res.data.data.paymentStatus;
      setStatus(paymentStatus);
      setLoading(false);

      return paymentStatus;
    } catch (err) {
      console.error("[useOrderPaymentStatus] Failed to fetch order status", err);
      setLoading(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const startPolling = async () => {
      const currentStatus = await fetchStatus();

      if (currentStatus === "pending") {
        interval = setInterval(fetchStatus, 4000);
      }
    };

    startPolling();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchStatus]);

  return {
    status,
    loading,
    refresh: fetchStatus, // ✅ now valid
  };
};