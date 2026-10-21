// List every failing accessibility audit node from a Lighthouse report.
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || 'test-out-lh.json';
const r = JSON.parse(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));

for (const ref of r.categories.accessibility.auditRefs) {
  const a = r.audits[ref.id];
  if (!a || a.score === null || a.score === 1) continue;
  console.log('\n### ' + ref.id + ' — ' + a.title);
  const items = (a.details && a.details.items) || [];
  for (const it of items) {
    const sn = it.node && it.node.snippet ? it.node.snippet.replace(/\s+/g, ' ').slice(0, 110) : '';
    const exp = it.node && it.node.explanation ? it.node.explanation.replace(/\s+/g, ' ') : '';
    const ratio = (exp.match(/insufficient color contrast of ([\d.]+)/) || [])[1];
    const fg = (exp.match(/foreground color: ([^,]+)/) || [])[1];
    const bg = (exp.match(/background color: ([^,]+)/) || [])[1];
    console.log('  - ' + sn);
    if (ratio) console.log('      ratio ' + ratio + '  fg ' + fg + '  bg ' + bg);
  }
}
