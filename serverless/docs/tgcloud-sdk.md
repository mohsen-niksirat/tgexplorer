# tgcloud SDK reference

Everything your bot's modules can import from `sdk`: the database (`db`), the
Telegram Bot API (`api`), HTTP (`fetch`), and `console` logging. The database is
the largest surface, so it comes first; `api`, `fetch`, and `console` are at the
end.

> Orientation and project rules live in [../AGENTS.md](../AGENTS.md). This file is
> the API reference.

## `sdk` at a glance

```js
import { db, api, fetch, InputFile, BotApiError, EndpointError } from 'sdk'
// or from submodules:
import { table, integer, text, eq, sql } from 'sdk/db'
import { api } from 'sdk/api'
import { fetch } from 'sdk/fetch'
```

- **`db`** — SQLite query builder + schema DSL. → most of this file.
- **`api`** — Telegram Bot API (`api.sendMessage(...)`). → *Telegram Bot API* below.
- **`fetch`** — outbound HTTP. → *HTTP* below.
- **`InputFile`** — a file (bytes + name) to upload, for `api` or `fetch`. → *Files* below.
- **`EndpointError`** — refuse a Mini App's call from an `endpoints/` module. → *Endpoints* below.
- **`console`** — logging that surfaces in `npx tgcloud run` output. → *Logging* below.

## Rules that bite

The runtime is not stock Node — these defaults don't hold. Detail is in the
sections below; project rules are in [../AGENTS.md](../AGENTS.md).

- **Import project modules by relative path with `.js`** — `from '../schema.js'`, `from '../lib/cart.js'` (a relative import without `.js` fails). The SDK is imported by name: `from 'sdk'`, `from 'sdk/db'`.
- **Every DB call is async — always `await`.** `.all()`/`.get()`/`.values()`/`.run()`, `db.$count()`, and raw `db.run/all/get` all return Promises. A forgotten `await` returns the builder, not rows.
- **No foreign keys.** `.references()` and table-level `foreignKey()` **throw when declared** — a schema using them won't deploy. Enforce integrity in app code.
- **Drops happen only via `.deprecated('reason')`** on a column/table/index. Deleting the declaration does *not* drop it; type changes are manual (`db.run(...)`).
- **A handler's `export default (input, ctx)`** gets the update's *payload* as `input` — `handlers/message` receives the `Message` (i.e. `update.message`), `handlers/callback_query` the `CallbackQuery`. The full `Update` (with `update_id`) is `ctx.update`.
- **An endpoint's `export default (input, ctx)`** gets the Mini App's JSON body as `input` and the **verified** init data as `ctx.initData` (`ctx.initData.user` is the caller). There is no `ctx.user`. → *Endpoints* below.

# Database (`db`)

## Importing

`db` (the default export of `sdk/db`) holds the whole API; the same functions are
also named exports.

```js
import { table, integer, text, eq, sql } from 'sdk/db'   // named imports
import db, { sql } from 'sdk/db'                          // or namespace + names
```

Import your own modules by relative path with the `.js` extension — from a
handler, `from '../schema.js'`, `from '../lib/cart.js'`.

## Defining the schema (`tgcloud/schema.js`)

Tables are **named exports**. `table()` builds a descriptor at runtime (no DB call);
the platform discovers the exported tables and runs migrations when you deploy
`schema.js` (the file `tgcloud/schema.js`; module name `schema`).

```js
import { table, integer, text, boolean, json, index, check, sql } from 'sdk/db'

export const users = table('users', {
  id:      integer('id').primaryKey({ autoIncrement: true }),
  tgId:    integer('tg_id').unique(),
  name:    text('name').notNull(),
  lang:    text('lang').default('en'),
  isAdmin: boolean('is_admin').default(false),
  prefs:   json('prefs'),
  created: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  createdIdx: index('idx_users_created').on(t.created),
}))

export const todos = table('todos', {
  id:     integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),   // logical link to users.id — FKs are NOT enforced
  text:   text('text').notNull(),
  done:     boolean('done').default(false),
  priority: integer('priority').default(0),
}, (t) => ({
  userDoneIdx:   index('idx_todos_user_done').on(t.userId, t.done),
  priorityCheck: check('priority_check', sql`${t.priority} >= 0`),
}))
```

