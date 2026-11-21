// Add a /api/version endpoint to both worker copies.
//
// The Worker already answers /api/ping, but it does not say which version
// it is. A version endpoint makes it possible to debug a deployment ("is my
// Worker up to date?") from the browser.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VERSION = '3.3';

function patch(file, routerAnchor, handlerAnchor) {
  const p = path.join(ROOT, file);
  const raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n');

  if (s.includes('/api/version')) {
    console.log(file + ': already has /api/version');
    return;
  }
  if (!s.includes(routerAnchor)) { console.error(file + ': the router anchor was not found'); process.exit(1); }

  s = s.replace(routerAnchor, routerAnchor + handlerAnchor);

  fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
  console.log('patched ' + file);
}

// --- the readable worker.js -------------------------------------------------
patch(
  'worker.js',
  "      if (path === '/api/ping') return j({ ok: true, ts: Date.now(), version: '3.2', hasApi: !!(env && env.TG_API_HASH) });",
  "\n      if (path === '/api/version') return j({ version: '" + VERSION + "', name: 'tgexplorer-worker', endpoints: ['/api/ping', '/api/search', '/api/searchPosts', '/api/trending', '/api/explore-feed', '/api/channel', '/api/posts', '/api/related', '/api/stats', '/api/categories', '/api/notifications', '/api/version'], builtAt: BUILD_TIME });",
);

// --- the compact copy in the setup screen ----------------------------------
patch(
  'js/worker-code.js',
  "if(path==='/api/ping')",
  "if(path==='/api/version')return j({version:'" + VERSION + "',name:'tgexplorer-worker',endpoints:['/api/ping','/api/search','/api/searchPosts','/api/trending','/api/explore-feed','/api/channel','/api/posts','/api/related','/api/stats','/api/categories','/api/notifications','/api/version'],builtAt:BUILD_TIME});\n",
);

// --- a build timestamp in both ---------------------------------------------
const stamp = "const BUILD_TIME='" + new Date().toISOString().slice(0, 10) + "';";
for (const file of ['worker.js', 'js/worker-code.js']) {
  const p = path.join(ROOT, file);
  const raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n');
  if (s.includes('const BUILD_TIME=')) continue;
  // Put it right after the CORS headers, which both copies start with.
  const anchor = "const CORS_HEADERS";
  const i = s.indexOf(anchor);
  if (i === -1) { console.error(file + ': the CORS_HEADERS anchor was not found'); process.exit(1); }
  const lineEnd = s.indexOf('\n', i);
  s = s.slice(0, lineEnd + 1) + stamp + '\n' + s.slice(lineEnd + 1);
  fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
  console.log('added BUILD_TIME to ' + file);
}

console.log('done');
