import tokens from '../../../public/tokens.js';

// Match public/levels.css at the actual canvas size. CSS's default ellipse is
// farthest-corner: expand the farthest-side radii by sqrt(2). A fixed square
// texture cannot preserve the 160-degree linear layer when the screen resizes.
export function readingGradientSvg(score, dark, width, height) {
  const level = tokens.levels[score - 1];
  if (!Number.isInteger(score) || !level) return null;
  const t = level[dark ? 'dark' : 'light'];
  return gradientSvg({ primary: level.primary, companion: level.companion, surface: t.surface, glow: t.glow, wash: t.wash, veil: t.veil }, width, height);
}

// The four layers for any colours, so the CSS comparison in
// test/reading-gradient.test.js does not depend on the current palette.
export function gradientSvg(level, width, height) {
  if (width <= 0 || height <= 0) return null;
  const radial = (id, x, y, stop, color, opacity) => {
    const rx = Math.max(x, width - x) * Math.SQRT2 * stop;
    const ry = Math.max(y, height - y) * Math.SQRT2 * stop;
    return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${x} ${y}) scale(${rx} ${ry})"><stop stop-color="${color}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
  };
  const angle = 160 * Math.PI / 180;
  const dx = Math.sin(angle), dy = -Math.cos(angle);
  const length = width * Math.abs(dx) + height * Math.abs(dy);
  const rect = fill => `<rect width="${width}" height="${height}" fill="${fill}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>
${radial('glow', width * .05, 0, .62, level.companion, level.glow)}
${radial('wash', width, height, .72, level.primary, level.wash)}
${radial('veil', 0, height, .60, level.companion, level.veil)}
<linearGradient id="diagonal" gradientUnits="userSpaceOnUse" x1="${(width - dx * length) / 2}" y1="${(height - dy * length) / 2}" x2="${(width + dx * length) / 2}" y2="${(height + dy * length) / 2}"><stop offset=".25" stop-color="${level.primary}" stop-opacity="0"/><stop offset="1" stop-color="${level.primary}" stop-opacity="${level.veil}"/></linearGradient>
</defs>${rect(level.surface)}${rect('url(#diagonal)')}${rect('url(#veil)')}${rect('url(#wash)')}${rect('url(#glow)')}</svg>`;
}
