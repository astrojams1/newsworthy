---
name: newsworthy-app-release
description: Build, verify and submit the Newsworthy apps locally on the owner's Mac, iOS with Xcode (archive, export, altool upload to TestFlight) and Android with Gradle (signed .aab uploaded to a Play testing track through the Play Developer API, universal APK for a phone), plus simulator and sandbox checks within the Expo account's free-plan caps. Use before any store build, Play or TestFlight upload, EAS sandbox or EAS workflow, and when planning native verification; every build and spend is logged in store/builds/ledger.md.
---

# Newsworthy app release

The release flow itself (profiles, signing, submission targets, store setup) is
in `docs/mobile-release.md`; gates and their evidence go in the release ledger
(`npm run ledger -- record …`). **Nothing builds in EAS.** iOS store builds
are archived on the owner's Mac with `apps/client/script/ios-release.mjs` and
Android bundles are built there with `apps/client/script/android-release.mjs`
(see Local iOS release and Local Android release in `docs/mobile-release.md`).
All work, toolchains and caches live on `/Volumes/ssd`, not the home directory.
The Expo account `astrojams1` is on the **free plan**; its caps still bound
sandboxes and MCP calls, and, if a cloud build is ever needed again, builds.

## The caps

| Cap | What uses it | When it is gone |
|---|---|---|
| Build credits (15 iOS and 15 Android, counted separately; iOS shared with Space Worms) | Every cloud `eas build` that starts; not used by this app since 14 October | `eas build` fails with "You've reached your included build credits"; nothing builds until the 1st |
| MCP tool requests (500 observed for this account) | Expo MCP tool calls, including command polling and image-transfer chunks | All MCP calls fail; use supported CLI/API for cleanup, without upgrading or switching accounts |
| CI/CD minutes (60 a month) | EAS sandboxes (`sandbox_create`) and EAS workflows, per minute of runtime, each sandbox counted separately | `sandbox_create` fails with "Free plan CI/CD 60 minute limit reached" |

Build credits and CI/CD minutes reset on the 1st of the month at 00:00 UTC.
The MCP error names its billing period; its reset time was not established. `LARGE` sandboxes need a paid
plan; use `MEDIUM`. Upgrading the plan is a purchase: never do it, and never
work around a cap by switching accounts. Say what is blocked and until when.

What the caps have cost so far, and what each run taught, is in
[the build ledger](../../../store/builds/ledger.md). For scale: 36 cloud builds
used September's credits in ten days, and one prepared macOS sandbox did a
full round of iOS simulator checks in 22 minutes.

## Credentials

Every credential is in the owner's 1Password vault, read with the 1Password
CLI (`op`; on the owner's Mac it is the Homebrew cask `1password-cli`) and a
service-account token in `OP_KEY`. That variable has held its own name as a
prefix (`OP_KEY=ops_…`), which `op` rejects as "unrecognized auth type", so
strip it: `OP_SERVICE_ACCOUNT_TOKEN="${OP_KEY#OP_KEY=}" op read "op://API Tokens/…"`.
The Expo token is `Expo/credential` (as `EXPO_TOKEN`); the App Store Connect
key is described under Submitting to TestFlight. Read them per command, never
into a file in the repository, and check access without printing values.

## Start from the ledger

Read [the build ledger](../../../store/builds/ledger.md) first: this month's row
says what is left, and its Lessons are what earlier runs cost to learn.

## Before spending either cap

1. **Ask the owner.** Cloud builds, TestFlight uploads and sandboxes are
   billable against the caps; confirm each batch first and say how much of the
   month it uses and what it leaves.
2. **Check what is left.** Count this month's builds with `build_list` (Expo
   MCP) or `eas build:list --limit 50`, and this month's sandboxes with
   `sandbox_list`. A cap reached mid-task stops the work with nothing to show.
   The Expo MCP's request cap can run out while build credits remain; then
   `eas build:list --json` and `eas build:view <id> --json` (with `EXPO_TOKEN`)
   read the same state; `eas account:usage astrojams1 --non-interactive` gives
   this month's credits per platform. The next Android version code is Play's
   highest plus one across tracks and uploaded bundles
   (`node script/android-release.mjs next-version-code`; 14 was the first
   upload, by hand); the next iOS build number is App Store Connect's highest
   plus one (`node script/ios-release.mjs next-build-number`).
