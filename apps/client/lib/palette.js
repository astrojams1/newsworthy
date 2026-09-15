import tokens from '../../../public/tokens.js';
export function themeForLevel(score, isDark = false) {
  const palette = Number.isInteger(score) && score >= 1 && score <= 10 ? tokens.levels[score - 1] : tokens.brand;
  const appearance = palette[isDark ? 'dark' : 'light'];
  return { ...appearance, dark: isDark, muted: appearance.gradientMuted, faint: appearance.gradientMuted };
}
export const light = themeForLevel(null);
export const dark = themeForLevel(null, true);
