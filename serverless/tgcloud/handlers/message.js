import { db, api } from 'sdk';
import { eq, sql } from 'sdk/db';
import { users, channelOpens, inlineQueries, inlineShares, suggestions, subscriptions, notifyLog } from '../schema.js';
import { getChannelCardData, parseChannelStartParam } from '../lib/channel.js';
import {
  buildNotifyManagerPayload,
  getUserSubscriptions,
  isUserSubscribed,
  parseNotifyStartParam,
  subscribeUser,
} from '../lib/notify.js';
import {
  buildModerationKeyboard,
  clearUserPendingState,
  formatModerationMessage,
  getUserSuggestState,
  handleSuggestInput,
  OWNER_ID,
  parseSuggestedUsername,
  setUserPendingSuggest,
} from '../lib/suggest.js';
import {
  BOT_USERNAME,
  buildChannelCardKeyboard,
  buildExploreKeyboard,
  channelNotFoundText,
  fallbackText,
  formatChannelCardCaption,
  helpText,
  notifyInvalidChannelText,
  notifySubscribedText,
  suggestCancelledText,
  suggestPromptText,
  welcomeText,
} from '../lib/texts.js';

function parseCommand(text, isGroup) {
  if (!text || !text.startsWith('/')) return null;
  const parts = text.trim().split(/\s+/);
  const head = parts[0].slice(1);
  const atIdx = head.indexOf('@');
  const cmd = (atIdx === -1 ? head : head.slice(0, atIdx)).toLowerCase();
  const target = atIdx === -1 ? '' : head.slice(atIdx + 1).toLowerCase();
  if (isGroup && target !== BOT_USERNAME.toLowerCase()) return null;
  const param = parts[1] || '';
  return { cmd, param };
}

async function upsertUser(from, startParam) {
  if (!from || !from.id) return;
  await db
    .insert(users)
    .values({
      telegramId: from.id,
      languageCode: from.language_code || null,
      lastStartParam: startParam || null,
    })
    .onConflictDoUpdate({
      target: users.telegramId,
      set: {
        languageCode: from.language_code || null,
        lastSeen: sql`(unixepoch())`,
        lastStartParam: startParam || null,
      },
    })
    .run();
}