3. **Reuse before building.** If a finished build already exists for the commit
   and profile you need, use its artifact (`build_list` gives the URL; artifacts
   expire after 14 days for internal builds, 30 for store builds). A pre-change
   build is also the "before" side of an upgrade test.
   Also check the MCP request allowance before a sandbox. Avoid moving full
   original PNGs in many small command-output chunks; that exhausted 500
   calls before widget capture finished. Prefer a supported binary artifact
   transfer. If command output is the only route, budget requests, batch reads
   and poll sparsely; check byte counts and SHA256 on arrival.
4. **Prove the change compiles first, for free.** Run `npm test`,
   `npm run test:design`, `npm run check:android-widget` (Android widget
   resources and Java) and `npx expo prebuild --no-install` in the cloud
   container. Never spend a store build to discover a compile or signing
   error; two of September's errored builds were errors of that kind (a
   provisioning profile missing the push entitlement, a Gradle failure).

## Choosing the cheapest route

Check the actual host first. On the owner's Mac, prefer local Xcode builds and
Simulator captures: they consume neither EAS build credits nor sandbox minutes.
Check `xcodebuild -version`, `xcodebuild -checkFirstLaunchStatus` and
`xcrun simctl list runtimes` before starting. An Xcode update can require the
owner to accept a new license and complete administrator setup. It can also
require downloading a matching simulator runtime before asset catalogs compile;
the presence of an older bootable simulator is not enough. Record that download
as a local prerequisite, not an app compile defect.

The local route, measured on 11 October with Xcode 27: `CI=1 npx expo prebuild
-p ios --no-install` in `apps/client`, `LANG=en_US.UTF-8 pod install` in
`ios` (without UTF-8 CocoaPods fails on Unicode normalization), then an
`xcodebuild -workspace Newsworthy.xcworkspace -scheme Newsworthy` Release
simulator build: about 15 minutes in all, no credits. Do it in a worktree under
`.worktrees/` and remove it after; `ios/` and `build/` are large.

**iOS 27 requires the UIScene life cycle** of an app built with the iOS 27 SDK;
without it iOS stops the app in
`_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`.
`plugins/with-scene-lifecycle.js` adopts it through Expo's
`ExpoAppSceneDelegate`, and since 14 October the Xcode 27 build launches on
iOS 27.0 and 18.4. A prebuild that leaves `AppDelegate.swift` creating its own
window, or an Info.plist without `UIApplicationSceneManifest`, brings the crash
back: check app screens on iOS 27 after any Expo upgrade. The old Xcode 26.6
EAS image pin is gone; each archive records its Xcode in `DTXcodeBuild`.

