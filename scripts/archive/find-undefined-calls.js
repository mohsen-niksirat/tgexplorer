// Find identifiers that are called from inline handlers but are never
// defined anywhere in the file (pre-existing bugs, not caused by the
// module split).
const fs = require('fs');
const path = require('path');

const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Strip line comments so that examples in comments are not mistaken for
// real inline handlers.
const code = s.replace(/^\s*\/\/.*$/gm, '');

const attrRe = /\bon(?:click|keydown|change|input|submit)\s*=\s*"([^"]*)"/g;
const called = new Set();
let m;
while ((m = attrRe.exec(code)) !== null) {
  const fnRe = /(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
  let f;
  while ((f = fnRe.exec(m[1])) !== null) called.add(f[2]);
}

const ignore = new Set([
  'alert', 'confirm', 'prompt', 'setTimeout', 'setInterval', 'clearTimeout',
  'clearInterval', 'fetch', 'btoa', 'atob', 'parseInt', 'parseFloat', 'isNaN',
  'encodeURIComponent', 'decodeURIComponent', 'if', 'for', 'while', 'switch',
  'catch', 'return', 'typeof', 'new', 'function', 'event', 'this', 'String',
  'Number', 'Boolean', 'Array', 'Object', 'JSON', 'Math', 'Date', 'Promise',
  'Error', 'RegExp', 'Map', 'Set', 'TextEncoder', 'TextDecoder', 'Uint8Array',
  'open', 'click', 'replace', 'stringify', 'getElementById', 'addEventListener',
  'stopPropagation', 'preventDefault', 'scrollTo', 'scrollToTop', 'innerHTML',
  'setItem', 'getItem', 'removeItem', 'querySelector', 'querySelectorAll',
]);

const defined = new Set();
// function declarations
for (const mm of s.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(mm[1]);
// const/let/var declarations
for (const mm of s.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) defined.add(mm[1]);
// object shorthand in the bridge list
for (const mm of s.matchAll(/Object\.assign\(window, \{([\s\S]*?)\}\);/g)) {
  for (const l of mm[1].split('\n')) {
    const t = l.trim().replace(/,$/, '');
    if (t && !t.startsWith('//')) defined.add(t);
  }
}

const missing = [...called].filter(n => !ignore.has(n) && !defined.has(n)).sort();
console.log('called-but-undefined (' + missing.length + '):');
console.log(missing.join('\n  '));
