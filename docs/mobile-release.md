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

**Store builds are made on the owner's Mac, not by EAS Build.** iOS uses local
Xcode ([Local iOS release](#local-ios-release)) and Android local Gradle
([Local Android release](#local-android-release)); neither spends EAS credits.
The EAS project stays only because Expo push tokens are issued for it.

**The app adopts the UIScene life cycle**, which iOS 27 requires of an app
linked against the iOS 27 SDK. Without it the app was stopped at launch in
`_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`, first seen on
11 October and reproduced on 14 October with Xcode 27 (27A266a) on the iOS 27.0
simulator. `plugins/with-scene-lifecycle.js` names Expo's own
`ExpoAppSceneDelegate` in `UIApplicationSceneManifest` and stops the app
delegate creating the window, which the scene delegate now creates. With it the
Xcode 27 Release build launches on iOS 27.0 and iOS 18.4, a cold-start
`newsworthy://` link opens its route and the Dark override applies. The Xcode
26.6 pin (`ios.image` in `eas.json`) is removed; a store build uses the Mac's
Xcode, recorded in each archive's `DTXcodeBuild`.

On 14 October the owner's Mac had Xcode 27 (27A266a) with iOS 27.0 and 18.4
simulator runtimes. An Xcode update can need a license acceptance and a
matching runtime download before asset catalogs compile; older installed
runtimes alone are not enough. Check the actual host and runtime inventory
rather than assuming a cloud environment. Expo Go runs a precompiled
host in the simulator; widgets require custom builds and cannot be tested in it.

PR #155 is merged. Production **1.0.0 (26)** is selected and **Waiting for
Review**, confirmed through Apple's API on 1 October at 11:37 UTC. Listing and
six-part Notes are saved. Eight current gallery images are COMPLETE, ordered
and checksum-verified; timeline leads iPhone/iPad, and the iPhone Notifications
image shows the root page rather than the threshold selector. The widget image
preserves real Small Light/Medium Dark native surfaces on a neutral canvas.

Six app images came from the authorized iOS 26.5 Expo sandbox; Notifications and
widgets came from EAS simulator build `78c0ccc8` on local iOS 18.3.1. Both report
actual bundle 1.0.0 (1), with application files matching production source
`51826ed`. The Mac unlock is resolved; the slow runtime download does not block
this completed submission. The sandbox is stopped. Original EAS widget rendering
worked despite empty extension entitlements, so the earlier signing hypothesis
is not established. Physical build-26 QA and widget name-hiding rechecks remain
separate from these captures. No public App Store preview video is planned;
Notes identify the existing build-21 physical recording as historical. See
`store/apple-review-resubmission-2026-10-01-build26.json`,
`store/source/ios-gallery-v26-provenance.json` and the release ledger.

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

## Local iOS release

Run on the owner's Mac from the repository root, with Xcode, CocoaPods and the
1Password CLI (`op`, signed in or with `OP_KEY`) available. The script is the
shared app-release skill's (the `vendor/skills` submodule), configured by
`app-release.config.json`:

```sh
node vendor/skills/skills/app-release/scripts/ios-release.mjs next-build-number   # App Store Connect's highest + 1
node vendor/skills/skills/app-release/scripts/ios-release.mjs archive             # prebuild, pods, archive, export, verify
node vendor/skills/skills/app-release/scripts/ios-release.mjs validate <N>        # optional: Apple's checks, no upload
node vendor/skills/skills/app-release/scripts/ios-release.mjs upload <N>          # altool upload, waits for processing
node vendor/skills/skills/app-release/scripts/ios-release.mjs testers <N>         # add the VALID build to Release QA
node vendor/skills/skills/app-release/scripts/ios-release.mjs release             # archive, upload and testers in one run
```

- **Build number.** EAS's remote counter is no longer used. The script reads
  the highest build App Store Connect holds (any version, expired included) and
  adds one; `--build-number N` overrides it. The number reaches the app and the
  widget through `ios.buildNumber` (`NEWSWORTHY_IOS_BUILD_NUMBER` in
  `app.config.js`), and the archive is refused if either bundle disagrees.
- **Prebuild.** `expo prebuild -p ios --clean --no-install`, then `pod install`
  with a UTF-8 locale (CocoaPods fails on Unicode normalization without one).
  `ios/` stays generated and ignored.
- **Signing.** Apple-managed: `xcodebuild archive` and `-exportArchive` run with
  `-allowProvisioningUpdates` and the App Store Connect key
  (`-authenticationKeyPath/ID/IssuerID`), team `CWQ9AWJF8T`, so Xcode creates or
  refreshes the distribution certificate and the app and widget profiles
  without an Xcode account sign-in. Export uses method `app-store-connect`
  (Xcode's current name for `app-store`) with `manageAppVersionAndBuildNumber`
  off. Before upload the script checks the signed app and widget carry the
  team, the widget App Group and, for the app, production `aps-environment`.
- **Upload.** `xcrun altool --upload-package … --wait` with the same key; it
  refuses an archive made from uncommitted changes or changed since `archive`.
  Transporter works as well for a manual upload of the exported `.ipa`.
- **Credentials.** The key is `op://API Tokens/App Store Connect` (`credential`,
  `key id`, `issuer id`), written for one run to a private temporary file and
  removed on exit. `ASC_KEY_ID`, `ASC_ISSUER_ID` and `ASC_PRIVATE_KEY_PATH`,
  as for the shared skill's `asc.mjs`, take precedence.
- **Output** goes to `/Volumes/ssd/builds/xcode/newsworthy/release/<N>/`: logs, the archive, the
  `.ipa` and `summary.json` (commit, dirty flag, Xcode build, SDK and the
  `.ipa`'s SHA-256) for the build ledger.

An upload is outward-facing: confirm each one with the owner, and record it in
`store/builds/ledger.md` and the release ledger. Selecting a build for App
Review and resubmitting stay separate steps (see the app release skill).

## Local Android release

Android store bundles are built on the owner's Mac with Gradle and signed with
the Play upload key; nothing builds in EAS, and `eas.json` and the EAS build
workflow are gone. From the repository root, with the shared app-release
skill's script (every Play commit is held for the owner to send for review,
`android.holdForReview` in `app-release.config.json`):

```sh
node vendor/skills/skills/app-release/scripts/android-release.mjs next-version-code
node vendor/skills/skills/app-release/scripts/android-release.mjs release --track internal
```

`bundle` prebuilds with `--clean`, runs `./gradlew bundleRelease` and checks the
`.aab` before anything leaves the Mac: package, version code, a target SDK of
36 or later, the release JavaScript, Firebase's `google_app_id`, none of the
permissions `app.config.js` blocks (Expo's template asks for
`SYSTEM_ALERT_WINDOW` and external storage; the app uses neither) and a
signature by the upload key rather than Expo's debug key. It writes
`/Volumes/ssd/builds/android/newsworthy/<N>/Newsworthy.aab` and a `summary.json` with the
commit, JDK and SHA-256. `apk` turns that bundle into one universal APK signed
with the same key, for `adb install -r` on a phone. `upload --version-code N
[--track internal]` sends that bundle to a Play testing track (see
[Google Play](#google-play)). `release` runs bundle and apk, and upload too
when `--track` is given; each command except `next-version-code` takes
`--version-code N`, and bundle and release ask Play for it when it is left
out.

The version code is Play's highest plus one, across every track and every
bundle uploaded: `next-version-code` asks the Play Developer API. EAS issued 1
to 12, none of which reached Play; 13 was built locally and not uploaded, and
14 was the first upload, by hand.

**Credentials** are the vault item `op://API Tokens/Newsworthy Android`:
attachments `upload.jks` (PKCS12, alias `upload`, made 15 October 2026) and
`google-services.json` (Firebase project `newsworthy-cad27`) and
`play-service-account.json` (the Play API key, below), and the field
`keystore password`. The script reads them into a private temporary directory
for one run. `NEWSWORTHY_ANDROID_KEYSTORE`, `NEWSWORTHY_ANDROID_KEYSTORE_PASSWORD`,
`GOOGLE_SERVICES_JSON` and `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` override the vault. The keystore is only the upload
key: Play App Signing holds the key that signs what users install, and a lost
upload key can be reset in Play Console. The vault's service account is
read-only, so the owner adds or replaces the item; the owner added it on
15 October and the script's vault path was checked against bundle 13.

**Toolchain**, measured on 15 October with Homebrew: `openjdk@17`,
`android-commandlinetools` and `bundletool`, and SDK packages `platforms;android-36`,
`build-tools;36.0.0` and `ndk;27.1.12297006` (React Native 0.86's versions)
installed with `sdkmanager` under `/Volumes/ssd/toolchains/android-sdk` because
the system disk is short of room. Set `JAVA_HOME` (`/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`),
`ANDROID_HOME`, and keep the rest on the SSD too: all work belongs in
`/Volumes/ssd`, so set `GRADLE_USER_HOME` (Gradle's cache) and
`ANDROID_USER_HOME` (otherwise `~/.android`, where `sdkmanager` and the Android
Gradle plugin write caches and settings) under `/Volumes/ssd/toolchains`.

The EAS project ID is saved in `mobile.release.json`; `EXPO_PROJECT_ID` can
override it. The project stays because push tokens are issued for it, and the
FCM V1 sender key Expo relays through is stored there.
The renewed James Thompson Apple team (`CWQ9AWJF8T`) is saved in
`mobile.release.json`; `APPLE_TEAM_ID` can override it for a deliberate team
change. App Store record `6812519450` is the iOS upload target.

### Google Play

Play does not take an app's first bundle through its API: the first upload is
made by hand in Play Console, to internal testing. Version code 14 went that
way on 15 October and was published to internal testing. Later uploads use the
Play Developer API (androidpublisher v3):

```sh
node vendor/skills/skills/app-release/scripts/android-release.mjs upload --version-code 15 --track internal
```

`upload` refuses a bundle that changed since `bundle` verified it, then opens
an edit, uploads the `.aab` (`edits.bundles.upload`) and checks that Play read
the same version code and SHA-256. It sets the track to one `completed`
release of that code with en-US release notes (`--notes`, by default
"Newsworthy <version> (<code>)."), validates and commits, then reads the track
back. An edit that fails is deleted, so a failed run changes nothing on Play.
Tracks are `internal`, `alpha` (closed testing) and `beta` (open testing);
production stays in the console. An upload is outward-facing: confirm each
with the owner.

The script signs the service account's token request (an RS256 JWT for the
`androidpublisher` scope) with `node:crypto`, as `ios-release.mjs` does for
App Store Connect, and has no dependencies.

**One-time setup**, done on 15 October in the built-in browser:

1. Google Cloud project `newsworthy-cad27` (the Firebase project, signed in as
   the owner): enable the **Google Play Android Developer API**
   (`androidpublisher.googleapis.com`).
2. IAM & Admin → Service accounts: create `play-release`
   (`play-release@newsworthy-cad27.iam.gserviceaccount.com`) with no project
   roles; Play's own permissions are what it needs.
3. Play Console → Users and permissions → Invite new users (developer account
   8388544157780149515): that email, App permissions for Newsworthy only (app
   ID 4974473553901574528) with **Release apps to testing tracks** and the
   read-only **View app information**, which brings View app quality
   information with it. No account permissions. A service account is Active
   at once; Play can take some minutes to honour new permissions. On
   15 October, with the owner's approval, **Manage store presence** (which
   brings Manage policy declarations) and **Edit and delete draft apps** were
   added so the shared skill's `play.mjs images` can replace the listing
   graphics: with store presence alone, Play accepted the image uploads but
   refused the edit's `validate` with 403 while the app is a draft. None of
   these permits production releases.
4. The owner creates a JSON key on the service account's Keys tab and attaches
   it to `op://API Tokens/Newsworthy Android` as `play-service-account.json`,
   then deletes the download. The vault's service account is read-only, and
   the key never goes into the repository or a log.

To revoke API access, delete the key in Google Cloud or remove the user in
Play Console; a replacement key is a new attachment under the same name.

Content rating, target audience, the ads declaration, tester email lists and
the application for production access are console-only.

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
  had build 21 Waiting for Review after the updated physical demonstration,
  six-part response and matching Notes were submitted September 24 at 06:19 UTC.
  That historical state was superseded by a rejection. Build 26 is now selected
  in Prepare for Submission, as recorded above and in the release ledger.
  The shorter name was already taken.
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
  At that time Apple build `805f70f3-09a4-4111-afd2-bf04bb99e30d` was `VALID`
  and selected for version 1.0.0. Three iPhone and two iPad historical listing
  screenshots remain `COMPLETE` while the current gallery is prepared.
  Version 1.0.0 build 5 was submitted at 2026-09-16 04:53 UTC. Both the version
  and review submission then reported WAITING_FOR_REVIEW (historical; see the
  current build 26 selection above). All 175 territories are
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

- The Notifications page in Settings (`apps/client/app/settings/notifications.tsx`) offers a notification for
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
  registered device receives anything. Configure these through an authorized account session; neither key
  belongs in this repository. `EXPO_ACCESS_TOKEN` on Vercel is optional and
  only lets Expo enforce that this server is the one sending.
- Android uses Firebase project `newsworthy-cad27`, registered for the existing
  package `com.astrojams.newsworthy`. The shared skill's `android-release.mjs` reads
  `google-services.json` from the vault and passes its path as
  `GOOGLE_SERVICES_JSON`, which Expo's `android.googleServicesFile` consumes.
  For other local prebuilds, set the same variable to a secured copy. Do not copy the service-account private key into
  this file or repository: it is a separate FCM V1 credential stored in EAS.
  The dedicated sender has the Firebase Cloud Messaging API Admin role in this
  project. AAB12 replaces historical AAB11; its matching preview APK12 is built
  from the same clean source. See `store/android-notifications-12.json` for the
  current verification scope. Credential assignment and prebuild verification
  alone do not prove delivery on a device.
- iOS build 21 adds notification-tap routing and a corrected privacy manifest
  to the Settings fixes in build 19. Its signed app and provisioning profile
  include production push and the widget App Group. The production-only,
  Newsworthy-specific APNs key is configured in Expo. On September 24, a labeled
  test returned Expo ticket OK and APNs receipt OK. Physical iPhone launch and
  notification registration removal/restoration were verified. Visual notification
  presentation and tapping remain unobserved because Mac notification mirroring
  is disabled; cold/live tap handling has automated coverage. Android delivery
  remains outside this iOS check. See
  [`store/testflight-21.json`](../store/testflight-21.json). App Privacy's four
  published categories match the manifest; see `store/disclosures.md`.

- The server persists accepted Expo ticket IDs and checks delivery receipts on the
  existing hourly scheduler, even when a new rating is skipped. Explicit
  failures can retry on the next reading of the same development; successful
  recipients are not repeated. Missing receipts expire after 24 hours without
  an automatic resend because delivery is unknown. Logs report aggregate
  receipt outcomes, never device tokens. Expo acceptance and APNs acceptance
  still do not prove that a person saw a notification.
- Tapping a notification opens the current reading, including when Settings was
  open. A foreground notification refreshes the reading without a banner or sound.

## Widgets

- iOS: `targets/widget` contains a SwiftUI/WidgetKit extension configured by
  `@bacons/apple-targets`; prebuild generates and embeds the extension target.
  On iOS 17 and later, Edit Widget includes **Show app name**, enabled by default
  and saved per widget. Turning it off hides the heading and gives its row to the
  rating and sentence, which keep their size, in either widget size. Edit Widget
  also offers **Appearance** (Follow device, Light, Dark), a String parameter:
  iOS 26.5 passes an AppEnum or AppEntity widget parameter as nil. Declaring
  its default needs iOS 26, so an unset row can read "Appearance" in Edit
  Widget; the widget then follows the device. iOS 16 keeps the heading
  visible and has no settings. The footer uses a
  compact, single-line date and time, retaining the saved-reading label when offline.
- Android: `plugins/with-rating-widget.js` adds the native widget receiver,
  resources, WorkManager fetcher and widget settings screen
  (`RatingWidgetConfigure`) during prebuild.
- Widget settings (Show app name, Appearance) are defined once in
  `design/widget-settings.json` and offered on both platforms, per widget.
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
appearance override (including share sheet and alerts), each widget's own
settings on iOS and Android (Show app name; Light and Dark held against the opposite system mode), the notification switch
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