export default async function (message) {
  if (!message || !message.chat) return;
  const chatType = message.chat.type;
  const isPrivate = chatType === 'private';
  const isGroup = chatType === 'group' || chatType === 'supergroup';
  if (!isPrivate && !isGroup) return;

  const parsed = parseCommand(message.text || '', isGroup);
  if (isGroup && !parsed) return;

  const lang = message.from?.language_code || 'en';
  const fromId = message.from?.id || 0;

  if (parsed && isPrivate && fromId) {
    await clearUserPendingState(fromId);
  }

  if (parsed && parsed.cmd === 'cancel' && isPrivate) {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: suggestCancelledText(lang),
      reply_markup: buildExploreKeyboard(lang, ''),
    });
    return;
  }

  if (parsed && parsed.cmd === 'suggest' && isPrivate) {
    await setUserPendingSuggest(fromId, lang);
    await api.sendMessage({
      chat_id: message.chat.id,
      text: suggestPromptText(lang),
    });
    return { action: 'suggest_prompt' };
  }

  if (parsed && parsed.cmd === 'suggestions') {
    if (isPrivate && OWNER_ID && fromId === OWNER_ID) {
      const pendingCount = await db.$count(suggestions, eq(suggestions.status, 'pending'));
      const approvedCount = await db.$count(suggestions, eq(suggestions.status, 'approved'));
      const rejectedCount = await db.$count(suggestions, eq(suggestions.status, 'rejected'));
      const pendingRows = await db
        .select()
        .from(suggestions)
        .where(eq(suggestions.status, 'pending'))
        .limit(10)
        .all();

      const header =
        `Channel Suggestions\n\n` +
        `Pending: ${pendingCount}\n` +
        `Approved: ${approvedCount}\n` +
        `Rejected: ${rejectedCount}`;
      await api.sendMessage({
        chat_id: message.chat.id,
        text: pendingRows.length ? header : `${header}\n\nNo pending suggestions.`,
      });
      for (const row of pendingRows) {
        await api.sendMessage({
          chat_id: message.chat.id,
          text: formatModerationMessage(row),
          reply_markup: buildModerationKeyboard(row.id),
        });
      }
      return {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        shown: pendingRows.map(r => r.username),
      };
    }
    await api.sendMessage({
      chat_id: message.chat.id,
      text: helpText(lang),
      reply_markup: buildExploreKeyboard(lang, ''),
    });
    return;
  }

  if (parsed && (parsed.cmd === 'start' || parsed.cmd === 'app')) {
    if (isPrivate) {
      await upsertUser(message.from, parsed.param);
    }

    if (parsed.cmd === 'start' && parsed.param) {
      const notifyUsername = parseNotifyStartParam(parsed.param);
      if (notifyUsername && fromId) {
        await subscribeUser(fromId, notifyUsername);
      }
      const channelUsername = notifyUsername || parseChannelStartParam(parsed.param);
      if (channelUsername) {
        await db
          .insert(channelOpens)
          .values({
            username: channelUsername,
            userId: fromId,
          })
          .run();

        const card = await getChannelCardData(channelUsername);
        if (!card.found) {
          await api.sendMessage({
            chat_id: message.chat.id,
            text: channelNotFoundText(lang),
            reply_markup: buildExploreKeyboard(lang, channelUsername),
          });
          return;
        }

        const isSub = notifyUsername ? true : await isUserSubscribed(fromId, channelUsername);
        const caption = formatChannelCardCaption(lang, card);
        const reply_markup = buildChannelCardKeyboard(lang, channelUsername, isSub);
        if (card.image && /^https?:\/\//i.test(card.image)) {
          try {
            await api.sendPhoto({
              chat_id: message.chat.id,
              photo: card.image,
              caption,
              reply_markup,
            });
            return;
          } catch (e) {}
        }
        await api.sendMessage({
          chat_id: message.chat.id,
          text: caption,
          reply_markup,
        });
        return;
      }
    }

    await api.sendMessage({
      chat_id: message.chat.id,
      text: welcomeText(lang),
      reply_markup: buildExploreKeyboard(lang, ''),
    });
    return;
  }

  if (parsed && parsed.cmd === 'notify' && isPrivate) {
    if (parsed.param) {
      const target = parseSuggestedUsername(parsed.param);
      if (!target) {
        await api.sendMessage({
          chat_id: message.chat.id,
          text: notifyInvalidChannelText(lang),
        });
        return { action: 'notify_invalid' };
      }
      await subscribeUser(fromId, target);
      await api.sendMessage({
        chat_id: message.chat.id,
        text: notifySubscribedText(lang, target),
      });
      return { action: 'notify_subscribed', username: target };
    }
    const subs = await getUserSubscriptions(fromId);
    const mgr = buildNotifyManagerPayload(lang, subs);
    await api.sendMessage({
      chat_id: message.chat.id,
      text: mgr.text,
      reply_markup: mgr.reply_markup,
    });
    return { action: 'notify_list', count: subs.length, usernames: subs.map(s => s.username) };
  }

  if (parsed && parsed.cmd === 'stats') {
    if (isPrivate && OWNER_ID && message.from?.id === OWNER_ID) {
      const totalUsers = await db.$count(users);
      const totalOpens = await db.$count(channelOpens);
      const totalInlineQueries = await db.$count(inlineQueries);
      const totalInlineShares = await db.$count(inlineShares);
      const pendingSuggestions = await db.$count(suggestions, eq(suggestions.status, 'pending'));
      const approvedSuggestions = await db.$count(suggestions, eq(suggestions.status, 'approved'));
      const activeSubs = await db.$count(subscriptions);
      const subUsersRow = await db.get(sql`SELECT COUNT(DISTINCT user_id) AS c FROM subscriptions`);
      const subscribedUsers = Number(subUsersRow?.c || 0);
      const notificationsSent = await db.$count(notifyLog);
      const topRows = await db.all(
        sql`SELECT username, COUNT(*) AS opens FROM channel_opens GROUP BY username ORDER BY opens DESC LIMIT 10`
      );
      const topLines = topRows.length
        ? topRows.map((r, i) => `${i + 1}. @${r.username} — ${r.opens}`).join('\n')
        : '(none yet)';
      const topShareRows = await db.all(
        sql`SELECT username, COUNT(*) AS shares FROM inline_shares GROUP BY username ORDER BY shares DESC LIMIT 5`
      );
      const topShareLines = topShareRows.length
        ? topShareRows.map((r, i) => `${i + 1}. @${r.username} — ${r.shares}`).join('\n')
        : '(none yet)';
      const statsText =
        `TGExplorer Bot Stats\n\n` +
        `Total users: ${totalUsers}\n` +
        `Total channel opens: ${totalOpens}\n` +
        `Inline queries: ${totalInlineQueries}\n` +
        `Inline shares: ${totalInlineShares}\n` +
        `Pending suggestions: ${pendingSuggestions}\n` +
        `Approved suggestions: ${approvedSuggestions}\n` +
        `Active subscriptions: ${activeSubs}\n` +
        `Subscribed users: ${subscribedUsers}\n` +
        `Notifications sent: ${notificationsSent}\n\n` +
        `Top 10 channels:\n${topLines}\n\n` +
        `Top 5 inline shared:\n${topShareLines}`;
      await api.sendMessage({
        chat_id: message.chat.id,
        text: statsText,
      });
      return statsText;
    }
    await api.sendMessage({
      chat_id: message.chat.id,
      text: helpText(lang),
      reply_markup: buildExploreKeyboard(lang, ''),
    });
    return;
  }

  if (parsed && parsed.cmd === 'help') {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: helpText(lang),
      reply_markup: buildExploreKeyboard(lang, ''),
    });
    return;
  }

  if (isPrivate) {
    if (fromId && (await getUserSuggestState(fromId))) {
      return await handleSuggestInput(message.chat.id, fromId, lang, message.text || '');
    }
    await api.sendMessage({
      chat_id: message.chat.id,
      text: fallbackText(lang),
      reply_markup: buildExploreKeyboard(lang, ''),
    });
  }
}
