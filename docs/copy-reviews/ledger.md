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

## Lessons

Claims that were wrong once. Check for them again; date each item.

- **"Enlarges the rating"** (2026-10-01, #155). Hiding the widget's app name
  gives its row to the rating and sentence at the same size; the numeral is a
  fixed 69 pt. `docs/mobile-release.md` had said otherwise.
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
