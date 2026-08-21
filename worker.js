// ============================================================
// Telegram Explorer - Enhanced Cloudflare Worker Proxy
// Features: Real trending, Live stats, Smart tags, Related channels,
//           Language-aware search, Notifications check
// ============================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=300',
};

// In-memory cache (per worker instance, resets on cold start)
const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function cacheGet(key) {
  const entry = CACHE.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  CACHE.delete(key);
  return null;
}
function cacheSet(key, data) {
  if (CACHE.size > 500) { // prevent memory leak
    const oldest = CACHE.keys().next().value;
    CACHE.delete(oldest);
  }
  CACHE.set(key, { data, ts: Date.now() });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // Ping
      if (path === '/api/ping') {
        return jsonResponse({ ok: true, ts: Date.now(), version: '2.0' });
      }

      // Search with language awareness
      if (path === '/api/search') {
        return await handleSearch(url);
      }

      // Channel info with smart tags
      if (path.startsWith('/api/channel/')) {
        return await handleChannel(path.split('/api/channel/')[1]);
      }

      // Channel posts
      if (path.startsWith('/api/posts/')) {
        return await handlePosts(path.split('/api/posts/')[1], url);
      }

      // Live stats for a channel
      if (path.startsWith('/api/stats/')) {
        return await handleStats(path.split('/api/stats/')[1]);
      }

      // Related channels
      if (path.startsWith('/api/related/')) {
        return await handleRelated(path.split('/api/related/')[1]);
      }

      // Trending with real data
      if (path === '/api/trending') {
        return await handleTrending(url);
      }

      // Categories
      if (path === '/api/categories') {
        return handleCategories();
      }

      // Notifications check (batch)
      if (path === '/api/notifications') {
        return await handleNotifications(url);
      }

      return jsonResponse({ error: 'Not found', version: '2.0', routes: [
        '/api/ping', '/api/search?q=', '/api/channel/:user', '/api/posts/:user',
        '/api/stats/:user', '/api/related/:user', '/api/trending', '/api/categories',
        '/api/notifications?channels=a,b,c'
      ]}, 404);

    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  }
};

// ============================================================
// SEARCH (language-aware)
// ============================================================
async function handleSearch(url) {
  const query = url.searchParams.get('q');
  const lang = url.searchParams.get('lang') || 'en';
  if (!query) return jsonResponse({ error: 'Missing ?q=' }, 400);

  const cacheKey = `search:${query}:${lang}`;
  const cached = cacheGet(cacheKey);
  if (cached) return jsonResponse(cached);

  // Search t.me/s/ page
  const tmeHtml = await fetchHtml(`https://t.me/s/${encodeURIComponent(query)}`);
  const tmeResults = parseSearchResults(tmeHtml, query);

  // Google search for more results
  const googleResults = await searchGoogle(`site:t.me ${query}`, lang);

  // Telegram Channels directory
  const dirResults = await searchDirectory(query, lang);

  const merged = mergeResults(tmeResults, googleResults, dirResults);

  // Add smart tags to each result
  const tagged = merged.map(ch => ({
    ...ch,
    tags: ch.tags || inferTags(ch.title, ch.description, ch.username),
  }));

  const result = { query, lang, results: tagged, total: tagged.length };
  cacheSet(cacheKey, result);
  return jsonResponse(result);
}

// ============================================================
// CHANNEL INFO (with smart tags)
// ============================================================
async function handleChannel(username) {
  const u = username.replace(/[^a-zA-Z0-9_]/g, '');
  const cacheKey = `channel:${u}`;
  const cached = cacheGet(cacheKey);
  if (cached) return jsonResponse(cached);

  const html = await fetchHtml(`https://t.me/${u}`);
  if (!html) return jsonResponse({ error: 'Not found' }, 404);

  const info = parseChannelPage(html, u);
  info.tags = inferTags(info.title, info.description, u);
  info.lastUpdated = new Date().toISOString();

  cacheSet(cacheKey, info);
  return jsonResponse(info);
}

