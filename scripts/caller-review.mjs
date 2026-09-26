#!/usr/bin/env node
/**
 * The facts a caller review starts from, for one window, printed the same way
 * every time. Observations only: this script does not explain anything, so a
 * review cannot mistake its output for a diagnosis.
 *
 *   ADMIN_TOKEN=… node scripts/caller-review.mjs --since 2026-09-25T18:00:00Z [--until …] [--base https://…]
 *
 * The token is read from the environment and sent only in the x-admin-token
 * header; it is never printed or written.
 */
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, i, all) =>
  (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []));
const base = args.base ?? 'https://newsworthy-indol.vercel.app';
const since = Date.parse(args.since ?? '');
const until = args.until ? Date.parse(args.until) : Date.now();
if (!process.env.ADMIN_TOKEN) throw new Error('ADMIN_TOKEN is not set');
if (!Number.isFinite(since)) throw new Error('--since <ISO time> is required: the end of the last ledger entry');

const hours = Math.ceil((Date.now() - since) / 3600_000) + 1;
const res = await fetch(`${base}/api/admin/history?hours=${hours}`, { headers: { 'x-admin-token': process.env.ADMIN_TOKEN } });
if (!res.ok) throw new Error(`admin history answered ${res.status}`);
const data = await res.json();
const inWindow = (row) => { const t = Date.parse(row.created_at); return t >= since && t < until; };

const readings = data.attempts.filter((r) => r.source === 'external' && inWindow(r)).reverse();
const runs = data.caller_runs.filter(inWindow).reverse();
const rejections = data.rejections.filter(inWindow).reverse();
const merges = data.merges.filter(inWindow).reverse();
const fetches = (data.caller_fetches ?? []).filter(inWindow).reverse();
const reported = new Set(runs.map((r) => r.reading_id).filter((id) => id != null));

console.log(`Window ${new Date(since).toISOString()} → ${new Date(until).toISOString()} (${base})`);
if (data.attempts.length && readings.length && Date.parse(data.attempts.at(-1).created_at) > since) {
  console.log('NOTE attempts are the newest 25 only; the window reaches past them — read readings from history points instead.');
}

console.log(`\nReadings from the caller: ${readings.length}`);
for (const r of readings) {
  const flags = [
    r.status !== 'ok' && `status ${r.status}`,
    r.prompt_verified !== true && `prompt_verified ${r.prompt_verified}`,
    r.judge_version == null && `unjudged (${r.judge_note ?? 'no note'})`,
    !reported.has(r.id) && 'no run report linked',
  ].filter(Boolean);
  const judged = r.judge_version == null ? '-' : `v${r.judge_version} ${r.story} ${r.development_of == null ? 'new' : `← ${r.development_of}`}`;
  console.log(`  ${r.id} ${r.created_at.slice(0, 16)} score ${r.score} | ${judged} | ${flags.length ? `FLAG ${flags.join('; ')}` : 'ok'}`);
  console.log(`      ${r.explanation}`);
}

console.log(`\nRun reports: ${runs.length}`);
for (const r of runs) {
  console.log(`  run ${r.id} ${r.created_at.slice(0, 16)} → ${r.reading_id == null ? 'no reading submitted' : `reading ${r.reading_id}`} (${r.report.length} chars)`);
}

console.log(`\nRejections, including authenticated calls to missing endpoints: ${rejections.length}`);
const byWhom = (r) => (r.token && r.token !== 'caller' ? ` [${r.token} token]` : r.token ? '' : ' [token not recorded]');
for (const r of rejections) console.log(`  ${r.created_at.slice(0, 23)} ${r.status} ${r.method ?? ''} ${r.reason}${r.soft_errors ? ' (soft_errors)' : ''}${byWhom(r)}`);

console.log(`\nMerges and undos: ${merges.length}`);
for (const m of merges) {
  console.log(`  #${m.id} ${m.undoes ? `undo of #${m.undoes}` : `${m.alias} → ${m.canonical}`} by ${m.source}${m.reading_id ? ` (reading ${m.reading_id})` : ''}${m.note ? ` — ${m.note}` : ''}`);
}

// Every event on one timeline, grouped by hour: what each run fetched, stored,
// was refused and reported, in the order the server saw it. Reads under the
// admin token are marked, so a reviewer's own checks are not taken for a run's.
console.log('\nTimeline by hour:');
const events = [
  ...fetches.map((f) => [f.created_at, `fetch ${f.path}${f.format ? ` (${f.format})` : ''}${f.token === 'caller' ? '' : ` [${f.token} token]`}`]),
  ...readings.map((r) => [r.created_at, `reading ${r.id} score ${r.score} ${r.judge_version == null ? 'UNJUDGED' : `judged v${r.judge_version}`}`]),
  ...rejections.map((r) => [r.created_at, `REJECTED ${r.status} ${r.method ?? ''} ${r.reason.slice(0, 60)}${byWhom(r)}`]),
  ...runs.map((r) => [r.created_at, `run report ${r.id} → reading ${r.reading_id ?? 'none'}`]),
].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
let hour = '';
for (const [at, what] of events) {
  if (at.slice(0, 13) !== hour) { hour = at.slice(0, 13); console.log(`  ${hour}h`); }
  console.log(`    ${at.slice(11, 23)} ${what}`);
}

// Hours with neither a reading nor a report: the Routine fires once an hour,
// so an empty hour is a fact worth recording — not yet an explanation.
const empty = [];
for (let h = Math.ceil(since / 3600_000) * 3600_000; h + 3600_000 <= until; h += 3600_000) {
  const any = [...readings, ...runs].some((r) => { const t = Date.parse(r.created_at); return t >= h && t < h + 3600_000; });
  if (!any) empty.push(new Date(h).toISOString().slice(0, 13));
}
console.log(`\nHours with no reading and no report: ${empty.length ? empty.join(', ') : 'none'}`);

console.log('\nFull run reports, oldest first:');
for (const r of runs) console.log(`\n--- run ${r.id} ${r.created_at} (reading ${r.reading_id ?? 'none'})\n${r.report}`);
