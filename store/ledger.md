# Newsworthy release ledger

Updated: 2026-09-16T10:18:37+00:00

Repository: https://github.com/astrojams1/newsworthy

Objective: Release iOS and Android publicly as a one-time US$1 paid download with local equivalents, preserving the web app.

Generated from the adjacent JSON ledger. Update through ledger.py, not this view.

| Gate | State | Owner | Evidence basis | Result | Next action |
|---|---|---|---|---|---|
| scope | done | agent | observed | Owner requests autonomous paid iOS/Android submission, public web preservation, all release work saved in repo. | — |
| web.deploy | done | agent | observed | Approved reading-screen design merged and deployed to production. | — |
| apple.membership | done | agent | observed | Renewed individual developer membership is recognized by App Store Connect. | — |
| apple.address | waiting_provider | provider | observed | Apple Business still shows the obsolete legal address; authorized correction request remains acknowledged but not completed. | Await Apple correction response, then verify legal entity and paid-contract records against the authorized current address. |
| apple.agreement | waiting_user | user | observed | W-9 now Active; Paid Apps Agreement still Pending User Info and Business requests a bank account. | Owner adds payout bank account in Apple Business and completes verification; agent reads agreement status afterward. |
| apple.tax | done | user | observed | Apple Business lists U.S. Form W-9 submitted September 16 with status Active. | — |
| apple.bank | waiting_user | user | observed | Rechecked Apple Business after replacement submission: Add Bank Account still required; no bank is listed. W-9 and DSA remain Active. | Owner enters payout bank in App Store Connect Business > Add Bank Account. Private bank details are not available to the agent. |
| apple.dsa | done | user | observed | Digital Services Act compliance Active; Apple says current regulatory requirements completed. | — |
| apple.privacy | done | user | observed | Owner published diagnostics/performance collection for app functionality, linked to user, no tracking. | — |
| apple.review-contact | done | agent | observed | Updated Apple review notes for the Privacy and Support footer and explicit no-login behavior; existing contact fields preserved. | — |
| apple.listing | done | agent | observed | All five replacement Apple screenshots are COMPLETE: clean neutral small/medium widget composition first, revised iPhone light/dark and iPad light/dark reading screens. Old gallery removed. | — |
| apple.build | done | agent | observed | Replacement production iOS build 6 and matching simulator build finished from clean merged commit b5571c5. | — |
| apple.native | done | agent | observed | Replacement native UI checked on iPhone 16 Pro Max and iPad Pro 13-inch iOS 18.3: light/dark, no About, footer links, iPad share popover, iPhone small/medium widgets and small tap-to-open. | — |
| apple.upload | done | agent | observed | Replacement Apple build 6 uploaded, processed VALID, and selected for version 1.0.0. | — |
| apple.availability | done | agent | observed | Created availability for all 175 Apple territories; all enabled, no preorder, new territories enabled. Automatic release after approval retained. | — |
| apple.review | waiting_provider | provider | observed | Replacement build 6 submitted successfully with corrected widget-first gallery; both review submission and version are WAITING_FOR_REVIEW. | Wait for Apple review result; resolve banking/paid agreement and legal-address correction before paid public availability. |
| apple.release | waiting_provider | provider | observed | Replacement build 6 is waiting for Apple review; public release not yet achieved. Paid agreement/banking and address correction remain separate gates. | Verify Apple approval, paid-sale readiness and public availability; do not equate review submission with release. |
| google.identity | done | user | observed | Registration fee paid and Play Console reports identity successfully verified. | — |
| google.device | waiting_user | user | observed | Google still requires access to a real Android mobile device; page explicitly says only the account owner can do this. | Owner opens Play Console on real Android device, signs into developer-owner account, selects AstroJams and completes device verification. |
| google.phone | waiting_user | user | observed | Phone-verification link disabled while earlier verification task remains. | Complete owner real-device verification, then use Account details contact phone Verify and enter SMS/voice code directly in Google. |
| google.app | waiting_user | user | observed | Live Play Console still disables Create app until real-device and contact-phone verification finish. | Owner verifies a real Android device in the Play Console mobile app, then completes contact-phone verification; agent can then create the paid app. |
| google.build | in_progress | agent | observed | Preview APK9 contains the verified denominator theme fix. Existing production AAB9 predates that fix and must not be submitted as final. | Create and verify the final production AAB after PR92 integration; retain build provenance. |
| google.native | in_progress | agent | observed | APK9 native light/dark app and expanded widget theme transitions verified; owner-approved dark compact widget captured at actual 2x2 | Verify compact light, score 10, enlarged text, replacement offline recovery and physical-device behavior. CI design contracts do not prove native layout. |
| google.listing | in_progress | agent | observed | Removed About from Android artwork and contact sheet; renderer now reserves first place for a real Android widget capture. | Capture Android widget and revised reading screen on version 7, regenerate and inspect the final gallery. |
| google.disclosures | todo | agent | inferred | Google app-content/privacy/rating questionnaires not yet available without app record. | After app creation, answer current questionnaires using code and actual service logging evidence. |
| google.closed-test | waiting_user | user | observed | New personal account testing path needs genuine testers and elapsed testing time. | Owner recruits at least 12 eligible real testers; agent configures closed track and opt-in flow once account setup permits. Verify 14 continuous days before access application. |
| google.production-access | todo | agent | inferred | No production-access application submitted. | Complete required closed test, collect actual feedback and apply; approval is separate from elapsed time. |
| google.review | todo | agent | observed | No Google release submitted for review. | Complete account, app, privacy/listing and testing gates; submit permitted release and record provider state. |
| google.release | todo | agent | observed | No public Android store release. | Release only after review/access approval and verify the public paid listing. |
| apple.content-rights | done | agent | observed | Saved DOES_NOT_USE_THIRD_PARTY_CONTENT: app presents its generated rating/sentence and original vector artwork, not third-party article/media feeds. | — |
| host.ui | done | agent | observed | Native UI access restored after the Mac was unlocked. | — |
| google.artwork | done | agent | observed | APK9 real compact and expanded widget gallery complete on neutral canvas at common scale; no wallpaper or unrelated apps | — |
| design.reading-screen | in_progress | agent | observed | Removed About route; refined score hierarchy, baseline alignment, sentence spacing, and compact Privacy / Support footer after owner feedback. | Verify the revised screen in replacement native builds, capture native listing images, and feature widgets in the gallery. |
| native.ui-access | done | agent | observed | Mac is now unlocked; native Android Emulator and iOS Simulator accessibility/screenshot controls are available. | — |
| design.widget-gallery | done | agent | observed | Both platform galleries feature actual widget size choices on neutral backgrounds | — |
| native.ios-widget-sizes | done | agent | observed | Replacement small and medium iOS widgets verified on iPhone 16 Pro Max iOS 18.3; clean neutral artwork rendered from actual widget viewports. | — |
| native.ios-replacement-ui | done | agent | observed | Replacement iPhone/iPad light and dark screens captured, About absent, iPhone Privacy/Support links load correct pages, iPad share popover opens. | — |
| apple.gallery-order | done | agent | observed | Apple gallery now leads with neutral small/medium actual-widget composition; all five replacement iPhone/iPad images COMPLETE and old gallery images removed. | — |
| apple.widget-gallery-revision | done | agent | observed | Replaced clashing wallpaper and unrelated icons with actual small/medium widget viewports on a plain neutral artboard; remote gallery read back COMPLETE. | — |
| google.widget-fix | done | agent | observed | APK9 compact 2x2 verified after owner resized and approved; existing expanded theme and APK8 periodic-refresh evidence retained | — |
| design.regression | done | agent | observed | CI passed the named cross-surface design gate and all 189 repository tests on f613a87; known regressions fail the gate | For future UI changes, extend regression cases and perform the separate native capture matrix; these tests do not execute native layout engines. |

