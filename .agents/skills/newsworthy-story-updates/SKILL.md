---
name: newsworthy-story-updates
description: Prototype. Find the newest development in each story on Newsworthy's timeline, including what happened while another story led and so was never rated, and write it as the sentence the app would show after "Update:". Use when asked to "check story updates", "find updates to recent stories", "run the story update check", or to make real examples for the update design.
---

# Newsworthy story updates (prototype)

Newsworthy records one reading an hour: the single biggest development at that moment. A story keeps moving after it
stops being the biggest. When a halt is lifted, a strike ends or a claim is denied while another story leads, no
reading reports it, and the app goes on showing the older development as the latest word on that story.

This check looks at every recent story on the timeline, finds anything newer than what is on record, and writes it in
the app's house style. It produces data only. Nothing here sets or changes a score.

Read [the run ledger](../../../docs/story-updates/runs.md) before a run, and add an entry after it.

## Status

This is a prototype. No endpoint stores updates yet, so a run writes a JSON file and nothing else. The proposed path is
in "Where this goes" below. Until then, run it by hand.

## Inputs

```bash
curl -s "$NEWSWORTHY_URL/api/timeline" > timeline.json      # public, no token
curl -s "$NEWSWORTHY_URL/api/current" > current.json        # public, no token
node .agents/skills/newsworthy-story-updates/candidates.mjs timeline.json current.json > candidates.json
```

`candidates.mjs` gives one row per story whose newest development is under 72 hours old. Each row holds that development
(`last_recorded`: `root`, `since`, `score`, `explanation`) and everything else already on record for the story:
earlier sentences, and the reading on screen now (`current_reading`) when it belongs to the story. The on-screen reading
can be newer than the story's last development, because a continuation is shown without opening one. Everything on
record counts as known. `NEWSWORTHY_URL` is `https://newsworthy-indol.vercel.app` in production.

The sentence style is the Output section of the live rating prompt. With the caller token, fetch it from
`/api/prompt`. Without it, take `renderPrompt(latestVersion()).text` from `src/prompts.js` on `origin/main`. Don't copy
the style into this file. The prompt is the single source and it changes. Where the prompt and this file differ (the
length, the label, the score), this file wins for updates.

Stories are independent, so several workers can split them. They all write into one combined output file.

## For each story

1. **Search for what happened after `since`.** Search with at least two phrasings, naming the people and bodies
   involved rather than dates. Date words in a query tend to return last year's pages. Search summaries are leads,
   not evidence. Read each page with `curl` and date it by what the page itself says.
   - **Updated pages.** A live blog or an updated article can carry a publish date older than the news it now
     reports. Use, in order: the timestamp on the specific live entry, `dateModified`, or the earliest archived copy
     that contains the news. A publish date before `since` doesn't rule a page out. Only the date of the news itself
     does.
   - **Pages without dates.** A page with no timezone, or an aggregator page with no named author, can support a
     source with its own timestamp but cannot stand alone.
2. **Decide whether there is an update.** An update is a new event in the same story after `since`. It is something
   someone did or said on the record:
   - a reversal, resolution or escalation;
   - a decision, a ruling or an official action;
   - a toll crossing a threshold;
   - official confirmation or denial of what was only claimed or reported.

   These are not updates:
   - the recorded development restated, re-worded or with a revised figure;
   - analysis, reaction, commentary, or market moves about another story's event;
   - a fresh unconfirmed report that the subject answers as premature or denies. Here the subject's answer is the
     news only if it changes where things stand;
   - something scheduled or a deadline that has passed without a report of what happened. Reporting lags, so it is
     not yet news;
   - a related story. A rival chipmaker's results are not the Nvidia story.
   - an event from before `since` that the recorded sentence left out. Note it in `sources_read` and nothing more.

   **Stories that are price moves** (a selloff, a slide, a rally) need their own test. A further move in the same
   direction, including a new "lowest since", is a revised figure. A move counts when it reverses the recorded
   direction, or when an official action happens in the story, such as a central bank's decision or a trading halt.

   When several things happened, report where the story stands now. That is usually the most recent material event.
   When nothing qualifies, the story has no update. That answer is common and correct. It was the answer for half the
   stories on the first run.
3. **Write the sentence.** Follow the rating prompt's Output section, with these differences:
   - **132 characters at most**, including spaces and punctuation, not the prompt's 135. The app adds the bold label
     `Update: ` (8 characters) inside the same 140-character display. Count with a code tool.
   - No score, and nothing that reads as a score or a judgement of importance.
   - It reports the new event alone. The app shows the recorded sentence underneath, so don't retell it. A short
     clause naming what the update answers is fine ("denying Iran's claim that…").
   - It replaces any earlier update on screen, so write it to stand beside the recorded sentence alone. If an earlier
     update matters to make sense of it, fold that in ("…again after lifting the stop at 8:15 p.m.").
   - The cause stated by the people involved may be named in the same clause ("officials blamed…"). A cause that is
     another story is named briefly, as the reason, and is not reported.
   - Continuation words such as "again" or "further" are fine. Weekdays and relative days are not.
