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

The local EAS CLI reported “Not logged in” during preparation. Connect your Expo
account before starting cloud builds. No signed build or store submission has
been made.

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

Use the EAS project ID as `EXPO_PROJECT_ID`; `app.config.js` reads this variable.
For signed iOS builds set `ios.appleTeamId` via the `APPLE_TEAM_ID` environment
variable. EAS manages signing credentials interactively during initial setup.
A physical-iPhone development/preview build requires Apple developer membership
and device registration. Use a production build and TestFlight for beta testing.

Build profiles in `apps/client/eas.json`:

| Profile | Purpose |
|---|---|
| `development` | Native development client, including widgets |
| `simulator` | iOS simulator development build, no App Store signing |
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

The first Google Play upload and store configuration may require console setup.
Complete store privacy, age-rating, pricing, screenshots and review information
using `docs/store-listing.md`. Privacy and support are already public at
`https://newsworthy-indol.vercel.app/privacy` and `/support`.

## Widgets

- iOS: `targets/widget` contains a SwiftUI/WidgetKit extension configured by
  `@bacons/apple-targets`; prebuild generates and embeds the extension target.
- Android: `plugins/with-rating-widget.js` adds the native widget receiver,
  resources and WorkManager fetcher during prebuild.
- Both fetch the public API independently, retain a last valid reading and its
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
flight mode, recovery, native sharing, light/dark mode, large text, Android back,
widget addition/refresh/offline state and privacy/support links. Simulator Expo
Go verification covers the native screen, not the app's signed binary or widgets.

Detailed UI/accessibility evidence and remaining checks are in
[`accessibility-verification.md`](accessibility-verification.md).

Dependency audit: the XML and UUID build-tool advisories were patched with
overrides. One unresolved moderate `decode-uri-component` advisory remains
(reported under three dependency entries through Expo Router/query-string),
with no patched package version available at the time of preparation. Recheck
upstream fixes before the store release; do not force-downgrade Expo Router to
an incompatible SDK to silence the audit.
