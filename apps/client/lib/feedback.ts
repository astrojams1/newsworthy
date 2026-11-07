// app-standard: feedback
// feedback.ts
// The shared Send Feedback action for Expo, React Native and Capacitor apps (references/standards.md in the app-release
// skill). Copy this file into the app, set FEEDBACK_ADDRESS to feedback.email in app-release.config.json, and call
// sendFeedback from a control labelled "Send Feedback" on the settings or about screen, behind the parental gate in a
// Kids Category app. It imports nothing; the screen passes the platform's calls. It sends nothing itself: the user's own
// mail app does, if they choose.
//
// Expo:
//   sendFeedback(
//     { appName: 'Example', version: Application.nativeApplicationVersion ?? '?', build: Application.nativeBuildVersion ?? '?',
//       osVersion: `${Platform.OS} ${Platform.Version}`, deviceModel: Device.modelId ?? Device.modelName ?? '?', locale: getLocales()[0]?.languageTag ?? '?' },
//     { open: url => Linking.openURL(url),
//       showAddress: address => Alert.alert('Send Feedback', address, [
//         { text: 'Copy', onPress: () => Clipboard.setStringAsync(address) }, { text: 'Done', style: 'cancel' }]) });
//
// Capacitor: `open` calls AppLauncher.openUrl({ url }) and returns its `completed`; `showAddress` shows the same dialog
// with Clipboard.write. From App.getInfo() and Device.getInfo() come the version, build, OS and model.

export const FEEDBACK_ADDRESS = 'astrojams1@gmail.com';

// The footer holds these six facts and nothing else: no identifiers, account data or logs.
export type FeedbackInfo = {
  appName: string;
  version: string;
  build: string;
  osVersion: string;
  deviceModel: string;
  locale: string;
};

export type FeedbackPlatform = {
  // Opens the URL; rejects or resolves false when nothing can take it.
  open: (url: string) => Promise<unknown>;
  // Shows the address with a Copy button.
  showAddress: (address: string) => void;
};

export function feedbackSubject(info: FeedbackInfo): string {
  return `[${info.appName} feedback] ${info.version} (${info.build})`;
}

// Empty lines for the user to write in, then the footer.
export function feedbackBody(info: FeedbackInfo): string {
  return `\n\n\n-- \nApp: ${info.appName}\nVersion: ${info.version}\nBuild: ${info.build}\nOS: ${info.osVersion}\nDevice: ${info.deviceModel}\nLocale: ${info.locale}\n`;
}

export function feedbackUrl(info: FeedbackInfo): string {
  const subject = encodeURIComponent(feedbackSubject(info));
  const body = encodeURIComponent(feedbackBody(info).replace(/\n/g, '\r\n'));
  return `mailto:${FEEDBACK_ADDRESS}?subject=${subject}&body=${body}`;
}

// sendFeedback opens the user's mail composer, or shows the address when no mail app takes the link.
export async function sendFeedback(info: FeedbackInfo, platform: FeedbackPlatform): Promise<void> {
  let opened: unknown = false;
  try {
    opened = await platform.open(feedbackUrl(info));
  } catch {
    opened = false;
  }
  if (opened === false) platform.showAddress(FEEDBACK_ADDRESS);
}
