// app-standard: first-launch
// firstLaunch.ts
// The shared first-launch count for Expo and React Native apps (references/standards.md in the app-release skill): on
// the first open after install the app sends one anonymous event, so downloads show within minutes instead of after
// Apple's one to two day lag. Copy this file into the app unchanged and call it once when the app starts. It imports
// nothing; the app passes the platform's calls. A Capacitor app calls FirstLaunch.swift from its native AppDelegate
// instead, which can also tell a TestFlight install from a store one.
//
// Expo (expo-application, expo-device, AsyncStorage or SecureStore); a simulator counts as debug:
//   useEffect(() => { reportFirstLaunch('<catalogue id>', {
//     version: Application.nativeApplicationVersion || '?', platform: Platform.OS, channel: __DEV__ || !Device.isDevice ? 'debug' : 'unknown',
//     read: () => AsyncStorage.getItem(FIRST_LAUNCH_STORAGE_KEY), write: text => AsyncStorage.setItem(FIRST_LAUNCH_STORAGE_KEY, text),
//     post: (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).then(r => r.status) }); }, []);
//
// The catalogue id is the app's id in astrojams1/app-sites marketing/apps/<id>.json (space-worms, newsworthy, lob...).
// Only iOS reports (Google Play is on hold): on any other platform, and in a debug build or a simulator, nothing is
// sent unless `force` is set to check the standard.
//
// What is sent: the catalogue id, the app version, the platform and the install channel. Nothing else: no advertising
// id, no vendor id, no device name or model, no locale and no identifier of any kind, so the server cannot tell two
// installs apart. It keeps only a daily count per app, version, platform and channel; the request's IP address is read
// by no code and stored nowhere. App Privacy: Usage Data > Product Interaction, not linked to the user, not used for
// tracking, purpose Analytics (declare the same in the privacy manifest).
//
// Never in the way: call it without awaiting, a failure is silent, and the flag that stops repeats is written only
// after the server has answered, so a failed send is tried again on a later launch.
// Written without optional chaining or nullish coalescing, which some of the app repositories ban, so the copy stays unchanged.

export const FIRST_LAUNCH_ENDPOINT = 'https://astrojams-apps.vercel.app/api/launch';
export const FIRST_LAUNCH_STORAGE_KEY = 'app-standard.first-launch.sent';

export type FirstLaunchChannel = 'store' | 'testflight' | 'debug' | 'unknown';

export type FirstLaunchPlatform = {
  version: string;
  // Platform.OS on React Native: 'ios', 'android', 'web'...
  platform: string;
  channel: FirstLaunchChannel;
  read: () => Promise<string | null>;
  write: (text: string) => Promise<unknown>;
  // Posts the JSON body and resolves the HTTP status.
  post: (url: string, body: string) => Promise<number>;
  // Send even from a debug build or a simulator, as `debug`: only to check the standard (a -firstLaunchSend launch).
  force?: boolean;
};

export type FirstLaunchEvent = { app: string; version: string; platform: string; channel: FirstLaunchChannel };

// The event, and the only data the request carries.
export function firstLaunchEvent(app: string, platform: FirstLaunchPlatform): FirstLaunchEvent {
  return { app, version: platform.version, platform: platform.platform, channel: platform.channel };
}

// A status that settles it: taken (2xx) or refused for good (4xx other than 408 and 429). Anything else is tried again.
export function firstLaunchSettled(status: number): boolean {
  return status >= 200 && status < 500 && status !== 408 && status !== 429;
}

// Reports the first open once. Resolves true when this call settled it. Never throws.
export async function reportFirstLaunch(app: string, platform: FirstLaunchPlatform): Promise<boolean> {
  try {
    if (platform.platform !== 'ios' || (platform.channel === 'debug' && !platform.force)) return false;
    if ((await platform.read()) === 'sent') return false;
    const status = await platform.post(FIRST_LAUNCH_ENDPOINT, JSON.stringify(firstLaunchEvent(app, platform)));
    if (!firstLaunchSettled(status)) return false;
    await platform.write('sent');
    return true;
  } catch {
    return false;
  }
}
