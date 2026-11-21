// Add the compressed monthly archive to crawl_posts.js.
//
// The post archive itself only keeps a rolling three-day window, so the
// statistics would be lost. The monthly archive keeps the number of posts
// per channel per day for the whole month — small enough to compress, and
// enough for the long-term activity chart.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'crawl_posts.js');
let s = fs.readFileSync(p, 'utf8');

if (s.includes('ARCHIVE_DIR')) { console.log('crawl_posts.js already writes the archive'); process.exit(0); }

// The archive is written right before the seed is written.
const ANCHOR = "  // Inline seed: latest 12 posts per channel only";
if (!s.includes(ANCHOR)) { console.error('the seed block was not found'); process.exit(1); }

const BLOCK = `  // --- Monthly archive: the post count per channel per day ------------
  // Small enough to keep the whole history of the statistics without the
  // repository growing: one gzipped file per month.
  const ARCHIVE_DIR = path.join(__dirname, 'archive');
  const monthKey = new Date().toISOString().slice(0, 7);
  const archiveFile = path.join(ARCHIVE_DIR, monthKey + '.json.gz');

  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  let monthArchive = { month: monthKey, updated: new Date().toISOString(), channels: {} };
  if (fs.existsSync(archiveFile)) {
    try {
      const raw = zlib.gunzipSync(fs.readFileSync(archiveFile)).toString('utf8');
      const old = JSON.parse(raw);
      if (old && old.channels) monthArchive.channels = old.channels;
    } catch (e) { /* a broken archive is simply rebuilt */ }
  }

  // Count the posts of this run per day and merge them into the month.
  const dayCounts = new Map();
  for (const [u, posts] of Object.entries(archive)) {
    for (const p of posts) {
      if (!p.date) continue;
      const day = String(p.date).slice(0, 10);
      if (!day.startsWith(monthKey)) continue;
      if (!dayCounts.has(u)) dayCounts.set(u, {});
      dayCounts.get(u)[day] = (dayCounts.get(u)[day] || 0) + 1;
    }
  }
  for (const [u, days] of dayCounts) {
    if (!monthArchive.channels[u]) monthArchive.channels[u] = {};
    for (const [day, n] of Object.entries(days)) {
      monthArchive.channels[u][day] = (monthArchive.channels[u][day] || 0) + n;
    }
  }
  monthArchive.updated = new Date().toISOString();
  fs.writeFileSync(archiveFile, zlib.gzipSync(Buffer.from(JSON.stringify(monthArchive), 'utf8')));

  // An index of the months that exist, so the app can find them.
  const months = fs.readdirSync(ARCHIVE_DIR)
    .filter(f => /^\\d{4}-\\d{2}\\.json\\.gz$/.test(f))
    .map(f => f.replace('.json.gz', ''))
    .sort();
  fs.writeFileSync(path.join(ARCHIVE_DIR, 'index.json'),
    JSON.stringify({ months, updated: new Date().toISOString() }, null, 2) + '\\n', 'utf8');

  const archiveSize = fs.statSync(archiveFile).size;
  console.log('\\nMonthly archive: archive/' + monthKey + '.json.gz (' + Math.round(archiveSize / 1024) + ' KB, ' + months.length + ' month(s))');

`;

s = s.replace(ANCHOR, BLOCK + ANCHOR);

// zlib and path are needed.
if (!/^const zlib = require\('zlib'\);/m.test(s)) {
  s = s.replace("const fs = require('fs');", "const fs = require('fs');\nconst path = require('path');\nconst zlib = require('zlib');");
}

fs.writeFileSync(p, s, 'utf8');
console.log('patched crawl_posts.js');
console.log('has ARCHIVE_DIR:', s.includes('ARCHIVE_DIR'));
console.log('has zlib:', s.includes("require('zlib')"));
