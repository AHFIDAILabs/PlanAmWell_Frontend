// ../hooks/useCheckout.ts

import { useState } from "react";
import { useAuth } from "./useAuth";
import { checkoutServices, CheckoutDetails, ICheckoutResponse } from "../services/checkout";
import { ICartItem } from "../types/backendType";

export const useCheckout = () => {
  const { isAnonymous, handleConversion, userToken: authToken, sessionId, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<ICheckoutResponse | null>(null);

  const checkout = async (
    cartItems: ICartItem[],
    userDetails: CheckoutDetails
  ): Promise<ICheckoutResponse> => {
    if (!sessionId) throw new Error("No active session ID found for checkout");

    setLoading(true);
    try {
      let token = authToken;
      let wasAnonymous = isAnonymous; // Track initial anonymous state

      // 1️⃣ Convert guest to user if needed
      if (wasAnonymous) {
        const conversionResult = await handleConversion({
          name: userDetails.name,
          email: userDetails.email!,
          phone: userDetails.phone,
          password: userDetails.password,
        });

        if (!conversionResult.success) {
          throw new Error("Failed to convert guest to user before checkout");
        }
        token = conversionResult.token || authToken;
      }

      // 2️⃣ Proceed to checkout
      // 💡 FIX: Ensure the latest token is used (post-conversion or stored token)
      const data = await checkoutServices.checkout(
        cartItems, 
        sessionId, 
        userDetails, 
        token ?? undefined // Pass the current, valid token
      );
      
      setOrder(data.localOrder ?? null);
      
      // Refresh profile to get saved address details
      if (!wasAnonymous || (wasAnonymous && token)) { 
        refreshUser();
      }
      
      return data;
    } catch (err: any) {
      console.error("[useCheckout] error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { checkout, order, loading };
};