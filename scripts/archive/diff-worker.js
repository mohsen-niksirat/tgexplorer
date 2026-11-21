// Compare the function lists of the two worker copies.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const deployed = fs.readFileSync(path.join(ROOT, 'worker.js'), 'utf8');
const embeddedRaw = fs.readFileSync(path.join(ROOT, 'js', 'worker-code.js'), 'utf8');
const from = embeddedRaw.indexOf('WORKER_CODE=`') + 'WORKER_CODE=`'.length;
const embedded = embeddedRaw.slice(from, embeddedRaw.lastIndexOf('`;'));

const fns = src => {
  const set = new Set();
  for (const m of src.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) set.add(m[1]);
  return [...set].sort();
};
const a = fns(deployed);
const b = fns(embedded);
console.log('worker.js functions: ' + a.length + ' | embedded: ' + b.length);
console.log('\nonly in worker.js:');
a.filter(f => !b.includes(f)).forEach(f => console.log('   ' + f));
console.log('\nonly in embedded:');
b.filter(f => !a.includes(f)).forEach(f => console.log('   ' + f));

// how many lines each
console.log('\nlines: worker.js ' + deployed.split('\n').length + ' | embedded ' + embedded.split('\n').length);
// the tail of worker.js (the extra part?)
const tail = deployed.split('\n').slice(-28).join('\n');
console.log('\n--- worker.js tail ---\n' + tail.slice(0, 1400));
