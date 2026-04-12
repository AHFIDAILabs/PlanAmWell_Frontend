import * as SecureStore from 'expo-secure-store';
import React, { createContext, useState, useEffect } from "react";
import { ICart, ICartItem, IProduct } from "../types/backendType";
import { cartService, ICartResponse } from "../services/cart";
import { useAuth } from "../hooks/useAuth";

interface CartContextProps {
  cart: ICart | null;
  loading: boolean;
  addProduct: (product: IProduct) => Promise<void>;
  removeItem: (drugId: string) => Promise<void>;
  updateItem: (drugId: string, quantity: number, dosage?: string, specialInstructions?: string) => Promise<void>;
  clearCartBackend: () => Promise<void>; // 🛑 RENAMED: Clears cart via API call
  clearCartLocal: () => void; // ✅ NEW: Clears local state only
  refreshCart: () => Promise<void>;
}

export const CartContext = createContext<CartContextProps>(null!);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<ICart | null>(null);
  const [loading, setLoading] = useState(false);
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);

  const { userToken, sessionId: authSessionId, user } = useAuth();

  const getCartId = () => user?._id ?? authSessionId ?? guestSessionId;

  // Initialize guest session on mount
  useEffect(() => {
    const initGuestSession = async () => {
      if (!authSessionId && !guestSessionId) {
        let storedId = await SecureStore.getItemAsync("guestSessionId");
        if (!storedId) {
          storedId = `guest-${Math.random().toString(36).substring(2)}`;
          await SecureStore.setItemAsync("guestSessionId", storedId);
        }
        setGuestSessionId(storedId);
      }
    };
    initGuestSession();
  }, [authSessionId, guestSessionId]); // Added dependencies for clarity

  // Manual refresh function - for pull-to-refresh or explicit user actions
const refreshCart = async () => {
  const cartId = getCartId();
  if (!cartId) return;

  try {
    const res: ICartResponse = await cartService.getCart(cartId, userToken ?? undefined);
    
    // getCart returns { success, data: cart }
    // addToCart returns { success, localCart: cart }
    const cartData = res.data ?? res.localCart;
    if (cartData !== undefined) {
      setCart(cartData);
    }
  } catch (err: any) {
    if (err.response?.status === 404) {
      setCart(null);
    } else {
      console.error("Failed to fetch cart:", err);
    }
  }
};

const addProduct = async (product: IProduct) => {
  const cartId = getCartId();
  if (!cartId) return;

  setLoading(true);
  try {
    const item: ICartItem = {
      drugId: product.drugId ?? product.partnerProductId ?? "",
      quantity: 1,
      price: product.price,
      drugName: product.name,
      imageUrl: product.imageUrl ?? "",
      dosage: "",
      specialInstructions: "",
    };

    const res: ICartResponse = await cartService.addToCart([item], cartId, userToken ?? undefined);
    if (res.localCart) setCart(res.localCart);
  } catch (err) {
    console.error("Add to cart failed:", err);
    throw err;
  } finally {
    setLoading(false);
  }
};

  const updateItem = async (drugId: string, quantity: number, dosage?: string, specialInstructions?: string) => {
    const cartId = getCartId();
    if (!cartId) return;

    setLoading(true);
    try {
      await cartService.updateItem(drugId, quantity, cartId, userToken ?? undefined, dosage, specialInstructions);
      
    
      setCart(prevCart => {
        if (!prevCart) return null;
        
        const updatedItems = prevCart.items.map(item =>
          item.drugId === drugId
            ? { 
                ...item, 
                quantity, 
                dosage: dosage ?? item.dosage, 
                specialInstructions: specialInstructions ?? item.specialInstructions 
              }
            : item
        );

      
        const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = updatedItems.reduce((sum, item) => sum + ((item.price ?? 0) * item.quantity), 0);

        return {
          ...prevCart,
          items: updatedItems,
          totalItems,
          totalPrice
        };
      });
    } catch (err) {
      console.error("Update item failed:", err);
 
      await refreshCart();
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (drugId: string) => {
    const cartId = getCartId();
    if (!cartId) return;

    setLoading(true);
    try {
      await cartService.removeItem(drugId, cartId, userToken ?? undefined);

      setCart(prevCart => {
        if (!prevCart) return null;
        
        const updatedItems = prevCart.items.filter(item => item.drugId !== drugId);


        if (updatedItems.length === 0) return null;

        
        const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = updatedItems.reduce((sum, item) => sum + ((item.price ?? 0) * item.quantity), 0);

        return {
          ...prevCart,
          items: updatedItems,
          totalItems,
          totalPrice
        };
      });
    } catch (err) {
      console.error("Remove item failed:", err);
     
      await refreshCart();
      throw err;
    } finally {
      setLoading(false);
    }
  };


  const clearCartBackend = async () => {
    const cartId = getCartId();
    if (!cartId) return;

    setLoading(true);
    try {
     
      await cartService.clearCart(cartId, userToken ?? undefined);
      setCart(null);
    } catch (err) {
      console.error("Clear cart failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };


  const clearCartLocal = () => {
    setCart(null);
    console.log("🛒 Local cart state cleared after checkout.");
  };


  return (
    <CartContext.Provider
      value={{ 
        cart, 
        loading, 
        addProduct, 
        removeItem, 
        updateItem, 
        clearCartBackend, 
        clearCartLocal, 
        refreshCart 
      }}
    >
      {children}
    </CartContext.Provider>
  );
};