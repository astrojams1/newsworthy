import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { BAR, CUES, DURATION, FPS, PINGS, ROLL, samplesAt } from '../store/video/trailer/timeline.js';
import { COPY, FILM, POSTER_SECONDS, REQUIREMENTS, SCENES, TARGET } from '../store/video/trailer/film.js';

// The YouTube trailer (store/video/trailer) is rendered rarely and slowly, so
// the cheap facts it rests on are checked here, before a render rather than
// after an upload.

test('the trailer runs about thirty seconds, inside a Short, at its frame rate', () => {
  const [min, max] = REQUIREMENTS.seconds;
  const seconds = Math.round(DURATION * FPS) / FPS;
  assert.ok(seconds >= min && seconds <= max, `${seconds} s is outside ${min}–${max} s`);
  assert.ok(Math.abs(seconds - 30) <= 3, `${seconds} s is not about thirty seconds`);
  assert.equal(FPS, REQUIREMENTS.fps);
});

test('every cue and scene falls inside the film, scenes in order', () => {
  for (const [name, cue] of Object.entries(CUES)) {
    for (const t of [cue].flat()) assert.ok(t >= 0 && t <= DURATION, `${name} at ${t} s`);
    if (Array.isArray(cue)) assert.ok(cue[0] < cue[1], `${name} ends before it starts`);
  }
  assert.equal(SCENES[0].start, 0);
  SCENES.forEach((scene, i) => {
    assert.ok(scene.start < DURATION, scene.id);
    if (i) assert.ok(scene.start > SCENES[i - 1].start, `${scene.id} starts before ${SCENES[i - 1].id}`);
  });
  assert.ok(POSTER_SECONDS > 0 && POSTER_SECONDS < DURATION);
});

// The picture and the score are cut to one bar; a cue that drifts off the
// grid lands a word or a digit between the beats the music plays.
test('the drop, the digits and the price land on the beat', () => {
  const onBeat = t => Math.abs(t / (BAR / 4) - Math.round(t / (BAR / 4))) < 1e-9;
  for (const name of ['drop', 'dollar', 'noAds', 'noSubscription', 'noPurchases', 'notification', 'ring']) assert.ok(onBeat(CUES[name]), `${name} at ${CUES[name]} s`);
  for (const step of ROLL) assert.ok(Math.abs(step.lands / (BAR / 8) - Math.round(step.lands / (BAR / 8))) < 1e-9, `digit ${step.to} at ${step.lands} s`);
  assert.ok(PINGS.every(p => p.t < CUES.hush), 'a notification after the hush');
  assert.ok(samplesAt(CUES.rush[1] - 0.2) > samplesAt(CUES.everyDay[0]));
});

test('every file the trailer is made from, depicts or quotes exists', () => {
  for (const file of FILM) assert.ok(existsSync(file), `the film is made from missing ${file}`);
  for (const scene of SCENES) for (const file of scene.depicts) assert.ok(existsSync(file), `${scene.id} depicts missing ${file}`);
  for (const [key, line] of Object.entries(COPY)) assert.ok(existsSync(line.source), `${key} quotes missing ${line.source}`);
});

// The film's words are the app's, the core copy, the listing's, or the
// script in the trailer's README, which records the owner's brief. A line
// changed in one place and not the other fails here.
test('every line on screen is still in its source, word for word', () => {
  for (const [key, line] of Object.entries(COPY)) {
    const source = readFileSync(line.source, 'utf8');
    for (const quote of [line.quote].flat()) {
      assert.ok(source.includes(quote), `store/video/trailer/film.js line ${key} quotes ${quote} from ${line.source}, which no longer contains it. ` +
        'Update the line there; the trailer then needs a new render (.agents/skills/newsworthy-preview-reel/SKILL.md).');
    }
  }
});

// docs/product-messaging.md keeps user-facing copy free of these; the
// trailer's brief made doomscrolling and the price an exception, not these.
test('no line mentions how ratings are made, or ranks or hurries', () => {
  const words = Object.values(COPY).map(line => line.text).join(' ');
  for (const banned of [/\bAI\b/, /artificial/i, /\bmodels?\b/i, /\bbest\b/i, /#1/, /\burgent/i, /download now/i, /market/i]) assert.doesNotMatch(words, banned);
});

test('the trailer renders vertical, at 1080 × 1920', () => {
  assert.equal(`${Math.round(TARGET.width * TARGET.scale)}x${Math.round(TARGET.height * TARGET.scale)}`, '1080x1920');
});
