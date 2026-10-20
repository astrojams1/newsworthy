# Google Play app content

Proposed answers to Play Console's App content declarations for Newsworthy
(`com.astrojams.newsworthy`), with the evidence behind each. These are the
owner's declarations to Google: nothing here is entered until the owner
approves it, and each section records when it was entered and read back.
Evidence is in [disclosures.md](disclosures.md), the
[privacy policy](https://newsworthy-indol.vercel.app/privacy) and the merged
manifest of version code 15 (`bundletool dump manifest`, 15 October 2026).

Status: **approved by the owner and entered in Play Console, 15 October 2026.**
App content reads back "You're all caught up" with 11 actioned declarations
(Privacy policy, Sign in details, Ads, Advertising ID, Government apps,
Financial features, Health apps, Target audience and content, Content ratings,
News and magazine apps, Data safety), each last edited 15 October. Saved
changes wait in Publishing overview until they are sent for review.

### Where the entry differed from the proposal

The forms asked things the proposal did not anticipate. Each was answered from
the proposal's facts, and none adds a claim:

- **Content rating category.** The questionnaire no longer offers "Reference,
  news or educational"; its own text files news apps under **All Other App
  Types**, and a later question, "Is the app primarily a news or educational
  product?", was answered Yes. Ratings-relevant content was declared as online
  content (the sentences are fetched, not packaged): violence and drugs
  referred to in text only, never depicted or the app's purpose. IARC returned
  ESRB Everyone 10+, PEGI 3, USK 6+, ClassInd All ages, IARC 3+, lower than
  Apple's 17+, because news products are treated leniently. Completing the
  questionnaire accepts IARC's terms; its contact email is astrojams1@gmail.com.
- **Target audience.** 18 and over only. Play then offered an optional "Restrict
  users that Google has determined to be minors"; left off, as it was not in
  the proposal.
- **News and magazine apps.** On behalf of the account's legal entity,
  AstroJams; contact page https://newsworthy-indol.vercel.app/support (it
  lists astrojams1@gmail.com); category Commercial / private; not an aggregator
  (the app shows its own sentence, not publishers' content); topic News and
  current events; no YouTube channel; no published editorial guidelines,
  journalistic standards groups, awards or industry memberships.
- **Data safety, deletion.** The question is optional and answering Yes
  requires a public URL that prominently lists deletion steps, what is deleted
  or kept, and retention. It was first left unanswered: the privacy policy had
  the facts but not that layout. PR #218 added a "Delete your data" section,
  live at https://newsworthy-indol.vercel.app/privacy#delete-your-data, and
  with the owner's approval the question was answered **Yes** with that URL
  and saved on 15 October. Read back after a reload: Yes selected, Delete data
  URL as above.
- **Data safety, diagnostics purposes.** "App functionality (operation,
  security, troubleshooting)" maps to three of Play's purposes: App
  functionality, Analytics (Play's definition includes diagnosing bugs and
  monitoring app health) and Fraud prevention, security, and compliance. All
  three are ticked. The push token and the minimum score are App
  functionality only.
- Accounts: "My app does not allow users to create an account"; no login with
  accounts created outside the app.

Play's Data safety preview: no data shared with third parties; collects
Diagnostics, Other actions, and Device or other IDs; data encrypted in
transit; privacy policy linked. Since 15 October it also shows **Data
deletion**: users can request that data be deleted, linking the deletion URL.

## Privacy policy

`https://newsworthy-indol.vercel.app/privacy`. It covers the website, mobile
apps and widgets, notification registration (push token, platform, minimum
score; Expo and Google), hosting logs, local storage and support email.

## App access

All functionality is available without special access. There is no account,
login, paywall inside the app or region lock to explain to reviewers.

## Ads

No, the app contains no ads. There is no ad SDK, and the manifest has no
`com.google.android.gms.permission.AD_ID`, so the advertising ID question is
also No.

## Content rating (IARC questionnaire)

Category: **Reference, news or educational**. The app shows a 1 to 10 rating
and one short generated sentence about world news, with no images. Proposed
answers, following Apple's saved declaration
(`ageRating` in [store.json](store.json)):

- Violence: news sentences frequently refer to real war, attacks and deaths, in
  text only, with no depictions or images. Answer yes to references to real
  violence, no to any graphic or depicted violence.
- Weapons: frequent text references in news, no depiction.
- Sexual content, nudity, profanity, crude humor: none.
- Controlled substances: occasional news references only.
- Fear or horror: occasional (disasters), text only.
- Gambling, simulated gambling, loot boxes, contests: none.
- User interaction: no chat, no user-generated content, no sharing of the
  user's location, no unrestricted web browsing. The system share sheet sends a
  reading only where the user chooses.
- Digital purchases: none inside the app; the app is a paid download.

## Target audience and content

Target age group: **18 and over** only. The app is not designed for or
appealing to children, consistent with Apple's 17+ (18 in some regions)
rating for frequent mature news themes. This also keeps the app out of the
Families policy.

## News apps

Newsworthy is in News & Magazines and presents news, so declare it a **news
app**. Publisher: James Thompson (AstroJams); contact astrojams1@gmail.com;
website https://newsworthy-indol.vercel.app/. It does not republish publisher
articles, photos or feeds (see Content rights in disclosures.md). Check the
form's current questions before answering; Google may ask for ownership and
editorial contact details shown on the website.

## Data safety

Overview: the app **collects** data; all of it is **encrypted in transit**
(HTTPS); none is **shared** (Vercel, Expo and Google's notification service
process it as service providers, which Play does not count as sharing); no
data is sold or used for ads or tracking.

| Play data type | Collected | Optional | Purpose | Evidence |
|---|---|---|---|---|
| Device or other IDs | Yes: the push notification token | Yes, only if notifications are turned on | App functionality | Privacy policy, Notification registration; `src/push.js` |
| App activity: other actions | Yes: the chosen minimum score | Yes, with notifications | App functionality | Same; stored with the token |
| App info and performance: diagnostics | Yes: hosting request logs (IP address, user agent, request time, errors) | No | App functionality (operation, security, troubleshooting) | disclosures.md, Vercel runtime logs |

Not collected: name, email, contacts, location (IP addresses are logged for
operation and security, not used to locate anyone), photos, files, health,
financial info, messages, browsing history, installed apps, crash reports from
an SDK. Support email is sent by the user from their own mail app outside
Newsworthy, so it is not collected by the app.

Deletion: answered **yes, users can request deletion**, with the URL
https://newsworthy-indol.vercel.app/privacy#delete-your-data (saved 15 October). Turning notifications off
deletes the token and minimum score at once; hosting logs expire on their own
(Vercel's retention); anything else can be requested at astrojams1@gmail.com.
Data is not processed ephemerally (logs are retained briefly), so do not claim
ephemeral processing.

## Government apps, financial features, health

- Government apps: No.
- Financial features: None. The app rates news; it gives no financial advice,
  trading, payments or lending.
- Health: None.

## Manifest permissions to remove in the next build

The manifest of version 15 carries `SYSTEM_ALERT_WINDOW` and
`READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE` from Expo's template; the app
uses neither. Blocking them (`android.blockedPermissions` in
`apps/client/app.config.js`) avoids questions in review. None of them needs a
Play declaration.
