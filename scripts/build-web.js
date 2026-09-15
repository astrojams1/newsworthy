import { spawnSync } from 'node:child_process';
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
const result = spawnSync('npm', ['run', 'export:web', '--workspace', '@newsworthy/client'], { stdio: 'inherit', env: { ...process.env, CI: '1' } });
if (result.status !== 0) process.exit(result.status ?? 1);
await rm('dist/web', { recursive: true, force: true });
await mkdir('dist/web', { recursive: true });
await cp('public', 'dist/web', { recursive: true });
await cp('apps/client/dist', 'dist/web', { recursive: true });
// Keep policy/help as static web-only documents. Native links open these on Vercel.
for (const name of ['privacy', 'support']) await cp(`public/${name}.html`, `dist/web/${name}.html`);
// About is useful to visitors but the homepage is the public search landing page.
const aboutPath = 'dist/web/about.html';
const about = await readFile(aboutPath, 'utf8');
await writeFile(aboutPath, about.replace('</head>', '<meta name="robots" content="noindex"/></head>'));
console.log('Expo website prepared in dist/web with the existing policy/support/admin pages.');
