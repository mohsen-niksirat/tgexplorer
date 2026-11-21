import { table, integer, text, boolean, unique, sql } from 'sdk/db';

export const users = table('users', {
  telegramId:       integer('telegram_id').primaryKey(),
  languageCode:     text('language_code'),
  firstSeen:        integer('first_seen', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  lastSeen:         integer('last_seen', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  lastStartParam:   text('last_start_param'),
  pendingState:     text('pending_state'),
  pendingExpiresAt: integer('pending_expires_at'),
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

export const inlineShares = table('inline_shares', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userId:    integer('user_id').notNull(),
  query:     text('query'),
  username:  text('username').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const inlineQueries = table('inline_queries', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userId:    integer('user_id').notNull(),
  query:     text('query'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const suggestions = table('suggestions', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  username:    text('username').notNull().unique(),
  title:       text('title'),
  members:     integer('members').default(0),
  description: text('description'),
  submittedBy: integer('submitted_by').notNull(),
  status:      text('status').notNull().default('pending'),
  createdAt:   integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  decidedAt:   integer('decided_at'),
});

export const subscriptions = table('subscriptions', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  userId:     integer('user_id').notNull(),
  username:   text('username').notNull(),
  lastPostId: text('last_post_id'),
  createdAt:  integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  userChannelUq: unique('uq_subscriptions_user_channel').on(t.userId, t.username),
}));

export const notifyState = table('notify_state', {
  username:   text('username').primaryKey(),
  lastPostId: text('last_post_id').notNull(),
  updatedAt:  integer('updated_at').notNull(),
});

export const notifyLog = table('notify_log', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  userId:     integer('user_id').notNull(),
  username:   text('username').notNull(),
  postsCount: integer('posts_count').notNull(),
  sentAt:     integer('sent_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const botConfig = table('bot_config', {
  key:       text('key').primaryKey(),
  value:     text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
