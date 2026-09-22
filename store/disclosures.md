# Disclosure evidence

Checked September 16, 2026. These notes are a review record, not an assertion
that every console questionnaire has been submitted.

## Privacy

- Native app and widgets fetch the public reading over HTTPS. The payload has
  no user profile, device location, or user-authored text sent to the news model.
- A last-known reading is stored locally in AsyncStorage/native widget caches.
  It retains its timestamp and is not uploaded as a user activity history.
- The source has no accounts, advertising SDK, tracking SDK, or app analytics SDK.
- **Live Vercel dashboard:** project overview offers “Enable Analytics”, so
  Vercel Web Analytics is not enabled. Observability Plus is also offered as an
  upgrade. Runtime logs are present for `/api/current` with timestamps,
  user-agent strings, request IDs, HTTP status, and timing information.
  This proves non-ephemeral operational collection; do not answer “no data
  collected” based only on the native privacy manifest.
- The Vercel connector returned no teams/403 for this project, but the existing
  signed-in Chrome session provided access. Owner reconnection is not needed
  merely to inspect the project's current settings.
- Vercel's current documentation lists Pro runtime-log retention as one day
  without Observability Plus. This does not establish retention for every
  security log or any external drain. Check team drain configuration before
  making a blanket retention promise.
- Support is user-initiated email; sharing uses the operating-system share sheet
  and the user's selected destination. Review the stores' optional-data rules
  before classifying support messages.

App Store Connect now confirms publication by the owner. Apple's published categories are **Performance Data** and **Other Diagnostic
Data**, for **App Functionality**, **linked to the user**, **not used for
tracking**. Request timing and operational logs support these categories.
Vercel documents matching retained logs by IP address and user agent; no
pre-collection anonymization is established, so the label does not claim the
diagnostics are unlinked. IP addresses are classified by their diagnostic and
security use, rather than claiming the app requests device location. There is no
in-app support form or message collection; optional support opens the user's
external email client. No advertising or behavioral profiling is implemented.

- **Optional notifications (included in iOS TestFlight build 18; not publicly released):**
  when a person turns notifications on in Settings, the app sends its Expo push
  token and chosen minimum score to `PUT /api/push/subscriptions`, and the
  database keeps that row until the switch is turned off or Expo reports the
  token dead. A push token is a device identifier held server-side, so the
  labels must be reevaluated before the first build carrying it ships: decide
  whether Apple's **Device ID** / Google's **Device or other IDs** category
  applies to a token used only to deliver the notifications the person asked
  for, and answer the notification-permission and background-mode questions.
  Nothing else about the device is stored. The public privacy policy already
  describes the registration.

If infrastructure or support collection changes, reevaluate the labels. The
native manifest's empty client data-type array does not describe server logging.

References: [Apple privacy definitions](https://developer.apple.com/app-store/app-privacy-details/),
[Vercel runtime logs](https://vercel.com/docs/logs/runtime),
[public privacy policy](https://newsworthy-indol.vercel.app/privacy).

## Content and age rating

Newsworthy displays a short, changing AI-generated news sentence. News can
discuss war, weapons, death, disaster, and other mature subjects, even though the
interface is quiet and contains no graphic images. The store's content-frequency
answers must reflect news coverage rather than infer an all-ages rating from the
minimal visual design. It has no chat, user posts, contests, gambling, loot boxes,
ads, unrestricted in-app browser, or parental controls. The system share sheet
does not create an in-app social network.

Apple's declaration was saved and verified from [apple-age-rating.json](apple-age-rating.json).
Repeated armed-conflict coverage supports frequent mature themes, realistic
violence references and weapons; occasional references to drugs and frightening
events are also disclosed. No graphic/prolonged violence, sexual imagery, or
profanity is presented. Apple calculates the resulting regional age ratings.
Google's questionnaire and the final privacy labels remain release-agent work;
the account owner need not reverse-engineer the code to answer them.

## Content rights

Apple accepted `DOES_NOT_USE_THIRD_PARTY_CONTENT` on September 16. The native
app presents its generated score and short factual sentence, plus original
vector artwork; it does not display publisher articles, photos, or media feeds.
Reassess this declaration if third-party content is added. The field was read
back after saving; Apple then accepted the version into its review submission.
