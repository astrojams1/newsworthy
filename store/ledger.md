# Newsworthy release ledger

Updated: 2026-09-16T04:55:59+00:00

Repository: https://github.com/astrojams1/newsworthy

Objective: Release iOS and Android publicly as a one-time US$1 paid download with local equivalents, preserving the web app.

Generated from the adjacent JSON ledger. Update through ledger.py, not this view.

| Gate | State | Owner | Evidence basis | Result | Next action |
|---|---|---|---|---|---|
| scope | done | agent | observed | Owner requests autonomous paid iOS/Android submission, public web preservation, all release work saved in repo. | — |
| web.deploy | done | agent | observed | Production commit f1ee64d deployed successfully; live release URLs checked. | — |
| apple.membership | done | agent | observed | Renewed individual developer membership is recognized by App Store Connect. | — |
| apple.address | waiting_provider | provider | observed | Apple support email confirms receipt of the authorized address-correction request; no correction approval observed. | Read support response and Business legal-entity address; do not duplicate request or reuse obsolete address. |
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
| apple.availability | done | agent | observed | Created availability for all 175 Apple territories; all enabled, no preorder, new territories enabled. Automatic release after approval retained. | — |
| apple.review | done | agent | observed | Version 1.0.0 build 5 submitted; both version and review submission report WAITING_FOR_REVIEW. | — |
| apple.release | waiting_provider | provider | observed | Apple review is pending; AFTER_APPROVAL release configured. No public availability verified. Commercial account requirements remain separately unverified. | Read review outcome and resolve feedback; check tax/banking/agreement and address response; verify paid public listing after approval. Do not resubmit the existing review. |
| google.identity | done | user | observed | Registration fee paid and Play Console reports identity successfully verified. | — |
| google.device | waiting_user | user | observed | Google still requires access to a real Android mobile device; page explicitly says only the account owner can do this. | Owner opens Play Console on real Android device, signs into developer-owner account, selects AstroJams and completes device verification. |
| google.phone | waiting_user | user | observed | Phone-verification link disabled while earlier verification task remains. | Complete owner real-device verification, then use Account details contact phone Verify and enter SMS/voice code directly in Google. |
| google.app | waiting_user | user | observed | Create app remains disabled; live account home lists Android-device and contact-phone verification as required. | After owner device and phone verification, create paid app, configure US$1 and local equivalents, upload version 6 and prepare required closed test. |
| google.build | done | agent | observed | Corrected production AAB and preview APK version 6 finished, downloaded and passed archive checks; preview APK installed. | — |
| google.native | in_progress | agent | observed | Earlier APK exposed missing gradient/share icon from non-base64 SVG URLs. Fixed source and replacement build exist; final visual check pending. | Open installed corrected APK in native emulator, verify gradient/share, light/dark/offline/navigation and applicable widget behavior. Mac is unlocked again. |
| google.listing | in_progress | agent | observed | Shared English copy, icon and feature graphic ready. Android-specific screenshots still pending. | Capture native Android light/dark/About images from version 6; render, visually inspect and validate Google images. Never substitute iOS captures. |
| google.disclosures | todo | agent | inferred | Google app-content/privacy/rating questionnaires not yet available without app record. | After app creation, answer current questionnaires using code and actual service logging evidence. |
| google.closed-test | waiting_user | user | observed | New personal account testing path needs genuine testers and elapsed testing time. | Owner recruits at least 12 eligible real testers; agent configures closed track and opt-in flow once account setup permits. Verify 14 continuous days before access application. |
| google.production-access | todo | agent | inferred | No production-access application submitted. | Complete required closed test, collect actual feedback and apply; approval is separate from elapsed time. |
| google.review | todo | agent | observed | No Google release submitted for review. | Complete account, app, privacy/listing and testing gates; submit permitted release and record provider state. |
| google.release | todo | agent | observed | No public Android store release. | Release only after review/access approval and verify the public paid listing. |
| apple.content-rights | done | agent | observed | Saved DOES_NOT_USE_THIRD_PARTY_CONTENT: app presents its generated rating/sentence and original vector artwork, not third-party article/media feeds. | — |
| host.ui | waiting_user | user | observed | Native UI tool reports Mac locked; automatic unlock failed. In-app browser works for Google but is signed out of Apple. | Owner unlocks Mac; then agent resumes signed-in Apple Business readback and native Android verification/capture. API work does not require unlock. |

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
