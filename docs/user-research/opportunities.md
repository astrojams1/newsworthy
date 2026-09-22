# Newsworthy opportunity ledger

This is an evidence-backed discovery backlog, not an approved implementation
plan. Rank means **next question to validate**, not a commitment to ship.
Last reviewed: [2026-09-22-01](runs/2026-09-22-01.md), a small English-language
pilot with substantial historical evidence. See the [run ledger](runs.md).

## Current priorities

| Rank | ID | Action / proposal | Coverage | Status | Problem / solution confidence |
|---|---|---|---|---|---|
| 1 | [OPP-001](#opp-001) | Add an optional route to reporting behind the current explanation | Gap | Candidate | Low / low |
| 2 | [OPP-002](#opp-002) | Change how easily readers find the rating's scope and limits | Partly served | Candidate | Medium / low |
| 3 | [OPP-003](#opp-003) | Change how a fresh check is distinguished from a new development, if users confuse them | Partly served | Candidate | Low / low |
| — | [OPP-004](#opp-004) | Preserve finite checks, no ads and no unwanted interruptions | Already served by core design | Candidate: preserve | Medium / medium for preserving constraints |

No removal is proposed: this pilot found no evidence that an existing Newsworthy
feature should be removed. No feature is approved for development. A personalized
or local-news feed is outside the current product scope; the relevance need is
retained under OPP-002. Current absence of ads is a reason to preserve, not an
imaginary removal task.

Repository comparisons below refer to `27715d2`. Implementation inspection is
not device testing. [Store release evidence](../../store/README.md) says neither
mobile app is publicly released; tests and TestFlight are not store availability.

## OPP-001

**Need:** Some readers want concise information while retaining a way to check
context. Proposed **add**: an optional link to the reporting underlying the
displayed explanation, with no feed or automatic onward recommendations.

**Evidence:** [E-01](runs/2026-09-22-01.md#e-20260922-01-01) describes overload;
[E-07](runs/2026-09-22-01.md#e-20260922-01-07) values multiple-source context.
Two observations, two Reddit discussions, one source family, both from 2022.
Neither person used Newsworthy or requested this implementation. E-01's wish
for less material is also a reason an extra reading surface could fail.

**Coverage: gap.** [Reading screen](../../apps/client/app/index.tsx) exposes
sharing, Privacy and Support but no article citation. [Caller contract](../../src/caller.js)
and [OpenAPI](../../src/openapi.js) do not provide an article-link field in a
reading. The existing `source` field identifies ingestion origin, not a news
publisher. A link must actually support the displayed sentence; the sentence
and aged score can concern different developments. Never invent a citation.

**Priority reasoning:** Investigate first because losing context could undermine
the usefulness of compression. Problem confidence **low**: indirect, old
evidence. Solution confidence **low**: no direct test. Effort is unknown and
potentially substantial because trustworthy citation capture needs contract/data
work. Risks include unsupported provenance, extra reading burden and changes
to content disclosures. Preserve rating calibration and provenance.

**Smallest test:** First gather recent independent accounts about trust in brief
AI news assessments. If corroborated, use a static mock with an optional citation
and the current screen in a separately authorized usability session. Success:
readers can locate supporting reporting and still complete a brief check without
mistaking it for comprehensive coverage. Disconfirmation: they do not need the
link, it increases unwanted reading, or reliable sentence-level support cannot
be captured. Do not build a citation pipeline based on this pilot alone.

**Status:** candidate. First/last reviewed: 2026-09-22-01.

## OPP-002

**Need:** Readers want to remain informed about what matters to them, which may
mean local information or depth beyond a global score. Proposed **change**:
test whether existing scope/limitations help is findable and understood before
considering any additional explanation in the app.

**Evidence:** [E-01](runs/2026-09-22-01.md#e-20260922-01-01),
[E-04](runs/2026-09-22-01.md#e-20260922-01-04),
[E-07](runs/2026-09-22-01.md#e-20260922-01-07): three observations, three clusters,
two families. E-04 requests filtering; E-07 values depth. These challenge the
assumption that a single global reading serves every news need. They do not
establish confusion with Newsworthy itself.

**Coverage: partly served.** [Support](../../public/support.html) already explains
AI judgment, ageing, incomplete coverage and the emergency-service limitation;
the [app](../../apps/client/app/index.tsx) links to it. The
[messaging rules](../product-messaging.md) already prohibit personal-safety or
complete-briefing claims. Do not recreate the previously removed About screen
without user evidence. Local/personalized feeds remain outside scope.

**Priority reasoning:** Problem confidence **medium** for differing information
needs; solution confidence **low** for a discoverability fix. Likely small effort
if existing help is sufficient, but added text may clutter the core indicator.
This follows OPP-001 because scope understanding can be tested alongside trust;
it does not require expanding the app's remit.

**Smallest test:** In a separately authorized comprehension session, ask readers
using the existing screen/help what the score does and does not cover. Success:
they distinguish significance from personal safety and a full briefing without
coaching. Disconfirmation: existing help already works, or their actual need is
a local/full news service the product deliberately does not provide.

**Status:** candidate. First/last reviewed: 2026-09-22-01.

## OPP-003

**Need:** Repeated reporting should not look like a fresh event. Proposed
**change**: investigate whether readers can distinguish the last assessment time
from a development's age; only adjust the presentation if they cannot.

**Evidence:** [E-06](runs/2026-09-22-01.md#e-20260922-01-06), one observation,
one Reddit cluster, from 2019. This is about duplicate notifications, not a
Newsworthy timestamp. The connection to our display is explicitly an inference.

**Coverage: partly served.** [Current-reading logic](../../src/current.js) already
ages developments and discounts routine stories. The [screen](../../apps/client/app/index.tsx)
shows an update time, and [Support](../../public/support.html) explains periodic
updates. Score calibration must not change to make the app feel quieter.

**Priority reasoning:** Problem and solution confidence **low**. More current
evidence is needed before this outranks the first two questions. Effort could be
small for wording but larger across widgets; risk is implying a recent check
means a new event, or implying an old story means the service is broken.

**Smallest test:** Seek recent repetition/freshness complaints beyond Reddit,
then test comprehension using consecutive example readings with an unchanged
story and different update times. Success: readers identify what changed without
assuming a new event. Disconfirmation: current timestamp/help already suffices
or the observed problem is confined to alerts Newsworthy does not send.

**Status:** candidate. First/last reviewed: 2026-09-22-01.

## OPP-004

**Need:** A check should end, respect attention and have predictable costs.
Proposed **preserve**: the finite rating, absence of ads/subscriptions and
user-initiated access. Do not add reminders, streaks or a feed in response to
complaints about other products.

**Evidence:** [E-01](runs/2026-09-22-01.md#e-20260922-01-01),
[E-02](runs/2026-09-22-01.md#e-20260922-01-02),
[E-03](runs/2026-09-22-01.md#e-20260922-01-03),
[E-05](runs/2026-09-22-01.md#e-20260922-01-05),
[E-06](runs/2026-09-22-01.md#e-20260922-01-06): five observations, five clusters,
three families, covering distinct related pains rather than five votes for one
feature. Only E-02 is from 2026 and its precise cancellation cause is unknown.
Counterevidence: E-07 values deeper reporting, and E-02's thread includes positive
experiences. No willingness-to-pay estimate follows from these accounts.

**Coverage: already served by design.** [App](../../apps/client/app/index.tsx) is
a finite reading; [product constraints](../product-messaging.md) rule out ads,
subscriptions and engagement tactics. Widgets offer another access surface, but
availability and verification must be checked in the [release ledger](../../store/ledger.md).
Do not frame these absences as a public tagline contrary to current messaging.

**Priority reasoning:** Medium confidence in the pain and preserving the aligned
constraints, low confidence in any adoption prediction. No feature implementation
cost; regression risk grows if future additions obscure the core check.

**Smallest test:** Evaluate future proposals against whether users can understand
the reading and finish voluntarily, without extra alerts or content consumption.
Success is clarity and control, not session length or return frequency.
Disconfirmation of product fit: users need full/local reporting even after they
understand the scope. That is a segment mismatch, not permission to add a feed.

**Status:** candidate: preserve, not a newly implemented feature.
First/last reviewed: 2026-09-22-01.

## Decision history

| Date / run | Change | Why |
|---|---|---|
| [2026-09-22-01](runs/2026-09-22-01.md) | Created OPP-001–004; ranked validation questions, not builds | Pilot exposed context/attention tradeoff and existing coverage; evidence too weak for implementation commitments |
| [2026-09-22-01](runs/2026-09-22-01.md) | No removals; local/personalized feed kept outside scope | No demonstrated harmful Newsworthy feature; global indicator constraints remain |
