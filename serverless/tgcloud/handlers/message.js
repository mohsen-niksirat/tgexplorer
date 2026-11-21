import { db, api } from 'sdk';
import { sql } from 'sdk/db';
import { users, channelOpens, inlineQueries, inlineShares } from '../schema.js';
import { getChannelCardData, parseChannelStartParam } from '../lib/channel.js';
import {
  BOT_USERNAME,
  buildChannelCardKeyboard,
  buildExploreKeyboard,
  channelNotFoundText,
  fallbackText,
  formatChannelCardCaption,
  helpText,
  welcomeText,
} from '../lib/texts.js';

// Owner's numeric Telegram user ID for /stats (read your ID from the `users` table):
export const OWNER_ID = 65807806;

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

  if (parsed && (parsed.cmd === 'start' || parsed.cmd === 'app')) {
    if (isPrivate) {
      await upsertUser(message.from, parsed.param);
    }

    if (parsed.cmd === 'start' && parsed.param) {
      const channelUsername = parseChannelStartParam(parsed.param);
      if (channelUsername) {
        await db
          .insert(channelOpens)
          .values({
            username: channelUsername,
            userId: message.from?.id || 0,
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

        const caption = formatChannelCardCaption(lang, card);
        const reply_markup = buildChannelCardKeyboard(lang, channelUsername);
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

  if (parsed && parsed.cmd === 'stats') {
    if (isPrivate && OWNER_ID && message.from?.id === OWNER_ID) {
      const totalUsers = await db.$count(users);
      const totalOpens = await db.$count(channelOpens);
      const totalInlineQueries = await db.$count(inlineQueries);
      const totalInlineShares = await db.$count(inlineShares);
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
        `Inline shares: ${totalInlineShares}\n\n` +
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
    await api.sendMessage({
      chat_id: message.chat.id,
      text: fallbackText(lang),
      reply_markup: buildExploreKeyboard(lang, ''),
    });
  }
}
