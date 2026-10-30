# Judge v6: a slug is reused only for what it names

Judge prompt `slug-names-story-v6` (hash `283696c11d9ccac2`, 2,982 characters),
added 2026-10-30. It is v5 byte for byte plus one paragraph:

> A slug on record is taken back only by a reading about what it names,
> never by one that is merely related to it, shares its cause or moves with it:
> a company's results are not news about another country's stocks.

## Why

On 2026-10-30 the front page showed "Amazon and Intel shares fell after weak
earnings reports…" with the muted line "Korea Stocks · 13h ago". The story
`korea-stocks` was coined on 12 October (reading 1170) for a 4% fall in Seoul.
By 30 October 123 readings sat under it, each opened by a judgement that tied
it to the one before through the AI-spending worry:

| Reading | Opened | Sentence (abridged) |
|---|---|---|
| 1170 | 10-12 | South Korea's main stock index fell nearly 4%… |
| 1250 | 10-15 | Investors price a 60% chance CoreWeave fails to repay its debt… |
| 1328 | 10-19 | Tokyo stocks fell 2% as investors doubt AI spending will pay off… |
| 1381 | 10-21 | Musk said a merger of SpaceX and Tesla would make sense… |
| 1420 | 10-22 | Investors sold tech and chip shares after Meta and Lam Research outlooks… |
| 1489 | 10-25 | Alphabet, Amazon and Microsoft report results this week… |
| 1564 | 10-28 | Alphabet shares fell nearly 10% in late trading… |
| 1587 | 10-29 | Amazon said its profit and sales fell short of forecasts… |
| 1589 | 10-29 | Amazon and Intel shares fell after weak earnings reports… |

v2 makes a name on record sticky and v3 says two related stories are not one
story for a merge, but no version said which readings a name may take. v6
applies v3's limit to filing.

The name already on record is a separate problem: a merge keeps the name more
readings used, so no merge could relabel `korea-stocks`. `/admin` gained a
rename for that (`POST /api/admin/renames`, `src/merges.js`).

## Method

For six stored readings, the judge message was rebuilt as it stood when each
reading arrived, from `/api/admin/history?hours=720`: the readings stored
before it over `PRIOR_HOURS`, roots older than that by id, and the story list
over 14 days, passed through `judgeRecord()` exactly as the server builds it.
Each message was rendered twice, once with v5 and once with v6, so the record is
identical and only the prompt differs. Records were 58,130 to 60,268 characters.

Each of the 12 messages went to a fresh Claude agent, one per message, told
only to read the file and answer as the specification asks. The agents were not told what was being tested. One sample per cell.

The production judge is the hourly caller, which answers the same prompt after
rating its own reading, inside a longer run. This test isolates the judge task;
it does not reproduce the caller's run.

## Results

`development_of` was `null` in all 12 answers, matching production for these
readings; only the slug is compared.

| Reading | Kind | Production (v5) | v5 here | v6 here |
|---|---|---|---|---|
| 1381 SpaceX-Tesla merger remark | target | `korea-stocks` | `spacex-tesla` | `spacex-tesla` |
| 1489 Big-tech earnings week preview | target | `korea-stocks` | `korea-stocks` | `ai-spending` |
| 1587 Amazon results miss | target | `korea-stocks` | `korea-stocks` | `tech-earnings` |
| 1353 Seoul index falls 2% on chip doubts | control | `korea-stocks` | `korea-stocks` | `korea-stocks` |
| 1492 Houthi missiles at Riyadh airport | control | `iran-war` | `iran-war` | `iran-war` |
| 1391 France 10-year yield hits 5% | control | `bond-selloff` | `bond-selloff` | `bond-selloff` |

Notes as returned:

- 1381 v5: "Musk merger remark and reported SpaceX profit; only preview was recorded"
- 1381 v6: "SpaceX results and Musk merger remark are new; not Korea stocks"
- 1489 v5: "Alphabet, Amazon, Microsoft earnings preview; different occurrence from Meta-Tesla results"
- 1489 v6: "New: Alphabet, Amazon, Microsoft results this week, not Meta/Tesla"
- 1587 v5: "Amazon's own earnings miss is a new occurrence, separate from Alphabet's"
- 1587 v6: "Amazon's own results miss, a separate occurrence from Alphabet's"
- 1353 v5: "New Oct 20 session drop, later than recorded Oct 15 falls"
- 1353 v6: "New Oct 20 Korean index drop, later than recorded selloffs"
- 1492 v5: "New Houthi barrage of dozens of missiles after Riyadh airport reopened"
- 1492 v6: "New Houthi missile barrage on Riyadh airport after it reopened"
- 1391 v5: "French 10-year yield now reaches 5%, a 2002 high; earlier only near"
- 1391 v6: "France 10-year first hits 5%, level only neared before"

## Findings

- v6 filed both target readings that v5 still put under `korea-stocks`
  (1489, 1587) under a new name. v5 reproduced the production misfiling in
  both.
- v5 did not reproduce the SpaceX misfiling (1381) here, so that case does
  not distinguish the versions.
- All three controls kept their story under v6: a Seoul reading stays
  `korea-stocks`, and the Houthi and France readings keep the broad names
  their stories already had. v6 did not split a war or a market thread by
  place.
- The two new names differ (`ai-spending`, `tech-earnings`) because each
  message is judged with no memory. In production the first coinage would be
  on record for the next reading.

## Limits

- One sample per cell; six readings. This shows the paragraph can move the
  judge, not how often it does.
- v6's example ("a company's results are not news about another country's
  stocks") is close to case 1587, so that case partly tests the example.
  1489, an earnings preview, is further from it.
- Not the production caller: the hourly Cowork run answers the judge after
  rating, with the rating instructions in its context.
- Adoption is pending until judged readings stamped `judge_version: 6` arrive.
