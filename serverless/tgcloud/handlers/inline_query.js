import { api, db } from 'sdk';
import { inlineQueries } from '../schema.js';
import { getVerifiedChannelsList } from '../lib/channel.js';
import { buildAnswerInlinePayload } from '../lib/inline.js';

export default async function (inlineQuery) {
  if (!inlineQuery || !inlineQuery.id) return null;

  try {
    await db
      .insert(inlineQueries)
      .values({
        userId: inlineQuery.from?.id || 0,
        query: String(inlineQuery.query || '').trim().slice(0, 200),
      })
      .run();
  } catch (e) {}

  const channels = await getVerifiedChannelsList();
  const payload = buildAnswerInlinePayload(inlineQuery, channels);

  try {
    await api.answerInlineQuery(payload);
  } catch (e) {}

  return payload;
}
