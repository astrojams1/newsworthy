import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { CUES, DURATION, FPS } from '../store/video/timeline.js';
import { COPY, FILM, POSTER_SECONDS, REQUIREMENTS, SCENES, TARGETS } from '../store/video/reel.js';

// The store preview reel (store/video) is rendered rarely and slowly, so the
// cheap facts it rests on are checked here: a remake that breaks one finds out
// before a twenty-minute render rather than after an upload.

test('the reel runs as long as Apple allows, at a frame rate it accepts', () => {
  const [min, max] = REQUIREMENTS.seconds;
  const seconds = Math.round(DURATION * FPS) / FPS;
  assert.ok(seconds >= min && seconds <= max, `${seconds} s is outside ${min}–${max} s`);
  assert.ok(FPS <= REQUIREMENTS.maxFps);
});

test('every cue and scene falls inside the film, scenes in order', () => {
  for (const [name, cue] of Object.entries(CUES)) {
    for (const t of [cue].flat()) assert.ok(t >= 0 && t <= DURATION, `${name} at ${t} s`);
  }
  assert.equal(SCENES[0].start, 0);
  SCENES.forEach((scene, i) => {
    assert.ok(scene.start < DURATION, scene.id);
    if (i) assert.ok(scene.start > SCENES[i - 1].start, `${scene.id} starts before ${SCENES[i - 1].id}`);
  });
  assert.ok(POSTER_SECONDS > 0 && POSTER_SECONDS < DURATION);
});

// --stale compares these files against the last cut; a renamed or deleted one
// would drop out of the comparison silently.
test('every file the reel is made from, depicts or quotes exists', () => {
  for (const file of FILM) assert.ok(existsSync(file), `the film is made from missing ${file}`);
  for (const scene of SCENES) for (const file of scene.depicts) assert.ok(existsSync(file), `${scene.id} depicts missing ${file}`);
  for (const [key, line] of Object.entries(COPY)) assert.ok(existsSync(line.source), `${key} quotes missing ${line.source}`);
});

// The film quotes the app. When the app's words change, this says so in the
// same change, rather than a store listing going on showing the old ones.
test('every line on screen is still in its source, word for word', () => {
  for (const [key, line] of Object.entries(COPY)) {
    const source = readFileSync(line.source, 'utf8');
    for (const quote of [line.quote].flat()) {
      assert.ok(source.includes(quote), `store/video/reel.js line ${key} quotes ${quote} from ${line.source}, which no longer contains it. ` +
        'Update the line there; the store preview video then needs a new render (.agents/skills/newsworthy-preview-reel/SKILL.md).');
    }
  }
});

test('each cut renders at its store size', () => {
  const size = target => `${Math.round(target.width * target.scale)}x${Math.round(target.height * target.scale)}`;
  assert.equal(size(TARGETS.ios), '886x1920');
  assert.equal(size(TARGETS.android), '1080x1920');
});
