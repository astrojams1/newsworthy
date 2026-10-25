# Build and sandbox ledger

Every EAS cloud build, local iOS store archive, EAS sandbox and TestFlight or
Play submission, what it was for, what it cost against the Expo free plan's
monthly caps, and what came of it. Since 14 October iOS store builds are local
and cost no credits; the caps now bound Android builds and sandboxes. Use the [app release skill](../../.agents/skills/newsworthy-app-release/SKILL.md)
before spending either cap. Entries are append-only, oldest first: a later
entry that corrects an earlier one says so in its own words. Both caps reset on
the 1st at 00:00 UTC, so the month's rows in the table are what is left to
plan with.

Verification results belong to their gates in the [release ledger](../ledger.md);
record them there too. This file is about cost.

| Month | Builds started (credits) | Sandbox minutes (of 60) | Wasted | Notes |
|---|---|---|---|---|
| [2026-09](#2026-09) | 36 (19 iOS, 17 Android); refused from the 26th | about 87, cap reached on the 26th | 7 cancelled or errored builds; 3 duplicate Android builds; two sandboxes at once | Credits gone in ten days |
| [2026-10](#2026-10) | 6 so far (iOS 22, 24, 25, 26, 27; simulator-release 78c0ccc8); none after 12 October | about 57.3 | Build 22 (stalled upload, 45-minute limit); build 25 (Swift needing iOS 26, skipped compile check) | TestFlight builds 24 and 26 of #155; build 27 resubmitted for review; iOS local from the 14th (build 28 in TestFlight, no credit); Android local from the 15th (13 built, not uploaded; 14 by hand, 15 and 16 through the Play API, all on internal testing) |

## Lessons

What past runs cost to learn. Read before spending either cap, and add to it
when a run teaches something new; date each item. The skill states the
resulting rules; this is the evidence behind them.

- **Credits go fast** (2026-09). 36 builds between 15 and 24 September used the
  month's build credits; `eas build` was refused from the 26th until the 1st.
- **Cancelled and errored builds are waste** (2026-09). 5 cancelled and 2
  errored in September. The errors were a provisioning profile without the
  push entitlement (iOS 16, 22 Sep) and a Gradle failure (Android 3, 15 Sep);
  both could have shown up before a cloud build.
- **One commit, one Android build** (2026-09). 6c19cb9, b5571c5 and 3b0a2e0 were
  each built as a `production` AAB and a `preview` APK.
- **One sandbox at a time** (2026-09-26). A macOS and a Linux sandbox started
  four minutes apart used the 60 minutes together within about 45; the Linux one
  then hung in a Gradle build and returned nothing.
- **A focused sandbox is enough** (2026-10-01). One prepared macOS sandbox
  compiled the app, ran iOS 26.5, 18.6 and 16.4 simulators and an upgrade test
  in 22 minutes.
- **Large images do not survive the trip out** (2026-10-01). A 20 KB contact
  sheet copied out of a sandbox through command output failed its checksum.
  Text measurements arrived intact.
- **A build can stall after compiling** (2026-10-01). iOS build 22 compiled in
  six minutes, then sat in "Uploading application archive" until the
  45-minute limit cancelled it, with no Expo incident posted. The rebuild
  uploaded normally.
- **Submission needs the key in the profile** (2026-10-01). `--auto-submit`,
  plain `eas submit --non-interactive`, the `EXPO_ASC_*` variables and the Expo
  MCP's `build_submit` all failed; naming the vault key in a temporary copy of
  the submit profile worked.
- **Submitted is not available to testers** (2026-10-01). Build 24 processed
  (`VALID`, `READY_FOR_BETA_TESTING`) but showed no update on the owner's
  iPhone: the internal group "Release QA" does not get every build, and builds
  6 to 21 had each been added to it by hand. Add the build to the group
  through the API as part of every submission.
- **A skipped compile check cost a credit** (2026-10-01). Build 25 errored
  in four minutes: `@Parameter(title:default:optionsProvider:)` on a String is
  iOS 26-only and the widget targets iOS 17. The owner chose to build straight
  rather than spend about 10 sandbox minutes compiling first. Swift API
  availability is not checked by anything in the cloud container; a test now
  rejects that initializer.
- **An iOS 27 SDK build of this app does not launch on iOS 27** (2026-10-11).
  A local Xcode 27 Release simulator build crashed at launch in
  `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` (UIScene
  lifecycle not adopted) and ran on iOS 18.4; its widget extension worked on
  iOS 27. Build 26 used EAS image `macos-tahoe-26.5-xcode-26.6`, now pinned
  in `eas.json` so a changed EAS default cannot ship a build that crashes.
- **EAS credits are shared** (2026-10-14). The account's 15 monthly build
  credits also pay for Space Worms; 12 were used by the 14th. iOS store
  builds moved to the owner's Mac (`apps/client/script/ios-release.mjs`).
- **UIScene was the fix, not an older Xcode** (2026-10-14). The iOS 27 launch
  crash reproduced with Xcode 27 (27A266a); adopting UIScene through Expo 57's
  own `ExpoAppSceneDelegate` (a config plugin, no native code kept in Git)
  made the same build launch on iOS 27.0 and 18.4, so the Xcode 26.6 pin went.
- **Local archive and export take about seven minutes** (2026-10-14). With
  pods already downloaded, `ios-release.mjs archive` (clean prebuild, pods,
  archive, export, checks) finished build 28 in 6m57s. Xcode-managed signing
  with the API key needed no Xcode account sign-in.
- **The first local upload hit a dropped connection** (2026-10-14). Upload
  and processing of build 28 succeeded; adding it to Release QA then failed
  once on `fetch failed`, and again on the group lookup below. The shared
  app-release skill's `asc.mjs` now retries a dropped connection on reads up
  to three times and never retries a write. Nothing was re-uploaded.
- **Local Xcode verification is free** (2026-10-11). With Xcode 27 installed,
  prebuild, `pod install` (with `LANG=en_US.UTF-8`) and a Release simulator
  build took about 15 minutes and no credits or sandbox minutes.
- **The group lookup broke without a code change** (2026-10-14).
  `GET /v1/apps/{app}/betaGroups?filter[name]=` now answers 400
  `PARAMETER_ERROR.ILLEGAL`, so `ios-release.mjs testers` would have failed
  after the next upload. `GET /v1/betaGroups?filter[app]=…&filter[name]=…`
  returns Release QA; the script uses it.
- **Credits are counted per platform** (2026-10-15). `eas account:usage
  astrojams1` reported iOS 13 of 15 and Android 0 of 15 for October: the
  "15 shared credits" above were iOS's alone. Moot for this app, which now
  builds both platforms locally.
- **Android builds locally too** (2026-10-15). The owner stopped EAS builds;
  `apps/client/script/android-release.mjs` builds and signs the `.aab` with
  Gradle on the Mac, and `eas.json` and the EAS build workflow were removed.
  EAS kept the old upload key and `google-services.json` (a secret readable
  only inside EAS builds), so a new upload key was made (nothing had reached
  Play) and the Firebase file was downloaded from the Firebase console.
- **The vault service account is read-only** (2026-10-15). `op item create`
  answered "You do not have permission"; the owner adds new vault items.
- **A returned edit skipped the readback** (2026-10-15). `upload()` returned
  its `withEdit(…)`, so the track readback after it never ran: versions 15
  and 16 committed but logged nothing past "Uploading". It now awaits the
  edit, and a test pins that.
- **An API commit replaces console drafts** (2026-10-15). Listing text saved
  in Play Console as a draft vanished when the artwork upload's API edit
  committed; it was re-entered and saved with Save. The skill states the rule.

## 2026-09

**Builds.** 36 started between 15 and 24 September: 19 iOS, 17 Android.
Finished 29, cancelled 5, errored 2. iOS: `production` builds 5 to 21 for App
Review and TestFlight, plus `simulator` and `simulator-release` builds 1, 2,
3, 6 and 21. Android: `production` AABs 2 to 12 and `preview` APKs 4 to 12.
From the 26th `eas build` answered "You've reached your included build
credits"; a local Android build in a cloud session failed on Maven HTTP 429.

**Sandboxes, 26 September.** macOS `01a0dcc8` (08:15 to 09:00 UTC) compiled the
#152 widget, ran iOS 26.5 and 18.6 simulators and found the Appearance defect;
it stopped before screenshots were copied out. Linux `01a0dccc` (08:19 to 09:01)
was for an Android APK; Gradle hung and nothing came back. The next sandbox was
refused: "Free plan CI/CD 60 minute limit reached".

**Submissions.** Earlier TestFlight uploads went through a direct Apple
`altool` upload after an EAS submission stalled; see the release ledger.

## 2026-10

**Sandbox, 1 October.** macOS `01a0f4df` (00:31 to 00:53 UTC, about 22 minutes)
for PR #155: compiled the String Appearance fix, verified it on iOS 26.5, 18.6
and 16.4 simulators with an upgrade from build 21, and copied measurements
out as text. Evidence: `store/source/widget-settings/ios-simulator-2026-10-01.md`.

**Build 22** (`3270d610`, iOS `production`, commit 3a4a67a). Compiled by 01:32,
then stalled uploading its archive; cancelled at the 45-minute limit at 02:12.
Wasted: one credit. Its `--auto-submit` had also failed to set up.

**Build 24** (`3221b8a2`, iOS `production`, same commit). Finished in six
minutes. A first `eas build` call failed before creating a build but used
build number 23. Submitted to App Store Connect with the vault API key
(submission `320a4482`); for the owner's iPhone check of #155. Processed
by Apple, but not in the "Release QA" group, so not offered to testers; see
Lessons. Added to the group through the API at the owner's request (204);
`IN_BETA_TESTING` from about 03:30 UTC.

**Remaining this month** after 1 October: about 38 sandbox minutes. Android
builds are paused until the owner has a device.

**Build 25** (`ac89a682`, iOS `production`, commit bf78444). Errored at 06:01
UTC: `XCODE_BUILD_ERROR`, "init(title:description:default:requestValueDialog:
inputConnectionBehavior:optionsProvider:) is only available in iOS 26.0 or
newer". Wasted: one credit. The widget parameter went back to build 24's form.

**Build 26** (`6df1f5b0`, iOS `production`, commit 51826ed). Finished in about
seven minutes; submitted with the vault key (submission `949246a0`), processed
by Apple by 06:15 UTC and added to "Release QA" through the API (204). Carries
the native header buttons for the owner's iPhone check.

**Local Mac preparation, 1 October (PR #155 resubmission).** Reused production
build 26 (`6df1f5b0`, source `51826ed`); Apple freshly reports `VALID` and
`IN_BETA_TESTING`. No new cloud build, TestFlight upload or sandbox was started;
October's counts remain four builds and about 22 sandbox minutes. Installed
Xcode 26.6 over the older 16.2, and the owner completed its license/setup.
Dependencies, native prebuild and Pods are installed in the local release
worktree. The matching iOS 26.5 arm64 runtime (8.52 GB) is still downloading.
The full workspace build cannot find an eligible destination; a target build
reached the asset compiler, which requires the matching runtime and rejected
installed iOS 17.5/18.3 runtimes. This is an environment prerequisite, not proof
of an application compile defect. Native captures and App Review resubmission
remain pending. Alternate vendor-CDN addresses did not improve the transfer.

**Local-host lesson (2026-10-01).** Check the actual host rather than inheriting
cloud-container assumptions. A usable Mac avoids Expo credits/minutes, but an
Xcode update may require owner license/admin setup and a large matching runtime
download before asset catalogs compile. Do not spend a cloud build merely to
refresh screenshots, or call an old simulator capture current release evidence.

**Expo capture batch, 1 October (owner authorized).** macOS MEDIUM
`01a0f6f5-659d-7261-b085-5c7aa6723f1d` ran from 10:14:50 to
10:50:03 UTC (35m13s). Compiled release source `51826ed` with Xcode 26.6
and captured seven native iPhone 17 Pro Max/iPad Pro 13-inch app screens on
iOS 26.5. Actual simulator bundle: 1.0.0 (1). Full originals transferred
with byte counts and SHA256 checked; provenance is in
`store/source/ios-gallery-v26-provenance.json`. Widget rendering failed as
a skeleton: Siri AppIntent service rejected the unsigned extension with
empty entitlements. Ad-hoc incremental rebuild was started but its result
was not observed. MCP reached its 500/500 tool request limit during transfers.
The official Expo GraphQL stop mutation succeeded; STOPPED and finish time
were read back. No second sandbox was started. About 2.7 of 60 CI/CD minutes
remain, assuming the earlier 22-minute run. A current simulator-release cloud
build `78c0ccc8-d1ac-4e04-a789-b33d4bf0c570` was started through EAS CLI
for the local widget capture fallback; it uses one build credit and no sandbox
minutes. Current worktree application sources match `51826ed` byte-for-byte.
Local computer control reports the Mac locked; owner unlock requested.

**Capture lessons (2026-10-01).** Full originals through many small MCP output
chunks can exhaust the separate tool cap even before CI/CD minutes run out.
Budget transfer requests and keep an independent cleanup route. Preserve
normal simulator signing for AppIntent widgets; a successful unsigned app
launch does not verify the extension. The ad-hoc-signing hypothesis is still
unverified. Never publish skeleton widgets as actual gallery captures.

**Remote Simulator alternative, 1 October.** EAS CLI 24.8.0
`simulator:availability --non-interactive --json` reports `available: false`
for `astrojams1`; remote device sessions are not enabled for this account.
No remote session, paid upgrade or account switch was started.

**Simulator fallback result, 1 October.** Build `78c0ccc8` finished at
11:01:30 UTC, about 7m12s after creation. Full source commit `e9d16c0`;
application sources match production `51826ed`. At 11:02 UTC, CUA could access
Simulator again: the local lock blocker is cleared. Artifact download and
current widget capture now continue.

**Gallery and review completed, 1 October.** EAS simulator artifact `78c0ccc8`
was downloaded (26,971,268 bytes; SHA256
`a527cf6d78432328dc7f2e257648fb5deebcb96dd7d5ffc6f9eba8be2320c34a`)
and its original signature preserved. Actual bundle is 1.0.0 (1), with app files
matching production `51826ed`. Both real widgets and their independent appearance
settings worked on iPhone 16 Pro Max / iOS 18.3.1. Small Light and Medium Dark
full Home Screen captures are retained; only their measured container silhouettes
are placed on the neutral artwork at one common scale. App-name hiding was not
reverified in this batch. The owner's requested Notifications root page was
captured from this same artifact and replaces the threshold-selector screenshot.

**Signing hypothesis correction.** The original EAS extension also has empty
entitlements, yet worked on iOS 18.3.1. The sandbox iOS 26.5 AppIntent privilege
errors remain observations; signing alone is not an established root cause or
fix. Runtime/artifact combinations need actual verification. Preserve the failed
placeholder separately and never include it in the listing. When masking native
widget corners, mirror the measured left silhouette across the symmetric
container; independent right-edge brightness thresholds can cut off text because
light/dark gradients converge. Inspect the entire widget after composing it.

**Provider result.** All five iPhone and three iPad images are COMPLETE, ordered
and checksum-verified; timeline leads both families. Historical gallery images
are retired. Build 26's rejected review item was resolved and the submission
accepted. Apple independently reports WAITING_FOR_REVIEW for the version and
review submission at 11:37:37 UTC. Evidence:
`store/apple-gallery26-verification.json` and
`store/apple-review-resubmission-2026-10-01-build26.json`.
The existing physical recording remains labeled historical build 21. Simulator
captures do not claim physical build-26 certification or public availability.
October usage is five cloud builds, about 57.3/60 sandbox minutes and MCP
500/500 requests. No second capture sandbox or paid upgrade was started.

**Build 27, 12 October.** iOS production `6913b8c7-2074-42ee-a603-1ce7a7dca59a`
from `f9ffa29` (#199, #200, #202), image `macos-tahoe-26.5-xcode-26.6` (Xcode
26.6, 17F113) as pinned; finished in about six minutes. Submitted with the
temporary-profile key method (EAS submission `3881ec36`); Apple processed it
VALID with `usesNonExemptEncryption` false, it was added to Release QA, selected
for 1.0.0 and resubmitted: version and review submission WAITING_FOR_REVIEW.
Before building, the widget was compiled and checked on a local Xcode 27
simulator build at no cost. No sandbox minutes were used. The Expo MCP stayed
at 500/500, so build state was read with EAS CLI instead.

**Local iOS release, 14 October.** No EAS build, submission or sandbox. The
UIScene launch crash reproduced with Xcode 27 (27A266a) on the iOS 27.0
simulator; `plugins/with-scene-lifecycle.js` fixed it (launch checked on iOS
27.0 and 18.4), and `ios.image` and every iOS profile and submission left
`eas.json`. Build number 28 came from App Store Connect (highest 27). Local
build 28: archived and exported from 975aff8 plus this change (dirty tree),
Apple Distribution CWQ9AWJF8T with Xcode-managed store profiles for app and
widget, `.ipa` SHA-256
`9410b6c51e37bc4b1dfb61ca8ca028c37146578c0f60e56e8284258411b3bc5f`;
`altool --validate-app` succeeded. Not uploaded: the first upload waits for
the owner and should come from the merged commit. EAS credits used: none.

**Build 28 to TestFlight, 14 October** (owner's request; recorded 20 October
from #210, closed unmerged once its script change was superseded). Local
`ios-release.mjs release` from clean `8c8fafb` (#208 merged): Xcode 27
(27A266a), iphoneos27.0, Apple-managed signing; `.ipa` SHA-256
`94f55e44f906cbc930371c31a355a5380c55bf62068e6adee1f506635dc2a8fa`. altool
upload succeeded (Apple build `2d2662e5-7386-4903-9164-d823ce46fb70`) and
processed VALID. The testers step failed twice (see Lessons) and, rerun with
the fix, added it to Release QA: `IN_BETA_TESTING`. The earlier dirty-tree
build 28 archive was discarded, never uploaded. EAS credits and sandbox
minutes used: none. Build 27 stays the one selected for App Review.

**Local Android release, 15 October.** No EAS build, submission or sandbox:
the owner stopped EAS builds, and `account:usage` showed October at iOS 13/15,
Android 0/15. On the Mac, Homebrew `openjdk@17` (17.0.20.1), `bundletool`
1.18.3 and `android-commandlinetools`; SDK platform 36, build-tools 36.0.0 and
NDK 27.1.12297006 under `/Volumes/ssd/toolchains`, with Gradle's and Android's
user caches there too. A new upload key (PKCS12, alias `upload`, certificate
SHA-256 `EB:1E:5F:25:…:F4:33:E4`) was made because EAS's could only be
downloaded from EAS, and `google-services.json` came from the Firebase console;
both wait in a private folder for the owner to add to the vault (the service
account cannot write). Version code 13 from 099cd5e plus this change (dirty
tree): Gradle `bundleRelease` 12m04s on a cold cache, `.aab` SHA-256
`4022cc8c5a043ea6b3e700d3fb31f606255617878be9100a49ed94f634a3d25f`,
target SDK 36, release JavaScript, `google_app_id` and the upload signature
checked; universal APK SHA-256
`e8e1513a5cf7c265a0f9b5922889b8458eeb3adc0d9796a9e44ada3484f63839`, same
signer. The first verify used `bundletool dump resources --resource=`, which
answered nothing for a resource that is present; the script reads the full
table. Not uploaded: Play Console still has no app, and the first upload should
come from the merged commit. EAS credits used: none.

**Vault item, 15 October.** The owner added `op://API Tokens/Newsworthy Android`
(attachments `upload.jks` and `google-services.json`, field `keystore
password`). Each matched the generated files byte for byte (compared by
SHA-256, values not printed). `android-release.mjs verify --version-code 13`
with no environment overrides read all three from the vault, confirmed the
bundle's signer (`EB:1E:5F:25:…:F4:33:E4`) and removed its temporary copies.

**Play app created, 15 October.** With the owner's approval, Newsworthy was
created in Play Console (app ID 4974473553901574528, package
`com.astrojams.newsworthy`, Paid, English US) after device and contact-phone
verification. No bundle uploaded yet. Android developer verification lists the
package as not registered; check again after the first upload.

**Play internal testing, 15 October.** PR #212 merged as 9ad04fb (production
`/healthz` reported it). Version code 14 built from clean 9ad04fb with the
vault credentials in 5m55s on a warm Gradle cache: `.aab` SHA-256
`ec503e03e9170a8e674259cf2b1252c0911d3dbc446b72804abd217143554aa5`, signer
`EB:1E:5F:25:…:F4:33:E4`, target SDK 36; universal APK SHA-256
`b1e80c0bce0a0b4e425c38860200d21a2956d368df31971de4393ca2c331ec14`. Uploaded
by hand in Play Console (the owner dragged the file in: the console page cannot
fetch a local file, and the first bundle cannot go through the API), release
"14 (1.0.0)" saved and published to internal testing at 09:36 PDT: "Available
to internal testers", 26.5 MB for new installs. Two warnings: no testers yet
(track Inactive) and no deobfuscation file (R8 is off). After the upload,
Android developer verification shows the package Registered with 3 keys. Version
code 13 was never uploaded. EAS credits used: none.
Afterwards, at the owner's request, an internal tester list "Owner" (their own
Google account) was created and selected; the track became Active. Opt-in:
https://play.google.com/apps/internaltest/4700283919647153170.

**Play Developer API, 15 October.** Version code 14 went to internal testing
by hand in Play Console, since Play takes a new app's first bundle only there.
For later uploads `android-release.mjs` gained `next-version-code` and
`upload`, and `release --track` uploads after building. In the built-in
browser, with the owner's approval: the Google Play Android Developer API was
enabled on Google Cloud project `newsworthy-cad27`; service account
`play-release@newsworthy-cad27.iam.gserviceaccount.com` was created with no
project roles; Play Console invited it to Newsworthy only, with Release apps to
testing tracks and read-only View app information (Active at once). The owner
created its JSON key and attached it to `op://API Tokens/Newsworthy Android` as
`play-service-account.json`; it reads back as that service account (values
not printed). `next-version-code` read Play live in 3.5 s and returned 15. No
API upload yet. EAS credits used: none.

**Version code 15 through the Play API, 15 October.** At the owner's request
the Play uploads session stopped its own build of 15 (killed in Gradle, before
any bundle or upload) so 15 would carry PR #216. #216 merged as 254686f
(production `/healthz` reported it). `release --version-code 15 --track
internal` from clean 254686f with the vault credentials took 24m18s in all,
Gradle on a cache partly shared with the stopped build: `.aab` SHA-256
`e35cfca85325b78967eb67f4472b5c9515a81ace9ab9d851e2550ef375982a5a`, signer
`EB:1E:5F:25:…:F4:33:E4`, target SDK 36; universal APK SHA-256
`25c6cb8eeb79e2a5a5e648c4b1357d92a8e7a948a4688806541e80325dfb9e4e`. The first
upload through the API. Its log ends at "Uploading … to Play" without the
script's "committed to internal" line (the run's output was cut short when the
session ended), so it was checked afterwards: `next-version-code` returns 16,
and Play Console shows the internal track Active, latest release 1.0.0,
"Available to internal testers", 1 version code, released Oct 15 10:45 AM. The
release takes the API's default name, 1.0.0, not "15 (1.0.0)". EAS credits
used: none.

**Play listing artwork, 15 October.** No build. The September Play gallery
(mint palette, reading with Privacy/Support links, no timeline) was replaced
from versionCode 15's universal APK (`254686f`, SHA-256 `25c6cb8e…`) on a
new API 35 Pixel 7 emulator under `/Volumes/ssd/toolchains` (emulator and
`google_apis` arm64 image installed there with `sdkmanager`). Eleven
original captures and their hashes are in
`store/source/android-phone/provenance-v15.json`; five screenshots, the
feature graphic and the 512 px Stone icon were uploaded through the Play API
by `store/scripts/google-play-images.mjs`. With the owner's approval the
service account gained Manage store presence and, after two edits failed
`validate` with 403 and were deleted, Edit and delete draft apps; the third
edit committed. Receipt: `store/google-play-artwork-15-upload.json`. Another
local session installed and launched its own app on the shared emulator
during capture; none of its screens are in the captures. EAS credits used:
none.

**Version code 16, 15 October.** PR #222 blocks `SYSTEM_ALERT_WINDOW` and
external storage (Expo template permissions the app never uses) and makes the
release script refuse a bundle that still requests them. Built from clean
122463c with the vault credentials and uploaded through the Play API to
internal testing in 6m56s: `.aab` SHA-256
`c92582cb884964519744f867f4bce99aeab5a96a37b849a6d4bdc8cb63e6f212`, signer
`EB:1E:5F:25:…:F4:33:E4`, target SDK 36, no blocked permission in the merged
manifest; universal APK SHA-256
`b0c7476813562bd937fa715d106e6565f3bd7dacc3dbcbbfb9aacb88034615ae`. Like 15,
its log stopped at "Uploading" (the readback bug above); `next-version-code`
returning 17 confirms the commit. Listing text, found empty after the artwork
commit, was re-entered from `store/listing.json` (description SHA-256
matches) and saved; the review step's new AI asset declaration was answered
"Don't label assets" (captures and rendered artwork, no AI-generated images).
EAS credits used: none.

**Closed test submitted, 16 October.** No build: version 16 (already on
internal testing) was promoted to Closed testing - Alpha in Play Console as
"16 (1.0.0)", for 173 countries / regions (Play disables China, Cuba, Iran,
Sudan and Rest of World) and the tester group
newsworthy-testers@googlegroups.com. The owner created the payments profile;
the price was set from USD 1.00 for all 177 regions (Play's charm pricing: USD
0.99 in the US). Publishing overview then listed 14 changes; the owner sent them
for review (auto mode blocked the agent's click on the final confirmation) and
Play's quick checks passed and it read "Your changes are now in review." EAS credits
used: none.

**Status check, 19 October.** No build, no EAS credits. Apple still reads
version 1.0.0 and review submission WAITING_FOR_REVIEW (submitted 12 October)
with build 27 selected, read through the vault API key; the built-in browser
could not sign in to App Store Connect, so the key recipe is now in the
newsworthy-app-release skill. Google Play rejected the closed test on 19 October
under the News and Magazines policy (publisher/author ownership information).

**Version 17, 19 October.** Built locally from main 2796737 (clean tree,
openjdk 17.0.20.1, targetSdk 36, sha256 c1cf39e9…30b8d5) for the Play News
policy rejection: it adds Settings > Publisher, whose copy was found in the
Hermes bundle. The first build attempt stopped before starting because
JAVA_HOME was unset; the documented SSD toolchain fixed it. Uploaded to internal
testing and promoted to Closed testing - Alpha through the Play Developer API
with changes held from review (`changesNotSentForReview=true`, after Play
refused a plain validate and commit); 173 countries and the tester group were
kept. Not sent for review, no appeal filed. EAS credits used: none.

**Shared release skill, 19 October.** The release scripts moved to the shared
app-release skill (v2.0.0, the `vendor/skills` submodule), which Space Worms
runs too, configured by `app-release.config.json`: `ios-release.mjs`,
`android-release.mjs` (every Play commit still held: `android.holdForReview`),
`asc.mjs` (replacing `store/scripts/apple.mjs`), `play.mjs` (replacing
`google-play-images.mjs`) and `ledger.mjs`. `store/listing.json` and
`store/apple-age-rating.json` became `store/store.json`. Builds now go to
`/Volumes/ssd/builds/{xcode,android}/newsworthy/` (builds made before this, under
`apps/client/build/`, are not found by `upload` or `verify`: rebuild), and `ledger.mjs record`
also appends to the owner's agent activity ledger. Read-only checks through
the shared scripts: App Store Connect 1.0.0 WAITING_FOR_REVIEW in 4f28761f
with build 27 selected, builds up to 28, next build 29; Play version code 17
completed on internal and alpha, next 18; the Play listing text, icon, feature
graphic and five phone screenshots match the repository byte for byte. No
builds, uploads, sandboxes or EAS credits used.


## 2026-10-25 — shared app-release 2.5.2 propagation (UTC)

This consumer PR pins `vendor/skills` to merged [skills#98](https://github.com/astrojams1/skills/pull/98), commit `413fac5f62fcfac44bcaaadba7f81e07256bc383`, from a fresh SSD worktree based on `origin/main` `b47d22a`. It adopts the optional authenticated App Privacy CLI guidance and the intervening shared-tool fixes. Newsworthy's repository-owned release skill continues to read the source directly from `vendor/skills`; no shared discovery mirrors are introduced. App code, configuration, store data, pricing and provider state are unchanged.

Read-only `ledger.mjs status`, `check` and `validate` pass with the existing inferred-evidence warning for `google.disclosures`; no provider evidence is refreshed by this maintenance run. The exact shared source passes its release-tool tests. README, product messaging and the release boundary remain accurate. The preview stale command cannot start in this dependency-free worktree because `sharp` is absent; its inputs are unchanged and no fresh video/native verification is claimed. No builds, uploads or provider writes occurred. Next: review and merge this consumer PR before relying on version 2.5.2.

Bug-fix table: no Newsworthy application defect or application fix in this run.