## Evidence and history

### 1. scope — done

2026-09-16T03:31:16+00:00 · observed · agent

Owner requests autonomous paid iOS/Android submission, public web preservation, all release work saved in repo.

- Owner instructions in release task; product rules in AGENTS.md and docs/product-messaging.md

### 2. web.deploy — done

2026-09-16T03:31:16+00:00 · observed · agent

Production commit f1ee64d deployed successfully; live release URLs checked.

- https://github.com/astrojams1/newsworthy/pull/85
- Vercel commit status success; npm run mobile:check -- --live passed

### 3. apple.membership — done

2026-09-16T03:31:16+00:00 · observed · agent

Renewed individual developer membership is recognized by App Store Connect.

- Live developer account and App Store Connect accepted signing/upload

### 4. apple.address — waiting_provider

2026-09-16T03:31:16+00:00 · observed · provider

Authorized membership and App Store Connect legal-address correction request submitted; Apple confirmed receipt. Business still showed obsolete address.

- Apple Developer Support page: Thanks for contacting us; request will be reviewed. No case number displayed.

Next: Read Apple response and Business legal-entity address; provide owner documents only if requested. Do not duplicate request or claim address changed.

### 5. apple.agreement — in_progress

2026-09-16T03:31:16+00:00 · observed · agent

Owner accepted Paid Apps Agreement; latest live status Pending User Info.

- Apple Business agreements table after acceptance

Next: Read status after W-9 processing and banking; require Active before paid release.

### 6. apple.tax — in_progress

2026-09-16T03:31:16+00:00 · user_reported · agent

Owner reports adding the W-9; final status not yet read back.

- Owner message: I added the W9.

Next: Read existing U.S. Form W-9 status before asking for further owner action. Add Tax Info edits the existing form; Add Tax Form is for other countries.

### 7. apple.bank — waiting_user

2026-09-16T03:31:16+00:00 · observed · user

Latest live Business page still requested Add Bank Account.

- Apple Business banking banner

Next: Owner enters payout details directly in Apple and completes any verification; agent then reads back status.

### 8. apple.dsa — done

2026-09-16T03:31:16+00:00 · observed · user

Digital Services Act compliance Active; Apple says current regulatory requirements completed.

- Live Apple Business compliance table. Selected trader classification not inspected.

### 9. apple.privacy — done

2026-09-16T03:31:16+00:00 · observed · user

Owner published diagnostics/performance collection for app functionality, linked to user, no tracking.

- App Privacy explicitly displayed Published by James Thompson
- store/disclosures.md

### 10. apple.review-contact — done

2026-09-16T03:31:16+00:00 · observed · agent

Review contact including phone, no-login requirement and notes saved and all supplied fields read back.

- App Store Connect API success; store/scripts/apple.mjs review-notes. Private contact fields excluded.

### 11. apple.listing — done

2026-09-16T03:31:16+00:00 · observed · agent

English copy, category, US$1 pricing and five native iPhone/iPad screenshots saved; screenshots COMPLETE.

- store/listing.json
- store/assets/manifest.json
- https://appstoreconnect.apple.com/apps/6812519450/distribution

### 12. apple.build — done

2026-09-16T03:31:16+00:00 · observed · agent

Signed production IPA build 5 completed and validated; simulator capture build recorded separately.

- EAS production 34e8a094-c122-4770-9bf6-611f70f671ab
- EAS simulator 1a4edab8-6c4c-4133-ab32-62c45fd0a7f9
- Archive and signing checks; Apple altool validation succeeded

### 13. apple.native — in_progress

2026-09-16T03:31:16+00:00 · observed · agent

Actual iPhone/iPad simulator reading, light/dark UI, sharing and iPhone medium widget checked. Physical-device release checklist remains.

- store/source/iphone-6.9/
- store/source/ipad-13/
- docs/mobile-release.md

Next: Finish applicable physical-device, offline/recovery, accessibility and widget checks; do not treat web or Expo Go as signed-device proof.

### 14. apple.upload — done

2026-09-16T03:31:16+00:00 · observed · agent

Direct altool upload processed VALID and APP_STORE_ELIGIBLE; Apple build 5 selected for version 1.0.0.

- Apple build 805f70f3-09a4-4111-afd2-bf04bb99e30d
- Queued EAS submission 4a6398aa-658c-49c0-a909-c09209dd5021 canceled before direct upload

### 15. apple.availability — todo

2026-09-16T03:31:16+00:00 · inferred · agent

Final territory/release settings still require inspection.

- Prior submission checklist

Next: Inspect desired territories and release behavior against current DSA and owner scope; configure and read back.

### 16. apple.review — todo

2026-09-16T03:31:16+00:00 · observed · agent

Version remains Prepare for Submission; no App Review submitted.

- Last App Store Connect version readback

Next: Finish commercial/account, availability and release checks, then submit under original owner authorization.

### 17. apple.release — todo

2026-09-16T03:31:16+00:00 · observed · agent

App is not publicly released.

- No App Review submission yet

Next: Track review only within active user-requested work; resolve feedback and release according to approved behavior. Do not schedule monitoring unless requested.

### 18. google.identity — done

2026-09-16T03:31:16+00:00 · observed · user

