import { api, db } from 'sdk';
import { and, eq, sql } from 'sdk/db';
import { suggestions, users } from '../schema.js';
import { formatMembersShort, getVerifiedChannelsMap } from './channel.js';
import {
  buildExploreKeyboard,
  suggestAlreadyListedText,
  suggestAlreadySubmittedText,
  suggestInvalidText,
  suggestNotChannelText,
  suggestNotFoundText,
  suggestRateLimitText,
  suggestSubmittedText,
} from './texts.js';

export const OWNER_ID = 65807806;
const SUGGEST_TTL_SEC = 10 * 60;
const MAX_PENDING_PER_USER = 3;

export function parseSuggestedUsername(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;
  s = s.replace(/^https?:\/\/(?:www\.)?(?:t\.me|telegram\.me)\//i, '');
  s = s.replace(/^(?:t\.me|telegram\.me)\//i, '');
  s = s.replace(/^@+/, '');
  s = s.split(/[/?#\s]/)[0];
  if (!/^[A-Za-z0-9_]{5,32}$/.test(s)) return null;
  return s.toLowerCase();
}

export async function setUserPendingSuggest(userId, lang) {
  if (!userId) return;
  const expiresAt = Math.floor(Date.now() / 1000) + SUGGEST_TTL_SEC;
  await db
    .insert(users)
    .values({
      telegramId: userId,
      languageCode: lang || null,
      pendingState: 'suggest',
      pendingExpiresAt: expiresAt,
    })
    .onConflictDoUpdate({
      target: users.telegramId,
      set: {
        languageCode: lang || null,
        lastSeen: sql`(unixepoch())`,
        pendingState: 'suggest',
        pendingExpiresAt: expiresAt,
      },
    })
    .run();
}

export async function clearUserPendingState(userId) {
  if (!userId) return;
  await db
    .update(users)
    .set({ pendingState: null, pendingExpiresAt: null })
    .where(eq(users.telegramId, userId))
    .run();
}

export async function getUserSuggestState(userId) {
  if (!userId) return false;
  const row = await db
    .select({
      pendingState: users.pendingState,
      pendingExpiresAt: users.pendingExpiresAt,
    })
    .from(users)
    .where(eq(users.telegramId, userId))
    .get();
  if (!row || row.pendingState !== 'suggest') return false;
  const now = Math.floor(Date.now() / 1000);
  if ((row.pendingExpiresAt || 0) <= now) {
    await clearUserPendingState(userId);
    return false;
  }
  return true;
}

export function buildModerationKeyboard(suggestionId) {
  return {
    inline_keyboard: [[
      { text: 'Approve', callback_data: `sug_ok:${suggestionId}` },
      { text: 'Reject', callback_data: `sug_no:${suggestionId}` },
    ]],
  };
}

export function formatModerationMessage(row) {
  const membersStr = row.members ? formatMembersShort(row.members) : 'unknown';
  const lines = [
    'New channel suggestion',
    '',
    `Title: ${row.title || '@' + row.username}`,
    `Username: @${row.username}`,
    `Members: ${membersStr}`,
  ];
  if (row.description) {
    const clean = String(row.description).replace(/\s+/g, ' ').trim();
    const snippet = clean.length > 200 ? `${clean.slice(0, 197)}...` : clean;
    lines.push(`Description: ${snippet}`);
  }
  lines.push(`Submitted by: ${row.submittedBy}`);
  return lines.join('\n');
}

export async function handleSuggestInput(chatId, userId, lang, rawText) {
  // 1. Parse and validate username format (invalid -> explain + stay in flow)
  const username = parseSuggestedUsername(rawText);
  if (!username) {
    await api.sendMessage({
      chat_id: chatId,
      text: suggestInvalidText(lang),
    });
    return { ok: false, reason: 'invalid_format' };
  }

  // 2. Already in verified channels DB -> reply with Open button + exit flow
  const verifiedMap = await getVerifiedChannelsMap();
  if (verifiedMap[username]) {
    await clearUserPendingState(userId);
    await api.sendMessage({
      chat_id: chatId,
      text: suggestAlreadyListedText(lang, username),
      reply_markup: buildExploreKeyboard(lang, username),
    });
    return { ok: false, reason: 'already_listed', username };
  }

  // 3. Already suggested before (pending OR approved) -> exit flow
  const existing = await db
    .select()
    .from(suggestions)
    .where(eq(suggestions.username, username))
    .get();
  if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
    await clearUserPendingState(userId);
    await api.sendMessage({
      chat_id: chatId,
      text: suggestAlreadySubmittedText(lang, username),
    });
    return { ok: false, reason: 'already_submitted', username, status: existing.status };
  }

  // 4. Anti-spam: max 3 pending suggestions per user
  const pendingCount = await db.$count(
    suggestions,
    and(eq(suggestions.submittedBy, userId), eq(suggestions.status, 'pending'))
  );
  if (pendingCount >= MAX_PENDING_PER_USER) {
    await clearUserPendingState(userId);
    await api.sendMessage({
      chat_id: chatId,
      text: suggestRateLimitText(lang),
    });
    return { ok: false, reason: 'rate_limit', pendingCount };
  }

  // 5. Existence & type check via Bot API getChat
  let chat;
  try {
    chat = await api.getChat({ chat_id: `@${username}` });
  } catch (e) {
    await api.sendMessage({
      chat_id: chatId,
      text: suggestNotFoundText(lang),
    });
    return { ok: false, reason: 'not_found', username };
  }

  if (!chat || chat.type !== 'channel') {
    await api.sendMessage({
      chat_id: chatId,
      text: suggestNotChannelText(lang),
    });
    return { ok: false, reason: 'not_channel', username, type: chat?.type || null };
  }

  let members = 0;
  try {
    const count = await api.getChatMemberCount({ chat_id: `@${username}` });
    members = Number(count) || 0;
  } catch (e) {}

  const title = String(chat.title || `@${username}`).trim();
  const description = String(chat.description || '').trim();

  // 6. Store pending suggestion (re-using rejected row if username existed)
  let savedRow;
  if (existing) {
    await db
      .update(suggestions)
      .set({
        title,
        members,
        description,
        submittedBy: userId,
        status: 'pending',
        createdAt: sql`(unixepoch())`,
        decidedAt: null,
      })
      .where(eq(suggestions.id, existing.id))
      .run();
    savedRow = { id: existing.id, username, title, members, description, submittedBy: userId };
  } else {
    await db
      .insert(suggestions)
      .values({
        username,
        title,
        members,
        description,
        submittedBy: userId,
        status: 'pending',
      })
      .run();
    const inserted = await db
      .select({ id: suggestions.id })
      .from(suggestions)
      .where(eq(suggestions.username, username))
      .get();
    savedRow = { id: inserted.id, username, title, members, description, submittedBy: userId };
  }

  await clearUserPendingState(userId);

  await api.sendMessage({
    chat_id: chatId,
    text: suggestSubmittedText(lang, title, username),
  });

  const moderationText = formatModerationMessage(savedRow);
  const moderationKeyboard = buildModerationKeyboard(savedRow.id);
  try {
    await api.sendMessage({
      chat_id: OWNER_ID,
      text: moderationText,
      reply_markup: moderationKeyboard,
    });
  } catch (e) {}

  return {
    ok: true,
    id: savedRow.id,
    username,
    title,
    members,
    moderationText,
    moderationKeyboard,
  };
}
