---
name: newsworthy-rating
description: Rate the current top news 1-10 for Newsworthy and submit the reading, using this agent's own model and tokens. Use when asked to "rate the news", "update newsworthy", "run the newsworthy rating", or on a schedule that feeds the Newsworthy app. Submitting a reading also suppresses Newsworthy's own scheduled run for that interval, so the rating is paid for here rather than there.
---

# Newsworthy rating

Newsworthy is a calm global status indicator: a number out of 10 and one sentence explaining why.
No doomscrolling. No subscription. No in-app purchases. No ads. No engagement, addiction or growth-hacking tactics.
Calm presentation does not change the published rating scale.

**Fetch the instructions and follow them.** They include the current rating prompt inline, so this is the only thing
you need to know:

```bash
curl -s -H "x-newsworthy-token: $NEWSWORTHY_TOKEN" "$NEWSWORTHY_URL/api/instructions"
```

Done means: the API confirms the reading was stored, and the run report is posted. A run that submits nothing still
posts its report.

## Where things are

| | |
|---|---|
| `NEWSWORTHY_URL` | e.g. `https://newsworthy-indol.vercel.app` |
| `NEWSWORTHY_TOKEN` | the caller token (`CALLER_TOKEN` on the app) |

The service supplies the recent history at `/api/developments`. The caller needs no admin credentials and no full
archive.

## A run

1. **Fetch** the current instructions and the exact prompt. Calculate its SHA-256 with a code tool, as the
   instructions specify.
2. **Research** current news, choose the development and score it on the published scale. No successful search means
   no submission.
3. **Write the final sentence** before you send anything. The total is 140 characters INCLUDING the app's "New: "
   label. Reserve 5 for it, leaving 135 for the explanation, whether or not the development turns out to be new.
   Count with a code tool. Don't add a label or timestamp to the submitted explanation.
4. **Judge.** Only then fetch `/api/developments`. Answer the judge prompt from the instructions about your reading
   against that record:
   - `development_of`: an id the record lists, or null for a new development;
   - `story`: reuse a listed name verbatim when the reading is about what it names, never for a merely related story;
   - `note`;
   - the judge prompt's `judge_version`.

   When two listed names are one story coined twice, add `same_story` with both. Never do it for merely related
   stories. Newsworthy calls no model for this.
5. **Submit** score, explanation, prompt_sha256 and that `judgement` to `/api/readings`. Confirm the API stored it. If
   it says `"development": "unjudged"`, `judge_note` says why. The reading is still stored.
6. **Report.** End every run with one report to `/api/runs`, including a run that submitted nothing. Give the searches
   and sources, the stories weighed, why the score and the judgement, and anything that failed.

## Rules

- **Use `curl` for every request**, with the token header. Never use a web-fetch tool: one that passes pages through a
  model paraphrases and cuts what it returns.
- **Fetch the instructions afresh each run.** The origin builds them from the live prompt registry. Don't cache them
  between runs.
- **A complete submission** includes `score`, `explanation` and `prompt_sha256`. Compute the hash with a code tool
  from the exact received prompt, as the instructions describe.
- **A failed search produces no submission.**
- **Success means the API confirms the reading was stored.**

## How the app shows it

The app labels a sentence that opened a new development "New:" for two hours after it is stored. Any other sentence,
and one the service couldn't match, has no label.
