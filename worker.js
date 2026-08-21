// ============================================================
// Telegram Explorer - Cloudflare Worker Proxy
// ============================================================
// Deploy this on Cloudflare Workers (free tier is enough)
// https://dash.cloudflare.com → Workers → Create Worker
// ============================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=300',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // Route: /api/search?q=keyword&lang=en
      if (path === '/api/search') {
        return await handleSearch(url);
      }

      // Route: /api/channel/:username
      if (path.startsWith('/api/channel/')) {
        const username = path.split('/api/channel/')[1];
        return await handleChannel(username);
      }

      // Route: /api/posts/:username
      if (path.startsWith('/api/posts/')) {
        const username = path.split('/api/posts/')[1];
        return await handlePosts(username, url);
      }

      // Route: /api/trending
      if (path === '/api/trending') {
        return await handleTrending(url);
      }

      // Route: /api/categories
      if (path === '/api/categories') {
        return handleCategories();
      }

      return jsonResponse({ error: 'Not found', routes: [
        '/api/search?q=keyword',
        '/api/channel/username',
        '/api/posts/username',
        '/api/trending',
        '/api/categories'
      ]}, 404);

    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  }
};

// --- Search public channels via t.me ---

async function handleSearch(url) {
  const query = url.searchParams.get('q');
  const lang = url.searchParams.get('lang') || 'en';
  const page = parseInt(url.searchParams.get('page') || '1');

  if (!query) return jsonResponse({ error: 'Missing query parameter ?q=' }, 400);

  const searchUrl = `https://t.me/s/${encodeURIComponent(query)}`;
  const html = await fetchHtml(searchUrl);

  // Also try searching via Google for Telegram channels
  const googleResults = await searchGoogle(`site:t.me ${query}`, lang);

  // Parse channel cards from t.me/s/ results
  const channels = parseSearchResults(html, query);

  // Merge with Google results
  const merged = mergeResults(channels, googleResults);

  return jsonResponse({
    query,
    page,
    results: merged,
    total: merged.length,
    source: 't.me + google'
  });
}

// --- Get channel info ---

async function handleChannel(username) {
  const cleanUser = username.replace(/[^a-zA-Z0-9_]/g, '');
  const url = `https://t.me/${cleanUser}`;
  const html = await fetchHtml(url);

  if (!html) return jsonResponse({ error: 'Channel not found' }, 404);

  const info = parseChannelPage(html, cleanUser);
  return jsonResponse(info);
}

// --- Get channel posts ---

async function handlePosts(username, url) {
  const cleanUser = username.replace(/[^a-zA-Z0-9_]/g, '');
  const page = parseInt(url.searchParams.get('page') || '1');

  const postsUrl = `https://t.me/s/${cleanUser}?page=${page}`;
  const html = await fetchHtml(postsUrl);

  if (!html) return jsonResponse({ error: 'Channel not found' }, 404);

  const posts = parsePosts(html, cleanUser);

  return jsonResponse({
    channel: cleanUser,
    page,
    posts,
    total: posts.length
  });
}

// --- Trending channels (curated list + popular) ---

async function handleTrending(url) {
  const category = url.searchParams.get('cat') || 'all';
  const page = parseInt(url.searchParams.get('page') || '1');

  // Curated popular channels by category
  const trending = getTrendingChannels(category);

  return jsonResponse({
    category,
    page,
    channels: trending.slice((page - 1) * 20, page * 20),
    total: trending.length
  });
}

// --- Categories list ---

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
// HTML Parsers
// ============================================================

