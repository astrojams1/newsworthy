# Store listing preparation

Draft copy for the planned mobile release. Native builds and widgets still
need compilation and device verification before this copy is submitted.

## Suggested copy

**Name:** Newsworthy

**Apple subtitle:** A calmer way to check the news

**Google Play short description:** A number out of 10 and one sentence explaining the news.

**Description:**

Stay connected to the world without getting pulled into the feed.

Newsworthy is a calm global status indicator: a number out of 10 and one sentence
explaining why. An AI model assesses how consequential the news is. The displayed
score fades as developments age. Check in, then get on with your day.

A one-time download purchase helps cover the cost of running the service.

No doomscrolling. No subscription. No in-app purchases. No ads. No engagement,
addiction or growth-hacking tactics.

Constant news can leave us anxious. Switching off entirely can leave us out of
touch. Newsworthy offers a calmer middle ground. See the latest reading, keep it
available offline, or add a home-screen widget to see the rating and update time.

AI assessments can be wrong. Saved readings may be outdated, and widget refreshes
depend on your device's background scheduling. Every reading includes its update time.

**Suggested category:** News

**Review notes:** Paid download; no login, subscription or in-app purchases.
Tap “Newsworthy” (the About icon at large text sizes) to open About and the
privacy/support links. The Share button opens the system share sheet.
Open online, then relaunch without a connection
to test saved readings. Add Newsworthy through the system's widget picker to test
the home-screen rating. Widgets update independently and retain the original
timestamp when a connection is unavailable.

## Pricing

The requested launch price is a **one-time US$1 download** on iOS and Android,
with local store equivalents, to help offset service costs. This is the intended
price, not a confirmation that either store has been configured. Keep exact
prices out of the localized description; the store displays its local price.

- Apple: select United States as the base region and US$1.00 from the available
  price points, including “See Additional Prices” if necessary. If that exact
  price is unavailable, record the available choices before changing the target.
  The account holder must have completed the Paid Apps Agreement and required
  tax/banking setup. Verify the saved price schedule before submitting for review.
- Google Play: create the app as **paid** and set its US price to US$1.00, then
  review local prices. Complete the payments profile. Do not launch it free as a
  temporary workaround: an app offered for free cannot later become paid under
  the same package name.
- Store commissions and applicable taxes reduce proceeds; US$1 is the customer
  price target, not a promise of US$1 in net revenue per download.

References: [Apple app pricing](https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price),
[Google Play app pricing](https://support.google.com/googleplay/android-developer/answer/6334373?hl=en).

## Privacy and support pages

- Privacy policy: https://newsworthy-indol.vercel.app/privacy
- Support: https://newsworthy-indol.vercel.app/support
- Contact: astrojams1@gmail.com

The pages use simple boilerplate covering actual app storage, technical request
information and email support. Keep the published policy aligned with future changes.

### Store privacy disclosures

The notes below help complete store disclosures; they are not a substitute for
checking the deployed infrastructure and the questions in each store console.

- The app and widgets request a public rating from the Vercel-hosted service.
  Hosting infrastructure receives ordinary connection metadata such as IP
  addresses and request information. Document retained logs, purposes and retention.
- Only the last public reading is saved locally: AsyncStorage in the native app or browser local storage on web. Widgets
  maintain separate native caches.
  This saved reading is not uploaded as user activity.
- This repository includes no user accounts, advertising SDK or app analytics SDK.
  Check any analytics/logging separately configured on the hosting service.
- User-initiated sharing sends the chosen reading to the recipient/service chosen
  in the system share sheet.
- The server's model processes news headlines. The mobile client sends no
  user-written content, user profile or device location to the model.
- Account for any external privacy/support pages' cookies, analytics and handling
  of support messages in the final policy.

The app and widget iOS manifests declare UserDefaults access for app-owned saved
data (`CA92.1`), no tracking, and no collected native-client data types. They do
not replace store privacy answers or review of backend logs. Do not automatically
answer “no data collected” without checking the actual deployed infrastructure.

## Still needed

- Registered app and widget identifiers; developer account ownership.
- Operator identity for store/legal fields. Support contact and policy/support
  pages are already published at the URLs above.
- Store privacy/Data safety and content/age-rating questionnaires.
- Screenshots from actual signed builds at each store's required sizes.
- Google Play feature graphic and any other console-requested artwork.
- Physical-device testing, store-specific testing requirements and launch settings.

## Icon decision

The approved icon is the white dash on a near-black background. Widgets carry
the rating; the launcher icon stays consistent. The website favicon already
changes to the displayed score. See [Apple's alternate-icon behavior](https://developer.apple.com/documentation/xcode/configuring-your-app-to-use-alternate-app-icons).