4. **Date it.** `at` is when the event happened, in UTC ISO-8601: a market move's close or the time of an official
   statement. `at_basis` is `"event"` when a source gives the event's time. It is `"published"` when the earliest
   timestamped page carrying the news is all there is. `"published"` is an upper bound, and the event may be earlier.
5. **Source it.** At least one page carrying its own timestamp. Two independent sources are better. A claim that only
   one source makes is written as "said" or "reportedly". Market data from an exchange or a data API can confirm a
   figure. It is recorded in `sources` with the time of the data point, beside a page that reports the move.

If search fails for a story, record the failure and no update. Never guess an update from memory.

## Output

Write one `updates-<checked_at as YYYYMMDDTHHMMZ>.json`:

```json
{
  "checked_at": "2026-11-14T04:30:00Z",
  "prompt_version": 24,
  "stories": [
    {
      "story": "faa-outage",
      "last_recorded": { "root": 1949, "since": "…", "score": 5, "explanation": "…" },
      "update": {
        "explanation": "<at most 132 characters>",
        "chars": 123,
        "at": "…",
        "at_basis": "event",
        "kind": "resolution",
        "sources": [{ "url": "…", "published": "…", "modified": "…" }]
      },
      "note": "<one or two sentences: why this is an update, or why there is none>",
      "sources_read": [{ "url": "…", "dated": "…", "used_for": "…" }],
      "searches": 3
    }
  ]
}
```

`update` is `null` when nothing qualifies. `note` and `sources_read` are kept either way, so a "no update" can be
checked as easily as an update.

`kind` takes one of these values:

| Kind | Meaning |
| --- | --- |
| `resolution` | the situation ended or was fixed |
| `reversal` | it went the other way |
| `escalation` | it widened or worsened |
| `decision` | someone with the power to act decided |
| `confirmation` | officials confirmed what was claimed or reported |
| `denial` | officials denied it |
| `correction` | the recorded development turned out wrong in fact |
| `continuation` | a material new step in the same direction that is not a revised figure, which is rare |

End the run with a short report: each story, update or none, and why. Then add an entry to the run ledger.

## Rules

- **Never change a rating.** An update has no score and does not rescore the development it follows. The app keeps
  the original score and sentence and shows the update beside them.
- **An update is not a reading.** If the newest development is now the biggest news, the hourly rating run will
  report it as a reading. This check doesn't submit readings.
- **Same story only.** Use the story name exactly as the timeline gives it.
- **Use `curl` for pages and the API.** A web-fetch tool that passes pages through a model can paraphrase, cut, or
  serve a stale copy.

## Where this goes

Proposed, not built:

1. **An update is a development with no score yet.** `POST /api/updates` with the caller token takes `{story, follows:
   <root>, explanation, at, kind, sources}`. It is stored as a development of the story, with its own id and its
   event time, and no reading.
2. **Updates go in the record the judge sees, with their ids.** A later reading that reports the same event is filed
   under the update, which then gets that reading's score. Without the id, the judge would file it under the
   development the update follows, as a re-report. The page would then show that older sentence word for word,
   because a re-report shows its development's first report.
3. **Updates attach to the rated development they follow.** A timeline entry is one rated development. Every update
   to it is stored, but the entry shows only the newest. Each new update is written against the rated sentence shown
   beneath it, not against the update it replaces, because only the rated sentence stays on screen. "The FAA halted
   departures again after lifting the stop at 8:15 p.m." stands on its own beside "Rated 6h ago: The FAA halted…".
   - Stored updates count as on record for the next check, so none is reported twice.
   - When a reading reports a stored update's event, the update leaves the old entry and becomes the reading's own
     entry. The old entry falls back to its previous update, or to none.
   - Later updates follow the newest rated development in the story. An older entry keeps the last update it had,
     as history.
4. **One hourly job, and the headline never has an update.** The caller rates, judges, checks the headline's own
   story for anything newer, and then checks the rest. If something newer exists in the headline's story, the
   reading reports that instead. So the reading on the home screen and in widgets is always its story's latest word.
   It can *be* an update, but it never *has* one. The first run showed why the check is needed: a rater can name a
   bigger but older development in a story, such as a halt that has already been lifted.
5. **The timeline shows design B.**
   - An entry with an update shows `Update:` in bold and the update sentence. Underneath, muted, it shows
     `Rated <age> ago:` and the sentence the score belongs to.
   - Entries sort by latest activity, so an updated entry moves up to its newest update's time.
6. **The home screen and widgets change only their label** (owner's choice, 2026-11-14). `New:` marks a development
   in a new story. `Update:` marks a newer development in a story already shown. Both last two hours, as `New:` does
   today.
   - `Update: ` takes 8 characters, against 5 for `New: `. The rating prompt reserves only 5, so readings must shrink
     to 132 characters. That is a new prompt version through `.agents/skills/newsworthy-prompt-update/SKILL.md`, and
     a change to the caller instructions.
7. **The hourly caller runs the rest of this check after it submits**, for stories whose last development is under 72
   hours old. The first run had six such stories and took 3 to 7 searches each.

**Updates never touch the number** (owner, 2026-11-14). The number belongs to the loudest live development, aged over
48 hours. A development whose update resolves or denies it keeps competing for the number like any other. An update
changes what the app says about a story, never how loud it is.
