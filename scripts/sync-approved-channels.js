// Sync bot-approved channels into channels.js (idempotent).
//
// Usage:
//   node scripts/sync-approved-channels.js                  (uses APPROVED_CHANNELS_URL + NOTIFY_SECRET)
//   node scripts/sync-approved-channels.js --tgcloud        (calls npx tgcloud run endpoints/approvedChannels)
//   node scripts/sync-approved-channels.js --from-file x.json
//   node scripts/sync-approved-channels.js --test           (runs deterministic fixture tests)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CHANNELS_FILE = path.join(ROOT, 'channels.js');

function detectLang(title, description) {
  const combined = `${title || ''} ${description || ''}`;
  const hasArabicScript = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(combined);
  if (!hasArabicScript) return 'en';
  // Persian-specific letters -> fa; clearly Arabic markers without Persian letters -> ar; default fa
  const hasPersianOnly = /[پچژگکی]/.test(combined);
  const hasArabicMarker = /[ةأإؤئى]/.test(combined) && !/[پچژگ]/.test(combined);
  if (hasArabicMarker && !hasPersianOnly) return 'ar';
  return 'fa';
}

function escJs(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

function diffAndMergeChannels(existingDb, approvedList) {
  const existingSet = new Set(
    (existingDb || []).map(c => String(c.username || '').toLowerCase()).filter(Boolean)
  );
  const added = [];
  const lines = [];

  for (const item of approvedList || []) {
    if (!item || (item.status && item.status !== 'approved')) continue;
    const username = String(item.username || '').trim().toLowerCase();
    if (!/^[a-z0-9_]{5,32}$/.test(username)) continue;
    if (existingSet.has(username)) continue;

    existingSet.add(username);
    const title = String(item.title || '@' + username).trim();
    const members = String(item.members || '0').trim() || '0';
    const description = String(item.description || '').trim();
    const lang = detectLang(title, description);

    added.push({ username, title, members, description, tags: [], lang });
    lines.push(
      `  {username:'${escJs(username)}',title:'${escJs(title)}',members:'${escJs(members)}',description:'${escJs(description)}',tags:[],lang:'${lang}'},`
    );
  }

  return { added, lines };
}

function applySyncToSource(channelsSrc, approvedList) {
  const existingDb = new Function(channelsSrc + '; return CHANNEL_DB;')();
  const { added, lines } = diffAndMergeChannels(existingDb, approvedList);
  if (!added.length) {
    return { changed: false, added: [], nextSrc: channelsSrc };
  }
  const m = /\]\;\s*$/.exec(channelsSrc);
  if (!m) throw new Error('Could not find end of CHANNEL_DB in channels.js');
  const nextSrc = channelsSrc.slice(0, m.index) + '\n' + lines.join('\n') + channelsSrc.slice(m.index);
  // Verify generated JS parses cleanly
  new Function(nextSrc + '; return CHANNEL_DB;')();
  return { changed: true, added, nextSrc };
}

function parseTgcloudRunOutput(out) {
  const m = String(out || '').match(/<\s*(\{[\s\S]*?\})\s+\d+ms/);
  if (!m) throw new Error('Could not parse tgcloud run output:\n' + out);
  const parsed = new Function('return ' + m[1])();
  return parsed.channels || [];
}

