/**
 * Whether a stored sentence names a news outlet, which prompt v19 forbids
 * (rule 8 in PROMPT-RULES.md). The caller review uses it as a flag, not a
 * verdict: the list is the outlets a caller is likely to cite, not every
 * outlet there is, so a reviewer still reads every sentence. The front page
 * uses it to pass over a development's older reports that named one (see
 * sentenceFor() in src/current.js). Case-sensitive,
 * and multi-word where a short name is also an ordinary word or a market
 * ("an economist", "the Nikkei fell").
 */
const OUTLETS = [
  'Wall Street Journal', 'WSJ', 'New York Times', 'NYT', 'Washington Post',
  'Financial Times', 'FT', 'Reuters', 'Bloomberg', 'Associated Press', 'AP',
  'AFP', 'CNN', 'CNBC', 'MSNBC', 'MS Now', 'Fox News', 'NBC', 'CBS',
  'ABC News', 'BBC', 'NPR', 'PBS', 'Politico', 'Axios', 'Semafor',
  'The Guardian', 'the Guardian', 'The Economist', 'Barron\'s', 'MarketWatch',
  'Nikkei Asia', 'Al Jazeera', 'Xinhua', 'TASS', 'IRNA', 'Tasnim', 'Kyodo',
  'Yonhap', 'Haaretz', 'Times of Israel', 'Der Spiegel', 'Le Monde',
];
const PATTERN = new RegExp(`(?<![\\w'])(?:${OUTLETS.map((o) => o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\w])`);

/** The first outlet named in `text`, or null. */
export function outletNamed(text) {
  return String(text ?? '').match(PATTERN)?.[0] ?? null;
}
