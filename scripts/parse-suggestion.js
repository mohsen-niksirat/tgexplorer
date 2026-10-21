// Parse a channel suggestion issue body.
//
//   node scripts/parse-suggestion.js < issue-body.txt
//   node scripts/parse-suggestion.js "the body as an argument"
//
// The body can come from the app's "Suggest a channel" dialog
// ("- Username: @bbcpersian") or from the issue template
// ("### Username" followed by the value on the next line). Both are
// understood.
const fs = require('fs');

const raw = process.argv[2] !== undefined ? process.argv[2] : fs.readFileSync(0, 'utf8');
const body = raw.replace(/\r\n/g, '\n');

const FIELDS = ['username', 'title', 'language', 'category', 'description'];

function clean(v) {
  return String(v || '')
    .replace(/^[\s>*_`#-]+/, '')
    .replace(/[\s>*_`]+$/, '')
    .trim();
}

const out = {};

// 1) the "- Key: value" style
for (const line of body.split('\n')) {
  const m = line.match(/^\s*[-*]?\s*\**([A-Za-z ]+)\**\s*:\s*(.*)$/);
  if (!m) continue;
  const key = m[1].trim().toLowerCase();
  const value = clean(m[2]);
  if (!value) continue;
  if (key === 'username' && !out.username) out.username = value;
  else if (key === 'title' && !out.title) out.title = value;
  else if (key === 'language' && !out.language) out.language = value;
  else if (key === 'category' && !out.category) out.category = value;
  else if (key === 'description' && !out.description) out.description = value;
}

// 2) the "### Key" + value style (the issue template)
const lines = body.split('\n');
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^\s*#{1,6}\s*(.+?)\s*$/);
  if (!m) continue;
  const key = clean(m[1]).toLowerCase();
  if (!FIELDS.includes(key)) continue;
  // The value is the next non-empty line.
  let value = '';
  for (let j = i + 1; j < lines.length; j++) {
    const l = lines[j].trim();
    if (!l) continue;
    if (/^\s*#{1,6}\s/.test(l)) break;
    if (/^\s*[-*]\s/.test(l)) break;
    value = l;
    break;
  }
  if (!value) continue;
  if (key === 'username' && !out.username) out.username = value;
  else if (key === 'title' && !out.title) out.title = value;
  else if (key === 'language' && !out.language) out.language = value;
  else if (key === 'category' && !out.category) out.category = value;
  else if (key === 'description' && !out.description) out.description = value;
}

// The username may carry an @ or a link.
if (out.username) {
  const m = out.username.match(/t\.me\/([A-Za-z0-9_]+)/) || out.username.match(/@?([A-Za-z0-9_]{5,32})/);
  out.username = m ? m[1] : '';
}

process.stdout.write(JSON.stringify(out));
