import { table, integer, text, sql } from 'sdk/db';

export const users = table('users', {
  telegramId:     integer('telegram_id').primaryKey(),
  languageCode:   text('language_code'),
  firstSeen:      integer('first_seen', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  lastSeen:       integer('last_seen', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  lastStartParam: text('last_start_param'),
});
