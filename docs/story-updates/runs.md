# Story update runs

The ledger of [the story update prototype](../../.agents/skills/newsworthy-story-updates/SKILL.md). It is append-only: add an
entry after every run, newest last, and never rewrite an earlier one. Read the entries before a run so it starts from
what earlier runs learned.

## 2026-11-14 04:30 UTC, first run

- **Input:** the live `/api/timeline`, with six stories whose newest development was under 72 hours old, and
  `/api/current` (Nvidia, 5).
- **Workers:** three agents with two stories each, following the first draft of the skill.
- **Output:** [updates-20261114T0430Z.json](updates-20261114T0430Z.json).

| Story | Last on record | Update | Kind |
| --- | --- | --- | --- |
| faa-outage | Nov 13 22:06, US departures halted | The FAA lifted the halt at 01:15 UTC Nov 14 after more than four hours | resolution |
| iran-war | Nov 13 09:04, Iran claimed it destroyed a US radar in Bahrain | The US military said it shot down 2 drones and denied the claim, by 13:33 UTC | denial (filed as correction, a kind added after this run) |
| ai-stocks | Nov 11 20:04, CoreWeave results lifted AI stocks | AI stocks fell again and CoreWeave gave back most of its gain, Nov 13 close | reversal, borderline |
| bond-selloff | Nov 13 20:05, long-term yields above 5% | none; the close only restated the week | |
| bitcoin-slide | Nov 13 05:04, below $70,000 | none; a deeper low (below $67,000) is a revised figure | |
| nvidia-spy | Nov 13 11:04, Huang resigned (on screen: chip stocks fell, 17:03) | none; a CEO-search report was answered by the board, and a subpoena deadline passed unreported | |

### What the run taught the skill

All of these are now in SKILL.md:

- **Live pages carry old publish dates.** The FAA and Iran pages were first published before the news they now report.
  An archived copy settled when the Iran denial appeared.
- **Price stories needed their own test.** Without one, the bitcoin and AI-stock calls were judgement calls that
  another run could make differently. A move now counts only when it reverses the recorded direction or an official
  acts.
- **The on-screen reading is on record.** A continuation reading never opens a development, so it was missing from
  the input. The helper now reads `/api/current`.
- **New kinds and fields.** A `denial` kind was needed. So were `sources_read` and `note` for "no update" answers,
  and `modified` on sources.
- **Search.** Queries with dates returned last year's pages. Names of people and bodies worked better.

### Design findings for B

- **An update can sit far below its own time.** The ai-stocks update is 7 hours old, but the entry it hangs on is 2
  days old, so in B it sits at the bottom of the timeline. Open question: should an updated entry move up to its
  update's time?
- **The current reading had no update,** so the home screen looked as it does today. B only changes the home screen
  when the story on screen has moved on.

## 2026-11-14, design review of the first run (no new run)

- **Timeline order:** the owner chose to sort by latest update. An updated entry moves up to its update's time and
  shows the rated sentence beneath it as `Rated <age> ago:`. On the first run's data, AI Stocks moved from the bottom
  (2d) to second (7h), and Iran from 19h to 14h.
- **The home screen rarely has an update.** The FAA halt led at 22:06, but by 04:04 the sentence was back on Nvidia,
  and the lift at 01:15 never became a reading. The hourly readings between those times weren't checked: no caller or
  admin token was available to this run.
- **"Where this goes" in the skill now covers what happens when an update becomes a reading.** An update is stored as a
  development with no score, under its own id. A later reading of the same event is filed under it, and a newer
  development replaces it. Two proposals remain for the owner: separate `New:` and `Update:` labels, and whether a
  resolved development should keep competing for the number.

## 2026-11-14, owner decisions (no new run)

- **Two labels:** `New:` for a development in a new story, `Update:` for a newer development in a known one (owner,
  2026-11-14). `Update: ` is 8 characters, so readings must drop to 132 characters, which needs a new prompt version.
- **The headline never has an update** (owner, 2026-11-14). Rating and update checks run in one hourly job, so the
  reading is always its story's latest word: it can *be* an update but never *has* one. The home screen and widgets
  therefore change only their label. The job checks the headline's own story before it submits, because a rater can
  name a bigger but older development, such as a halt already lifted.
- **Second and later updates:** every update is stored, but an entry shows only its newest. Each new update is
  written to stand beside the rated sentence on its own.
- **Updates never touch the number** (owner, 2026-11-14). A development whose update resolves or denies it, like the
  lifted FAA halt, keeps competing for the number and fades on the usual 48-hour half-life.

## 2026-11-14, built end to end (no new run)

The prototype is now the product. What was built, so the next run starts from it:

- **The check runs every hour.** Caller instructions section 5 holds the rules, moved out of this skill so there is one
  copy. The live caller reads them each run, and this skill now runs the same check by hand.
- **Server.**
  - `POST /api/updates` stores updates in `story_updates`, checked by `checkStoryUpdate()`.
  - `/api/timeline` gives each entry `update` and `activity`.
  - `/api/current` gives `explanation_label` (`New` or `Update`).
- **Prompt v25.** Sentences are at most 132 characters, so "Update: " fits.
- **App.**
  - The timeline sorts by activity and shows design B.
  - The home screen and both widgets show "Update:" where the story was already on record.
- **Decided while building:** an update shows only while it is its story's newest word. Once a reading opens a later
  development, the entry falls back to its rated sentence alone. The plan before this said an older entry keeps its
  last update as history. Without asking the judge, the server can't tell whether that reading reports the update's
  own event, and the timeline would say it twice when it does. Every update stays stored, so this can change later
  without losing anything.
- **Changed from the plan:** a reading that reports a stored update's event is not filed under the update. The judge
  prompt is unchanged, so readings file as they always did, and the rule above keeps the timeline from repeating
  itself.

## 2026-11-14, timeline order and placement changed (owner, no new run)

The owner asked for the timeline to stay sorted by the original story and for the update to go below. Each entry now
keeps its place by first coverage, and its rated sentence leads. The update follows a size smaller (15/23), with
**Update:** in bold, and the tag line adds when it came ("FAA Outage · 7h ago · updated 4h ago"). `/api/timeline` no
longer sends `activity`, and the app no longer re-sorts. The first build's order and "Rated 6h ago:" line are gone. Its
screenshot, `qa/2026-11-14-timeline-web.png`, shows the superseded design. The current one is
`qa/2026-11-14-timeline-web-update-below.png`.

## 2026-11-14, the update set apart (owner, no new run)

The owner asked for "a bit of visual hierarchy" for the update. It is now its own block under the rated sentence: 16pt
below, indented behind a thin muted rule, with a small caption ("Update · 7h ago") above the update's sentence at
15/23. The update's age moved out of the tag line into the caption. Screenshots in both appearances:
`qa/2026-11-14-timeline-web-update-block-dark.png` and `-light.png`.
