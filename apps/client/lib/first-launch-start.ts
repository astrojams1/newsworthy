import { Platform, Settings } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { FIRST_LAUNCH_STORAGE_KEY, reportFirstLaunch } from '@/lib/firstLaunch';

// The shared first-launch count (app-release standards): one anonymous event on the first open after install, from
// the iPhone and iPad app only. Development builds and simulators send nothing; `-uiTest 1` and `-uiTestReset 1`
// (tours, captures) never send; `-firstLaunchSend 1` sends from a development build or simulator, as `debug`, to
// check it. Never awaited at startup; failures are silent and retried on a later launch.
export function startFirstLaunch(): void {
  if (Platform.OS !== 'ios') return;
  const force = Boolean(Settings.get('firstLaunchSend'));
  if (!force && (Settings.get('uiTest') || Settings.get('uiTestReset'))) return;
  void reportFirstLaunch('newsworthy', {
    version: Application.nativeApplicationVersion || '?', platform: Platform.OS,
    channel: __DEV__ || !Device.isDevice ? 'debug' : 'unknown', force,
    read: () => AsyncStorage.getItem(FIRST_LAUNCH_STORAGE_KEY), write: text => AsyncStorage.setItem(FIRST_LAUNCH_STORAGE_KEY, text),
    post: (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).then(r => r.status),
  });
}
