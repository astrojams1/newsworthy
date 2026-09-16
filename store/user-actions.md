# Account-owner actions

Checked against the live consoles on **September 16, 2026**. The list below
separates things requiring the owner from technical work the release agent can
perform. Do not put identity documents, addresses, bank/tax information, API
keys, or verification codes in GitHub issues or this repository.

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
privately by the owner. Apple subsequently emailed a case number; keep that
reference in the private support email.

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

App Privacy now explicitly reports publication by James Thompson. The published
categories are performance and diagnostic data for app functionality, linked to
users, with no tracking. No further publication approval is pending.

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

Do **not** ask the owner to create listing art/copy, configure Expo, generate
signing credentials again, fetch binaries, or manually upload screenshots.
Those have working automated paths. Android rendering, sharing, navigation,
offline/recovery checks and the three store screenshots are complete. The Mac
relocked before the large-text check; unlock it to resume. Widget/large-text
and physical-device checks remain open.
The remaining technical release work is:

- Complete Google privacy and content-rating declarations using the code and live
  hosting evidence in [disclosures.md](disclosures.md).
- Apple submission is complete and **Waiting for Review**. Read the review
  result, resolve feedback, verify commercial readiness and public availability.
  All 175 territories are configured with release after approval. Do not create
  a duplicate submission.
- When **Create app** becomes enabled, create Newsworthy as **paid**, set US$1.00,
  upload the AAB, copy, icon, feature graphic, and prepared Android screenshots,
  complete app-content forms, and prepare the closed-test release.
- Verify real-device behavior through TestFlight/the closed test with actual
  participants. Emulator checks alone do not establish physical-device behavior.

The original request authorizes store submission; no additional generic
“may I submit?” approval is needed. Store contracts, private information,
unavailable verification channels, and genuine testing remain separate gates.
