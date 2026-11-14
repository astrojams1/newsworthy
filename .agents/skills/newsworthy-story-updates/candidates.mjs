#!/usr/bin/env node
// Prototype helper for SKILL.md: one row per story on the timeline, newest
// development first, with the story's earlier sentences so a search knows what
// is already on record. Reads a saved /api/timeline response.
import { readFileSync } from 'node:fs';

// The reading on screen can be a continuation newer than the story's last
// development; it is on record too, so the search must not report it as new.
function onScreen(current, story) {
  if (!current || current.story !== story || typeof current.explanation !== 'string') return undefined;
  return { at: current.explanation_at ?? current.created_at, explanation: current.explanation };
}

export function candidates(timeline, { maxAgeHours = 72, now = Date.now(), current } = {}) {
  const byStory = new Map();
  for (const development of timeline?.developments ?? []) {
    if (!development?.story) continue;
    const list = byStory.get(development.story) ?? [];
    list.push(development);
    byStory.set(development.story, list);
  }
  return [...byStory.entries()]
    .map(([story, list]) => {
      const sorted = [...list].sort((a, b) => Date.parse(b.since) - Date.parse(a.since));
      const [latest, ...earlier] = sorted;
      return {
        story,
        last_recorded: { root: latest.root, since: latest.since, score: latest.score, explanation: latest.explanation },
        // An update already stored on it is on record too: the check looks past it.
        stored_update: latest.update ?? null,
        earlier: earlier.map(({ since, explanation }) => ({ since, explanation })),
        ...(onScreen(current, story) ? { current_reading: onScreen(current, story) } : {}),
      };
    })
    .filter((row) => now - Date.parse(row.last_recorded.since) <= maxAgeHours * 3_600_000)
    .sort((a, b) => Date.parse(b.last_recorded.since) - Date.parse(a.last_recorded.since));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: candidates.mjs <timeline.json> [current.json]');
    process.exit(2);
  }
  const current = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], 'utf8')) : undefined;
  console.log(JSON.stringify(candidates(JSON.parse(readFileSync(file, 'utf8')), { current }), null, 2));
}
