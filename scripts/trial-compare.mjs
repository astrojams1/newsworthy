#!/usr/bin/env node
/**
 * Each trial caller's readings beside the live caller's, hour by hour, with the
 * agreement figures and the same sentence-contract flags a caller review
 * uses. Observations only. See docs/caller-trials.md.
 *
 *   ADMIN_TOKEN=… node scripts/trial-compare.mjs [--hours 72] [--cohort sonnet-5-5] [--base https://…]
 *
 * The token is read from the environment and sent only in the x-admin-token
 * header; it is never printed or written.
 */
import { outletNamed } from './news-outlets.mjs';
import { marketForecast } from './market-forecast.mjs';
import { passiveVoice } from './passive-voice.mjs';
import { disagreements, summarizeByDay } from '../src/trial.js';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, i, all) =>
  (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []));
const base = args.base ?? 'https://newsworthy-indol.vercel.app';
const hours = Number(args.hours ?? 72);
if (!process.env.ADMIN_TOKEN) throw new Error('ADMIN_TOKEN is not set');

const query = new URLSearchParams({ hours: String(hours), ...(args.cohort ? { cohort: args.cohort } : {}) });
const res = await fetch(`${base}/api/admin/trials?${query}`, { headers: { 'x-admin-token': process.env.ADMIN_TOKEN } });
if (!res.ok) throw new Error(`admin trials answered ${res.status}`);
const { cohorts } = await res.json();

const flags = (r) => [
  r.prompt_verified !== true && `prompt_verified ${r.prompt_verified}`,
  r.judge_version == null && `unjudged (${r.judge_note ?? 'no note'})`,
  r.explanation.length > 135 && `${r.explanation.length} chars`,
  outletNamed(r.explanation) && `names an outlet (${outletNamed(r.explanation)})`,
  marketForecast(r.explanation) && `predicts a market move ("${marketForecast(r.explanation)}")`,
  passiveVoice(r.explanation) && `passive with no actor ("${passiveVoice(r.explanation)}")`,
].filter(Boolean);
const judged = (r) => (r.judge_version == null ? '-' : `${r.story} ${r.development_of == null ? 'new' : `← ${r.development_of}`}`);
const line = (who, r) => {
  const f = flags(r);
  console.log(`    ${who} ${r.id} score ${r.score} | ${judged(r)} | ${f.length ? `FLAG ${f.join('; ')}` : 'ok'}`);
  console.log(`         ${r.explanation}`);
};

console.log(`Trials against live, last ${hours}h (${base})`);
if (!cohorts.length) console.log('\nNo trial readings in this window.');
for (const { cohort, summary, pairs, runs } of cohorts) {
  console.log(`\n== ${cohort} ==\n`);
  for (const [key, value] of Object.entries(summary)) console.log(`  ${key.padEnd(22)} ${value ?? '-'}`);

  const flagged = (side) => pairs.filter((p) => p[side] && flags(p[side]).length).length;
  console.log(`  ${'trial_flagged'.padEnd(22)} ${flagged('trial')} of ${pairs.length}`);
  console.log(`  ${'live_flagged'.padEnd(22)} ${pairs.filter((p) => p.live && flags(p.live).length).length} of ${summary.paired}`);
  const reported = new Set(runs.map((r) => r.reading_id).filter((id) => id != null));
  console.log(`  ${'trial_run_reports'.padEnd(22)} ${runs.length} (${pairs.filter((p) => !reported.has(p.trial.id)).length} readings with none linked)`);

  console.log('\nBy day (UTC): paired, exact, within 1, mean diff, judgements agreeing');
  for (const d of summarizeByDay(pairs)) {
    const agreed = d.judgement_agreement == null ? '-' : `${Math.round(d.judgement_agreement * d.judgements_compared)} of ${d.judgements_compared}`;
    console.log(`  ${d.day}  ${String(d.paired).padStart(3)}  ${d.score_exact ?? '-'}  ${d.score_within_1 ?? '-'}  ${d.score_mean_diff ?? '-'}  ${agreed}`);
  }

  const apart = disagreements(pairs);
  console.log(`\nLargest disagreements (score 2+ apart, or another development on a live 6+): ${apart.length}`);
  for (const p of apart) {
    console.log(`  ${p.trial.created_at.slice(0, 16)}  live ${p.live.score} vs trial ${p.trial.score}, judgement ${p.judgement_agrees === null ? 'n/a' : p.judgement_agrees ? 'agrees' : 'DIFFERS'}`);
  }

  console.log('\nHour by hour, oldest first:');
  for (const p of [...pairs].reverse()) {
    const diff = p.live ? ` | diff ${p.score_diff > 0 ? '+' : ''}${p.score_diff}, judgement ${p.judgement_agrees === null ? 'n/a' : p.judgement_agrees ? 'agrees' : 'DIFFERS'}` : ' | no live reading within the window';
    console.log(`\n  ${p.trial.created_at.slice(0, 16)}${diff}`);
    line('trial', p.trial);
    if (p.live) line('live ', p.live);
  }
}