function parseSearchResults(html, query) {
  const channels = [];
  // Try to extract channel blocks from t.me/s/ search page
  const channelRegex = /class="tgme_channel_card[^"]*"[^>]*>[\s\S]*?<a[^>]*href="https?:\/\/t\.me\/([^"]+)"[^>]*>[\s\S]*?<div[^>]*class="tgme_channel_card_info"[\s\S]*?<div[^>]*class="tgme_channel_card_title"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div[^>]*class="tgme_channel_card_counter"[^>]*>([\s\S]*?)<\/div>/gi;

  let match;
  while ((match = channelRegex.exec(html)) !== null) {
    channels.push({
      username: match[1].trim(),
      title: decodeEntities(match[2].trim()),
      members: extractNumber(match[3]),
      avatar: '',
      description: '',
      link: `https://t.me/${match[1].trim()}`
    });
  }

  // Fallback: extract from meta/link tags
  if (channels.length === 0) {
    const linkRegex = /href="https?:\/\/t\.me\/([a-zA-Z0-9_]{5,})"[^>]*>([\s\S]*?)<\/a>/gi;
    const seen = new Set();
    while ((match = linkRegex.exec(html)) !== null) {
      const user = match[1].trim();
      if (!seen.has(user) && user !== 's' && user !== 'share' && user !== 'addstickers') {
        seen.add(user);
        channels.push({
          username: user,
          title: decodeEntities(match[2].trim()) || user,
          members: 0,
          link: `https://t.me/${user}`
        });
      }
    }
  }

  return channels;
}

function parseChannelPage(html, username) {
  const title = extractMeta(html, 'og:title') || extractMeta(html, 'title') || username;
  const description = extractMeta(html, 'og:description') || extractMeta(html, 'description') || '';
  const image = extractMeta(html, 'og:image') || '';
  const membersMatch = html.match(/([\d,.]+[KkMm]?)\s*(?:members|subscriber|member|عضو)/i);
  const members = membersMatch ? membersMatch[1] : '0';

  return {
    username,
    title: decodeEntities(title),
    description: decodeEntities(description),
    image,
    members,
    link: `https://t.me/${username}`
  };
}

function parsePosts(html, username) {
  const posts = [];
  const postRegex = /class="tgme_widget_message_wrap[^"]*"[^>]*data-post="([^"]+)"[\s\S]*?<div[^>]*class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;

  let match;
  while ((match = postRegex.exec(html)) !== null) {
    const postId = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (text) {
      posts.push({
        id: postId,
        text: decodeEntities(text.substring(0, 300)),
        link: `https://t.me/${username}/${postId.split('/').pop()}`
      });
    }
  }

  // Extract images from posts
  const imgRegex = /background-image:\s*url\(['"]?(https?:\/\/[^'")\s]+)['"]?\)/gi;
  const images = [];
  while ((match = imgRegex.exec(html)) !== null) {
    images.push(match[1]);
  }

  // Attach images to posts
  posts.forEach((post, i) => {
    if (images[i]) post.image = images[i];
  });

  return posts;
}

// ============================================================
// Google Search Helper
// ============================================================

async function searchGoogle(query, lang) {
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20&hl=${lang}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await resp.text();

    const results = [];
    const regex = /https?:\/\/t\.me\/([a-zA-Z0-9_]+)/g;
    const seen = new Set();
    let match;
    while ((match = regex.exec(html)) !== null) {
      const user = match[1];
      if (!seen.has(user) && !['s', 'share', 'addstickers', 'joinchat'].includes(user)) {
        seen.add(user);
        results.push({
          username: user,
          title: user,
          link: `https://t.me/${user}`,
          source: 'google'
        });
      }
    }
    return results;
  } catch (e) {
    return [];
  }
}

// ============================================================
// Trending Channels (curated)
// ============================================================

function getTrendingChannels(category) {
  const all = {
    tech: [
      { username: 'techcrunch', title: 'TechCrunch', members: '120K' },
      { username: 'haborz', title: 'Harorz Tech', members: '85K' },
      { username: 'techology', title: 'Technology', members: '200K' },
      { username: 'haborz', title: 'Programming', members: '95K' },
      { username: 'ai_machinelearning', title: 'AI & ML', members: '150K' },
      { username: 'linux', title: 'Linux', members: '80K' },
      { username: 'webdev', title: 'Web Dev', members: '60K' },
      { username: 'android_apps', title: 'Android', members: '110K' },
      { username: 'iosapp', title: 'iOS Apps', members: '70K' },
      { username: 'cybersecurity', title: 'CyberSec', members: '45K' },
    ],
    news: [
      { username: 'bbcpersian', title: 'BBC Persian', members: '1.5M' },
      { username: 'manaborz', title: 'Manoto', members: '800K' },
      { username: 'aborzin', title: 'Euronews', members: '400K' },
      { username: 'rt_russian', title: 'RT News', members: '500K' },
      { username: 'caborzen', title: 'CNN', members: '350K' },
    ],
    crypto: [
      { username: 'bitcoin', title: 'Bitcoin', members: '300K' },
      { username: 'ethereum', title: 'Ethereum', members: '200K' },
      { username: 'crypto', title: 'Crypto', members: '150K' },
      { username: 'binance', title: 'Binance', members: '250K' },
      { username: 'coindesk', title: 'CoinDesk', members: '100K' },
    ],
    entertainment: [
      { username: 'movies_series', title: 'Movies', members: '400K' },
      { username: 'netflix', title: 'Netflix', members: '180K' },
      { username: 'memes', title: 'Memes', members: '500K' },
      { username: 'funny', title: 'Funny', members: '300K' },
    ],
    science: [
      { username: 'science', title: 'Science', members: '120K' },
      { username: 'nasa', title: 'NASA', members: '90K' },
      { username: 'space', title: 'Space', members: '75K' },
    ],
    gaming: [
      { username: 'gaming', title: 'Gaming', members: '200K' },
      { username: 'steam', title: 'Steam', members: '150K' },
      { username: 'playstation', title: 'PlayStation', members: '100K' },
    ],
    music: [
      { username: 'music', title: 'Music', members: '250K' },
      { username: 'spotify', title: 'Spotify', members: '120K' },
    ],
    art: [
      { username: 'art', title: 'Art', members: '80K' },
      { username: 'design', title: 'Design', members: '60K' },
    ],
    sports: [
      { username: 'football', title: 'Football', members: '300K' },
      { username: 'nba', title: 'NBA', members: '150K' },
    ],
    education: [
      { username: 'learnenglish', title: 'English', members: '200K' },
      { username: 'math', title: 'Math', members: '80K' },
    ],
    meme: [
      { username: 'memes', title: 'Memes', members: '500K' },
      { username: 'dankmemes', title: 'Dank Memes', members: '200K' },
    ],
    food: [
      { username: 'recipes', title: 'Recipes', members: '100K' },
      { username: 'cooking', title: 'Cooking', members: '80K' },
    ],
    travel: [
      { username: 'travel', title: 'Travel', members: '120K' },
      { username: 'backpacking', title: 'Backpacking', members: '60K' },
    ],
    photography: [
      { username: 'photography', title: 'Photography', members: '90K' },
      { username: 'iphoneography', title: 'iPhone Photo', members: '50K' },
    ],
  };

  if (category === 'all') {
    return Object.values(all).flat();
  }
  return all[category] || [];
}

// ============================================================
// Utility Functions
// ============================================================

async function fetchHtml(url) {
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    if (!resp.ok) return '';
    return await resp.text();
  } catch (e) {
    return '';
  }
}

function extractMeta(html, name) {
  // Try og: property first
  let regex = new RegExp(`<meta[^>]+(?:property|name)="${name}"[^>]+content="([^"]*)"`, 'i');
  let match = html.match(regex);
  if (match) return match[1];

  // Try reversed attribute order
  regex = new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${name}"`, 'i');
  match = html.match(regex);
  return match ? match[1] : '';
}

function extractNumber(text) {
  const match = text.match(/([\d,.]+[KkMm]?)/);
  return match ? match[1] : '0';
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\n/g, ' ')
    .trim();
}

function mergeResults(a, b) {
  const seen = new Set();
  const merged = [];
  for (const item of [...a, ...b]) {
    const key = (item.username || '').toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    }
  });
}
