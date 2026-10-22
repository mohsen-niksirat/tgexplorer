// ============================================================
// verify_channels.js — check that every channel in channels.js
// actually exists as a PUBLIC CHANNEL on Telegram
//
// Usage:
//   node verify_channels.js                 -> CLI report (+ JSON report file)
//   node verify_channels.js --json          -> JSON report to stdout only
//   node verify_channels.js --prune         -> also move dead channels (USER/FAIL)
//                                              from channels.js to channels-deprecated.js
//
// Statuses:
//   OK     : real public channel
//   USER   : username exists but is a user/bot, not a channel
//   FAIL   : HTTP error or not a public channel page
//   ERR    : network error (retry later)
//
// Output: verify_channels_report.json (CI artifact) with per-channel
// status, old/new member counts, and a "dead" list (USER+FAIL) that the
// workflow can use to move channels out of the active DB.
// ============================================================
const fs = require('fs');
const path = require('path');

const JSON_REPORT_FILE = path.join(__dirname, 'verify_channels_report.json');

const src = fs.readFileSync(path.join(__dirname, 'channels.js'), 'utf8');
const fn = new Function(src + '; return CHANNEL_DB;');
const db = fn();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Parse a members count like "1.2M", "600K", "1252" into a number.
function parseMembers(raw) {
  const m = String(raw || '').trim().match(/^([\d.,]+)\s*([KkMm])?$/);
  if (!m) return NaN;
  let val = Number(m[1].replace(/,/g, ''));
  const unit = (m[2] || '').toUpperCase();
  if (unit === 'K') val *= 1000;
  if (unit === 'M') val *= 1000000;
  return val;
}

// Fetch a t.me page and return { ok, title, html }.
async function fetchTme(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en' },
    redirect: 'follow',
  });
  if (!r.ok) return { ok: false, status: r.status };
  const html = await r.text();
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  return { ok: true, title: title.trim(), html };
}

// --- Telegram profile-page signals -------------------------------------
// A channel/group profile carries a tgme_page_extra block with the
// subscriber (or member) count. A plain user account instead renders a
// user icon and a "Send Message" action. The page title alone is NOT a
// reliable signal: a live channel with the web preview disabled shows
// "Telegram: View @x" on both /s/x and /x, while a user shows
// "Telegram: Contact @x".
function profileKind(html) {
  // 1) A plain user account renders the user icon (and "Send Message").
  if (/tgme_icon_user/.test(html)) return 'user';
  // 2) A vacant username that Telegram is selling on Fragment.
  if (/buy this username|cost is\s*[\d.]+\s*BTC|fragment\.com\/username/i.test(html)) return 'vacant';
  // 3) A channel/group: the subscriber count (or the @username when the
  //    count is hidden), an avatar, or a real title.
  if (/class="tgme_page_extra"/.test(html)) return 'channel';
  if (/class="tgme_page_photo"/.test(html)) return 'channel';
  if (/class="tgme_page_title"/.test(html)) return 'channel';
  return 'unknown';
}

// The channel title as shown on the profile page (without the " – Telegram"
// suffix the <title> tag adds).
function extractChannelTitle(html) {
  const m = html.match(/<div class="tgme_page_title"[^>]*>([\s\S]*?)<\/div>/);
  if (!m) return null;
  const t = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return t || null;
}

// The live subscriber / member count ("2 517 026 subscribers" -> "2517026").
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
  const m = extra.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    .match(/([\d][\d\s.,]*)\s*(subscribers?|members?)/i);
  if (!m) return null;
  return { count: m[1].replace(/[\s,]/g, ''), unit: /member/i.test(m[2]) ? 'members' : 'subscribers' };
}

// The description of a channel, as shown on its profile page.
function extractDescription(html) {
  const m = html.match(/<meta property="og:description" content="([^"]*)"/i) ||
    html.match(/<meta name="description" content="([^"]*)"/i);
  if (!m) return '';
  return decodeEntities(m[1]).replace(/\s+/g, ' ').trim().slice(0, 220);
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

