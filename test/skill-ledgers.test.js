// Every repository skill keeps a ledger: an append-only record, linked from
// its SKILL.md, that the skill reads before it runs and updates after, so a
// run starts from what earlier runs did and learned. AGENTS.md states the rule.
// skills/ holds the public rating skill external callers run; its runs are
// recorded server-side and reviewed in the caller-review ledger, so it is not
// checked here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const skillsDir = path.join(root, '.agents/skills');

function ledgersOf(skillPath, text, exists = existsSync, read = file => readFileSync(file, 'utf8')) {
  const links = [...text.matchAll(/\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g)]
    .map(match => path.resolve(path.dirname(skillPath), match[1]))
    .filter(file => /(?:ledger|runs)\.md$/.test(file));
  assert.ok(links.length, `${path.relative(root, skillPath)} links no ledger`);
  for (const file of links) {
    assert.ok(exists(file), `${path.relative(root, file)} does not exist`);
    assert.match(read(file), /append-only/i, `${path.relative(root, file)} does not say it is append-only`);
  }
  return links;
}

const skills = readdirSync(skillsDir).filter(name => existsSync(path.join(skillsDir, name, 'SKILL.md')));

test('there are repository skills to check', () => {
  assert.ok(skills.length >= 6);
});

for (const name of skills) {
  test(`${name} keeps a ledger`, () => {
    const skillPath = path.join(skillsDir, name, 'SKILL.md');
    ledgersOf(skillPath, readFileSync(skillPath, 'utf8'));
  });
}

test('AGENTS.md states the rule', () => {
  assert.match(readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /test\/skill-ledgers\.test\.js/);
});

const fake = path.join(skillsDir, 'example', 'SKILL.md');
const regressions = [
  ['a skill with no ledger link', '# Example\nDo the thing.', () => true, () => 'Entries are append-only.', /links no ledger/],
  ['a ledger link to a missing file', 'Read [the ledger](../../../docs/example/ledger.md).', () => false, () => '', /does not exist/],
  ['a ledger that is not append-only', 'Read [the ledger](../../../docs/example/ledger.md).', () => true, () => '# Notes', /append-only/],
];
for (const [label, text, exists, read, error] of regressions) {
  test(`skill ledger check rejects: ${label}`, () => {
    assert.throws(() => ledgersOf(fake, text, exists, read), error);
  });
}