The Simulator panel drives only devices the owner has granted ("Let Claude use
it"); a newly created device waits for that grant. Use a device already granted,
or read the screen with `xcrun simctl io <device> screenshot`, which needs none.

Use a Release simulator build with `ARCHS=arm64 ONLY_ACTIVE_ARCH=YES`,
including the widget extension. Preserve normal simulator ad-hoc signing and
Xcode-generated entitlements when verifying AppIntent widgets. An unsigned
bundle can display app screens while its widget remains a placeholder: on
1 October, the iOS 26.5 sandbox logged an AppIntent privilege rejection. The
ad-hoc rebuild was not observed before the tool cap. The original EAS simulator
artifact, also with empty extension entitlements, subsequently rendered both
widgets and their settings on local iOS 18.3.1. Signing alone is therefore not
an established cause or fix; verify the actual runtime and artifact combination.
For clean widget artwork, retain full Home Screen originals, crop only measured
native container bounds and mask wallpaper around the corners. Measure one
corner boundary and mirror the symmetric container rather than thresholding
both sides of a gradient independently; inspect the full text after masking.
Capture through the
available computer-control interface and Simulator's Save Screen command.
Keep full original captures, source commit, actual bundle version/build, runtime,
device and hashes. A locally generated simulator bundle may have a different
build number from the production build with the same application source; do
not relabel it or claim physical-device certification. Reuse a valid production
build when only listing copy, screenshots or release records change.

The following sandbox guidance applies when no usable Mac is available.

The EAS project has no linked GitHub repository, so the Expo MCP's `build_run`
and a sandbox's `gitRef` checkout both fail; `git clone` the public repository
inside a sandbox (token: `op read "op://API Tokens/Expo/credential"`).


- **Swift, widget or iOS layout changes without a local Mac**: one macOS
  `MEDIUM` sandbox. It compiles the app, runs the iOS simulator (AXe drives the Home
  Screen and Edit Widget), and can download older iOS runtimes
  (`xcodebuild -downloadPlatform iOS -buildVersion 16.4`). Build with
  `ARCHS=arm64 ONLY_ACTIVE_ARCH=YES`; after the first full build, rebuild only
  the widget target (`xcodebuild -project … -target NewsworthyWidget`, about 10
  seconds) and swap the `.appex` into the app.
- **Android**: build on the Mac with `node script/android-release.mjs release
  --track internal` (about the time of a Gradle build, no credits): it takes
  the next version code from Play, builds and verifies the `.aab`, makes the
  universal APK for the owner's phone (`adb install -r`) and uploads the
  bundle to the track. Leave out `--track` to build without uploading. Record emulator and physical-device checks
  separately. The cloud container and EAS sandboxes lack emulator
  acceleration.
- **A real iPhone**: one local archive uploaded to TestFlight
  (`node script/ios-release.mjs release`), after simulator verification has
  passed. Builds have no EAS Update channel, so any change, JavaScript
  included, reaches testers only in a new build.
- **JavaScript-only changes**: check them on the web or in Expo Go first, which
  costs nothing; build only for what those cannot show (widgets, native
  modules, signing, the release bundle).
- **No Mac**: an Android bundle can be built in Linux with the Android SDK,
  but the cloud container's Maven downloads are rate-limited (HTTP 429). iOS
  builds need macOS: the owner's Mac, or an authorized sandbox batch, which
  consumes sandbox minutes.

## Submitting to TestFlight

The App Store Connect API key is the vault item `op://API Tokens/App Store
Connect`: `credential` is the `.p8` body without its PEM header and footer,
with `key id` and `issuer id` beside it. `script/ios-release.mjs` reads it per
run, writes it with its header to a private temporary file and removes it on
exit; `xcodebuild` uses it for Apple-managed signing
(`-allowProvisioningUpdates`) and `altool` for the upload. Confirm each upload
with the owner first. `release` runs archive, upload and testers; run them one
at a time to stop after the export or validate (`validate <N>`) before
uploading. EAS submission is no longer used for iOS; its workaround (the key
in a temporary copy of `eas.json`) is in the build ledger's Lessons.

**An uploaded build reaches no tester on its own.** The internal group
"Release QA" does not get every build automatically, so a processed build
(`READY_FOR_BETA_TESTING`) stays invisible until it is added to that group.
`node script/ios-release.mjs testers <N>` adds it, as the owner asked on
1 October: it waits for `VALID`, finds the group with
`GET /v1/betaGroups?filter[app]=…&filter[name]=…` (the app's own
`/v1/apps/{app}/betaGroups` refuses `filter[name]` with a 400) and posts the build to
`/v1/betaGroups/{id}/relationships/builds` (204 on success). Tell testers it is available only once its `buildBetaDetail` shows
`IN_BETA_TESTING`.

## Uploading to Google Play

The Play Developer API key is the attachment `play-service-account.json` on
`op://API Tokens/Newsworthy Android`: service account
`play-release@newsworthy-cad27.iam.gserviceaccount.com`, allowed to release to
Newsworthy's testing tracks and nothing else (setup under Google Play in
`docs/mobile-release.md`). `script/android-release.mjs` reads it per run into
a private temporary directory and removes it on exit. Confirm each upload
with the owner first. `upload --version-code N --track internal` sends a
bundle already built and verified: it refuses one that changed since, checks
Play's SHA-256 of what it received, sets one completed release with en-US
notes, validates and commits, and deletes the edit if anything fails.
Production and every console-only declaration (content rating, target
audience, ads, tester lists, production access) stay with the owner in Play
Console. A new app's first bundle can only be uploaded in the console.

