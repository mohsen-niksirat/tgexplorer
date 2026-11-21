// Move the BUILD_TIME constant out of the middle of the CORS_HEADERS
// object literal and in front of it.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STAMP = "2026-10-21";

for (const file of ['worker.js', 'js/worker-code.js']) {
  const p = path.join(ROOT, file);
  const raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n');

  // Remove every BUILD_TIME line.
  s = s.replace(/^const BUILD_TIME='[^']*';\n/gm, '');

  // Put it right before the CORS_HEADERS declaration.
  const i = s.indexOf('const CORS_HEADERS');
  if (i === -1) { console.error(file + ': the CORS_HEADERS anchor was not found'); process.exit(1); }
  s = s.slice(0, i) + "const BUILD_TIME='" + STAMP + "';\n" + s.slice(i);

  fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
  console.log('fixed ' + file);
}
console.log('done');
