// Check a Lighthouse report against the project budgets.
//
//   node scripts/check-lighthouse.js [report.json]
//
// The job fails when a category drops below its budget, so a performance or
// accessibility regression is caught before it reaches production.
const fs = require('fs');
const path = require('path');

const BUDGETS = {
  performance: 90,
  accessibility: 95,
};

const file = process.argv[2] || 'lighthouse-report.json';
const reportPath = path.isAbsolute(file) ? file : path.join(__dirname, '..', file);

if (!fs.existsSync(reportPath)) {
  console.error('Lighthouse report not found: ' + reportPath);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

console.log('=== Lighthouse (mobile) ===');
const metrics = ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time',
  'cumulative-layout-shift', 'speed-index', 'interactive'];
for (const id of metrics) {
  const a = report.audits[id];
  if (!a || a.displayValue === undefined) continue;
  console.log('  ' + a.title.padEnd(28) + String(a.displayValue).padEnd(12) + 'score ' + a.score);
}

let failed = false;
console.log('\n=== budgets ===');
for (const [category, budget] of Object.entries(BUDGETS)) {
  const cat = report.categories[category];
  if (!cat) {
    console.error('  the report has no category "' + category + '"');
    failed = true;
    continue;
  }
  const score = Math.round(cat.score * 100);
  const ok = score >= budget;
  if (!ok) failed = true;
  console.log('  ' + (ok ? 'OK   ' : 'FAIL ') + category.padEnd(16) + score + ' / ' + budget);

  // List the audits that dragged the score down.
  if (!ok) {
    const worst = (cat.auditRefs || [])
      .map(ref => report.audits[ref.id])
      .filter(a => a && a.score !== null && a.score < 0.9)
      .sort((a, b) => a.score - b.score);
    for (const a of worst.slice(0, 8)) {
      console.log('         [' + a.score + '] ' + a.id + ' — ' + a.title + (a.displayValue ? ' (' + a.displayValue + ')' : ''));
    }
  }
}

if (failed) {
  console.error('\n::error::The Lighthouse budgets are not met');
  process.exit(1);
}
console.log('\nOK   all Lighthouse budgets are met');
