---
name: newsworthy-story-updates
description: Run Newsworthy's story update check by hand, outside the hourly caller — find the newest development in each recent story on the timeline that never became the headline, and post it as an update. Use when asked to "check story updates", "find updates to recent stories", "run the story update check", or to backfill, audit or test updates.
---

# Newsworthy story updates

Newsworthy records one reading an hour: the single biggest development at that moment. A story keeps moving after it
stops being the biggest. When a halt is lifted, a strike ends or a claim is denied while another story leads, no
reading reports it. The hourly caller therefore checks every other recent story after it submits and posts what it
finds to `POST /api/updates`. The app shows the update on the timeline, above the sentence the development was rated
for. An update carries no score and never touches the number.

This skill runs that same check by hand: to backfill after an outage, to audit what the caller posts, or to test a
change to the rules. Read [the run ledger](../../../docs/story-updates/runs.md) before a run and add an entry after it.

## The rules live in one place

What counts as an update, how to research and date it, how to write the sentence and how to submit it is section 5,
"Story updates", of the caller instructions:

```bash
curl -s -H "x-newsworthy-token: $NEWSWORTHY_TOKEN" "$NEWSWORTHY_URL/api/instructions"
```

Follow it exactly. Don't keep a second copy of the rules here. If a run shows a rule is wrong or missing, change
`src/caller.js` in a PR and record why in the ledger. The server's checks are `checkStoryUpdate()` in `src/updates.js`,
and how the timeline shows updates is in `docs/story-timeline.md`.

## Where things are

| | |
|---|---|
| `NEWSWORTHY_URL` | `https://newsworthy-indol.vercel.app` in production |
| `NEWSWORTHY_TOKEN` | the caller token, or the admin token: `op://API Tokens/Newsworthy admin` (`password`) |
| Candidates | `node .agents/skills/newsworthy-story-updates/candidates.mjs timeline.json current.json` |

`candidates.mjs` reads saved `/api/timeline` and `/api/current` responses, both public, and gives one row per story
whose newest development is under 72 hours old. Each row holds the development to check (`last_recorded`), everything
else on record for the story, the reading on screen when it belongs to the story, and any stored update. The story on
the front page is skipped: the hourly job already checks it before it submits, so the headline never has an update.

## A run

1. **Fetch** the instructions, `/api/timeline` and `/api/current`, then make the candidates.
2. **Check each story** by section 5. Stories are independent, so several workers can split them. Brief each with the
   rows it owns and section 5 itself.
3. **Post** each update found to `/api/updates` with the token. Read back `201` (stored) or `200` (already stored).
   A `422` is the server's reason, so fix the input rather than retry it unchanged. To audit without writing, skip
   this step and say so in the ledger.
4. **Verify** on `/api/timeline` that each stored update appears on its entry.
5. **Record** the run in the ledger: each story, the update or none and why, sources, and what was posted.

## Rules

- **Never change a rating.** An update has no score and does not rescore the development it follows.
- **An update is not a reading.** If the newest development is now the biggest news, the hourly rating reports it.
- **Use `curl` for pages and the API.** A web-fetch tool that passes pages through a model can paraphrase, cut, or
  serve a stale copy.
- **Never guess.** A failed search means no update for that story, recorded as a failure.
