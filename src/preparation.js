import { randomUUID } from 'node:crypto';
import { history, recentStories, ratingsByIds, savePreparation } from './db.js';
import { PRIOR_HOURS, judgeReading } from './story.js';
import { agePrefix, DISPLAY_CHARACTER_LIMIT, AGE_PREFIX_RESERVE, EXPLANATION_CHARACTER_LIMIT } from '../apps/client/lib/story-age.js';

/**
 * Unjudged readings have unknown age; an outage must not masquerade as new.
 * A reading that opens its own development has none to show either: its age is
 * the reading's own timestamp, which every surface already prints beside it, so
 * "54 minutes ago:" on a new development only repeated the update time. The
 * prefix is for a sentence re-reporting a development first covered earlier.
 */
/**
 * A judged reading the judge placed in no earlier development: brand new. The
 * same rows carry no age prefix, which is what a reader sees as "new". An
 * unjudged reading has no prefix either but is not known to be new — an
 * outage must not masquerade as news any more than as an old story.
 */
export function opensDevelopment(reading) {
  return reading?.judge_version != null && reading.development_of == null;
}

export async function firstCoverage(reading) {
  if (reading.judge_version == null) return null;
  if (reading.development_of == null) return null;
  const [root] = await ratingsByIds([reading.development_of]);
  return root?.created_at ?? null;
}

export async function prepareReading(submission, now = new Date()) {
  const judgement = await judgeReading({
    score: submission.score, explanation: submission.explanation,
    created_at: now.toISOString(),
    priors: await history({ hours: PRIOR_HOURS }), stories: await recentStories(),
  });
  const since = await firstCoverage({ ...judgement, created_at: now.toISOString() });
  const id = randomUUID();
  // The caller gets an opaque reference, never authority to set stored judgement.
  await savePreparation({ id, score: submission.score, draft: submission.explanation,
    promptVersion: submission.prompt_version, judgement, createdAt: now.toISOString() });
  return {
    ok: true, stored: false, preparation: id,
    development: judgement.judge_version == null ? 'unjudged' : judgement.development_of == null ? 'new' : 'same',
    first_covered_at: since, prefix: agePrefix(since, now.getTime()),
    display_character_limit: DISPLAY_CHARACTER_LIMIT,
    reserved_prefix_characters: AGE_PREFIX_RESERVE,
    max_explanation_characters: EXPLANATION_CHARACTER_LIMIT,
    expires_at: new Date(now.getTime() + 30 * 60_000).toISOString(),
  };
}
