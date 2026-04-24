import { useEffect, useState, useCallback, useRef, useContext } from "react";
import axios from "axios";
import { CartContext } from "../context/CartContext"; // ← adjust path

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

export const useOrderDetails = (orderId: string, token: string) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { clearCartLocal } = useContext(CartContext);

  const fetchOrder = useCallback(async () => {
    try {
    const res = await axios.get(
  `${SERVER_URL}/api/v1/orders/${orderId}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache',
    }
  }
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
  {
    headers: {
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache',
    }
  }
);
    } catch (err: any) {
      console.warn("[useOrderDetails] Delivery refresh failed:", err?.response?.data || err?.message);
    }
  }, [orderId, token]);

  const verifyAndRefresh = useCallback(async () => {
    if (!orderId || !token) return;
    setVerifying(true);
    try {
      // 1. Get payment record
      const paymentRes = await axios.get(
        `${SERVER_URL}/api/v1/payment/by-order/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const paymentReference = paymentRes.data?.data?.paymentReference;

      if (paymentReference) {
        const verifyRes = await axios.post(
          `${SERVER_URL}/api/v1/payment/verify`,
          { paymentReference },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // ✅ If payment is successful, clear local cart
        const status = verifyRes.data?.data?.status?.toLowerCase();
        const isSuccess = ["success", "paid", "completed", "successful"].includes(status);
        if (isSuccess) {
          clearCartLocal();
          console.log("[useOrderDetails] Cart cleared after payment success");
        }
      }

      // 2. Refresh delivery
      await refreshDelivery();

      // 3. Fetch updated order
      await fetchOrder();
    } catch (err: any) {
      console.warn("[useOrderDetails] Refresh failed:", err?.response?.data || err?.message);
      await fetchOrder();
    } finally {
      setVerifying(false);
    }
  }, [orderId, token, fetchOrder, refreshDelivery, clearCartLocal]);

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { order, loading, verifying, refresh: verifyAndRefresh };
};