Registration fee paid and Play Console reports identity successfully verified.

- Live Play Console identity-success notice

### 19. google.device — waiting_user

2026-09-16T03:31:16+00:00 · observed · user

Play Console requires a real Android device; only the account owner can complete it.

- Live device-verification details; emulator/API cannot replace owner device check

Next: On a real Android phone, sign into Play Console as the owner and complete device verification.

### 20. google.phone — waiting_user

2026-09-16T03:31:16+00:00 · observed · user

Phone-verification link disabled while earlier verification task remains.

- Live account phone-verification page

Next: Complete owner real-device verification, then use Account details contact phone Verify and enter SMS/voice code directly in Google.

### 21. google.app — waiting_user

2026-09-16T03:31:16+00:00 · observed · user

Create app disabled; no Google app record, saved price, listing or release exists.

- Live Play Console account restrictions

Next: Owner completes verification; agent then creates the app as paid, sets US$1 local equivalents and configures release.

### 22. google.build — done

2026-09-16T03:31:16+00:00 · observed · agent

Corrected production AAB and preview APK version 6 finished, downloaded and passed archive checks; preview APK installed.

- EAS AAB 615799c2-7fb9-4342-b2f4-9a073d308884
- EAS APK f3dddec5-23f3-4a41-8fd6-e0d4f79ee366
- adb streamed install Success. Version 4 and canceled intermediate version 5 are superseded.

### 23. google.native — in_progress

2026-09-16T03:31:16+00:00 · observed · agent

Earlier APK exposed missing gradient/share icon from non-base64 SVG URLs. Fixed source and replacement build exist; final visual check pending.

- PR #85 Android base64 fix
- Old native log: ExpoImage IllegalArgumentException bad base-64

Next: Open installed corrected APK in native emulator, verify gradient/share, light/dark/offline/navigation and applicable widget behavior. Mac is unlocked again.

### 24. google.listing — in_progress

2026-09-16T03:31:16+00:00 · observed · agent

Shared English copy, icon and feature graphic ready. Android-specific screenshots still pending.

- store/assets/google-play/
- store/scripts/render.mjs

Next: Capture native Android light/dark/About images from version 6; render, visually inspect and validate Google images. Never substitute iOS captures.

### 25. google.disclosures — todo

2026-09-16T03:31:16+00:00 · inferred · agent

Google app-content/privacy/rating questionnaires not yet available without app record.

- store/disclosures.md contains implementation/hosting evidence

Next: After app creation, answer current questionnaires using code and actual service logging evidence.

### 26. google.closed-test — waiting_user

2026-09-16T03:31:16+00:00 · observed · user

New personal account testing path needs genuine testers and elapsed testing time.

- Google requirements checked September 16, 2026; store/user-actions.md

Next: Owner recruits at least 12 eligible real testers; agent configures closed track and opt-in flow once account setup permits. Verify 14 continuous days before access application.

### 27. google.production-access — todo

2026-09-16T03:31:16+00:00 · inferred · agent

No production-access application submitted.

- Account/app/testing gates unfinished

Next: Complete required closed test, collect actual feedback and apply; approval is separate from elapsed time.

### 28. google.review — todo

2026-09-16T03:31:16+00:00 · observed · agent

No Google release submitted for review.

- No app record exists at last live check

Next: Complete account, app, privacy/listing and testing gates; submit permitted release and record provider state.

### 29. google.release — todo

2026-09-16T03:31:16+00:00 · observed · agent

No public Android store release.

- No Google app record or production access yet

Next: Release only after review/access approval and verify the public paid listing.

### 30. apple.availability — done

2026-09-16T04:55:59+00:00 · observed · agent

Created availability for all 175 Apple territories; all enabled, no preorder, new territories enabled. Automatic release after approval retained.

- App Store Connect GET /v2/appAvailabilities/6812519450/territoryAvailabilities returned 175 enabled records; version releaseType AFTER_APPROVAL. CANNOT_SELL remains on all records; configuration does not prove sale eligibility.

### 31. apple.content-rights — done

2026-09-16T04:55:59+00:00 · observed · agent

Saved DOES_NOT_USE_THIRD_PARTY_CONTENT: app presents its generated rating/sentence and original vector artwork, not third-party article/media feeds.

- Source review of shared native UI and generated reading contract; GET /v1/apps/6812519450 readback confirmed declaration. Initial immediate readback lagged; later GET matched without repeating mutation.

### 32. apple.review — done

2026-09-16T04:55:59+00:00 · observed · agent

Version 1.0.0 build 5 submitted; both version and review submission report WAITING_FOR_REVIEW.

- App Store Connect review submission 54c8b17c-868f-47fe-bb27-c2af1e0b6d48, submittedDate 2026-09-16T04:53:38.974Z; independent GET of version and submission confirmed WAITING_FOR_REVIEW.

### 33. apple.release — waiting_provider

2026-09-16T04:55:59+00:00 · observed · provider

Apple review is pending; AFTER_APPROVAL release configured. No public availability verified. Commercial account requirements remain separately unverified.

- Submission 54c8b17c-868f-47fe-bb27-c2af1e0b6d48 WAITING_FOR_REVIEW; availability contentStatuses CANNOT_SELL and AVAILABLE_FOR_SALE_UNRELEASED_APP.

Next: Read review outcome and resolve feedback; check tax/banking/agreement and address response; verify paid public listing after approval. Do not resubmit the existing review.

### 34. apple.address — waiting_provider

2026-09-16T04:55:59+00:00 · observed · provider

Apple support email confirms receipt of the authorized address-correction request; no correction approval observed.

- Apple Developer Program Support acknowledgment received 2026-09-16 03:15 UTC. Case reference remains in private email, not this public ledger.

Next: Read support response and Business legal-entity address; do not duplicate request or reuse obsolete address.

### 35. host.ui — waiting_user

2026-09-16T04:55:59+00:00 · observed · user

Native UI tool reports Mac locked; automatic unlock failed. In-app browser works for Google but is signed out of Apple.

- CUA getState returned locked-host error; Apple Business redirected to login authResult=FAILED.

Next: Owner unlocks Mac; then agent resumes signed-in Apple Business readback and native Android verification/capture. API work does not require unlock.

### 36. google.device — waiting_user

2026-09-16T04:55:59+00:00 · observed · user

Google still requires access to a real Android mobile device; page explicitly says only the account owner can do this.

- Live Play Console device-verification page on September 16: owner signs into current Play Console mobile app with developer-owner account and chooses AstroJams.

