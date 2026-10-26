# Copy review ledger

Every copy accuracy review made with the
[PR copy review skill](../../.agents/skills/newsworthy-pr-copy-review/SKILL.md),
one row per PR, newest last. The full note stays in the PR description; this
is the index across PRs, so a claim corrected once is not reintroduced and a
limit left open is not forgotten. Entries are append-only. Read the Lessons
and the open limits before reviewing; add a row in the PR being reviewed.
Reviews before 2026-10-01 were recorded only in their PR descriptions.

| PR | Date | Surfaces reviewed | Corrected | Open limits |
|---|---|---|---|---|
| #155 | 2026-10-01 | README, product messaging, store listing, mobile release, design README, AGENTS.md | Mobile release: hiding the app name does not enlarge the rating; Appearance is a String parameter | Widget fix not yet seen on a device; Android unverified |
| #155 | 2026-10-01 | README, design README, mobile release, story timeline | Design README and story timeline: iOS header controls are native bar buttons; mobile release: Appearance declares its default | Header and widget default fixes not yet compiled or seen on a device |
| #155 | 2026-10-01 | store/listing.json, docs/product-messaging.md | Store description: "uses AI" and "AI assessments can be wrong" removed; timeline, New: label and per-widget settings added | Not yet pushed to App Store Connect; screenshots still show the old design |
| #201 | 2026-10-12 | README, AGENTS.md, product messaging, llms.txt, caller contract, rating skill, privacy and support | README documents `TRIAL_CALLER_TOKEN`, `/api/admin/trials` and caller trials; nothing user-facing changed | Trial cost figures are list-price estimates from one live run until measured session costs replace them |
| #204 | 2026-10-12 | README, AGENTS.md, caller trials, product messaging, llms.txt, caller contract, rating skill | README documents `TRIAL_CALLERS` and `&cohort=` in place of `TRIAL_CALLER_TOKEN`; trial doc adds cohorts and the Sonnet trial | Sonnet cost is estimated from other models' runs; its effort default differs at the API and is not observed in runs |
| #200 | 2026-10-11 | README, product messaging, llms.txt, caller instructions | None needed: no external copy states the judge's rules; caller instructions embed v5 themselves | Per-reading judgements not read (no admin token on this Mac) |
| #202 | 2026-10-11 | README, story timeline, AGENTS.md, support page, store listing and Review Notes, product messaging, llms.txt | Every "off by default" / "turn on the timeline" claim now says on by default | Listing and Review Notes not pushed to App Store Connect; build number 27 assumed |
| #199 | 2026-10-11 | README, product messaging, store listing, llms.txt, story age, design README | Design README: the iOS sentence steps down to 12.5 pt before truncating, and the line limit counts line spacing | Not compiled for iOS or seen in WidgetKit |
| #203 | 2026-10-12 | User actions, release and build ledgers, store listing | Listing description and Review Notes now live in App Store Connect, read back identical | No device verification of build 27; public availability not claimed |
| #205 | 2026-10-12 | App release skill | None needed: agent guidance only, claims taken from the build 27 records | None |
| #206 | 2026-10-14 | README, product messaging, llms.txt, caller instructions, rating skill, caller-review skill, AGENTS.md | Caller-review skill checks that a preview says what it will settle; no external copy states prompt wording | v23 adoption awaits verified readings; the judge still marks a preview "New:" |
| #207 | 2026-10-14 | README, product messaging, llms.txt, caller instructions, rating skill, caller-review skill, AGENTS.md | Caller-review skill checks for relative days; no external copy states prompt wording | v24 adoption awaits verified readings; pre-v24 sentences keep their "today" until replaced |
| #208 | 2026-10-14 | README, AGENTS.md, product messaging, mobile release, store README, store listing Review Notes, app release skill, preview video | README, product messaging, store README and mobile release: iOS builds locally with Xcode, Android in EAS; the Xcode 26.6 pin and the iOS 27 crash claim are replaced by UIScene adoption | Review Notes still say EAS builds the app, true of build 27 under review; correct at the next resubmission. UIScene build seen on simulators only; preview video already stale, nothing visible changed |
| #209 | 2026-10-14 | README, AGENTS.md, product messaging, mobile release, store listing and Review Notes, support and privacy, llms.txt, onboarding, story age | README, AGENTS.md and mobile release: the cron ticks hourly at :08 and intervals are whole hours; no external copy states a check frequency | Native apps keep the 60 s poll until their next build; Neon saving estimated, not yet measured |
| #211 | 2026-10-14 | README, product messaging, mobile release, llms.txt, app release skill, build ledger | App release skill names the top-level `/v1/betaGroups` lookup; mobile release's "add the VALID build to Release QA" stays true | `testers` not yet run end to end after the change; the next upload is its first run |
| Local Android release | 2026-10-15 | README, AGENTS.md, product messaging, mobile release, store README, user actions, llms.txt, app release skill, build and release ledgers | README, product messaging, store README, mobile release and the skill: Android builds locally with Gradle, not EAS; README's "Android EAS signing" is now the upload key | No Android build seen on a device; nothing uploaded to Play; public availability not claimed (llms.txt still says in preparation) |
| Play API uploads | 2026-10-15 | README, AGENTS.md, product messaging, llms.txt, mobile release, store README, user actions, app release skill, build and release ledgers | README: Android bundles are uploaded to Play testing tracks through the API; mobile release and the skill: version code 14 was the first upload, by hand, and the next comes from `next-version-code`; user actions: the Play key step | No upload yet made through the API; internal testing is not store availability, and none is claimed |
| Android onboarding widget and widget age | 2026-10-15 | README, product messaging, story age, onboarding copy, support page, store listing, preview video | Story age: the Android age layer was seen on a device and was broken, now fixed in source | Neither fix seen on a device yet; preview video already out of date and not re-rendered |
| #213 | 2026-10-15 | README, AGENTS.md, caller trials, product messaging, llms.txt | Caller trials: both trials stopped, Opus kept, live Routine is `trig_016SyC1SeVmdenHGg9gPRymC` without connectors; Sonnet's $0.61 estimate corrected to the measured $0.22–0.23. README's trial pointer and `TRIAL_CALLERS` row stay true: the mechanism remains | Trial costs are `cost_usd` list prices from Routine sessions, not billed amounts |
| Play listing and App content | 2026-10-15 | README, product messaging, store listing, privacy and support pages, llms.txt, disclosures, user actions | store/listing.json gains an Android description (one resizable widget, "home screen" lower case); App content answers recorded with their evidence and differences | Play artwork is out of date (separate session); Data safety deletion URL unanswered until the privacy page has a deletion section; nothing public on Play |
| Privacy deletion section | 2026-10-15 | Privacy page, support page, README, product messaging, llms.txt, store disclosures, push deletion code | Privacy page gains Delete your data with the steps; store disclosures record why it names no log retention period | Play Data safety answer not yet saved; Settings path not seen on a device for this change |
| Play deletion record | 2026-10-15 | Google Play app content record, release ledger, privacy page | App content record: the deletion question is answered Yes with the privacy anchor, no longer left blank | Saved App content changes not yet sent for review |
| Play internal release 14 | 2026-10-15 | README, product messaging, llms.txt, store listing, user actions | None needed: ledgers only; llms.txt's "in preparation" stays true because internal testing is not public availability | No tester has installed 14; listing not entered in Play |
| Play artwork v15 | 2026-10-15 | README, product messaging, store listing and googleDescription, store README, user actions, llms.txt, mobile release, app release skill, gallery captions, build and release ledgers | Store README: Play artwork is current from versionCode 15 and the listing is saved, not sent for review; the stale "Create app is disabled" status replaced. Mobile release and the skill: the service account also manages store presence and edits the draft app. Captions use listing wording ("resizable", "home screen") and never mention AI; the timeline frame skips an entry naming an AI company | Emulator captures only; live sentences of 15 October; listing not sent for review, no store availability claimed |
| Block unused Android permissions | 2026-10-15 | Mobile release, Play App content record, privacy page, store listing | Mobile release lists the new bundle check; no user-facing copy states permissions | Takes effect from versionCode 16; Play's permissions list updates when 16 reaches a track |
| Play upload readback, version 16 | 2026-10-15 | App release skill, build and release ledgers, store listing | Skill: save Play console listing edits with Save before an API commit | No user-facing copy changed; nothing public on Play |
| Play closed test submitted | 2026-10-16 | Store listing, release notes, product messaging, README, llms.txt | Closed-test release notes kept neutral (an "open it daily" draft was dropped as an engagement prompt) | In Google's review; not available to anyone yet; no store availability claimed |
| #226 | 2026-10-19 | README, AGENTS.md, caller trials, product messaging, llms.txt | README and AGENTS.md point to the new caller trial skill; caller trials' promotion steps now change the live Routine's model, as the skill does. No external copy names the caller's model | The skill's Routine steps are written from the October trials, not yet run as written |
| Story name casing | 2026-10-23 | README, product messaging, llms.txt, story age, story timeline, store listing, preview video | None needed: every copy example ("US Iran War") still renders the same; no copy states how story names are capitalised | Not seen on a device; a name whose word its sentences never capitalise still falls back to title case; preview video already stale, nothing it shows changed |
| Build 28 TestFlight record | 2026-10-20 | README, mobile release, store README, store listing and Review Notes, app release skill, build and release ledgers | Release and build ledgers: build 28 uploaded to TestFlight on 14 October (`IN_BETA_TESTING`), no longer "archived, not uploaded"; carried from #210, closed unmerged. Mobile release already says UIScene was checked on simulators only | Build 28 not yet seen on a physical iPhone; TestFlight state is as observed on 14 October, not re-read; build 27 stays the App Review build |
| YouTube trailer | 2026-10-21 | Product messaging, store listing price and Review Notes, onboarding copy, push title, widget copy, release ledger, AGENTS.md | Product messaging records the owner's trailer exception (doomscrolling, the price and what it excludes) and where the trailer's script lives | "On the App Store" and $1 hold only once the listing is public at that price (`apple.release` waits on the Paid Apps Agreement); the sound was measured, not heard; the phone is a reconstruction, not a capture |
| Growth skill and ledger | 2026-10-21 | README, AGENTS.md, product messaging, llms.txt, store listing, release ledger | None in this change: the skill and ledger are internal, and the YouTube post copy in the ledger follows product messaging and the trailer's exception | Found stale since launch: `llms.txt` (iOS "in preparation", pricing "not yet confirmed"), README (build 26 "Waiting for Review", "planned store release") and product messaging ("planned iOS and Android release"); queued as the growth ledger's first quick win, for their own PR |
| YouTube Shorts framing | 2026-10-21 | README, AGENTS.md, product messaging, llms.txt, store listing, the trailer and its README, growth and reel skills | None needed: ledgers and agent guidance only. The trailer's copy is unchanged; what changed is where it is known to sit on a phone | The posted Short is framed badly until the owner decides on a re-framed upload; only the owner's iPhone view is measured |
| Trailer re-frame | 2026-10-21 | The trailer's script and README, product messaging, store listing price, growth and reel skills, AGENTS.md | None needed: no line on screen changed, only where and how large it is set; the README now says the film keeps to the Shorts safe zone | The new cut is not yet posted or seen on a phone; the price and "On the App Store" stay true while the listing is public at $1 |
| Trailer restage | 2026-10-21 | The trailer's script and README, product messaging, growth and reel skills | None needed: the same lines, now set as one-line headlines; the README describes the new staging | The new cut is not yet posted or seen on a phone |
| Trailer thumbnail | 2026-10-21 | The trailer's script and README, product messaging, growth ledger's pinned comment | None needed: the thumbnail quotes the script's line; the pinned comment repeats the description's claims ($1, no ads, no subscription) | Shelf rendering at real size not seen |
| iOS availability | 2026-10-22 | README, product messaging, llms.txt, support and privacy pages, web head, onboarding, store listing, store README, user actions, mobile release, store listing doc, release ledger, preview video, trailer | README, product messaging, llms.txt, support page, store README, user actions, mobile release and store listing doc: iOS is on the App Store at $1 since 21 October, no longer pending; Android stays closed testing only. Web gains an App Store link (Smart App Banner, support page, llms.txt); `apple.bank` closed. A test now holds these surfaces to it | Smart App Banner not yet seen in iOS Safari after deploy; preview video already stale from earlier source changes, no line changed; Apple Business not re-read for the bank gate |
| Widget sentence behind its age | 2026-10-24 | README, AGENTS.md, product messaging, story age, design README, store listing, support page, llms.txt, preview video | Product messaging, story age and AGENTS.md: the age prefix no longer counts against the sentence's 135 characters. Design README's "truncates only below that" was false whenever an age showed, and is now true for prompt-length sentences | Not seen on a device; reaches phones only with the next iOS and Android builds; preview video already stale, no line changed |
| Shared app-release 2.5.2 consumer PR | 2026-10-25 | README, AGENTS.md, product messaging, repository release skill, shared release guidance and build/release ledgers | None needed: this changes shared release tooling/guidance only; app behavior, configuration, listing copy and availability evidence stay unchanged | Read-only ledger commands pass with an existing inferred-evidence warning; video stale command cannot load missing sharp in the isolated worktree, and preview inputs are unchanged; no fresh provider, UI or native evidence claimed |
| #243 scope update — shared app-release 2.6.1 | 2026-10-25 | README, AGENTS.md, product messaging, repository/shared release guidance, public/caller and store boundaries, build/release ledgers and preview stale report | None needed: the shared native-QA, IAP review screenshot and image-only submission guards change tooling only; no Newsworthy purchases or runtime behavior are added | Earlier preview input drift remains, with displayed lines matching source; provider state and native UI are not re-verified. npm suite and the separate opt-in Swift widget-store test pass |
| This PR — shared app-release 2.7.0 | 2026-10-25 | README, product messaging, caller/release boundaries, store records and preview staleness | No public copy change: additive issue-closure tooling; historical 16/17 attempts explicitly superseded by observed replacement18 recovery | Preview source manifest remains out of date for nine inherited inputs; this tooling diff changes none. On-screen text matches, but film visual parity was not freshly verified. Current external gates are preserved. |
| This PR — shared app-release 2.7.1 | 2026-10-26 | README, AGENTS.md, product messaging, app-release guidance, release records and preview staleness report | None needed: session-continuity wording and gitlink change no public behavior, contract or availability | Inherited preview manifest is out of date for nine inputs; on-screen lines match source; no rerender, fresh visual parity or native/device claim |