The third argument to `table()` is a callback `(t) => ({...})` where `t` exposes the
columns (`t.userId` → a column ref); declare indexes and table-level constraints there.

## Column types

| factory     | SQLite | notes                                          |
|-------------|--------|------------------------------------------------|
| `text()`    | TEXT   |                                                |
| `integer()` | INTEGER|                                                |
| `real()`    | REAL   | alias `float()`                                |
| `numeric()` | NUMERIC|                                                |
| `blob()`    | BLOB   | takes/returns `Uint8Array`                     |
| `boolean()` | INTEGER| stored 0/1, read as `true`/`false`             |
| `json()`    | TEXT   | auto `JSON.stringify` / `JSON.parse`           |

Signature: `integer(name?, opts?)`. The name is optional — if omitted it's taken
from the JS key. `opts.mode` sets runtime conversion:

| mode           | stored as          | JS value              |
|----------------|--------------------|-----------------------|
| `boolean`      | INTEGER 0/1        | `boolean`             |
| `json`         | TEXT (JSON)        | any object/array      |
| `timestamp`    | INTEGER (unix sec) | `Date`                |
| `timestamp_ms` | INTEGER (unix ms)  | `Date`                |
| `bytes`        | BLOB               | `Uint8Array`          |

`boolean()` and `json()` are sugar over `integer(name, { mode: 'boolean' })` and
`text(name, { mode: 'json' })`. A `blob()` column takes and returns a `Uint8Array`
automatically — that's handled at the wire level, so it needs no mode.

## Column modifiers (chainable)

```js
integer('id').primaryKey()
integer('id').primaryKey({ autoIncrement: true })
text('name').notNull()
text('tg').unique()
text('lang').default('en')
integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
text('slug').generatedAlwaysAs(sql`lower(name)`, { mode: 'stored' })  // 'virtual' | 'stored'
text('name').constraint('COLLATE NOCASE')       // arbitrary column-level DDL
text('email').deprecated('replaced by login')   // marks for drop; invisible at runtime
```

- `.default()` on a `json()` column encodes the value automatically; a `` sql`...` ``
  default is passed through verbatim.
- `.deprecated()` is terminal — don't chain methods after it.

## No foreign keys

The runtime runs with `PRAGMA foreign_keys` **off**, so a declared FK would be
silently inert (no cascades, no orphan protection). To make that impossible,
`.references()` and table-level `foreignKey()` **throw when declared** — a schema
using them won't deploy. `REFERENCES`/`FOREIGN KEY` smuggled in via `.constraint()`
or a raw `db.run('CREATE TABLE …')` stay inert too. Enforce integrity in app code:
delete children before parents, insert parents before children, sweep orphans with
`LEFT JOIN … WHERE parent.id IS NULL`.

## Table-level constraints & indexes (in the callback)

```js
table('t', { ... }, (t) => ({
  pk:    primaryKey({ columns: [t.a, t.b] }),
  uq:    unique('uq_email').on(t.email),
  chk:   check('chk_done', sql`${t.done} in (0, 1)`),
  idx:   index('idx_name').on(t.col),
  uidx:  uniqueIndex('uidx_email').on(t.email),
  lower: index('idx_lower').on(sql`lower(${t.email})`),          // expression index
  active:index('idx_active').on(t.userId).where(sql`done = 0`),  // partial index
  // foreignKey(...) is NOT supported — it throws (see "No foreign keys")
}))
```

Table modifiers (chained after `table(...)`): `.strict()`, `.withoutRowid()`,
`.constraint('CHECK (x > 0)', 'chk_x')`, `.deprecated('reason')`.

## Query builder

### select

`select(projection?)` → `.from(table)` → builder. No projection = `SELECT *`.

