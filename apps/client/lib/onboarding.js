// The introduction shown once on a phone's first launch and replayed from
// Settings. Copy follows docs/product-messaging.md: it says what the number is,
// that it can be wrong and that it fades, and nothing about how often to come
// back. Kept here rather than in the screen so the tests read the same words.

/** @typedef {'scale' | 'levels' | 'fade' | 'settings'} SlideArt */
/** @typedef {{ key: string, title: string, body: string, art: SlideArt }} Slide */

/** @param {{ push: boolean }} options @returns {Slide[]} */
export function onboardingSlides({ push }) {
  return [
    { key: 'what', art: 'scale', title: 'World news, rated by significance.',
      body: 'Newsworthy uses AI to assess world news. Each reading has a score from 1 to 10, a brief explanation and an update time.' },
    { key: 'scale', art: 'levels', title: 'Higher means more consequential.',
      body: 'The score is an AI assessment of consequence. It can be wrong, and it is not a measure of personal safety or an emergency alert.' },
    { key: 'fade', art: 'fade', title: 'Scores fade as news ages.',
      body: 'Ratings update periodically. A development’s score fades as it ages, and a bold New: marks its first coverage for two hours.' },
    { key: 'settings', art: 'settings', title: 'Settings are yours.',
      body: push
        ? 'Choose Light, Dark or Follow device, and optionally a notification for high scores, off by default. You can replay this introduction there.'
        : 'Choose Light, Dark or Follow device. You can replay this introduction there.' },
  ];
}
