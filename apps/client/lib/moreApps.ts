// app-standard: more-apps
// moreApps.ts
// The shared "More apps" row for Expo, React Native and Capacitor apps (references/standards.md in the app-release
// skill): the owner's other live apps, each with its icon, name, one line and a link to its App Store page. Copy this
// file into the app unchanged, then generate the list beside it from the shared catalogue, from the app repository:
//
//   node <skills>/skills/app-release/scripts/more-apps.mjs write --ts <folder>/moreAppsCatalog.ts
//
// It imports only that list; the screen draws the rows with its own components and passes the platform's calls:
//
// Expo / React Native:
//   import { Linking, Platform } from 'react-native';
//   const apps = moreAppsFor(Platform.OS, Application.applicationId);
//   apps.map(app => <Row key={app.id} icon={{ uri: moreAppsIconUri(app) }} title={app.name} detail={app.subtitle}
//                        onPress={() => Linking.openURL(moreAppsStoreUrl(app))} />)
// Capacitor: moreAppsFor(Capacitor.getPlatform(), bundleId), and open the link the way the app opens other links out.
//
// Put it on the settings or about screen, near the feedback control; in a game, the settings or menu screen, never over play.
// Only iOS shows it (the App Store is the only store in use; Google Play is on hold), so moreAppsFor returns an empty
// list on Android and the web, and the screen then shows no row at all. Nothing is sent and nothing is counted by the
// app: the list and the icons are bundled, so it works offline and never shows a broken row.
// Written without optional chaining or nullish coalescing, which some of the app repositories ban, so the copy stays unchanged.

import { MORE_APPS, type MoreApp } from './moreAppsCatalog';

export type { MoreApp };

export const MORE_APPS_TITLE = 'More apps';

// The apps to show on this platform: none outside iOS, and never this app itself.
export function moreAppsFor(platform: string, ownBundleId?: string | null, catalog: MoreApp[] = MORE_APPS): MoreApp[] {
  if (platform !== 'ios') return [];
  return catalog.filter(app => app.bundleId !== ownBundleId);
}

// The App Store page. On iPhone and iPad an apps.apple.com link opens the App Store app.
export function moreAppsStoreUrl(app: MoreApp): string {
  return 'https://apps.apple.com/app/id' + app.appStoreId;
}

// The bundled icon as a data URI, for an <Image source={{ uri }}> or an <img src>.
export function moreAppsIconUri(app: MoreApp): string {
  return 'data:image/jpeg;base64,' + app.iconJPEGBase64;
}
