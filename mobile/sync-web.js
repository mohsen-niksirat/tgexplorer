const fs = require('fs');
const path = require('path');

// Copies the web app (root of the repo) into the Capacitor webDir.
// The whole app is static files, so a plain copy is all we need.
const root = path.join(__dirname, '..');
const dest = path.join(__dirname, 'www');

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

const files = [
  'index.html', 'channels.js', 'posts.js', 'avatars.js',
  'manifest.json', 'sw.js',
  'icon-192.png', 'icon-512.png'
];
for (const f of files) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dest, f));
}
// posts/ archive + icons/
function copyDir(name) {
  const src = path.join(root, name);
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, path.join(dest, name), { recursive: true });
}
copyDir('posts');
copyDir('icons');

// Capacitor-specific tweaks served inside the app:
// the SW is unnecessary inside the native webview and can serve stale data.
const swPath = path.join(dest, 'sw.js');
if (fs.existsSync(swPath)) fs.rmSync(swPath, { force: true });
let html = fs.readFileSync(path.join(dest, 'index.html'), 'utf8');
html = html.replace(/<link rel="manifest"[^>]*>\s*/i, '');
html = html.replace(/<script>\s*if\s*\('serviceWorker'\s*in\s*navigator[\s\S]*?<\/script>/i, '');
html = html.replace(/navigator\.serviceWorker\.register\([^)]*\)[^;]*;?/g, '');
fs.writeFileSync(path.join(dest, 'index.html'), html);

console.log('Synced web assets -> mobile/www (' + files.length + ' files + posts/ + icons/) ');
