import { useEffect, useState, useCallback, useRef, useContext } from "react";
import axios from "axios";
import * as ExpoLinking from "expo-linking";
import { CartContext } from "../context/CartContext"; // ← adjust path

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

const PENDING_POLL_INTERVAL_MS = 4000;

export const useOrderDetails = (orderId: string, token: string) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Mirrors `order` for the polling loop below — the loop's setInterval
  // closure captures state as of its first run, so it needs a ref to see the
  // latest paymentStatus on each tick without re-creating the interval.
  const orderRef = useRef<any>(null);
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
      orderRef.current = res.data.data;
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

  // A single mount-time check plus one 3s-later retry only caught a payment
  // that completed within a few seconds of landing here — but this screen is
  // typically showing WHILE the user is off in a checkout browser tab
  // actually paying, which can easily take longer, and a user who manually
  // switches back (instead of tapping a "Return to app" link) never fires
  // the order-complete deep link below either. Poll like the web order pages
  // do, for as long as the order is still pending, instead of giving up
  // after one retry.
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      await fetchOrder();
      if (!isMounted) return;
      await verifyAndRefresh();
    };

    init();

    retryTimerRef.current = setInterval(async () => {
      if (!isMounted) return;
      if (orderRef.current?.paymentStatus && orderRef.current.paymentStatus !== "pending") {
        if (retryTimerRef.current) clearInterval(retryTimerRef.current);
        return;
      }
      await verifyAndRefresh();
    }, PENDING_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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