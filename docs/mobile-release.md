# Release Newsworthy with Expo

## Architecture

- `apps/client` is the shared Expo SDK 57 / React Native app for iOS, Android and web.
- Mobile screens render native views. The web build uses React Native Web.
- Vercel continues to run `src/server.js`, the ratings API, cron and Postgres access.
- `npm run build:web` exports the public Expo UI to `dist/web` and includes the
  existing static privacy, support and web-only admin pages. The server serves
  this output when present. Vercel runs this build before deployment.
- Admin is outside Expo Router and is never included in native bundles.
- The rating scale and server prompts are unchanged.

## Run and preview

```sh
npm ci
npm run dev                 # Expo Go QR code and Metro
npm run mobile:ios          # actual installed iOS Simulator, through Expo Go
npm run mobile:android      # Android emulator/device through Expo Go
npm run build:web
npm start                   # website + API; uses your local backend configuration
```

Codex actions call `apps/client/script/build_and_run.sh`: Run, Run iOS, Run Web.
Run Web starts a live Expo browser preview; its development middleware forwards
only `GET /api/current` to the public production API. Native apps fetch that API
directly. Web previews are not native simulator verification.

The installed Xcode 16.2 can manage the existing simulators. Expo SDK 57 custom
builds need a newer supported toolchain; use EAS cloud builds rather than
upgrading Xcode locally. Expo Go runs a precompiled host in the simulator.
Widgets require custom builds and cannot be tested in Expo Go.

