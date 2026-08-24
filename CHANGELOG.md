# 📜 Changelog

Full version history of Telegram Explorer. The latest release is summarized in the
[README](README.md#-changelog).

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
