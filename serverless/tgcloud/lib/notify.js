import { api, db, fetch } from 'sdk';
import { and, eq } from 'sdk/db';
import { notifyLog, notifyState, subscriptions, users } from '../schema.js';
import { getVerifiedChannelsMap } from './channel.js';
import { escapeHtml } from './inline.js';
import {
  APP_URL,
  isFa,
  notifyEmptyText,
  notifyListHeader,
  notifyUnsubButton,
} from './texts.js';

export function parseNotifyStartParam(param) {
  const m = String(param || '').match(/^notify_(.+)$/i);
  if (!m) return null;
  const lower = m[1].toLowerCase();
  if (!/^[a-z0-9_]{5,32}$/.test(lower)) return null;
  return lower;
}

export async function isUserSubscribed(userId, username) {
  if (!userId || !username) return false;
  const row = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.username, username.toLowerCase())))
    .get();
  return Boolean(row);
}

export async function subscribeUser(userId, username) {
  const u = String(username || '').toLowerCase();
  if (!userId || !u) return false;
  await db
    .insert(subscriptions)
    .values({ userId, username: u })
    .onConflictDoNothing({ target: [subscriptions.userId, subscriptions.username] })
    .run();
  return true;
}

export async function unsubscribeUser(userId, username) {
  const u = String(username || '').toLowerCase();
  if (!userId || !u) return false;
  await db
    .delete(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.username, u)))
    .run();
  return true;
}

export async function toggleUserSubscription(userId, username) {
  const u = String(username || '').toLowerCase();
  const currently = await isUserSubscribed(userId, u);
  if (currently) {
    await unsubscribeUser(userId, u);
    return false;
  }
  await subscribeUser(userId, u);
  return true;
}

export async function getUserSubscriptions(userId) {
  if (!userId) return [];
  return await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .all();
}

export function buildNotifyManagerPayload(lang, rows) {
  if (!rows || !rows.length) {
    return {
      text: notifyEmptyText(lang),
      reply_markup: undefined,
    };
  }
  return {
    text: notifyListHeader(lang, rows.length),
    reply_markup: {
      inline_keyboard: rows.map(r => [
        { text: notifyUnsubButton(lang, r.username), callback_data: `unsub:${r.username}` },
      ]),
    },
  };
}

function comparePostIds(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}

// Pure diff core: (posts, watermark) -> { newPosts, newestId, initialized }
export function findNewPosts(posts, watermark) {
  const list = Array.isArray(posts) ? posts.filter(p => p && p.id != null) : [];
  if (!list.length) {
    return { newPosts: [], newestId: watermark ? String(watermark) : null, initialized: false };
  }

  let newestId = String(list[0].id);
  for (const p of list) {
    if (comparePostIds(p.id, newestId) > 0) {
      newestId = String(p.id);
    }
  }

  if (watermark === null || watermark === undefined || watermark === '') {
    return { newPosts: [], newestId, initialized: true };
  }

  const newPosts = list
    .filter(p => comparePostIds(p.id, watermark) > 0)
    .sort((a, b) => comparePostIds(a.id, b.id));

  return { newPosts, newestId, initialized: false };
}

export function parsePostsJs(rawText) {
  const s = String(rawText || '').trim();
  const idx = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (idx === -1 || end === -1 || end <= idx) return {};
  return JSON.parse(s.slice(idx, end + 1));
}

function postLink(username, postId) {
  const u = encodeURIComponent(username);
  return postId ? `https://t.me/${u}/${encodeURIComponent(String(postId))}` : `https://t.me/${u}`;
}

