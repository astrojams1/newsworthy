import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { agePrefix, displayExplanation } from '../apps/client/lib/story-age.js';
import { firstCoverage } from '../src/preparation.js';
import { savePreparation, takePreparation, insertRating } from '../src/db.js';
import { renderPrompt, latestVersion } from '../src/prompts.js';
import { withServer, PORTS, CALLER_TOKEN } from './with-server.js';
import { renderReading, nodes } from './helpers/render-reading.js';

const start = '2026-09-16T18:05:00.000Z';
const origin = Date.parse(start);
const hour = 3600000;

test('age boundaries, invalid dates and future dates do not imply false freshness', () => {
  for (const [minutes, expected] of [[0,'Just now: '],[1,'1 minute ago: '],[59,'59 minutes ago: '],
    [60,'1 hour ago: '],[1860,'31 hours ago: '],[2879,'47 hours ago: '],[2880,'2 days ago: '],
    [525600,'1 year ago: ']]) assert.equal(agePrefix(start, origin + minutes * 60000), expected);
  for (const invalid of [null, undefined, 'nonsense', '2027-01-01T00:00:00Z']) {
    assert.equal(agePrefix(invalid, origin), '');
  }
});

test('the 140-character display budget includes the prefix and counts Unicode code points', () => {
  for (const text of ['a'.repeat(400), '😀 '.repeat(200), 'One report with secondary details. '.repeat(10)]) {
    const output = displayExplanation({ explanation_text: text, explanation_since: start }, origin + 31 * hour);
    assert.ok(output.startsWith('31 hours ago: '));
    assert.ok(Array.from(output).length <= 140);
    assert.ok(output.endsWith('…'));
    assert.ok(!/[\uD800-\uDBFF]$/.test(output.slice(0,-1)));
  }
  assert.equal(displayExplanation({ explanation: '31 hours ago: A stored legacy sentence.' }, origin),
    '31 hours ago: A stored legacy sentence.');
});

test('all app surfaces recompute the story age without changing the reading timestamp', () => {
  const reading = { score: 1, explanation: 'Old server prefix.', explanation_text: 'The Fed raised rates a quarter point.',
    explanation_since: start, created_at: new Date(origin + 30 * hour).toISOString() };
  for (const platform of ['web','ios','android']) {
    for (const hours of [31,32]) {
      const tree = nodes(renderReading({ platform, width:390, height:844, readingOverride:reading, now:origin + hours * hour }));
      assert.equal(tree.find(n=>n.props.testID === 'rating-explanation').props.children,
        `${hours} hours ago: The Fed raised rates a quarter point.`);
    }
  }
  assert.equal(reading.created_at, '2026-09-18T00:05:00.000Z');
});

test('first coverage looks up the sentence root even outside the 48-hour history window, and none for a new development', async () => {
  const prompt = renderPrompt(latestVersion());
  const row = await insertRating({ status:'ok', source:'external', score:5, explanation:'old development',
    prompt_version:prompt.version, prompt_text:prompt.text, prompt_hash:prompt.hash,
    judge_version:2, created_at:start });
  assert.equal(await firstCoverage({ judge_version:2, development_of:row.id, created_at:new Date().toISOString() }), row.created_at);
  assert.equal(await firstCoverage({ judge_version:null, development_of:row.id, created_at:start }), null);
  assert.equal(await firstCoverage({ judge_version:2, development_of:null, created_at:start }), null,
    'a reading opening its own development carries no age: the update time already dates it');
  assert.equal(await firstCoverage({ judge_version:2, development_of:999999999, created_at:start }), null);
});

