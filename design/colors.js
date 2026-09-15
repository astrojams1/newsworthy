export const channels = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16));
export const mix = (base, color, amount) => '#' + channels(base).map((v, i) => Math.round(v * (1 - amount) + channels(color)[i] * amount).toString(16).padStart(2, '0')).join('').toUpperCase();
export function resolveTheme(palette, appearance, dark = false) {
  const { surface, ink, wash, glow, veil } = appearance;
  return {
    ...appearance,
    // Opaque gradient stops for small icons and native RemoteViews. They share
    // the web's hues and strengths, while avoiding translucent widget text.
    start: mix(surface, palette.companion, glow),
    center: mix(surface, palette.primary, veil),
    end: mix(mix(surface, palette.primary, veil), palette.primary, wash),
    accent: mix(palette.primary, ink, dark ? 0.66 : 0.76),
    tinted: mix(surface, palette.primary, dark ? 0.10 : 0.08),
    elevated: mix(surface, palette.companion, dark ? 0.06 : 0.035),
  };
}
export function contrast(a, b) {
  const luminance = value => channels(value).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
  const [x, y] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (x + .05) / (y + .05);
}