## Lessons

Claims that were wrong once. Check for them again; date each item.

- **"Enlarges the rating"** (2026-10-01, #155). Hiding the widget's app name
  gives its row to the rating and sentence at the same size; the numeral is a
  fixed 69 pt. `docs/mobile-release.md` had said otherwise.
- **A default lives in stored state too** (2026-10-11, #202). Changing a
  preference's default changes nothing for installs that already saved the
  old default; say whether upgraded installs see the change.
- **Simulator is not device** (2026-10-01, #155). A widget verified on iOS
  simulators is described as such; claim a device only once one has shown it.
- **A release does not update the copy written before it** (2026-10-22). On
  launch day `llms.txt`, README and product messaging still called iOS
  pending. When a store gate turns done, update every surface in product
  messaging's "Where copy lives"; `test/copy.test.js` checks the main ones.
- **A character guard can cut before the layout does** (2026-10-24). The
  design README said the iOS sentence truncates only below 12.5 pt, while the
  shared 140-character guard had already cut it whenever an age prefix showed.
  A claim about layout truncation holds only if no text guard runs first.

## Resubmission preparation, 1 October 2026

- **PR #155 follow-up:** reviewed the final source, TestFlight readback,
  listing, generated palette, renderer, release instructions and PR description.
  Corrected the PR description's withdrawn declared-default fix and its stale
  claim that the final header controls had never compiled; build 26 compiled in
  EAS. Current public listing fields and six-part Notes are saved with Apple.
  The physical recording is explicitly historical build 21. The new Apple
  gallery renderer uses the current generated Stone palette, rather than the
  earlier mint gallery. Store README now leads with rejected build 21 and valid
  TestFlight build 26, retaining September states as history.
- **Open limits:** current native screenshots, native header interaction checks,
  screenshot upload, build-26 selection and resubmission remain pending the
  local iOS runtime download. The full Mac test run has two unchanged web
  Settings failures; design and type checks pass. Android still requires its
  separate device/release gates.

## Build 26 selection follow-up — 1 October 2026

| PR | Date | Surfaces reviewed | Corrected | Open limits |
|---|---|---|---|---|
| Build-26 release follow-up (`codex/app-store-resubmit-155`) | 2026-10-01 | Store release identifiers, README, owner actions, mobile release, product messaging, provider receipts, release ledger | Current selected build is 26 with Prepare for Submission; old builds, physical QA and September review states remain historical. Local Mac/Xcode verification is supported, with current runtime prerequisite explicit | Gallery capture/upload and resubmission pending runtime download/unlocked Mac. Physical build-26 and Android checks remain separate. Mac web test failures remain recorded |

The build-26 selection follow-up above is [PR #192](https://github.com/astrojams1/newsworthy/pull/192), opened as a draft while native capture and resubmission remain pending.

## Expo capture follow-up — 1 October 2026, PR #192

Reviewed current app captures, generated Stone artwork/captions, metadata,
store README, owner actions, mobile release, release receipts and skill guidance.
Seven actual app images are uploaded with provider COMPLETE/checksum readback;
old reading screenshots are replaced. Claims distinguish source 51826ed, actual
simulator bundle 1.0.0 (1), production build 26, and historical widget/physical
recording evidence. Public screenshots omit About and retain factual finite-week
list, reading, appearance and threshold claims. Caller/rating contract and
product behavior are unchanged. No public App Store preview video is planned.
The default renderer still requires both verified native widget frames; its
explicit --app-only mode prepares the seven app assets while that gate waits.
Open limits: actual current widget image, local unlock, final resubmission and
physical build-26 QA. Design checks pass 111/111; full Mac tests retain the two
unchanged web Settings failures (386 pass, 2 fail, 1 skip).

## Completed gallery and resubmission — 1 October 2026, PR #192

Reviewed final native artwork, source hashes/runtime provenance, listing and
six-part Notes, root/store READMEs, owner actions, mobile release, release JSON,
canonical ledger and repository release skill. The five iPhone/three iPad images
are COMPLETE with checksum/order readback. Both families lead with the actual
finite-week timeline; iPhone includes the owner-requested Notifications root
page and actual Small Light/Medium Dark widgets without other apps/wallpaper.
All previous gallery images are retired. The selected VALID production build26
and review submission independently report WAITING_FOR_REVIEW at11:37:37UTC.
Mac-unlock, pending-widget/build and unsubmitted claims were corrected.

Claims distinguish source51826ed, simulator bundles1.0.0(1), cloud iOS26.5 app
screens, local iOS18.3.1 Notifications/widgets, production build26 and historical
build21 physical video. No public App Store preview is included. Public product
copy, caller/rating contracts and application behavior are unchanged. Previous
widget settings evidence remains separate; name-hiding and physical build26
certification were not reverified. Banking/address and Android owner-only gates
remain dated September24 observations, not fresh account checks.

**Lesson:** an AppIntent privilege log suggests an investigation; it does not
prove signing is the sole failure cause. The original EAS extension also had
empty entitlements and worked on iOS18.3.1. Final masking must preserve all native
text; brightness thresholds can misidentify a gradient edge, so measure and
mirror a symmetric container silhouette and inspect the result.

Validation: all13 manifest image formats/sizes and listing lengths pass; design
111/111 passes; canonical ledger and whitespace checks pass. Full Mac tests:
386 pass,2 unchanged web Settings failures,1 skip. An initial concurrent run also
hit a transient local-server connection refusal; the standalone rerun passed
that landscape test and retained only the same two Settings failures. No test
was weakened. Linux CI is checked separately before merge.

## Unpadded widget hours — 1 October 2026, fix/widget-hour-format

Reviewed README, product messaging, story-age documentation, widget picker and
checked-time copy, Support, llms.txt, store listing, release claims, existing
native captures and the preview video's stale-input report. Updated story-age
documentation to specify “Checked at 7:04”, an unpadded hour and two-digit
minutes in either device hour cycle. Existing “Checked at 10:21” examples remain
accurate; no caller, rating, API or availability contract changes.

Open limits: native compilation and visual verification of this formatting
change were not performed here. Build 26 and historical screenshots retain their
original behavior; a replacement native build is needed. The preview video is
out of date (the checked line and widget scene report changed Swift input); it
was not re-rendered, and no public App Store preview is included in the current
submission. Existing source/geometry evidence was reviewed without changing
captures or claiming new native verification.

## Settings → Publisher — 19 October 2026, claude/play-news-publisher-page

Google Play rejected closed-test version 16 under its News and Magazines policy
(publisher and author ownership information). Added Settings → Publisher: who
publishes and edits (James Thompson, operating as AstroJams, as in the store
listing's copyright line), that a reading is written by Newsworthy and does not
republish articles, and a tappable contact email. Reviewed README (settings
table and route list), product messaging (Settings contents, no-AI and no-outlet
rules), Support (the Settings sentence now mentions Publisher), llms.txt, store
listing and the preview video's stale report (no scene shows Settings' About
list). No date, timestamp or rating-contract change; the owner chose to leave
dates out. The page says nothing about AI, models or outlets.

Open limits: the owner confirmed the named publisher and editor on 19 October.
Native iOS and Android rendering of the new page and row was not verified; the
web page was checked in a 390-pixel viewport only. The Google appeal and the
new Play build are separate gates. The web Settings trailing-mark test fails on
this Mac with and without this change ("Support: trailing ink 10.7pt against
13.0pt"), as the 1 October entry records for local runs.

## Guideline 2.3 "New and Ongoing" — 20 October 2026, claude/apple-metadata-new-ongoing

Apple rejected build 27 under Guideline 2.3: the reviewer (iPad Air 11-inch M3)
could not find "New and Ongoing". That was the description's "NEW AND ONGOING"
heading, read as two features. It is now "STORY AND AGE", and the copy says what
is always on screen: the muted line that first shows "Checked … ago", then the
story and its age, tap to switch; and that "New:" appears only for a
development's first two hours. Checked against build 27's source (f9ffa29:
`storyLine`, `checkedLine`, `NEW_LABEL`). Review Notes lead with the same
explanation, trimmed to 3,984 of Apple's 4,000 characters. The Google
description changed in source alike; it is not pushed to Play while version
17 is in review.

**Lesson:** a description heading reads to App Review as a feature name. Name a
section after what the reader sees, and qualify anything shown only some of the
time.

## User research 2026-10-01-01 — 1 October 2026

PR branch: `research/news-needs-2026-10-01`. Reviewed the research/opportunity
diff against `0a31d00`, README, product messaging, current reading/Settings,
mobile introduction, Support, llms.txt, caller/submission contract, store listing,
build-21 notification evidence, Android build-12 verification, build-26 submission
and the preview-video stale report. Research adds no product capability, changes
no rating/prompt/API contract and does not alter public positioning.

Corrected current research coverage: age/check labels, optional alerts and the
finite-week optional timeline are implemented; Support is in Settings; a mobile
introduction exists; the removed OpenAPI file is no longer a current contract
link. Preserved dated older findings, reused evidence IDs and uncertainty about
comprehension. Support no longer promises a widget date on older readings or
says notification delivery is categorically unavailable in TestFlight; it now
states the compatible-build/permission requirement without claiming physical
delivery verification or public availability.

Open limits: no Newsworthy usability session, production-citation audit, fresh
store-status readback or native rebuild/device verification in this run. Reddit
and vendor support were inaccessible; the convenience sample is not prevalence
or willingness-to-pay evidence. The preview video is already out of date under
its stale-input check; this research does not change its inputs or re-render it.
No public App Store preview is included in the current submission.

**Lesson:** a help statement saying a capability is unavailable can become stale
after credentials and receipt checks land. Replace it using the specific evidence
boundary; provider acceptance still does not establish physical presentation.
Widget-date wording must follow the current formatter, not historical captures.

Merged with main on 20 October 2026. Support keeps main's Settings sentence
(timeline on by default, Publisher) and takes this entry's notification and
widget "Checked at" sentences, which still match main's formatters. Nothing on
main since claims or denies TestFlight delivery.
