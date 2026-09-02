# 📱 Mobile shell (Capacitor)

Wrap the exact same web app in a native Android/iOS shell — **no code changes**.
All favorites, folders and settings live in the webview's localStorage, and the
app keeps working offline (local mode) like the PWA.

## One-time setup

```bash
cd mobile
npm install
npm run add:android   # generates the native android/ project
# or: npm run add:ios  (requires macOS + Xcode)
```

## After every web change

```bash
npm run sync          # copies the app root -> mobile/www, then cap sync
```

The sync script (`sync-web.js`) copies `index.html`, `channels.js`,
`posts.js`, `avatars.js`, `manifest.json`, the `posts/` archive and icons,
and strips the service-worker registration (not needed inside the webview).

## Build an APK

```bash
npm run open:android  # opens Android Studio
# then: Build > Build Bundle(s)/APK(s) > Build APK(s)
```

Or headless:

```bash
cd android && ./gradlew assembleRelease
```

Sign the release APK with your own keystore before distributing.

## Notes

- `capacitor.config.json` sets `allowMixedContent` because Telegram CDN
  media URLs may be `http://` for some channels.
- Keep `mobile/www/` out of git (already in `.gitignore`).
- The app ID is `ir.tgexplorer.app` — change it in `capacitor.config.json`.
