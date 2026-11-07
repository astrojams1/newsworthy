import { Alert, Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import * as Device from 'expo-device';
import { sendFeedback } from '@/lib/feedback';

// Settings > Send Feedback on the phone apps: the shared email, filled in with this install's facts.
export function openFeedback() {
  return sendFeedback({
    appName: 'Newsworthy',
    version: Application.nativeApplicationVersion ?? '?',
    build: Application.nativeBuildVersion ?? '?',
    osVersion: `${Platform.OS} ${Platform.Version}`,
    deviceModel: Device.modelId ?? Device.modelName ?? '?',
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
  }, {
    open: url => Linking.openURL(url),
    showAddress: address => Alert.alert('Send Feedback', address, [
      { text: 'Copy', onPress: () => { void Clipboard.setStringAsync(address); } },
      { text: 'Done', style: 'cancel' },
    ]),
  });
}
