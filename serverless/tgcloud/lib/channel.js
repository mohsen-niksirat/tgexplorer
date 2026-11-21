import { db, fetch } from 'sdk';
import { eq } from 'sdk/db';
import { channelCache, suggestions } from '../schema.js';
import { APP_URL } from './texts.js';

const TTL_SEC = 6 * 3600;
const VERIFIED_KEY = '__verified_db__';

export function parseChannelStartParam(param) {
  const m = String(param || '').match(/^channel_(.+)$/i);
  if (!m) return null;
  const lower = m[1].toLowerCase();
  if (!/^[a-z0-9_]{5,}$/.test(lower)) return null;
  return lower;
}

function decodeEntities(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function extractMeta(html, prop) {
  const re1 = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i');
  const m1 = html.match(re1);
  if (m1) return decodeEntities(m1[1]).trim();
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`, 'i');
  const m2 = html.match(re2);
  return m2 ? decodeEntities(m2[1]).trim() : '';
}

export function parseTmeChannelHtml(html) {
  if (!html || typeof html !== 'string') return null;
  const title = extractMeta(html, 'og:title');
  const description = extractMeta(html, 'og:description');
  const image = extractMeta(html, 'og:image');

  const extraMatch = html.match(/<div class="tgme_page_extra">\s*([^<]+?)\s*<\/div>/i);
  const extra = extraMatch ? decodeEntities(extraMatch[1]).trim() : '';
  const hasSubs = /(?:subscribers?|members?)/i.test(extra);
  const isContactFallback = /^Telegram:\s*Contact\s*@/i.test(title);

  if (!title || isContactFallback || !hasSubs) {
    return null;
  }

  return {
    title,
    description,
    image,
    subs: extra,
  };
}

function parseMembersCount(raw) {
  const m = String(raw || '').trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*([KMB])?$/i);
  if (!m) return 0;
  const num = parseFloat(m[1]) || 0;
  const suffix = (m[2] || '').toUpperCase();
  if (suffix === 'M') return Math.round(num * 1000000);
  if (suffix === 'K') return Math.round(num * 1000);
  if (suffix === 'B') return Math.round(num * 1000000000);
  return Math.round(num);
}

function parseChannelsJsEntries(text) {
  const map = {};
  const lines = String(text || '').split(/\r?\n/);
  let order = 0;
  for (const line of lines) {
    const um = line.match(/username\s*:\s*['"]([A-Za-z0-9_]+)['"]/);
    if (!um) continue;
    const u = um[1].toLowerCase();
    const tm = line.match(/title\s*:\s*['"]([^'"]*)['"]/);
    const mm = line.match(/members\s*:\s*['"]([^'"]*)['"]/);
    const dm = line.match(/description\s*:\s*['"]([^'"]*)['"]/);
    const lm = line.match(/lang\s*:\s*['"]([^'"]*)['"]/);
    const cm = line.match(/category\s*:\s*['"]([^'"]*)['"]/);
    const am = line.match(/avatar\s*:\s*['"]([^'"]*)['"]/);
    const tagsm = line.match(/tags\s*:\s*\[([^\]]*)\]/);
    const tags = tagsm
      ? tagsm[1]
          .split(',')
          .map(s => s.replace(/['"\s]/g, '').trim())
          .filter(Boolean)
      : [];
    const members = mm ? mm[1] : '';
    map[u] = {
      username: u,
      title: tm ? tm[1] : um[1],
      members,
      membersCount: parseMembersCount(members),
      subs: members ? `${members} subscribers` : '',
      description: dm ? dm[1] : '',
      tags,
      category: cm ? cm[1] : (tags[0] || ''),
      lang: lm ? lm[1] : '',
      avatar: am ? am[1] : '',
      order: order++,
    };
  }
  return map;
}

export function formatMembersShort(n) {
  const count = Number(n) || 0;
  if (count <= 0) return '';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(count);
}

async function getBaseVerifiedChannelsMap() {
  const now = Math.floor(Date.now() / 1000);
  try {
    const cached = await db
      .select()
      .from(channelCache)
      .where(eq(channelCache.username, VERIFIED_KEY))
      .get();
    if (cached && now - (cached.fetchedAt || 0) < TTL_SEC && cached.description) {
      const parsed = JSON.parse(cached.description);
      if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
        const first = Object.values(parsed)[0];
        if (first && Array.isArray(first.tags)) {
          return parsed;
        }
      }
    }
  } catch (e) {}

  try {
    const res = await fetch(`${APP_URL}channels.js`);
    if (res.ok) {
      const text = await res.text();
      const map = parseChannelsJsEntries(text);
      const count = Object.keys(map).length;
      if (count) {
        const json = JSON.stringify(map);
        await db
          .insert(channelCache)
          .values({
            username: VERIFIED_KEY,
            title: 'VERIFIED_DB',
            description: json,
            image: '',
            subs: String(count),
            verified: true,
            fetchedAt: now,
          })
          .onConflictDoUpdate({
            target: channelCache.username,
            set: { description: json, subs: String(count), fetchedAt: now },
          })
          .run();
        return map;
      }
    }
  } catch (e) {}

  return {};
}

export async function getVerifiedChannelsMap() {
  const baseMap = await getBaseVerifiedChannelsMap();
  const merged = { ...baseMap };
  let idx = Object.keys(merged).length;

  try {
    const approvedRows = await db
      .select()
      .from(suggestions)
      .where(eq(suggestions.status, 'approved'))
      .all();
    for (const row of approvedRows) {
      const u = String(row.username || '').toLowerCase();
      if (!u || merged[u]) continue;
      const members = formatMembersShort(row.members);
      merged[u] = {
        username: u,
        title: row.title || `@${u}`,
        members,
        membersCount: Number(row.members) || 0,
        subs: members ? `${members} subscribers` : '',
        description: row.description || '',
        tags: ['community'],
        category: 'community',
        lang: '',
        avatar: '',
        source: 'community',
        order: idx++,
      };
    }
  } catch (e) {}

  return merged;
}

export async function getVerifiedChannelsList() {
  const map = await getVerifiedChannelsMap();
  return Object.values(map);
}

export async function getChannelCardData(username) {
  const now = Math.floor(Date.now() / 1000);
  const verifiedMap = await getVerifiedChannelsMap();
  const verifiedEntry = verifiedMap[username] || null;
  const isVerified = Boolean(verifiedEntry);

  try {
    const cached = await db
      .select()
      .from(channelCache)
      .where(eq(channelCache.username, username))
      .get();
    if (cached && now - (cached.fetchedAt || 0) < TTL_SEC && cached.title) {
      return {
        found: true,
        username,
        title: cached.title,
        description: cached.description || '',
        image: cached.image || '',
        subs: cached.subs || '',
        verified: isVerified || Boolean(cached.verified),
        cached: true,
      };
    }
  } catch (e) {}

  let parsed = null;
  try {
    const res = await fetch(`https://t.me/${encodeURIComponent(username)}`);
    if (res.ok) {
      const html = await res.text();
      parsed = parseTmeChannelHtml(html);
    }
  } catch (e) {}

  if (!parsed && verifiedEntry) {
    parsed = {
      title: verifiedEntry.title || `@${username}`,
      description: verifiedEntry.description || '',
      image: '',
      subs: verifiedEntry.subs || '',
    };
  }

  if (!parsed) return { found: false };

  try {
    await db
      .insert(channelCache)
      .values({
        username,
        title: parsed.title,
        description: parsed.description,
        image: parsed.image,
        subs: parsed.subs,
        verified: isVerified,
        fetchedAt: now,
      })
      .onConflictDoUpdate({
        target: channelCache.username,
        set: {
          title: parsed.title,
          description: parsed.description,
          image: parsed.image,
          subs: parsed.subs,
          verified: isVerified,
          fetchedAt: now,
        },
      })
      .run();
  } catch (e) {}

  return {
    found: true,
    username,
    title: parsed.title,
    description: parsed.description,
    image: parsed.image,
    subs: parsed.subs,
    verified: isVerified,
    cached: false,
  };
}
