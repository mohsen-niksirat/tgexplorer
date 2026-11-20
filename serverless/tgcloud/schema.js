import { table, integer, text, boolean, sql } from 'sdk/db';

export const users = table('users', {
  telegramId:     integer('telegram_id').primaryKey(),
  languageCode:   text('language_code'),
  firstSeen:      integer('first_seen', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  lastSeen:       integer('last_seen', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  lastStartParam: text('last_start_param'),
});

export const channelCache = table('channel_cache', {
  username:    text('username').primaryKey(),
  title:       text('title'),
  description: text('description'),
  image:       text('image'),
  subs:        text('subs'),
  verified:    boolean('verified').default(false),
  fetchedAt:   integer('fetched_at').notNull(),
});

export const channelOpens = table('channel_opens', {
  id:       integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  userId:   integer('user_id').notNull(),
  openedAt: integer('opened_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});
