// Compare the channels in the worker's curated list with the database —
// the curated list is a source of candidates for the channel database.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const db = new Function(fs.readFileSync(path.join(ROOT, 'channels.js'), 'utf8') + '; return CHANNEL_DB;')();

const embedded = fs.readFileSync(path.join(ROOT, 'js', 'worker-code.js'), 'utf8');
const from = embedded.indexOf('WORKER_CODE=`') + 'WORKER_CODE=`'.length;
const worker = embedded.slice(from, embedded.lastIndexOf('`;'));

// Every {username:'x',...} in the curated list.
const curated = [...worker.matchAll(/username:'([A-Za-z0-9_]{4,})'/g)].map(m => m[1]);
const unique = [...new Set(curated)];

const known = new Set(db.map(c => c.username.toLowerCase()));
const missing = unique.filter(u => !known.has(u.toLowerCase()));

console.log('database: ' + db.length + ' channels');
console.log('worker curated: ' + unique.length + ' unique usernames');
console.log('not in the database yet: ' + missing.length);
console.log(missing.join(', '));
