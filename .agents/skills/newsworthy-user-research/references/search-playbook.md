# Searching for unmet news needs

Use these as query ingredients, not a checklist to run verbatim. Choose apps
and sources based on the question and previous runs. Record the actual query
and date filter; search engine publication labels are not reliable event dates.

| Route | Query ingredients | What it can reveal |
|---|---|---|
| Abandonment | `"Apple News" "cancelled"`, `"Google News" "uninstalled"`, `"SmartNews" "stopped using"` | Costly behavior, triggering incident and replacement |
| Failed control | `"news" "turned off" "notifications"`, `"Google News" "not interested" "still"` | Controls that do not meet expectations |
| Repetition | `"news app" "same story"`, `"news" "already read"`, `"news" "what actually changed"` | Repeated alerts versus actual developments |
| Workarounds | `"news" "RSS" "instead"`, `"headlines" "once a week"`, `"news" "grayscale"` | Work users do to reduce noise or manage attention |
| People who left | `"stay informed" "without" "scrolling"`, `"stopped reading news" "miss"` | Needs absent from app-review samples |
| Discovery failures | `"news app" "alternative" "too many"`, `"news widget" "out of date"` | Replacement criteria and freshness expectations |
| Trust and depth | `"AI news" "sources" "wrong"`, `"news summary" "missing context"` | Why a compact AI assessment may be insufficient |
| Friction | `"news app" "screen reader"`, `"news widget" "text size"`, `"news app" "offline"` | Accessibility, readability and connectivity needs |
| Disconfirmation | `"prefer" "full articles" "news app"`, `"news summaries" "too short"`, `"news notifications" "useful"` | Reasons minimalism or silence could fail |

Combine these with `site:reddit.com/r/...`, store domains or forum domains.
Try both named apps and generic phrases: Apple News, Google News/Discover,
SmartNews, Flipboard, Ground News, Inshorts, publisher apps, RSS and briefings
are possible starting points, not a fixed competitive set. Verify current names
and availability before describing them as current alternatives.

Search Reddit app/platform communities alongside r/nosurf, r/minimalism,
r/simpleliving and question communities. The latter overselect people who want
less news. Regional communities and non-English queries can test portability;
record the actual locale/language, never infer a person's location or diagnosis.

Beyond Reddit, use dated App Store/Google Play reviews, Apple/Google support
communities, independent discussion boards and Hacker News comments. A store
review in one country or app version is not a global product fact. Complaints
about politics or a publisher's stance can reveal distrust but do not establish
that a source is objectively biased or that Newsworthy would be unbiased.

## Follow a clue instead of repeating a broad query

Take a distinctive phrase from an account, search it across a second source
family, then search for people satisfied with the competing behavior. Capture
the attempted control, the cost of failure, what the user switched to, and what
they would lose by switching to Newsworthy. A complaint about repeated alerts
does not by itself justify building a personalized feed or even adding alerts.

Read surrounding replies and distinguish first-person experience from advice.
Developer-authored alternatives and recommendation links are useful discovery
leads; isolate those claims until independent users corroborate them. Best-app
roundups, recycled Reddit articles and search-optimized PDFs are weak evidence.

## When access is poor

Try an ordinary public permalink or the site's supported public interface once,
then use a different source or record the gap. No proxy rotation, CAPTCHA
workarounds, login bypass or reconstruction of removed posts. Search-visible
text can remain a labeled lead, but cannot increase verified support counts.
Do not spend the whole run retrying one domain.

## Lessons from the pilot, 2026-09-22

- Problem-language searches found richer context than broad `news apps` queries.
- Cancellation queries found observable abandonment, but the precise reason
  must come from the comment itself, not just its thread title.
- A relevant Google support search result opened to navigation without the
  complaint. Verify the text, not the HTTP success or page title.
- Store pages rendered each review twice. Count by title/date/body, once.
- Recent-looking search results often contained years-old reviews. Store the
  review's date separately from retrieval and search crawl dates.
- Recommendation threads contained app pitches. Retain useful leads without
  counting those pitches as independent demand.

Pilot evidence and remaining gaps: [2026-09-22 pilot](../../../../docs/user-research/runs/2026-09-22-01.md).

## Lessons from run 02, 2026-09-22

- Read replies and resolution notes before treating a request as an absent
  feature. [E-08](../../../../docs/user-research/runs/2026-09-22-02.md#e-20260922-02-08)
  asks for a links-only mode; a product-side reply describes an existing setting.
  Record that reply separately from independent verification of the behavior.
- “Trust” can hide a more specific failure. Follow reported source-access and
  mismatch workarounds across communities; [E-03](../../../../docs/user-research/runs/2026-09-22-02.md#e-20260922-02-03)
  distinguishes summarizing a headline from reading an article. A citation link
  alone is not evidence that the underlying content was accessed or supports it.
- Date operators and fresh crawl labels did not guarantee recent comments.
  Preserve unknown publication dates on readable support pages rather than
  dating them from linked stories or screenshots.
