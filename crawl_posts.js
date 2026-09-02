// ============================================================
// crawl_posts.js — fetch the latest N posts of every channel in
// channels.js from t.me/s/<username> and write posts.js
// Usage: node crawl_posts.js
// ============================================================
const fs = require('fs');
const fn = new Function(fs.readFileSync('channels.js', 'utf8') + '; return CHANNEL_DB;');
const db = fn();
const MAX_POSTS = 50;      // full per-channel archive (posts/<username>.json)
const SEED_POSTS = 12;     // inline posts.js seed (keeps index.html light)
const RETENTION_DAYS = 3;  // "live" window: posts older than N days are dropped
                           // from the archive each crawl (a kept lightweight
                           // digest preserves counters so Explore stays rich)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function esc(s){ return String(s||'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }

function parsePosts(html, username){
  const posts = [];
  const blocks = html.split('tgme_widget_message_wrap');
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    if (!b.includes('tgme_widget_message')) continue;
    const idm = b.match(/data-post="([^"]+)"/);
    if (!idm) continue;
    let image = '';
    const bg = b.match(/background-image:url\('([^']+)'\)/);
    if (bg) image = bg[1];
    else { const im = b.match(/<img[^>]+class="tgme_widget_message_photo[^>]+src="([^"]+)"/); if (im) image = im[1]; }
    if (!image) { const im2 = b.match(/<img[^>]+src="([^"]+)"[^>]*class="[^"]*tgme_widget_message_photo/); if (im2) image = im2[1]; }
    if (image && /\/img\/emoji\//i.test(image)) image = '';
    const tm = b.match(/<time datetime="([^"]+)"/);
    const txtm = b.match(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    let video='';
    const vm = b.match(/<video[^>]+src="([^"]+)"[^>]*class="[^"]*tgme_widget_message_video[^"]*"/);
    if (vm) video = vm[1];
    else { const v2 = b.match(/<video[^>]+class="[^"]*tgme_widget_message_video[^"]*"[^>]+src="([^"]+)"/); if (v2) video = v2[1]; }
    const hasVideo = !!video;
    posts.push({
      id: idm[1].split('/').pop(),
      date: tm ? tm[1] : '',
      text: txtm ? esc(txtm[1]) : '',
      image,
      video,
      hasVideo
    });
  }
  return posts;
}

async function fetchPosts(ch){
  const all = [];
  let before = '';
  try {
    for (let page = 0; page < 6 && all.length < MAX_POSTS; page++) {
      const url = 'https://t.me/s/' + encodeURIComponent(ch.username) + (before ? ('?before=' + before) : '');
      const r = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en' },
        redirect: 'follow'
      });
      if (!r.ok) break;
      const posts = parsePosts(await r.text(), ch.username);
      if (!posts.length) break;
      for (const p of posts) if (!all.some(x => x.id === p.id)) all.push(p);
      const minId = String(Math.min.apply(null, posts.map(p => Number(p.id))));
      if (before && minId === before) break;
      before = minId;
      if (posts.length < 10) break;
      await new Promise(r => setTimeout(r, 200));
    }
  } catch (e) {}
  return all.slice(0, MAX_POSTS).sort((a, b) => Number(b.id) - Number(a.id));
}

(async () => {
  console.log('Fetching posts for ' + db.length + ' channels...');
  const archive = {};   // full archive -> posts/<username>.json (lazy-loaded)
  const seed = {};      // latest 12 posts -> posts.js (inline, small)
  let withPosts = 0;
  for (let i = 0; i < db.length; i++) {
    const ch = db[i];
    const posts = await fetchPosts(ch);
    if (posts.length) {
      archive[ch.username] = posts;
      seed[ch.username] = posts.slice(0, SEED_POSTS);
      withPosts++;
    }
    process.stdout.write('\r  [' + (i + 1) + '/' + db.length + '] ' + ch.username + ' -> ' + posts.length + ' posts      ');
    await new Promise(r => setTimeout(r, 250));
  }
  if (withPosts < 10) {
    console.log('Too few channels fetched (' + withPosts + ') - keeping existing posts.js, exit 1');
    process.exit(1);
  }
  // --- Retention: keep the archive within a rolling RETENTION_DAYS window ---
  const cutoff = Date.now() - RETENTION_DAYS * 864e5;
  let dropped = 0;
  for (const [u, posts] of Object.entries(archive)) {
    const kept = posts.filter(p => {
      const t = p.date ? Date.parse(p.date) : NaN;
      return isNaN(t) || t >= cutoff; // undated posts are kept (no evidence of age)
    });
    dropped += posts.length - kept.length;
    archive[u] = kept;
    seed[u] = kept.slice(0, SEED_POSTS);
    if (!kept.length) delete archive[u];
  }
  const total = Object.values(archive).reduce((a, p) => a + p.length, 0);
  // Full archive, one JSON file per channel (loaded on demand by the app)
  fs.mkdirSync('posts', { recursive: true });
  for (const [u, posts] of Object.entries(archive)) {
    fs.writeFileSync('posts/' + u + '.json', JSON.stringify(posts));
  }
  // Remove stale archive files for channels that no longer exist
  const valid = new Set(Object.keys(archive).map(u => u.toLowerCase() + '.json'));
  for (const f of fs.readdirSync('posts')) {
    if (!valid.has(f.toLowerCase())) fs.unlinkSync('posts/' + f);
  }
  // Inline seed: latest 12 posts per channel only
  const seedTotal = Object.values(seed).reduce((a, p) => a + p.length, 0);
  const data = '// Generated by crawl_posts.js — inline seed (latest ' + SEED_POSTS + ' posts per channel)\n'
    + '// Full archive: posts/<username>.json — regenerate: node crawl_posts.js\n'
    + 'const CHANNEL_POSTS = ' + JSON.stringify(seed) + ';\n';
  fs.writeFileSync('posts.js', data);
  console.log('\n\nDone: ' + withPosts + '/' + db.length + ' channels, ' + total + ' archived posts (' + dropped + ' dropped by ' + RETENTION_DAYS + '-day retention), ' + seedTotal + ' seeded -> posts.js (' + Math.round(data.length / 1024) + ' KB)');
})();
