---
name: newsworthy-app-release
description: Build, verify and submit the Newsworthy iOS and Android apps with EAS (TestFlight, Play internal testing, simulator and sandbox checks) within the Expo account's monthly free-plan caps. Use before any eas build, eas submit, EAS sandbox or EAS workflow, and when planning native verification.
---

# Newsworthy app release

The release flow itself (profiles, signing, submission targets, store setup) is
in `docs/mobile-release.md`; gates and their evidence go in the release ledger
(`npm run ledger -- record …`). This skill adds one constraint to that flow: the
Expo account `astrojams1` is on the **free plan**, and two monthly caps decide
what can run at all.

## The caps

| Cap | What uses it | When it is gone |
|---|---|---|
| Build credits | Every cloud `eas build` that starts; assume one cancelled or errored part-way has used its credit too | `eas build` fails with "You've reached your included build credits"; nothing builds until the 1st |
| CI/CD minutes (60 a month) | EAS sandboxes (`sandbox_create`) and EAS workflows, per minute of runtime, each sandbox counted separately | `sandbox_create` fails with "Free plan CI/CD 60 minute limit reached" |

Both reset on the 1st of the month at 00:00 UTC. `LARGE` sandboxes need a paid
plan; use `MEDIUM`. Upgrading the plan is a purchase: never do it, and never
work around a cap by switching accounts. Say what is blocked and until when.

What September 2026 cost, for scale: 36 cloud builds between 15 and 24
September (19 iOS, 17 Android) used the build credits; builds were refused
from the 26th until the 1st. Seven of the 36 were cancelled or errored, and
three commits were built twice for Android (a `production` AAB and a `preview`
APK of the same code). A macOS and a Linux sandbox run side by side on 26
September used the 60 minutes within about 45 minutes. One focused macOS sandbox on 1
October did compile, simulator checks on iOS 26.5, 18.6 and 16.4, and an
upgrade test in 22 minutes.

## Before spending either cap

1. **Ask the owner.** Cloud builds, TestFlight uploads and sandboxes are
   billable against the caps; confirm each batch first and say how much of the
   month it uses and what it leaves.
2. **Check what is left.** Count this month's builds with `build_list` (Expo
   MCP) or `eas build:list --limit 50`, and this month's sandboxes with
   `sandbox_list`. A cap reached mid-task stops the work with nothing to show.
3. **Reuse before building.** If a finished build already exists for the commit
   and profile you need, use its artifact (`build_list` gives the URL; artifacts
   expire after 14 days for internal builds, 30 for store builds). A pre-change
   build is also the "before" side of an upgrade test.
4. **Prove the change compiles first, for free.** Run `npm test`,
   `npm run test:design`, `npm run check:android-widget` (Android widget
   resources and Java) and `npx expo prebuild --no-install` in the cloud
   container. Never spend a store build to discover a compile or signing
   error; two of September's errored builds were errors of that kind (a
   provisioning profile missing the push entitlement, a Gradle failure).

## Choosing the cheapest route

The EAS project has no linked GitHub repository, so the Expo MCP's `build_run`
and a sandbox's `gitRef` checkout both fail. Run `eas build` from this checkout
(token: `op read "op://API Tokens/Expo/credential"`) and `git clone` the public
repository inside a sandbox.


- **Swift, widget or iOS layout changes**: one macOS `MEDIUM` sandbox, not a
  cloud build. It compiles the app, runs the iOS simulator (AXe drives the Home
  Screen and Edit Widget), and can download older iOS runtimes
  (`xcodebuild -downloadPlatform iOS -buildVersion 16.4`). Build with
  `ARCHS=arm64 ONLY_ACTIVE_ARCH=YES`; after the first full build, rebuild only
  the widget target (`xcodebuild -project … -target NewsworthyWidget`, about 10
  seconds) and swap the `.appex` into the app.
- **Android**: no emulator is available anywhere here (the cloud container has
  no KVM; the EAS sandbox has no hypervisor), so Android visual checks need a
  device. Build one `preview` APK for the owner to install, and only after the
  change is final. Do not also build `production` for the same commit unless
  it is going to Play.
- **A real iPhone**: one `production` build with auto-submit to TestFlight, after
  simulator verification has passed. Builds have no EAS Update channel, so any
  change, JavaScript included, reaches testers only in a new build.
- **JavaScript-only changes**: check them on the web or in Expo Go first, which
  costs nothing; build only for what those cannot show (widgets, native
  modules, signing, the release bundle).
- **Local builds** (`eas build --local`) use no credits. Android works in a
  Linux environment with the Android SDK, but this container's Maven downloads
  are rate-limited (HTTP 429). iOS needs macOS, which means sandbox minutes.

## Submitting to TestFlight

The App Store Connect API key is the vault item `op://API Tokens/App Store
Connect`: `credential` is the `.p8` body without its PEM header and footer,
with `key id` and `issuer id` beside it. `--auto-submit` and a plain
`eas submit --non-interactive` both stop at "App Store Connect API Keys cannot
be set up in --non-interactive mode", the `EXPO_ASC_*` environment variables
did not help, and the Expo MCP's `build_submit` fails with "a conflict between
exclusive peers [appleAppSpecificPassword, ascApiKey, ascApiKeyId]". What works:
write the key to a temporary file (header and footer added, `umask 077`), add
`ascApiKeyPath`, `ascApiKeyId` and `ascApiKeyIssuerId` to
`submit.production.ios` in a copy of `apps/client/eas.json`, run
`eas submit -p ios --id <build> --profile production --non-interactive`, then
restore `eas.json` and delete the key. Never commit either. Build without
`--auto-submit` and submit once the build has finished.

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
- **Free disk early.** The macOS image ships an 11 GB CocoaPods cache
  (`~/Library/Caches/CocoaPods`); delete it after `pod install` if you need room
  for simulator runtimes.

## After

Record what was verified, on what (simulator or device, OS version, build), and
what remains, with `npm run ledger -- record --gate <id> …`. Note any build or
sandbox that was wasted and why, so the next run avoids it.
