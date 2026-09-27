// The introduction shown once on a phone's first launch and replayed from
// Settings. Copy follows docs/product-messaging.md: it says what the number is,
// and nothing about how often to come back. It does not
// mention AI or warn that ratings can be wrong; the support page does. Kept
// here rather than in the screen so the tests read the same words.
//
// The introduction exists only in the phone apps; the website has none.
// Illustrations are drawn per platform. Titles are kept
// between TITLE_LENGTH.min and .max characters and bodies within BODY_LENGTH,
// so every slide carries about the same amount of text; the screen puts every
// title at the same height.

/** @typedef {'ios' | 'android'} Platform */
/** @typedef {'scale' | 'widget' | 'alert'} SlideArt */
/** @typedef {{ key: string, title: string, body: string, art: SlideArt }} Slide */

export const TITLE_LENGTH = Object.freeze({ min: 18, max: 24 });
// Two lines at the default text size on a phone,
// inside the four the screen reserves, so nothing below a title moves.
export const BODY_LENGTH = Object.freeze({ min: 55, max: 75 });

// Each slide states what the app does, plainly. It does not teach the phone
// (how to add a widget, where a switch is) or point at Settings: people know
// their devices, and a tour of controls is noise in an app this small.

/** @param {Platform} platform @returns {Slide[]} */
export function onboardingSlides(platform) {
  return [
    { key: 'what', art: 'scale', title: 'News, rated 1 to 10',
      body: 'The number rates the news right now.\nThe sentence names the top story.' },
    // Apple writes Home Screen as a name; Android does not.
    { key: 'widget', art: 'widget', title: platform === 'ios' ? 'Also on your Home Screen' : 'Also on your home screen',
      body: 'A widget shows the current rating and when it was updated.' },
    { key: 'alert', art: 'alert', title: 'Optional notifications',
      body: 'Off by default. When on, one per development, at the score you choose.' },
  ];
}
