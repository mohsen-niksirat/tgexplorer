// ============================================================
// scripts/modularize.js — one-off refactoring helper
// ------------------------------------------------------------
// Splits the monolithic inline <script> in index.html into ES
// modules under js/ and rebuilds index.html line-by-line (instead
// of string-replacing multi-line blocks, which is fragile).
//
//   node scripts/modularize.js
//
// Idempotent: re-running it on an already-modularized file only
// refreshes the generated window bridge.
// ============================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const JS_DIR = path.join(ROOT, 'js');

// Where to read the app from. If index.html is already modular but the
// js/ modules are missing, we rebuild them from SOURCE (a non-modular
// copy of the app).
const SOURCE = process.argv[2] ? path.resolve(process.argv[2]) : INDEX;

const src = fs.readFileSync(SOURCE, 'utf8');
const lines = src.split('\n');

// ---- Locate the inline <script> block ----
let scriptLine = -1, isModule = false;
for (let i = lines.length - 1; i >= 0; i--) {
  if (/^<script>\s*$/.test(lines[i])) { scriptLine = i; break; }
  if (/^<script type="module">\s*$/.test(lines[i])) { scriptLine = i; isModule = true; break; }
}
if (scriptLine === -1) { console.error('inline <script> not found'); process.exit(1); }
let scriptEnd = -1;
for (let i = scriptLine + 1; i < lines.length; i++) {
  if (/^<\/script>\s*$/.test(lines[i])) { scriptEnd = i; break; }
}
if (scriptEnd === -1) { console.error('</script> not found'); process.exit(1); }
console.log('inline script: lines ' + (scriptLine + 1) + '..' + (scriptEnd + 1) + (isModule ? ' (already a module)' : ''));

const body = lines.slice(scriptLine + 1, scriptEnd);

const find = (pred, from = 0) => {
  for (let i = from; i < body.length; i++) if (pred(body[i], i)) return i;
  return -1;
};

// ---- Extract the blocks that become modules (only on the first run) ----
let workerBlock = null, i18nBlock = null, applyLangBlock = null,
    tBlock = null, stateBlock = null, rtlBlock = null;

if (!isModule) {
  const iWorker = find(l => l.startsWith('// WORKER CODE (embedded)'));
  const iI18n = find(l => l.trim() === '// i18n');
  const iRtl = find(l => l.startsWith('const RTL_LANGS='));
  const iState = find(l => l.startsWith('let state={'));
  const iApplyLang = find(l => l.startsWith('function applyLang('));
  const iT = find(l => l.startsWith('function t(key){'));
  let iTEnd = -1;
  if (iT !== -1) {
    let depth = 0;
    for (let i = iT; i < body.length; i++) {
      for (const ch of body[i]) {
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { iTEnd = i; break; } }
      }
      if (iTEnd !== -1) break;
    }
  }
  console.log('markers:', { iWorker, iI18n, iRtl, iState, iApplyLang, iT, iTEnd });
  if ([iWorker, iI18n, iRtl, iState, iApplyLang, iT, iTEnd].some(i => i === -1)) {
    console.error('missing marker'); process.exit(1);
  }

  workerBlock = body.slice(iWorker, iI18n);
  i18nBlock = body.slice(iI18n, iRtl);
  applyLangBlock = body.slice(iApplyLang, iApplyLang + 1);
  tBlock = body.slice(iT, iTEnd + 1);
  stateBlock = body.slice(iState, iState + 1);
  rtlBlock = body.slice(iRtl, iRtl + 1);

  const extracted = new Set();
  for (let i = iWorker; i < iI18n; i++) extracted.add(i);
  for (let i = iI18n; i < iRtl; i++) extracted.add(i);
  for (let i = iApplyLang; i < iApplyLang + 1; i++) extracted.add(i);
  for (let i = iT; i <= iTEnd; i++) extracted.add(i);
  for (let i = iState; i < iState + 1; i++) extracted.add(i);
  for (let i = iRtl; i < iRtl + 1; i++) extracted.add(i);

  var kept = body.filter((_, i) => !extracted.has(i));
} else {
  var kept = body.slice();
}

const imports = [
  '// ============================================================',
  '// MODULES',
  '// ============================================================',
  "import { WORKER_CODE } from './js/worker-code.js';",
  "import { applyLang, t, I18N, I18N_UI, RTL_LANGS } from './js/i18n.js';",
  "import { state } from './js/state.js';",
  '',
].join('\n');

// Strip the previous bridge block so it can be rebuilt.
kept = kept.join('\n')
  .replace(/\n?\/\/ ={10,}\n\/\/ WINDOW BRIDGE[\s\S]*?Object\.assign\(window, \{[\s\S]*?\}\);\n?/, '\n')
  .split('\n');

// ---------------------------------------------------------
// Publish the app's functions on `window`.
//
// The app used to live in a classic <script>, where every top-level
// function declaration became a property of `window`. Inline
// `onclick="openChannel('x')"` handlers (and the e2e suite) rely on
// that. In an ES module, top-level declarations are module-scoped,
// so we re-publish the ones that are called from markup.
//
// The list is derived automatically from the markup + the module body,
// so it can never reference a name that does not exist.
// ---------------------------------------------------------

