# Story timeline

Moved from AGENTS.md, which is size-capped. Prototype behind a Settings switch.

**One entry per development, never per reading.** Prototype, and **off by default**: `timeline` in `apps/client/lib/preferences.js`
is `false` unless a stored value is exactly `true`, and the Show timeline switch on the Settings
overview turns it on. Off, the home screen is the reading alone — `useTimeline`
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
"Yesterday" is said once. It reaches back one week (`TIMELINE_DAYS`) by first
coverage and ends there, because a timeline that scrolls forever is a feed.
`recentStories()` hands the judge names from two weeks, twice that span, so
every tag in the timeline is a name the judge could still reuse. It gathers developments with `activeStories({ liveHours })`
at that span while the board keeps its 72 hours, and the replay's four weeks of
rows already cover it. Its `limit` of 100 is a guard against a judge opening a
development per reading, not the design's bound. On the home screen the reading keeps
the whole first screen with a chevron beneath; the scroll snaps between the
reading and the top of the timeline, and the reading fades out over the first
160pt so none of it reaches the header. Scrolled further, each tag line and
sentence fades out on its own as it nears the header — from 28pt below its lower
edge to 16pt above it — rather than running under a bar. A solid bar with a 1pt
rule was the first cut; on iOS it read as a hard edge cutting the text off. A
gradient mask would be smoother but needs a native module, and a painted
gradient would not match the reading gradient behind it. Web has no snap offsets on a
free-scrolling container and settles in the direction of travel instead.
Tapping the header returns to the reading from anywhere in the timeline. The
wordmark's button stretches across the bar up to Share and Settings, because an
overlay cannot work: on iOS the native bar takes touches in its own area rather
than passing them to the screen beneath. It is a button only when there is a
timeline, so it is never a control that does nothing; iOS still keeps glass off
it. The native width subtracts an estimated 40pt of bar insets, unmeasured. A
scroll the app starts itself runs to its target without the web settle turning
it round mid-way.