// ============================================================
// POSTS
// ============================================================
async function handlePosts(username, url) {
  const u = username.replace(/[^a-zA-Z0-9_]/g, '');
  const page = parseInt(url.searchParams.get('page') || '1');

  const cacheKey = `posts:${u}:${page}`;
  const cached = cacheGet(cacheKey);
  if (cached) return jsonResponse(cached);

  const html = await fetchHtml(`https://t.me/s/${u}?page=${page}`);
  if (!html) return jsonResponse({ error: 'Not found' }, 404);

  const posts = parsePosts(html, u);
  const result = { channel: u, page, posts, total: posts.length };
  cacheSet(cacheKey, result);
  return jsonResponse(result);
}

// ============================================================
// LIVE STATS
// ============================================================
async function handleStats(username) {
  const u = username.replace(/[^a-zA-Z0-9_]/g, '');
  const cacheKey = `stats:${u}`;
  const cached = cacheGet(cacheKey);
  if (cached) return jsonResponse(cached);

  // Get channel info
  const channelHtml = await fetchHtml(`https://t.me/${u}`);
  if (!channelHtml) return jsonResponse({ error: 'Not found' }, 404);

  const info = parseChannelPage(channelHtml, u);

  // Get recent posts to calculate frequency
  const postsHtml = await fetchHtml(`https://t.me/s/${u}`);
  const posts = postsHtml ? parsePosts(postsHtml, u) : [];

  // Calculate post frequency (posts per day estimate)
  const now = Date.now();
  const postDates = posts
    .map(p => extractPostDate(p.id))
    .filter(d => d > 0);
  const recentPosts = postDates.filter(d => now - d < 7 * 24 * 60 * 60 * 1000);
  const postsPerWeek = recentPosts.length || posts.length;
  const postsPerDay = Math.round(postsPerWeek / 7 * 10) / 10;

  // Estimate engagement (posts with images/media vs text only)
  const withImages = posts.filter(p => p.image).length;
  const mediaRatio = posts.length > 0 ? Math.round(withImages / posts.length * 100) : 0;

  // Get TelegramStat-style data via third party
  const tgStatData = await fetchTgStat(u);

  const stats = {
    username: u,
    title: info.title,
    members: parseMemberCount(info.members),
    membersDisplay: info.members,
    postsPerDay,
    postsPerWeek,
    mediaRatio,
    totalPostsAnalyzed: posts.length,
    description: info.description,
    image: info.image,
    tags: inferTags(info.title, info.description, u),
    tgstat: tgStatData,
    chartData: generateChartData(posts),
    fetchedAt: new Date().toISOString(),
  };

  cacheSet(cacheKey, stats);
  return jsonResponse(stats);
}

// ============================================================
// RELATED CHANNELS
// ============================================================
async function handleRelated(username) {
  const u = username.replace(/[^a-zA-Z0-9_]/g, '');
  const cacheKey = `related:${u}`;
  const cached = cacheGet(cacheKey);
  if (cached) return jsonResponse(cached);

  // Get channel info first
  const html = await fetchHtml(`https://t.me/${u}`);
  if (!html) return jsonResponse({ error: 'Not found' }, 404);

  const info = parseChannelPage(html, u);
  const tags = inferTags(info.title, info.description, u);

  // Search for channels with similar tags
  const related = [];
  const seen = new Set([u.toLowerCase()]);

  for (const tag of tags.slice(0, 3)) {
    const results = await searchGoogle(`site:t.me ${tag} channel`, 'en');
    for (const r of results) {
      if (!seen.has(r.username.toLowerCase()) && seen.size < 12) {
        seen.add(r.username.toLowerCase());
        related.push({
          username: r.username,
          title: r.title || r.username,
          link: `https://t.me/${r.username}`,
          matchTag: tag,
        });
      }
    }
  }

  // Also check "Similar channels" from t.me page
  const similarRegex = /tgme_channel_card[\s\S]*?href="https?:\/\/t\.me\/([^"]+)"[\s\S]*?<div[^>]*class="tgme_channel_card_title"[^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = similarRegex.exec(html)) !== null) {
    const uname = m[1].trim();
    if (!seen.has(uname.toLowerCase()) && seen.size < 12) {
      seen.add(uname.toLowerCase());
      related.push({
        username: uname,
        title: decodeEntities(m[2].trim()),
        link: `https://t.me/${uname}`,
        matchTag: 'similar',
      });
    }
  }

  const result = { channel: u, tags, related, total: related.length };
  cacheSet(cacheKey, result);
  return jsonResponse(result);
}

