// Find every function that is called from an inline HTML attribute
// (onclick="fn(...)", onkeydown="fn(...)", etc.) or from window.* —
// those must stay reachable on `window` after the ES-module split.
const fs = require('fs');
const path = require('path');

const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// inline handler attributes
const attrRe = /\bon(?:click|keydown|change|input|load|submit|error)\s*=\s*"([^"]*)"/g;
const called = new Set();
let m;
while ((m = attrRe.exec(s)) !== null) {
  const body = m[1];
  const fnRe = /\b([A-Za-z_$][\w$]*)\s*\(/g;
  let f;
  while ((f = fnRe.exec(body)) !== null) called.add(f[1]);
}

// window.<name> usages
const winRe = /\bwindow\.([A-Za-z_$][\w$]*)/g;
while ((m = winRe.exec(s)) !== null) called.add(m[1]);

// built-ins to ignore
const ignore = new Set([
  'alert', 'confirm', 'prompt', 'setTimeout', 'setInterval', 'clearTimeout',
  'clearInterval', 'fetch', 'btoa', 'atob', 'parseInt', 'parseFloat',
  'isNaN', 'encodeURIComponent', 'decodeURIComponent', 'JSON', 'Object',
  'Array', 'String', 'Number', 'Boolean', 'Date', 'Math', 'Promise', 'RegExp',
  'Error', 'Map', 'Set', 'Uint8Array', 'TextEncoder', 'TextDecoder', 'if',
  'for', 'while', 'switch', 'catch', 'return', 'typeof', 'new', 'function',
]);

const names = [...called].filter(n => !ignore.has(n)).sort();
console.log('count:', names.length);
console.log(names.join('\n'));
