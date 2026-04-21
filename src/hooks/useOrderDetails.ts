// hooks/useOrderDetails.ts
import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

export const useOrderDetails = (orderId: string, token: string) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await axios.get(
        `${SERVER_URL}/api/v1/orders/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrder(res.data.data);
    } catch (err) {
      console.error("[useOrderDetails] Failed to fetch order", err);
    } finally {
      setLoading(false);
    }
  }, [orderId, token]);

  const verifyAndRefresh = useCallback(async () => {
    if (!orderId || !token) return;
    setVerifying(true);
    try {
      // Get payment record for this order
      const paymentRes = await axios.get(
        `${SERVER_URL}/api/v1/payments/by-order/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const paymentReference = paymentRes.data?.data?.paymentReference;

      if (paymentReference) {
        await axios.post(
          `${SERVER_URL}/api/v1/payments/verify`,
          { paymentReference },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Re-fetch order to get updated status
        await fetchOrder();
      }
    } catch (err) {
      console.warn("[useOrderDetails] Payment verify failed:", err);
      // Still refresh order even if verify fails
      await fetchOrder();
    } finally {
      setVerifying(false);
    }
  }, [orderId, token, fetchOrder]);

  useEffect(() => {
    // On mount: fetch order then attempt payment verification
    const init = async () => {
      await fetchOrder();
      await verifyAndRefresh();
    };
    init();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return { order, loading, verifying, refresh: verifyAndRefresh };
};