# Apple Guideline 2.1 response — version 1.0.0 (6)

September 17, 2026. The owner pasted Apple's review message into the release
task. Apple requests additional information because this developer account has
limited review history. No particular crash or UI defect is identified.
API readback independently confirms `REJECTED` / `UNRESOLVED_ISSUES`.

## Submission status

The factual response below is saved and verified in App Review Notes. **Do not send
this as a completed response or resubmit until the physical-device recording
and testing evidence are available.** Replace the pending paragraph with the
actual attachment filename or accessible recording URL and verified device,
OS, version and build. Keep those same facts in Notes and the App Review reply.

## Response text

1. Physical-device demonstration

Pending: a recording of version 1.0.0 (6) launching and showing the main flow on
a physical device running the latest OS. Existing simulator screenshots are
not evidence of this requirement. Physical-device QA is not yet claimed.

2. Purpose and audience

Newsworthy is a calm global status indicator for people who want a brief check
on consequential world news without an endless feed. It displays an AI-assessed
number out of 10, one explanatory sentence and an update time. Higher means more
consequential; the displayed score fades as developments age. It is not an
emergency alert, a measure of personal safety or a complete news briefing. AI
assessments can be wrong.

3. Setup and access

Launch the app with an internet connection; the current public reading loads
automatically. No registration, login, credentials or sample files are needed.
The Share button opens the system share sheet. Privacy and Support links are at
the bottom of the reading screen. To add a widget, use the Home Screen's widget
picker, find Newsworthy and choose a supported size. Tap the widget to open the
app. Widget refresh timing is controlled by the OS. After an online launch, the
last downloaded reading remains available offline with its original timestamp.
The app supports light and dark appearances.

The app is a one-time paid download through the App Store. There are no further
paid features, in-app purchases, subscriptions or ads. All functionality is
available immediately after installation. There are no user accounts, user
posts, chat or other user-generated-content features; account deletion and
content-reporting/blocking flows therefore do not apply.

4. External services and platforms

The app and widgets read the public Newsworthy HTTPS API hosted on Vercel.
Neon PostgreSQL stores news readings and service settings. The backend uses
Anthropic Claude and its web-search tool to assess public news, and Claude to
group developments. Operator-controlled external AI agents can also submit
readings through an authenticated backend API; their model identity is not
recorded or independently verified by the service. This is an operator workflow,
not a public posting feature. No app-user profile, location or authored text is
sent to the news models. Hosting retains operational request/diagnostic logs,
as described in the privacy policy. Expo/React Native and EAS are used to build
the client; WidgetKit provides the iOS widget. Apple handles download purchases
and TestFlight distribution. Optional support uses the user's email client;
sharing uses the OS share sheet. No authentication or in-app payment service is
needed by the app.

5. Regions

The app serves the same English-language global reading and features across
its configured regions; there is no country-specific content or feature gate.
Displayed times use the device's locale/time zone. App Store prices, taxes and
availability follow the local storefront. Connectivity and OS widget scheduling
can affect when a device receives updates.

6. Regulated services and third-party material

Newsworthy provides general news context, not regulated medical, financial,
gambling or other professional services. It displays its generated score and
short factual sentence with original artwork, not publisher articles, photos,
videos or media feeds. It does not offer licensed third-party content for sale.

## Physical-device recording checklist

1. Update the device in **Settings → General → Software Update**. Apple lists
   iOS/iPadOS 27 as latest on September 17; check again on the recording date.
2. Install **Newsworthy 1.0.0 (6)** through TestFlight. In App Store Connect,
   **Newsworthy → TestFlight → Internal Testing**, use the prepared internal
   group and add the existing account holder as a tester if not already present.
   Accept the TestFlight invitation on the device. No paid purchase is needed.
3. Before recording, confirm the build in TestFlight and note the device model
   and OS in Settings. Keep serial numbers, Apple Account details, notifications
   and unrelated personal content out of the recording.
4. Start the device's screen recording while on the Home Screen. Launch
   Newsworthy by tapping its icon. Show the loaded score, sentence and update
   time. Open and dismiss Share without sending; open Privacy and Support and
   return without emailing. Show a Newsworthy widget and tap it to reopen the
   app. Show small and medium widget options if practical. A short continuous
   demonstration is sufficient; there is no login or in-app purchase flow.
5. Separately check light/dark, larger text, offline saved timestamps, rotation
   and widgets. Test the submitted build on physical iPhone and iPad because
   both platforms are supported. Record failures rather than claiming a pass.
6. Save the unaltered recording and a concise QA record. Attach the recording in
   App Review or provide a reviewer-accessible URL; verify access. Fill in
   response item 1 and App Review Notes, then reply to Apple's message. Sending
   the reply and the review/submission state must each be verified separately.

## Current access evidence

- Physical TestFlight check exposed iOS system glass backgrounds around brand/share.
  Source fix uses custom native header items with `hidesSharedBackground: true`.
  The corrected build must be installed and checked on a current-OS iPhone before recording.

- Build 6: `READY_FOR_BETA_TESTING` for internal testing; external beta review
  has not been submitted. The **Release QA** internal group now contains build 6 and testing instructions.
  Apple accepted the owner invitation through its public API (HTTP 201), and
  group tester readback is now **INVITED**. The owner subsequently supplied a screenshot of the app running in TestFlight
  on a physical iPhone; full physical QA and recording remain incomplete. The direct tester-build list still returns
  zero; the group build remains Testing. Recheck access after acceptance.
- Xcode device inventory found a paired iPhone last reporting iOS 26.6.2, but
  its connection tunnel was unavailable. Pairing alone does not prove access.
- iPhone Mirroring opens first-time onboarding. It has not been configured or
  granted additional access. USB connection/unlock was requested from the owner.
- Chrome control recovered and the full review message was confirmed directly.
  The public API does not expose review correspondence. A temporary Mac lock
  subsequently cleared; UI access recovered.

References: [Apple TestFlight internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers),
[Apple security releases](https://support.apple.com/en-ca/100100),
[reply to App Review](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/reply-to-app-review-messages/).