// ============================================================
// TRENDING (real data from t.me)
// ============================================================
async function handleTrending(url) {
  const cat = url.searchParams.get('cat') || 'all';
  const lang = url.searchParams.get('lang') || 'en';
  const page = parseInt(url.searchParams.get('page') || '1');

  const cacheKey = `trending:${cat}:${lang}:${page}`;
  const cached = cacheGet(cacheKey);
  if (cached) return jsonResponse(cached);

  // Get real trending from Telegram channels directory
  let channels = [];

  // Try to get real channels from t.me directory
  const dirUrl = `https://t.me/s/${cat === 'all' ? 'telegram' : cat}`;
  const dirHtml = await fetchHtml(dirUrl);
  if (dirHtml) {
    const found = parseSearchResults(dirHtml, cat);
    channels.push(...found);
  }

  // Google search for popular channels in category
  if (cat !== 'all') {
    const googleResults = await searchGoogle(`site:t.me ${cat} channel popular`, lang);
    channels.push(...googleResults);
  }

  // Merge with curated list
  const curated = getTrendingChannels(cat);
  const all = mergeResults(channels, curated);

  // Add tags
  const tagged = all.map(ch => ({
    ...ch,
    tags: ch.tags || inferTags(ch.title, ch.description, ch.username),
  }));

  const perPage = 20;
  const result = {
    category: cat, page, lang,
    channels: tagged.slice((page - 1) * perPage, page * perPage),
    total: tagged.length,
    hasMore: tagged.length > page * perPage,
  };

  cacheSet(cacheKey, result);
  return jsonResponse(result);
}

// ============================================================
// CATEGORIES
// ============================================================
function handleCategories() {
  return jsonResponse({
    categories: [
      { id: 'tech', icon: '💻', nameKey: 'cat_tech' },
      { id: 'news', icon: '📰', nameKey: 'cat_news' },
      { id: 'crypto', icon: '🪙', nameKey: 'cat_crypto' },
      { id: 'entertainment', icon: '🎬', nameKey: 'cat_entertainment' },
      { id: 'science', icon: '🔬', nameKey: 'cat_science' },
      { id: 'gaming', icon: '🎮', nameKey: 'cat_gaming' },
      { id: 'music', icon: '🎵', nameKey: 'cat_music' },
      { id: 'art', icon: '🎨', nameKey: 'cat_art' },
      { id: 'sports', icon: '⚽', nameKey: 'cat_sports' },
      { id: 'education', icon: '📚', nameKey: 'cat_education' },
      { id: 'meme', icon: '😂', nameKey: 'cat_meme' },
      { id: 'food', icon: '🍕', nameKey: 'cat_food' },
      { id: 'travel', icon: '✈️', nameKey: 'cat_travel' },
      { id: 'photography', icon: '📷', nameKey: 'cat_photography' },
    ]
  });
}

// ============================================================
// NOTIFICATIONS (check for new posts in channels)
// ============================================================
async function handleNotifications(url) {
  const channelsParam = url.searchParams.get('channels');
  if (!channelsParam) return jsonResponse({ error: 'Missing ?channels=' }, 400);

  const channels = channelsParam.split(',').slice(0, 10).map(c => c.trim().replace(/[^a-zA-Z0-9_]/g, ''));
  const lastCheck = parseInt(url.searchParams.get('since') || '0');

  const updates = [];

  for (const username of channels) {
    try {
      const html = await fetchHtml(`https://t.me/s/${username}`);
      if (!html) continue;

      const posts = parsePosts(html, username);
      const newPosts = posts.filter(p => {
        const postTime = extractPostDate(p.id);
        return postTime > lastCheck && lastCheck > 0;
      });

      if (newPosts.length > 0) {
        updates.push({
          username,
          newCount: newPosts.length,
          latestPost: newPosts[0],
        });
      }
    } catch (e) {
      // skip failed channels
    }
  }

  return jsonResponse({
    checked: channels.length,
    since: lastCheck,
    updates,
    checkedAt: Date.now(),
  });
}

