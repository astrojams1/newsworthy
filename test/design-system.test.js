import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { cssName } from '../design/names.js';

// The design system is the only place a style value is written. Screens and
// web pages name tokens; they never restate a number or a colour. Each rule
// below is paired with a case proving it rejects the ad-hoc value it exists
// to stop, so a check that silently matches nothing cannot pass.

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const tokens = JSON.parse(read('design/tokens.json'));
const list = dir => readdirSync(new URL(dir, root), { recursive: true }).map(String)
  .filter(file => /\.(tsx?|jsx?)$/.test(file)).map(file => `${dir}/${file}`);

// Every screen and component, and the layout arithmetic they share.
const UI_FILES = [...list('apps/client/app'), ...list('apps/client/components'), 'apps/client/lib/layout.js', 'apps/client/lib/design.js'];
// Hand-written web styles. tokens.css is generated from the tokens themselves.
const CSS_FILES = ['public/info.css', 'public/levels.css'];
const HTML_FILES = readdirSync(new URL('public', root)).filter(file => file.endsWith('.html')).map(file => `public/${file}`);

const COLOR = /#[0-9a-f]{3,8}\b|\brgba?\(\s*\d|\bhsla?\(/i;
const NAMED_COLOR = /^(white|black|red|green|blue|gray|grey|silver|orange|yellow|purple|pink|brown|navy|teal)$/i;

