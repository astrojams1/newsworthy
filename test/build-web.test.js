// scripts/build-web.js must never assemble a site without its entry page: a
// stale Metro cache once made `expo export` succeed with no routes, and every
// web test failed against the empty site (2026-11-14).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the web build checks the export for its entry page, retries with a cleared cache, then refuses', () => {
  const source = readFileSync('scripts/build-web.js', 'utf8');
  assert.match(source, /const ENTRY = 'apps\/client\/dist\/index\.html'/);
  assert.match(source, /if \(!existsSync\(ENTRY\)\) \{\n  console\.warn[\s\S]*exportWeb\(\['--clear'\]\)/);
  assert.match(source, /still missing[\s\S]*process\.exit\(1\)/);
  assert.ok(source.indexOf("exportWeb(['--clear'])") < source.indexOf("await rm('dist/web'"), 'checked before dist/web is replaced');
});
