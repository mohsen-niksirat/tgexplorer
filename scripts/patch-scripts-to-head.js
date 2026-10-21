// Move the data scripts and the app module into the <head>.
//
// The three data files sat at the end of the body, so the browser only
// discovered them after the whole 240 KB index.html had been parsed — the
// downloads were serialised instead of running in parallel. Deferred
// scripts and module scripts always execute in document order, so moving
// them to the head keeps the order (posts.js -> channels.js -> avatars.js
// -> app module) while the downloads now overlap.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'index.html');
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

// 1) cut the data scripts out of the body
const DATA = `<script src="posts.js" defer></script>
<script src="channels.js" defer></script>
<script src="avatars.js" defer></script>
`;
if (!s.includes(DATA)) { console.error('the data scripts were not found'); process.exit(1); }
s = s.replace(DATA, '');

// 2) cut the app module out of the body
const MODULE_START = '<script type="module">';
const moduleStart = s.indexOf(MODULE_START);
if (moduleStart === -1) { console.error('the app module was not found'); process.exit(1); }
const moduleEnd = s.indexOf('</script>', moduleStart);
if (moduleEnd === -1) { console.error('the end of the app module was not found'); process.exit(1); }
const moduleBlock = s.slice(moduleStart, moduleEnd + '</script>'.length);
s = s.slice(0, moduleStart) + s.slice(moduleEnd + '</script>'.length);

// 3) put them into the head, before the closing </head>
const HEAD_END = '</head>';
const headEnd = s.indexOf(HEAD_END);
if (headEnd === -1) { console.error('</head> was not found'); process.exit(1); }
const block = DATA + moduleBlock + '\n';
s = s.slice(0, headEnd) + block + s.slice(headEnd);

fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
console.log('moved the data scripts and the app module into the head');
const head = s.slice(0, s.indexOf('</head>'));
console.log('posts.js in head: ' + head.includes('src="posts.js"'));
console.log('app module in head: ' + head.includes('<script type="module">'));
console.log('script order: ' + (head.match(/<script[^>]*src="(posts|channels|avatars)\.js"|<script type="module">/g) || []).join(' | '));