/** Ad-hoc style values in one UI source, as `line: reason` strings. */
export function uiViolations(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
  const found = [];
  const report = (node, reason) => found.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${reason}`);
  const visit = node => {
    if (ts.isNumericLiteral(node)) {
      const value = Number(node.text);
      const parent = node.parent;
      const spaceStep = ts.isElementAccessExpression(parent) && parent.argumentExpression === node && parent.expression.getText() === 'space';
      const halving = ts.isBinaryExpression(parent) && parent.right === node && parent.operatorToken.kind === ts.SyntaxKind.SlashToken && value === 2;
      if (spaceStep && !(node.text in tokens.space)) report(node, `space[${node.text}] is not a step on the space scale`);
      else if (!spaceStep && !halving && value !== 0 && value !== 1) report(node, `literal ${node.text}; use a token from lib/design`);
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      if (COLOR.test(node.text)) report(node, `colour literal ${JSON.stringify(node.text.match(COLOR)[0])}; use the theme or palette`);
    }
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.initializer)) {
      const name = node.name.getText();
      if (name === 'fontWeight') report(node, `fontWeight ${node.initializer.getText()}; use weight.*`);
      if (name === 'fontFamily') report(node, `fontFamily ${node.initializer.getText()}; use scoreFont() or font.*`);
      if (/colou?r$/i.test(name) && NAMED_COLOR.test(node.initializer.text)) report(node, `named colour ${node.initializer.getText()}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

const LENGTH = /(?<![\w-])-?\d*\.?\d+(px|rem|em|pt|ch|ms|s)\b/;
const UNITLESS_PROPS = new Set(['font-weight', 'line-height', 'opacity', 'z-index', 'stroke-width', 'letter-spacing']);
const BREAKPOINTS = new Set(Object.values(tokens.breakpoint));

/** Ad-hoc values in one stylesheet's text. */
export function cssViolations(file, css) {
  const found = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const media of clean.matchAll(/@media([^{]*)\{/g)) {
    for (const [, width] of media[1].matchAll(/(?:max|min)-width:\s*(\d+)px/g)) {
      if (!BREAKPOINTS.has(Number(width))) found.push(`${file}: breakpoint ${width}px is not in tokens.breakpoint`);
    }
  }
  for (const [, prop, value] of clean.replace(/@media[^{]*\{/g, '{').matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/g)) {
    if (prop.startsWith('--')) continue;
    const v = value.trim();
    if (COLOR.test(v) || NAMED_COLOR.test(v)) found.push(`${file}: ${prop}: ${v} — colour literal`);
    else if (LENGTH.test(v)) found.push(`${file}: ${prop}: ${v} — raw length or duration`);
    else if (UNITLESS_PROPS.has(prop) && /^-?[\d.]+$/.test(v) && v !== '0' && v !== '1') found.push(`${file}: ${prop}: ${v} — raw number`);
  }
  return found;
}

const styleBlocks = html => [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(match => match[1]).join('\n');

test('screens and components write no ad-hoc numbers, colours, weights or fonts', () => {
  assert.ok(UI_FILES.length >= 15, `found ${UI_FILES.length} UI files`);
  assert.deepEqual(UI_FILES.flatMap(file => uiViolations(file, read(file))), []);
});

test('web stylesheets and pages write no ad-hoc lengths, colours or breakpoints', () => {
  const found = [
    ...CSS_FILES.flatMap(file => cssViolations(file, read(file))),
    ...HTML_FILES.flatMap(file => cssViolations(file, styleBlocks(read(file)))),
    ...HTML_FILES.filter(file => /\sstyle="/.test(read(file))).map(file => `${file}: inline style attribute; use a class`),
  ];
  assert.deepEqual(found, []);
});

test('every custom property a page reads is defined', () => {
  const defined = new Set([...read('public/tokens.css').matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
  const missing = [];
  for (const file of [...CSS_FILES, ...HTML_FILES]) {
    const text = read(file);
    for (const [, name] of text.matchAll(/(--[\w-]+)\s*:/g)) defined.add(name);
    for (const [, name] of text.matchAll(/var\((--[\w-]+)/g)) if (!defined.has(name)) missing.push(`${file}: ${name}`);
  }
  assert.deepEqual(missing, []);
});

/** Token paths nothing reads, given the web and code text that could. */
export function unusedTokens(scale, web, code) {
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const usedInCode = (group, key, sub) => {
    const direct = new RegExp(`\\b${escape(group)}(\\.${escape(key)}\\b|\\[${escape(key)}\\]|\\['${escape(key)}'\\])`);
    const dynamic = new RegExp(`\\b${escape(group)}\\[[^\\]]+\\]`).test(code) && code.includes(`'${key}'`);
    if (sub === undefined) return direct.test(code) || dynamic;
    return code.includes(`${group}.${key}.${sub}`) || (direct.test(code) && new RegExp(`\\b${escape(sub)}\\b`).test(code));
  };
  const unused = [];
  for (const [group, entries] of Object.entries(scale)) {
    for (const [key, value] of Object.entries(entries)) {
      if (group === 'breakpoint') { if (!new RegExp(`width:\\s*${value}px`).test(web)) unused.push(`${group}.${key}`); continue; }
      const onWeb = web.includes(`var(--${cssName(group, key)})`);
      if (value && typeof value === 'object') {
        for (const sub of Object.keys(value)) if (!onWeb && !usedInCode(group, key, sub)) unused.push(`${group}.${key}.${sub}`);
      } else if (!onWeb && !usedInCode(group, key)) unused.push(`${group}.${key}`);
    }
  }
  return unused;
}

const webText = () => [...CSS_FILES, ...HTML_FILES].map(read).join('\n');
// design.js only re-exports the groups, so it cannot count as a use.
const codeText = () => [...UI_FILES.filter(file => !file.endsWith('lib/design.js')), 'scripts/generate-design.mjs', 'public/favicon.js'].map(read).join('\n');

test('the space scale is 4-point steps, and every token is used', () => {
  for (const [step, value] of Object.entries(tokens.space)) assert.equal(value, Number(step) * 4, `space ${step}`);
  assert.deepEqual(unusedTokens(tokens, webText(), codeText()), [], 'a token nothing uses is either dead or a sign a screen restated its value');
});

test('the unused-token rule finds a token nothing reads, on the web or in code', () => {
  const extra = { ...tokens, space: { ...tokens.space, 9: 36 }, type: { ...tokens.type, jumbo: 64 }, size: { ...tokens.size, trailing: { ...tokens.size.trailing, spare: 18 } }, breakpoint: { ...tokens.breakpoint, wide: 1200 } };
  assert.deepEqual(unusedTokens(extra, webText(), codeText()).sort(), ['breakpoint.wide', 'size.trailing.spare', 'space.9', 'type.jumbo']);
});

// Each rule, shown catching the value it exists to stop.
test('the UI rule rejects each kind of ad-hoc value', () => {
  const cases = {
    'a raw font size': `const s = { fontSize: 17 };`,
    'a raw spacing ternary': `const s = { marginTop: landscape ? 12 : 24 };`,
    'a size prop': `const g = <Glyph name="close" size={20} />;`,
    'a hex colour': `const s = { backgroundColor: '#FFFFFF' };`,
    'a colour inside a template': "const svg = `<svg fill=\"#000\"/>`;",
    'a weight string': `const s = { fontWeight: '600' };`,
    'a font string': `const s = { fontFamily: 'monospace' };`,
    'a named colour': `const s = { color: 'white' };`,
    'a space step off the scale': `const s = { gap: space[9] };`,
  };
  for (const [name, text] of Object.entries(cases)) assert.notDeepEqual(uiViolations('case.tsx', text), [], name);
  assert.deepEqual(uiViolations('ok.tsx', `const s = { gap: space[2.5], width: size.cue / 2, opacity: pressed ? opacity.pressed : 1, flex: 1, top: 0 };`), []);
});

test('the CSS rule rejects each kind of ad-hoc value', () => {
  const cases = {
    'a rem padding': `.a { padding: 0.75rem; }`,
    'a px border': `.a { border: 1px solid var(--rule); }`,
    'a hex colour': `.a { color: #c0392b; }`,
    'an rgba shadow': `.a { box-shadow: 0 0 0 rgba(0,0,0,.1); }`,
    'a raw weight': `.a { font-weight: 550; }`,
    'a raw line height': `.a { line-height: 1.3; }`,
    'a duration': `.a { transition: opacity 90ms ease; }`,
    'an unlisted breakpoint': `@media (max-width: 600px) { .a { display: none; } }`,
  };
  for (const [name, css] of Object.entries(cases)) assert.notDeepEqual(cssViolations('case.css', css), [], name);
  assert.deepEqual(cssViolations('ok.css', `@media (max-width: 720px) { .a { padding: var(--space-2) 0; width: 100%; flex: 1; transform: rotate(45deg); } }`), []);
});
