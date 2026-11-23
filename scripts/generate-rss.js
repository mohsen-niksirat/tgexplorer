// Generate static RSS 2.0 feeds (rss/<username>.xml) for every channel in
// channels.js from posts/<username>.json (falling back to posts.js).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RSS_DIR = path.join(ROOT, 'rss');
const POSTS_DIR = path.join(ROOT, 'posts');
const SITE_URL = 'https://mohsen-niksirat.github.io/tgexplorer/';

function escXml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildChannelRssXml(ch, posts) {
  const uname = ch.username;
  const title = ch.title || '@' + uname;
  const desc = ch.description || title;
  const chanLink = `${SITE_URL}?channel=${encodeURIComponent(uname)}`;
  const feedLink = `${SITE_URL}rss/${encodeURIComponent(uname)}.xml`;
  const items = (Array.isArray(posts) ? posts : []).slice(0, 20).map(p => {
    const id = String(p.id || '');
    const link = id ? `https://t.me/${encodeURIComponent(uname)}/${encodeURIComponent(id)}` : `https://t.me/${encodeURIComponent(uname)}`;
    const rawText = String(p.text || '').replace(/\s+/g, ' ').trim();
    const itemTitle = rawText ? (rawText.length > 80 ? rawText.slice(0, 80) + '…' : rawText) : `${title} #${id || 'post'}`;
    const pubDate = p.date && !isNaN(Date.parse(p.date)) ? new Date(p.date).toUTCString() : new Date().toUTCString();
    const mediaTag = p.image ? `<enclosure url="${escXml(p.image)}" type="image/jpeg" length="0"/>` : '';
    return `    <item>
      <title>${escXml(itemTitle)}</title>
      <link>${escXml(link)}</link>
      <guid isPermaLink="true">${escXml(link)}</guid>
      <pubDate>${escXml(pubDate)}</pubDate>
      <description>${escXml(p.text || '')}</description>${mediaTag ? '\n      ' + mediaTag : ''}
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escXml(title)} (@${escXml(uname)}) — Telegram Explorer</title>
    <link>${escXml(chanLink)}</link>
    <atom:link href="${escXml(feedLink)}" rel="self" type="application/rss+xml"/>
    <description>${escXml(desc)}</description>
    <language>${escXml(ch.lang || 'en')}</language>
${items}
  </channel>
</rss>
`;
}

function generateAllRss() {
  const chSrc = fs.readFileSync(path.join(ROOT, 'channels.js'), 'utf8');
  const channels = new Function(chSrc + '; return CHANNEL_DB;')();
  let seedMap = {};
  const postsJsPath = path.join(ROOT, 'posts.js');
  if (fs.existsSync(postsJsPath)) {
    try {
      const pSrc = fs.readFileSync(postsJsPath, 'utf8');
      seedMap = new Function(pSrc + '; return CHANNEL_POSTS;')() || {};
    } catch (e) {}
  }

  fs.mkdirSync(RSS_DIR, { recursive: true });
  let count = 0;
  const validFiles = new Set();

  for (const ch of channels) {
    if (!ch || !ch.username) continue;
    let posts = [];
    const archivePath = path.join(POSTS_DIR, ch.username + '.json');
    if (fs.existsSync(archivePath)) {
      try {
        posts = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
      } catch (e) {}
    }
    if (!Array.isArray(posts) || !posts.length) {
      posts = seedMap[ch.username] || [];
    }
    const xml = buildChannelRssXml(ch, posts);
    const fname = ch.username + '.xml';
    validFiles.add(fname.toLowerCase());
    fs.writeFileSync(path.join(RSS_DIR, fname), xml, 'utf8');
    count++;
  }

  for (const f of fs.readdirSync(RSS_DIR)) {
    if (f.endsWith('.xml') && !validFiles.has(f.toLowerCase())) {
      fs.unlinkSync(path.join(RSS_DIR, f));
    }
  }
  console.log(`wrote ${count} RSS feeds to rss/`);
  return count;
}

if (require.main === module) {
  generateAllRss();
}

module.exports = { buildChannelRssXml, generateAllRss };
