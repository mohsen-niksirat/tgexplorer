// Count the channels in the inline seed and in the archive folder.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const seedSrc = fs.readFileSync(path.join(ROOT, 'posts.js'), 'utf8');
const seed = new Function(seedSrc + '; return CHANNEL_POSTS;')();

const archiveFiles = fs.readdirSync(path.join(ROOT, 'posts')).filter(f => f.endsWith('.json'));
const archivePosts = archiveFiles.reduce((sum, f) => {
  const arr = JSON.parse(fs.readFileSync(path.join(ROOT, 'posts', f), 'utf8'));
  return sum + arr.length;
}, 0);

const seedPosts = Object.values(seed).reduce((a, p) => a + p.length, 0);

console.log('seed: ' + Object.keys(seed).length + ' channels, ' + seedPosts + ' posts');
console.log('archive: ' + archiveFiles.length + ' channels, ' + archivePosts + ' posts');
console.log('channels in the seed but not in the archive: ' +
  Object.keys(seed).filter(u => !archiveFiles.includes(u + '.json')).length);
console.log('channels in the archive but not in the seed: ' +
  archiveFiles.filter(f => !seed[f.replace('.json', '')]).length);

let bytes = 0;
for (const f of archiveFiles) bytes += fs.statSync(path.join(ROOT, 'posts', f)).size;
console.log('archive size: ' + (bytes / 1024 / 1024).toFixed(2) + ' MB');
console.log('posts.js size: ' + (fs.statSync(path.join(ROOT, 'posts.js')).size / 1024).toFixed(0) + ' KB');
