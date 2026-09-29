// What the preview reel is made of and what it depends on: its scenes and the
// app files each one draws, every line it puts on screen with the file whose
// words it uses, and the videos it renders with the rules they must meet.
// The film reads its words from here; the renderer's --stale and --verify
// read the rest; test/preview-reel.test.js keeps the paths real. When the app
// changes, --stale lists the scenes whose sources moved since the last cut.
import { CUES, DURATION } from './timeline.js';

export const SCENES = [
  { id: 'open', start: 0, title: 'The splash dash lifts into the reading',
    depicts: ['apps/client/app.config.js', 'apps/client/app/index.tsx', 'apps/client/components/brand-mark.tsx',
      'apps/client/components/app-icon.tsx', 'apps/client/components/glyph.tsx', 'scripts/generate-brand.mjs'] },
  { id: 'scale', start: 1.4, title: 'An odometer roll through the scale',
    depicts: ['apps/client/app/index.tsx', 'design/surfaces.json', 'design/palette.json', 'public/tokens.js',
      'public/levels.css', 'apps/client/lib/reading-gradient.js'] },
  { id: 'reading', start: 4.9, title: 'The reading settles',
    depicts: ['apps/client/app/index.tsx', 'apps/client/app/onboarding.tsx'] },
  { id: 'widgets', start: 7.0, title: 'The screen closes into widgets',
    depicts: ['apps/client/targets/widget/NewsworthyWidget.swift', 'apps/client/plugins/widget-android/res/layout/rating_widget.xml',
      'apps/client/plugins/widget-android/res/layout/rating_widget_compact.xml', 'design/surfaces.json'] },
  { id: 'notifications', start: 9.4, title: 'Dark, then a notification',
    depicts: ['apps/client/app/settings/notifications.tsx', 'apps/client/components/settings-list.tsx', 'apps/client/components/toggle.tsx',
      'apps/client/lib/preferences.js', 'src/push.js', 'apps/client/app/onboarding.tsx'] },
  { id: 'end', start: 12.3, title: 'The icon turns over into the end card',
    depicts: ['scripts/generate-brand.mjs', 'public/tokens.js'] },
];

// Every line the film writes, the file it is taken from, and when it is on
// screen. `quote` is the exact text the source must still contain, quotes and
// tags included, so a line that changes case, loses a word or is renamed around
// it is caught; `text` is what the film draws, which may be a fragment of it.
const card = [CUES.card[0], CUES.flight[0] + 0.35];
export const COPY = {
  s1: { text: 'News, rated 1 to 10', source: 'apps/client/lib/onboarding.js', quote: "title: 'News, rated 1 to 10'", on: CUES.s1 },
  s2a: { text: 'The number rates the news right now.', source: 'apps/client/lib/onboarding.js', quote: "'The number rates the news right now.", on: CUES.s2 },
  s2b: { text: 'The sentence names the top story.', source: 'apps/client/lib/onboarding.js', quote: "The sentence names the top story.'", on: [CUES.bars[0], CUES.s2[1]] },
  s3: { ios: 'Also on your Home Screen', android: 'Also on your home screen', source: 'apps/client/lib/onboarding.js',
    quote: ["'Also on your Home Screen'", "'Also on your home screen'"], on: CUES.s3 },
  s4: { text: 'Optional notifications', source: 'apps/client/lib/onboarding.js', quote: "title: 'Optional notifications'", on: CUES.s4 },
  s4b: { text: 'At the score you choose.', source: 'apps/client/lib/onboarding.js', quote: "at the score you choose.'", on: [CUES.s4[0] + 0.2, CUES.s4[1]] },
  wordmark: { text: 'NEWSWORTHY', source: 'apps/client/components/brand-mark.tsx', quote: '>NEWSWORTHY<', on: [CUES.chrome[0], CUES.widgetsOut[1]] },
  checked: { text: 'Checked at 9:37', source: 'apps/client/targets/widget/NewsworthyWidget.swift', quote: '"Checked at \\(', on: [CUES.checked[0], CUES.morph[0] + 0.4] },
  alerts: { text: 'High-score alerts', source: 'apps/client/app/settings/notifications.tsx', quote: 'label="High-score alerts"', on: card },
  threshold: { text: 'Threshold', source: 'apps/client/app/settings/notifications.tsx', quote: 'label="Threshold"', on: card },
  thresholdValue: { text: '8 or higher', source: 'apps/client/app/settings/notifications.tsx', quote: '`${threshold} or higher`', on: card },
  notification: { text: 'Newsworthy · 8/10', source: 'src/push.js', quote: 'title: `Newsworthy · ${score}/10`', on: [CUES.notification[0], CUES.flight[0] + 0.3] },
  name: { text: 'Newsworthy', source: 'docs/product-messaging.md', quote: '“Newsworthy”', on: [CUES.word[0], DURATION] },
  tagline: { text: 'World news, rated by significance.', source: 'docs/product-messaging.md', quote: '**World news, rated by significance.**', on: [CUES.tagline[0], DURATION] },
};

// The files that make the picture and the sound, besides the app files above.
// A change to one needs a new render; documentation here does not.
export const FILM = [
  'store/video/composition.html', 'store/video/composition.js', 'store/video/timeline.js', 'store/video/reel.js',
  'store/video/score.mjs', 'store/scripts/render-video.mjs', 'design/colors.js',
  'store/video/fonts/inter-latin-opsz-normal.woff2', 'store/video/fonts/roboto-latin-400-normal.woff2',
  'store/video/fonts/roboto-latin-500-normal.woff2', 'store/video/fonts/roboto-mono-latin-300-normal.woff2',
];

// Where each render records what it was made from (see render-video.mjs).
export const CUT_RECORD = 'store/video/cut.json';

// The frame to show before a preview plays: the reading, composed, with its
// line beneath. App Store Connect sets it by hand (Edit Poster Frame).
export const POSTER_SECONDS = 6.0;

// The line to draw on a platform.
export const say = (key, platform) => COPY[key][platform] ?? COPY[key].text;

// App Store previews for 6.9-, 6.5- and 6.3-inch iPhones; Google Play takes a
// YouTube link, and a 9:16 portrait video suits a portrait app.
export const TARGETS = {
  ios: { width: 443, height: 960, scale: 2, out: 'store/assets/apple/app-preview/iphone-886x1920.mp4', store: 'App Store' },
  android: { width: 432, height: 768, scale: 2.5, out: 'store/assets/google-play/video/promo-1080x1920.mp4', store: 'Google Play' },
};

// Apple's app preview specification (App Store Connect Help, "App preview
// specifications", read 2026-09-27). Google imposes none of these on a YouTube
// video, so both cuts are held to Apple's.
export const REQUIREMENTS = {
  seconds: [15, 30], maxFps: 30, codec: 'h264', maxLevel: 40, maxBytes: 500 * 1024 * 1024,
  audio: { codec: 'aac', channels: 'stereo', rates: [44100, 48000], kbps: 256 },
};
