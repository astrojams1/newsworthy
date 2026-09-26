import test from 'node:test';
import assert from 'node:assert/strict';
import { BODY_MAX_LENGTH, TITLE_LENGTH, onboardingSlides } from '../apps/client/lib/onboarding.js';

test('the apps introduce widgets and alerts in their own platform\'s words; the website has neither', () => {
  const keys = platform => onboardingSlides(platform).map(slide => slide.key);
  assert.deepEqual(keys('ios'), ['what', 'scale', 'fade', 'widget', 'alert', 'settings']);
  assert.deepEqual(keys('android'), keys('ios'));
  assert.deepEqual(keys('web'), ['what', 'scale', 'fade', 'settings']);
  const slide = (platform, key) => onboardingSlides(platform).find(s => s.key === key);
  assert.match(slide('ios', 'widget').body, /tap Edit, then Add Widget/);
  assert.match(slide('android', 'widget').body, /tap Widgets/);
  assert.equal(slide('ios', 'widget').title, 'Your Home Screen widget', 'iOS names its Home Screen in capitals');
  assert.equal(slide('android', 'widget').title, 'Your home screen widget');
  assert.match(slide('ios', 'alert').body, /iOS asks/);
  assert.match(slide('android', 'alert').body, /Android may ask/);
  for (const platform of ['ios', 'android']) {
    assert.match(slide(platform, 'alert').body, /^Off by default\./, 'alerts are described as optional first');
    assert.match(slide(platform, 'alert').body, /once per development/);
    assert.match(slide(platform, 'alert').body, /8 to start/);
  }
  assert.doesNotMatch(slide('web', 'settings').body, /alert/, 'the website has no alerts to set');
});

test('titles are about the same length and bodies fit the same four lines on every slide', () => {
  for (const platform of ['ios', 'android', 'web']) for (const { key, title, body } of onboardingSlides(platform)) {
    assert.ok(title.length >= TITLE_LENGTH.min && title.length <= TITLE_LENGTH.max, `${platform} ${key}: "${title}" is ${title.length} characters`);
    assert.ok(!/[.!?]$/.test(title), `${platform} ${key}: titles share one form, with no end punctuation`);
    assert.ok(body.length <= BODY_MAX_LENGTH, `${platform} ${key}: body is ${body.length} characters`);
  }
});
