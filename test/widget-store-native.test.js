import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('production Swift widget store coalesces refreshes and keeps the newest complete snapshot', {
  skip: process.platform !== 'darwin' || process.env.NEWSWORTHY_NATIVE_TESTS !== '1'
    ? 'Run NEWSWORTHY_NATIVE_TESTS=1 node --test test/widget-store-native.test.js on macOS' : false,
  timeout: 300_000,
}, () => {
  const directory = mkdtempSync(join(tmpdir(), 'newsworthy-store-test-'));
  try {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const binary = join(directory, 'store-tests');
    const compile = spawnSync('xcrun', ['swiftc', '-parse-as-library',
      'apps/client/targets/widget/WidgetReadingStore.swift', 'test/native/widget-reading-store.swift', '-o', binary],
    { cwd: root, encoding: 'utf8', timeout: 240_000 });
    assert.equal(compile.status, 0, compile.stderr);
    const run = spawnSync(binary, [], { encoding: 'utf8', timeout: 20_000 });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /Passed:/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
