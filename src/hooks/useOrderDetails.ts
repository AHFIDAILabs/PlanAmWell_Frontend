// hooks/useOrderDetails.ts
import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

export const useOrderDetails = (orderId: string, token: string) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const refreshDelivery = useCallback(async () => {
    try {
      await axios.get(
        `${SERVER_URL}/api/v1/orders/${orderId}/delivery-status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err: any) {
      console.warn("[useOrderDetails] Delivery refresh failed:", err?.response?.data || err?.message);
    }
  }, [orderId, token]);

  const verifyAndRefresh = useCallback(async () => {
    if (!orderId || !token) return;
    setVerifying(true);
    try {
      // 1. Verify payment
      const paymentRes = await axios.get(
        `${SERVER_URL}/api/v1/payment/by-order/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const paymentReference = paymentRes.data?.data?.paymentReference;

      if (paymentReference) {
        await axios.post(
          `${SERVER_URL}/api/v1/payment/verify`,
          { paymentReference },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // 2. Refresh delivery status from partner
      await refreshDelivery();

      // 3. Fetch updated order
      await fetchOrder();
    } catch (err: any) {
      console.warn("[useOrderDetails] Refresh failed:", err?.response?.data || err?.message);
      await fetchOrder();
    } finally {
      setVerifying(false);
    }
  }, [orderId, token, fetchOrder, refreshDelivery]);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      await fetchOrder();
      if (!isMounted) return;
      await verifyAndRefresh();

      retryTimerRef.current = setTimeout(async () => {
        if (!isMounted) return;
        await verifyAndRefresh();
      }, 3000);
    };

    init();

    return () => {
      isMounted = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return { order, loading, verifying, refresh: verifyAndRefresh };
};