```js
await db.select().from(todos).all()                          // all rows
await db.select().from(todos).where(eq(todos.id, 1)).get()   // first row or null
await db.$count(todos)                                        // COUNT(*)

await db.select().from(todos)
  .where(and(eq(todos.userId, uid), eq(todos.done, false)))
  .orderBy(desc(todos.priority), asc(todos.id))
  .limit(10).offset(20)
  .all()

// projection: { alias: colRef | sqlExpr }
await db.select({ id: todos.id, title: todos.text, n: sql`count(*)` })
  .from(todos).groupBy(todos.userId).having(sql`count(*) > ${1}`).all()
```

Chain: `.where()` `.orderBy()` `.limit()` `.offset()` `.groupBy()` `.having()`
`.distinct()`; terminals `.all()` / `.get()` / `.values()`.

The builder is **awaitable** — `await db.select().from(todos)` (with `.where(…)`
etc. as needed) runs `.all()` and resolves to the row array, so `.all()` is
optional. Use `.get()`/`.values()` for the other shapes; count rows with
`db.$count(table, where?)`.

### insert / update / delete

```js
await db.insert(todos).values({ userId: 1, text: 'Buy milk' }).run()
await db.insert(todos).values([{ text: 'A' }, { text: 'B' }]).run()   // batch
await db.insert(todos).values({ text: 'X' }).returning().run()        // RETURNING *

await db.insert(users).values({ tgId: 42, name: 'Ann' })
  .onConflictDoNothing({ target: users.tgId }).run()
await db.insert(users).values({ tgId: 42, name: 'Ann' })
  .onConflictDoUpdate({ target: users.tgId, set: { name: 'Ann' } }).run()

await db.update(todos).set({ done: true }).where(eq(todos.id, 1)).run()   // .set() required
await db.delete(todos).where(eq(todos.id, 1)).run()
```

A plain insert/update/delete resolves to a **run result**:

```js
await db.insert(todos).values({ text: 'buy milk' })
// → { rowsAffected: 1, lastInsertRowid: 42, rows: [] }
```

