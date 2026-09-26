import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Copy the product ships outside the web pages discovery.test.js already reads.
// docs/product-messaging.md is the source; this holds each surface to it.
const read = (path) => readFileSync(path, 'utf8');
const files = (dir, pattern) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path, pattern) : pattern.test(name) ? [path] : [];
});

const guidance = read('docs/product-messaging.md');
const widgetDescription = guidance.match(/widget picker description[^\n]*\n\n> ([^\n]+)\n/)[1];

// "Avoid emotional framing about anxiety, switching off, breathing room or
// getting on with your day. Do not use 'no doomscrolling'…"
const emotional = /doomscroll|anxi(ety|ous)|breathing room|switch(ing)? off from|get(ting)? on with your day|back to your day|calm global status indicator|middle ground/i;

test('widget picker description is the documented one on iOS and Android', () => {
  const swift = read('apps/client/targets/widget/NewsworthyWidget.swift');
  const descriptions = [...swift.matchAll(/\.description\("([^"]*)"\)/g)].map((m) => m[1]);
  assert.ok(descriptions.length >= 1, 'iOS widget declares a description');
  for (const description of descriptions) assert.equal(description, widgetDescription);
  const android = read('apps/client/plugins/widget-android/res/values/widget.xml');
  assert.equal(android.match(/<string name="widget_description">([^<]*)<\/string>/)[1], widgetDescription);
  assert.match(read('apps/client/plugins/widget-android/res/xml/rating_widget_info.xml'), /android:description="@string\/widget_description"/);
});

test('shipped copy avoids the emotional framing the guidance rules out', () => {
  const surfaces = [
    ...files('apps/client/app', /\.(tsx?|jsx?)$/),
    ...files('apps/client/components', /\.(tsx?|jsx?)$/),
    ...files('apps/client/targets/widget', /\.swift$/),
    ...files('apps/client/plugins/widget-android/res', /\.xml$/),
    ...files('public', /\.(html|txt)$/),
    'store/listing.json',
  ];
  for (const path of surfaces) assert.doesNotMatch(read(path), emotional, path);
});
