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
    'store/store.json',
  ];
  for (const path of surfaces) assert.doesNotMatch(read(path), emotional, path);
});

// "User-facing copy never mentions AI, models, language models or the providers
// behind them." App Review notes are for the reviewer, not the listing.
const machinery = /\bAI\b|A\.I\.|artificial intelligence|machine learning|\bLLMs?\b|language models?|\bAI model|\bClaude\b|Anthropic|\bGPT/;

test('user-facing copy does not mention AI', () => {
  const surfaces = [
    ...files('apps/client/app', /\.(tsx?|jsx?)$/),
    ...files('apps/client/components', /\.(tsx?|jsx?)$/),
    ...files('apps/client/targets/widget', /\.swift$/),
    ...files('apps/client/plugins/widget-android/res', /\.xml$/),
    ...files('public', /\.(html|txt|webmanifest|svg)$/).filter((path) => !/admin\.html$/.test(path)),
  ];
  for (const path of surfaces) assert.doesNotMatch(read(path), machinery, path);
  // App Review notes are for the reviewer, so they are left out.
  const { review, ...store } = JSON.parse(read('store/store.json'));
  assert.doesNotMatch(JSON.stringify(store), machinery, 'store/store.json');
  const core = guidance.match(/## Core copy\n\n([\s\S]*?)\n## /)[1];
  assert.doesNotMatch(core, machinery, 'core copy');
});

// Play's listing is drawn from store/store.json like Apple's. Android has one
// resizable widget and writes "home screen" as a common noun.
test('the Google Play listing fits Play\'s limits and describes the Android widget', () => {
  const { title: googleName, shortDescription, fullDescription: googleDescription } = JSON.parse(read('store/store.json')).google;
  assert.ok(googleName.length <= 30, 'Play app name: 30 characters');
  assert.ok(shortDescription.length <= 80, 'Play short description: 80 characters');
  assert.ok(googleDescription.length <= 4000, 'Play full description: 4,000 characters');
  assert.doesNotMatch(googleDescription, /Home Screen|[Ss]mall and medium|iPhone|iPad|App Store|Apple/);
  assert.match(googleDescription, /HOME SCREEN WIDGET\nA resizable widget/);
  // The expanded layout, with the sentence, is the one RatingWidget.java uses at larger sizes.
  assert.match(read('apps/client/plugins/widget-android/RatingWidget.java'), /boolean compact = width < 250 \|\| height < 150;/);
});

// iOS has been on the App Store since 2026-10-21; Android is only in closed
// testing. Copy written before launch called both "in preparation" and the
// price "not yet confirmed", and stayed that way after the release.
test('public copy links the released iOS app and does not offer Android', () => {
  const { ascAppId } = JSON.parse(read('app-release.config.json')).ios;
  const appStore = `https://apps.apple.com/app/id${ascAppId}`;
  assert.ok(read('apps/client/app/+html.tsx').includes(`<meta name="apple-itunes-app" content="app-id=${ascAppId}" />`), 'Smart App Banner names the app');
  for (const path of ['public/llms.txt', 'public/support.html', 'README.md', 'docs/product-messaging.md']) {
    const copy = read(path);
    assert.ok(copy.includes(appStore), `${path} links the App Store listing`);
    assert.doesNotMatch(copy, /in preparation|not yet confirmed|planned (iOS|mobile|store) release|Waiting for Review/, path);
    assert.doesNotMatch(copy, /play\.google\.com\/store/, `${path} links no public Play listing`);
  }
});
