# 🔍 Telegram Explorer

Search and discover public Telegram channels and groups — like Instagram Explore, but for Telegram.

[![Crawl Channel Posts](https://github.com/mohsen-niksirat/tgexplorer/actions/workflows/crawl.yml/badge.svg)](https://github.com/mohsen-niksirat/tgexplorer/actions/workflows/crawl.yml)
[![Refresh Channel Avatars](https://github.com/mohsen-niksirat/tgexplorer/actions/workflows/avatars.yml/badge.svg)](https://github.com/mohsen-niksirat/tgexplorer/actions/workflows/avatars.yml)

## ✨ Features

- 🔍 **Smart Search** — fuzzy matching (typo-tolerant) + Persian/English language filter
- 🏠 **Explore** — browse 151 **verified** public channels by category (every one checked live against t.me)
- 🇮🇷 **Persian & English** channels — BBC Persian, Radio Farda, Tabnak, Varzesh3, Digiato/TechNolife tech + NYT, Guardian, Sky News, NASA-level English channels
- 📱 **Instagram-like grid** view with language badges on every card
- ❤️ **Favorites** — save channels locally
- 🌙 **Dark / Light** mode · 🌍 **7 Languages** · 📱 **Responsive**
- 📄 **Works out of the box** — no worker required (local mode is the default)
- 🧪 **`verify_channels.js`** — re-validate every channel in the database against t.me

## 🚀 Deploy your own Worker (optional)

Live search, live trending and notifications use a Cloudflare Worker proxy. Everything else (Explore, Home feed, folders, favorites, folder sharing, the local 61-channel search) works **without any worker**.

### One-click deploy
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/mohsen-niksirat/tgexplorer)

This repo ships a ready-made [`worker.js`](worker.js) + [`wrangler.toml`](wrangler.toml). After deploying, copy your `https://xxx.workers.dev` URL and paste it in the app: **⚙️ Settings → Worker Proxy URL → Save**.

### Manual deploy
1. Go to [Cloudflare](https://dash.cloudflare.com) → **Workers & Pages** → **Create Worker**.
2. Delete the default code and paste the whole [`worker.js`](worker.js).
3. *(Optional)* Add `TG_API_ID` / `TG_API_HASH` secrets from [my.telegram.org](https://my.telegram.org) — the worker works without them for public channels. **Never hardcode credentials in the code.**
4. Click **Save and Deploy**, copy your worker URL and paste it in the app settings.

### Worker endpoints
- `GET /api/ping` — health check
- `GET /api/search?q=...&lang=...` — live Telegram search
- `GET /api/posts/<username>?page=N` — paginated channel posts
- `GET /api/trending?cat=...&page=1&lang=...` — trending channels
- `GET /api/notifications?channels=a,b&since=...` — new-post updates
- `GET /api/explore-feed?cat=...&page=1&limit=30` — merged image feed
- `GET /api/channel/<username>` · `/api/stats/<username>` · `/api/related/<username>` · `/api/avatar/<username>`

## 📦 Changelog

### v1.6.0

- 📡 **+37 verified channels (114 → 151)** — each candidate checked live
  against t.me (DW فارسی، The Verge، Bloomberg، TradingView، Glassnode،
  Epic Games Store، Astronomy Picture of the Day، Pavel Durov، Telegram Tips،
  MotoGP، Quanta Magazine، تپسی، گجت نیوز و…); duplicate Netflix entry removed
- 🛢 **3-day rolling retention** — the crawler now drops posts older than
  `RETENTION_DAYS` (default 3) from the archive on every run, so crawled data
  auto-expires in GitHub and the repo never bloats (undated posts are kept)
- 🖼 **Feed works without a worker + infinite scroll** — the Feed tab now
  builds a shuffled image/video feed from the local post archive (previously
  it was worker-only), and both local and worker modes load more content as
  you scroll, so Explore no longer "runs out" quickly
- 📄 **Text post previews + full-text popup** — text-only channel cards show a
  3-line preview on the grid, home feed clamps long texts, and a 📄 button /
  tap opens a popup with the complete text plus copy and Telegram links
- 🔍 **Search autocomplete** — instant channel suggestions under the search box
  (fuzzy, language-aware) with tap-to-open
- 🎲 **Random channel** — a chip on the hero that opens a random verified channel
- 🔗 **Local related channels** — the channel modal now shows tag-based related
  channels even without a worker
- ☁️ **Optional Cloudflare KV cache** — bind a KV namespace as `CACHE_KV` to
  give the worker a persistent cache (survives cold starts); falls back to
  in-memory when not bound; new "Free services" section in the README
- 🧭 Inspiration from similar projects (TeleSearch, searchkit, directory apps):
  multi-type content discovery (our Feed/Explore), instant search, trending
  queries and related-channel suggestions

### v1.5.1

- 🪶 **73% lighter initial load** — `posts.js` is now a small inline seed
  (latest 12 posts per channel, 2.4 MB → ~650 KB); the full 50-post archive
  lives in `posts/<username>.json`, one file per channel, fetched on demand
  and cached by the service worker. Scrolling older posts in local mode now
  reads the archive instead of scraping r.jina.ai (which stays as fallback)
- 🔐 **Security fix** — hardcoded Telegram `API_ID`/`API_HASH` removed from
  `worker.js`; the worker now reads optional `TG_API_ID` / `TG_API_HASH`
  environment secrets instead (never commit credentials)
- 📊 **Real stats & notifications** — `/api/stats` chart and
  `/api/notifications` no longer return random data; post dates are parsed
  from t.me and used to build the 7-day activity chart and detect genuinely
  new posts (worker **v3.2**)
- 🛡 **Rate limiting** — simple per-IP rate limit (60 req/min) on all worker
  endpoints, embedded setup-worker copy synced
- 🐛 **Search dedup fix** — `/api/search` no longer duplicates results 10–15
- 📝 **README cleanup** — removed the duplicated/outdated "Project Structure"
  section and refreshed channel counts (114 verified channels)

### v1.5.0

- 🎨 **Gradient initial-letter avatars** — channels without a t.me photo get a
  deterministic per-channel gradient tile (8 palettes hashed by username) across
  grid, list, modals, folders, home feed and notifications; channel modals also
  show the real avatar image when available
- 🎙️ **New Explore categories: Podcast & Cinema** — chips translated in all 7
  languages, with 8 freshly verified channels (پادکست رخ, رادیو زمانه,
  Lex Fridman, ایران فیلم, Кинопоиск, Netflix, MOVIE CLIPS, MOVIE TRAILERS);
  the channel DB now holds 114 verified channels
- 🪶 **Compact hero** — slimmer header (smaller title/subtitle/search, less
  padding); the search-tag chip row is removed on mobile
- 🖼 **+45 verified channels** (61 → 106) — validated live against t.me
- 🔄 **Avatars refreshed & network-first** — avatars.js is now served network-first

### v1.4.0

- 🗂 **Explore list view** — switch between grid (▦) and list (☰) with a single
  toggle; rows show a thumbnail, title, @username, post-type badge and post count
- 🌐 **Global grid/list view** — the selected view applies consistently across
  Explore, Favorites, Home, Feed and Search (remembered in localStorage)
- 🔍 **Instant search in Explore list** — live filtering of channels by title or
  username as you type, with an empty-state message
- 🎬 **Saved-posts type filter** — All / Clips / Photos / Text chips combined with
  sorting
- 📊 **Favorites stats bar** — favorite channels, total saved posts and a
  video/photo/text breakdown, updated live

### v1.3.0

- 🖼 **Real channel avatars everywhere** — reliable avatar extraction in the worker
  (`tgme_page_photo_image` / `og:image`) + local-mode avatars via `avatars.js`,
  refreshed daily by a new **Refresh Channel Avatars** workflow; channels without a
  photo get a generated initial-letter avatar
- 🤖 **Crawl every 3 hours** (was 6 h) — after a crawl with new data the
  **service-worker cache version is bumped automatically**, so clients always pick
  up fresh posts
- 🌐 **Network-first data** — `posts.js` / `channels.js` served fresh from the
  network (cached copy only when offline)
- 🔔 **Failure alerts** — a failed crawl workflow automatically opens a GitHub Issue
  with a link to the failed run logs
- 🛡 **Race-proof automation** — workflow pushes retry (fetch/rebase/push loop),
  fixing the push-race failure seen in an earlier run
- 🐛 **Emoji placeholder fix** — text-only posts no longer render t.me emoji images
  as media (data cleaned + crawler fixed + render guard)
- 🐛 **Worker fixes** — post parsing, direct-channel search match, DDG parsing and a
  curated fallback so live search (incl. Persian) never returns empty; worker **v3.1**

> 📜 Older versions (v1.2.0, v1.1.0, v1.0.0) are archived in [CHANGELOG.md](CHANGELOG.md).

## 🚀 Quick Start

### Option 1: Local mode (default — no setup)

Just open `index.html` (or deploy to GitHub Pages). The app starts with a **verified database of 151 real channels** and full fuzzy search + language filter — no worker, no API key.

### Option 2: With Cloudflare Worker (full power — live Telegram search)

#### Step 1: Deploy the Worker

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **Workers & Pages** → **Create Application** → **Create Worker**
3. Name it `telegram-explorer-api` (or anything)
4. Replace the default code with the contents of `worker.js`
5. Click **Save and Deploy**
6. Copy your worker URL (e.g., `https://telegram-explorer-api.your-subdomain.workers.dev`)

#### Step 2: Connect it in the app

Open the app → **⚙️ Settings** → paste your worker URL → **Save**. Or via console:

```javascript
localStorage.setItem('tgexp_worker', 'https://your-worker-url.workers.dev');
```

> Note: the storage key is `tgexp_worker` (older READMEs said `telgram_explorer_worker` — that was a typo).

## ☁️ Free services you can plug in (optional)

| Service | Free tier | What it adds |
|---|---|---|
| **Cloudflare Workers** | 100k req/day | The worker proxy (live search, posts, trending) — core optional backend |
| **Cloudflare KV** | 100k reads + 1k writes/day | Persistent cache for the worker (survives cold starts) — bind as `CACHE_KV`, see `wrangler.toml` |
| **GitHub Pages** | Unlimited static | Hosting for the app itself (already used) |
| **GitHub Actions** | 2000 min/month (public repos: free) | The 3-hour crawl + daily avatar refresh (already used) |
| **Cloudflare Web Analytics** | Free | Privacy-first page views (already wired in `index.html`) |
| **Web Push (service worker)** | Free | Browser notifications for new posts of favorites (client-side, no server needed) |
| **r.jina.ai** | Free | Client-side t.me fallback proxy for older posts without an archive |
| **PWA install** | Free | Installable app on Android/iOS — no store needed |

Other viable free options (not wired yet):
- **Supabase / Neon (Postgres free tier)** — a serverless DB if the JSON-file archive ever outgrows static hosting; the crawler could push there instead of committing.
- **R2 (Cloudflare, 10GB free)** — object storage for the `posts/` archive with the same on-demand pattern.
- **Telegram Bot API** — a bot (@BotFather) can send channel updates via `sendMessage`; pairs with GitHub Actions cron.

## 🌱 Roadmap — ideas for future versions

Ranked by value/effort (community PRs welcome!):

**Quick wins**
- 📥 **Download media** — save post images/videos with the original filename
- 🕒 **Viewed badges** — dim already-opened channels/posts (localStorage)
- 🔤 **Font-size setting** — small/medium/large for post texts
- 📌 **Pin favorites** — keep favorite channels at the top of lists
- 🔗 **Copy post as markdown** — text + image link formatted for sharing

**Medium**
- 💬 **Comments via discussion group** — link each channel post to its tg discussion thread
- 🌐 **Full live mode** — real-time t.me scraping in the worker with pagination on Explore/Home too
- 🤖 **Telegram bot companion** — @BotFather bot that sends new-post digests of favorites (pairs with GitHub Actions cron)
- 🗂 **Shared folders → public pages** — publish a folder as a read-only page with OG image
- 📈 **Real stats** — store per-day post counts over time (the 3-day retention makes historical charts need a KV/R2 counter table)

**Bigger**
- 🔐 **Optional accounts** (Supabase free tier) — sync favorites/folders across devices
- 🔍 **Full-text search over archived posts** — build a client-side lunr/MiniSearch index from `posts/` at first visit
- 🧠 **Semantic "similar channels"** — embed channel descriptions and suggest lookalikes
- 📱 **React Native / Capacitor shell** — publish to stores while reusing 100% of this codebase
- 🌍 **More languages + RTL grid fixes** for ru/zh communities

## 🇮🇷 راهنمای فارسی

### 🚀 چطور از اپ استفاده کنم؟

**بدون نصب و بدون تنظیمات** — فقط سایت رو باز کن:

- 🌐 نسخهٔ آنلاین: `https://mohsen-niksirat.github.io/tgexplorer/`
- ✈️ داخل تلگرام: به بات `@telgexplorerbot` برو و دکمهٔ **Open App** رو بزن (هدر تلگرام حذف میشه و اپ تمام‌صفحه باز میشه)
- 📱 روی گوشی: از منوی مرورگر **«Add to Home Screen / افزودن به صفحه اصلی»** — اپ مثل یه اپ واقعی نصب میشه (PWA)

### 🧭 بخش‌های اپ

| تب | کاربرد |
|---|---|
| 🏠 **خانه** | فید ترکیبی پست‌های کانال‌های موردعلاقه‌ات (جدیدترین اول) + آمار + فیلتر کلیپ/عکس/متن |
| 🌐 **اکسپلور** | مرور کانال‌ها به‌سبک اینستاگرام — روی هر کادر بزنی مودال پست باز می‌شه با پست‌های قبلی همون کانال (اسکرول بی‌نهایت) |
| 🎞️ **فید** | آخرین پست‌های کانال‌ها در قالب گرید تصویری |
| 🔍 **جستجو** | جستجوی فارسی/انگلیسی — محلی (بدون نیاز به worker) یا زندهٔ کامل (با worker) |
| ❤️ **فاووریت‌ها** | کانال‌ها و پست‌های ذخیره‌شده + فولدرهای شخصی (با آیکون و قانون فیلتر خودکار) |

### ⚙️ قابلیت‌های کلیدی

- ❤️ ذخیرهٔ کانال و پست (دکمهٔ قلب روی کارت‌ها و داخل مودال پست)
- 🗂 فولدرهای شخصی برای دسته‌بندی کانال‌ها/پست‌ها + اشتراک‌گذاری فولدر با لینک
- 🤖 «فولدر هوشمند» — با یک کلیک فولدرهای آماده (اخبار فارسی، تکنولوژی، ورزش) ساخته می‌شه
- 📥 خروجی/ورودی JSON برای بکاپ از تنظیمات
- 🔔 اعلان پوش مرورگر برای پست‌های جدید کانال‌های فاووریت
- 🌙 تم تاریک/روشن · 🌍 ۷ زبان · 📱 کاملاً ریسپانسیو

### ☁️ (اختیاری) اتصال Worker برای جستجوی زنده

اپ بدون worker هم کامل کار می‌کنه. برای جستجوی زندهٔ کل تلگرام:
`⚙️ تنظیمات` → آدرس worker خودت رو وارد کن (راهنمای دیپلوی در بخش «Deploy your own Worker» بالا) → **ذخیره**.

## 🧪 Verifying the channel database

```bash
node verify_channels.js
```

Checks every channel in `channels.js` live against `t.me/s/<username>`:
- `OK` — real public channel (title matched)
- `USER` — username exists but is a user/bot, not a channel
- `FAIL` — no public channel with this username

To add channels: add an entry to `channels.js` and re-run the script.

## 🤖 Automated crawl (every 3 hours)

A GitHub Actions workflow (`.github/workflows/crawl.yml`) runs `node crawl_posts.js`
**every 3 hours** (at :17 — 00:17, 03:17, 06:17, 09:17, 12:17, 15:17, 18:17, 21:17 UTC)
and, if the posts changed, commits and pushes the new `posts.js` automatically.

Each crawl with new data also **bumps the service worker cache version** in
`sw.js` to a unique per-run value, so every client immediately picks up the fresh
posts (old caches are cleaned on SW activate). `posts.js` / `channels.js` are
served **network-first**, so fresh data shows up even without waiting for a cache
refresh. You can also trigger the workflow manually from the **Actions** tab.

Safety: if fewer than 10 channels are reachable (e.g. t.me blocking the runner),
the crawler exits with an error and **keeps the existing `posts.js`** instead of
wiping it. When no data changed, no commit is made. Run it locally anytime with
`node crawl_posts.js`.

A second workflow (**Refresh Channel Avatars**, daily at 05:23 UTC) runs
`node fetch_avatars.js` and updates `avatars.js` — the local channel-avatar map
that gives the app real avatars even **without a worker**. If a crawl run fails,
the workflow automatically opens a GitHub Issue with a link to the failed logs.

## 📁 Project Structure

```
tgexplorer/
├── index.html           # Main app (single file, HTML+CSS+JS)
├── channels.js          # Verified channel database (151 channels)
├── posts.js             # Inline seed: latest 12 posts per channel (generated)
├── posts/               # Full archive, one JSON per channel (lazy-loaded)
├── avatars.js           # Channel avatar map (generated)
├── crawl_posts.js       # Post crawler (Node)
├── fetch_avatars.js     # Avatar refresher (Node)
├── verify_channels.js   # Channel validation script (Node)
├── worker.js            # Cloudflare Worker proxy
├── sw.js                # Service Worker (PWA offline)
├── manifest.json        # PWA manifest
└── icons/               # PWA icons
```

## 🌐 Deploy to GitHub Pages

1. Push this folder to your GitHub repo
2. Go to **Settings** → **Pages**
3. Select **Deploy from a branch** → `main` → `/ (root)`
4. Your site will be live at `https://yourusername.github.io/repo-name/`

## 🌍 Supported Languages

| Language | Code | Direction |
|----------|------|-----------|
| English  | en   | LTR       |
| فارسی    | fa   | RTL       |
| العربية   | ar   | RTL       |
| 中文     | zh   | LTR       |
| Русский  | ru   | LTR       |
| Español  | es   | LTR       |
| Français | fr   | LTR       |

## ⚙️ How It Works

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  index.html │────▶│ Cloudflare Worker │────▶│    t.me     │
│  (Frontend) │◀────│   (Proxy/CORS)   │◀────│  (Telegram) │
└─────────────┘     └──────────────────┘     └─────────────┘
```

- The **HTML file** is the frontend — pure vanilla JS, no frameworks
- **Without a worker**, the app uses the local verified database (`channels.js`) with fuzzy search
- **With a worker**, it adds live search, posts and notifications from `t.me`
- The **Cloudflare Worker** acts as a proxy to bypass CORS restrictions
- It scrapes `t.me` for channel data and posts
- All favorites are stored in **localStorage** (client-side)

## 🔧 API Endpoints (Worker)

| Endpoint | Description |
|----------|-------------|
| `GET /api/search?q=keyword` | Search public channels |
| `GET /api/channel/:username` | Get channel info |
| `GET /api/posts/:username` | Get recent posts |
| `GET /api/trending?cat=tech` | Get trending channels |
| `GET /api/categories` | List all categories |

## 📝 Notes

- Telegram doesn't have a public search API, so results come from web scraping `t.me`
- For best results, deploy the Cloudflare Worker
- The worker uses the **free tier** (100,000 requests/day)
- Consider adding your Telegram API credentials to the worker for better rate limits

## 📄 License

MIT — use it however you want.

## 🙏 Credits

Built with ❤️ for the Telegram community.
