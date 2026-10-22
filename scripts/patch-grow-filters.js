// The database must not fill up with squatted usernames and impostor
// channels. Telegram sells and parks usernames, and a parked username
// also shows a subscriber count - so the text around it is checked too.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'grow-channels.js');
let s = fs.readFileSync(p, 'utf8');

// The patterns that mark a squatted or impostor channel.
const HELPERS = `// A squatted, parked or impostor channel. Telegram sells usernames
// and parks them, and those pages look like a channel with subscribers.
const SQUAT_PATTERNS = [
  /for\\s+sale/i,
  /usernames?\\b/i,
  /names?\\s*[•·|]/i,
  /\\bog_names\\b/i,
  /fragment\\.com\\/username/i,
  /\\[\\s*fake\\s*\\]/i,
  /\\bscam\\b/i,
  /\\bclone\\b/i,
  /\\bbet365\\b|\\bbetting\\b/i,
  /^test\\b/i,
  /\\bowner\\s*@/i,
  /\\bdm\\s*:/i,
];

// A title that mixes Cyrillic and Latin letters is a homograph.
const isHomograph = title => {
  const t = String(title || '');
  return /[\\u0400-\\u04FF]/.test(t) && /[A-Za-z]/.test(t);
};

const looksSquat = (title, description) => {
  const hay = (title || '') + ' — ' + (description || '');
  return SQUAT_PATTERNS.some(re => re.test(hay)) || isHomograph(title);
};

// Below this many subscribers a channel is not worth listing.
const MIN_MEMBERS = 100;
`;

const ANCHOR = '(async () => {';
if (!s.includes(ANCHOR)) { console.error('the main block was not found'); process.exit(1); }
s = s.replace(ANCHOR, HELPERS + '\n' + ANCHOR);

const OLD_CHECK = `    if (res.status === 'OK' && !res.members) {
      // A channel without a visible subscriber count could be a personal
      // account that took the username - too risky for the database.
      dead.push(username);
      console.log('  HIDE  @' + username.padEnd(22) + 'no visible subscriber count');
    } else if (res.status === 'OK' && /\\[?fake\\]?|\\bscam\\b|\\bclone\\b/i.test(res.title || '')) {
      dead.push(username);
      console.log('  FAKE  @' + username.padEnd(22) + (res.title || '').slice(0, 50));
    } else if (res.status === 'OK') {`;
const NEW_CHECK = `    if (res.status === 'OK' && !res.members) {
      // A channel without a visible subscriber count could be a personal
      // account that took the username - too risky for the database.
      dead.push(username);
      console.log('  HIDE  @' + username.padEnd(22) + 'no visible subscriber count');
    } else if (res.status === 'OK' && looksSquat(res.title, res.description)) {
      dead.push(username);
      console.log('  SQAT  @' + username.padEnd(22) + (res.title || '').slice(0, 50));
    } else if (res.status === 'OK' && parseInt(res.members, 10) < MIN_MEMBERS) {
      dead.push(username);
      console.log('  SMALL @' + username.padEnd(22) + res.members + ' subscribers');
    } else if (res.status === 'OK') {`;
if (!s.includes(OLD_CHECK)) { console.error('the check block was not found'); process.exit(1); }
s = s.replace(OLD_CHECK, NEW_CHECK);

fs.writeFileSync(p, s, 'utf8');
console.log('the growth script now rejects squatted, impostor and tiny channels');
