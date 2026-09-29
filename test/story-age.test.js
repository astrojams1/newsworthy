import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { displayExplanation, explanationParts, isNew, sentenceAge, EXPLANATION_CHARACTER_LIMIT } from '../apps/client/lib/story-age.js';
import { opensDevelopment } from '../src/story.js';
import { themeForLevel } from '../apps/client/lib/palette.js';
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

test('once "New:" is off, the sentence leads with how long ago it was first reported', () => {
  // Reported 2026-09-27: a development can hold the page for a day with the
  // same sentence, and past two hours nothing said how old it was.
  const rereport = { ...fresh, explanation_new: false, explanation_at: start };
  for (const [minutes, age] of [[0,''],[59,''],[60,'1h\u00A0ago:'],[5 * 60 + 59,'5h\u00A0ago:'],[23 * 60 + 59,'23h\u00A0ago:'],[24 * 60,'1d\u00A0ago:'],[74 * 60,'3d\u00A0ago:']]) {
    assert.equal(sentenceAge(rereport, origin + minutes * 60000), age, `${minutes} minutes`);
  }
  assert.equal(displayExplanation(rereport, origin + 26 * hour), `1d\u00A0ago: ${text}`);
  const opened = { ...fresh, explanation_at: start };
  assert.deepEqual(explanationParts(opened, origin + 119 * 60000), { label: 'New:', age: '', body: text }, 'New: wins while it is on');
  assert.deepEqual(explanationParts(opened, origin + 2 * hour), { label: '', age: '2h\u00A0ago:', body: text }, 'then the age takes its place');
  assert.equal(sentenceAge({ ...rereport, explanation_at: undefined }, origin + 5 * hour), '', 'an older server sends no time');
  assert.equal(sentenceAge({ ...rereport, explanation_at: 'nonsense' }, origin + 5 * hour), '');
  assert.equal(sentenceAge({ score: 7, explanation: text, explanation_at: start, created_at: start }, origin + 5 * hour), '',
    'an old cache without the unlabelled body keeps its stored sentence');
  const long = 'a'.repeat(135);
  const fitted = displayExplanation({ ...rereport, explanation_text: long }, origin + 12 * hour);
  assert.ok(fitted.startsWith('12h\u00A0ago: ') && Array.from(fitted).length <= 140 && fitted.endsWith('…'), 'the age counts toward 140');
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

test('the label follows the judgement the reading arrived with', async () => {
  await withServer({ port:PORTS.newLabel,env:{NEWSWORTHY_NO_SCHEDULER:'1'} },async base=>{
    const current=async ()=>(await fetch(base+'/api/current')).json();
    const submit=caller(base);
    const first=await submit(9,'volcano eruption ash emergency',{story:'volcano'});
    const opening=await submit(2,'hormuz tanker strike alpha',{story:'hormuz'});
    assert.equal((await current()).explanation_new,true,'a new development is labelled at once');
    const again=await submit(2,'A tanker was hit at Hormuz',{answer:'same',story:'hormuz'});
    assert.equal(again.body.development,'same');
    const after=await current();
    assert.equal(after.score,9,'the louder volcano still supplies the score');
    assert.equal(after.since,first.body.created_at);
    assert.equal(after.explanation_new,false,'the sentence re-reports its own development');
    assert.equal(after.explanation,'hormuz tanker strike alpha.','a re-report shows its development\'s sentence, stored with its end');
    assert.equal(Date.parse(after.explanation_at),Date.parse(opening.body.created_at),
      'explanation_at dates the sentence shown, its first report, not the re-report that confirmed it');
    assert.equal(after.created_at,again.body.created_at,'created_at stays the newest reading');
    assert.equal(after.explanation_story,'hormuz');
    // A re-report can arrive under another slug; the story shown is the sentence's own.
    const renamed=await submit(2,'Hormuz tanker hit again',{answer:'same',story:'shipping'});
    assert.equal(renamed.body.development,'same');
    const later=await current();
    assert.equal(later.explanation,'hormuz tanker strike alpha.');
    assert.equal(later.explanation_story,'hormuz','the story of the sentence shown, not of the re-report');
  });
});

test('both widgets format the age as the app does', () => {
  // "5h ·": a middle dot, its space non-breaking so a line never ends on "5h"
  // with the dot leading the next (owner, 2026-09-28). The widgets format it
  // themselves, and the Swift test cannot run without a Swift toolchain.
  const swift = readFileSync(new URL('../apps/client/targets/widget/WidgetReadingStore.swift', import.meta.url), 'utf8');
  const java = readFileSync(new URL('../apps/client/plugins/widget-android/RatingWidget.java', import.meta.url), 'utf8');
  assert.ok(swift.includes('"\\(hours)h\\u{00A0}ago:" : "\\(hours / 24)d\\u{00A0}ago:"'), 'iOS widget');
  assert.ok(java.includes('(hours / 24) + "d") + "\\u00A0ago:";'), 'Android widget');
});

test('the story and its age sit below the sentence and Checked moves to Settings, prototype', async () => {
  const { storyLine, checkedAgo } = await import('../apps/client/lib/story-age.js');
  const now = Date.parse('2026-09-29T12:00:00Z');
  const reading = { score: 4, explanation: 'x.', explanation_text: 'x.', explanation_new: false,
    created_at: '2026-09-29T11:42:00Z', explanation_at: '2026-09-29T07:00:00Z', explanation_story: 'us-iran-war' };
  assert.equal(storyLine(reading, now), 'US Iran War  ·  5h ago');
  assert.equal(storyLine({ ...reading, explanation_story: undefined }, now), '5h ago', 'unjudged: the age alone');
  assert.equal(storyLine({ ...reading, explanation_at: undefined }, now), 'US Iran War', 'an older server: the story alone');
  assert.equal(storyLine({ ...reading, explanation_at: '2026-09-27T07:00:00Z' }, now), 'US Iran War  ·  2d ago');
  assert.equal(checkedAgo(reading, now), '18m ago');
  const aged = { ...fresh, explanation_new: false, explanation_at: start, explanation_story: 'us-iran-war' };
  for (const platform of ['web','ios','android']) {
    const rendered = nodes(renderReading({ platform, width:390, height:844, readingOverride:aged, now:origin + (5 * 60 + 10) * 60000 }));
    const line = rendered.find(n=>n.props.testID === 'rating-story-line');
    assert.equal(line.props.children, 'US Iran War  ·  5h ago');
    assert.equal(line.props.style.color, themeForLevel(fresh.score, false).muted, 'muted, as Checked was');
    assert.equal(nodes(renderReading({ platform, width:390, height:844, readingOverride:aged, now:origin + 5 * 60000 }))
      .find(n=>n.props.testID === 'rating-story-line').props.children, 'US Iran War  ·  5m ago', 'under an hour too');
    assert.equal(rendered.some(n=>n.type === 'Text' && String([n.props.children].flat().join('')).startsWith('Checked')), false);
    const order = rendered.map(n=>n.props.testID).filter(id=>['rating-score','rating-explanation','rating-story-line'].includes(id));
    assert.deepEqual(order, ['rating-score','rating-explanation','rating-story-line']);
  }
});

test('the checked time reads "Checked at 10:21": no AM/PM, no date', async () => {
  const { checkedAt } = await import('../apps/client/lib/story-age.js');
  const at = new Date(2026, 8, 29, 10, 21);
  assert.equal(checkedAt({ created_at: at.toISOString() }), 'Checked at 10:21');
  const afternoon = checkedAt({ created_at: new Date(2026, 8, 29, 14, 5).toISOString() });
  assert.ok(['Checked at 2:05', 'Checked at 14:05'].includes(afternoon), `${afternoon}: the device's own hour cycle`);
  assert.equal(checkedAt({ created_at: new Date(2026, 8, 1, 10, 21).toISOString() }), 'Checked at 10:21', 'another day: still no date');
  assert.equal(checkedAt({}), '');
});

test('the app sentence spends no budget on an age it shows on its own line', () => {
  const body = 'a'.repeat(134) + '.';
  const reading = { ...fresh, explanation: body, explanation_text: body, explanation_new: false, explanation_at: start, explanation_story: 'us-iran-war' };
  for (const platform of ['web','ios','android']) {
    const sentence = nodes(renderReading({ platform, width:390, height:844, readingOverride:reading, now:origin + 5 * hour }))
      .find(n=>n.props.testID === 'rating-explanation');
    assert.equal([sentence.props.children].flat().join(''), body, `${platform}: a 135-character body is shown whole`);
  }
  assert.ok(explanationParts(reading, origin + 5 * hour).body.endsWith('…'), 'the widgets and share text still fit the age in');
});