async function check(ch, opts) {
  opts = opts || {};
  const url = 'https://t.me/s/' + encodeURIComponent(ch.username);
  let r;
  try {
    r = await fetchTme(url);
  } catch (e) {
    return { ch, status: 'ERR', reason: 'network: ' + e.message };
  }
  if (!r.ok) return { ch, status: 'FAIL', reason: 'HTTP ' + r.status };
  if (!r.html.includes('tgme_page')) return { ch, status: 'FAIL', reason: 'not a public channel page' };

  const title = r.title;
  // A working public preview (post widgets) proves the channel exists.
  const widgets = (r.html.match(/tgme_widget_message_wrap/g) || []).length;
  if (widgets > 0) {
    const live = extractChannelTitle(r.html) || title.replace(/\s*[–-]\s*Telegram\s*$/i, '').trim();
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
    }
    return {
      ch, status: 'OK', reason: '"' + live.slice(0, 60) + '"',
      members: info ? info.count : null,
      title: live,
      description: extractDescription(r.html),
    };
  }

  // No preview — the profile page tells a channel with the web preview
  // disabled apart from a user account that took over the username.
  let p;
  try {
    p = await fetchTme('https://t.me/' + encodeURIComponent(ch.username));
  } catch (e) {
    return { ch, status: 'ERR', reason: 'network: ' + e.message };
  }
  if (!p.ok) return { ch, status: 'ERR', reason: 'profile HTTP ' + p.status };

  const kind = profileKind(p.html);
  if (kind === 'channel') {
    const live = extractChannelTitle(p.html) || p.title.replace(/\s*[–-]\s*Telegram\s*$/i, '').trim();
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
  }
  if (kind === 'vacant') {
    return { ch, status: 'FAIL', reason: 'the username is for sale — no channel behind it' };
  }
  return { ch, status: 'USER', reason: 'the username now belongs to a user account, not a channel' };
}

function classify(results) {
  const byStatus = { OK: [], USER: [], FAIL: [], ERR: [], GROUP: [] };
  for (const r of results) {
    if (!byStatus[r.status]) byStatus[r.status] = [];
    byStatus[r.status].push(r);
  }

  // USER/FAIL: candidates to remove from the active DB (move to deprecated).
  const dead = byStatus.USER.concat(byStatus.FAIL).map(r => ({
    username: r.username,
    title: r.title,
    status: r.status,
    reason: r.reason,
  }));

  // ERR on low-member channels is suspicious: possibly dead/deleted recently.
  const suspicious = byStatus.ERR.filter(
    r => !Number.isNaN(parseMembers(r.oldMembers)) && parseMembers(r.oldMembers) < 100
  ).map(r => ({ username: r.username, status: r.status, reason: r.reason }));

  // Title drift: the live t.me title no longer matches the DB title.
  const renamed = results.filter(r => {
    if (r.status !== 'OK') return false;
    const live = ((r.reason || '').match(/^"([^"]*)"/) || [])[1] || '';
    const dbTitle = (r.title || '').trim();
    if (!live || !dbTitle) return false;
    return !live.toLowerCase().includes(dbTitle.toLowerCase()) &&
           !dbTitle.toLowerCase().includes(live.toLowerCase());
  }).map(r => ({
    username: r.username,
    dbTitle: r.title,
    liveTitle: ((r.reason || '').match(/^"([^"]*)"/) || [])[1] || '',
  }));

  return { byStatus, dead, suspicious, renamed };
}

// ============================================================
// PRUNE — move dead channels (USER/FAIL) out of channels.js into
// channels-deprecated.js. Enabled with: node verify_channels.js --prune
// Line-based rewrite keeps the original formatting/comments intact.
// ============================================================
function pruneDead(dead) {
  if (!dead.length) {
    console.log('\nPrune: no dead channels — channels.js unchanged.');
    return;
  }
  const deadSet = new Set(dead.map(d => d.username));
  const chPath = path.join(__dirname, 'channels.js');
  const lines = fs.readFileSync(chPath, 'utf8').split('\n');
  const kept = [];
  const removed = [];
  for (const line of lines) {
    const m = line.match(/\busername:'([^']+)'/);
    if (m && deadSet.has(m[1])) removed.push(line.trim().replace(/,$/, ''));
    else kept.push(line);
  }
  fs.writeFileSync(chPath, kept.join('\n'), 'utf8');

  // Merge into channels-deprecated.js (dedup by username).
  const depPath = path.join(__dirname, 'channels-deprecated.js');
  const existing = new Set();
  const merged = [];
  if (fs.existsSync(depPath)) {
    for (const line of fs.readFileSync(depPath, 'utf8').split('\n')) {
      const m = line.match(/\busername:'([^']+)'/);
      if (m && !existing.has(m[1])) { existing.add(m[1]); merged.push(line.trim().replace(/,$/, '')); }
    }
  }
  for (const line of removed) {
    const m = line.match(/\busername:'([^']+)'/);
    if (m && !existing.has(m[1])) { existing.add(m[1]); merged.push(line); }
  }
  const header = [
    '// ============================================================',
    '// channels-deprecated.js — channels that failed live verification',
    '// (the username now belongs to a user/bot or the channel is gone).',
    '// Auto-managed by: node verify_channels.js --prune — do not edit by hand.',
    '// ============================================================',
    'const DEPRECATED_DB = [',
  ];
  const body = merged.map(l => '  ' + l + ',').join('\n');
  fs.writeFileSync(depPath, header.join('\n') + '\n' + body + '\n];\n', 'utf8');
  console.log('\nPrune: moved ' + removed.length + ' dead channel(s) from channels.js to channels-deprecated.js:');
  removed.forEach(l => { const m = l.match(/\busername:'([^']+)'/); if (m) console.log('  - @' + m[1]); });
}

