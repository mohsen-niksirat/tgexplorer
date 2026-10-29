// The two worker copies (the deployed worker.js and the one shown in the
// setup screen) must expose the same routes — a user who copies the code
// from the setup screen has to get a worker that speaks the same API.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const deployed = fs.readFileSync(path.join(ROOT, 'worker.js'), 'utf8');
const embeddedRaw = fs.readFileSync(path.join(ROOT, 'js', 'worker-code.js'), 'utf8');
const from = embeddedRaw.indexOf('WORKER_CODE=`') + 'WORKER_CODE=`'.length;
const embedded = embeddedRaw.slice(from, embeddedRaw.lastIndexOf('`;'));

// Undo the escaping build-worker-code.js applies inside the template literal
// (\\, \` and \${) and normalise line endings, so the embedded copy can be
// compared byte-for-byte with the deployed source.
const unescaped = embedded.replace(/\\([\\`$])/g, '$1').replace(/\r\n/g, '\n');
const deployedNorm = deployed.replace(/\r\n/g, '\n');

function routes(src) {
  const set = new Set();
  for (const re of [
    /path\s*===\s*['"`](\/[^'"`]*)['"`]/g,
    /path\.startsWith\(\s*['"`](\/[^'"`]*)['"`]/g,
  ]) {
    let m;
    while ((m = re.exec(src)) !== null) set.add(m[1].replace(/\/\*$/, '*'));
  }
  return [...set].sort();
}

const a = routes(deployed);
const b = routes(embedded);

console.log('worker.js routes (' + a.length + '):');
a.forEach(r => console.log('   ' + r));
console.log('\njs/worker-code.js routes (' + b.length + '):');
b.forEach(r => console.log('   ' + r));

const onlyA = a.filter(r => !b.includes(r));
const onlyB = b.filter(r => !a.includes(r));
console.log('\nonly in worker.js      : ' + (onlyA.join(', ') || '(none)'));
console.log('only in worker-code.js : ' + (onlyB.join(', ') || '(none)'));

// The routes the app actually calls have to exist in both.
const REQUIRED = ['/api/ping', '/api/search', '/api/searchPosts', '/api/trending', '/api/explore-feed',
  '/api/notifications', '/api/categories', '/api/channel/', '/api/posts/', '/api/related/', '/api/stats/'];

let ok = true;
for (const r of REQUIRED) {
  const inA = a.includes(r) || a.some(x => r.endsWith('/') && x.startsWith(r.replace('/*', '')));
  const inB = b.includes(r) || b.some(x => r.endsWith('/') && x.startsWith(r.replace('/*', '')));
  const good = inA && inB;
  if (!good) ok = false;
  console.log((good ? 'OK   ' : 'MISS ') + r + (good ? '' : `  (worker.js:${inA} worker-code.js:${inB})`));
}

console.log(ok ? '\nOK   both workers expose the routes the app needs' : '\nFAIL the workers drifted apart');

// The setup screen must hand the user the *same* worker, not a stale fork.
if (unescaped !== deployedNorm) {
  ok = false;
  let at = 0;
  while (at < unescaped.length && unescaped[at] === deployedNorm[at]) at++;
  console.log('\nFAIL js/worker-code.js differs from worker.js at char ' + at);
  console.log('     embedded: ' + JSON.stringify(unescaped.slice(at, at + 80)));
  console.log('     deployed: ' + JSON.stringify(deployedNorm.slice(at, at + 80)));
  console.log('     run: node scripts/build-worker-code.js');
} else {
  console.log('OK   js/worker-code.js is an exact copy of worker.js');
}

process.exit(ok ? 0 : 1);