Next: Owner opens Play Console on real Android device, signs into developer-owner account, selects AstroJams and completes device verification.

### 37. google.app — waiting_user

2026-09-16T04:55:59+00:00 · observed · user

Create app remains disabled; live account home lists Android-device and contact-phone verification as required.

- Live Play Console app-list on September 16 says Complete account verifications to create new apps.

Next: After owner device and phone verification, create paid app, configure US$1 and local equivalents, upload version 6 and prepare required closed test.

### 38. apple.tax — done

2026-09-16T05:26:39+00:00 · observed · user

Apple Business lists U.S. Form W-9 submitted September 16 with status Active.

- Live signed-in Chrome Business Tax Forms table on September 16: U.S. Form W-9, Sep 16 2026, Active.

### 39. host.ui — done

2026-09-16T05:26:39+00:00 · observed · user

Mac unlocked; native Android emulator and signed-in Chrome are accessible.

- CUA app inventory and native screenshot succeeded; Apple Business table read in Chrome.

### 40. apple.agreement — waiting_user

2026-09-16T05:39:49+00:00 · observed · user

W-9 now Active; Paid Apps Agreement still Pending User Info and Business requests a bank account.

- Live signed-in Apple Business page September 16: W-9 Active, no bank account, Paid Apps Agreement Pending User Info.

Next: Owner adds payout bank account in Apple Business and completes verification; agent reads agreement status afterward.

### 41. apple.bank — waiting_user

2026-09-16T05:39:49+00:00 · observed · user

Apple Business still requests Add Bank Account; owner entry requested with direct instructions.

- Live Bank Accounts section contains Add Bank Account and no listed payout account.

Next: Owner enters payout details privately in Apple Business; agent verifies saved bank and Active paid agreement.

### 42. google.native — in_progress

2026-09-16T05:39:50+00:00 · observed · agent

Version 6 launch, light/dark gradients and share icon, native share sheet, About navigation, cached offline reading, and online recovery verified on API 35 ARM64 emulator.

- Installed package reports versionCode 6/versionName 1.0.0. Native UI shows gradient/icon, share payload with original timestamp, offline Saved reading/Try again, and recovery with saved warning removed. Source screenshots stored under store/source/android-phone/.

Next: Verify Android widget installation/rendering/resize and large text, then physical-device behavior during real closed testing. Launcher widget picker was not reachable through available CUA controls; no widget success claim.

### 43. google.artwork — done

2026-09-16T05:39:50+00:00 · observed · agent

Three Android store screenshots rendered from version 6 native captures: light reading, dark reading, About.

- 1080x2400 originals captured via emulator screenshot shortcut through CUA; rendered 1080x1920 RGB PNGs. Gallery visually reviewed and store/scripts/validate.mjs passed; store/preview-android.png.

### 44. google.listing — in_progress

2026-09-16T05:39:50+00:00 · observed · agent

Copy, icon, feature graphic and three real Android screenshots ready in repo; upload still blocked by disabled app creation.

- store/assets/google-play/phone/, store/assets/manifest.json and store/preview-android.png; Play Console account verification remains incomplete.

Next: After owner device/phone verification enables Create app, save paid listing and upload all prepared assets.

### 45. host.ui — waiting_user

2026-09-16T05:43:11+00:00 · observed · user

Mac relocked after Android captures and offline/recovery verification; native UI could not open Settings for large-text check.

- CUA native click returned Mac locked and automatic unlock failed after successful app captures.

Next: Owner unlocks Mac; agent continues Android large-text and widget UI checks, with completed captures preserved.

### 46. design.reading-screen — in_progress

2026-09-16T06:11:23+00:00 · observed · agent

Removed About route; refined score hierarchy, baseline alignment, sentence spacing, and compact Privacy / Support footer after owner feedback.

- Phone-size web-rendered light/dark previews inspected; npm test: 175 passed; npm run check:app passed. Native replacement build and screenshots remain pending.

Next: Verify the revised screen in replacement native builds, capture native listing images, and feature widgets in the gallery.

### 47. apple.review — in_progress

2026-09-16T06:14:03+00:00 · observed · agent

Developer withdrew build 5 to replace About with the approved reading-screen design. This is a developer withdrawal, not an Apple reviewer rejection.

- 2026-09-16 App Store Connect readback: version DEVELOPER_REJECTED; review submission 54c8b17c-868f-47fe-bb27-c2af1e0b6d48 COMPLETE.

Next: Build and verify replacement native packages, update screenshots/review notes, select the new iOS build and resubmit.

### 48. apple.listing — in_progress

2026-09-16T06:39:09+00:00 · observed · agent

Apple iPhone gallery now leads with the actual Home Screen widget; remote order verified. Replacement reading-screen captures still required.

- App Store Connect screenshot-set 7e5eeec0-cde4-48b9-9cd4-d8cf96e42162 readback order: widget, reading, dark. Original screenshot delivery remains COMPLETE.

Next: Capture updated native reading screens, replace the outdated reading images, and retain the verified widget-first ordering.

### 49. apple.build — waiting_provider

2026-09-16T06:40:14+00:00 · observed · provider

Replacement iOS production build 6 and matching simulator build queued from clean merged commit b5571c5.

- EAS production 461def41-d59d-4c9e-9f91-d8f2c9bdc95c IN_PROGRESS; simulator e02851c0-0cae-4f95-b854-2d57e32cc0b2 NEW. Both source b5571c5983a128e007bb0e166e39697c188242d9.

Next: Poll these build IDs; download completed IPA and simulator archive, verify native UI, upload the replacement IPA.

### 50. google.build — waiting_provider

2026-09-16T06:40:14+00:00 · observed · provider

Replacement Android production AAB and preview APK version 7 are building from clean merged commit b5571c5.

- EAS production 96385f7c-2d30-4771-bfc7-6b91cc291c1d and preview 6a3cb29a-51c2-46e0-94db-0bd425fa83a7 IN_PROGRESS.

Next: Poll these build IDs, download and inspect completed packages, install the APK for native checks.

### 51. google.listing — in_progress

2026-09-16T06:40:14+00:00 · observed · agent

Removed About from Android artwork and contact sheet; renderer now reserves first place for a real Android widget capture.

- store/scripts/render.mjs and store/preview-android.png; two old-build reading images remain. No synthetic widget or cross-platform substitution. Image dimensions and listing length validation passed.

Next: Capture Android widget and revised reading screen on version 7, regenerate and inspect the final gallery.

### 52. native.ui-access — waiting_user