function runFixtureTests() {
  const assert = require('assert');
  const sampleSrc = `const CHANNEL_DB = [\n  {username:'bbcpersian',title:'BBC Persian',members:'1.6M',description:'اخبار',tags:['news'],lang:'fa'},\n];\n`;

  // 1. lang detection
  assert.strictEqual(detectLang('Tech News', 'main channel'), 'en');
  assert.strictEqual(detectLang('اخبار تکنولوژی', 'کانال خبری فارسی'), 'fa');

  // 2. parse tgcloud run stdout format
  const sampleStdout = `> approvedChannels({secret:'***'})\n- Running...\n< {ok:true,channels:[{username:'bbcpersian',title:'Dup',members:'999',description:'x'},{username:'new_fa_chan',title:'کانال جدید',members:'118',description:'توضیحات فارسی'}]}  55ms\n`;
  const parsedFromCli = parseTgcloudRunOutput(sampleStdout);
  assert.strictEqual(parsedFromCli.length, 2);
  assert.strictEqual(parsedFromCli[1].username, 'new_fa_chan');

  // 3. diff: new + already-present + duplicate + pending/rejected ignored
  const fixtures = [
    { username: 'bbcpersian', title: 'Duplicate existing', members: '999', description: 'x', status: 'approved' },
    { username: 'new_fa_chan', title: 'کانال جدید', members: '118', description: 'توضیحات فارسی', status: 'approved' },
    { username: 'new_fa_chan', title: 'Duplicate in payload', members: '118', description: 'x', status: 'approved' },
    { username: 'new_en_chan', title: 'Tech News', members: '500', description: 'Latest tech updates', status: 'approved' },
    { username: 'pending_chan', title: 'Pending', members: '10', description: 'Pending', status: 'pending' },
    { username: 'rejected_chan', title: 'Rejected', members: '10', description: 'Rejected', status: 'rejected' },
  ];

  const r1 = applySyncToSource(sampleSrc, fixtures);
  assert.strictEqual(r1.changed, true);
  assert.deepStrictEqual(r1.added.map(c => c.username), ['new_fa_chan', 'new_en_chan']);
  assert.strictEqual(r1.added[0].lang, 'fa');
  assert.strictEqual(r1.added[1].lang, 'en');

  // 3. Idempotent second run
  const r2 = applySyncToSource(r1.nextSrc, fixtures);
  assert.strictEqual(r2.changed, false);
  assert.strictEqual(r2.added.length, 0);

  console.log('sync-approved-channels fixture tests: ALL PASSED (4 cases)');
}

async function fetchApprovedFromTgcloud() {
  const secret = process.env.NOTIFY_SECRET;
  if (!secret) {
    throw new Error('NOTIFY_SECRET is required for --tgcloud sync');
  }
  const cmd = `npx tgcloud run endpoints/approvedChannels ${JSON.stringify(JSON.stringify({ secret }))}`;
  const out = execSync(cmd, {
    cwd: path.join(ROOT, 'serverless'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return parseTgcloudRunOutput(out);
}

async function fetchApprovedFromHttp(url, secret) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Notify-Secret': secret,
    },
    body: JSON.stringify({ secret }),
  });
  if (!res.ok) throw new Error(`Sync endpoint HTTP ${res.status}`);
  const data = await res.json();
  return data.channels || [];
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--test')) {
    runFixtureTests();
    return;
  }

  let approved = [];
  const fileIdx = args.indexOf('--from-file');
  const tgOutIdx = args.indexOf('--from-tgcloud-output');
  if (fileIdx !== -1 && args[fileIdx + 1]) {
    const raw = JSON.parse(fs.readFileSync(args[fileIdx + 1], 'utf8'));
    approved = Array.isArray(raw) ? raw : (raw.channels || []);
  } else if (tgOutIdx !== -1 && args[tgOutIdx + 1]) {
    approved = parseTgcloudRunOutput(fs.readFileSync(args[tgOutIdx + 1], 'utf8'));
  } else if (args.includes('--tgcloud')) {
    approved = await fetchApprovedFromTgcloud();
  } else {
    const url = process.env.APPROVED_CHANNELS_URL;
    const secret = process.env.NOTIFY_SECRET;
    if (!url || !secret) {
      console.log('APPROVED_CHANNELS_URL or NOTIFY_SECRET not set — skipping sync');
      return;
    }
    approved = await fetchApprovedFromHttp(url, secret);
  }

  const src = fs.readFileSync(CHANNELS_FILE, 'utf8');
  const res = applySyncToSource(src, approved);
  if (res.changed) {
    fs.writeFileSync(CHANNELS_FILE, res.nextSrc, 'utf8');
    console.log('Synced ' + res.added.length + ' channel(s): ' + res.added.map(c => '@' + c.username).join(', '));
  } else {
    console.log('No new approved channels to sync.');
  }

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `synced_count=${res.added.length}\n`);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { detectLang, diffAndMergeChannels, applySyncToSource };
