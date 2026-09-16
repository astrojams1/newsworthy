# Newsworthy release ledger

Updated: 2026-09-16T03:31:16+00:00

Repository: https://github.com/astrojams1/newsworthy

Objective: Preserve the web app and submit iOS and Android for a one-time US$1 paid download with local equivalents.

Generated from the adjacent JSON ledger. Update through ledger.py, not this view.

| Gate | State | Owner | Evidence basis | Result | Next action |
|---|---|---|---|---|---|
| scope | done | agent | observed | Owner requests autonomous paid iOS/Android submission, public web preservation, all release work saved in repo. | — |
| web.deploy | done | agent | observed | Production commit f1ee64d deployed successfully; live release URLs checked. | — |
| apple.membership | done | agent | observed | Renewed individual developer membership is recognized by App Store Connect. | — |
| apple.address | waiting_provider | provider | observed | Authorized membership and App Store Connect legal-address correction request submitted; Apple confirmed receipt. Business still showed obsolete address. | Read Apple response and Business legal-entity address; provide owner documents only if requested. Do not duplicate request or claim address changed. |
| apple.agreement | in_progress | agent | observed | Owner accepted Paid Apps Agreement; latest live status Pending User Info. | Read status after W-9 processing and banking; require Active before paid release. |
| apple.tax | in_progress | agent | user_reported | Owner reports adding the W-9; final status not yet read back. | Read existing U.S. Form W-9 status before asking for further owner action. Add Tax Info edits the existing form; Add Tax Form is for other countries. |
| apple.bank | waiting_user | user | observed | Latest live Business page still requested Add Bank Account. | Owner enters payout details directly in Apple and completes any verification; agent then reads back status. |
| apple.dsa | done | user | observed | Digital Services Act compliance Active; Apple says current regulatory requirements completed. | — |
| apple.privacy | done | user | observed | Owner published diagnostics/performance collection for app functionality, linked to user, no tracking. | — |
| apple.review-contact | done | agent | observed | Review contact including phone, no-login requirement and notes saved and all supplied fields read back. | — |
| apple.listing | done | agent | observed | English copy, category, US$1 pricing and five native iPhone/iPad screenshots saved; screenshots COMPLETE. | — |
| apple.build | done | agent | observed | Signed production IPA build 5 completed and validated; simulator capture build recorded separately. | — |
| apple.native | in_progress | agent | observed | Actual iPhone/iPad simulator reading, light/dark UI, sharing and iPhone medium widget checked. Physical-device release checklist remains. | Finish applicable physical-device, offline/recovery, accessibility and widget checks; do not treat web or Expo Go as signed-device proof. |
| apple.upload | done | agent | observed | Direct altool upload processed VALID and APP_STORE_ELIGIBLE; Apple build 5 selected for version 1.0.0. | — |
| apple.availability | todo | agent | inferred | Final territory/release settings still require inspection. | Inspect desired territories and release behavior against current DSA and owner scope; configure and read back. |
| apple.review | todo | agent | observed | Version remains Prepare for Submission; no App Review submitted. | Finish commercial/account, availability and release checks, then submit under original owner authorization. |
| apple.release | todo | agent | observed | App is not publicly released. | Track review only within active user-requested work; resolve feedback and release according to approved behavior. Do not schedule monitoring unless requested. |
| google.identity | done | user | observed | Registration fee paid and Play Console reports identity successfully verified. | — |
| google.device | waiting_user | user | observed | Play Console requires a real Android device; only the account owner can complete it. | On a real Android phone, sign into Play Console as the owner and complete device verification. |
| google.phone | waiting_user | user | observed | Phone-verification link disabled while earlier verification task remains. | Complete owner real-device verification, then use Account details contact phone Verify and enter SMS/voice code directly in Google. |
| google.app | waiting_user | user | observed | Create app disabled; no Google app record, saved price, listing or release exists. | Owner completes verification; agent then creates the app as paid, sets US$1 local equivalents and configures release. |
| google.build | done | agent | observed | Corrected production AAB and preview APK version 6 finished, downloaded and passed archive checks; preview APK installed. | — |
| google.native | in_progress | agent | observed | Earlier APK exposed missing gradient/share icon from non-base64 SVG URLs. Fixed source and replacement build exist; final visual check pending. | Open installed corrected APK in native emulator, verify gradient/share, light/dark/offline/navigation and applicable widget behavior. Mac is unlocked again. |
| google.listing | in_progress | agent | observed | Shared English copy, icon and feature graphic ready. Android-specific screenshots still pending. | Capture native Android light/dark/About images from version 6; render, visually inspect and validate Google images. Never substitute iOS captures. |
| google.disclosures | todo | agent | inferred | Google app-content/privacy/rating questionnaires not yet available without app record. | After app creation, answer current questionnaires using code and actual service logging evidence. |
| google.closed-test | waiting_user | user | observed | New personal account testing path needs genuine testers and elapsed testing time. | Owner recruits at least 12 eligible real testers; agent configures closed track and opt-in flow once account setup permits. Verify 14 continuous days before access application. |
| google.production-access | todo | agent | inferred | No production-access application submitted. | Complete required closed test, collect actual feedback and apply; approval is separate from elapsed time. |
| google.review | todo | agent | observed | No Google release submitted for review. | Complete account, app, privacy/listing and testing gates; submit permitted release and record provider state. |
| google.release | todo | agent | observed | No public Android store release. | Release only after review/access approval and verify the public paid listing. |

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