async function main() {
  const args = process.argv.slice(2);
  const jsonOnly = args.includes('--json');

  console.log('Checking ' + db.length + ' channels on t.me...\n');
  const counts = { OK: 0, USER: 0, FAIL: 0, ERR: 0, GROUP: 0 };
  const results = [];
  for (const ch of db) {
    // Ask for the profile page too: a channel with a web preview only shows
    // its subscriber count there, and without it the report had no member
    // counts at all (and could not tell a group from a channel).
    const res = await check(ch, { profile: true });
    counts[res.status]++;
    results.push({
      username: res.ch.username,
      title: res.ch.title,
      oldMembers: res.ch.members,
      newMembers: res.members || null,
      status: res.status,
      reason: res.reason,
    });
    const mark = { OK: '  OK  ', USER: ' USER ', FAIL: ' FAIL ', ERR: ' ERR  ', GROUP: ' GROUP' }[res.status] || ' ??   ';
    console.log(mark + ' @' + ch.username.padEnd(22) + res.reason);
    await new Promise(r => setTimeout(r, 300));
  }

  // Duplicate usernames (data hygiene — reported, not auto-removed).
  const seenUsernames = new Set();
  const duplicates = [];
  for (const ch of db) {
    if (seenUsernames.has(ch.username)) duplicates.push(ch.username);
    seenUsernames.add(ch.username);
  }

  const summary = {
    checked: db.length,
    counts,
    duplicates,
    reportGeneratedAt: new Date().toISOString(),
    results,
    ...classify(results),
  };

  console.log(
    '\n=== RESULT: ' + counts.OK + ' OK, ' + counts.USER + ' user, ' + counts.FAIL + ' missing, ' + counts.ERR + ' network error ==='
  );

  if (summary.duplicates.length) {
    console.log('\nDuplicate usernames in channels.js: ' + summary.duplicates.join(', '));
  }

  if (args.includes('--prune')) pruneDead(summary.dead);

  if (jsonOnly) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    const bad = results.filter(r => r.status !== 'OK' && r.status !== 'GROUP');
    if (bad.length) {
      console.log('\nChannels to fix/remove from channels.js:');
      bad.forEach(b => console.log('  - ' + b.username + '  [' + b.status + '] ' + b.reason));
    }
    const groups = results.filter(r => r.status === 'GROUP');
    if (groups.length) {
      console.log('\nGroups (still public, but they are groups rather than channels):');
      groups.forEach(g => console.log('  - ' + g.username));
    }
    if (summary.renamed.length) {
      console.log('\nPossible renames (live title differs from DB title):');
      summary.renamed.forEach(r => console.log('  - @' + r.username + ': "' + r.dbTitle + '" -> "' + r.liveTitle + '"'));
    }
    if (summary.suspicious.length) {
      console.log('\nSUSPICIOUS (network errors on low-member channels — verify manually):');
      summary.suspicious.forEach(r => console.log('  - ' + r.username + '  [' + r.status + '] ' + r.reason));
    }
    // Always write the JSON report file (CI artifact friendly).
    fs.writeFileSync(JSON_REPORT_FILE, JSON.stringify(summary, null, 2), 'utf8');
    console.log('\nJSON report written to: ' + JSON_REPORT_FILE);
  }

  // Exit code: fail on USER/FAIL (dead channels). ERR alone does not fail the
  // build — transient network errors should not block CI, they are reported.
  // A group is not a channel, but it still has a public web preview and the
  // app shows its posts - so it is reported, but it does not fail the build.
  const failCount = counts.USER + counts.FAIL;
  process.exit(failCount > 0 ? 1 : 0);
}

module.exports = { check, fetchTme, parseMembers, profileKind, extractMemberCount, extractMemberInfo, extractDescription };

if (require.main === module) {
  main();
}
