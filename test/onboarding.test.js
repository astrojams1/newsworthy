import test from 'node:test';
import assert from 'node:assert/strict';
import { BODY_MAX_LENGTH, TITLE_LENGTH, onboardingSlides } from '../apps/client/lib/onboarding.js';

const platforms = ['ios', 'android', 'web'];

test('the apps add a widget and a notifications slide; the website has neither', () => {
  const keys = platform => onboardingSlides(platform).map(slide => slide.key);
  assert.deepEqual(keys('ios'), ['what', 'scale', 'fade', 'widget', 'alert']);
  assert.deepEqual(keys('android'), keys('ios'));
  assert.deepEqual(keys('web'), ['what', 'scale', 'fade']);
  const slide = (platform, key) => onboardingSlides(platform).find(s => s.key === key);
  assert.equal(slide('ios', 'widget').title, 'Also on your Home Screen', 'Apple writes Home Screen as a name');
  assert.equal(slide('android', 'widget').title, 'Also on your home screen');
  // The widget picker's own description (docs/product-messaging.md).
  assert.match(slide('ios', 'widget').body, /the current rating and when it was updated/);
  for (const platform of ['ios', 'android']) {
    assert.match(slide(platform, 'alert').body, /^Off by default\./, 'notifications are described as optional first');
    assert.match(slide(platform, 'alert').body, /one notification per development/);
  }
});

// Reported 2026-09-27: the copy read as emotional and spent its slides on how
// the phone works. It states what the app does; the reader knows their device.
test('the introduction states what the app does, without teaching the device or pointing at Settings', () => {
  for (const platform of platforms) for (const { key, title, body } of onboardingSlides(platform)) {
    const text = `${title} ${body}`;
    assert.doesNotMatch(text, /\bSettings\b|\btap\b|touch and hold|\bswipe\b|\bpermission\b|\basks?\b/i, `${platform} ${key}: "${text}"`);
    // Reported 2026-09-27: no mention of AI and no warnings that it can err.
    assert.doesNotMatch(text, /\bAI\b|artificial|\bmodel\b|mistake|\bwrong\b|\berrors?\b|accura/i, `${platform} ${key}: "${text}"`);
    assert.doesNotMatch(text, /\byou ask\b|\byours?\b.*\bown\b|!|\bjust\b|\bonly if\b|\bworry|\bcalm|\banxi|\bbreath/i, `${platform} ${key}: no emotional framing`);
  }
});

test('titles are about the same length and bodies fit the same four lines on every slide', () => {
  for (const platform of platforms) for (const { key, title, body } of onboardingSlides(platform)) {
    assert.ok(title.length >= TITLE_LENGTH.min && title.length <= TITLE_LENGTH.max, `${platform} ${key}: "${title}" is ${title.length} characters`);
    assert.ok(!/[.!?]$/.test(title), `${platform} ${key}: titles share one form, with no end punctuation`);
    assert.ok(body.length <= BODY_MAX_LENGTH, `${platform} ${key}: body is ${body.length} characters`);
  }
});