2026-09-16T06:40:14+00:00 · observed · user

Mac locked again; native app-control tool could not unlock it.

- CUA getApp(com.astrojams.newsworthy.emulator) returned locked Mac. Owner unlock requested while cloud work continues.

Next: Owner unlocks Mac; resume native UI checks and captures.

### 53. web.deploy — done

2026-09-16T06:40:14+00:00 · observed · agent

Approved reading-screen design merged and deployed to production.

- PR89; Vercel success for b5571c5983a128e007bb0e166e39697c188242d9; live browser shows score, share, Privacy and Support with no About route; 175 tests and CI passed.

### 54. google.app — waiting_user

2026-09-16T06:42:40+00:00 · observed · user

Live Play Console still disables Create app until real-device and contact-phone verification finish.

- 2026-09-16 live Home page for developer 8388544157780149515: real Android device Action required, contact phone Action required, Create app disabled.

Next: Owner verifies a real Android device in the Play Console mobile app, then completes contact-phone verification; agent can then create the paid app.

### 55. apple.review-contact — done

2026-09-16T06:42:40+00:00 · observed · agent

Updated Apple review notes for the Privacy and Support footer and explicit no-login behavior; existing contact fields preserved.

- App Store Connect review-notes PATCH and readback passed for version 267c6f52-d22d-4cb0-bb4c-d22f280b4499; demoAccountRequired=false. Private contact information stays outside Git.

### 56. design.widget-gallery — in_progress

2026-09-16T06:46:32+00:00 · observed · agent

Owner rejected unrelated icons in widget imagery and requested the available size options. Capture brief now requires clean Home Screens with iOS small/medium and Android compact/expanded layouts.

- Owner correction; iOS supportedFamilies=[systemSmall,systemMedium]; Android horizontal/vertical resizing with height-dependent explanation. store/design/widget-gallery-brief.md.

Next: After Mac unlock, verify both native layouts per platform and capture clean Home Screen images; replace the old cluttered iPhone widget image before resubmission.

### 57. apple.listing — in_progress

2026-09-16T06:46:32+00:00 · observed · agent

Widget-first order is saved remotely, but owner rejected the existing cluttered Home Screen image. It is superseded for final listing use.

- Remote widget-first order verified; owner requested no unrelated icons and multiple widget size options. Capture brief in store/design/widget-gallery-brief.md.

Next: Replace old widget image with verified clean small/medium native captures, refresh reading images, then validate the final gallery before resubmitting.

### 58. design.widget-gallery — in_progress

2026-09-16T06:48:13+00:00 · observed · agent

Owner requests clean widget imagery: no unrelated icons, show supported size options, and use plain neutral wallpaper that does not compete with widget colors.

- Owner correction includes stock-wallpaper color clash. Capture brief updated; renderer now omits the old cluttered widget asset from local gallery previews until clean native captures exist.

Next: After unlock, set neutral wallpaper on capture devices and verify/capture iOS small and medium plus Android compact and expanded layouts; replace remote old widget screenshot before resubmitting.

### 59. apple.upload — in_progress

2026-09-16T06:48:34+00:00 · observed · agent

Replacement iOS build 6 downloaded and passed official Apple archive validation; direct altool upload started.

- EAS 461def41-d59d-4c9e-9f91-d8f2c9bdc95c FINISHED; archive bundle com.astrojams.newsworthy version 1.0.0 build 6; SHA256 032ebc9efaeb1546cd8c96cc83194a45842a57d500f7db802deaac743407ecf5; altool VERIFY SUCCEEDED. App Store Connect had no build 6 before this upload.

Next: Observe current altool upload, then poll Apple processing for build 6. Native verification and final clean widget gallery remain required before review submission.

### 60. apple.build — done

2026-09-16T06:52:37+00:00 · observed · agent

Replacement production iOS build 6 and matching simulator build finished from clean merged commit b5571c5.

- EAS 461def41-d59d-4c9e-9f91-d8f2c9bdc95c and e02851c0-0cae-4f95-b854-2d57e32cc0b2 FINISHED. IPA archive validation passed; simulator download in progress. Native/UI verification remains a separate gate.

### 61. apple.upload — waiting_provider

2026-09-16T06:54:20+00:00 · observed · provider

Apple acknowledged replacement iOS build 6 upload; processing is pending.

- altool UPLOAD SUCCEEDED; delivery b62a9dc5-1b0c-4200-8830-68db021bb0cd; 19,258,964 bytes. First App Store Connect build-6 query returned no processed build yet.

Next: Poll build 6 processing before selecting it. Do not upload again while this accepted delivery is processing.

### 62. google.build — done

2026-09-16T06:54:20+00:00 · observed · agent

Replacement Android production AAB and preview APK version 7 both finished from clean merged commit b5571c5.

- EAS production 96385f7c-2d30-4771-bfc7-6b91cc291c1d and preview 6a3cb29a-51c2-46e0-94db-0bd425fa83a7 FINISHED; downloads underway. Native verification and Play account eligibility remain separate gates.

### 63. apple.upload — done

2026-09-16T06:59:34+00:00 · observed · agent

Replacement Apple build 6 uploaded, processed VALID, and selected for version 1.0.0.

- Delivery/build b62a9dc5-1b0c-4200-8830-68db021bb0cd; App Store Connect VALID readback and build-selection readback passed. No replacement review submission yet.

### 64. apple.native — in_progress

2026-09-16T06:59:34+00:00 · observed · agent

Replacement simulator artifact downloaded and installed on the booted iPhone simulator; visual checks and new captures await Mac unlock.

- EAS simulator e02851c0-0cae-4f95-b854-2d57e32cc0b2, source b5571c5, SHA256 f6f446b7f04513e9d5d01c50755ae5d4c9b430daa71bcf9ec873dc4a1d34ded9. Actual simulator Info.plist is version 1.0.0 / CFBundleVersion 1 despite EAS remote-version label 6; xcrun simctl install succeeded. Production IPA independently confirms build 6. Earlier screenshots verify only the older artifact.

Next: After unlock, verify revised reading screen, privacy/support links, share, offline recovery, large text, and both widget sizes; capture clean neutral Home Screen images and updated iPhone/iPad reading screens.

### 65. google.native — in_progress

2026-09-16T06:59:34+00:00 · observed · agent

Android version 7 production AAB download verified; matching preview APK download is running. Version 6 UI checks do not verify the revised screen.

