// services/callNotificationService.ts
//
// Full-screen incoming-call notifications on Android, wired to RNFirebase
// Messaging's background handler (which — unlike expo-notifications' handler —
// reliably fires even when the app has been fully killed). Foreground behaviour
// (app open, socket connected) is untouched — this is purely the "wake the
// phone up" layer for background/killed states.
//
// Accept opens the app (existing IncomingCallScreen flow takes it from there).
// Decline is handled right here, silently, without opening the app — matches
// how a real phone declines a call.

import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
  EventType,
} from '@notifee/react-native';
import { getMessaging, setBackgroundMessageHandler, onMessage } from '@react-native-firebase/messaging';
import { declineCallDirect } from '../hooks/useVideoCall';
import { respondToVideoCall } from './Chat';

const CALL_CHANNEL_ID = 'incoming-calls';
// Fixed id — a second incoming call replaces the first rather than stacking.
const CALL_NOTIFICATION_ID = 'incoming-call';
// Matches IncomingCallScreen's own auto-decline timeout.
const RING_TIMEOUT_MS = 60000;

interface IncomingCallData {
  type?: string;
  appointmentId?: string;
  callerName?: string;
  callerImage?: string;
  callerType?: string;
  channelName?: string;
  callType?: string; // 'audio' | 'video'
  conversationId?: string;
  videoRequestId?: string;
}

export async function setupCallNotificationChannel(): Promise<void> {
  await notifee.createChannel({
    id: CALL_CHANNEL_ID,
    name: 'Incoming Calls',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'default',
    vibration: true,
    vibrationPattern: [0, 250, 250, 250],
  });

  // Required for asForegroundService notifications — the task just holds the
  // service open for the ring window; explicit dismiss (accept/decline) stops
  // it early via notifee.stopForegroundService().
  notifee.registerForegroundService(() => {
    return new Promise((resolve) => {
      setTimeout(resolve, RING_TIMEOUT_MS);
    });
  });
}

export async function displayIncomingCallNotification(data: IncomingCallData): Promise<void> {
  if (!data?.appointmentId) return;

  const isVoice = data.callType === 'audio';

  await notifee.displayNotification({
    id: CALL_NOTIFICATION_ID,
    title: isVoice ? '📞 Incoming Voice Call' : '📹 Incoming Video Call',
    body: `${data.callerName || 'Someone'} is calling you`,
    data: { ...data },
    android: {
      channelId: CALL_CHANNEL_ID,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      asForegroundService: true,
      autoCancel: false,
      ongoing: true,
      loopSound: true,
      timeoutAfter: RING_TIMEOUT_MS,
      fullScreenAction: { id: 'default' },
      pressAction: { id: 'default' },
      actions: [
        { title: 'Decline', pressAction: { id: 'decline' } },
        { title: 'Accept', pressAction: { id: 'accept', launchActivity: 'default' } },
      ],
    },
  });
}

export async function dismissIncomingCallNotification(): Promise<void> {
  try {
    await notifee.stopForegroundService();
  } catch {
    // Not running as a foreground service — fine, just cancel the notification below
  }
  try {
    await notifee.cancelNotification(CALL_NOTIFICATION_ID);
  } catch {
    // Already dismissed — fine
  }
}

async function handleDeclineFromNotification(data: IncomingCallData): Promise<void> {
  try {
    if (data.conversationId && data.videoRequestId) {
      await respondToVideoCall(data.conversationId, data.videoRequestId, false);
    } else if (data.appointmentId) {
      await declineCallDirect(data.appointmentId);
    }
  } finally {
    await dismissIncomingCallNotification();
  }
}

/**
 * Register RNFirebase's background message handler. This is the piece that
 * actually runs when the app is fully killed on Android — call once, at the
 * top of index.ts, outside the React tree.
 */
export function registerBackgroundCallHandler(): void {
  const messaging = getMessaging();
  setBackgroundMessageHandler(messaging, async (remoteMessage) => {
    const data = remoteMessage.data as IncomingCallData | undefined;
    if (data?.type === 'incoming_call') {
      await setupCallNotificationChannel();
      await displayIncomingCallNotification(data);
    }
  });
}

/**
 * Foreground FCM messages — app is open but the socket may have briefly
 * dropped. Safety net alongside the existing Socket.IO call-ringing flow,
 * which remains the primary path while the app is active.
 */
export function registerForegroundCallHandler(): () => void {
  const messaging = getMessaging();
  return onMessage(messaging, async (remoteMessage) => {
    const data = remoteMessage.data as IncomingCallData | undefined;
    if (data?.type === 'incoming_call') {
      await setupCallNotificationChannel();
      await displayIncomingCallNotification(data);
    }
  });
}

/**
 * Notifee action-press handling. Decline is fully handled right here — no
 * need to open the app. Accept / default tap just dismiss the notification;
 * the app launches (via the action's launchActivity, or default press
 * behaviour) and App.tsx's initial-notification check takes it from there.
 */
export function registerNotifeeEventHandlers(): () => void {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    const data = detail.notification?.data as IncomingCallData | undefined;
    if (!data?.appointmentId) return;

    if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'decline') {
      await handleDeclineFromNotification(data);
    }
  });

  return notifee.onForegroundEvent(({ type, detail }) => {
    const data = detail.notification?.data as IncomingCallData | undefined;
    if (!data?.appointmentId) return;

    if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'decline') {
      handleDeclineFromNotification(data);
    } else if (
      type === EventType.PRESS ||
      (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'accept')
    ) {
      dismissIncomingCallNotification();
    }
  });
}

/** Cold-start check — mirrors pushNotificationService.getInitialNotification(). */
export async function getInitialCallNotificationData(): Promise<IncomingCallData | null> {
  const initial = await notifee.getInitialNotification();
  const data = initial?.notification?.data as IncomingCallData | undefined;
  if (data?.type === 'incoming_call' && data.appointmentId) {
    await dismissIncomingCallNotification();
    return data;
  }
  return null;
}
