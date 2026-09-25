import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayExplanation, explanationParts, isNew, EXPLANATION_CHARACTER_LIMIT } from '../apps/client/lib/story-age.js';
import { opensDevelopment } from '../src/story.js';
import { withServer, PORTS, CALLER_TOKEN, caller } from './with-server.js';
import { renderReading, nodes } from './helpers/render-reading.js';

const start = '2026-09-16T18:05:00.000Z';
const origin = Date.parse(start);
const hour = 3600000;

const text = 'The Fed raised rates a quarter point.';
const fresh = { score: 7, explanation: text, explanation_text: text, explanation_new: true, created_at: start };

test('"New:" labels a new development for two hours from its reading, and nothing else', () => {
  for (const [minutes, label] of [[0,'New:'],[1,'New:'],[119,'New:'],[120,''],[31 * 60,'']]) {
    assert.equal(explanationParts(fresh, origin + minutes * 60000).label, label, `${minutes} minutes`);
  }
  assert.equal(displayExplanation(fresh, origin), `New: ${text}`);
  assert.equal(displayExplanation(fresh, origin + 2 * hour), text);
  assert.equal(isNew({ ...fresh, explanation_new: false }, origin), false, 'a re-report has no label');
  assert.equal(isNew({ ...fresh, created_at: 'nonsense' }, origin), false);
  assert.equal(isNew({ score: 7, explanation: text, explanation_new: true, created_at: start }, origin), false,
    'an old cache without the unlabelled body keeps its stored sentence');
  assert.equal(displayExplanation({ explanation: '31 hours ago: A stored legacy sentence.' }, origin),
    '31 hours ago: A stored legacy sentence.');
  // A build before this change cached first coverage; it no longer shows an age.
  assert.equal(displayExplanation({ ...fresh, explanation_new: undefined, explanation_since: start }, origin + 31 * hour), text);
});

test('the 140-character display budget includes the label and counts Unicode code points', () => {
  assert.equal(EXPLANATION_CHARACTER_LIMIT, 135);
  const full = 'a'.repeat(135);
  assert.equal(displayExplanation({ ...fresh, explanation_text: full }, origin), `New: ${full}`, 'a 135-character body fits beside the label');
  for (const body of ['a'.repeat(400), '😀 '.repeat(200), 'One report with secondary details. '.repeat(10)]) {
    for (const reading of [{ ...fresh, explanation_text: body }, { ...fresh, explanation_text: body, explanation_new: false }]) {
      const output = displayExplanation(reading, origin);
      assert.equal(output.startsWith('New: '), reading.explanation_new);
      assert.ok(Array.from(output).length <= 140);
      assert.ok(output.endsWith('…'));
      assert.ok(!/[\uD800-\uDBFF]$/.test(output.slice(0,-1)));
    }
  }
});

test('all app surfaces show "New:" in bold, as its own text, and drop it at two hours', () => {
  for (const platform of ['web','ios','android']) {
    const at = minutes => nodes(renderReading({ platform, width:390, height:844, readingOverride:fresh, now:origin + minutes * 60000 }));
    const labelled = at(30);
    const label = labelled.find(n=>n.props.testID === 'rating-new-label');
    assert.equal(label.props.children, 'New:');
    assert.equal(label.props.style.fontWeight, '700');
    assert.equal(label.props.style.color, undefined, 'weight only: the label keeps the sentence colour');
    const sentence = labelled.find(n=>n.props.testID === 'rating-explanation');
    const [inner, rest] = sentence.props.children.props.children;
    assert.equal(inner.props.testID, 'rating-new-label', 'the label is nested inside the sentence, so it wraps with it');
    assert.equal(rest, ` ${text}`);
    const later = at(120);
    assert.equal(later.find(n=>n.props.testID === 'rating-new-label'), undefined);
    assert.equal(later.find(n=>n.props.testID === 'rating-explanation').props.children, text);
  }
});

test('only a judged reading that opened its own development is new', () => {
  assert.equal(opensDevelopment({ judge_version:2, development_of:null }), true);
  assert.equal(opensDevelopment({ judge_version:2, development_of:17 }), false, 'a re-report');
  assert.equal(opensDevelopment({ judge_version:null, development_of:null }), false, 'a judge outage is not a new story');
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
    assert.equal(current.explanation,'Legacy row without an end.');
  });
});

test('the label waits for the caller\'s answer, and follows it', async () => {
  await withServer({ port:PORTS.preparation,env:{NEWSWORTHY_NO_SCHEDULER:'1'} },async base=>{
    const current=async ()=>(await fetch(base+'/api/current')).json();
    const post=async (path,body,token=CALLER_TOKEN)=>{
      const res=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json','x-newsworthy-token':token},body:JSON.stringify(body)});
      return {status:res.status,body:await res.json()};
    };
    const submit=caller(base);
    assert.equal((await post('/api/readings/judgement',{reading:1},'wrong')).status,401);
    const first=await submit(9,'volcano eruption ash emergency',{story:'volcano'});
    await submit(2,'hormuz tanker strike alpha',{story:'hormuz'});
    const stored=await post('/api/readings',{score:2,explanation:'A tanker was hit at Hormuz'});
    assert.equal(stored.status,201);
    assert.equal((await current()).explanation_new,false,'awaiting its answer, a reading is not new');
    const hormuz=Number(stored.body.judge_task.match(/^\[(\d+)\] hormuz/m)[1]);
    const judged=await post('/api/readings/judgement',{reading:stored.body.id,judge_version:stored.body.judge_version,development_of:hormuz,story:'hormuz',note:'same strike'});
    assert.equal(judged.body.development,'same');
    const after=await current();
    assert.equal(after.score,9,'the louder volcano still supplies the score');
    assert.equal(after.since,first.submitted.body.created_at);
    assert.equal(after.explanation_new,false,'the sentence re-reports its own development');
    assert.equal(after.explanation,'A tanker was hit at Hormuz.','stored with its end');
    await submit(4,'glacier collapse floods valley',{story:'glacier'});
    assert.equal((await current()).explanation_new,true,'a new development is labelled');
  });
});
