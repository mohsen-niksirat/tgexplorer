// Syntax-check every inline <script> block in index.html.
// Handles both the classic (<script>) and the module (<script type="module">)
// form — the module imports are stripped, since Node cannot resolve them here.
const fs = require('fs');
const path = require('path');

const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
let m, i = 0, ok = true;
while ((m = re.exec(s)) !== null) {
  i++;
  const code = m[1]
    .replace(/^\s*import\s+[^;]+;\s*$/gm, '')
    .replace(/^\s*export\s+/gm, '');
  try {
    new Function(code);
    console.log('inline script #' + i + ': syntax OK (' + code.length + ' chars)');
  } catch (e) {
    ok = false;
    console.log('inline script #' + i + ': SYNTAX ERROR: ' + e.message);
    const lines = code.split('\n');
    for (let j = 0; j < lines.length; j++) {
      try { new Function(lines.slice(0, j + 1).join('\n')); }
      catch (err) {
        if (!/Unexpected end of input|Unexpected token '\}'|missing \) after|Unexpected end/.test(err.message)) {
          console.log('  first hard error near line ' + (j + 1) + ': ' + err.message);
          console.log('  > ' + lines[j].slice(0, 160));
          break;
        }
      }
    }
  }
}
console.log(ok ? 'ALL INLINE SCRIPTS OK' : 'FAILED');
process.exit(ok ? 0 : 1);
