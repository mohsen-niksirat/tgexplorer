# 🔍 Telegram Explorer

Search and discover public Telegram channels and groups — like Instagram Explore, but for Telegram.

[![Crawl Channel Posts](https://github.com/mohsen-niksirat/tgexplorer/actions/workflows/crawl.yml/badge.svg)](https://github.com/mohsen-niksirat/tgexplorer/actions/workflows/crawl.yml)

## ✨ Features

- 🔍 **Smart Search** — fuzzy matching (typo-tolerant) + Persian/English language filter
- 🏠 **Explore** — browse 60+ **verified** public channels by category (every one checked live against t.me)
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
3. Replace `API_ID` / `API_HASH` with your own credentials from [my.telegram.org](https://my.telegram.org) *(optional — the worker also works without them for public channels)*.
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

### v1.2.0

- 🏠 **Home feed** — all your favorite channels' posts merged into one infinite Instagram-style feed (newest first)
- 📊 **Home stats bar** — favorite channels / total posts / posts today at the top of Home
- 🎬 **Home type filter** — see only clips, photos or text in the Home feed (persisted)
- 🤖 **Folder auto-filter** — set a rule (category + language) on a folder and matching channels are listed automatically, add one or all
- ✨ **Smart folders** — one click creates ready-made folders (Persian News, Technology, Sports) with their rules pre-set
- 🌐 **Live search indicator** — the search bar shows 🌐 Live (worker) vs 📦 Local results
- 🔔 **Browser push notifications** — opt-in in Settings; get a notification when a favorite channel posts something new
- 🗂 **"Add to folder" button** in the channel modal (posts already had it)
- 📥 **Export / 📤 Import** — full backup of favorites, saved posts and folders as a JSON file
- 🌍 **Explore language filter** — Persian/English filter persisted between sessions (also applied to worker trending)
- 💡 **Suggest a channel** — community-driven form in Settings that pre-fills a GitHub issue
- 🕒 **Shared folder live posts** — opening a shared folder link now fetches the latest post of each channel live from t.me
- ☁️ **One-click Worker deploy** — `wrangler.toml` + deploy button (see below)

### v1.1.0

- 📸 **Instagram-like Explore** — every channel shows its latest post as a 3:4 tile
- 🎬 **Post popup** with the channel's previous posts and **in-modal video playback**
- 🔄 **4-mode Explore filter** — see only clips, only photos, only text posts, or everything
- ♾️ **Infinite scroll feed** inside the post popup — scroll to load the next posts
- 🤖 **Automated daily crawl** via GitHub Actions (posts.js refreshes every night)
- ✕ Close popups with the ✕ button, backdrop click, or **Esc** (video fully stops)
- 📤 **Share & copy post link** buttons on every post
- ❤️ **Save posts as favorites** (new Posts tab in Favorites)
- 🗂 **Personal folders** to organize saved channels & posts (with emoji icons)
- 🔗 **Share folders as links** — anyone can open and import them into their own app
- 🌐 **Channels outside the database** render in shared folders with direct Telegram buttons
- ➕ **Add channels manually** to folders via any `t.me` link (validated)
- 🕒 **Live latest-post preview** — when a channel is added, its newest post is fetched from t.me and shown in the folder, with a 🔄 refresh button and auto-refresh

### v1.0.0

- ✅ **Verified channel database** — 61 real public channels, every one checked live against t.me
- 🔍 **Smart fuzzy search** (typo-tolerant) + Persian/English language filter
- ❤️ **Save channels as favorites**
- 🌙 Dark / Light mode · 🌍 7 languages · 📱 responsive layout
- 📄 **Local mode by default** — works out of the box, no worker or API key required
- 🧪 `verify_channels.js` — re-validate the channel database against t.me

## 🚀 Quick Start

### Option 1: Local mode (default — no setup)

Just open `index.html` (or deploy to GitHub Pages). The app starts with a **verified database of 60+ real channels** and full fuzzy search + language filter — no worker, no API key.

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
telegram-explorer/
├── index.html          # Main app (single file)
├── channels.js         # Verified channel database (~60 channels)
├── verify_channels.js  # Channel validation script (Node)
├── worker.js           # Cloudflare Worker proxy
├── sw.js               # Service Worker (PWA offline)
├── manifest.json       # PWA manifest
└── icons/              # PWA icons
```

## 📁 Project Structure

```
telegram-explorer/
├── index.html      # Main app (single file, ~58KB)
├── worker.js       # Cloudflare Worker proxy
└── README.md       # This file
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