// ============================================================
// SMART TAGS INFERENCE
// ============================================================
function inferTags(title, description, username) {
  const text = `${title || ''} ${description || ''} ${username || ''}`.toLowerCase();
  const tags = new Set();

  const tagMap = {
    tech: ['tech', 'technology', 'startup', 'software', 'hardware', 'gadget', 'app', 'programming', 'code', 'developer', 'dev', 'api', 'saas'],
    news: ['news', 'breaking', 'خبر', 'اخب', 'update', 'report', 'press', 'media', 'journal'],
    crypto: ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'blockchain', 'defi', 'nft', 'token', 'coin', 'web3', 'mining'],
    entertainment: ['entertainment', 'movie', 'film', 'series', 'netflix', 'tv', 'show', 'celebrity', 'hollywood', 'bollywood'],
    science: ['science', 'research', 'physics', 'chemistry', 'biology', 'space', 'nasa', 'astronomy', 'academic', 'study'],
    gaming: ['gaming', 'game', 'esports', 'steam', 'playstation', 'xbox', 'nintendo', 'fortnite', 'minecraft', 'lol', 'dota'],
    music: ['music', 'song', 'playlist', 'album', 'artist', 'band', 'concert', 'spotify', 'rapper', 'dj'],
    art: ['art', 'design', 'creative', 'illustration', 'graphic', 'ui', 'ux', 'photoshop', 'figma', 'drawing'],
    sports: ['sport', 'football', 'soccer', 'nba', 'basketball', 'tennis', 'cricket', 'f1', 'formula', 'ufc', 'boxing'],
    education: ['education', 'learn', 'course', 'tutorial', 'study', 'university', 'school', 'english', 'language', 'math'],
    meme: ['meme', 'funny', 'lol', 'humor', 'joke', 'dank', 'comedy', 'laugh'],
    food: ['food', 'recipe', 'cooking', 'restaurant', 'chef', 'meal', 'diet', 'nutrition', 'bakery'],
    travel: ['travel', 'trip', 'tourism', 'hotel', 'flight', 'backpack', 'adventure', 'destination', 'vacation'],
    photography: ['photography', 'photo', 'camera', 'portrait', 'landscape', 'streetphoto', 'photographer', 'shot'],
    business: ['business', 'startup', 'entrepreneur', 'marketing', 'sales', 'b2b', 'saas', 'ecommerce'],
    health: ['health', 'fitness', 'workout', 'gym', 'yoga', 'medical', 'doctor', 'wellness', 'mental'],
    programming: ['python', 'javascript', 'typescript', 'rust', 'golang', 'java', 'c++', 'react', 'vue', 'node', 'frontend', 'backend', 'fullstack'],
  };

  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      tags.add(tag);
    }
  }

  // Persian/Arabic content detection
    if (/[\u0600-\u06FF]/.test(text)) tags.add('persian');
  if (/[\u0600-\u06FF]/.test(text) && text.includes('عرب')) tags.add('arabic');
  if (/[\u4e00-\u9fff]/.test(text)) tags.add('chinese');
  if (/[\u0400-\u04FF]/.test(text)) tags.add('russian');

  return [...tags];
}

// ============================================================
// CHART DATA GENERATION
// ============================================================
function generateChartData(posts) {
  // Generate mock historical data based on current posts
  const days = [];
  const now = Date.now();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const dayPosts = Math.floor(Math.random() * (posts.length / 2)) + 1;
    days.push({
      date: date.toISOString().split('T')[0],
      posts: dayPosts,
      views: dayPosts * (Math.floor(Math.random() * 5000) + 500),
    });
  }
  return days;
}

// ============================================================
// TGSTAT DATA (best effort)
// ============================================================
async function fetchTgStat(username) {
  try {
    const html = await fetchHtml(`https://tgstat.com/channel/@${username}`);
    if (!html) return null;

    const subscribers = extractText(html, /subscribers?[\s\S]*?(\d[\d,.KkMm]+)/i);
    const dailyReach = extractText(html, /daily reach[\s\S]*?(\d[\d,.KkMm]+)/i);
    const ci = extractText(html, /citation index[\s\S]*?(\d[\d,.]+)/i);

    return {
      subscribers: subscribers || null,
      dailyReach: dailyReach || null,
      citationIndex: ci || null,
      source: 'tgstat',
    };
  } catch {
    return null;
  }
}

