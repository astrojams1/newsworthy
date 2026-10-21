// What the trailer is made of: its scenes and the app files each one draws,
// every line it puts on screen with the file whose words it uses, and the
// video it renders with the rules it must meet. The film reads its words from
// here; store/scripts/render-trailer.mjs reads the rest; test/trailer.test.js
// keeps every quote true. The lines written for the trailer itself quote its
// script in store/video/trailer/README.md, which records the owner's brief.
import { CUES, DURATION } from './timeline.js';

const SCRIPT = 'store/video/trailer/README.md';

export const SCENES = [
  { id: 'noise', start: 0, title: 'An endless feed, faster and faster',
    depicts: [] },
  { id: 'hush', start: CUES.hush, title: 'The feed stops; one story rises',
    depicts: ['public/tokens.js'] },
  { id: 'reading', start: CUES.drop, title: 'The story becomes the reading; the scale rolls',
    depicts: ['apps/client/app/index.tsx', 'apps/client/components/brand-mark.tsx', 'apps/client/components/glyph.tsx',
      'public/tokens.js', 'public/levels.css', 'design/palette.json'] },
  { id: 'widgets', start: CUES.widget[0], title: 'The reading closes into a Home Screen widget',
    depicts: ['apps/client/targets/widget/NewsworthyWidget.swift', 'apps/client/lib/onboarding.js'] },
  { id: 'notification', start: CUES.night[0], title: 'A notification on the lock screen',
    depicts: ['src/push.js', 'apps/client/lib/onboarding.js', 'apps/client/lib/preferences.js'] },
  { id: 'price', start: CUES.phoneOut[0], title: 'One dollar, and nothing else to buy',
    depicts: ['store/store.json', 'docs/product-messaging.md'] },
  { id: 'end', start: CUES.focus[0], title: 'Why it exists, then the name',
    depicts: ['scripts/generate-brand.mjs', 'docs/product-messaging.md'] },
];

// Every line the film writes, the file it is taken from, and when it is on
// screen. `quote` is the exact text the source must still contain; `text` is
// what the film draws.
const script = (text, on) => ({ text, source: SCRIPT, quote: `| ${text} |`, on });
export const COPY = {
  everyDay: script('Every day,', CUES.everyDay),
  thousands: script('thousands of stories', CUES.thousands),
  comeAndGo: script('come and go.', CUES.comeAndGo),
  doomscroll: script('You could doomscroll', CUES.doomscroll),
  allDay: script('all day…', CUES.allDay),
  orSee: script('…or see only', CUES.orSee),
  breaks: script('what breaks through.', CUES.breaks),
  worldNews: script('World news,', CUES.worldNews),
  rated: script('rated 1 to 10.', CUES.rated),
  oneNumber: script('One number.', CUES.oneNumber),
  oneSentence: script('One sentence.', CUES.oneSentence),
  home: { text: 'Also on your Home Screen', source: 'apps/client/lib/onboarding.js', quote: "'Also on your Home Screen'", on: CUES.homeLine },
  notify: { text: 'Optional notifications', source: 'apps/client/lib/onboarding.js', quote: "title: 'Optional notifications'", on: CUES.notifyLine },
  choose: { text: 'at the score you choose.', source: 'apps/client/lib/onboarding.js', quote: "at the score you choose.'", on: CUES.scoreLine },
  notification: { text: 'Newsworthy · 8/10', source: 'src/push.js', quote: 'title: `Newsworthy · ${score}/10`', on: [CUES.notification, CUES.phoneOut[1]] },
  wordmark: { text: 'NEWSWORTHY', source: 'apps/client/components/brand-mark.tsx', quote: '>NEWSWORTHY<', on: [CUES.drop, CUES.night[1]] },
  checked: { text: 'Checked at 9:37', source: 'apps/client/targets/widget/NewsworthyWidget.swift', quote: '"Checked at \\(', on: [CUES.widget[0], CUES.night[1]] },
  price: { text: '$1', source: 'docs/product-messaging.md', quote: 'one-time US$1 download', on: [CUES.dollar, CUES.priceOut[1]] },
  once: script('once', [CUES.once, CUES.priceOut[1]]),
  noAds: script('No ads.', [CUES.noAds, CUES.priceOut[1]]),
  noSubscription: script('No subscription.', [CUES.noSubscription, CUES.priceOut[1]]),
  noPurchases: script('No in-app purchases.', [CUES.noPurchases, CUES.priceOut[1]]),
  // The listing's own record of what the purchase includes.
  nothingElse: { text: '', source: 'store/store.json', quote: 'no additional paid features, in-app purchases, subscriptions or ads', on: [CUES.noAds, CUES.priceOut[1]] },
  focus: script('Stay focused', CUES.focus),
  matters: script('on what matters.', CUES.matters),
  name: { text: 'Newsworthy', source: 'docs/product-messaging.md', quote: '“Newsworthy”', on: [CUES.word[0], DURATION] },
  tagline: { text: 'World news, rated by significance.', source: 'docs/product-messaging.md', quote: '**World news, rated by significance.**', on: [CUES.tagline[0], DURATION] },
  store: script('On the App Store', [CUES.store[0], DURATION]),
};
export const say = key => COPY[key].text;

// The files that make the picture and the sound, besides the app files above.
export const FILM = [
  'store/video/trailer/composition.html', 'store/video/trailer/composition.js', 'store/video/trailer/timeline.js',
  'store/video/trailer/film.js', 'store/video/trailer/score.mjs', 'store/scripts/render-trailer.mjs', 'design/colors.js',
  'store/video/fonts/inter-latin-opsz-normal.woff2', 'store/video/fonts/roboto-mono-latin-300-normal.woff2',
  'vendor/skills/skills/youtube-shorts/assets/zones.json',
];

// Where each render records what it was made from.
export const CUT_RECORD = 'store/video/trailer/cut.json';

// A frame to offer as the Shorts thumbnail: the reading at the top of the scale.
export const POSTER_SECONDS = 12.9;

// YouTube Shorts: vertical 9:16. The phone is drawn as an iPhone, the only
// platform where the app is approved; Google Play is still in closed testing.
export const TARGET = { width: 432, height: 768, scale: 2.5, out: 'store/assets/youtube/trailer-1080x1920.mp4' };

// YouTube's recommended upload settings (YouTube Help, "Recommended upload
// encoding settings"): H.264 High, progressive, 4:2:0, AAC-LC stereo at 48 kHz,
// at least 8 Mbps for 1080p at 30 fps. Shorts are vertical and at most three
// minutes. Loudness is set near YouTube's −14 LUFS playback reference so the
// trailer is not turned down, with true peaks under −1 dBTP.
export const REQUIREMENTS = {
  seconds: [15, 60], fps: 30, codec: 'h264', minKbps: 8000, maxBytes: 95 * 1024 * 1024,
  audio: { codec: 'aac', channels: 'stereo', rates: [48000], kbps: 320 },
  loudness: { lufs: [-15, -13], truePeak: -1 },
};
