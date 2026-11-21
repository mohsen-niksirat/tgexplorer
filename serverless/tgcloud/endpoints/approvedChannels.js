import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { botConfig, suggestions } from '../schema.js';
import { formatMembersShort } from '../lib/channel.js';
import { OWNER_ID } from '../lib/suggest.js';

export default async function (input, ctx) {
  const isOwnerCtx = Boolean(OWNER_ID && ctx?.initData?.user?.id === OWNER_ID);
  if (!isOwnerCtx) {
    const provided = String(input?.secret || ctx?.headers?.['x-notify-secret'] || '');
    const row = await db
      .select({ value: botConfig.value })
      .from(botConfig)
      .where(eq(botConfig.key, 'notify_secret'))
      .get();
    if (!row || !provided || provided !== row.value) {
      throw new EndpointError('Unauthorized', { code: 'UNAUTHORIZED' });
    }
  }

  const rows = await db
    .select()
    .from(suggestions)
    .where(eq(suggestions.status, 'approved'))
    .all();

  return {
    ok: true,
    channels: rows.map(r => ({
      username: String(r.username || '').toLowerCase(),
      title: r.title || `@${r.username}`,
      members: formatMembersShort(r.members) || String(r.members || '0'),
      description: r.description || '',
    })),
  };
}
