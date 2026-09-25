import tokens from '../../../public/tokens.js';

// The design system for the shared Expo screens: every size, space, weight,
// colour outside the reading palette, duration and layout ratio a screen uses
// comes from here. Sources are design/tokens.json (scale), design/palette.json
// (colour) and design/surfaces.json (cross-surface contract); npm run
// design:generate writes them into public/tokens.js. test/design-system.test.js
// rejects a literal in a screen or component, so a new value is a new token.
export const { font, type, leading, tracking, scaleCap, space, radius, stroke, size, layout, opacity, motion, shadow, control, surfaces } = tokens;

/** @type {{ light: '300', regular: '400', medium: '500', semibold: '600', bold: '700' }} */
export const weight = /** @type {any} */ (tokens.weight);

// The minimum for anything tappable, shared with the header contract.
export const touchTarget = surfaces.header.minimumTouchTarget;

// Line height in whole points: 14 at normal leading is 20, not 19.6.
export const lineHeight = (fontSize, ratio) => Math.round(fontSize * ratio);

// The score's typeface, per platform, from the cross-surface contract.
export const scoreFont = platform => surfaces.scoreFont[platform] ?? surfaces.scoreFont.android;