- AAB 72,473,181 bytes; SHA256 28393339165f9085535926b55b87953d410667db1561923d758025729d9549b8. Preview EAS 6a3cb29a-51c2-46e0-94db-0bd425fa83a7 FINISHED; active APK transfer and partial file observed.

Next: Finish the current APK download and archive validation, install version 7, then perform native checks and clean neutral-background widget captures after Mac unlock.

### 66. google.native — in_progress

2026-09-16T07:03:19+00:00 · observed · agent

Android version 7 APK downloaded, archive checked and installed successfully on the emulator. Revised UI and widgets still need native verification.

- APK 104,436,147 bytes; SHA256 bc3412d60962c5b205bb61f34ae0d98f3dbfa84a8119a8bed7163016b1234194. adb install Success; installed package versionName 1.0.0/versionCode 7. This proves installation, not visual behavior.

Next: After Mac unlock, verify revised app UI, share, Privacy/Support, offline recovery and large text; capture compact and expanded widgets on a clean Home Screen with plain neutral wallpaper. Physical-device checks remain separate.

### 67. apple.review — in_progress

2026-09-16T07:11:08+00:00 · observed · agent

Replacement build 6 is valid and selected; current version is PREPARE_FOR_SUBMISSION. The withdrawn old review is complete; no replacement review has been submitted.

- Live App Store Connect version 267c6f52-d22d-4cb0-bb4c-d22f280b4499 readback includes selected build b62a9dc5-1b0c-4200-8830-68db021bb0cd, version 6, VALID, with appStoreState PREPARE_FOR_SUBMISSION.

Next: After Mac unlock, finish native checks and the clean neutral-background widget-size gallery, verify uploaded replacements, then create and submit the replacement review.

### 68. apple.release — in_progress

2026-09-16T07:11:08+00:00 · observed · agent

Public release is not achieved. The replacement version is being prepared; no active review is awaiting Apple.

- Current version PREPARE_FOR_SUBMISSION, selected build 6 VALID. Earlier review was withdrawn; banking/agreement and address correction remain separately tracked.

Next: Complete and submit the replacement review, resolve owner/provider commercial-readiness gates, then verify approved paid public availability.

### 69. google.artwork — in_progress

2026-09-16T07:11:08+00:00 · observed · agent

The old version-6 artwork set is superseded. About art is removed, and clean widget-size captures plus version-7 reading captures are pending.

- PR90 retired About and cluttered iPhone widget artwork. Current manifest contains only older reading-screen captures; widget-gallery-brief.md defines required clean neutral backgrounds and size variants.

Next: Capture version-7 Android reading screens and compact/expanded widgets after Mac unlock, render and inspect the replacement gallery, then mark this gate done.

### 70. native.ui-access — done

2026-09-16T07:19:02+00:00 · observed · agent

Mac is now unlocked; native Android Emulator and iOS Simulator accessibility/screenshot controls are available.

- CUA opened Android Emulator window and rendered a live Newsworthy widget; Simulator exposes Home Screen controls and widget edit-mode accessibility actions.

### 71. host.ui — done

2026-09-16T07:19:02+00:00 · observed · agent

Native UI access restored after the Mac was unlocked.

- Live Android and iOS simulator state returned through CUA.

### 72. native.ios-widget-sizes — done

2026-09-16T07:41:18+00:00 · observed · agent

Replacement small and medium iOS widgets verified on iPhone 16 Pro Max iOS 18.3; clean neutral artwork rendered from actual widget viewports.

- store/source/iphone-6.9/provenance.json; store/assets/apple/iphone-6.9/02-widget-sizes-v2.png. Small tap opens app. Medium preserves native two-line truncation.

### 73. native.ios-replacement-ui — in_progress

2026-09-16T07:41:18+00:00 · observed · agent

Replacement iPhone light/dark reading screens captured; About absent; Privacy and Support links open correct published pages.

- store/source/iphone-6.9/provenance.json

Next: Finish iPad/Android captures and remaining native checks; replace remote Apple gallery before resubmission.

### 74. apple.gallery-order — done

2026-09-16T07:48:41+00:00 · observed · agent

Apple gallery now leads with neutral small/medium actual-widget composition; all five replacement iPhone/iPad images COMPLETE and old gallery images removed.

- store/apple-gallery-verification.json

### 75. apple.widget-gallery-revision — done

2026-09-16T07:48:41+00:00 · observed · agent

Replaced clashing wallpaper and unrelated icons with actual small/medium widget viewports on a plain neutral artboard; remote gallery read back COMPLETE.

- store/apple-gallery-verification.json; store/source/iphone-6.9/provenance.json

### 76. apple.listing — done

2026-09-16T07:50:27+00:00 · observed · agent

All five replacement Apple screenshots are COMPLETE: clean neutral small/medium widget composition first, revised iPhone light/dark and iPad light/dark reading screens. Old gallery removed.

- store/apple-gallery-verification.json; capture provenance in store/source/iphone-6.9 and ipad-13

### 77. apple.native — done

2026-09-16T07:50:27+00:00 · observed · agent

Replacement native UI checked on iPhone 16 Pro Max and iPad Pro 13-inch iOS 18.3: light/dark, no About, footer links, iPad share popover, iPhone small/medium widgets and small tap-to-open.

- store/source/iphone-6.9/provenance.json; store/source/ipad-13/provenance.json. Verification is simulator-scoped; physical-device, replacement offline and large-text checks are not claimed.

### 78. design.widget-gallery — in_progress

2026-09-16T07:50:27+00:00 · observed · agent

Apple neutral small/medium gallery completed and uploaded; Android compact/expanded composition remains pending native resizing.

- store/apple-gallery-verification.json; store/design/widget-gallery-brief.md

Next: When Android launcher resize handles are available, capture compact and expanded native widgets and replace Android artwork.

### 79. apple.review — in_progress

2026-09-16T07:50:58+00:00 · observed · agent

Created replacement review draft 4f28761f-3096-4f0d-aa37-df83332f818f with build 6 version item; submission request sent, awaiting provider readback.

- Apple draft READY_FOR_REVIEW and item NGYyODc2MWYtMzA5Ni00ZjBkLWFhMzctZGY4MzMzMmY4MThmfDZ8ODkxNDI4ODYw returned from API.

Next: Read back replacement submission and version state; do not retry uncertain submission.

### 80. apple.review — waiting_provider

2026-09-16T07:52:45+00:00 · observed · provider

Replacement build 6 submitted successfully with corrected widget-first gallery; both review submission and version are WAITING_FOR_REVIEW.

