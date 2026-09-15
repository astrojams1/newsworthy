import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import tokens from '../public/tokens.js';
import { contrast } from '../design/colors.js';
import { faviconSvg, levelPalette } from '../public/design.js';

test('reading identities only accept an integer level; invalid inputs cannot become SVG', () => {
  for (const score of [null, undefined, 0, 11, 1.5, '7', '<script>']) {
    assert.equal(levelPalette(score), tokens.brand);
    assert.ok(!faviconSvg(score).includes('<text'));
    assert.ok(!faviconSvg(score).includes('<script'));
  }
  assert.match(faviconSvg(10), />10<\/text>/);
  assert.notEqual(faviconSvg(7, true), faviconSvg(7, false));
});

test('all level and brand text meets AA on its intended surfaces in both appearances', () => {
  for (const palette of [tokens.brand, ...tokens.levels]) for (const mode of ['light', 'dark']) {
    const t = palette[mode];
    for (const surface of ['start', 'center', 'end', 'surface', 'tinted', 'elevated']) {
      for (const role of ['ink', 'gradientMuted', 'accent']) assert.ok(contrast(t[role], t[surface]) >= 4.5, `${palette.name} ${mode} ${role} on ${surface}`);
    }
    for (const surface of ['surface', 'tinted', 'elevated']) for (const role of ['muted', 'faint', 'danger']) {
      assert.ok(contrast(t[role], t[surface]) >= 4.5, `${palette.name} ${mode} ${role} on ${surface}`);
    }
  }
});

test('web, Android, and iOS palettes are generated from the current source', () => {
  execFileSync(process.execPath, ['scripts/generate-design.mjs', '--check'], { cwd: new URL('..', import.meta.url), stdio: 'pipe' });
});
