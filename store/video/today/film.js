// What the "today" Short is made of: its scenes and the app files each one
// draws, every line it puts on screen with the file whose words it uses, and
// the video it renders with the rules it must meet. The reading itself is the
// snapshot in reading.json, drawn as the app draws it. Its own lines quote
// the script in store/video/today/README.md.
import { CUES, DURATION } from './timeline.js';
import reading from './reading.json' with { type: 'json' };
import { shortAge, storyLabel } from '../../../apps/client/lib/timeline.js';

const SCRIPT = 'store/video/today/README.md';
const READING = 'store/video/today/reading.json';
export { reading };

export const SCENES = [
  { id: 'reading', start: 0, title: "The day's reading, as the app shows it",
    depicts: ['apps/client/app/index.tsx', 'apps/client/lib/story-age.js', 'apps/client/lib/timeline.js', 'apps/client/components/brand-mark.tsx',
      'public/tokens.js', 'public/levels.css', 'design/palette.json', READING] },
  { id: 'home', start: CUES.home[0], title: 'The same reading in the Home Screen widgets',
    depicts: ['apps/client/targets/widget/NewsworthyWidget.swift', 'apps/client/lib/onboarding.js', READING] },
  { id: 'end', start: CUES.phoneOut[0], title: 'The name, the price and where to get it',
    depicts: ['scripts/generate-brand.mjs', 'docs/product-messaging.md'] },
];

// The film's clock: the snapshot's moment, in the time zone the clocks are
// drawn in. The app writes ages ("9h ago"); the widget writes a clock time.
export const TIME_ZONE = 'America/Los_Angeles';
const now = Date.parse(reading.fetched_at);
const clock = iso => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TIME_ZONE })
  .format(new Date(iso)).replace(/\s?[AP]M$/, '');
// apps/client/lib/story-age.js storyLine(): "US Iran War  ·  5h ago".
const age = reading.explanation_at ? shortAge(reading.explanation_at, now) : null;
const story = [storyLabel(reading.explanation_story), age].filter(Boolean).join('  ·  ');

const script = (text, on) => ({ text, source: SCRIPT, quote: `| ${text} |`, on });
export const COPY = {
  question: script("How big is today's news?", CUES.question),
  oneNumber: script('One number.', [CUES.oneNumber, CUES.numberLine[1]]),
  oneSentence: script('One sentence.', [CUES.oneSentence, CUES.numberLine[1]]),
  home: { text: 'Also on your Home Screen', source: 'apps/client/lib/onboarding.js', quote: "'Also on your Home Screen'", on: CUES.homeLine },
  // The reading, word for word from the snapshot.
  score: { text: String(reading.score), source: READING, quote: `"score": ${reading.score},`, on: [0, CUES.phoneOut[1]] },
  sentence: { text: reading.explanation_text, source: READING, quote: JSON.stringify(reading.explanation_text), on: [CUES.sentence[0], CUES.phoneOut[1]] },
  newLabel: { text: reading.explanation_new ? 'New:' : '', source: 'apps/client/lib/story-age.js', quote: "NEW_LABEL = 'New:'", on: [CUES.sentence[0], CUES.phoneOut[1]] },
  story: { text: story, source: 'apps/client/lib/story-age.js', quote: "join('  ·  ')", on: [CUES.storyLine[0], CUES.home[0]] },
  // The widget leads with the sentence's age, muted, unless it is new.
  widgetAge: { text: reading.explanation_new ? '' : (age ?? ''), source: 'apps/client/targets/widget/NewsworthyWidget.swift', quote: 'Text(verbatim: parts.age)', on: [CUES.home[0], CUES.phoneOut[1]] },
  checked: { text: `Checked at ${clock(reading.created_at)}`, source: 'apps/client/targets/widget/NewsworthyWidget.swift', quote: '"Checked at \\(', on: [CUES.home[0], CUES.phoneOut[1]] },
  statusTime: { text: clock(reading.fetched_at), source: READING, quote: '"fetched_at"', on: [0, CUES.phoneOut[1]] },
  wordmark: { text: 'NEWSWORTHY', source: 'apps/client/components/brand-mark.tsx', quote: '>NEWSWORTHY<', on: [0, CUES.phoneOut[1]] },
  name: script('Newsworthy', [CUES.word[0], DURATION]),
  tagline: { text: 'World news, rated by significance.', source: 'docs/product-messaging.md', quote: '**World news, rated by significance.**', on: [CUES.tagline[0], DURATION] },
  store: script('$1 on the App Store', [CUES.store[0], DURATION]),
  price: { text: '', source: 'docs/product-messaging.md', quote: 'one-time US$1 download', on: [CUES.store[0], DURATION] },
};
export const say = key => COPY[key].text;

export const FILM = [
  'store/video/today/composition.html', 'store/video/today/composition.js', 'store/video/today/timeline.js',
  'store/video/today/film.js', 'store/video/today/score.mjs', 'store/scripts/render-trailer.mjs', 'design/colors.js',
  'store/video/fonts/inter-latin-opsz-normal.woff2', 'store/video/fonts/roboto-mono-latin-300-normal.woff2',
  'vendor/skills/skills/youtube-shorts/assets/zones.json',
];

export const CUT_RECORD = 'store/video/today/cut.json';
// The reading with its sentence set down: the frame to pick as the cover.
export const POSTER_SECONDS = 2.5;
export const THUMBNAIL = { seconds: POSTER_SECONDS, out: 'store/assets/youtube/today-thumbnail-1080x1920.jpg', maxBytes: 2e6 };
// A calm, mostly still picture: at the trailer's quality it encoded under
// YouTube's recommended 8 Mb/s, so it is encoded finer.
export const TARGET = { width: 432, height: 768, scale: 2.5, crf: 14, out: 'store/assets/youtube/today-1080x1920.mp4' };

// YouTube's recommended upload settings, as for the trailer; a Short may be
// any length up to three minutes, and this one is meant to loop.
export const REQUIREMENTS = {
  seconds: [10, 60], fps: 30, codec: 'h264', minKbps: 8000, maxBytes: 95 * 1024 * 1024,
  audio: { codec: 'aac', channels: 'stereo', rates: [48000], kbps: 320 },
  loudness: { lufs: [-15, -13], truePeak: -1 },
};