- Submission 4f28761f-3096-4f0d-aa37-df83332f818f submitted 2026-09-16T07:50:46.874Z; version 267c6f52-d22d-4cb0-bb4c-d22f280b4499 read back WAITING_FOR_REVIEW with build b62a9dc5-1b0c-4200-8830-68db021bb0cd.

Next: Wait for Apple review result; resolve banking/paid agreement and legal-address correction before paid public availability.

### 81. apple.release — waiting_provider

2026-09-16T07:52:45+00:00 · observed · provider

Replacement build 6 is waiting for Apple review; public release not yet achieved. Paid agreement/banking and address correction remain separate gates.

- Version and replacement submission WAITING_FOR_REVIEW on 2026-09-16; automatic release after approval configured.

Next: Verify Apple approval, paid-sale readiness and public availability; do not equate review submission with release.

### 82. native.ios-replacement-ui — done

2026-09-16T07:52:45+00:00 · observed · agent

Replacement iPhone/iPad light and dark screens captured, About absent, iPhone Privacy/Support links load correct pages, iPad share popover opens.

- Native capture provenance JSON files; physical-device, replacement offline and large-text checks remain unclaimed.

### 83. google.widget-fix — in_progress

2026-09-16T07:59:54+00:00 · observed · agent

Owner observed flicker, resize resets and oversized /10. Android logs confirm one-time WorkManager completion toggles RescheduleReceiver, PACKAGE_CHANGED recreates widget and starts another worker about every second.

- 2026-09-16 emulator log captured in private /tmp/newsworthy-android-widget-log.txt; package-change/onUpdate/worker loop reproduced. Fix source uses one persistent periodic job, persisted saved status, compact layout and smaller baseline denominator.

Next: Build and install corrected APK; verify idle logs stop looping, compact/expanded resizing persists, score styling matches iOS, then recapture Android gallery.

### 84. apple.bank — waiting_user

2026-09-16T08:05:54+00:00 · observed · user

Rechecked Apple Business after replacement submission: Add Bank Account still required; no bank is listed. W-9 and DSA remain Active.

- Native signed-in Apple Business readback 2026-09-16; Paid Apps Agreement remains Pending User Info.

Next: Owner enters payout bank in App Store Connect Business > Add Bank Account. Private bank details are not available to the agent.

### 85. apple.address — waiting_provider

2026-09-16T08:05:54+00:00 · observed · provider

Apple Business still shows the obsolete legal address; authorized correction request remains acknowledged but not completed.

- Native Apple Business rechecked 2026-09-16 after replacement review submission. No new address was submitted.

Next: Await Apple correction response, then verify legal entity and paid-contract records against the authorized current address.

### 86. google.widget-fix — in_progress

2026-09-16T08:07:01+00:00 · observed · agent

Corrected preview APK version 8 is IN_PROGRESS in EAS from clean commit 922a9b1. Source fixes periodic scheduling, compact sizing and baseline /10. Production upload attempt is still running; no production v8 build ID returned yet.

- EAS preview c18fb254-3145-4e69-b7f5-906b3c0621e1 readback IN_PROGRESS, appBuildVersion 8, source commit 922a9b19f26a750df0867d0c3e1bdf4b6672ceba. PR92 draft; 175 tests, typecheck, prebuild passed.

Next: Download/install corrected APK, verify idle no longer causes worker/package-change loop and actual compact/expanded resize; inspect production upload outcome before any retry.

### 87. google.widget-fix — in_progress

2026-09-16T08:12:15+00:00 · observed · agent

Corrected preview APK v8 and production AAB v9 are IN_PROGRESS. Initial production upload stalled before build creation; checked remote list, stopped that upload, then retried. Retry incremented production versionCode to 9.

- Preview c18fb254-3145-4e69-b7f5-906b3c0621e1 source922a9b1; production a55d6cc8-d3cf-41f3-ae88-6b2b29456151 source2bd1179. Source diff affects release docs only, no apps/client changes. store/android-widget-regression.json records 30 widget recreations in 34 seconds before fix.

Next: Install APK v8 and verify stable idle logs plus compact/expanded resizing and small /10; download and validate AAB v9. Then capture corrected Android gallery and finish PR92.

### 88. google.widget-fix — in_progress

2026-09-16T08:36:36+00:00 · observed · agent

Preview APK8 installed; production AAB9 finished, downloaded and ZIP validated. Corrected widget has small baseline /10. In a 65-second native log window, worker restarts, widget recreations, receiver toggles and fatal exceptions were all zero; old build recreated widget 30 times in 34 seconds. Fresh resize verification remains pending.

- store/android-widget-regression.json; store/release.json contains build IDs, source commits and artifact SHA256. Existing resize handles survived package upgrade; automated drags did not change settled dimensions. CUA sustained press unavailable; owner asked for fresh two-by-two resize while independent work continues.

Next: Verify fresh native compact/expanded resizing, capture both sizes and updated reading screens, render gallery, then complete PR92.

### 89. google.widget-fix — in_progress

2026-09-16T08:42:54+00:00 · observed · agent

Corrected worker completed SUCCESS at 16:28:57 and jobscheduler retains the next network-constrained refresh with a 30-minute delay. Existing launcher item still reports span/minSpan 3x3 while provider metadata reports 120dp minima; cached launcher sizing is a hypothesis, not verified root cause.

- store/android-widget-regression.json records sanitized worker completion, scheduler and launcher measurements. Both PR92 check workflows passed. Apple version remains WAITING_FOR_REVIEW; live Google Create app remains disabled pending device/contact-phone verification.

Next: Complete fresh resize test; if still constrained, remove/re-add the existing native widget via launcher before further code changes. Capture corrected Android gallery. Owner instructions now omit obsolete Mac-lock and Apple-resubmission requests.

### 90. google.widget-fix — in_progress

2026-09-16T08:51:20+00:00 · observed · agent

Native dark-to-light theme switch exposed pale /10 retaining dark-theme color. Replaced resolved inline color span with separate baseline-aligned TextView using XML theme color. 175 tests and Android prebuild pass; replacement native verification pending.

- source/android-phone/07-widget-theme-switch-v8.png and provenance-v8.json preserve actual capture; android-widget-regression.json records scope. Source fix applies to both compact and expanded layouts.

Next: Build preview APK from this fix, install and verify denominator in light/dark transitions, then finish compact/expanded checks and gallery before producing final AAB.

### 91. google.widget-fix — in_progress

2026-09-16T08:54:07+00:00 · observed · agent

Theme-fix preview APK9 accepted by EAS as bfb5310e-c8e1-41af-bc01-6037b17701b6 from clean commit 698071b. Existing production AAB9 predates this theme fix and must be replaced after preview verification.

