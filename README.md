# 🔍 Telegram Explorer

Search and discover public Telegram channels and groups — like Instagram Explore, but for Telegram.

## ✨ Features

- 🔍 **Search** public Telegram channels and groups
- 🏠 **Explore** trending channels by category
- 📱 **Instagram-like grid** view for visual browsing
- ❤️ **Favorites** — save channels locally
- 🌙 **Dark / Light** mode
- 🌍 **7 Languages**: English, فارسی, العربية, 中文, Русский, Español, Français
- 📱 **Responsive** — works on mobile and desktop
- 📄 **Single HTML file** — no build step, no dependencies

## 🚀 Quick Start

### Option 1: Without Worker (Limited — local data only)

Just open `index.html` in your browser. You'll have access to a curated set of popular channels.

### Option 2: With Cloudflare Worker (Full power)

This gives you real-time search, channel posts, and more.

#### Step 1: Deploy the Worker

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **Workers & Pages** → **Create Application** → **Create Worker**
3. Name it `telegram-explorer-api` (or anything)
4. Replace the default code with the contents of `worker.js`
5. Click **Save and Deploy**
6. Copy your worker URL (e.g., `https://telegram-explorer-api.your-subdomain.workers.dev`)

#### Step 2: Configure the HTML

Open `index.html` and find this line near the top of the `<script>`:

```javascript
const WORKER_URL = localStorage.getItem('telgram_explorer_worker') || '';
```

Replace `''` with your worker URL:

```javascript
const WORKER_URL = 'https://telegram-explorer-api.your-subdomain.workers.dev';
```

Or set it via browser console:
```javascript
localStorage.setItem('telgram_explorer_worker', 'https://your-worker-url.workers.dev');
```

#### Step 3: Open `index.html`

That's it! 🎉

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
