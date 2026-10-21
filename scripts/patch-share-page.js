// Let a shared link open the channel directly: ?channel=<username>.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'index.html');
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

function replace(from, to, label) {
  if (!s.includes(from)) { console.log('skip (not found): ' + label); return false; }
  s = s.replace(from, to);
  console.log('applied: ' + label);
  return true;
}

// --- 1) open the channel from the URL --------------------------------------
replace(
  "function checkSharedFolder(){",
  "// A shared link can point straight at a channel: ?channel=<username>\n" +
  "function checkSharedChannel(){\n" +
  "  const u=new URLSearchParams(location.search).get('channel');\n" +
  "  if(!u)return;\n" +
  "  const username=u.replace(/[^a-zA-Z0-9_]/g,'');\n" +
  "  if(!username)return;\n" +
  "  setTimeout(()=>openChannel(username),600);\n" +
  "}\n" +
  "function checkSharedFolder(){",
  'the ?channel= handler');

// --- 2) call it on boot ----------------------------------------------------
replace(
  "checkPWA();checkSharedFolder();initNotifs();",
  "checkPWA();checkSharedFolder();checkSharedChannel();initNotifs();",
  'the boot call');

// --- 3) a button that copies the share page link ---------------------------
replace(
  '      <button class="modal-btn modal-btn-secondary" id="modalShareBtn"><span>🔗</span> <span data-i18n="share_link">Share link</span></button>',
  '      <button class="modal-btn modal-btn-secondary" id="modalShareBtn"><span>🔗</span> <span data-i18n="share_link">Share link</span></button><button class="modal-btn modal-btn-secondary" id="modalSharePageBtn"><span>📄</span> <span data-i18n="share_page">Share page</span></button>',
  'the share page button');

replace(
  "  document.getElementById('modalShareBtn').onclick=()=>shareChannelLink(username);",
  "  document.getElementById('modalShareBtn').onclick=()=>shareChannelLink(username);\n" +
  "  document.getElementById('modalSharePageBtn').onclick=()=>shareChannelPage(username);",
  'the share page handler');

// --- 4) the function --------------------------------------------------------
replace(
  "// ============================================================\n// CHART (Canvas)\n// ============================================================",
  "// Copy the link to the share page of a channel (the one with the rich\n" +
  "// preview for Telegram, Twitter and WhatsApp).\n" +
  "async function shareChannelPage(username){\n" +
  "  const base=location.origin+location.pathname.replace(/[^/]*$/,'');\n" +
  "  const url=base+'share/'+username+'.html';\n" +
  "  if(navigator.share){\n" +
  "    try{await navigator.share({title:'@'+username,url});return}\n" +
  "    catch(e){if(e&&e.name==='AbortError')return}\n" +
  "  }\n" +
  "  try{await navigator.clipboard.writeText(url);toast('🔗 '+t('toast_link_copied'))}\n" +
  "  catch(e){toast('⚠️ '+t('toast_copy_fail'))}\n" +
  "}\n" +
  "// ============================================================\n// CHART (Canvas)\n// ============================================================",
  'the shareChannelPage function');

fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
console.log('done');
