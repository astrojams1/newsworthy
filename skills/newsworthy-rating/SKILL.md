---
name: newsworthy-rating
description: Rate the current top news 1-10 for Newsworthy and submit the reading, using this agent's own model and tokens. Use when asked to "rate the news", "update newsworthy", "run the newsworthy rating", or on a schedule that feeds the Newsworthy app. Submitting a reading also suppresses Newsworthy's own scheduled run for that interval, so the rating is paid for here rather than there.
---

# Newsworthy rating

Newsworthy is a calm global status indicator: a number out of 10 and one sentence explaining why.
No doomscrolling. No subscription. No in-app purchases. No ads. No engagement, addiction or growth-hacking tactics.
Calm presentation does not change the published rating scale.

Fetch the instructions and follow them. They include the current rating prompt
inline, so this is the only thing you need to know:

```bash
curl -s -H "x-newsworthy-token: $NEWSWORTHY_TOKEN" "$NEWSWORTHY_URL/api/instructions?cb=$(date +%s)"
```

The `cb` value is a cache-buster and differs on every run. The origin already
answers `no-store` with a zero age, so a stale copy comes from a cache on the
caller's side, which only a distinct URL per run defeats — one caller spent six
hours rating against a prompt three versions behind the one being served.

| | |
|---|---|
| `NEWSWORTHY_URL` | e.g. `https://newsworthy-indol.vercel.app` |
| `NEWSWORTHY_TOKEN` | the caller token (`CALLER_TOKEN` on the app) |

If your HTTP client cannot set headers, use `?token=$NEWSWORTHY_TOKEN&cb=<unique-run-value>` instead —
every endpoint accepts either.

The origin generates instructions from the live prompt registry. Fetch them
afresh each run with a distinct URL; intermediaries can still cache old copies.
Do not cache them between runs. A complete submission includes `score`,
`explanation` and `prompt_sha256`, computed with a code tool from the exact
received prompt as described in the instructions. A failed search produces no
submission. Success means the API confirms that the reading was stored.

## Order of work

1. Fetch the current instructions and exact prompt with a fresh cache-buster;
   calculate its SHA-256 with a code tool as specified there.
2. Research current news, choose the development and score it using the published
   scale. No successful search means no submission.
3. Write the final sentence before sending anything. The total is 140 characters
   INCLUDING the app's "New: " label; reserve 5 for it, leaving 135 for the
   explanation whether or not the development turns out to be new. Count with a
   code tool. Do not add a label or timestamp to the submitted explanation.
4. Only then fetch `/api/judge-task` and answer it about your reading:
   `development_of` (an id the task lists, or null for a new development),
   `story` (reuse a listed name verbatim when the story is on record), `note`,
   and the task's `judge_version`. Newsworthy calls no model for this.
5. Submit score, explanation, prompt_sha256 and that `judgement` to
   `/api/readings`. Confirm the API stored it. If it says `"development":
   "unjudged"`, `judge_note` says why; the reading is still stored.

The service supplies the recent history inside the task; the caller does not need
admin credentials or the full archive. The app labels a sentence that opened a new
development "New:" for two hours after it is stored; any other sentence, and one
the service could not match, has no label.

## Why this exists

The rating costs real money and the work is not specific to that app. A reading
submitted here is one Newsworthy does not pay for — its scheduled run only fires
when nothing has arrived within the configured interval.
