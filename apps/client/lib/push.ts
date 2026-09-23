import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { apiOrigin } from './config';

// Push notifications exist only in the native apps. Nothing here runs on web:
// push.web.ts answers `supported: false` and the settings screen omits the section.
export const pushSupported = true;

export type EnableResult = { ok: true; token: string } | { ok: false; reason: 'denied' | 'unavailable' | 'offline' };

// While the app is open the reading is already on screen, so a banner and a
// sound would interrupt someone looking at the thing being announced. The
// notification goes to the list only, and the visible reading refreshes.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** Run `refresh` when a notification arrives in the foreground. Returns the unsubscribe. */
export function onForegroundNotification(refresh: () => void) {
  const subscription = Notifications.addNotificationReceivedListener(() => refresh());
  return () => subscription.remove();
}

/** Bring the reading to the front when an alert is tapped, including cold launch. */
export function onNotificationOpen(open: () => void) {
  let alive = true;
  let handled: string | undefined;
  const respond = (response: Notifications.NotificationResponse | null) => {
    if (!alive || !response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.identifier;
    if (handled === id) return;
    handled = id;
    open();
    void Notifications.clearLastNotificationResponseAsync().catch(() => {});
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(respond);
  void Notifications.getLastNotificationResponseAsync().then(respond).catch(() => {});
  return () => { alive = false; subscription.remove(); };
}

async function permissionGranted(request: boolean) {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
  if (!request || !current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted || asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

async function expoPushToken() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('readings', {
      name: 'High readings', importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId;
  return (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
}

async function call(method: 'PUT' | 'DELETE', body: Record<string, unknown>) {
  const response = await fetch(`${apiOrigin}/api/push/subscriptions`, {
    method, credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Push registration failed: ${response.status}`);
}

/** Ask for permission, fetch this device's token and register it with the server. */
export async function enablePush(threshold: number): Promise<EnableResult> {
  try {
    if (!(await permissionGranted(true))) return { ok: false, reason: 'denied' };
  } catch { return { ok: false, reason: 'unavailable' }; }
  let token: string;
  try { token = await expoPushToken(); } catch { return { ok: false, reason: 'unavailable' }; }
  try { await call('PUT', { token, threshold, platform: Platform.OS }); } catch { return { ok: false, reason: 'offline' }; }
  return { ok: true, token };
}

/** Re-register with a new threshold. The server keeps one row per token. */
export async function updatePushThreshold(token: string, threshold: number) {
  try { await call('PUT', { token, threshold, platform: Platform.OS }); return true; } catch { return false; }
}

/** Remove this device from the server. A failed removal is retried on the next change. */
export async function disablePush(token: string) {
  try { await call('DELETE', { token }); return true; } catch { return false; }
}
