import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { measureWidgetPixels, assertWidgetAlignment } from './helpers/widget-pixels.js';
const root=new URL('../',import.meta.url);
const proof=JSON.parse(readFileSync(new URL('store/source/widget-consistency-mono/alignment-proof.json',root)));
const sha=file=>createHash('sha256').update(readFileSync(new URL(file,root))).digest('hex');

test('native pixel evidence belongs to the current iOS widget source',()=>{
  assert.equal(sha(proof.source),proof.sourceSha256,'Widget changed: refresh the native capture evidence or explicitly review its scope');
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
