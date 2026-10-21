// Summarise a Lighthouse report: the failing audits and the biggest wins.
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || 'test-out-lh.json';
const r = JSON.parse(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));

console.log('=== scores ===');
for (const [k, v] of Object.entries(r.categories)) {
  console.log('  ' + k.padEnd(16) + Math.round(v.score * 100));
}

console.log('\n=== metrics ===');
for (const id of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time',
  'cumulative-layout-shift', 'speed-index', 'interactive']) {
  const a = r.audits[id];
  if (!a) continue;
  console.log('  ' + a.title.padEnd(26) + String(a.displayValue || '').padEnd(12) + ' score ' + a.score);
}

console.log('\n=== opportunities / diagnostics (score < 0.9) ===');
for (const ref of r.categories.performance.auditRefs) {
  const a = r.audits[ref.id];
  if (!a || a.score === null || a.score >= 0.9) continue;
  console.log('  [' + a.score + '] ' + ref.id + ' — ' + a.title + (a.displayValue ? '  (' + a.displayValue + ')' : ''));
  if (a.details && a.details.items && a.details.items.length && a.details.items.length <= 6) {
    for (const it of a.details.items.slice(0, 6)) {
      const u = it.url ? it.url.replace('http://localhost:3000', '') : '';
      console.log('        ' + (it.node && it.node.snippet ? it.node.snippet.slice(0, 90) : (u || JSON.stringify(it).slice(0, 90))));
    }
  }
}

console.log('\n=== accessibility failures ===');
for (const ref of r.categories.accessibility.auditRefs) {
  const a = r.audits[ref.id];
  if (!a || a.score === null || a.score === 1) continue;
  console.log('  [FAIL] ' + ref.id + ' — ' + a.title);
  if (a.details && a.details.items) {
    for (const it of a.details.items.slice(0, 6)) {
      console.log('        ' + (it.node && it.node.snippet ? it.node.snippet.slice(0, 130) : JSON.stringify(it).slice(0, 130)));
      if (it.node && it.node.explanation) console.log('          → ' + it.node.explanation.slice(0, 160));
    }
  }
}