Add `.returning()` (→ `RETURNING *`) or `.returning({ id: todos.id })` to get the
affected rows back instead (converted, since they're bound to the table) — with
`.returning()` the result **is** the row array, not the run result:

```js
await db.insert(todos).values({ text: 'buy milk' }).returning({ id: todos.id })
// → [{ id: 42 }]
```

Nothing is lost by that swap: `RETURNING` emits one row per affected row, so
`rows.length` *is* the affected count, and the ids come back directly rather than
as a single `lastInsertRowid`. Like select, these builders are **awaitable**:
`await db.insert(todos).values({ … })` runs without an explicit `.run()`.

### Raw SQL — `db.run` / `db.all` / `db.get` / `db.values`

Mode is by method, not auto-detected: `run` = write/exec, `all` = all rows,
`get` = first row (or `null`), `values` = rows as positional arrays. Each takes a
`` sql`…` `` object or a `(queryString, params)` pair.

```js
await db.run('UPDATE todos SET done = 1 WHERE id = :id', { ':id': 5 })
// → { rowsAffected: 3, lastInsertRowid: 0, rows: [] }

await db.run(sql`INSERT INTO todos (text) VALUES (${'buy milk'}) RETURNING id`)
// → { rowsAffected: 1, lastInsertRowid: 42, rows: [{ id: 42 }] }

await db.all(sql`SELECT * FROM todos WHERE done = ${false}`)   // → [{ id: 1, … }]
await db.get(sql`SELECT count(*) AS c FROM todos`)             // → { c: 7 } | null
await db.values(sql`SELECT id, text FROM todos`)               // → [[1, 'buy milk']]
```

Use `db.values` when a query projects two columns of the **same name** — a join
like `SELECT u.id, o.id` — because `db.all` keys rows by column name and the
second `id` overwrites the first. Positional rows have no such collision.

> Raw methods are **not bound to a table**, so rows come back without mode
> conversion (boolean/json/timestamp arrive as 0/1, a JSON string, unix seconds).
> Only the table-bound builder converts.

## `sql` tagged template

`` sql`...` `` interpolates values as named parameters, column refs as identifiers,
and splices nested `sql`.

```js
sql`count = ${n}`                 // count = :p1
sql`${todos.priority} > ${min}`   // priority > :p2  (column as identifier)
sql`WHERE ${cond}`                // nested sql spliced in
sql.raw('datetime("now")')        // literal, no parameters
```

In DDL contexts (DEFAULT / CHECK / GENERATED) parameters don't work — use literal SQL.

## Operators

Import from `sdk/db`:

```js
import {
  eq, ne, gt, gte, lt, lte,
  like, notLike,
  isNull, isNotNull, and, or, not,
  between, notBetween, inArray, notInArray,
  count, sum, avg, min, max,
  asc, desc,
} from 'sdk/db'
```

`.where(e1, e2)` with multiple args is equivalent to `and(e1, e2)`.

## Migrations (summary)

- **Adding** columns/tables/indexes — applied automatically on `npx tgcloud migrate`
  after you deploy `schema.js`.
- **Dropping** — only via `.deprecated()`; the CLI shows what will be removed.
- **Changing a column's type** — not automatic; do it manually with `db.run`.

`npx tgcloud push` reports pending DB changes but never applies them. Run
`npx tgcloud migrate` to apply.

# Telegram Bot API (`api`)

`import { api, BotApiError } from 'sdk'`. Call any Bot API method as
`api.<method>(params)` — a Proxy dispatches the name, so every current (and
future) method works with no SDK update.

```js
const me = await api.getMe()                          // → the unwrapped `result`
await api.sendMessage({ chat_id: id, text: 'Hello!' })
await api.editMessageText({ chat_id, message_id, text: 'Updated' })
await api.answerCallbackQuery({ callback_query_id, text: 'Done' })
```

- **The envelope is unwrapped.** On `{ ok: true }` the call resolves to `result`
  directly — no `.ok`/`.result` wrapper. Params are one object using the Bot API's
  snake_case names (`chat_id`, `message_id`, …).
- **Failures throw `BotApiError`.** On `{ ok: false }` it throws; the error carries
  `.code` (Bot API `error_code` — 400/403/429/…), `.description`, `.method`, and
  `.parameters` (e.g. `retry_after` on 429, `migrate_to_chat_id`). Catch and inspect
  `.code` to handle an expected failure:

```js
try {
  await api.deleteMessage({ chat_id, message_id });
} catch (e) {
  if (e.code !== 400) throw e;   // 400 = already gone; anything else is a real error
}
```

## Files (upload / download)

Move file **bytes**, not just `file_id`s.

- **Upload — `InputFile`.** `import { InputFile } from 'sdk'`. `new InputFile(bytes, filename, { type })` (bytes = `Uint8Array`/`ArrayBuffer`; `type` = optional MIME). Pass it as any file param, at **any depth** — the SDK rewrites it to a real multipart upload:

```js
await api.sendDocument({ chat_id, document: new InputFile(bytes, 'a.pdf', { type: 'application/pdf' }) })
await api.sendMediaGroup({ chat_id, media: [
  { type: 'photo', media: new InputFile(a, 'a.jpg', { type: 'image/jpeg' }) },
  { type: 'photo', media: new InputFile(b, 'b.jpg', { type: 'image/jpeg' }) },
]})
```
  Bot API upload limits apply: currently **50 MB**/file (**10 MB** for a photo).

- **Download — by `file_id` only** (a raw `file_path` is rejected):

```js
const bytes = await api.getFileContent(file_id)          // → Uint8Array (whole file)
const stream = await api.getFileStream(file_id)          // { file, body, bytes(), bodyUsed }
stream.file.file_unique_id                               // getFile info, minus file_path
for await (const chunk of stream.body) { /* Uint8Array */ }   // or: await stream.bytes()
```
  Accepts a `file_id` string or `{ file_id }`. `getFile` cap is **20 MB**. A bad/expired `file_id` throws `BotApiError` (`.code === 400`) — the same failure as a direct `api.getFile`.

# HTTP (`fetch`)

`import { fetch } from 'sdk'`. A `fetch`-like client for outbound HTTP.

```js
const res = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice' }),
});
if (!res.ok) throw new Error(res.statusText);
const data = await res.json();
```

The response: `res.status`, `res.statusText`, `res.ok` (true for 200–299),
`res.url`, `res.headers` (`.get()` / `.has()` / `.keys()` / `.entries()`), and body
readers `await res.json()` / `await res.text()`. Or stream:
`for await (const chunk of res.body)`.

Body helpers set the matching `Content-Type` for you:

```js
await fetch(url, { method: 'POST', body: fetch.body.json({ a: 1 }) }); // application/json
await fetch(url, { method: 'POST', body: fetch.body.form({ a: 1 }) }); // x-www-form-urlencoded
await fetch(url, { method: 'POST', body: fetch.body.text('hi') });     // text/plain
```

A request `body` can also be binary/files — a `Uint8Array`, an `InputFile`, or a
`FormData` (multipart); the bytes stream out (same upload plumbing as `api`):

```js
import { fetch, FormData, InputFile } from 'sdk'
const form = new FormData()
form.append('file', new InputFile(bytes, 'photo.jpg', { type: 'image/jpeg' }))
form.append('caption', 'hi')
await fetch(url, { method: 'POST', body: form })
```

Notes: a body can be read **once** — a second `.json()`/`.text()`/stream throws
`TypeError: body used already` (check `res.bodyUsed`). Redirects are followed
automatically (web-parity) — `res.url` is the final URL after any hops. A 404 (or
any HTTP status) resolves normally with `res.ok === false`; only real network
errors (bad host, invalid URL) reject.

# Logging (`console`)

Plain `console` works, and its output shows up in `npx tgcloud run`:

```js
console.log('processing', { chatId: id });  // log / debug — plain
console.info('started');                     // info  — blue
console.warn('rate limited');                // warn  — yellow
console.error(err);                          // error — red, includes a stack
```

Each line is tagged with its `[file:line]`. `console.error` and `console.trace`
append a full stack trace; `console.warn` does not.

# Endpoints (`endpoints/`)

A module in `tgcloud/endpoints/<name>.js` is called by the bot's Mini App as
`POST /api/<name>` (same host as the static site). Names are identifier-like:
letters, digits, `_`, not starting with a digit — `getProfile`, `place_order`.

```js
// tgcloud/endpoints/getProfile.js
import { db, EndpointError } from 'sdk'
import { eq } from 'sdk/db'
import { profiles } from '../schema.js'

export default async function (input, ctx) {
  const user = ctx.initData.user            // verified by the platform
  const row = await db.select().from(profiles).where(eq(profiles.userId, user.id)).get()
  if (!row) throw new EndpointError('Profile not found', { code: 'NOT_FOUND' })
  return row                                // → { ok: true, result: row }
}
```

- `input` — the JSON object the Mini App sent (always an object).
- `ctx.initData` — same shape as `Telegram.WebApp.initDataUnsafe` on the client
  (`user`, `chat`, `start_param`, `auth_date`, …), but verified: a call without
  valid init data gets `401` and the endpoint never runs.
- Return value → JSON `result`.
- `throw new EndpointError(description, parameters?)` → `400`,
  `{ ok: false, error_type: "ENDPOINT_ERROR", description, parameters }`.
  `description` must be a string and `parameters` a plain object (a `TypeError`
  otherwise, at the throw site). Put a machine-readable code in `parameters`.
- Any other exception → `500`, `error_type: "INTERNAL"`, generic text; the real
  message is only in the logs.

Calling it from the front-end — the official `telegram-web-app.js` sends the
init data for you:

```js
Telegram.WebApp.Serverless.call('getProfile', { lang: 'en' }, function (err, profile) {
  if (err) {
    // err.message = description, err.type = error_type ('ENDPOINT_ERROR' = your
    // EndpointError; anything else is the platform's), err.parameters
    return
  }
  // use profile
})
```

Test without the Mini App — `run` passes `--ctx` through unverified:

```
npx tgcloud run endpoints/getProfile '{}' --ctx '{ initData: { user: { id: 1 } } }'
```