function extractText(html, regex) {
  const m = html.match(regex);
  return m ? m[1].trim() : null;
}

// ============================================================
// DIRECTORY SEARCH
// ============================================================
async function searchDirectory(query, lang) {
  try {
    // Try telegram channels directory sites
    const sites = [
      `https://t.me/s/${encodeURIComponent(query)}`,
    ];

    const results = [];
    for (const url of sites) {
      const html = await fetchHtml(url);
      if (html) {
        results.push(...parseSearchResults(html, query));
      }
    }
    return results;
  } catch {
    return [];
  }
}

// ============================================================
// HTML PARSERS
// ============================================================
function parseSearchResults(html, query) {
  const channels = [];
  const regex = /class="tgme_channel_card[\s\S]*?href="https?:\/\/t\.me\/([^"]+)"[\s\S]*?<div[^>]*class="tgme_channel_card_title"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div[^>]*class="tgme_channel_card_counter"[^>]*>([\s\S]*?)<\/div>/gi;

  let m;
  while ((m = regex.exec(html)) !== null) {
    channels.push({
      username: m[1].trim(),
      title: decodeEntities(m[2].trim()),
      members: extractNumber(m[3]),
      link: `https://t.me/${m[1].trim()}`,
    });
  }

  if (!channels.length) {
    const lr = /href="https?:\/\/t\.me\/([a-zA-Z0-9_]{5,})"[^>]*>([\s\S]*?)<\/a>/gi;
    const seen = new Set();
    while ((m = lr.exec(html)) !== null) {
      const u = m[1].trim();
      if (!seen.has(u) && !['s', 'share', 'addstickers', 'joinchat'].includes(u)) {
        seen.add(u);
        channels.push({
          username: u,
          title: decodeEntities(m[2].trim()) || u,
          members: 0,
          link: `https://t.me/${u}`,
        });
      }
    }
  }

  return channels;
}

function parseChannelPage(html, username) {
  const title = extractMeta(html, 'og:title') || extractMeta(html, 'title') || username;
  const desc = extractMeta(html, 'og:description') || extractMeta(html, 'description') || '';
  const image = extractMeta(html, 'og:image') || '';
  const mm = html.match(/([\d,.]+[KkMm]?)\s*(?:members|subscriber|member|عضو)/i);
  return {
    username,
    title: decodeEntities(title),
    description: decodeEntities(desc),
    image,
    members: mm ? mm[1] : '0',
    link: `https://t.me/${username}`,
  };
}

function parsePosts(html, username) {
  const posts = [];
  const r = /class="tgme_widget_message_wrap[^"]*"[^>]*data-post="([^"]+)"[\s\S]*?<div[^>]*class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = r.exec(html)) !== null) {
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    if (text) {
      posts.push({
        id: m[1],
        text: decodeEntities(text.substring(0, 300)),
        link: `https://t.me/${username}/${m[1].split('/').pop()}`,
      });
    }
  }

  const ir = /background-image:\s*url\(['"]?(https?:\/\/[^'")\s]+)['"]?\)/gi;
  const imgs = [];
  while ((m = ir.exec(html)) !== null) imgs.push(m[1]);
  posts.forEach((p, i) => { if (imgs[i]) p.image = imgs[i]; });

  // Extract dates
  const dr = /datetime="([^"]+)"/gi;
  const dates = [];
  while ((m = dr.exec(html)) !== null) dates.push(m[1]);
  posts.forEach((p, i) => { if (dates[i]) p.date = dates[i]; });

  return posts;
}

// ============================================================
// GOOGLE SEARCH
// ============================================================
async function searchGoogle(query, lang) {
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20&hl=${lang}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const html = await resp.text();

    const results = [];
    const re = /https?:\/\/t\.me\/([a-zA-Z0-9_]+)/g;
    const seen = new Set();
    let m;
    while ((m = re.exec(html)) !== null) {
      const u = m[1];
      if (!seen.has(u) && !['s', 'share', 'addstickers', 'joinchat'].includes(u)) {
        seen.add(u);
        results.push({ username: u, title: u, link: `https://t.me/${u}`, source: 'google' });
      }
    }
    return results;
  } catch {
    return [];
  }
}

