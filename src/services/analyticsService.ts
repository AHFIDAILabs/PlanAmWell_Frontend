// services/analyticsService.ts
//
// Thin wrapper around Firebase Analytics — the single choke point for all
// event logging so call sites never touch the SDK directly and never need
// to check consent themselves (every function here is a no-op until the
// person has opted in via Privacy Settings).
//
// Defaults to OFF (opt-in, not opt-out): this is a sexual/reproductive
// health app whose entire brand promise is confidentiality, so collection
// only starts once someone explicitly turns it on. Event names stay
// structural (screen names, "call_started") and params stay non-content
// (ids, counts, booleans, enums) — never chat text, appointment reason, or
// anything that reveals what someone actually looked at or discussed.

import * as SecureStore from 'expo-secure-store';
import {
  getAnalytics,
  logEvent as fbLogEvent,
  logScreenView as fbLogScreenView,
  setAnalyticsCollectionEnabled,
  setUserId as fbSetUserId,
  setUserProperty as fbSetUserProperty,
} from '@react-native-firebase/analytics';

const CONSENT_KEY = 'ANALYTICS_CONSENT';

let consentGranted = false;
let consentLoaded = false;

// Every exported function below is wrapped through this — a native-module
// hiccup (e.g. running in Expo Go without the custom dev client, or a
// misconfigured Firebase project) should never crash or interrupt the
// screen the person is actually using. Analytics is best-effort by design.
async function safe(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.warn('[analyticsService] non-fatal error:', err);
  }
}

async function ensureConsentLoaded() {
  if (consentLoaded) return;
  const stored = await SecureStore.getItemAsync(CONSENT_KEY);
  consentGranted = stored === 'true';
  await setAnalyticsCollectionEnabled(getAnalytics(), consentGranted);
  consentLoaded = true;
}

export async function getAnalyticsConsent(): Promise<boolean> {
  await safe(ensureConsentLoaded);
  return consentGranted;
}

export async function setAnalyticsConsent(enabled: boolean): Promise<void> {
  consentGranted = enabled;
  consentLoaded = true;
  await safe(async () => {
    await SecureStore.setItemAsync(CONSENT_KEY, enabled ? 'true' : 'false');
    await setAnalyticsCollectionEnabled(getAnalytics(), enabled);
  });
}

export async function logScreenView(screenName: string | undefined): Promise<void> {
  if (!screenName) return;
  await safe(async () => {
    await ensureConsentLoaded();
    if (!consentGranted) return;
    await fbLogScreenView(getAnalytics(), { screen_name: screenName, screen_class: screenName });
  });
}

export async function logEvent(
  name: string,
  params?: Record<string, string | number | boolean>
): Promise<void> {
  await safe(async () => {
    await ensureConsentLoaded();
    if (!consentGranted) return;
    await fbLogEvent(getAnalytics(), name, params);
  });
}

export async function setAnalyticsUser(userId: string, role: 'User' | 'Doctor'): Promise<void> {
  await safe(async () => {
    await ensureConsentLoaded();
    if (!consentGranted) return;
    await fbSetUserId(getAnalytics(), userId);
    await fbSetUserProperty(getAnalytics(), 'role', role);
  });
}

export async function clearAnalyticsUser(): Promise<void> {
  await safe(async () => {
    await ensureConsentLoaded();
    if (!consentGranted) return;
    await fbSetUserId(getAnalytics(), null);
  });
}
