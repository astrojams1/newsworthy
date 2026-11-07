// Snapshots the live front page for the "today" Short (store/video/today):
// the reading /api/current serves right now, as the app shows it, with when it
// was fetched. The film draws only this file, so a render can be traced to the
// exact reading it shows, and a day's Short is a fetch and a render.
//
//   node store/scripts/today-reading.mjs [--from https://newsworthy-indol.vercel.app]
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const at = process.argv.indexOf('--from');
const origin = at > 0 ? process.argv[at + 1] : 'https://newsworthy-indol.vercel.app';
const response = await fetch(`${origin}/api/current`, { cache: 'no-store' });
if (!response.ok) throw new Error(`${origin}/api/current answered ${response.status}`);
const data = await response.json();
const ok = Number.isInteger(data.score) && data.score >= 1 && data.score <= 10 && typeof data.explanation_text === 'string'
  && data.explanation_text.trim() && Number.isFinite(Date.parse(data.created_at));
if (!ok) throw new Error(`${origin}/api/current did not return a reading`);
const reading = {
  source: `${origin}/api/current`,
  fetched_at: new Date().toISOString(),
  score: data.score,
  explanation_text: data.explanation_text,
  explanation_new: data.explanation_new === true,
  explanation_story: data.explanation_story ?? null,
  explanation_at: data.explanation_at ?? null,
  created_at: data.created_at,
};
const file = join(root, 'store/video/today/reading.json');
await writeFile(file, JSON.stringify(reading, null, 2) + '\n');
console.log(`${file}\n  ${reading.score}/10 · ${reading.explanation_text}`);
