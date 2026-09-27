// The introduction shown once on a phone's first launch and replayed from
// Settings. Copy follows docs/product-messaging.md: it says what the number is,
// that it can be wrong and that it fades, and nothing about how often to come
// back. Kept here rather than in the screen so the tests read the same words.
//
// Widgets and notifications exist only in the apps, so the website has
// neither slide; their illustrations are drawn per platform. Titles are kept between TITLE_LENGTH.min and .max characters so
// each fits one line at the default text size and none reads as a heading of
// a different kind; the screen puts every title at the same height.

/** @typedef {'ios' | 'android' | 'web'} Platform */
/** @typedef {'scale' | 'levels' | 'fade' | 'widget' | 'alert'} SlideArt */
/** @typedef {{ key: string, title: string, body: string, art: SlideArt }} Slide */

export const TITLE_LENGTH = Object.freeze({ min: 18, max: 24 });
// Bodies stay within four lines at the default text size, so the space under
// every title is the same height and nothing below it moves between slides.
export const BODY_MAX_LENGTH = 140;

// Each slide states what the app does, plainly. It does not teach the phone
// (how to add a widget, where a switch is) or point at Settings: people know
// their devices, and a tour of controls is noise in an app this small.

/** @param {Platform} platform @returns {Slide[]} */
export function onboardingSlides(platform) {
  const native = platform === 'ios' || platform === 'android';
  return [
    { key: 'what', art: 'scale', title: 'News, rated 1 to 10',
      body: 'Newsworthy uses AI to assess world news. Each reading has a score, a brief explanation and an update time.' },
    { key: 'scale', art: 'levels', title: 'Ten is most significant',
      body: 'The score is an AI assessment of how consequential the news is. It can be wrong.' },
    { key: 'fade', art: 'fade', title: 'Scores fade with time',
      body: 'As a development ages, its score eases. A bold New: marks its first coverage.' },
    ...(native ? [
      // Apple writes Home Screen as a name; Android does not.
      { key: 'widget', art: /** @type {const} */ ('widget'), title: platform === 'ios' ? 'Also on your Home Screen' : 'Also on your home screen',
        body: 'A widget shows the current rating and when it was updated.' },
      { key: 'alert', art: /** @type {const} */ ('alert'), title: 'Optional notifications',
        body: 'Off by default. When on, one notification per development, at the score you choose.' },
    ] : []),
  ];
}
