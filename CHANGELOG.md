# 📜 Changelog

Full version history of Telegram Explorer. The latest release is summarized in the
[README](README.md#-changelog).

## v1.6.0

- 📡 **+37 verified channels (114 → 151)** — every candidate validated live
  against `t.me/s/<username>` (title match, member scrape); the duplicate
  `netflix` entry was removed. New additions include DW فارسی, The Verge,
  Bloomberg, CNN Breaking, The Guardian, The Economist, Business Insider,
  TradingView, Glassnode, Crypto Briefing, Epic Games Store, Rockstar Games,
  MotoGP, Astronomy Picture of the Day, Quanta Magazine, Scientific American,
  Rocket Lab, Hugging Face, Go, Figma, Pavel Durov, Telegram Tips, SCMP,
  EL PAÍS, تپسی, گجت نیوز, خبر فارسی and more.
- 🛢 **3-day rolling retention** — `crawl_posts.js` now drops posts older than
  `RETENTION_DAYS` (default 3 days) from `posts/<username>.json` on every run;
  the repo self-cleans and storage stays flat. Posts without a parseable date
  are kept. The seed (`posts.js`) is rebuilt from the retained window.
- 🖼 **Feed without a worker + infinite scroll** — `loadFeed()` previously
  showed "Connect proxy" in local mode; it now builds a shuffled image/video
  pool from the local archive, and `appendFeedPosts()` adds 30 more items as
  the user scrolls (worker mode pages through `/api/explore-feed`).
- 📄 **Text previews + full-text popup** — text-only Explore cards render a
  3-line gradient preview; the Home feed clamps long texts at 4 lines with a
  "Show more" button (7 languages); a new full-text popup shows the complete
  post text with copy-text and open-in-Telegram actions.
- 🔍 **Search autocomplete** — debounced (120 ms) fuzzy suggestions from the
  local channel DB appear under the hero search box; picking one opens the
  channel directly.
- 🎲 **Random channel chip** on the hero opens a random verified channel's
  post modal.
- 🔗 **Local related channels** — the channel modal falls back to tag-similarity
  related channels (with shared-tag badges) when no worker is connected.
- ☁️ **Optional Cloudflare KV** — the worker caches search/trending responses
  in a KV namespace bound as `CACHE_KV` (config documented in `wrangler.toml`);
  without a binding the in-memory cache is used. A new README section lists
  all compatible free services (KV, R2, Supabase, Telegram Bot API, …).

## v1.5.1

- 🪶 **Lazy-loaded post archive (73% lighter initial load)** — the crawler
  (`crawl_posts.js`) now writes two outputs: a small inline seed in
  `posts.js` (latest 12 posts per channel, 2.4 MB → ~650 KB) and the full
  50-post archive in `posts/<username>.json`, one JSON per channel. The app
  boots with the seed, fetches the channel's archive on demand when a user
  opens a post modal (cached in memory and by the service worker), and
  "older posts" scrolling in local mode reads the archive first — the
  r.jina.ai scraping fallback remains for channels without an archive. The
  crawl workflow commits the `posts/` folder together with `posts.js`.
- 🔐 **Security fix** — the hardcoded Telegram `API_ID` / `API_HASH` in
  `worker.js` were removed. The worker now reads them from optional
  `TG_API_ID` / `TG_API_HASH` environment secrets (`npx wrangler secret put …`)
  and works fine without them for public channels.
- 📊 **Real stats & notifications (worker v3.2)** — `parsePosts` now extracts
  each post's `<time datetime>`; `/api/stats` builds its 7-day activity chart
  from real post dates and `/api/notifications` reports only posts genuinely
  newer than the client's last check. The random "fake data" logic is gone.
- 🛡 **Rate limiting** — a simple per-IP sliding-window limiter (60 req/min)
  protects every endpoint from abuse; excess requests get HTTP 429.
- 🐛 **Search dedup fix** — `/api/search` used to merge avatar-fetched results
  (top 15) with an overlapping unprocessed slice (top 10), duplicating entries;
  results are now built once.
- 📝 **README cleanup** — removed the duplicated/outdated "Project Structure"
  section, refreshed channel counts (114 verified) and updated the deploy
  instructions to use secrets instead of hardcoded credentials.

## v1.5.0

- 🎨 **Gradient initial-letter avatars** — channels without a t.me photo now get a
  deterministic per-channel gradient tile (8 palettes hashed by username) across
  grid, list, channel modal, post modal, folders, home feed and notifications;
  channel modals also show the real avatar image when available.
- 🎙️ **New Explore categories: Podcast & Cinema** — two new chips in Explore
  (translated in all 7 languages), backed by 8 freshly verified channels:
  پادکست رخ, رادیو زمانه, Lex Fridman, ایران فیلم, Кинопоиск, Netflix,
  MOVIE CLIPS and MOVIE TRAILERS (channel DB is now 114 verified channels).
- 🪶 **Compact hero** — the landing header is much slimmer (smaller title,
  subtitle and search, less padding); the search-tag chip row is removed on
  mobile so channels are visible immediately.
- 🖼 **+45 verified channels** (61 → 106) — each candidate validated live against
  t.me (title match + member count); sold/reserved brand handles were rejected.
- 🔄 **Avatars refreshed & network-first** — `fetch_avatars.js` re-ran (78/106
  channels got real photos); `avatars.js` is now network-first in the service
  worker so avatar updates reach users without clearing the cache.
## v1.4.0

- 🗂 **Explore list view** — switch between grid (▦) and list (☰) with a single
  toggle; the list shows a small thumbnail, title, @username, post-type badge and
  post count per channel.
- 🌐 **Global grid/list view** — the selected view is now applied consistently
  across every tab (Explore, Favorites, Home, Feed, Search) and remembered in
  localStorage.
- 🔍 **Instant search in Explore list** — a live search field filters channels by
  title or username as you type, with an empty-state message when nothing matches.
- 🎬 **Saved-posts type filter** — filter your saved posts by All / Clips / Photos /
  Text, combined with sorting.
- 📊 **Favorites stats bar** — shows favorite channels, total saved posts and
  video/photo/text breakdown at the top of the saved-posts tab, updated live.

## v1.3.0

- 🖼 **Real channel avatars everywhere** — the worker extracts avatars reliably from
  t.me (`tgme_page_photo_image` / `og:image`); local (no-worker) mode now shows
  avatars too via `avatars.js`, refreshed daily by a new **Refresh Channel Avatars**
  workflow. Channels without a photo get a generated initial-letter avatar (SVG).
- 🤖 **Crawl every 3 hours** (was 6 h) — `.github/workflows/crawl.yml` now runs at
  `:17` every 3 hours; after a crawl with new data it **bumps the service-worker
  cache version** so every client immediately picks up fresh posts.
- 🌐 **Network-first data** — `posts.js` / `channels.js` are served fresh from the
  network (cached copy only when offline).
- 🔔 **Failure alerts** — if the crawl workflow fails, it automatically opens a
  GitHub Issue with a link to the failed run logs.
- 🛡 **Race-proof automation** — workflow pushes now retry (fetch/rebase/push loop),
  fixing the push-race failure seen in an earlier crawl run.
- 🐛 **Emoji placeholder fix** — text-only posts no longer render t.me emoji
  placeholder images as media (data cleaned, crawler fixed, render guard added).
- 🐛 **Worker search fixes** — posts parsing (`data-post` block-based), direct
  channel match, DDG `uddg=` parsing and a curated keyword/category fallback; live
  search (including Persian) no longer returns empty results.
- ⚙️ Worker upgraded to **v3.1**.

## v1.2.0

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
- ☁️ **One-click Worker deploy** — `wrangler.toml` + deploy button

## v1.1.0

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

## v1.0.0

- ✅ **Verified channel database** — 61 real public channels, every one checked live against t.me
- 🔍 **Smart fuzzy search** (typo-tolerant) + Persian/English language filter
- ❤️ **Save channels as favorites**
- 🌙 Dark / Light mode · 🌍 7 languages · 📱 responsive layout
