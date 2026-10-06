import { useEffect, useState, useCallback, useRef, useContext } from "react";
import axios from "axios";
import * as ExpoLinking from "expo-linking";
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

  // The mount-time check above (plus its one 3s-later retry) only catches a
  // payment that completes within a few seconds of landing here — but this
  // screen is typically what's showing WHILE the user is off in a checkout
  // browser tab actually paying, which can easily take longer. Once they
  // finish and return via the planamwell://order-complete deep link, nothing
  // was re-checking status after that initial window, leaving the order
  // stuck showing "Awaiting Payment Confirmation" until the user notices and
  // manually taps "Refresh Status" — exactly the same class of bug fixed for
  // the event-ticket flow (CommunityEventDetailScreen), applied here too.
  useEffect(() => {
    const subscription = ExpoLinking.addEventListener("url", ({ url }) => {
      const { hostname, path, queryParams } = ExpoLinking.parse(url);
      if ((hostname === "order-complete" || path === "order-complete") && queryParams?.orderId === orderId) {
        verifyAndRefresh();
      }
    });
    return () => subscription.remove();
  }, [orderId, verifyAndRefresh]);

  return { order, loading, verifying, refresh: verifyAndRefresh };
};