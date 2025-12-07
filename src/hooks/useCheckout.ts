// hooks/useCheckout.ts - FIXED VERSION
import { useState } from "react";
import { checkoutServices, CheckoutDetails, ICheckoutResponse } from "../services/checkout";
import { ICartItem } from "../types/backendType";
import { useAuth } from "./useAuth";
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from '../services/Auth';

// Interface for the parameters this hook accepts
interface UseCheckoutParams {
  isAnonymous: boolean;
  handleConversion: (data: any) => Promise<{ success: boolean; token?: string; user?: any }>;
  userToken: string | null;
  sessionId: string | null;
  refreshUser: () => Promise<any>;
  setUserToken: (newToken: string) => void; // ✅ ADD THIS
}


// ✅ CRITICAL: This hook MUST accept parameters - it should NOT call useAuth()
export const useCheckout = ({
  isAnonymous,
  handleConversion,
  userToken: authToken,
  sessionId,
  refreshUser,
  setUserToken,
}: UseCheckoutParams) => {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<ICheckoutResponse | null>(null);
  const { isAuthenticated } = useAuth();

  const checkout = async (
    cartItems: ICartItem[],
    userDetails: CheckoutDetails
  ): Promise<ICheckoutResponse> => {
    console.log('[useCheckout] Starting checkout...', {
      isAnonymous,
      hasToken: !!authToken,
      hasSessionId: !!sessionId,
    });

    if (!isAuthenticated && !sessionId) {
      throw new Error("No active session ID found for checkout");
    }

    setLoading(true);
    try {
      let token = authToken;
      let wasAnonymous = isAnonymous;

      // 1️⃣ Convert guest to user if needed
      if (wasAnonymous) {
        console.log('[useCheckout] Converting guest to user...');
        const conversionResult = await handleConversion({
          name: userDetails.name,
          email: userDetails.email!,
          phone: userDetails.phone,
          password: userDetails.password,
          confirmPassword: userDetails.confirmPassword,
          gender: userDetails.gender,
          dateOfBirth: userDetails.dateOfBirth,
          homeAddress: userDetails.homeAddress,
          city: userDetails.city,
          state: userDetails.state,
          lga: userDetails.lga,
          preferences: userDetails.preferences,
        });

        if (!conversionResult.success || !conversionResult.token) {
          throw new Error("Failed to convert guest to user before checkout");
        }
// ✅ CRITICAL FIX: Store and use the new token immediately
token = conversionResult.token;
await SecureStore.setItemAsync(TOKEN_KEY, token);

// ✅ Update Auth Context immediately
setUserToken(token);

console.log('[useCheckout] Guest converted successfully, new token stored');

      }

      // ✅ Ensure we have a valid token
      if (!token) {
        throw new Error('No valid authentication token available for checkout');
      }

      // 2️⃣ Proceed to checkout with the valid token
      console.log('[useCheckout] Calling checkout service with valid token...');
      const data = await checkoutServices.checkout(
        cartItems,
        sessionId,
        userDetails,
        token
      );

      setOrder(data.localOrder ?? null);

      // 3️⃣ Refresh profile to get saved address details and sync user state
      console.log('[useCheckout] Refreshing user profile...');
      await refreshUser(); // ✅ FIXED: await the refresh

      console.log('[useCheckout] Checkout completed successfully');
      return data;
    } catch (err: any) {
      console.error("[useCheckout] Checkout error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { checkout, order, loading };
};