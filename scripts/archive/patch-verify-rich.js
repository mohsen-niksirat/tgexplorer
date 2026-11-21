// Teach check() to return the live title, the member count and the
// description of a channel, so a candidate can be added to the database
// with real data instead of a placeholder.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'verify_channels.js');
let s = fs.readFileSync(p, 'utf8');

// --- 1) a helper that reads the og:description ------------------------------
const HELPER = `// The description of a channel, as shown on its profile page.
function extractDescription(html) {
  const m = html.match(/<meta property="og:description" content="([^"]*)"/i) ||
    html.match(/<meta name="description" content="([^"]*)"/i);
  if (!m) return '';
  return decodeEntities(m[1]).replace(/\\s+/g, ' ').trim().slice(0, 220);
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

`;
const ANCHOR = 'async function check(ch) {';
if (!s.includes(ANCHOR)) { console.error('the check function was not found'); process.exit(1); }
if (!s.includes('function extractDescription(')) {
  s = s.replace(ANCHOR, HELPER + ANCHOR);
}

// --- 2) return the title and the description --------------------------------
const OLD_OK = `  if (widgets > 0) {
    const live = extractChannelTitle(r.html) || title.replace(/\\s*[–-]\\s*Telegram\\s*$/i, '').trim();
    return { ch, status: 'OK', reason: '"' + live.slice(0, 60) + '"', members: extractMemberCount(r.html) };
  }`;
const NEW_OK = `  if (widgets > 0) {
    const live = extractChannelTitle(r.html) || title.replace(/\\s*[–-]\\s*Telegram\\s*$/i, '').trim();
    return {
      ch, status: 'OK', reason: '"' + live.slice(0, 60) + '"',
      members: extractMemberCount(r.html),
      title: live,
      description: extractDescription(r.html),
    };
  }`;
if (s.includes(OLD_OK)) {
  s = s.replace(OLD_OK, NEW_OK);
  console.log('the preview case now returns the title and the description');
} else {
  console.log('skip: the preview case did not match');
}

const OLD_OFF = `  if (kind === 'channel') {
    const live = extractChannelTitle(p.html) || p.title.replace(/\\s*[–-]\\s*Telegram\\s*$/i, '').trim();
    return {
      ch,
      status: 'OK',
      reason: '"' + live.slice(0, 60) + '" (web preview disabled)',
      members: extractMemberCount(p.html),
    };
  }`;
const NEW_OFF = `  if (kind === 'channel') {
    const live = extractChannelTitle(p.html) || p.title.replace(/\\s*[–-]\\s*Telegram\\s*$/i, '').trim();
    return {
      ch,
      status: 'OK',
      reason: '"' + live.slice(0, 60) + '" (web preview disabled)',
      members: extractMemberCount(p.html),
      title: live,
      description: extractDescription(p.html),
    };
  }`;
if (s.includes(OLD_OFF)) {
  s = s.replace(OLD_OFF, NEW_OFF);
  console.log('the no-preview case now returns the title and the description');
} else {
  console.log('skip: the no-preview case did not match');
}

s = s.replace(
  'module.exports = { check, fetchTme, parseMembers, profileKind, extractMemberCount };',
  'module.exports = { check, fetchTme, parseMembers, profileKind, extractMemberCount, extractDescription };');

fs.writeFileSync(p, s, 'utf8');
console.log('verify_channels.js updated');
