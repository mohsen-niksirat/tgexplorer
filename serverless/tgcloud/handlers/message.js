import { db, api } from 'sdk';
import { sql } from 'sdk/db';
import { users } from '../schema.js';
import {
  BOT_USERNAME,
  buildExploreKeyboard,
  fallbackText,
  helpText,
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

function extractChannelDeepLink(param) {
  const m = String(param || '').match(/^channel_([A-Za-z0-9_]{3,64})$/);
  return m ? m[1] : '';
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
    const channelUsername = parsed.cmd === 'start' ? extractChannelDeepLink(parsed.param) : '';
    await api.sendMessage({
      chat_id: message.chat.id,
      text: welcomeText(lang),
      reply_markup: buildExploreKeyboard(lang, channelUsername),
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
