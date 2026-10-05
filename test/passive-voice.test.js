import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passiveVoice } from '../scripts/passive-voice.mjs';

test('the caller review flags passives that hide who acted', () => {
  // Readings 961, 948 and 986, verbatim: the cases prompt v22 was written for.
  for (const sentence of [
    'Two oil tankers were reportedly hit in the Strait of Hormuz, which could push oil and fuel prices higher when markets reopen.',
    'An oil tanker was struck in the Strait of Hormuz on Oct 2, the sixth this week, which could push up fuel and oil prices.',
    "Yemen's Houthis said they hit a Saudi oil site near Riyadh as more tankers were struck near Hormuz, which could lift fuel prices.",
  ]) assert.ok(passiveVoice(sentence), sentence);
});

test('and leaves active sentences, states and named actors alone', () => {
  for (const sentence of [
    "Iran said it hit another tanker near the Strait of Hormuz, a key oil shipping route.",
    'The Fed is expected to decide on interest rates on Oct 28.',
    'Iran said the Strait of Hormuz will stay shut until the US meets its terms.',
    'Peace talks set for Oct 6 were postponed by Oman, the mediator, which gave no reason.',
    "Yemen's Houthi rebels said they struck Saudi oil company Aramco's sites near Riyadh, which Saudi Arabia has not confirmed.",
  ]) assert.equal(passiveVoice(sentence), null, sentence);
});
