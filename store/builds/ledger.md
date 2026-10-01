# Build and sandbox ledger

Every EAS cloud build, EAS sandbox and TestFlight or Play submission, what it
was for, what it cost against the Expo free plan's monthly caps, and what came
of it. Use the [app release skill](../../.agents/skills/newsworthy-app-release/SKILL.md)
before spending either cap. Entries are append-only, oldest first: a later
entry that corrects an earlier one says so in its own words. Both caps reset on
the 1st at 00:00 UTC, so the month's rows in the table are what is left to
plan with.

Verification results belong to their gates in the [release ledger](../ledger.md);
record them there too. This file is about cost.

| Month | Builds started (credits) | Sandbox minutes (of 60) | Wasted | Notes |
|---|---|---|---|---|
| [2026-09](#2026-09) | 36 (19 iOS, 17 Android); refused from the 26th | about 87, cap reached on the 26th | 7 cancelled or errored builds; 3 duplicate Android builds; two sandboxes at once | Credits gone in ten days |
| [2026-10](#2026-10) | 4 so far (iOS 22, 24, 25, 26) | about 22 | Build 22 (stalled upload, 45-minute limit); build 25 (Swift needing iOS 26, skipped compile check) | TestFlight builds 24 and 26 of #155 |

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
