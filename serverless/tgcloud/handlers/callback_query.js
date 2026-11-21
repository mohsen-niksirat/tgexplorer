import { api, db } from 'sdk';
import { eq } from 'sdk/db';
import { suggestions, users } from '../schema.js';
import {
  buildNotifyManagerPayload,
  getUserSubscriptions,
  toggleUserSubscription,
  unsubscribeUser,
} from '../lib/notify.js';
import {
  formatModerationMessage,
  OWNER_ID,
  setUserPendingSuggest,
} from '../lib/suggest.js';
import {
  buildChannelCardKeyboard,
  notifyUnsubDoneText,
  subToggledToast,
  suggestDecisionUserText,
  suggestPromptText,
} from '../lib/texts.js';

export default async function (cq) {
  if (!cq || !cq.id) return null;
  const data = String(cq.data || '');
  const fromId = cq.from?.id || 0;
  const lang = cq.from?.language_code || 'en';

  if (data === 'suggest_start') {
    await setUserPendingSuggest(fromId, lang);
    try {
      await api.answerCallbackQuery({ callback_query_id: cq.id });
    } catch (e) {}
    if (cq.message?.chat?.id) {
      await api.sendMessage({
        chat_id: cq.message.chat.id,
        text: suggestPromptText(lang),
      });
    }
    return { action: 'suggest_start', userId: fromId };
  }

  const subMatch = data.match(/^sub_toggle:([a-z0-9_]{5,32})$/i);
  if (subMatch) {
    const username = subMatch[1].toLowerCase();
    const subscribed = await toggleUserSubscription(fromId, username);
    try {
      await api.answerCallbackQuery({
        callback_query_id: cq.id,
        text: subToggledToast(lang, subscribed),
      });
    } catch (e) {}
    if (cq.message?.chat?.id && cq.message?.message_id) {
      try {
        await api.editMessageReplyMarkup({
          chat_id: cq.message.chat.id,
          message_id: cq.message.message_id,
          reply_markup: buildChannelCardKeyboard(lang, username, subscribed),
        });
      } catch (e) {}
    }
    return { action: 'sub_toggle', username, subscribed, userId: fromId };
  }

  const unsubMatch = data.match(/^unsub:([a-z0-9_]{5,32})$/i);
  if (unsubMatch) {
    const username = unsubMatch[1].toLowerCase();
    await unsubscribeUser(fromId, username);
    try {
      await api.answerCallbackQuery({
        callback_query_id: cq.id,
        text: notifyUnsubDoneText(lang, username),
      });
    } catch (e) {}
    if (cq.message?.chat?.id && cq.message?.message_id) {
      const remaining = await getUserSubscriptions(fromId);
      const mgr = buildNotifyManagerPayload(lang, remaining);
      try {
        await api.editMessageText({
          chat_id: cq.message.chat.id,
          message_id: cq.message.message_id,
          text: mgr.text,
          reply_markup: mgr.reply_markup,
        });
      } catch (e) {}
    }
    return { action: 'unsub', username, userId: fromId };
  }

  const m = data.match(/^sug_(ok|no):(\d+)$/);
  if (!m) return null;

  if (!OWNER_ID || fromId !== OWNER_ID) {
    try {
      await api.answerCallbackQuery({
        callback_query_id: cq.id,
        text: 'Not allowed.',
        show_alert: true,
      });
    } catch (e) {}
    return { allowed: false, userId: fromId };
  }

  const isApprove = m[1] === 'ok';
  const id = Number(m[2]);
  const row = await db.select().from(suggestions).where(eq(suggestions.id, id)).get();
  if (!row) {
    try {
      await api.answerCallbackQuery({ callback_query_id: cq.id, text: 'Suggestion not found.' });
    } catch (e) {}
    return { found: false, id };
  }

  if (row.status !== 'pending') {
    try {
      await api.answerCallbackQuery({ callback_query_id: cq.id, text: `Already ${row.status}.` });
    } catch (e) {}
    return { alreadyDecided: true, id, status: row.status };
  }

  const nextStatus = isApprove ? 'approved' : 'rejected';
  const decidedAt = Math.floor(Date.now() / 1000);
  await db
    .update(suggestions)
    .set({ status: nextStatus, decidedAt })
    .where(eq(suggestions.id, id))
    .run();

  try {
    await api.answerCallbackQuery({
      callback_query_id: cq.id,
      text: isApprove ? 'Approved' : 'Rejected',
    });
  } catch (e) {}

  const outcomeLabel = isApprove ? 'APPROVED' : 'REJECTED';
  const updatedText = `${formatModerationMessage(row)}\n\nStatus: ${outcomeLabel}`;
  if (cq.message?.chat?.id && cq.message?.message_id) {
    try {
      await api.editMessageText({
        chat_id: cq.message.chat.id,
        message_id: cq.message.message_id,
        text: updatedText,
      });
    } catch (e) {}
  }

  try {
    const submitter = await db
      .select({ languageCode: users.languageCode })
      .from(users)
      .where(eq(users.telegramId, row.submittedBy))
      .get();
    const userLang = submitter?.languageCode || 'en';
    await api.sendMessage({
      chat_id: row.submittedBy,
      text: suggestDecisionUserText(userLang, isApprove, row.title || '@' + row.username, row.username),
    });
  } catch (e) {}

  return { id, username: row.username, status: nextStatus };
}
