/**
 * Whether a stored sentence hides who acted behind a passive ("Two tankers
 * were reportedly hit…"), which prompt v22 asks against. Used by the caller
 * review as a flag, not a verdict: it finds a form of "be" before a past
 * participle, skipping the passives that carry no actor worth naming ("is
 * expected", "is due", "were postponed by Oman" names one already). A
 * reviewer still reads every sentence.
 */
const BE = '(?:is|are|was|were|be|been|being|has been|have been|had been|got|gets|get)';
const ADVERB = '(?:(?:also|now|still|not|reportedly|allegedly|already|briefly|partly|fully)\\s+)*';
const PARTICIPLE = '(?:[a-z]+ed|[a-z]+en|hit|struck|shut|cut|seized|shot|sold|held|told|sent|caught|led)';
const PASSIVE = new RegExp(`\\b${BE}\\s+${ADVERB}(${PARTICIPLE})\\b(?!\\s+by\\b)`, 'gi');
// Participles that describe a state or a schedule, not an act with a doer.
const STATIVE = /^(?:expected|scheduled|set|due|seen|priced|tied|linked|based|located|known|worried|concerned|closed|shut|open|needed|used|allowed|required|considered|estimated|listed|owned|valued)$/i;

/** The first passive in `text` that names no actor, or null. */
export function passiveVoice(text) {
  for (const m of String(text ?? '').matchAll(PASSIVE)) {
    if (!STATIVE.test(m[1])) return m[0];
  }
  return null;
}
