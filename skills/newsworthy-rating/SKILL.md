---
name: newsworthy-rating
description: Rate the current top news 1-10 for Newsworthy and submit the reading, using this agent's own model and tokens. Use when asked to "rate the news", "update newsworthy", "run the newsworthy rating", or on a schedule that feeds the Newsworthy app. Submitting a reading also suppresses Newsworthy's own scheduled run for that interval, so the rating is paid for here rather than there.
---

# Newsworthy rating

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

If your HTTP client cannot set headers, use `?token=$NEWSWORTHY_TOKEN` instead —
every endpoint accepts either.

The instructions are generated from the app's own prompt registry, so they are
never stale: the prompt version and hash in them are whatever is live. Do not
cache them between runs.

## Why this exists

The rating costs real money and the work is not specific to that app. A reading
submitted here is one Newsworthy does not pay for — its scheduled run only fires
when nothing has arrived within the configured interval.
