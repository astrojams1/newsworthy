import { spawnSync } from 'node:child_process';
import { cp, mkdir, rm } from 'node:fs/promises';
const result = spawnSync('npm', ['run', 'export:web', '--workspace', '@newsworthy/client'], { stdio: 'inherit', env: { ...process.env, CI: '1' } });
if (result.status !== 0) process.exit(result.status ?? 1);
await rm('dist/web', { recursive: true, force: true });
await mkdir('dist/web', { recursive: true });
await cp('public', 'dist/web', { recursive: true });
await cp('apps/client/dist', 'dist/web', { recursive: true });
// Keep policy/help as static web-only documents. Native links open these on Vercel.
for (const name of ['privacy', 'support']) await cp(`public/${name}.html`, `dist/web/${name}.html`);
console.log('Expo website prepared in dist/web with the existing policy/support/admin pages.');
