# Story timeline

Moved from AGENTS.md, which is size-capped. On by default, behind a Settings switch.

## Story updates (since 2026-11-14, owner)

A story keeps moving after another takes the top reading, and no reading
reports it: on 2026-11-13 the FAA halted every US departure at 22:06 UTC and
lifted the halt at 01:15, while another story led. The hourly caller now checks
each other recent story for anything newer than its newest development after it
submits (caller instructions section 5) and posts it to `POST /api/updates`
(`checkStoryUpdate()` in `src/updates.js`: the development must be live and its
story's newest, `at` after it and not in the future, a known `kind`, and at
least one http(s) source; the same sentence for the same development is stored
once; a trial caller's update is checked and not stored). Updates live in
`story_updates`.

`/api/timeline` gives each entry `update`, its newest update or null, through
`attachUpdates()`. An update is shown only while it is its story's newest word:
once a reading opens a development after it, that reading has taken the story
on, often by reporting the very event, and showing both would say it twice.
Every update is stored; an entry shows its newest, written to stand beside the
rated sentence alone.

The timeline keeps its order by first coverage: an update never moves its
entry (owner, 2026-11-14; a first build sorted by the update's time and led
with it, and was changed the same day). The update is drawn below the
entry's sentence as its own quieter block (owner, 2026-11-14: “a bit of visual
hierarchy”): 16pt below the sentence, indented 12pt behind a 2pt rule in the
muted colour at 45%, a 13/18 caption (“**Update** · 3h ago”, the word in ink at
600, its age muted), then the update's sentence at 15/23. The tag line is the
entry's own (“FAA Outage · 6h ago”).
An update has no score and never touches the number (owner, 2026-11-14): a
resolved development keeps competing on its usual half-life. The prototype that shaped this, its first real run and the design
canvas are recorded in `docs/story-updates/runs.md`.

**One entry per development, never per reading.** **On by default** since 2026-10-11, when
the owner turned it on after a third App Review rejection under Guideline 4.2 (minimum
functionality) with the timeline behind a switch: `showTimeline` in
`apps/client/lib/preferences.js` is `true` unless a stored value is exactly `false`, and the
Show timeline switch on the Settings overview turns it off. The key was `timeline` until then,
and every install had stored `false` with its first save, written with the old default rather
than chosen, so the old key is not read. Off, the home screen is the reading alone — `useTimeline`
fetches nothing, there is no chevron, and the wordmark is plain text rather than
a button — so the product stays one number and one sentence unless a reader
asks for more. `/api/timeline` flattens `activeStories()` — the same replay as the
page and the board — so a story re-reported hourly for ten hours is one entry,
dated when it first broke and worded as it broke. A development that drops out
and returns keeps that one place, and so does one that escalates: the timeline
orders and dates by `opened`, first coverage, which never moves — not by
`since`, the decay anchor an escalation restarts, which moved an old sentence
up the list with a new age. The development the newest reading reports is
left out by **id**, not by matching text: its re-report is worded differently
from the sentence it opened with, and a text match let it appear twice. That id
comes from the replay before the 72-hour filter; picking the newest survivor of
the filter instead dropped the wrong development when the newest reading
re-reported one older than the window. The timeline is at least a screen tall
below the header, so one short entry can still reach the snap offset. Tag
lines show story and age only where they change from the entry above, so
"1d ago" is said once. Ages read as everywhere else in the app: "just now",
"5m ago", "5h ago", "1d ago". It is one column on every screen, sharing the
sentence's; a grid of columns on wide screens was tried and dropped (owner,
2026-09-28). It reaches back one week (`TIMELINE_DAYS`) by first
coverage and ends there, because a timeline that scrolls forever is a feed.
`recentStories()` hands the judge names from two weeks, twice that span, so
every tag in the timeline is a name the judge could still reuse. It gathers developments with `activeStories({ liveHours })`
at that span while the board keeps its `LOOKBACK_HOURS` (144), and the replay's four weeks of
rows already cover it. Its `limit` of 100 is a guard against a judge opening a
development per reading, not the design's bound. On the home screen the reading keeps
the whole first screen with a chevron beneath. "A screen" is the scroll view's
measured height, not `useWindowDimensions()`: on the web export that stays at
its 844pt static-render fallback, which put the chevron below the fold on any
shorter viewport. With the timeline off, the reading fills the scroll view
instead, so nothing scrolls. The scroll snaps between the
reading and the top of the timeline, and the reading fades out over the first
160pt so none of it reaches the header. Scrolled further, each tag line and
sentence fades out on its own as it nears the header — from 28pt below its lower
edge to 16pt above it — rather than running under a bar. A solid bar with a 1pt
rule was the first cut; on iOS it read as a hard edge cutting the text off. A
gradient mask would be smoother but needs a native module, and a painted
gradient would not match the reading gradient behind it. On the web the browser snaps
with CSS (`scroll-snap-type: y mandatory`): the reading and the timeline are the
two snap areas, and the timeline, taller than the screen, scrolls freely inside
itself. A script that waited for the scroll to go quiet and then scrolled to the
nearer position was the first cut; on iOS it fought momentum scrolling, drifting
and then jumping.
Tapping the header returns to the reading from anywhere in the timeline. The
wordmark's button stretches across the bar up to Share and Settings, because an
overlay cannot work: on iOS the native bar takes touches in its own area rather
than passing them to the screen beneath. It is a button only when there is a
timeline, so it is never a control that does nothing; iOS still keeps glass off
it. Android's width subtracts an estimated 40pt of bar insets, unmeasured. iOS
keeps the wordmark's own width, since the stretched one pushed Share and
Settings into iOS 26's overflow menu; a status-bar tap returns to the reading
there. A
scroll the app starts itself runs to its target without the web settle turning
it round mid-way.
