/**
 * Whether a stored sentence predicts a market move, which prompt v21 forbids:
 * "…, which could lift oil and fuel prices". Used by the caller review as a
 * flag, not a verdict. It looks for a hedge (could, may, might, likely to,
 * would) and a market word in the same clause, so a move that happened ("oil
 * rose 2%") and a hedge about something else ("Trump could decide this week")
 * both pass. A reviewer still reads every sentence.
 */
const HEDGE = /\b(?:could|may|might|likely to|would|set to|expected to)\b/i;
const MARKET = /\b(?:prices?|oil|gas|fuel|diesel|stocks?|shares|markets?|rates?|costs?|savings|mortgages?|borrowing|inflation|futures|bitcoin|dollar|yields?|bonds?)\b/i;

/** The first clause of `text` that predicts a market move, or null. */
export function marketForecast(text) {
  const clauses = String(text ?? '').split(/,|;|\bso\b|\bwhich\b|\bthat\b/i);
  return clauses.find((c) => HEDGE.test(c) && MARKET.test(c))?.trim() ?? null;
}