## Resubmitting to App Review

After a rejection, App Store Connect keeps the version (`REJECTED`) and its
review submission (`UNRESOLVED_ISSUES`, item `REJECTED`); resubmitting reuses
both through the API, with the same vault key:

1. Once the new build is `VALID`, check `usesNonExemptEncryption` is set
   (false for this app), add it to Release QA, and select it:
   `PATCH /v1/appStoreVersions/{version}/relationships/build`.
2. Change listing copy and Review Notes at their source, `store/listing.json`,
   first. Before patching, compare the live values
   (`appStoreVersionLocalizations`, `appStoreReviewDetails`) with the
   repository's previous copy, so only the intended change goes out; read them
   back after. Review Notes are limited to 4,000 characters.
3. `PATCH /v1/reviewSubmissionItems/{item}` with `resolved: true` (it becomes
   `READY_FOR_REVIEW`), then `PATCH /v1/reviewSubmissions/{id}` with
   `submitted: true`. Read back `WAITING_FOR_REVIEW` on both the version and
   the submission before saying it was resubmitted.

The owner's request to resubmit authorizes these steps; nothing earlier does.
Apple's rejection text is not in the API, so ask the owner for it. Keep a
receipt (`store/apple-review-resubmission-<date>-build<N>.json`) and record
the `apple.review` gate.

## Spending them well

- **Batch.** One build per platform per verification round, carrying every
  change ready at the time; do not rebuild for a typo.
- **Build once per commit and profile.** Wait for a build to finish rather than
  cancelling and restarting it; a cancelled build still used its credit.
- **One sandbox at a time.** Minutes are counted per sandbox.
- **Prepare before starting a sandbox.** Write the setup script (clone, install,
  prebuild, build, runtime downloads, helpers) before `sandbox_create`, then run
  the slow steps in parallel in the background. Install the old build and add
  widgets while the new one compiles.
- **Watch a build's log, not just its status.** On 1 October build 22 compiled in
  six minutes, then sat in "Uploading application archive" until the free
  plan's 45-minute limit cancelled it, with no Expo incident posted; the
  rebuild uploaded normally. `build_info` gives a signed log URL (read it with
  `curl --compressed`). A build stuck in that phase for 15 minutes will not
  finish; ask the owner before rebuilding, since the stuck one already used
  its credit.
- **Copy evidence out as you go and stop the sandbox the moment you are done.**
  A sandbox can stop without warning and its disk goes with it. Text survives
  the trip through `sandbox_exec` output reliably; a large image may not, so
  record measurements (luminance, recognised text, log lines) as text and keep
  any image small, with a checksum checked on arrival.
- **Keep a cleanup route.** MCP exhaustion can also block `sandbox_stop`. The
  official EAS CLI GraphQL schema exposes `sandbox.stopSandbox(sandboxId:)` and
  `sandboxes.byId(sandboxId:)`; these stopped and verified the 1 October
  sandbox using the same Expo credential. This is cleanup through the same
  account, not a way to continue executing commands past the tool cap. An
  existing job can expose an SSH session, but this sandbox had none.
- **Free disk early.** The macOS image ships an 11 GB CocoaPods cache
  (`~/Library/Caches/CocoaPods`); delete it after `pod install` if you need room
  for simulator runtimes.

## After

- **Build ledger.** Update this month's row in `store/builds/ledger.md` and add
  an entry under the month: each build (EAS id, platform, profile, commit,
  outcome; for a local archive or bundle, build number or version code, commit,
  Xcode build or JDK, and the `.ipa` or `.aab` SHA-256 from `summary.json`), each sandbox (id, minutes, what it did), each submission, and
  anything wasted and why. Add a dated Lessons item when a run teaches
  something new.
- **Release ledger.** Record what was verified, on what (simulator or device,
  OS version, build), and what remains, with
  `npm run ledger -- record --gate <id> …`.
