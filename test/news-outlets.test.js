import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outletNamed } from '../src/outlets.js';

test('the caller review flags the stored sentences that named an outlet', () => {
  // Readings 770, 745 and 676, verbatim: the cases prompt v19 was written for.
  assert.equal(outletNamed("Trump rejected Iran's offer to end the war and reopen a key oil shipping route within a week, the Wall Street Journal said."), 'Wall Street Journal');
  assert.equal(outletNamed('US and Iran are in early talks on reopening the Strait of Hormuz and ending the US blockade, Reuters said, which may ease fuel prices.'), 'Reuters');
  assert.equal(outletNamed('Trump suspended White House press pool coverage and barred CNN, MS Now and Politico from access to the building.'), 'CNN');
});

test('and leaves attribution to governments, officials and markets alone', () => {
  for (const sentence of [
    'Saudi Arabia said its air defenses intercepted a Houthi ballistic missile aimed at Riyadh, with no casualties or damage reported.',
    "Trump reportedly rejected Iran's offer to reopen the Strait of Hormuz, which could push oil prices up when markets reopen.",
    'The White House barred reporters from three news outlets, a political dispute unlikely to affect prices or savings.',
    'Japan stocks fell as the Nikkei dropped 3%, and an economist said the yen could weaken further.',
    'The Fed held rates, and APAC markets were steady.',
  ]) assert.equal(outletNamed(sentence), null, sentence);
});
