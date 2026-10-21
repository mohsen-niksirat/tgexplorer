// Sanity check: the features that must survive the module split.
const fs = require('fs');
const path = require('path');

const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const checks = [
  'function scrollPostModalTop',
  'function folderExportTxt',
  'function folderExportPdf',
  'function folderExportJson',
  'function exportPostsTxt',
  'function exportPostsPdf',
  'netBanner',
  'tabindex="0"',
  ':focus-visible',
  'data-i18n-aria-label',
  'fetchWorker',
  'initNetStatus',
  'aria-label="Close"',
  'role="dialog"',
  'Object.assign(window, {',
];
for (const c of checks) console.log((s.includes(c) ? 'OK   ' : 'MISS ') + c);

// The module files
for (const f of ['js/i18n.js', 'js/state.js', 'js/worker-code.js']) {
  const p = path.join(__dirname, '..', f);
  console.log((fs.existsSync(p) ? 'OK   ' : 'MISS ') + f);
}

// The i18n module must carry the network-status strings.
const i18n = fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n.js'), 'utf8');
for (const k of ['net_offline', 'net_fallback', 'net_retry', 'net_reconnected', 'net_still_down']) {
  console.log((i18n.includes(k) ? 'OK   ' : 'MISS ') + 'i18n key ' + k);
}
for (const k of ['export const I18N=', 'export const I18N_UI=', 'export function t(', 'import { state }']) {
  console.log((i18n.includes(k) ? 'OK   ' : 'MISS ') + 'i18n ' + k);
}
const state = fs.readFileSync(path.join(__dirname, '..', 'js', 'state.js'), 'utf8');
console.log((state.includes('export let state=') ? 'OK   ' : 'MISS ') + 'state export');
const wc = fs.readFileSync(path.join(__dirname, '..', 'js', 'worker-code.js'), 'utf8');
console.log((wc.includes('export const WORKER_CODE=') ? 'OK   ' : 'MISS ') + 'worker-code export');
