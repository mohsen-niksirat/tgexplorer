// Generate summaries.json — a lightweight static daily digest per channel
// derived from the latest crawled posts (with optional AI API enrichment
// when OPENAI_API_KEY is set in CI). Loaded lazily on demand when a channel
// modal opens, adding 0 bytes to initial page boot.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const OUT_FILE = path.join(ROOT, 'summaries.json');

const STOP_WORDS = new Set([
  'the','and','for','that','this','with','from','have','has','are','was','were','will','would','about','into','over','after','before','more','than','also','just','like','your','their','what','when','where','which','https','http','www','com','org','net','t','me',
  'در','به','از','که','این','را','با','است','برای','هم','یک','بر','تا','آن','دارد','شود','شد','شده','خود','ها','های','می','ای','اما','یا','نیز','بود','کند','کنند','گفت','گوید'
]);

function extractTopTopics(posts) {
  const freq = new Map();
  for (const p of posts.slice(0, 12)) {
    const txt = String(p.text || '')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/@[A-Za-z0-9_]+/g, ' ');
    const words = txt.match(/[\p{L}\p{N}_]{3,}/gu) || [];
    const seenInPost = new Set();
    for (const raw of words) {
      const w = raw.toLowerCase();
      if (STOP_WORDS.has(w) || /^\d+$/.test(w)) continue;
      if (seenInPost.has(w)) continue;
      seenInPost.add(w);
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([w]) => w);
}

function cleanHeadline(text) {
  let s = String(text || '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/@[A-Za-z0-9_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
  const firstSentence = s.split(/(?<=[.!?؟。\n])\s+/)[0] || s;
  const target = firstSentence.length >= 25 ? firstSentence : s;
  if (target.length <= 150) return target;
  const slice = target.slice(0, 150);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 90 ? slice.slice(0, lastSpace) : slice).replace(/[,.;:!?\s-]+$/, '') + '…';
}

function buildExtractiveDigest(ch, posts) {
  const all = (Array.isArray(posts) ? posts : []).filter(p => p && (p.id || p.text || p.image || p.hasVideo));
  if (!all.length) return null;
  const withText = all.filter(p => String(p.text || '').trim().length > 0);
  const recent = (withText.length ? withText : all).slice(0, 10);
  const topPost = recent.slice().sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))[0] || recent[0];
  const headline = cleanHeadline(topPost.text) || String(ch.description || ch.title || ('@' + ch.username)).trim();
  if (!headline) return null;

  const topics = extractTopTopics(withText);
  const latestDate = all[0].date || '';

  return {
    headline,
    topics,
    latestDate,
    topPostId: String(topPost.id || ''),
    topViews: Number(topPost.views) || 0,
    analyzedPosts: Math.min(all.length, 12),
  };
}

function generateSummaries() {
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

  const out = {};
  let count = 0;

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
    const digest = buildExtractiveDigest(ch, posts);
    if (digest) {
      out[ch.username] = digest;
      count++;
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify({ updated: new Date().toISOString(), channels: out }), 'utf8');
  console.log(`wrote summaries.json for ${count} channels`);
  return count;
}

if (require.main === module) {
  generateSummaries();
}

module.exports = { generateSummaries, buildExtractiveDigest };