function snippetText(text, maxLen = 200) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}...` : clean;
}

export function buildSinglePostNotification(lang, title, username, post) {
  const safeTitle = escapeHtml(title || `@${username}`);
  const safeUser = escapeHtml(username);
  const snippet = snippetText(post.text, 200);
  const lines = [`<b>${safeTitle}</b>`, `@${safeUser}`];
  if (snippet) lines.push('', escapeHtml(snippet));

  const viewText = isFa(lang) ? 'مشاهده پست' : 'View post';
  const unsubText = isFa(lang) ? 'لغو اشتراک' : 'Unsubscribe';

  return {
    text: lines.join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[
        { text: viewText, url: postLink(username, post.id) },
        { text: unsubText, callback_data: `unsub:${username}` },
      ]],
    },
  };
}

export function buildDigestNotification(lang, channelUpdates) {
  const header = isFa(lang)
    ? 'پست‌های جدید از کانال‌های دنبال‌شده:'
    : 'New posts from your subscribed channels:';
  const lines = [header, ''];

  let newestChannel = channelUpdates[0].username;
  let newestPost = channelUpdates[0].newPosts[channelUpdates[0].newPosts.length - 1];

  for (const item of channelUpdates) {
    const n = item.newPosts.length;
    const label = isFa(lang)
      ? `@${item.username} — ${n} پست جدید`
      : `@${item.username} — ${n} new ${n === 1 ? 'post' : 'posts'}`;
    lines.push(label);

    const candidate = item.newPosts[item.newPosts.length - 1];
    if (candidate?.date && (!newestPost?.date || candidate.date > newestPost.date)) {
      newestChannel = item.username;
      newestPost = candidate;
    }
  }

  lines.push('');
  lines.push(isFa(lang) ? 'مدیریت اشتراک‌ها: /notify' : 'Manage subscriptions: /notify');

  const viewText = isFa(lang) ? 'مشاهده جدیدترین پست' : 'View post';
  return {
    text: lines.join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: viewText, url: postLink(newestChannel, newestPost?.id) }]],
    },
  };
}

function sleep(ms) {
  if (typeof setTimeout !== 'function') return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function checkNotifications({ postsMap, dryRun = false, sendFn } = {}) {
  let map = postsMap;
  if (!map) {
    const res = await fetch(`${APP_URL}posts.js`);
    if (!res.ok) {
      throw new Error(`Failed to fetch posts.js: ${res.status}`);
    }
    const raw = await res.text();
    map = parsePostsJs(raw);
  }

  const allSubs = await db.select().from(subscriptions).all();
  if (!allSubs.length) {
    return {
      checkedChannels: 0,
      initializedChannels: 0,
      updatedChannels: 0,
      usersNotified: 0,
      blockedCleaned: 0,
      messages: [],
    };
  }

  const subsByChannel = new Map();
  for (const s of allSubs) {
    const u = String(s.username || '').toLowerCase();
    if (!subsByChannel.has(u)) subsByChannel.set(u, []);
    subsByChannel.get(u).push(s.userId);
  }

  const now = Math.floor(Date.now() / 1000);
  const updatesByUser = new Map();
  let checkedChannels = 0;
  let initializedChannels = 0;
  let updatedChannels = 0;

  for (const [username, userIds] of subsByChannel.entries()) {
    const posts = map[username];
    if (!Array.isArray(posts) || !posts.length) continue;
    checkedChannels++;

    const stateRow = await db
      .select()
      .from(notifyState)
      .where(eq(notifyState.username, username))
      .get();

    const diff = findNewPosts(posts, stateRow?.lastPostId ?? null);
    if (diff.newestId && !dryRun) {
      await db
        .insert(notifyState)
        .values({ username, lastPostId: diff.newestId, updatedAt: now })
        .onConflictDoUpdate({
          target: notifyState.username,
          set: { lastPostId: diff.newestId, updatedAt: now },
        })
        .run();
    }

    if (diff.initialized) {
      initializedChannels++;
      continue;
    }

    if (!diff.newPosts.length) continue;
    updatedChannels++;

    for (const uid of userIds) {
      if (!updatesByUser.has(uid)) updatesByUser.set(uid, []);
      updatesByUser.get(uid).push({ username, newPosts: diff.newPosts });
    }
  }

  if (!updatesByUser.size) {
    return {
      checkedChannels,
      initializedChannels,
      updatedChannels,
      usersNotified: 0,
      blockedCleaned: 0,
      messages: [],
    };
  }

  const verifiedMap = await getVerifiedChannelsMap();
  const sender = sendFn || (params => api.sendMessage(params));
  let usersNotified = 0;
  let blockedCleaned = 0;
  const messages = [];

  for (const [userId, items] of updatesByUser.entries()) {
    const userRow = await db
      .select({ languageCode: users.languageCode })
      .from(users)
      .where(eq(users.telegramId, userId))
      .get();
    const lang = userRow?.languageCode || 'en';

    let payload;
    if (items.length === 1 && items[0].newPosts.length === 1) {
      const { username, newPosts } = items[0];
      const title = verifiedMap[username]?.title || `@${username}`;
      payload = buildSinglePostNotification(lang, title, username, newPosts[0]);
    } else {
      payload = buildDigestNotification(lang, items);
    }

    const msgParams = {
      chat_id: userId,
      text: payload.text,
      parse_mode: payload.parse_mode,
      reply_markup: payload.reply_markup,
      disable_web_page_preview: true,
    };

    if (dryRun) {
      messages.push(msgParams);
      usersNotified++;
      continue;
    }

    try {
      await sender(msgParams);
      usersNotified++;
      messages.push(msgParams);
      for (const item of items) {
        await db
          .insert(notifyLog)
          .values({
            userId,
            username: item.username,
            postsCount: item.newPosts.length,
          })
          .run();
      }
    } catch (e) {
      const isBlocked = e?.code === 403 || /403|blocked/i.test(String(e?.message || e?.description || ''));
      if (isBlocked) {
        await db.delete(subscriptions).where(eq(subscriptions.userId, userId)).run();
        blockedCleaned++;
      }
    }

    await sleep(40);
  }

  return {
    checkedChannels,
    initializedChannels,
    updatedChannels,
    usersNotified,
    blockedCleaned,
    messages,
  };
}
