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

**Prepared; awaiting authorization to send the support request, then Apple's
review.** Direct editing was attempted but the corrected address did not persist;
the live Business page still shows the obsolete address. Do not accept the paid
contract with that address.

The [membership update request](https://developer.apple.com/contact/request/update-individual-information/)
is prepared in the existing Chrome tab with the current address supplied privately
by the owner. Review and submit it, or explicitly authorize the release agent to
send that prepared request to Apple Developer Support. The agent can send it
after authorization; Apple must approve/process the account change.

Reference: [Apple membership information changes](https://developer.apple.com/help/account/membership/updating-your-account-information).

## 4. Apple: paid-app contract, banking and tax

**Owner's agreement and private financial information required.** The live
[Business page](https://appstoreconnect.apple.com/business) shows the Paid Apps
Agreement as **New**. A renewed developer membership does not complete this step.

After the legal address is corrected:

1. Open **Business → Agreements → Paid Apps Agreement → View and Agree to Terms**.
2. Review the agreement and accept it as the account holder.
3. Complete the banking and tax forms Apple presents using your own legal,
   payout-account and tax information. Complete any bank verification.
4. Confirm the agreement becomes **Active** and no required forms remain.

The agent can navigate and explain the forms, but cannot invent financial/tax
facts or accept a binding agreement without action-time confirmation. The
computer-use tool requires this confirmation for accepting contracts and hands
off consequential financial transactions. Keep private entries in Apple's UI.

Google may likewise require a merchant/payments profile for paid sales after
account verification. Its app-specific paid setup is not yet reachable; it is
not a separately verified current blocker.

## 5. Apple: trader declaration and privacy attestation

The Business page requests **Digital Services Act compliance** for EU availability.
Open **Business → Complete Compliance Requirements**. Determine and declare the
correct trader status; if Apple requests public contact verification, complete it
using current details. The agent cannot infer your legal business status from the
app's code or fees. Avoid choosing a status merely to bypass verification.

Privacy answers are prepared: performance and diagnostic data for app
functionality, linked to users, with no tracking. Apple presents a final legal
attestation before publishing. The agent can click Publish after action-time
confirmation, or the owner can publish from **App Privacy**.

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
Those have working automated paths. Android capture is temporarily paused
because the host Mac locked; unlock it so the agent can finish native visual
verification and capture. The remaining technical release work is:

- Finalize privacy and Google content-rating declarations using the code and live
  hosting evidence in [disclosures.md](disclosures.md).
- Choose availability consistent with compliance and submit Apple for review
  once all gates pass. Review contact and notes are already saved.
- When **Create app** becomes enabled, create Newsworthy as **paid**, set US$1.00,
  upload the AAB, copy, icon, feature graphic, and real Android screenshots,
  complete app-content forms, and prepare the closed-test release.
- Verify real-device behavior through TestFlight/the closed test with actual
  participants. Emulator checks alone do not establish physical-device behavior.

The original request authorizes store submission; no additional generic
“may I submit?” approval is needed. Store contracts, private information,
unavailable verification channels, and genuine testing remain separate gates.
