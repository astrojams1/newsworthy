#!/usr/bin/env node
// Replace the default (en-US) Google Play listing graphics with the rendered
// artwork: icon, feature graphic and phone screenshots in manifest order.
// One Play API edit: delete each image type, upload, read back and compare
// Play's SHA-256 with ours, validate, commit. Anything wrong deletes the edit.
//
//   node store/scripts/google-play-images.mjs status   list what Play holds
//   node store/scripts/google-play-images.mjs upload   replace and commit
//
// The service account needs "Manage store presence" on the app. Its key is
// read from the vault per run (or GOOGLE_PLAY_SERVICE_ACCOUNT_JSON).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP, VAULT, assertion } from '../../apps/client/script/android-release.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LANGUAGE = 'en-US';
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const manifest = JSON.parse(readFileSync(join(root, 'assets/manifest.json'), 'utf8'));
const phones = manifest.filter(a => a.platform === 'android' && a.file.startsWith('assets/google-play/phone/')).map(a => a.file).sort();
const PLAN = {
  icon: ['assets/google-play/icon.png'],
  featureGraphic: ['assets/google-play/feature-graphic.png'],
  phoneScreenshots: phones,
};
if (phones.length < 2 || phones.length > 8) throw new Error(`Play takes 2 to 8 phone screenshots; the manifest lists ${phones.length}`);

function account() {
  let file = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, dir;
  if (!file) {
    dir = mkdtempSync(join(tmpdir(), 'newsworthy-play-'));
    file = join(dir, 'play-service-account.json');
    const env = { ...process.env };
    if (env.OP_KEY && !env.OP_SERVICE_ACCOUNT_TOKEN) env.OP_SERVICE_ACCOUNT_TOKEN = env.OP_KEY.replace(/^OP_KEY=/, '');
    const result = spawnSync('op', ['read', '--out-file', file, `${VAULT}/play-service-account.json`], { env, encoding: 'utf8' });
    if (result.status !== 0) { rmSync(dir, { recursive: true, force: true }); throw new Error(`op read failed: ${result.stderr.trim()}`); }
  }
  try {
    const key = JSON.parse(readFileSync(file, 'utf8'));
    return { ...key, token_uri: key.token_uri ?? 'https://oauth2.googleapis.com/token' };
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
}

async function client() {
  const key = account();
  const response = await fetch(key.token_uri, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: assertion(key) }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`Google token exchange: ${response.status} ${json.error_description ?? json.error}`);
  return async (path, { method = 'GET', upload } = {}) => {
    const base = `https://androidpublisher.googleapis.com${upload ? '/upload' : ''}/androidpublisher/v3/applications/${APP.packageName}`;
    const res = await fetch(base + path, { method, headers: { Authorization: `Bearer ${json.access_token}`, ...(upload ? { 'Content-Type': 'image/png' } : {}) }, ...(upload ? { body: upload } : {}) });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(`${method} ${path.split('?')[0]}: ${res.status} ${body?.error?.message ?? text}`);
    return body;
  };
}

async function main(command) {
  if (!['status', 'upload'].includes(command)) throw new Error('usage: google-play-images.mjs status|upload');
  const api = await client();
  const { id } = await api('/edits', { method: 'POST' });
  const edit = `/edits/${id}/listings/${LANGUAGE}`;
  let committed = false;
  try {
    if (command === 'upload') {
      for (const [type, files] of Object.entries(PLAN)) {
        await api(`${edit}/${type}`, { method: 'DELETE' });
        for (const file of files) {
          const { image } = await api(`${edit}/${type}?uploadType=media`, { method: 'POST', upload: readFileSync(join(root, file)) });
          if (image.sha256 !== sha256(join(root, file))) throw new Error(`${file}: Play received sha256 ${image.sha256}`);
          console.log(`${type}: uploaded ${file} (${image.id})`);
        }
      }
    }
    const held = {};
    for (const [type, files] of Object.entries(PLAN)) {
      const { images = [] } = await api(`${edit}/${type}`);
      held[type] = images.map(i => i.sha256);
      const expected = files.map(f => sha256(join(root, f)));
      const match = JSON.stringify(held[type]) === JSON.stringify(expected);
      console.log(`${type}: Play holds ${images.length}; ${match ? 'matches' : 'differs from'} the repository${match ? '' : ` (${files.length} expected)`}`);
      if (command === 'upload' && !match) throw new Error(`${type} read back differently from what was uploaded`);
    }
    if (command === 'upload') {
      await api(`/edits/${id}:validate`, { method: 'POST' });
      await api(`/edits/${id}:commit`, { method: 'POST' });
      committed = true;
      console.log(`Committed edit ${id}.`);
    }
  } finally {
    if (!committed) await api(`/edits/${id}`, { method: 'DELETE' }).catch(() => {});
  }
}

main(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
