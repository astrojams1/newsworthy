# Account-owner actions

Apple review, notification setup and privacy were checked on **September 24,
2026**. Google account and Apple Business were also rechecked September 24. The list below
separates things requiring the owner from technical work the release agent can
perform. Do not put identity documents, addresses, bank/tax information, API
keys, or verification codes in GitHub issues or this repository.

## Current iOS resubmission: Waiting for Review

**Build21 is Waiting for Review, confirmed September24 at06:19UTC.** The updated
recording was inspected, attached to a posted six-part response, and referenced
in matching Review Notes. No additional recording or upload is requested now.

The recording shows launch, both widget sizes, reading, notification threshold
changes and dark appearance. It does not independently verify OS or build
number; those limits are saved in the recording evidence. Await Apple's actual
next response before assigning further owner work.

See [the current follow-up](apple-review-build21-followup.md) and
[submission receipt](apple-review-resubmission-2026-09-24-video.json).

The production Newsworthy-specific push key was created with
owner confirmation and assigned in Expo. No push-key approval or Mac-unlock
handoff remains.

A labeled test returned Expo ticket OK and APNs receipt OK. Physical iPhone
checks through iPhone Mirroring verified build 21 installation, launch, reading,
Settings and server registration removal/restoration when notifications were
switched off/on. Notifications are restored to enabled with minimum score 5.

The Mac's iPhone notification mirroring is disabled and was left unchanged.
Visual notification presentation and tapping remain unobserved. An optional
owner check is to open the labeled “Newsworthy delivery test” notification on
the iPhone and confirm that it opens the reading. This remaining verification
limit did not prevent the authorized resubmission and is not a new approval
request. See [build evidence](testflight-21.json) and the
[Apple receipt](apple-review-build21.json).

## 1. Google: verify a real Android device

**Confirmed user-only:** Play Console says, “Only the account owner can do this.”
An emulator, an API token, or another connector does not satisfy this requirement.

