// Distinguish a channel from a group.
//
// Telegram writes "N subscribers" on a channel page and "N members, N
// online" on a group page. A group is not what the database is about, so
// only the channels are accepted.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'verify_channels.js');
let s = fs.readFileSync(p, 'utf8');

// --- 1) the member info helper ---------------------------------------------
const OLD_COUNT = `// The live subscriber / member count ("2 517 026 subscribers" -> "2517026").
function extractMemberCount(html) {
  const i = html.indexOf('class="tgme_page_extra"');
  if (i === -1) return null;
  const extra = html.slice(i, i + 260);
  const m = extra.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').match(/([\\d][\\d\\s.,]*)\\s*(subscribers?|members?)/i);
  return m ? m[1].replace(/[\\s,]/g, '') : null;
}`;
const NEW_COUNT = `// The live subscriber / member count ("2 517 026 subscribers" -> "2517026").
function extractMemberCount(html) {
  const info = extractMemberInfo(html);
  return info ? info.count : null;
}

// The count together with its unit: a channel has "subscribers", a group
// has "members".
function extractMemberInfo(html) {
  const i = html.indexOf('class="tgme_page_extra"');
  if (i === -1) return null;
  const extra = html.slice(i, i + 260);
  const m = extra.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ')
    .match(/([\\d][\\d\\s.,]*)\\s*(subscribers?|members?)/i);
  if (!m) return null;
  return { count: m[1].replace(/[\\s,]/g, ''), unit: /member/i.test(m[2]) ? 'members' : 'subscribers' };
}`;
if (!s.includes(OLD_COUNT)) { console.error('the member count helper was not found'); process.exit(1); }
s = s.replace(OLD_COUNT, NEW_COUNT);

// --- 2) the check: a group is not a channel ---------------------------------
const OLD_KIND = `  if (kind === 'channel') {
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
const NEW_KIND = `  if (kind === 'channel') {
    const live = extractChannelTitle(p.html) || p.title.replace(/\\s*[–-]\\s*Telegram\\s*$/i, '').trim();
    const info = extractMemberInfo(p.html);
    // A group shows "N members, N online" — that is not a channel.
    if (info && info.unit === 'members') {
      return { ch, status: 'GROUP', reason: 'it is a group, not a channel' };
    }
    return {
      ch,
      status: 'OK',
      reason: '"' + live.slice(0, 60) + '" (web preview disabled)',
      members: info ? info.count : null,
      title: live,
      description: extractDescription(p.html),
    };
  }`;
if (!s.includes(OLD_KIND)) { console.error('the no-preview case was not found'); process.exit(1); }
s = s.replace(OLD_KIND, NEW_KIND);

// The preview case: the count on the /s/ page has a unit as well.
const OLD_PREVIEW = `  if (widgets > 0) {
    const live = extractChannelTitle(r.html) || title.replace(/\\s*[–-]\\s*Telegram\\s*$/i, '').trim();
    return {
      ch, status: 'OK', reason: '"' + live.slice(0, 60) + '"',
      members: extractMemberCount(r.html),
      title: live,
      description: extractDescription(r.html),
    };
  }`;
const NEW_PREVIEW = `  if (widgets > 0) {
    const live = extractChannelTitle(r.html) || title.replace(/\\s*[–-]\\s*Telegram\\s*$/i, '').trim();
    const info = extractMemberInfo(r.html);
    if (info && info.unit === 'members') {
      return { ch, status: 'GROUP', reason: 'it is a group, not a channel' };
    }
    return {
      ch, status: 'OK', reason: '"' + live.slice(0, 60) + '"',
      members: info ? info.count : null,
      title: live,
      description: extractDescription(r.html),
    };
  }`;
if (s.includes(OLD_PREVIEW)) {
  s = s.replace(OLD_PREVIEW, NEW_PREVIEW);
  console.log('the preview case now rejects groups');
}

s = s.replace(
  'module.exports = { check, fetchTme, parseMembers, profileKind, extractMemberCount, extractDescription };',
  'module.exports = { check, fetchTme, parseMembers, profileKind, extractMemberCount, extractMemberInfo, extractDescription };');

fs.writeFileSync(p, s, 'utf8');
console.log('verify_channels.js updated');