The EAS project is [@astrojams1/newsworthy](https://expo.dev/accounts/astrojams1/projects/newsworthy).
The local CLI was connected through Expo browser sign-in on September 16, 2026.
Store submission and native verification remain separate release gates.

## Release identity

`mobile.release.json` contains the public API/policy/support URLs and the chosen
identifier `com.astrojams.newsworthy`. Confirm store availability and ownership
before the first release. The iOS widget uses the `.widget` suffix.

`npm run mobile:check` validates public release settings; add `-- --live` to
check the live reading and policy/support URLs. No secrets belong in this file,
Expo config, or variables prefixed `EXPO_PUBLIC_`.

## Cloud builds and store setup

From `apps/client`:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform ios --profile simulator
npx eas-cli@latest build --platform android --profile preview
```

The EAS project ID is saved in `mobile.release.json`; `EXPO_PROJECT_ID` can
override it for an explicitly chosen EAS project.
The renewed James Thompson Apple team (`CWQ9AWJF8T`) is saved in
`mobile.release.json`; `APPLE_TEAM_ID` can override it for a deliberate team
change. The production submission profile targets App Store record `6812519450`.
EAS manages signing credentials interactively during initial setup.
A physical-iPhone development/preview build requires Apple developer membership
and device registration. Use a production build and TestFlight for beta testing.

Build profiles in `apps/client/eas.json`:

| Profile | Purpose |
|---|---|
| `development` | Native development client, including widgets |
| `simulator` | iOS simulator development build, no App Store signing |
| `simulator-release` | iOS simulator release build with bundled JavaScript, no development menu |
| `preview` | Internal iOS build / Android APK |
| `production` | Signed App Store / Google Play build, incremented build number |

After setup, `.github/workflows/mobile.yml` starts EAS builds manually. Configure
GitHub secret `EXPO_TOKEN`, repository variable `EXPO_PROJECT_ID` and, for iOS,
`APPLE_TEAM_ID`. Building does not automatically submit or publish to a store.

```sh
npx eas-cli@latest build --platform all --profile production
npx eas-cli@latest submit --platform ios --profile production
npx eas-cli@latest submit --platform android --profile production
```

The Android `production` submission profile currently targets **internal testing**.
Uploading there is not a public release. Complete the required testing and promote
the verified build in Play Console. An iOS EAS submission uploads to App Store
Connect/TestFlight; selecting a build and submitting it for App Review are separate
steps. See [Expo's submission guide](https://docs.expo.dev/deploy/submit-to-app-stores/).

The first Google Play upload and store configuration may require console setup.
Complete store privacy, age-rating, pricing, screenshots and review information
using `docs/store-listing.md`. Privacy and support are already public at
`https://newsworthy-indol.vercel.app/privacy` and `/support`.

### Paid launch

The requested mobile launch price is a one-time US$1 download, with local store
equivalents, to help offset running costs. Configure paid-app pricing in both
consoles using [the store listing notes](store-listing.md#pricing). Do not offer
the Google Play app free while setting up testing; it cannot later become paid
under the same package name.

New personal Google Play accounts must complete a closed test with at least
12 testers opted in continuously for 14 days before applying for production
access. Internal testing alone does not meet this requirement. See
[Google's testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

### Submission progress — September 16, 2026

- EAS project created and linked; Expo CLI authenticated as `astrojams1`.
- Android upload keystore generated and stored by EAS.
- The first Android production AAB build was canceled while queued so the release
  candidate includes the native launch/header fixes below. Its replacement
  (version code 3) failed compiling `RatingWidgetWorker` because the app compile
  classpath lacked `ListenableFuture`:
  [ab7c5018-129b-4c1c-aa8f-82ff3467067c](https://expo.dev/accounts/astrojams1/projects/newsworthy/builds/ab7c5018-129b-4c1c-aa8f-82ff3467067c).
  The widget plugin now explicitly includes Android Guava. A replacement build
  (version code 4) finished successfully:
  [12c77b26-8035-469a-ba7a-3ed613cc2ef7](https://expo.dev/accounts/astrojams1/projects/newsworthy/builds/12c77b26-8035-469a-ba7a-3ed613cc2ef7).
  Version 4 is superseded by version 6 below.
  Native inspection found missing SVG gradients/icons because Android expo-image
  expects base64 data URLs. The app now encodes Android SVGs accordingly.
  Production version 6 and its preview APK both finished successfully; their
  IDs are in `store/release.json`. Version 6 passes emulator light/dark, share,
  About, offline-cache and recovery checks. Three Android listing captures are
  prepared; widget/large-text and physical-device verification remain pending.
- iOS custom simulator build compiled successfully, including the widget:
  [a92ddf2a-2b9b-47ca-a343-d588ab38e99d](https://expo.dev/accounts/astrojams1/projects/newsworthy/builds/a92ddf2a-2b9b-47ca-a343-d588ab38e99d).
  Installed on iPhone 16 Pro / iOS 18.3. Native launch exposed an Expo Head
  Handoff-origin error that Expo Go had not exposed. The page-title component now
  renders only on web. An empty native header title also prevents a duplicate
  app name. With those JavaScript fixes, a fresh load displayed the live score,
  sentence and timestamp. Store-signed builds and full device checks are pending.
- A simulator release build with bundled JavaScript and the fixes above finished:
  [c2bc2fbe-15ce-481e-92ca-dee45455b34c](https://expo.dev/accounts/astrojams1/projects/newsworthy/builds/c2bc2fbe-15ce-481e-92ca-dee45455b34c).
  It is installed on the iPhone 16 Pro simulator; the current reading and native
  sharing sheet were verified. Full device and widget checks remain pending.
  A newer simulator release build including the configurable widget layout
  finished successfully: [1a4edab8-6c4c-4133-ab32-62c45fd0a7f9](https://expo.dev/accounts/astrojams1/projects/newsworthy/builds/1a4edab8-6c4c-4133-ab32-62c45fd0a7f9).
  The current simulator release has since been checked on iPhone and iPad,
  including the iPhone medium widget. Capture provenance and artwork are in the
  [store release hub](../store/README.md).
- Apple confirmed the James Thompson team's renewal through September 15, 2027;
  App Store Connect recognizes the active membership after refreshing.
  Both `com.astrojams.newsworthy` and its `.widget` identifier are registered.
  [Newsworthy: Calm News](https://appstoreconnect.apple.com/apps/6812519450/distribution)
  is now Waiting for Review. The shorter name was already taken.
  Listing copy, subtitle, privacy-policy URL, News category, review contact
  (including phone), and review notes are saved.
  The saved Apple Current Price table confirms a US$1.00 base price and local
  prices in the other regions. The owner accepted the Paid Apps Agreement; it
  last showed Pending User Info, with banking and US tax information outstanding.
  Apple Business now confirms the W-9 is Active. Banking remains outstanding.
  DSA compliance is Active, and App Privacy has been published by the owner.
  The legal-address correction did not persist after verification; the authorized
  membership-update request has now been submitted and acknowledged by Apple.
  Approval is pending, and the obsolete address must not be reused in new forms.
  The supplied App Store Connect API key authenticated successfully. EAS now has
  an Apple distribution certificate and separate active provisioning profiles
  for `Newsworthy` and `NewsworthyWidget`.
  Signed production iOS build 5 finished successfully:
  [34e8a094-c122-4770-9bf6-611f70f671ab](https://expo.dev/accounts/astrojams1/projects/newsworthy/builds/34e8a094-c122-4770-9bf6-611f70f671ab).
  The stalled [EAS submission](https://expo.dev/accounts/astrojams1/projects/newsworthy/submissions/4a6398aa-658c-49c0-a909-c09209dd5021)
  was canceled and replaced with a successful direct Apple `altool` upload.
  Apple build `805f70f3-09a4-4111-afd2-bf04bb99e30d` is `VALID` and selected for
  version 1.0.0. Three iPhone and two iPad listing screenshots are `COMPLETE`.
  Version 1.0.0 build 5 was submitted at 2026-09-16 04:53 UTC. Both the version
  and review submission report WAITING_FOR_REVIEW. All 175 territories are
  enabled, with automatic release after approval. It is not publicly released;
  commercial-account and final device checks remain separate.
- Google Play developer registration and its fee are complete. Play Console
  disables app creation until account verification is complete. Identity is now
  verified successfully. Access to a real Android device through the Play Console
  mobile app, then contact phone verification, remain pending. The Google
  developer profile already shows the corrected legal address.
- Google Play pricing and its review submission remain pending. Record final
  build results, device checks, store URLs and submission status in the
  [store release hub](../store/README.md). It is the canonical operational checklist.
- Local release checks passed after updating Expo to 57.0.23: TypeScript,
  21 Expo Doctor checks, live API/policy/support checks, both native JavaScript
  exports and 175 repository tests (including the production web export).

## Push notifications

- The settings screen (`apps/client/app/settings.tsx`) offers a notification for
  readings at or above a chosen score — off by default, 8 when turned on. It is
  hidden on web. Turning it on asks for the notification permission, fetches the
  device's Expo push token with the EAS project ID from `mobile.release.json`,
  and registers it at `PUT /api/push/subscriptions`; turning it off deletes it.
- `expo-notifications` is a native module: it needs a custom build, not Expo Go,
  and the change cannot be delivered as a JavaScript-only update. The config
  plugin adds the `aps-environment` entitlement and remote-notification
  background mode on iOS, and `assets/notification-icon.png` (the dash, white on
  transparent) with the brand colour as the Android status-bar icon.
- **Credentials are a release gate.** Expo relays to APNs and FCM, so EAS needs
  an Apple push key (`eas credentials`, iOS, push notifications) and a Firebase
  service-account key for Android (`eas credentials`, Android, FCM V1) before a
  registered device receives anything. Both are account-owner steps; neither
  belongs in this repository. `EXPO_ACCESS_TOKEN` on Vercel is optional and
  only lets Expo enforce that this server is the one sending.
- iOS build 19 includes `expo-notifications` and the Settings save-feedback
  fixes. Its app provisioning profile includes the production push entitlement and existing widget App Group. EAS
  still has no APNs delivery key configured, so notification delivery is not
  enabled. Permission prompts, token registration, delivery, the Android icon
  and foreground behavior remain unverified on devices. See
  [`store/testflight-19.json`](../store/testflight-19.json); reevaluate the store
  privacy labels before public release (`store/disclosures.md`).

## Widgets

- iOS: `targets/widget` contains a SwiftUI/WidgetKit extension configured by
  `@bacons/apple-targets`; prebuild generates and embeds the extension target.
  On iOS 17 and later, Edit Widget includes **Show app name**, enabled by default
  and saved per widget. Turning it off hides the heading and enlarges the rating
  inside either widget size. iOS 16 keeps the heading visible. The footer uses a
  compact, single-line date and time, retaining the saved-reading label when offline.
- Android: `plugins/with-rating-widget.js` adds the native widget receiver,
  resources and WorkManager fetcher during prebuild.
- A successful app refresh also hands its public reading to both widgets. iOS
  uses `group.<appId>.widgets` shared defaults and requests `NewsworthyRating`
  timeline reloads; Android delivers an explicit broadcast to its private receiver.
  Failed app requests do not replace widget data. Original timestamps are preserved.
  The iOS app and extension require matching App Groups entitlements and refreshed
  provisioning profiles; this native change cannot be delivered as a JS-only update.
- Both still fetch the public API independently, retain a last valid reading and its
  original time, and request periodic refreshes controlled by the OS.
- Widgets and the app can temporarily disagree. Neither widget is real-time.
- A static white dash on near-black remains the launcher icon.

## Verification gates

```sh
npm run check:app
npm run build:web
npm test
cd apps/client
npx expo-doctor
npx expo export --platform ios --platform android
npx expo prebuild --no-install
```

Before release, verify custom builds on devices: initial load, saved reading in
flight mode, recovery, native sharing, light/dark mode and the Settings
appearance override (including share sheet and alerts), the notification switch
(permission prompt, refusal, delivery of an 8 or above, threshold change, turning
off), large text, Android back, widget addition/refresh/offline state and the
privacy/support links in Settings. Simulator Expo
Go verification covers the native screen, not the app's signed binary or widgets.

Detailed UI/accessibility evidence and remaining checks are in
[`accessibility-verification.md`](accessibility-verification.md).

Dependency audit: the XML and UUID build-tool advisories were patched with
overrides. One unresolved moderate `decode-uri-component` advisory remains
(reported under three dependency entries through Expo Router/query-string),
with no patched package version available at the time of preparation. Recheck
upstream fixes before the store release; do not force-downgrade Expo Router to
an incompatible SDK to silence the audit.
