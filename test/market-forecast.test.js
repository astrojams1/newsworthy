import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marketForecast } from '../scripts/market-forecast.mjs';

test('the caller review flags sentences that predict a market move', () => {
  // Readings 985, 987 and 913, verbatim: the tails prompt v21 was written for.
  for (const sentence of [
    "Yemen's Houthis said they fired missiles at Saudi oil sites near Riyadh, which could lift oil and gas prices when trading reopens.",
    'Talks to reopen the Strait of Hormuz stalled as Iran readies a reply to a US rejection, which could lift oil and fuel prices this week.',
    'US hiring figures due Oct 2 could swing long-term borrowing costs, already at their highest in 24 years, and with them mortgage rates.',
  ]) assert.ok(marketForecast(sentence), sentence);
});

test('and leaves moves that happened, and hedges about other things, alone', () => {
  for (const sentence of [
    'The US added far fewer jobs than expected in September, so traders now see less chance the Fed raises interest rates this month.',
    "Yemen's Houthis said they struck Saudi oil sites, but oil prices slipped as G7 nations release 100 million barrels from reserves.",
    'Trump said he will decide within days between a deal with Iran and new US strikes, with no deal terms announced so far.',
    'A glacial lake burst in Nepal near the China border, killing at least 120 people, and rescue work is continuing.',
  ]) assert.equal(marketForecast(sentence), null, sentence);
});