- EAS build request returned NEW, appBuildVersion9, source commit698071b0a92da20f0647348464508425c8487b16. Build watcher downloads and ZIP-checks artifact; no duplicate production build started.

Next: Wait for this exact EAS build, install APK9, verify native theme switching and compact/expanded resizing, then capture final Android assets and build production bundle.

### 92. google.widget-fix — in_progress

2026-09-16T09:02:14+00:00 · observed · agent

Installed APK8 completed its next scheduled refresh at16:59:50.826. From16:29 through90 seconds after completion, native logs contain one worker start/success, one widget recreation at16:47 during the deliberate theme change, zero receiver-disable events and no fatal exception. No widget recreation followed the scheduled refresh. Periodic refresh remains functional without the old loop.

- store/android-widget-regression.json includes recurringExecution; full device log remains private. Theme-fix APK9 bfb5310e-c8e1-41af-bc01-6037b17701b6 is still IN_PROGRESS.

Next: Install and verify exact theme-fix APK9; finish fresh compact/expanded resizing and artwork before final AAB build.

### 93. google.widget-fix — waiting_user

2026-09-16T09:09:34+00:00 · observed · user

Theme-fix APK9 build finished successfully after12m36s. Artifact download is progressing. CUA reports the Mac is locked and automatic unlock unavailable, preventing native theme/resize checks and captures.

- EAS build bfb5310e-c8e1-41af-bc01-6037b17701b6 Finished in provider UI; existing download watcher remains live and partial file grew17MB to40MB. CUA lock response observed; owner unlock request sent.

Next: Finish downloading and installing APK9 through CLI. Owner unlocks Mac; then resume native theme switching, fresh widget resize and final Android gallery. Do not mark theme or compact size verified while locked.

### 94. google.widget-fix — waiting_user

2026-09-16T09:33:15+00:00 · observed · user

APK9 downloaded, ZIP-validated and installed. Native light/dark/light expanded-widget denominator checks passed with zero worker starts during transitions. Current reading light/dark captures are complete. Launcher existing widget now reports minSpan2x2. Actual compact rendering remains pending; Mac relocked.

- store/release.json artifact SHA25677d5c0c8da4ca6b33092949176cde4daa9677c079472379c9a191546741cc185; source/android-phone/provenance-v9.json and theme screenshots. Native launcher keyboard focus worked, but Ctrl+W/Menu/Ctrl+R did not open picker/resize popup. Store renderer/validator passed for current reading gallery.

Next: Owner unlocks Mac and leaves widget at2x2 using long-press resize handles; alternatively inspect emulator keyboard routing when available. Capture compact and expanded, finish gallery, then final production AAB and PR92.

### 95. google.artwork — in_progress

2026-09-16T09:33:15+00:00 · observed · agent

Replaced old reading gallery with actual APK9 light/dark captures and versioned assets. Widget-size comparison remains pending compact native capture.

- store/preview-android.png visually inspected; manifest points to12-reading-light-v9.png and13-reading-dark-v9.png. Renderer/metadata validator passed. About excluded.

Next: Add verified compact/expanded widget frames and regenerate first gallery image; keep actual widget surfaces on neutral canvas.

### 96. google.widget-fix — done

2026-09-16T10:09:18+00:00 · observed · agent

APK9 compact 2x2 verified after owner resized and approved; existing expanded theme and APK8 periodic-refresh evidence retained

- store/source/android-phone/14-widget-compact-dark-v9.png; provenance-v9.json; android-widget-regression.json; launcher span/minSpan 2x2

### 97. google.artwork — done

2026-09-16T10:09:19+00:00 · observed · agent

APK9 real compact and expanded widget gallery complete on neutral canvas at common scale; no wallpaper or unrelated apps

- store/assets/google-play/phone/03-widget-sizes-v9.png; widget-frames.json; image validation and visual inspection

### 98. design.widget-gallery — done

2026-09-16T10:09:19+00:00 · observed · agent

Both platform galleries feature actual widget size choices on neutral backgrounds

- Apple submitted five-image gallery; Android APK9 compact/expanded gallery in store/assets/manifest.json

### 99. design.regression — in_progress

2026-09-16T10:09:19+00:00 · observed · agent

Cross-surface design tests pass locally and reject historical APK7 and APK8 designs; full suite and CI pending

- test/surface-design.test.js; design/surfaces.json; 192 app rendered-prop combinations plus native XML/Swift/Java contracts and 12 deliberate regression checks

Next: Finish npm test, push PR92 and verify the named CI design gate

### 100. design.regression — in_progress

2026-09-16T10:11:05+00:00 · observed · agent

189 repository tests pass locally. New design gate rejects historical b5571c5 expanded XML and 922a9b1 inline theme override; 192 reading-render combinations and 12 deliberate regressions pass.

- npm test: 189/189; npm run test:design: 19/19; npm run check:app; test/surface-design.test.js; design/README.md

Next: Push PR92 and verify CI design gate; tests check design contracts/rendered props, not native screenshot layout

### 101. google.native — in_progress

2026-09-16T10:13:02+00:00 · observed · agent

APK9 native light/dark app and expanded widget theme transitions verified; owner-approved dark compact widget captured at actual 2x2

- store/source/android-phone/provenance-v9.json; android-widget-regression.json; new 2x2 native capture and launcher readback

Next: Verify compact light, score 10, enlarged text, replacement offline recovery and physical-device behavior. CI design contracts do not prove native layout.

### 102. google.build — in_progress

2026-09-16T10:13:03+00:00 · observed · agent

Preview APK9 contains the verified denominator theme fix. Existing production AAB9 predates that fix and must not be submitted as final.

- Preview bfb5310e-c8e1-41af-bc01-6037b17701b6 source 698071b; older production a55d6cc8-d3cf-41f3-ae88-6b2b29456151

Next: Create and verify the final production AAB after PR92 integration; retain build provenance.

### 103. design.regression — done

2026-09-16T10:18:37+00:00 · observed · agent

CI passed the named cross-surface design gate and all 189 repository tests on f613a87; known regressions fail the gate

- GitHub Actions 35083882871: design gate and npm test passed; 192 Expo rendered-prop combinations; 12 deliberate regression checks; historical XML b5571c5 and theme override 922a9b1 rejected; app-release skill v1.0.6 merged in skills PR65

Next: For future UI changes, extend regression cases and perform the separate native capture matrix; these tests do not execute native layout engines.