1. On a real Android phone, install/update the **Google Play Console** app.
2. Sign in with the Google account that owns the **AstroJams** developer account.
3. Select **AstroJams** and follow the device-verification instructions.
4. Return to [Play Console](https://play.google.com/console/) → Home and confirm
   the device-verification task is complete.

The account already reports identity verification successful. Do not repeat the
government-ID process unless Google raises a new requirement.

Reference: [Google device verification](https://support.google.com/googleplay/android-developer/answer/14316361).

## 2. Google: verify the contact phone

**Currently blocked by step 1.** The live phone-verification page disables its
account-details link until the other verification tasks are complete.

After device verification: **Developer account → Account details → contact
phone → Verify**. Check the number, request SMS or voice verification, enter the
code directly in Google's page, and select **Verify**. The agent cannot receive
the owner's phone call/SMS through the currently connected tools.

## 3. Apple: correct the obsolete legal address

**Submitted to Apple Developer Support with the owner's explicit approval.**
Apple's confirmation page says it received the request and will review it and
respond. The request asks Apple to update both the individual developer
membership and App Store Connect legal entity to the current address supplied
privately by the owner. Apple requested proof of the new address on September 18 and acknowledged
receipt of requested documents on September 20. This confirms receipt, not
approval or linkage of the generic receipt to a specific document. Keep the
case reference and private documents in the support email/provider portal.

The Business page still shows the obsolete address; submission is not approval
or evidence that the record has changed. Await Apple's response and provide any
requested verification directly to Apple. Do not submit a duplicate request or
reuse the obsolete address in new forms.

Reference: [Apple membership information changes](https://developer.apple.com/help/account/membership/updating-your-account-information).

## 4. Apple: paid-app contract, banking and tax

**Agreement accepted; W-9 confirmed Active in Apple Business.**
The W-9 row shows September 16 as the submission date and Active status.
No further W-9 submission is required based on the current console.
Banking remains outstanding at the last live check. The live
[Business page](https://appstoreconnect.apple.com/business) now shows the Paid
Apps Agreement as **Pending User Info** at that check. Do not repeat acceptance.

1. Open **Business → Add Bank Account** and enter the owner's payout details.
2. The existing **U.S. Form W-9** is **Active**. If Apple later requests
   missing information, use **Add Tax Info** beside that
   form; **Add Tax Form** is for additional countries.
3. The W-9 **Address** control offers **Add New Address** or **Choose Existing
   Address**. Use the current address supplied privately by the owner; a tax-form
   address change does not establish that the membership legal address changed.
   If Apple will not allow correction, await the support response before submitting.
4. Complete any bank verification and confirm the agreement becomes **Active**.

The agent can navigate and explain the forms, but cannot invent financial/tax
facts or accept a binding agreement without action-time confirmation. The
computer-use tool requires this confirmation for accepting contracts and hands
off consequential financial transactions. Keep private entries in Apple's UI.

Google may likewise require a merchant/payments profile for paid sales after
account verification. Its app-specific paid setup is not yet reachable; it is
not a separately verified current blocker.

## 5. Apple: trader declaration and privacy attestation

**Completed by the owner.** Business now shows Digital Services Act compliance
as **Active** and says all regulatory requirements are complete at this time.
The selected trader classification was not inspected; this records Apple's
completion status without inferring the owner's legal status.

The September 24 published App Privacy categories are Device ID, Other Data
Types, Performance Data and Other Diagnostic Data, all for app functionality,
linked to users, with no tracking. These include notification registration,
preferences and temporary delivery records. No publication approval is pending.

Apple App Review contact details, the reachable phone, no-login requirement,
and review notes are now saved and verified. This is no longer an owner task.
The private phone number is deliberately excluded from this repository.

## 6. Google: real closed testing

After account setup and the first app release, new personal accounts must run a
closed test with **at least 12 testers continuously opted in for 14 days**, then
apply for production access. Approval is not automatic at day 14.

Recruit real Android users who can opt in, install, use the app, and provide
feedback. Provide their preferred Google-account emails privately and authorize
invitations if the agent should manage the list. The agent can prepare the test
release, configure the list, supply the opt-in link, and record feedback; it
cannot manufacture genuine testers, their usage, or elapsed time.

Reference: [Google testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465).

## Work the agent can do

**Apple rejected build 7 under Guideline 4.2 on September 21.** September 24
browser readback confirms the owner-submitted
[reconsideration reply](apple-4.2-reconsideration.md) and Apple's September 23
response upholding the rejection. Do not duplicate that appeal. Build21 was submitted successfully and subsequently rejected under Guideline 2.1
for a physical-device recording and review information. The updated recording
and reply were posted; build21 returned to Waiting for Review at06:19UTC.
The earlier physical recording and Guideline 2.1 response remain historical
evidence. Newer TestFlight builds do not establish a replacement App Review submission.

Android corrective preview APK10 passed emulator checks for maximum-text widget
labels and background appearance changes. Production **AAB11** is downloaded
and verified as a historical artifact, but it predates Settings, notifications
and subsequent native changes. Completed **AAB12** now replaces it; the matching
APK12 carries the same source and Firebase configuration for native testing.
The owner-approved compact widget and neutral compact/expanded
gallery are complete; no further resizing is needed. Physical Android testing
and the remaining native score10 case are separate from emulator coverage.

The remaining technical release work is:

- Android Firebase project/app registration and the scoped FCM credential are now
  configured. Expo readback confirms the approved sender is assigned; the Android
  build configuration file is stored as an EAS secret file for production/preview.
  Production AAB12 and matching preview APK12 are complete. APK12 passed emulator
  launch, Settings, permission and default minimum 8, registration, Expo/FCM receipts, visible
  notification and cold-start tap checks. Test notifications were disabled and the
  registration removed afterward. Physical-device checks remain outstanding.

- Await Apple review after the updated recording and six-part response. Visual
  notification presentation/opening remains unobserved; provider acceptance
  and physical app/registration tests are recorded separately. Verify paid-sale
  readiness and public availability after approval.
- When Google enables **Create app**, create Newsworthy as **paid**, configure
  US$1.00 pricing, upload a current verified AAB and refreshed listing/artwork, complete privacy
  and content-rating forms, and prepare the real closed test.
- Collect genuine tester feedback and verify physical-device behavior. Apply for
  Google production access only after the required testing gate is satisfied.

The original request authorizes store submission; no generic submission
confirmation is pending. Account-owner steps 1–4 and real closed testing remain
as described above. No store is publicly live yet.