test('preparation receipts bind score and prompt, expire, and can be consumed only once', async () => {
  const id=randomUUID();
  const saved={ id, score:5, promptVersion:latestVersion(), draft:'A draft.', judgement:{ story:'fixture', development_of:null, judge_version:2 }, createdAt:new Date().toISOString() };
  await savePreparation(saved);
  assert.equal(await takePreparation(id,6,saved.promptVersion),null);
  assert.equal(await takePreparation(id,5,saved.promptVersion-1),null);
  assert.deepEqual(await takePreparation(id,5,saved.promptVersion), {draft:saved.draft,judgement:saved.judgement});
  assert.equal(await takePreparation(id,5,saved.promptVersion),null);
  assert.equal(await takePreparation('forged',5,saved.promptVersion),null);
  const expired={...saved,id:randomUUID(),createdAt:new Date(Date.now()-31*60000).toISOString()};
  await savePreparation(expired);
  assert.equal(await takePreparation(expired.id,5,saved.promptVersion),null);
});

test('a sentence stored before the punctuation rule is served finished, on every field', async () => {
  // The server runs in its own process with its own PGlite, so the legacy row
  // is seeded into a file-backed database by a child that exits first; a row
  // stored through the API would already carry its end.
  const { mkdtemp } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const dir = await mkdtemp(join(tmpdir(), 'newsworthy-legacy-'));
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import { insertRating } from './src/db.js';
    import { renderPrompt, latestVersion } from './src/prompts.js';
    const p = renderPrompt(latestVersion());
    await insertRating({ status:'ok', source:'external', score:4, explanation:'Legacy row without an end',
      prompt_version:p.version, prompt_text:p.text, prompt_hash:p.hash, judge_version:null,
      created_at:new Date(Date.now()-5*60000).toISOString() });`],
  { env:{ ...process.env, NEWSWORTHY_SQL_DRIVER:'pglite', NEWSWORTHY_PGLITE_DIR:dir }, stdio:'ignore' });
  await withServer({ port:PORTS.sentencePunctuation, env:{ NEWSWORTHY_NO_SCHEDULER:'1', NEWSWORTHY_PGLITE_DIR:dir } }, async base=>{
    const current=await (await fetch(base+'/api/current')).json();
    assert.equal(current.explanation_text,'Legacy row without an end.');
    assert.equal(current.explanation,'New: Legacy row without an end.','the only reading repeats nothing');
  });
});

test('prepare then submit preserves the match without publishing the draft', async () => {
  await withServer({ port:PORTS.preparation,env:{NEWSWORTHY_NO_SCHEDULER:'1'} },async base=>{
    const post=async (path,body,token=CALLER_TOKEN)=>{
      const res=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json','x-newsworthy-token':token},body:JSON.stringify(body)});
      return {status:res.status,body:await res.json()};
    };
    assert.equal((await post('/api/readings/prepare',{score:5,explanation:'hormuz tanker strike alpha'},'wrong')).status,401);
    const first=await post('/api/readings',{score:9,explanation:'volcano eruption ash emergency'});
    const second=await post('/api/readings',{score:2,explanation:'hormuz tanker strike alpha'});
    const prepared=await post('/api/readings/prepare',{score:2,explanation:'hormuz tanker strike bravo'});
    assert.equal(prepared.status,200);
    assert.equal(prepared.body.stored,false);
    assert.equal(prepared.body.development,'same');
    assert.equal(prepared.body.first_covered_at,second.body.created_at);
    assert.equal(prepared.body.max_explanation_characters,120);
    const before=await (await fetch(base+'/api/current')).json();
    assert.equal(before.explanation_text,'hormuz tanker strike alpha.','stored with its end');
    const final=await post('/api/readings',{score:2,explanation:'A tanker was hit at Hormuz.',preparation:prepared.body.preparation});
    assert.equal(final.status,201);
    const current=await (await fetch(base+'/api/current')).json();
    assert.equal(current.score,9,'the louder volcano still supplies the score');
    assert.equal(current.since,first.body.created_at);
    assert.equal(current.explanation_since,second.body.created_at,'the sentence uses its own first coverage');
    assert.equal(current.explanation,'Just now: A tanker was hit at Hormuz.');
    const fallback=await post('/api/readings',{score:3,explanation:'Currency markets reopen.',preparation:'invalid'});
    assert.equal(fallback.status,201,'no new ingestion rejection');
  });
});
