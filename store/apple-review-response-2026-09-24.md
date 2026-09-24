1. Physical-device demonstration

Attached to our September 24 App Review reply: newsworthy-review-2026-09-24-demo.mp4. This updated physical iPhone recording begins on the Home Screen and shows launching Newsworthy, small and medium widgets, the score/explanation/update time, opening Settings, changing the notification minimum score and switching from light to dark appearance. It replaces the earlier build7 demonstration. The current submission is 1.0.0 (21).

2. Purpose and audience

Newsworthy uses AI to assess world news with a score from 1 to 10, a brief explanation and an update time. It is for people who want a concise indication of news significance. Higher scores mean more consequential developments; scores fade as developments age. It is not an emergency service, a measure of personal safety or a complete news briefing. AI assessments can be wrong.

3. Setup and access

Launch with an internet connection. The public reading loads automatically. No login, registration, credentials or sample files are needed. The gear opens Settings. Under Notifications, turn on "Notify me about high readings", allow the iOS notification permission, and choose a minimum score. Notifications depend on new qualifying readings, connectivity and iOS settings; enabling them does not immediately generate a news alert. The device must be registered and outside the app to see a banner; foreground notifications refresh the reading without a banner or sound. To stop notifications, turn off the switch. Privacy and Support links are also in Settings.

To add a widget, open the Home Screen widget picker, find Newsworthy and choose a size. Tap it to open the app. iOS controls widget refresh timing. Share opens the system share sheet. The last downloaded reading is available offline with its original timestamp.

This is a one-time paid download. There are no additional paid features, in-app purchases, subscriptions or ads. No user accounts or user-generated content exist, so account deletion and content reporting/blocking do not apply.


The submitted app adds optional notifications, small and medium Home Screen widgets, offline last-known readings, system sharing and appearance controls. Routine updates to the same development do not repeatedly notify the same threshold.

4. External services

The app and widgets read Newsworthy's public HTTPS API on Vercel. Neon PostgreSQL stores readings, settings and optional notification registrations/delivery records. Expo relays requested notifications to Apple Push Notification service. The token and chosen minimum score support notification delivery only, not advertising or tracking.

The backend uses Anthropic Claude and web search to assess public news and group developments. Authorized external AI operators can also submit readings through a private API; this is not a public posting feature. No app-user profile, location or authored text is sent to news models. Hosting retains operational request/diagnostic logs described by the privacy policy. Expo/React Native/EAS build the app; WidgetKit provides widgets. Apple handles the download purchase. Support opens the user's email client; sharing uses the OS share sheet.

5. Regions

The same English-language global reading and features are offered across configured regions. Times follow the device locale/time zone. Store pricing, taxes and availability vary by storefront. Connectivity and OS scheduling affect notification and widget delivery.

6. Regulated services and third-party material

Newsworthy provides general news context, not regulated professional services. It displays generated scores and short factual sentences with original artwork, not publisher articles, photos, videos or media feeds. It does not sell licensed third-party content.
