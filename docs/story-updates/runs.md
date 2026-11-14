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
