// Push notifications are a native feature. The website shows no notification
// setting, and these stubs keep the shared settings screen compiling for web.
export const pushSupported = false;
export type EnableResult = { ok: true; token: string } | { ok: false; reason: 'denied' | 'unavailable' | 'offline' };
export async function enablePush(_threshold: number): Promise<EnableResult> { return { ok: false, reason: 'unavailable' }; }
export async function updatePushThreshold(_token: string, _threshold: number) { return false; }
export async function disablePush(_token: string) { return true; }
export function onForegroundNotification(_refresh: () => void) { return () => {}; }
