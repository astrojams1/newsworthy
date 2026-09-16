# Newsworthy store release

One place for the mobile listings, artwork, evidence, and remaining work.
Resume from [the release ledger](ledger.md) with the reusable
[app-release skill](https://github.com/astrojams1/skills/tree/main/skills/app-release).
Last checked **September 16, 2026**. Neither app is publicly released.
Apple build **6** and the corrected five-image gallery are **Waiting for Review**.
The iPhone lead compares real small and medium widgets on a neutral canvas,
without stock wallpaper or unrelated app icons. Updated iPhone/iPad reading
captures show the approved design and Privacy/Support footer.

Android version 7 exposed a widget refresh loop that flickers and interrupts
resizing. APK8 passed idle and scheduled-refresh checks without recurring
widget recreation. A theme switch exposed a separate denominator contrast issue;
APK9 is installed and passed native light/dark/light widget transitions. Current
reading and widget images are refreshed from APK9. The owner approved the smaller
widget; its actual 2×2 rendering and launcher span are now verified. The gallery
compares compact and expanded captures at one scale on a neutral canvas. The
earlier production AAB9 needs replacement. Google account verification
still blocks app creation. See the ledger for current gates and exact next actions.

![iPhone listing artwork](preview.png)

![Android listing artwork](preview-android.png)

## Contents

| File or folder | Purpose |
|---|---|
| [ledger.md](ledger.md) / [ledger.json](ledger.json) | Canonical resumable gates, evidence and event history |
| [listing.json](listing.json) | Canonical English copy, URLs, review notes, and US$1 paid-download target |
| [assets/](assets/) | Upload-ready PNGs and dimension/platform manifest |
| [source/](source/) | Original native captures and editable SVG layouts |
| [release.json](release.json) | Public app/build identifiers; no credentials |
| [user-actions.md](user-actions.md) | Verified account-owner steps with instructions |
| [disclosures.md](disclosures.md) | Evidence for privacy and content declarations |
| [scripts/](scripts/) | Reproduce, validate, and upload the Apple listing |

## Verified status

- **Apple listing:** name `Newsworthy: Calm News`, English description,
  promotional text, subtitle, keywords, URLs, News category, and **five
  screenshots** saved. Apple reports every image `COMPLETE`: three 6.9-inch
  iPhone images and two 13-inch iPad images.
- **Apple pricing:** US$1.00 saved with local equivalents. Paid Apps Agreement
  was **Pending User Info** at the last live check after owner acceptance.
  Apple Business now confirms the W-9 is **Active**; banking remains outstanding. The address-correction request
  has been sent and acknowledged by Apple,
  but the obsolete legal address still needs Apple approval/correction.
- **Apple binary:** replacement signed production build **6** validated and
  uploaded with Apple's `altool`. Apple reports `VALID`, and build 6 is selected
  for version 1.0.0. Delivery/build ID is in `release.json`. The prior build 5
  EAS queue cancellation is retained as historical evidence.
- **Apple age rating:** declaration saved and verified through the API. It
  accounts for recurring war/weapons and mature news, with no graphic imagery.
  Apple returned `SEVENTEEN_PLUS` in its legacy age-rating field and 18 in
  the France/Brazil fields; final localized ratings are store-calculated.
- **Google account:** registration paid; Play Console explicitly reported
  **identity verified successfully**. Real Android device verification remains;
  phone verification is disabled until that prerequisite is complete. **Create
  app is disabled**, so no Google app, price, listing, or release has been saved.
- **Android binary:** corrected preview APK8 installed and production AAB9
  downloaded/ZIP-validated. One persistent periodic job replaces the refresh
  loop. Native logs show zero widget recreations in 65 seconds versus 30 in
  34 seconds before the fix. APK9 additionally passed theme transitions and
  compact 2×2 rendering; its compact/expanded gallery is complete. Build hashes
  and scope are in `release.json` and `android-widget-regression.json`.
- **Apple review details:** contact information, phone, no-login requirement,
  and review notes saved and verified. Private contact details are not in Git.
- **Apple compliance:** the owner published App Privacy and completed the DSA
  declaration; the Business page reports DSA compliance **Active**.
- **Apple review:** replacement submission
  `4f28761f-3096-4f0d-aa37-df83332f818f` and version 1.0.0 both report
  **WAITING_FOR_REVIEW**, with build 6 selected. The old build-5 submission was
  withdrawn by the developer to make the approved revision; it was not rejected
  by an Apple reviewer. Automatic release after approval remains configured.
  Banking and Paid Apps Agreement activation remain separate public-sale gates.

## Reproduce the artwork

From the repository root after `npm ci`:

```sh
node store/scripts/render.mjs
node store/scripts/validate.mjs
```

The renderer extends the existing mint/charcoal vector identity. Original native
screens remain unchanged inside the layouts; resizing and framing are presentation
only. It never generates a score or news sentence. Keep screenshot claims aligned
with [product messaging](../docs/product-messaging.md).

Apple screenshots use EAS simulator build `e02851c0-0cae-4f95-b854-2d57e32cc0b2`
from commit `b5571c5`, on iPhone 16 Pro Max and iPad Pro 13-inch M4 / iOS 18.3.
The simulator bundle itself reports build 1 despite EAS remote metadata saying 6;
the separately validated production IPA is build 6. Per-device provenance JSONs
record that distinction and capture checksums.

The widget artboard uses unchanged surfaces from real small/medium Home Screen
widgets, framed with SVG viewports on plain off-white. It is an editorial
composition, not a claim that simulator wallpaper was changed. Medium preserves
its actual two-line truncation. Original full screenshots remain available.
All five replacement images were read back COMPLETE in the correct order; see
[Apple gallery verification](apple-gallery-verification.json). Native simulator
checks do not establish physical-device certification.

Android reading assets now use `12-reading-light-v9.png` and
`13-reading-dark-v9.png`, from preview APK9
`bfb5310e-c8e1-41af-bc01-6037b17701b6` on the API35 ARM64 emulator
(1080×2400). `provenance-v9.json` records hashes and native verification scope.
The renderer frames them as 1080×1920 Google Play images. Earlier captures,
including About and offline evidence, remain historical source files and are
excluded from the current gallery.

The widget renderer expects `source/android-phone/widget-frames.json` to identify
actual compact/expanded captures, viewport bounds, and the verified `versionCode`.
It then creates a versioned widget comparison as the first Android gallery image.
The expanded widget passed light→dark→light contrast checks without a worker run.
The compact dark capture shows the actual 2×2 state approved by the owner, with
launcher span/minimum independently read back as 2×2. Compact light, score 10,
large text and physical-device checks remain unverified. Automated design-contract
coverage and its limits are documented in [the design system](../design/README.md).

The pasted macOS crash report identified Android Emulator startup, not
Newsworthy. Local emulator library/resource paths were corrected, and the
emulator then booted and ran the earlier APK successfully.

## Update Apple through its API

Keep the private `.p8` key in 1Password or a local secret location. Set
`ASC_KEY_ID`, `ASC_ISSUER_ID`, and `ASC_PRIVATE_KEY_PATH` in the local environment.
Never paste the private key into this repository or commit environment files.

```sh
node store/scripts/apple.mjs status
node store/scripts/apple.mjs metadata
node store/scripts/apple.mjs screenshots
node store/scripts/apple.mjs build
node store/scripts/apple.mjs age-rating
node store/scripts/apple.mjs status
```

`metadata` saves the canonical copy and reads it back. `screenshots` creates
missing sets/assets and uploads through Apple's returned operations; it refuses
to overwrite a different remote image with the same name. Check `status` until
each asset is `COMPLETE`. `build` selects the processed Apple build recorded in
`release.json`. These commands do not sign agreements or submit App Review.
The optional `review-notes` command requires an owner-approved contact phone in
`ASC_REVIEW_PHONE` when creating the review section; Apple rejects creation
without it. Keep that value outside the repository.

## Account links

- [App Store Connect listing](https://appstoreconnect.apple.com/apps/6812519450/distribution)
- [Apple Business: contracts, banking, tax](https://appstoreconnect.apple.com/business)
- [Apple Developer account](https://developer.apple.com/account/)
- [Google Play Console](https://play.google.com/console/)
- [Expo builds](https://expo.dev/accounts/astrojams1/projects/newsworthy/builds)
- [Live app](https://newsworthy-indol.vercel.app/), [privacy](https://newsworthy-indol.vercel.app/privacy), [support](https://newsworthy-indol.vercel.app/support)

## What Expo covers

EAS builds the native packages, manages signing credentials and uploads binaries.
EAS Metadata can manage supported Apple listing text. Account verification,
contracts, banking/tax declarations, Google testing eligibility, and final store
review remain store-controlled. Apple's API can automate screenshots and other
listing work; that is why this repository includes its own small upload script.

References: [Expo submission](https://docs.expo.dev/deploy/submit-to-app-stores/),
[EAS Metadata](https://docs.expo.dev/eas/metadata/getting-started/),
[Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications),
[Apple screenshot API](https://developer.apple.com/documentation/appstoreconnectapi/app-screenshots),
[Google listing assets](https://support.google.com/googleplay/android-developer/answer/9866151).

Binary archives, local SDKs/emulators, credentials, personal addresses, tax
identifiers, phone numbers, and banking details stay out of this public repository.
Build links and sanitized status belong here; build/signing mechanics are in the
[mobile release guide](../docs/mobile-release.md).
