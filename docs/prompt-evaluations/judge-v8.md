# Judge v8: a reading is filed by the news it leads with

Judge prompt `lead-occurrence-v8` (hash `62b58902a1dacd0b`, 3,599 characters),
added 2026-11-16. It is v7 byte for byte with one paragraph appended:

> A reading is filed by the news its sentence leads with. When the lead restates
> a recorded development, the reading reports that development even if a closing
> clause ("as…", "after…", "while…") names something that happened later: a
> clause added as context does not make a reading new. A result, vote or meeting
> still to come is not an occurrence, so a reading that leads with the same
> preview as a recorded development restates it.

v7 is 3,166 characters, so the paragraph could not fit under the 3,200 cap
`test/story.test.js` enforced. As with v7, tightening wording the earlier
versions share would cost their comparability, so the cap is now 3,700.

## Why

The owner, 2026-11-16: many headlines were "just repeating the same story about
the NVIDIA CEO resigning and earnings reporting on November 17th."

From 14 to 16 November the rater led almost every reading with the same
preview, "Nvidia reports results Nov 17, its first since its CEO quit", and
ended it with one more item after "as". The caller, judging under v7, read each
item as a later occurrence (v5) and opened a development for it:

| Reading | UTC | Score | Sentence (abridged) | Judged (v7, production) |
|---|---|---|---|---|
| 1969 | 11-14 18:05 | 6 | Nvidia reports results Nov 17, its first since CEO Jensen Huang resigned, as two big investors urge its board to weigh his return | new, "Investors' letter … is a later occurrence" |
| 1997 | 11-16 05:04 | 6 | Nvidia reports results Nov 17, its first since its CEO quit, as the US reportedly drafts limits on its chip sales in Southeast Asia | new, "reported US draft export licence rules" |
| 2008 | 11-16 16:04 | 6 | Nvidia's Nov 17 results will show how the chipmaker is doing since CEO Jensen Huang quit, as AI stock losses pull the Nasdaq down 2% | new, "US Nasdaq selloff Nov 16 session" |
| 2009 | 11-16 17:03 | 6 | Nvidia reports results Nov 17, its first since CEO Jensen Huang resigned, as President Trump backs bringing him back | new, "Trump … is a new party acting" |

The timeline is one entry per development, worded as it first broke, so it
listed these one above the other, nearly word for word. Each also opened at 6
on the page as **New:**: the story was five days old, and `fatigued()`, at a
90-day story half-life, kept 93% of the score. v5 and v7 both rest on the
assumption that splitting a story into more developments costs nothing because
routine ones open discounted; for a young story it does not, and the timeline
pays for every split.

## Method

As for v6 and v7. For each reading, the judge message was rebuilt as it stood
when the reading arrived, from `/api/admin/history?hours=720`: the readings
stored before it over `PRIOR_HOURS`, roots older than that by id, and the story
list over 14 days, passed through `judgeRecord()`. Records were 56,191 to
57,955 characters; 1751's matched the 57,955 the v7 record reports for it, so
the reconstruction reproduces the record the earlier test used. Each record was
rendered with v7 and with v8, so only the prompt differs. Each of the 14
messages went to a fresh Claude agent told only to read the file and answer as
the specification asks, with no word about what was being tested. One sample per
cell.

Controls: two readings that lead with a different market's selloff (1996,
1999), which v7's market rule makes new and v8 must not merge; one restatement
v7 already filed under 1969 (2003); and 1751, "US chip stocks fell 11%", the
case v7 was written for.

## Results

| Reading | Kind | Production (v7) | v7 here | v8 here |
|---|---|---|---|---|
| 1997 preview + Southeast Asia chip limits | target | new | new | **1969** |
| 2008 preview + Nasdaq down 2% | target | new | new | **1969** |
| 2009 preview + Trump backs return | target | new | new | **1969** |
| 1996 Japan and Korea chip selloff | control | new | new | new |
| 1999 Taiwan index down 6% | control | new | new | new |
| 2003 preview + allies lobby board | control | 1969 | 1969 | 1969 |
| 1751 US chips down 11% (v7's case) | control | new | new | new |

Notes as returned:

- 1997 v7: "New: US reportedly drafting limits on Nvidia chip sales in Southeast Asia"
- 1997 v8: "Leads with same Nov 17 results preview; chip-limit clause is context"
- 2008 v7: "New US session move: AI losses pull Nasdaq down 2%"
- 2008 v8: "Leads with same Nov 17 results preview; Nasdaq clause is context"
- 2009 v7: "Trump backing Huang's return is a new party, not investor push"
- 2009 v8: "Leads with same Nov 17 results preview; Trump clause is context"
- 1996 v7: "New Asian session chip selloff, later occurrence than US chip drop"
- 1996 v8: "New session: Asian chip stocks fall ahead of Nvidia results"
- 1999 v7: "Taiwan selloff is a different market from recorded Japan/Korea drop"
- 1999 v8: "Taiwan selloff is a different market from recorded Japan/Korea drop"
- 2003 v7: "Restates backers pushing board to bring Huang back before results"
- 2003 v8: "Same results preview with push for Huang's return"
- 1751 v7: "US chip selloff, new market beyond recorded South Korea slide"
- 1751 v8: "US market chip selloff, distinct from recorded South Korea selloff"

Slugs: every answer but 1996 and 1751 kept `nvidia-spy`; 1751 kept `ai-stocks`,
its story then. 1996 was answered `ai-stocks` under both versions where
production said `nvidia-spy`; the same answer under both, so not v8's doing.

## Front page, replayed

`displayedSeries()` over the stored series at the production settings (48-hour
development half-life, 90-day story half-life), as stored and with 1997, 1998
(filed under 1997 in production), 2008 and 2009 under 1969:

| Reading | Score | Shown, as stored | Shown, v8 filing |
|---|---|---|---|
| 1997 | 6 | **6 routine** (opens 1997) | 6 aged (1996 leads) |
| 1998 | 6 | 6 aged (1997) | 5 aged (1996) |
| 2008 | 6 | **6 routine** (opens 2008) | 5 aged (1999 leads) |
| 2009 | 6 | **6 routine** (opens 2009) | 5 aged (1999 leads) |

`activeStories()` over the week: `nvidia-spy` holds 10 developments as stored and
7 under v8, so three timeline entries that repeated the preview go.

## Findings

- v8 filed all three targets under 1969, each note naming the closing clause as
  context. v7 opened all three, reproducing production.
- The market rule still holds: readings that lead with another market's selloff
  stay new under v8, and so does v7's own case.
- A restatement v7 already filed stays where it was.

## Limits

- One sample per cell; seven readings, one story. This shows the paragraph can
  move the judge, not how often it does.
- A real development the rater puts in a closing clause is now filed as a
  re-report. If it matters, the score says so: a level two clear of the
  development's usual level re-anchors it (`current.js`), as for any re-report.
  A smaller one is lost to the timeline, which is the trade v8 makes.
- The rater chose to lead with a scheduled release for three days; rating v23
  asks a preview to say what the release will settle, and nothing here changes
  the rating prompt.
- Judgements are never recomputed, so 1997, 2008 and 2009 stay separate
  developments as stored. They leave the timeline as it ages past a week.
- Not the production caller: the hourly Cowork run answers the judge after
  rating, with the rating instructions in its context.
