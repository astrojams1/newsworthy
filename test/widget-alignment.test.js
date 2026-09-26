import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { measureWidgetPixels, assertWidgetAlignment } from './helpers/widget-pixels.js';
const root=new URL('../',import.meta.url);
const proof=JSON.parse(readFileSync(new URL('store/source/widget-consistency-mono/alignment-proof.json',root)));
const sha=file=>createHash('sha256').update(readFileSync(new URL(file,root))).digest('hex');

test('native pixel evidence retains its source provenance and reviewed layout scope',()=>{
  if (sha(proof.source) === proof.sourceSha256) return;
  const review=JSON.parse(readFileSync(new URL('store/story-age-verification.json',root)));
  assert.equal(review.capturedSourceSha256,proof.sourceSha256,'Review must refer to the actual captured source');
  assert.equal(sha(proof.source),review.sourceSha256,'Widget changed: refresh captures or review their scope');
  const source=readFileSync(new URL(proof.source,root),'utf8');
  // Permitted substitutions are excluded from geometry: the sentence binding,
  // the widget picker description (gallery copy, not layout), and the widget's
  // Appearance setting, which selects the light or dark entry of the same
  // colour sets and moves nothing. Each appearance substitution must be
  // present, so none can silently stop applying. Full-source hash above still
  // requires explicit review for any further edit.
  const colourOnly=[
    ['.modifier(ForcedColorScheme(scheme: entry.appearance.colorScheme))\n        .modifier(WidgetSurface(score: entry.reading?.score, scheme: entry.appearance.colorScheme))','.modifier(WidgetSurface(score: entry.reading?.score))'],
    ['// surface when the score or appearance changes so its retained background changes too.\n        .id("\\(entry.reading?.score ?? 0)-\\(entry.appearance.rawValue)")','// surface when the score changes so its retained background changes too.\n        .id(entry.reading?.score)'],
    ['    var scheme: ColorScheme? = nil\n    // The container background does not inherit the content\'s environment, so\n    // the chosen scheme is applied to the gradient itself.\n    private var background: some View {','    private var background: LinearGradient {'],
    ['\n            .modifier(ForcedColorScheme(scheme: scheme))',''],
  ];
  let geometry=source.slice(source.indexOf('// One three-line numeral size'))
    .replace('explanationText(entry.reading, at: entry.date)','Text(entry.reading?.explanation ?? "")')
    // Same-day readings drop the month and day; the timestamp's font and frame are unchanged.
    .replace('Text(timestampText(date, at: entry.date))','Text("\\(date.formatted(.dateTime.month(.abbreviated).day())) · \\(date.formatted(date: .omitted, time: .shortened))")')
    .replace(/\.description\("[^"]*"\)/g,'.description("")');
  for(const [now,before] of colourOnly){
    assert.equal(geometry.split(now).length,2,`Widget appearance substitution must apply exactly once: ${now}`);
    geometry=geometry.replace(now,before);
  }
  assert.equal(createHash('sha256').update(geometry).digest('hex'),review.geometrySha256,
    'Captured layout and font geometry must stay identical');
});
for(const capture of proof.captures) test(`actual ${capture.mode} Home Screen: numeral top and all rating glyph bottoms match sentence anchors`,async()=>{
  assert.equal(sha(capture.file),capture.sha256,'Native screenshot must remain unchanged');
  const metrics=await measureWidgetPixels(new URL(capture.file,root),capture.regions ?? proof.regions,capture.mode);
  assertWidgetAlignment(metrics);
  assert.deepEqual(metrics,capture.metrics);
});
const oldRegions={numeral:[165,400,280,590],firstCapital:[398,400,443,470],thirdCapital:[398,535,426,585],slash:[280,535,307,585],one:[307,535,329,585],zero:[329,535,350,585]};
test('pixel check rejects the earlier cap-height approximation',async()=>{
  const metrics=await measureWidgetPixels(new URL('store/source/widget-consistency-mono/ios-homescreen-light.png',root),oldRegions,'light');
  assert.throws(()=>assertWidgetAlignment(metrics),/numeral top/);
  assert.equal(metrics.numeral.top-metrics.firstCapital.top,-3);
});
test('pixel check detects the previous one-point denominator offset was too low',async()=>{
  const metrics=await measureWidgetPixels(new URL('store/source/widget-consistency-mono/ios-homescreen-baseline-light.png',root),oldRegions,'light');
  assert.equal(metrics.one.bottom-metrics.thirdCapital.bottom,3);
  assert.throws(()=>assertWidgetAlignment(metrics),/numeral top/);
});
