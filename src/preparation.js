import { randomUUID } from 'node:crypto';
import { history, recentStories, savePreparation } from './db.js';
import { PRIOR_HOURS, judgeReading } from './story.js';
import { NEW_LABEL, DISPLAY_CHARACTER_LIMIT, NEW_LABEL_RESERVE, EXPLANATION_CHARACTER_LIMIT } from '../apps/client/lib/story-age.js';

/**
 * A reading's sentence is labelled new when the judge placed it and it opened a
 * development of its own. An unjudged reading is not new: an outage must not
 * masquerade as a fresh story. A re-report carries no label and no age; the
 * update time printed beside it already dates the reading.
 */
export function opensDevelopment(reading) {
  return reading.judge_version != null && reading.development_of == null;
}

export async function prepareReading(submission, now = new Date()) {
  const judgement = await judgeReading({
    score: submission.score, explanation: submission.explanation,
    created_at: now.toISOString(),
    priors: await history({ hours: PRIOR_HOURS }), stories: await recentStories(),
  });
  const id = randomUUID();
  // The caller gets an opaque reference, never authority to set stored judgement.
  await savePreparation({ id, score: submission.score, draft: submission.explanation,
    promptVersion: submission.prompt_version, judgement, createdAt: now.toISOString() });
  return {
    ok: true, stored: false, preparation: id,
    development: judgement.judge_version == null ? 'unjudged' : judgement.development_of == null ? 'new' : 'same',
    prefix: opensDevelopment(judgement) ? `${NEW_LABEL} ` : '',
    display_character_limit: DISPLAY_CHARACTER_LIMIT,
    reserved_prefix_characters: NEW_LABEL_RESERVE,
    max_explanation_characters: EXPLANATION_CHARACTER_LIMIT,
    expires_at: new Date(now.getTime() + 30 * 60_000).toISOString(),
  };
}
