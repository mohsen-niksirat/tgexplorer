import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { botConfig } from '../schema.js';
import { checkNotifications } from '../lib/notify.js';
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

  return await checkNotifications({
    postsMap: input?.postsMap,
    dryRun: Boolean(input?.dryRun),
  });
}
