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
