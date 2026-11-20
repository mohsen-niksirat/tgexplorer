# BotFather Setup Checklist (`@telgexplorerbot`)

> **Important:** BotFather's own fields are single-language (use English below). Localized **EN / FA** descriptions, short descriptions, and commands are applied automatically via the Bot API `language_code` parameter when you run the one-time setup module (`npx tgcloud run endpoints/setup`).

## Manual Steps in `@BotFather`

1. **`/setuserpic`**
   - Upload `icons/icon-512.png` from the root of this repository as the bot's profile picture.

2. **`/setabouttext`** (111 / 120 chars)
   ```text
   Explore for Telegram: discover public channels by topic, not by name. 131+ verified channels, in English & Persian.
   ```

3. **`/setdescription`** (246 / 512 chars)
   ```text
   TGExplorer helps you discover public Telegram channels and groups by topic, language, and live activity.

   We surface great small channels alongside the big ones so they don't stay hidden.

   Tap Open Explore to start: https://mohsen-niksirat.github.io/tgexplorer/
   ```

4. **`/setcommands`**
   ```text
   start - Open TGExplorer
   app - Launch the Mini App
   help - What this bot does
   ```

---

## Persian (FA) Versions (Applied via Bot API `language_code: "fa"`)

- **About / Short Description (FA, 114 chars):**
  ```text
  اکسپلور تلگرام: کشف کانال‌های عمومی بر اساس موضوع، نه فقط نام. بیش از ۱۳۱ کانال تاییدشده به فارسی و انگلیسی.
  ```

- **Description (FA, 241 chars):**
  ```text
  اکسپلور تلگرام به شما کمک می‌کند کانال‌ها و گروه‌های عمومی تلگرام را بر اساس موضوع، زبان و فعالیت زنده پیدا کنید.

  ما کانال‌های کوچک و باکیفیت را هم کنار کانال‌های بزرگ نشان می‌دهیم تا دیده شوند.

  برای شروع دکمه باز کردن اکسپلور را بزنید.
  ```
