# Judge v7: a market move is one market in one session

Judge prompt `market-session-v7` (hash `36f0717d02bc13b7`, 3,166 characters),
added 2026-11-05. It is v6 byte for byte except v4's last sentence, which is
extended in place:

> A figure already reported moving again short of such a
> level, oil up 3% then 4%, restates its development only within one market and
> trading session. The same move in another market, or in a later session, is a
> later occurrence: a selloff in London and then in New York is two developments.

v6 is 2,982 characters, so the sentence could not fit under the 3,000 cap
`test/story.test.js` enforced. Tightening wording v1 to v6 share would have cost
the comparability every version since v2 has kept, so the cap is now 3,200.

## Why

On 2026-11-05 the owner got the hourly caller's run notification, "Newsworthy
reading 8/10: US stocks down about 4% midday Nov 5 in an AI and chip selloff
after the midterms", and opened the app to a 4 beside a sentence about South
Korea. No push notification fired.

Every reading of the selloff had been filed under reading 1740, the first report
of a chip selloff that briefly paused trading in Seoul at 05:04 UTC:

| Reading | UTC | Score | Sentence (abridged) | Judged |
|---|---|---|---|---|
| 1740 | 05:04 | 5 | South Korea's stock market briefly paused trading… | new |
| 1742 | 07:04 | 7 | South Korea's main stock index fell about 5%… | 1740 |
| 1750 | 15:06 | 6 | Chip stocks fell for a second day… | 1740 |
| 1751 | 16:04 | 8 | US chip stocks fell 11%… | 1740, "now deeper in US trading" |
| 1752 | 17:03 | 7 | …pulling US stocks down about 3%… | 1740 |
| 1753 | 18:04 | 8 | …pushing US stocks down 4%… | 1740, "Same post-midterm chip selloff deepening, no new record level" |

As a re-report, an 8 is noise around the development's usual level (about 6),
and the development itself opened routine in a 24-day-old story (×0.83) and had
aged to 3. The page showed an Iran development at 4 instead, with 1740's
sentence for the selloff.

v5 says anything after a development was first seen is a later occurrence; v4's
"oil up 3% then 4%, restates its development" says a move continuing is the
same development. The caller's notes ("deepening") follow v4. v7 states the
boundary v4 left implicit: one market, one session.

## Method

As for v6. For each reading, the judge message was rebuilt as it stood when the
reading arrived, from `/api/admin/history?hours=720`: the readings stored before
it over `PRIOR_HOURS`, roots older than that by id, and the story list over 14
days, passed through `judgeRecord()`. Records were 57,583 to 57,955 characters.
Each message went to a fresh Claude agent told only to read the file and answer
as the specification asks, with no word about what was being tested. One sample
per cell.

1752 and 1753 were judged twice. In the record as stored, the US readings sit
inside 1740, which is itself the misfiling, so v7 there was also run against a
counterfactual record in which 1751 opened its own development, as v7 filed it,
and 1752 restated it: the record v7 would have produced in production.

A first draft used "a selloff in Seoul and then on Wall Street" as its example,
the case that prompted it. It was replaced with London and New York, following
the convention in the v6 test, and the final wording was run again. Draft
results are kept below as exploratory.

## Results

| Reading | Kind | Production (v6) | v6 here | v7 draft | v7 final |
|---|---|---|---|---|---|
| 1751 US chips −11% | target | 1740 | 1740 | **new** | **new** |
| 1752 US stocks −3% | target | 1740 | 1740 | 1740 | 1751 (counterfactual record) |
| 1753 US stocks −4% | target | 1740 | 1740 | 1740 | 1751 (counterfactual record) |
| 1742 Seoul index −5%, same session | control | 1740 | 1740 | 1740 | 1740 |
| 1745 Asia chips, Seoul −5%, same session | control | 1740 | 1740 | 1740 | 1740 |
| 1743 Vance and oil −8%, restated | control | 1733 | 1733 | 1733 | 1733 |

Every answer kept the slug its story already had (`ai-stocks`, `iran-war`).

Notes as returned:

- 1751 v6: "Same chip selloff over Democratic Congress curbing AI data centers"
- 1751 draft: "Wall Street chip selloff, a different market from Seoul's recorded fall"
- 1751 final: "US chip selloff is another market than Korea's recorded fall"
- 1752 v6: "Same Nov 5 chip selloff, restated with broader US market figure"
- 1752 draft: "Same Nov 5 US chip selloff in the same session, restated"
- 1752 final: "Same US chip selloff, same session, dragging broader stocks lower"
- 1753 v6: "Same post-midterm chip selloff deepening, 3% to 4%, no record level"
- 1753 draft: "Same US chip selloff session, 3% fall now 4%"
- 1753 final: "Same US chip selloff, same session, deepening 3% to 4%"
- 1742 v6: "Same Seoul chip selloff session; index drop figure added"
- 1742 draft: "Same Korean chip selloff, same session, restated with index figure"
- 1742 final: "Same Korean chip selloff, same session, figure updated to 5%"
- 1745 v6: "Same Korea chip selloff, index down 5%, restated"
- 1745 draft: "Same Nov 5 Korea chip selloff, index down 5%, restated"
- 1745 final: "Same Nov 5 Korean chip selloff, index down 5%, restated"
- 1743 v6: "Restates Vance blaming Iran war for losses, oil falling"
- 1743 draft: "Same Vance remark blaming war for losses, same oil drop restated"
- 1743 final: "Same Vance remark and oil drop, figure restated"

## Front page, replayed

`displayedSeries()` over the stored series, at the production settings (48-hour
development half-life, 90-day story half-life), as stored and with 1751 opening
a development and 1752 and 1753 restating it:

| Reading | Score | Shown, as stored | Shown, v7 filing |
|---|---|---|---|
| 1750 | 6 | 4 aged (Iran) | 4 aged (Iran) |
| 1751 | 8 | 4 aged (Iran) | **8 new** (US selloff) |
| 1752 | 7 | 4 aged (Iran) | 8 aged (US selloff) |
| 1753 | 8 | 4 aged (Iran) | 8 aged (US selloff) |

The 8 clears the story's routine level of 5 by the shock margin, so it opens
whole, and the notifier, which announces the page's number, would have reached
devices at threshold 8.

## Findings

- v7 opened 1751 as a new development in both wordings; v6 filed it under
  the Seoul development, reproducing production.
- Given 1751 on record, v7 filed both later US readings under it as the same
  market and session, so the split stops at the market boundary rather than
  opening a development per hour.
- The three controls did not move: two later readings of the Seoul session and
  a restated Iran/oil reading stayed restatements under v7.
- In the record as stored, 1752 and 1753 stayed under 1740 in every version: a
  development whose latest line is already about New York reads as covering it.
  That is the misfiling being carried forward, not a v7 failure, and it is why
  the counterfactual record was used.

## Limits

- One sample per cell; six readings, one selloff. This shows the sentence can
  move the judge, not how often it does.
- "Session" is clear for exchanges and less so for around-the-clock markets
  such as oil and currencies; no reading here tests those.
- More developments in a running story mean more routine openings. They open
  discounted by the story's age (`fatigued()`), so this should not make the
  page jumpier, but that was not measured beyond these readings.
- Not the production caller: the hourly Cowork run answers the judge after
  rating, with the rating instructions in its context.
- Adoption is pending until judged readings stamped `judge_version: 7` arrive.
  A caller answering v6 after the deploy has its judgement refused and the
  reading stored unjudged, as for every earlier version change.
