// Show the script tags of index.html and check the boot wiring.
const fs = require('fs');
const path = require('path');

const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
console.log('script tags:');
s.split('\n').forEach((l, i) => {
  if (/<script/.test(l)) console.log('  L' + (i + 1) + ': ' + l.trim().slice(0, 70));
});
console.log('\nhas privacy-box      :', s.includes('privacy-box'));
console.log('has DOMContentLoaded :', s.includes("DOMContentLoaded"));
console.log('has showApp()        :', s.includes('showApp();'));
console.log('module count         :', (s.match(/<script type="module">/g) || []).length);
console.log('classic script count :', (s.match(/^<script>\s*$/gm) || []).length);
