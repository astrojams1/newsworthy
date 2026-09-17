# Apple Guideline 2.1 response — version 1.0.0 (7)

September 17, 2026. The owner pasted Apple's review message into the release
task. Apple requests additional information because this developer account has
limited review history. No particular crash or UI defect is identified.
API readback independently confirms `REJECTED` / `UNRESOLVED_ISSUES`.

## Submission status

**Build 7 is WAITING_FOR_REVIEW.** App Store Connect confirmed both submission
and version state on September 17 at 04:33 UTC. The six-part response below is
saved/read back in App Review Notes and posted to App Review with
`newsworthy-ios7-review-demo.mp4`. The message and attachment Download control
were verified in the browser. Review acceptance and public release are pending.
See `apple-review-resubmission.json` and `apple-physical-review-video.json`
for provider IDs, file hashes and actual physical verification scope.

## Response text

1. Physical-device demonstration

Video: newsworthy-ios7-review-demo.mp4. Recorded on a physical iPhone using
Newsworthy 1.0.0 (7). It shows launching Newsworthy, the loaded score,
explanation and update time, and the small and medium Home Screen widgets.
Build 7 also removes the unwanted backgrounds around the title and Share icon.

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
2. Install **Newsworthy 1.0.0 (7)** through TestFlight. In App Store Connect,
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

## Current evidence

- The supplied physical recording shows TestFlight 1.0.0(7), launch, the current
  reading and small/medium Home Screen widgets. The title and Share icon have
  no unwanted backgrounds in light appearance.
- The review copy trims 42 seconds of initial idle Home Screen and omits audio;
  the remaining 66-second sequence is continuous. The original is retained.
- Opening Share, footer-link navigation, dark appearance, larger text, offline
  recovery and physical iPad testing are not demonstrated by this recording.
- The exact reply text is also in `listing.json.reviewNotes`; neither makes
  claims about device coverage beyond the observed demonstration.
- App Review correspondence required the signed-in browser. Public API calls
  selected valid build 7, preserved the review-contact phone while updating Notes,
  resolved the rejected item and submitted it. Both review states were then
  independently read back as WAITING_FOR_REVIEW.

References: [Apple TestFlight internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers),
[Apple security releases](https://support.apple.com/en-ca/100100),
[reply to App Review](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/reply-to-app-review-messages/).
