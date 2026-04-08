// hooks/useOrderDetails.ts
import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

export const useOrderDetails = (
  orderId: string,
  token: string
) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await axios.get(
        `${SERVER_URL}/api/v1/orders/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrder(res.data.data);
      setLoading(false);
    } catch (err) {
      console.error("[useOrderDetails] Failed to fetch order", err);
      setLoading(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return { order, loading, refresh: fetchOrder };
};