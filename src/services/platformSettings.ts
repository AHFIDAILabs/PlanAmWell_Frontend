// services/platformSettings.ts
import axios from "axios";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const API_URL = `${SERVER_URL}/api/v1/platform-settings`;

export interface PlatformSettings {
  consultationFeeKobo: number;
  currency: string;
  paymentEnabled: boolean;
}

// A flat, rarely-changing fee — a plain module-level cache avoids re-fetching
// it every time a screen mounts within the same app session.
let cached: PlatformSettings | null = null;

export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (cached) return cached;
  const response = await axios.get(API_URL);
  cached = response.data.data;
  return cached!;
}

export function formatKobo(amountKobo: number, currency: string = "NGN"): string {
  const symbol = currency === "NGN" ? "₦" : `${currency} `;
  return `${symbol}${(amountKobo / 100).toLocaleString()}`;
}