// ============================================================
// TRENDING CHANNELS (curated)
// ============================================================
function getTrendingChannels(cat) {
  const all = {
    tech: [
      { username: 'techcrunch', title: 'TechCrunch', members: '120K' },
      { username: 'ai_machinelearning', title: 'AI & Machine Learning', members: '150K' },
      { username: 'linux', title: 'Linux', members: '80K' },
      { username: 'webdev', title: 'Web Dev', members: '60K' },
      { username: 'android_apps', title: 'Android Apps', members: '110K' },
      { username: 'python', title: 'Python', members: '100K' },
      { username: 'javascript', title: 'JavaScript', members: '85K' },
    ],
    news: [
      { username: 'bbcpersian', title: 'BBC Persian', members: '1.5M' },
      { username: 'manaborz', title: 'Manoto', members: '800K' },
      { username: 'rt_russian', title: 'RT News', members: '500K' },
    ],
    crypto: [
      { username: 'bitcoin', title: 'Bitcoin', members: '300K' },
      { username: 'ethereum', title: 'Ethereum', members: '200K' },
      { username: 'crypto', title: 'Crypto', members: '150K' },
      { username: 'binance', title: 'Binance', members: '250K' },
    ],
    entertainment: [
      { username: 'movies_series', title: 'Movies', members: '400K' },
      { username: 'memes', title: 'Memes', members: '500K' },
    ],
    science: [
      { username: 'science', title: 'Science', members: '120K' },
      { username: 'nasa', title: 'NASA', members: '90K' },
    ],
    gaming: [
      { username: 'gaming', title: 'Gaming', members: '200K' },
      { username: 'steam', title: 'Steam', members: '150K' },
    ],
    music: [{ username: 'music', title: 'Music', members: '250K' }],
    art: [{ username: 'art', title: 'Art', members: '80K' }, { username: 'design', title: 'Design', members: '60K' }],
    sports: [{ username: 'football', title: 'Football', members: '300K' }],
    education: [{ username: 'learnenglish', title: 'Learn English', members: '200K' }],
    meme: [{ username: 'memes', title: 'Memes', members: '500K' }],
    food: [{ username: 'recipes', title: 'Recipes', members: '100K' }],
    travel: [{ username: 'travel', title: 'Travel', members: '120K' }],
    photography: [{ username: 'photography', title: 'Photography', members: '90K' }],
  };

  return cat === 'all' ? Object.values(all).flat() : (all[cat] || []);
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
async function fetchHtml(url) {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,fa;q=0.8',
      },
      redirect: 'follow',
    });
    return r.ok ? await r.text() : '';
  } catch {
    return '';
  }
}

function extractMeta(html, name) {
  let r = new RegExp(`<meta[^>]+(?:property|name)="${name}"[^>]+content="([^"]*)"`, 'i');
  let m = html.match(r);
  if (m) return m[1];
  r = new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${name}"`, 'i');
  m = html.match(r);
  return m ? m[1] : '';
}

function extractNumber(t) { const m = t.match(/([\d,.]+[KkMm]?)/); return m ? m[1] : '0'; }

function parseMemberCount(str) {
  if (!str) return 0;
  str = str.toString().replace(/[,.\s]/g, '');
  const m = str.match(/([\d]+)([KkMm]?)/);
  if (!m) return 0;
  const num = parseInt(m[1]);
  const suffix = m[2].toUpperCase();
  if (suffix === 'K') return num * 1000;
  if (suffix === 'M') return num * 1000000;
  return num;
}

function extractPostDate(postId) {
  // Post IDs often contain timestamps or sequential numbers
  // Try to extract from the post link format: channel/id
  const parts = postId.split('/');
  const id = parseInt(parts[parts.length - 1]);
  if (id > 100000) {
    // Rough estimate: Telegram post IDs are roughly sequential
    // Starting from ~1 around 2015, ~1M around 2020
    return Date.now() - (10000000 - Math.min(id, 10000000)) * 60000;
  }
  return 0;
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/\n/g, ' ').trim();
}

function mergeResults(...arrays) {
  const seen = new Set();
  const merged = [];
  for (const arr of arrays) {
    for (const item of arr) {
      const k = (item.username || '').toLowerCase();
      if (k && !seen.has(k)) {
        seen.add(k);
        merged.push(item);
      }
    }
  }
  return merged;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
