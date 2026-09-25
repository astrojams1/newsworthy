import { randomUUID } from 'node:crypto';
import { history, recentStories, savePreparation } from './db.js';
import { PRIOR_HOURS, callerJudgement, judgeTask } from './story.js';
import { DISPLAY_CHARACTER_LIMIT, NEW_LABEL_RESERVE, EXPLANATION_CHARACTER_LIMIT } from '../apps/client/lib/story-age.js';

/**
 * A reading's sentence is labelled new when the judge placed it and it opened a
 * development of its own. An unjudged reading is not new: an outage must not
 * masquerade as a fresh story. A re-report carries no label and no age; the
 * update time printed beside it already dates the reading.
 */
export function opensDevelopment(reading) {
  return reading.judge_version != null && reading.development_of == null;
}

/**
 * Hand the caller the judge's question about its draft. No model is called:
 * the caller answers it and sends the answer with its submission. The task's
 * version and the ids it offered are kept with the preparation, so the answer
 * is checked against what the caller was shown rather than what it says.
 */
export async function prepareReading(submission, now = new Date()) {
  const task = judgeTask({
    score: submission.score, explanation: submission.explanation,
    created_at: now.toISOString(),
    priors: await history({ hours: PRIOR_HOURS }), stories: await recentStories(),
  });
  const id = randomUUID();
  await savePreparation({ id, score: submission.score, draft: submission.explanation,
    promptVersion: submission.prompt_version,
    judgement: { task: { version: task.version, roots: task.roots } },
    createdAt: now.toISOString() });
  return {
    ok: true, stored: false, preparation: id,
    judge_task: task.text,
    judge_version: task.version,
    display_character_limit: DISPLAY_CHARACTER_LIMIT,
    reserved_prefix_characters: NEW_LABEL_RESERVE,
    max_explanation_characters: EXPLANATION_CHARACTER_LIMIT,
    expires_at: new Date(now.getTime() + 30 * 60_000).toISOString(),
  };
}

/**
 * The judgement to store with a submission: the caller's answer, checked
 * against the task its preparation recorded. Without a valid preparation or an
 * answer the reading stores unjudged, which the display reads as "inherit".
 */
export function submittedJudgement(body, prepared) {
  return callerJudgement(body?.judgement, prepared?.judgement?.task);
}
