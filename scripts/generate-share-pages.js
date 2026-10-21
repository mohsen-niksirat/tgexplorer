// Generate a static share page per channel.
//
//   node scripts/generate-share-pages.js
//
// Every page is a small HTML file with the Open Graph / Twitter card tags
// for that channel, so a link to it renders a rich preview in Telegram,
// Twitter/X, WhatsApp and Slack. Crawlers do not run JavaScript, so the tags
// have to be in the served HTML - that is why there is one file per channel
// instead of one page that fills the tags in the browser.
//
// The pages are written to share/<username>.html.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'share');

const channels = new Function(
  fs.readFileSync(path.join(ROOT, 'channels.js'), 'utf8') + '; return CHANNEL_DB;')();

let avatars = {};
try {
  avatars = new Function(
    fs.readFileSync(path.join(ROOT, 'avatars.js'), 'utf8') + '; return CHANNEL_AVATARS;')();
} catch (e) { /* the avatars are optional */ }

// The public address of the app. Overridable with SITE_URL, so the pages
// work for a fork that is hosted somewhere else.
const SITE = (process.env.SITE_URL || 'https://mohsen-niksirat.github.io/tgexplorer').replace(/\/+$/, '');

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const page = ch => {
  const title = ch.title || ch.username;
  const description = (ch.description || title + ' — a public Telegram channel on Telegram Explorer.').slice(0, 200);
  const image = avatars[ch.username] || '';
  const url = SITE + '/share/' + ch.username + '.html';
  const appUrl = SITE + '/?channel=' + encodeURIComponent(ch.username);
  const members = ch.members ? '👥 ' + ch.members + ' members' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Telegram Explorer</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Telegram Explorer">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
${image ? `<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">` : '<meta name="twitter:card" content="summary">'}
<meta name="theme-color" content="#0088cc">
<link rel="icon" href="${SITE}/icons/favicon.ico" sizes="48x48">
<link rel="apple-touch-icon" href="${SITE}/icons/apple-touch-icon.png">
<style>
:root{--bg:#fff;--fg:#1a1a1a;--muted:#6b6b6b;--border:#e5e5e5;--accent:#0088cc}
@media (prefers-color-scheme:dark){:root{--bg:#0a0a0a;--fg:#f0f0f0;--muted:#999;--border:#2a2a2a;--accent:#39bfff}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;padding:24px}
.card{width:100%;max-width:520px;border:1px solid var(--border);border-radius:20px;padding:28px;text-align:center;background:var(--bg)}
.avatar{width:96px;height:96px;border-radius:50%;margin:0 auto 18px;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff;font-size:40px;font-weight:700;overflow:hidden}
.avatar img{width:100%;height:100%;object-fit:cover}
h1{margin:0 0 6px;font-size:24px;line-height:1.3}
.user{color:var(--muted);font-size:14px;margin-bottom:14px}
.desc{color:var(--muted);font-size:14px;line-height:1.7;margin:0 0 18px}
.tags{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:20px}
.tag{border:1px solid var(--border);border-radius:14px;padding:3px 10px;font-size:11.5px;color:var(--muted)}
.cta{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;text-decoration:none;font-weight:700;padding:12px 26px;border-radius:24px;font-size:14px}
.brand{margin-top:22px;font-size:12px;color:var(--muted)}
.brand a{color:var(--accent);text-decoration:none}
</style>
</head>
<body>
<main class="card">
  <div class="avatar">${image ? `<img src="${esc(image)}" alt="">` : esc((title || '?')[0].toUpperCase())}</div>
  <h1>${esc(title)}</h1>
  <div class="user">@${esc(ch.username)}${members ? ' · ' + esc(members) : ''}</div>
  <p class="desc">${esc(description)}</p>
  <div class="tags">${(ch.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}${ch.lang ? `<span class="tag">${ch.lang === 'fa' ? '🇮🇷 فارسی' : '🇬🇧 English'}</span>` : ''}</div>
  <a class="cta" href="${esc(appUrl)}">🔍 Open in Telegram Explorer</a>
  <div class="brand">Browse <a href="${esc(SITE)}">all ${channels.length} verified channels</a> · no tracking, works without a proxy</div>
</main>
</body>
</html>
`;
};

fs.mkdirSync(OUT, { recursive: true });
let written = 0;
for (const ch of channels) {
  fs.writeFileSync(path.join(OUT, ch.username + '.html'), page(ch), 'utf8');
  written++;
}
console.log('wrote ' + written + ' share pages to share/');
console.log('site url: ' + SITE);
