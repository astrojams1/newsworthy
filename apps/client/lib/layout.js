import { layout, surfaces } from './design.js';

const clamp = (min, value, max) => Math.max(min, Math.min(value, max));

// The page's side gutter: a share of the width, within fixed bounds. The
// reading and every settings page use the same one.
export const gutter = width => clamp(layout.gutter.min, width * layout.gutter.ratio, layout.gutter.max);

// Everything about the reading screen that follows from the window. Static
// web rendering has no viewport, so a zero width or height takes the fallback.
export function readingLayout({ width: rawWidth, height: rawHeight, fontScale: rawScale }) {
  const width = rawWidth || layout.fallbackViewport.width;
  const height = rawHeight || layout.fallbackViewport.height;
  const fontScale = rawScale || 1;
  const landscape = height < layout.landscapeBelowHeight;
  const { reading } = surfaces;
  const scoreSize = landscape
    ? Math.min(height * layout.score.landscapeHeightRatio, reading.maximumScore)
    : clamp(reading.minimumPortraitScore, Math.min(width * layout.score.widthRatio, height * layout.score.heightRatio), reading.maximumScore);
  const sentenceSize = landscape ? layout.sentence.landscape : clamp(layout.sentence.min, width * layout.sentence.widthRatio, layout.sentence.max);
  return {
    width, height, fontScale, landscape, scoreSize, sentenceSize,
    denominatorSize: landscape ? reading.denominatorLandscape : reading.denominatorPortrait,
    gutter: gutter(width),
    column: landscape ? layout.column.readingLandscape : layout.column.reading,
    sentenceColumn: landscape ? layout.column.readingLandscape : layout.column.sentence * fontScale,
  };
}
