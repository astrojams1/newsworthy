// The introduction shown once on a phone's first launch and replayed from
// Settings. Copy follows docs/product-messaging.md: it says what the number is,
// that it can be wrong and that it fades, and nothing about how often to come
// back. Kept here rather than in the screen so the tests read the same words.
//
// Widgets and alerts exist only in the apps, and each platform adds a widget
// its own way, so those two slides are written per platform and the website
// has neither. Titles are kept between TITLE_LENGTH.min and .max characters so
// each fits one line at the default text size and none reads as a heading of
// a different kind; the screen puts every title at the same height.

/** @typedef {'ios' | 'android' | 'web'} Platform */
/** @typedef {'scale' | 'levels' | 'fade' | 'widget' | 'alert' | 'settings'} SlideArt */
/** @typedef {{ key: string, title: string, body: string, art: SlideArt }} Slide */

export const TITLE_LENGTH = Object.freeze({ min: 18, max: 24 });
// Bodies stay within four lines at the default text size, so the space under
// every title is the same height and nothing below it moves between slides.
export const BODY_MAX_LENGTH = 140;

/** @param {Platform} platform @returns {Slide[]} */
export function onboardingSlides(platform) {
  const native = platform === 'ios' || platform === 'android';
  const ios = platform === 'ios';
  return [
    { key: 'what', art: 'scale', title: 'News, rated 1 to 10',
      body: 'Newsworthy uses AI to assess world news. Each reading has a score, a brief explanation and an update time.' },
    { key: 'scale', art: 'levels', title: 'Higher means more impact',
      body: 'The score is an AI assessment of consequence. It can be wrong, and it is not a safety measure or an emergency alert.' },
    { key: 'fade', art: 'fade', title: 'Scores fade with time',
      body: 'Ratings update periodically and fade as news ages. A bold New: marks a development’s first coverage for two hours.' },
    ...(native ? [
      { key: 'widget', art: /** @type {const} */ ('widget'), title: ios ? 'Your Home Screen widget' : 'Your home screen widget',
        body: ios
          ? 'Touch and hold the Home Screen, tap Edit, then Add Widget, and choose Newsworthy. It shows the rating and its update time.'
          : 'Touch and hold an empty spot on the home screen, tap Widgets, and choose Newsworthy. It shows the rating and its update time.' },
      { key: 'alert', art: /** @type {const} */ ('alert'), title: 'Alerts, only if you ask',
        body: `Off by default. Turned on in Settings, you hear once per development at your chosen score, 8 to start. ${ios ? 'iOS asks you first.' : 'Android may ask first.'}` },
    ] : []),
    { key: 'settings', art: 'settings', title: 'Change it in Settings',
      body: native
        ? 'Choose Light, Dark or Follow device, pick your alert score, and replay this introduction in Settings.'
        : 'Choose Light, Dark or Follow device in Settings, and replay this introduction there.' },
  ];
}
