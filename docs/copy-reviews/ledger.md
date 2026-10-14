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
| #210 | 2026-10-14 | README, mobile release, app release skill, store listing, release and build ledgers | None needed: the script fix changes no documented behaviour; ledgers record build 28 in TestFlight, not App Review or public release | Build 28 not yet seen on a device; Review Notes still name EAS (build 27 is the one in review) |

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
