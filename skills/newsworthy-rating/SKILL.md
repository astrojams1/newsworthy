---
name: newsworthy-rating
description: Rate the current top news 1-10 for Newsworthy and submit the reading, using this agent's own model and tokens. Use when asked to "rate the news", "update newsworthy", "run the newsworthy rating", or on a schedule that feeds the Newsworthy app. Submitting a reading also suppresses Newsworthy's own cron run for that interval, so the rating is paid for here rather than there.
---

# Newsworthy rating

Produce one reading — a score out of 10 and one sentence — and POST it to the
Newsworthy app. The app records it as a normal data point, tagged with the fact
that it came from an external caller and with whichever model you used.

Because Newsworthy only runs its own cron job when nothing has arrived within
the configured interval, a reading submitted here means the app does **not**
spend its own tokens for that window.

## Setup

Two values, from whoever runs the Newsworthy instance:

| | |
|---|---|
| `NEWSWORTHY_URL` | e.g. `https://newsworthy-indol.vercel.app` |
| `NEWSWORTHY_TOKEN` | the caller token (`CALLER_TOKEN` on the app) |

## Steps

**1. Fetch the current prompt.** Always fetch it rather than hardcoding it —
the prompt is versioned in the app and changes without notice.

```bash
curl -s -H "x-newsworthy-token: $NEWSWORTHY_TOKEN" "$NEWSWORTHY_URL/api/prompt"
```

Returns `{version, label, hash, text, submit_to}`.

**2. Do the rating.** Run the returned `text` as the prompt, with web search
enabled. It asks you to check current top news and liquid prediction markets,
and to answer with a single JSON object:

```json
{"score": 5, "explanation": "One sentence, at most 25 words."}
```

Follow it exactly. In particular the explanation reports *what happened* — it
never justifies the score, characterises the news as a whole, or compares the
main story to the rest of the day.

**Do not submit a reading you could not actually research.** If web search
fails or returns nothing, stop: no reading is better than a score that means
"I couldn't check". The app rejects its own runs on this basis and cannot
detect it on yours.

**3. Submit it.**

```bash
curl -s -X POST "$NEWSWORTHY_URL/api/readings" \
  -H "x-newsworthy-token: $NEWSWORTHY_TOKEN" \
  -H 'content-type: application/json' \
  -d '{
    "score": 5,
    "explanation": "One sentence about what happened.",
    "prompt_version": 3,
    "model": "claude-opus-5",
    "caller": "cowork-macbook",
    "usage": { "input_tokens": 52000, "output_tokens": 900, "web_search_requests": 6 },
    "meta": { "agent": "cs-tick", "host": "mbp" }
  }'
```

`201` returns the stored row. `422` means the body was rejected — the message
says why. Only `score` and `explanation` are required; everything else is
self-reported context, and reporting `usage` is what lets the app price your
run and show it separately from its own spend.

`prompt_version` should be the version you fetched in step 1. The app supplies
the hash and text itself from its own registry, so a reading always traces back
to a prompt it can reproduce.

## If your client cannot send headers

Some agents have only a plain GET fetch. Both endpoints accept the token as a
`token=` query parameter, and a reading can be submitted by GET:

```
GET /api/prompt?token=TOKEN

GET /api/readings?token=TOKEN
    &score=5
    &explanation=One%20sentence%20about%20what%20happened.
    &prompt_version=3
    &model=claude-opus-5
    &caller=my-agent
    &input_tokens=51000&output_tokens=900&web_search_requests=6
```

Validation is identical. Note that a token in a URL is more exposed than one in
a header — it lands in logs and history — so prefer a `CALLER_TOKEN` over the
admin token when submitting this way.

## Notes

- One reading per interval is enough. Submitting more often is harmless but
  wasteful — the app shows the most recent one.
- The token is not the admin token and grants only these two endpoints.
