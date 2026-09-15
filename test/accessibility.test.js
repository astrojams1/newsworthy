import test from 'node:test';
import assert from 'node:assert/strict';
import { light, dark } from '../apps/client/lib/palette.js';
const luminance = (hex) => {
  const [r, g, b] = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
};
test('all app text colors meet 4.5:1 contrast in both themes', () => {
  for (const palette of [light, dark]) for (const key of ['ink', 'muted', 'faint']) {
    const [high, low] = [luminance(palette[key]), luminance(palette.surface)].sort((a, b) => b - a);
    const ratio = (high + .05) / (low + .05);
    assert.ok(ratio >= 4.5, `${palette.dark ? 'dark' : 'light'} ${key}: ${ratio}`);
  }
});
