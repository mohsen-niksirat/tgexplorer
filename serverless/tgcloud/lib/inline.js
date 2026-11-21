import { APP_URL, BOT_USERNAME } from './texts.js';

const PAGE_SIZE = 20;

export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncateDesc(str, maxLen = 200) {
  const clean = String(str || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean;
}

function scoreChannel(ch, q) {
  const u = (ch.username || '').toLowerCase();
  const title = (ch.title || '').toLowerCase();
  const cat = (ch.category || '').toLowerCase();
  const desc = (ch.description || '').toLowerCase();
  const tags = Array.isArray(ch.tags) ? ch.tags : [];

  if (u === q) return 0;
  if (u.startsWith(q) || title.startsWith(q)) return 1;
  if (title.includes(q) || u.includes(q)) return 2;
  if (cat.includes(q) || tags.some(t => String(t).toLowerCase().includes(q)) || desc.includes(q)) {
    return 3;
  }
  return -1;
}

function getUtcDayOfYear(date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((now - start) / 86400000);
}

export function searchAndRankChannels(channels, rawQuery) {
  const q = String(rawQuery || '').trim().replace(/^@+/, '').toLowerCase();
  const list = Array.isArray(channels) ? channels : [];

  if (!q) {
    if (!list.length) return [];
    const ordered = [...list].sort((a, b) => (a.order || 0) - (b.order || 0));
    const offset = getUtcDayOfYear() % ordered.length;
    return [...ordered.slice(offset), ...ordered.slice(0, offset)];
  }

  const matched = [];
  for (const ch of list) {
    const tier = scoreChannel(ch, q);
    if (tier >= 0) matched.push({ ch, tier });
  }

  matched.sort(
    (a, b) =>
      a.tier - b.tier ||
      (b.ch.membersCount || 0) - (a.ch.membersCount || 0) ||
      (a.ch.order || 0) - (b.ch.order || 0)
  );
  return matched.map(m => m.ch);
}

export function buildChannelInlineArticle(ch) {
  const username = ch.username;
  const title = ch.title || `@${username}`;
  const descParts = [`@${username}`];
  if (ch.members) descParts.push(ch.members);
  if (ch.category) descParts.push(ch.category);

  const lines = [`<b>${escapeHtml(title)}</b>`];
  lines.push(ch.members ? `@${escapeHtml(username)} · ${escapeHtml(ch.members)} subscribers` : `@${escapeHtml(username)}`);
  const snippet = truncateDesc(ch.description, 200);
  if (snippet) lines.push(escapeHtml(snippet));

  const article = {
    type: 'article',
    id: username,
    title,
    description: descParts.join(' · '),
    input_message_content: {
      message_text: lines.join('\n'),
      parse_mode: 'HTML',
    },
    reply_markup: {
      inline_keyboard: [[
        { text: 'Open channel', url: `https://t.me/${encodeURIComponent(username)}` },
        { text: 'Open in TGExplorer', url: `https://t.me/${BOT_USERNAME}?start=channel_${encodeURIComponent(username)}` },
      ]],
    },
  };

  if (ch.avatar && /^https?:\/\//i.test(ch.avatar)) {
    article.thumb_url = ch.avatar;
  }

  return article;
}

export function buildNoMatchArticle(rawQuery) {
  const q = String(rawQuery || '').trim();
  return {
    type: 'article',
    id: '__no_match__',
    title: `No channels found for '${q}'`,
    description: 'Open TGExplorer to browse all verified channels',
    input_message_content: {
      message_text: `No channels found for '${escapeHtml(q)}'.\n\nOpen TGExplorer to browse all verified channels: ${APP_URL}`,
      parse_mode: 'HTML',
    },
    reply_markup: {
      inline_keyboard: [[
        { text: 'Open TGExplorer', url: `https://t.me/${BOT_USERNAME}?start=app` },
      ]],
    },
  };
}

export function buildAnswerInlinePayload(inlineQuery, channels) {
  const rawQuery = String(inlineQuery?.query || '');
  const trimmed = rawQuery.trim();
  const offset = Math.max(0, parseInt(inlineQuery?.offset || '0', 10) || 0);
  const ranked = searchAndRankChannels(channels, trimmed);

  if (trimmed && ranked.length === 0) {
    return {
      inline_query_id: inlineQuery.id,
      results: [buildNoMatchArticle(trimmed)],
      cache_time: 60,
      is_personal: false,
      next_offset: '',
      button: {
        text: 'Open TGExplorer',
        start_parameter: 'app',
      },
    };
  }

  const page = ranked.slice(offset, offset + PAGE_SIZE);
  const nextOffset = offset + PAGE_SIZE < ranked.length ? String(offset + PAGE_SIZE) : '';

  return {
    inline_query_id: inlineQuery.id,
    results: page.map(buildChannelInlineArticle),
    cache_time: trimmed ? 60 : 300,
    is_personal: false,
    next_offset: nextOffset,
  };
}
