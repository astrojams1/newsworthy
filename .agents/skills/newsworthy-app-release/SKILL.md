---
name: newsworthy-app-release
description: Build, upload, submit and release Newsworthy to the App Store and Google Play end to end, and keep its release ledgers, by following the shared app-release skill (vendor/skills/skills/app-release) with this app's facts — local Xcode and Gradle builds, TestFlight, App Review, Play testing tracks, listings and artwork, plus EAS sandboxes within the Expo free plan's caps. Use before any store build, TestFlight or Play upload, App Review or Play review step, store listing or artwork change, EAS sandbox or workflow, or a request to change how Newsworthy releases or this skill work, even when the skill is not named.
---

# Newsworthy app release

Follow the shared skill at
[vendor/skills/skills/app-release/SKILL.md](../../../vendor/skills/skills/app-release/SKILL.md) for the whole
process: credentials, local builds, the App Store Connect and Play commands, what only the owner can do, App Review
and rejections, Play tracks and listings, and the ledger. This file adds only what is true of Newsworthy. When the two
disagree about Newsworthy, this file wins.

**Changing release instructions:** before editing this file, decide where the change belongs with the shared skill's
`references/maintaining.md`. Anything true of every app (a store rule, a script's behavior, a gate, the ledger, a
gotcha) goes to the shared skill in the skills repository (`/Volumes/ssd/code/skills`). It never goes here, and never
into the `vendor/skills` submodule checkout. Only Newsworthy's own facts, choices and extra gates go here.

The shared skills are the `vendor/skills` submodule. (`skills/` here holds the public rating skill.) Run
`git submodule update --init vendor/skills` after cloning. Run every command from the repository root on Node 22,
with `S=vendor/skills/skills/app-release/scripts` (or `npm run ledger`, `npm run mobile:release:ios`,
`npm run mobile:release:android`). All work, toolchains and caches live on `/Volumes/ssd`, not the home directory.

- Configuration: [app-release.config.json](../../../app-release.config.json). Store data:
  [store/store.json](../../../store/store.json). It holds listing copy for both stores, the age rating, review notes
  and the US$1 price. It also holds the screenshots and Play graphics from `store/assets/manifest.json`.
- Ledgers: gates in [store/ledger.json](../../../store/ledger.json) (view [store/ledger.md](../../../store/ledger.md)).
  Builds, spend, runs and lessons go in [the build ledger](../../../store/builds/ledger.md), append-only. Read both
  first: `node $S/ledger.mjs status`, then this month's row and Lessons.
- Kind of app: a paid news app (the shared `references/app-types.md`, News and Paid downloads). The route and the
  history of the store setup are in [docs/mobile-release.md](../../../docs/mobile-release.md).

## Facts

| Thing | Value |
|---|---|
| App Store Connect app | `Newsworthy: Calm News`, Apple ID `6812519450`, bundle `com.astrojams.newsworthy`, team `CWQ9AWJF8T`; release `AFTER_APPROVAL` |
| Google Play app | `Newsworthy`, package `com.astrojams.newsworthy`, paid; every Play commit is held for the owner to send (`android.holdForReview`) |
| Vault items | `op://API Tokens/App Store Connect`; `op://API Tokens/Newsworthy Android` (`upload.jks`, `keystore password`, `google-services.json`, `play-service-account.json` for `play-release@newsworthy-cad27.iam.gserviceaccount.com`, allowed on Newsworthy only to release to testing tracks, manage store presence and edit the draft app) |
| Expo account | `astrojams1`, free plan, shared with Space Worms; token `op://API Tokens/Expo/credential` |
| Push | iOS `aps-environment: production` and Android `string/google_app_id` are checked in every build |
| Widgets | iOS small and medium (app group `group.com.astrojams.newsworthy.widgets` on the app and widget); one resizable Android widget |
| TestFlight | Internal group `Release QA` does not get every build; `ios-release.mjs testers <N>` adds it |

## The Expo free plan's caps

Nothing builds in EAS. iOS store builds are archived on the Mac (since 14 October), and Android bundles are built
there too (since 15 October). The caps still limit sandboxes and MCP calls, and builds if a cloud build is ever needed
again.

| Cap | What uses it | When it is gone |
|---|---|---|
| Build credits (15 iOS and 15 Android a month, shared with Space Worms) | Every cloud `eas build` that starts | `eas build` fails with "You've reached your included build credits" until the 1st |
| MCP tool requests (500 observed) | Expo MCP calls, including polling and image-transfer chunks | All MCP calls fail; use the CLI or GraphQL API for cleanup, never another account |
| CI/CD minutes (60 a month) | EAS sandboxes and workflows, per minute, each sandbox counted separately | `sandbox_create` fails with "Free plan CI/CD 60 minute limit reached" |

- **Resets.** Credits and minutes reset on the 1st at 00:00 UTC.
- **Size.** `LARGE` sandboxes need a paid plan. Use `MEDIUM`.
- **Never upgrade.** Upgrading is a purchase.
- **Ask the owner before spending either cap.** Say how much of the month a batch uses. Check what is left first
  (`eas account:usage astrojams1 --non-interactive`, `build_list`, `sandbox_list`). 36 cloud builds used September's
  credits in ten days. One prepared macOS sandbox did a full round of iOS simulator checks in 22 minutes.
