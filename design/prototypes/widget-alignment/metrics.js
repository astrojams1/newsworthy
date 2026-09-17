// The numeral occupies N text lines optically: body ink + N-1 baseline steps.
export function alignmentMetrics({ lines, lineHeight, bodyInkHeight, numberInkAt100 }) {
  if (!Number.isInteger(lines) || lines < 2 || lines > 4 || [lineHeight, bodyInkHeight, numberInkAt100].some(n => !Number.isFinite(n) || n <= 0)) throw new RangeError('Invalid typography metrics');
  const inkHeight = (lines - 1) * lineHeight + bodyInkHeight;
  return { inkHeight, fontSize: 100 * inkHeight / numberInkAt100, lineBoxHeight: lines * lineHeight };
}
