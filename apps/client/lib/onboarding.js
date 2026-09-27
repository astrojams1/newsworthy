// The introduction shown once on a phone's first launch and replayed from
// Settings. Copy follows docs/product-messaging.md: it says what the number is
// and that it fades, and nothing about how often to come back. It does not
// mention AI or warn that ratings can be wrong; the support page does. Kept
// here rather than in the screen so the tests read the same words.
//
// The introduction exists only in the phone apps; the website has none.
// Illustrations are drawn per platform. Titles are kept
// between TITLE_LENGTH.min and .max characters and bodies within BODY_LENGTH,
// so every slide carries about the same amount of text; the screen puts every
// title at the same height. **Word** in a body is drawn bold.

/** @typedef {'ios' | 'android'} Platform */
/** @typedef {'scale' | 'levels' | 'fade' | 'widget' | 'alert'} SlideArt */
/** @typedef {{ key: string, title: string, body: string, art: SlideArt }} Slide */

export const TITLE_LENGTH = Object.freeze({ min: 18, max: 24 });
// Counted without the ** marks. Two lines at the default text size on a phone,
// inside the four the screen reserves, so nothing below a title moves.
export const BODY_LENGTH = Object.freeze({ min: 70, max: 85 });

// Each slide states what the app does, plainly. It does not teach the phone
// (how to add a widget, where a switch is) or point at Settings: people know
// their devices, and a tour of controls is noise in an app this small.

/** @param {Platform} platform @returns {Slide[]} */
export function onboardingSlides(platform) {
  return [
    { key: 'what', art: 'scale', title: 'News, rated 1 to 10',
      body: 'Each reading is a score, a short explanation and the time it was last updated.' },
    { key: 'scale', art: 'levels', title: 'Ten is most significant',
      body: 'Higher scores mean more consequential news. The color changes with the score.' },
    { key: 'fade', art: 'fade', title: 'Scores fade with time',
      body: '**New** marks the first coverage of a development. As it ages, its score eases.' },
    // Apple writes Home Screen as a name; Android does not.
    { key: 'widget', art: 'widget', title: platform === 'ios' ? 'Also on your Home Screen' : 'Also on your home screen',
      body: 'A widget shows the current rating and when it was updated, without opening the app.' },
    { key: 'alert', art: 'alert', title: 'Optional notifications',
      body: 'Off by default. When on, one notification per development, at the score you choose.' },
  ];
}
