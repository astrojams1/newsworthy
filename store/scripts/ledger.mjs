// The release ledger: store/ledger.json is the record, store/ledger.md a view
// generated from it. Never edit the Markdown by hand.
//
//   node store/scripts/ledger.mjs render            rewrite ledger.md from ledger.json
//   node store/scripts/ledger.mjs check             exit 1 if ledger.md is out of date
//   node store/scripts/ledger.mjs record --gate <id> --state <state> --owner <owner>
//        --basis <basis> --summary <text> [--evidence <text>]... [--next <text>]
//                                                   append an event, update the gate, re-render
//
// `record` keeps a gate's existing owner, basis and next action when those
// flags are omitted; --next "" clears the next action. A new gate is added at
// the end of the table.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath = resolve(root, 'ledger.json');
const mdPath = resolve(root, 'ledger.md');

export const STATES = ['todo', 'in_progress', 'waiting_user', 'waiting_provider', 'waiting_verification', 'failed', 'done'];

const cell = text => (text || '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function render(ledger) {
  const lines = [
    `# ${ledger.app} release ledger`, '',
    `Updated: ${ledger.updated_at}`, '',
    `Repository: ${ledger.repository}`, '',
    `Objective: ${ledger.objective}`, '',
    'Generated from the adjacent JSON ledger. Update through store/scripts/ledger.mjs, not this view.', '',
    '| Gate | State | Owner | Evidence basis | Result | Next action |',
    '|---|---|---|---|---|---|',
  ];
  for (const [gate, step] of Object.entries(ledger.steps)) {
    lines.push(`| ${gate} | ${step.state} | ${step.owner} | ${step.basis} | ${cell(step.summary)} | ${cell(step.next_action)} |`);
  }
  lines.push('', '## Evidence and history', '');
  for (const event of ledger.events) {
    const r = event.result;
    lines.push(`### ${event.sequence}. ${event.gate} — ${r.state}`, '', `${event.at} · ${r.basis} · ${r.owner}`, '');
    lines.push(r.summary, '', ...(r.evidence ?? []).map(item => `- ${item}`), '');
    if (r.next_action) lines.push(`Next: ${r.next_action}`, '');
  }
  return lines.join('\n');
}

export function record(ledger, { gate, state, owner, basis, summary, evidence = [], next }, at = new Date()) {
  if (!gate || !summary) throw new Error('record needs --gate and --summary');
  const previous = ledger.steps[gate];
  const result = {
    state: state ?? previous?.state,
    owner: owner ?? previous?.owner,
    basis: basis ?? previous?.basis,
    summary,
    evidence,
    next_action: next ?? previous?.next_action ?? '',
    updated_at: at.toISOString().replace(/\.\d{3}Z$/, '+00:00'),
  };
  if (!STATES.includes(result.state)) throw new Error(`state must be one of ${STATES.join(', ')}`);
  if (!result.owner || !result.basis) throw new Error('a new gate needs --owner and --basis');
  const sequence = Math.max(0, ...ledger.events.map(e => e.sequence)) + 1;
  ledger.steps[gate] = result;
  ledger.events.push({ sequence, at: result.updated_at, gate, result });
  ledger.updated_at = result.updated_at;
  return ledger;
}

const load = () => JSON.parse(readFileSync(jsonPath, 'utf8'));

function parseFlags(args) {
  const flags = { evidence: [] };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    if (value === undefined) throw new Error(`--${key} needs a value`);
    if (key === 'evidence') flags.evidence.push(value);
    else flags[key] = value;
  }
  return flags;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command = 'render', ...args] = process.argv.slice(2);
  if (command === 'render') {
    writeFileSync(mdPath, render(load()));
  } else if (command === 'check') {
    if (readFileSync(mdPath, 'utf8') !== render(load())) {
      console.error('store/ledger.md is out of date: run node store/scripts/ledger.mjs render');
      process.exit(1);
    }
  } else if (command === 'record') {
    const ledger = record(load(), parseFlags(args));
    writeFileSync(jsonPath, JSON.stringify(ledger, null, 2) + '\n');
    writeFileSync(mdPath, render(ledger));
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}
