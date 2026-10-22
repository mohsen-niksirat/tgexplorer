// Let check() fetch the profile page for the subscriber count.
//
// The /s/ preview page only carries the count when the channel has no web
// preview. For the channels that do have one, the count lives on the
// profile page - so the growth script asks for it explicitly.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'verify_channels.js');
let s = fs.readFileSync(p, 'utf8');

const OLD_SIG = 'async function check(ch) {';
const NEW_SIG = 'async function check(ch, opts) {\n  opts = opts || {};';
if (!s.includes(OLD_SIG)) { console.error('the check function was not found'); process.exit(1); }
s = s.replace(OLD_SIG, NEW_SIG);

const OLD_PREVIEW = `  if (widgets > 0) {
    const live = extractChannelTitle(r.html) || title.replace(/\\s*[–-]\\s*Telegram\\s*$/i, '').trim();
    const info = extractMemberInfo(r.html);
    if (info && info.unit === 'members') {
      return { ch, status: 'GROUP', reason: 'it is a group, not a channel' };
    }`;
const NEW_PREVIEW = `  if (widgets > 0) {
    const live = extractChannelTitle(r.html) || title.replace(/\\s*[–-]\\s*Telegram\\s*$/i, '').trim();
    let info = extractMemberInfo(r.html);
    if (!info && opts.profile) {
      // The count of a channel with a web preview is only on its profile page.
      try {
        const prof = await fetchTme('https://t.me/' + encodeURIComponent(ch.username));
        if (prof.ok) info = extractMemberInfo(prof.html);
      } catch (e) { /* the count is optional */ }
    }
    if (info && info.unit === 'members') {
      return { ch, status: 'GROUP', reason: 'it is a group, not a channel' };
    }`;
if (!s.includes(OLD_PREVIEW)) { console.error('the preview case was not found'); process.exit(1); }
s = s.replace(OLD_PREVIEW, NEW_PREVIEW);

fs.writeFileSync(p, s, 'utf8');
console.log('check() can now fetch the profile page for the count');