- **Clone inside a sandbox.** The EAS project has no linked GitHub repository, so `build_run` and a sandbox's `gitRef`
  fail. `git clone` the public repository inside the sandbox.
- **Free space.** The macOS image ships an 11 GB CocoaPods cache. Delete it after `pod install` if you need room for
  simulator runtimes.

## Checks before any build, for free

Run `npm test`, `npm run test:design`, `npm run check:android-widget`, `npm run check:app` and
`npx expo prebuild --no-install` (in `apps/client`). Never spend a build, sandbox or upload to find a compile or
signing error. Check JavaScript-only changes on the web or in Expo Go first. Builds have no EAS Update channel, so any
change reaches testers only in a new build.

## Native verification specific to Newsworthy

- **Local simulator route** (Xcode 27, 11 October). Run `CI=1 npx expo prebuild -p ios --no-install`, then
  `LANG=en_US.UTF-8 pod install`. Then make a Release simulator build of `Newsworthy.xcworkspace` scheme `Newsworthy`
  with `ARCHS=arm64 ONLY_ACTIVE_ARCH=YES`, widget included. It takes about 15 minutes. Do it in a worktree under
  `.worktrees/` and remove it after, because `ios/` and `build/` are large.
- **UIScene.** `plugins/with-scene-lifecycle.js` adopts it through Expo's `ExpoAppSceneDelegate`. Since 14 October the
  Xcode 27 build launches on iOS 27.0 and 18.4. The crash comes back if a prebuild leaves `AppDelegate.swift` creating
  its own window, or leaves the Info.plist without `UIApplicationSceneManifest`.
- **Widgets.**
  - Keep normal simulator ad-hoc signing and Xcode-generated entitlements when you verify AppIntent widgets. An
    unsigned bundle can show app screens while its widget stays a placeholder.
  - For clean widget artwork, keep full Home Screen originals and crop only measured native container bounds. Mask
    the wallpaper around the corners: measure one corner and mirror it. Check the full text after masking.
  - After the first full build in a sandbox, rebuild only the widget target
    (`xcodebuild -project … -target NewsworthyWidget`, about 10 s) and swap the `.appex` in.
- **Captures.**
  - Keep originals with the source commit, bundle version and build, runtime, device and hashes.
  - A local simulator bundle may carry a different build number from the store build of the same source. Never
    relabel it, and never claim physical-device certification.
  - Reuse a valid production build when only listing copy, screenshots or records change.
- **Android.** Record emulator and physical-device checks separately. The owner's phone installs from the
  internal-testing link. Use `adb install -r` of the universal APK only on an emulator or with the owner's say-so.
- **Sandboxes, when no Mac is available.**
  - Run one macOS `MEDIUM` sandbox at a time.
  - Write the setup script before `sandbox_create`.
  - Run slow steps in the background.
  - Copy evidence out as text, with checksums.
  - Stop the sandbox the moment you are done.

  MCP exhaustion can block `sandbox_stop`. The EAS CLI GraphQL schema's `sandbox.stopSandbox(sandboxId:)` stopped and
  verified one with the same Expo credential (1 October).
- **Watch a build's log, not just its status.** Cloud build 22 compiled in six minutes, then sat in "Uploading
  application archive" until the 45-minute limit cancelled it (1 October). Fifteen minutes stuck in that phase will
  not finish. Ask the owner before rebuilding.

## Store specifics

- **Review notes** are capped at 4,000 characters and change at their source, `store/store.json` `review.notes`.
  Compare the live values with the previous copy before `asc.mjs review-details`, so only the intended change goes
  out. Apple's rejection text is not in the API: ask the owner, or read the email. Keep a receipt
  (`store/apple-review-resubmission-<date>-build<N>.json`) and record `apple.review`.
- **Guideline 4.2** was answered by shipping more on-device function (the timeline on by default, build 27).
- **Google News policy.** Version 16 was rejected under News and Magazines until Settings showed the publisher.
  Version 17 went to review with Settings > Publisher (19 October). Keep the publisher, contact and ownership in the
  app.
- **Play listing and artwork.** Render with `store/scripts/render-google-play.mjs`, then run
  `node $S/play.mjs images` (with the owner's OK). Save console listing edits with **Save**, never "Save as draft",
  before any API write.
- **Paid release.** The Paid Apps Agreement and banking gates (`apple.agreement`, `apple.bank`) must be active before
  approval means sale. Play's payments profile likewise.

## After every run

- **Build ledger** (`store/builds/ledger.md`). Add this month's row and an entry for:
  - each build: number or version code, commit, Xcode build or JDK, and the `.ipa`/`.aab` SHA-256 from
    `summary.json`;
  - each sandbox: id, minutes, what it did;
  - each submission;
  - anything wasted, and why.

  Add a dated Lessons item when a run teaches something new.
- **Release ledger.** Run `npm run ledger -- record --gate <id> …` for what was verified, on what (simulator or
  device, OS version, build), and what remains.
