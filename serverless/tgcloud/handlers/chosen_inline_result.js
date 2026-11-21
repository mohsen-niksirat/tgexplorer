import { db } from 'sdk';
import { inlineShares } from '../schema.js';

export default async function (chosen) {
  if (!chosen || !chosen.result_id) return null;
  const username = String(chosen.result_id).trim().toLowerCase();
  if (!username || username === '__no_match__') return null;

  await db
    .insert(inlineShares)
    .values({
      userId: chosen.from?.id || 0,
      query: String(chosen.query || '').trim().slice(0, 200),
      username,
    })
    .run();

  return { logged: true, username };
}
