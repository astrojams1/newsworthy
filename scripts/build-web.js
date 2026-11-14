import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';

// A stale Metro cache can make `expo export` find no routes: it still prints
// "Exported" and exits 0, but writes no HTML, and every web test then fails
// against a site without pages (seen 2026-11-14 in a fresh worktree, where the
// shared cache was from another checkout). The export is checked for its
// entry page and retried once with the cache cleared; a site without one is
// never assembled.
const ENTRY = 'apps/client/dist/index.html';
function exportWeb(extra = []) {
  const args = ['run', 'export:web', '--workspace', '@newsworthy/client', ...(extra.length ? ['--', ...extra] : [])];
  const result = spawnSync('npm', args, { stdio: 'inherit', env: { ...process.env, CI: '1' } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
exportWeb();
if (!existsSync(ENTRY)) {
  console.warn(`${ENTRY} is missing after the export: retrying once with the Metro cache cleared.`);
  exportWeb(['--clear']);
}
if (!existsSync(ENTRY)) {
  console.error(`${ENTRY} is still missing: the export found no routes. Not assembling dist/web.`);
  process.exit(1);
}
await rm('dist/web', { recursive: true, force: true });
await mkdir('dist/web', { recursive: true });
await cp('public', 'dist/web', { recursive: true });
await cp('apps/client/dist', 'dist/web', { recursive: true });
// Keep policy/help as static web-only documents. Native links open these on Vercel.
for (const name of ['privacy', 'support']) await cp(`public/${name}.html`, `dist/web/${name}.html`);
console.log('Expo website prepared in dist/web with the existing policy/support/admin pages.');