const attrRe = /\bon(?:click|keydown|change|input|submit)\s*=\s*"([^"]*)"/g;
const calledFromMarkup = new Set();
let am;
while ((am = attrRe.exec(src)) !== null) {
  const fnRe = /(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
  let f;
  while ((f = fnRe.exec(am[1])) !== null) calledFromMarkup.add(f[2]);
}

const winRe = /\bwindow\.([A-Za-z_$][\w$]*)\s*(?=[^\w$])/g;
const calledFromWindow = new Set();
while ((am = winRe.exec(src)) !== null) calledFromWindow.add(am[1]);

const BUILTINS = new Set([
  'alert', 'confirm', 'prompt', 'setTimeout', 'setInterval', 'clearTimeout',
  'clearInterval', 'fetch', 'btoa', 'atob', 'parseInt', 'parseFloat', 'isNaN',
  'encodeURIComponent', 'decodeURIComponent', 'if', 'for', 'while', 'switch',
  'catch', 'return', 'typeof', 'new', 'function', 'event', 'this', 'String',
  'Number', 'Boolean', 'Array', 'Object', 'JSON', 'Math', 'Date', 'Promise',
  'Error', 'RegExp', 'Map', 'Set', 'TextEncoder', 'TextDecoder', 'Uint8Array',
  'open', 'click', 'replace', 'stringify', 'getElementById',
  'addEventListener', 'stopPropagation', 'preventDefault', 'scrollTo',
  'scrollToTop', 'innerHTML', 'setItem', 'getItem', 'removeItem',
  'querySelector', 'querySelectorAll', 'Telegram', 'location', 'navigator',
  'document', 'console', 'globalThis', 'history', 'localStorage',
  'sessionStorage', 'screen', 'performance', 'crypto', 'indexedDB',
  'devicePixelRatio', 'innerHeight', 'innerWidth', 'scrollX', 'scrollY',
  'origin', 'href', 'pathname', 'host', 'hostname', 'protocol', 'search',
  'hash', 'length', 'name', 'message', 'stack', 'toString', 'valueOf',
]);

const keptBody = kept.join('\n');
const defined = new Set();
for (const mm of keptBody.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(mm[1]);
for (const mm of keptBody.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) defined.add(mm[1]);
for (const mm of imports.matchAll(/import\s*\{([^}]*)\}/g)) {
  for (const n of mm[1].split(',')) {
    const name = n.trim().split(/\s+as\s+/).pop().trim();
    if (name) defined.add(name);
  }
}

const wanted = new Set([...calledFromMarkup, ...calledFromWindow]);
for (const n of ['t', 'state', 'searchLocal', 'getAllChannels', 'getLocalExplore', 'getChannelPosts']) wanted.add(n);
const WINDOW_EXPORTS = [...wanted]
  .filter(n => !BUILTINS.has(n) && defined.has(n))
  .sort();

console.log('window bridge: ' + WINDOW_EXPORTS.length + ' names');
const skipped = [...wanted].filter(n => !BUILTINS.has(n) && !defined.has(n)).sort();
if (skipped.length) console.log('not defined (skipped): ' + skipped.join(', '));

const bridge = [
  '',
  '// ============================================================',
  '// WINDOW BRIDGE',
  '// ----------------------------------------------------------',
  '// Inline `onclick="fn(...)"` handlers and the e2e suite expect the',
  '// app functions on `window` (as they were in the classic script).',
  '// ============================================================',
  'Object.assign(window, {',
  ...WINDOW_EXPORTS.map(n => '  ' + n + ','),
  '});',
  '',
].join('\n');

const newBody = (isModule ? '' : imports) + kept.join('\n') + '\n' + bridge;

const out = [
  ...lines.slice(0, scriptLine),
  '<script type="module">',
  ...newBody.split('\n'),
  '</script>',
  ...lines.slice(scriptEnd + 1),
].join('\n');

const writingToSource = SOURCE !== INDEX;
if (writingToSource) {
  console.log('index.html NOT rewritten (building modules from ' + path.relative(ROOT, SOURCE) + ')');
} else {
  fs.writeFileSync(INDEX, out, 'utf8');
  console.log('index.html rebuilt:', out.length, 'bytes,', out.split('\n').length, 'lines');
}

// ---- Write the modules (first run only) ----
if (isModule) {
  console.log('source is already modular — module files left untouched');
  process.exit(0);
}

fs.mkdirSync(JS_DIR, { recursive: true });
function write(file, content) {
  fs.writeFileSync(path.join(JS_DIR, file), content, 'utf8');
  console.log('wrote js/' + file, '(' + content.length + ' bytes)');
}

write('worker-code.js',
  '// ============================================================\n' +
  '// worker-code.js — the Cloudflare Worker source shown in the\n' +
  '// setup screen. Kept verbatim so users can paste it as-is.\n' +
  '// ============================================================\n' +
  workerBlock.join('\n')
    .replace(/^\/\/ WORKER CODE \(embedded\)\n\/\/ ={10,}\n/m, '')
    .replace(/^const WORKER_CODE=/m, 'export const WORKER_CODE=') + '\n');

write('i18n.js',
  '// ============================================================\n' +
  '// i18n.js — all UI strings for the 7 supported languages.\n' +
  '// ============================================================\n' +
  "import { state } from './state.js';\n\n" +
  i18nBlock.join('\n')
    .replace(/^const I18N=/m, 'export const I18N=')
    .replace(/^const I18N_UI=/m, 'export const I18N_UI=') + '\n' +
  rtlBlock.join('\n').replace(/^const RTL_LANGS=/, 'export const RTL_LANGS=') + '\n\n' +
  applyLangBlock.join('\n').replace(/^function applyLang\(/, 'export function applyLang(') + '\n\n' +
  tBlock.join('\n').replace(/^function t\(/, 'export function t(') + '\n');

write('state.js',
  '// ============================================================\n' +
  '// state.js — the single mutable app state (persisted in\n' +
  '// localStorage) and shared by every module.\n' +
  '// ============================================================\n' +
  stateBlock.join('\n').replace(/^let state=/, 'export let state=') + '\n');
