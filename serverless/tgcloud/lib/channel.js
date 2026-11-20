import { db, fetch } from 'sdk';
import { eq } from 'sdk/db';
import { channelCache } from '../schema.js';
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

async function getVerifiedUsernames() {
  const now = Math.floor(Date.now() / 1000);
  try {
    const cached = await db
      .select()
      .from(channelCache)
      .where(eq(channelCache.username, VERIFIED_KEY))
      .get();
    if (cached && now - (cached.fetchedAt || 0) < TTL_SEC && cached.description) {
      return new Set(JSON.parse(cached.description));
    }
  } catch (e) {}

  try {
    const res = await fetch(`${APP_URL}channels.js`);
    if (res.ok) {
      const text = await res.text();
      const list = [];
      const re = /username\s*:\s*['"]([A-Za-z0-9_]+)['"]/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        list.push(m[1].toLowerCase());
      }
      if (list.length) {
        const json = JSON.stringify(list);
        await db
          .insert(channelCache)
          .values({
            username: VERIFIED_KEY,
            title: 'VERIFIED_DB',
            description: json,
            image: '',
            subs: String(list.length),
            verified: true,
            fetchedAt: now,
          })
          .onConflictDoUpdate({
            target: channelCache.username,
            set: { description: json, subs: String(list.length), fetchedAt: now },
          })
          .run();
        return new Set(list);
      }
    }
  } catch (e) {}

  return new Set();
}

export async function getChannelCardData(username) {
  const now = Math.floor(Date.now() / 1000);
  const verifiedSet = await getVerifiedUsernames();
  const isVerified = verifiedSet.has(username);

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

  try {
    const res = await fetch(`https://t.me/${encodeURIComponent(username)}`);
    if (!res.ok) return { found: false };
    const html = await res.text();
    const parsed = parseTmeChannelHtml(html);
    if (!parsed) return { found: false };

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
  } catch (e) {
    return { found: false };
  }
}
