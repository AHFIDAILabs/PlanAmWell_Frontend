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

  const verifyAndRefresh = useCallback(async () => {
    if (!orderId || !token) return;
    setVerifying(true);
    try {
      const paymentRes = await axios.get(
        `${SERVER_URL}/api/v1/payment/by-order/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const paymentReference = paymentRes.data?.data?.paymentReference;

      if (!paymentReference) {
        console.warn("[useOrderDetails] No paymentReference found", paymentRes.data);
        await fetchOrder();
        return;
      }

      await axios.post(
        `${SERVER_URL}/api/v1/payment/verify`,
        { paymentReference },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchOrder();
    } catch (err) {
      console.warn("[useOrderDetails] Payment verify failed:", err);
      await fetchOrder();
    } finally {
      setVerifying(false);
    }
  }, [orderId, token, fetchOrder]);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      await fetchOrder();
      
      if (!isMounted) return;
      await verifyAndRefresh();

      // Second attempt after 3s — partner webhook may be delayed
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
  }, [fetchOrder, verifyAndRefresh]);

  return { order, loading, verifying, refresh: verifyAndRefresh };
};