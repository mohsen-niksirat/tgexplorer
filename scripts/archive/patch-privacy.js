// Add the privacy section to the Settings modal.
//
// The app is a static PWA: everything the user does stays in their own
// browser. This spells out exactly what is stored where, and adds the
// "No tracking" badge.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'index.html');
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

// --- 1) the markup ---------------------------------------------------------
const ANCHOR = '      <div class="test-result" id="settingsTestResult"></div>';
if (!s.includes(ANCHOR)) { console.error('the settings anchor was not found'); process.exit(1); }

const PRIVACY = `      <div class="test-result" id="settingsTestResult"></div>
      <div class="privacy-box">
        <div class="privacy-head"><span class="privacy-badge">🛡️ <span data-i18n="no_tracking">No tracking</span></span><span class="privacy-title" data-i18n="privacy_title">Your data stays on your device</span></div>
        <ul class="privacy-list">
          <li><span data-i18n="privacy_local">📱 Saved locally</span> — <span data-i18n="privacy_local_desc">favourites, folders, settings and filters are stored in this browser's localStorage. Nothing is uploaded.</span></li>
          <li><span data-i18n="privacy_worker">☁️ Worker (optional)</span> — <span data-i18n="privacy_worker_desc">if you connect your own Cloudflare Worker, only your search queries and the channels you open are sent to it. The Worker keeps a short-lived cache; it never stores your favourites.</span></li>
          <li><span data-i18n="privacy_analytics">📊 Analytics</span> — <span data-i18n="privacy_analytics_desc">the page views are counted by Cloudflare Web Analytics (if the site is hosted there). No cookies, no fingerprinting, no third-party trackers.</span></li>
        </ul>
        <a class="privacy-link" href="https://github.com/mohsen-niksirat/tgexplorer#privacy" target="_blank" rel="noopener" data-i18n="privacy_read_more">Read the details →</a>
      </div>`;
s = s.replace(ANCHOR, PRIVACY);

// --- 2) the styles ---------------------------------------------------------
const STYLE_ANCHOR = '.ac-user{font-size:11px;color:var(--text-secondary)}';
if (!s.includes(STYLE_ANCHOR)) { console.error('the style anchor was not found'); process.exit(1); }
const STYLES = `.ac-user{font-size:11px;color:var(--text-secondary)}
/* ============================================================
   PRIVACY BOX (Settings)
   ============================================================ */
.privacy-box{margin-top:16px;padding:14px;border:1px solid var(--border);border-radius:14px;background:var(--bg-secondary)}
.privacy-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.privacy-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(72,187,120,.15);color:#2f9e5f;border:1px solid rgba(72,187,120,.35);border-radius:14px;padding:3px 11px;font-size:11.5px;font-weight:700;white-space:nowrap}
[data-theme="dark"] .privacy-badge{color:#5fd18a}
.privacy-title{font-size:13.5px;font-weight:700;color:var(--text-primary)}
.privacy-list{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:7px}
.privacy-list li{font-size:12.5px;line-height:1.6;color:var(--text-secondary)}
.privacy-list li span[data-i18n]{color:var(--text-primary);font-weight:600}
.privacy-link{display:inline-block;margin-top:10px;font-size:12.5px;font-weight:600;color:var(--accent);text-decoration:none}
.privacy-link:hover{text-decoration:underline}`;
s = s.replace(STYLE_ANCHOR, STYLES);

fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
console.log('patched index.html');
for (const c of ['privacy-box', 'no_tracking', 'privacy_local', 'privacy_read_more']) {
  console.log((s.includes(c) ? 'OK   ' : 'MISS ') + c);
}
