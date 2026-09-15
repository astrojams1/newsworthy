import tokens from './tokens.js';

export const validLevel = score => Number.isInteger(score) && score >= 1 && score <= 10;
export const levelPalette = score => validLevel(score) ? tokens.levels[score - 1] : tokens.brand;

// A compact badge uses opaque stops so it stays legible on browser chrome.
// The fixed brand mark is a dash; only an actual reading gets a number.
export function faviconSvg(score, dark = false) {
  const theme = levelPalette(score)[dark ? 'dark' : 'light'];
  const mark = validLevel(score)
    ? `<text x="16" y="24" text-anchor="middle" font-size="${score === 10 ? 20 : 24}" font-weight="500" font-family="system-ui,-apple-system,sans-serif" fill="${theme.ink}">${score}</text>`
    : `<path d="M10 16h12" stroke="${theme.accent}" stroke-width="3" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="level" x2="1" y2="1"><stop stop-color="${theme.start}"/><stop offset=".45" stop-color="${theme.center}"/><stop offset="1" stop-color="${theme.end}"/></linearGradient></defs><rect width="32" height="32" rx="${tokens.radius.icon}" fill="url(#level)"/>${mark}</svg>`;
}
