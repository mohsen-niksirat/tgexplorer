// Replace the compare search box with a select - it is simpler, it is
// accessible by keyboard and screen readers, and it cannot be covered by
// the toast container.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'index.html');
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

// --- 1) the markup ----------------------------------------------------------
const OLD_PICKER = `      <div class="compare-picker">
        <input class="sug-field" id="compareSearch" placeholder="Search a channel to compare…" autocomplete="off" oninput="compareSearch(this.value)">
        <div class="compare-results" id="compareResults"></div>
      </div>`;
const NEW_PICKER = `      <div class="compare-picker">
        <label class="sug-label" for="compareSelect" data-i18n="compare_pick">Pick a channel to compare</label>
        <select class="sug-field" id="compareSelect" aria-label="Compare with" onchange="pickCompareChannel(this.value)"></select>
      </div>`;
if (!s.includes(OLD_PICKER)) { console.error('the compare picker was not found'); process.exit(1); }
s = s.replace(OLD_PICKER, NEW_PICKER);

// --- 2) the logic -----------------------------------------------------------
const OLD_SEARCH = `function compareSearch(q){
  const box=document.getElementById('compareResults');
  const query=(q||'').trim().toLowerCase();
  if(query.length<1){box.classList.remove('show');return}
  const hits=getAllChannels().filter(c=>c.username.toLowerCase()!==compareA.toLowerCase()&&
    ((c.title||'').toLowerCase().includes(query)||c.username.toLowerCase().includes(query))).slice(0,8);
  if(!hits.length){box.innerHTML='<div class="compare-empty">'+escHtml(t('no_match'))+'</div>';box.classList.add('show');return}
  box.innerHTML=hits.map(c=>'<div class="compare-item" onclick="pickCompareChannel(\\''+c.username+'\\')">'+
    '<span style="'+avatarGrad(c.username)+';width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700">'+
    escHtml((c.title||c.username)[0].toUpperCase())+'</span><span>'+escHtml(c.title||c.username)+' <span style="color:var(--text-tertiary)">@'+escHtml(c.username)+'</span></span></div>').join('');
  box.classList.add('show');
}`;
const NEW_SEARCH = `// The list of channels to compare with.
function fillCompareSelect(){
  const select=document.getElementById('compareSelect');
  if(!select)return;
  const channels=getAllChannels().filter(c=>c.username.toLowerCase()!==compareA.toLowerCase());
  select.innerHTML='<option value="">'+escHtml(t('compare_pick'))+'</option>'+
    channels.map(c=>'<option value="'+escAttr(c.username)+'">'+escHtml(c.title||c.username)+' (@'+escHtml(c.username)+')</option>').join('');
  select.value=compareB&&channels.some(c=>c.username===compareB)?compareB:'';
}`;
if (!s.includes(OLD_SEARCH)) { console.error('the compare search was not found'); process.exit(1); }
s = s.replace(OLD_SEARCH, NEW_SEARCH);

// openCompare / pickCompareChannel fill the select.
s = s.replace(
  `  document.getElementById('compareResults').classList.remove('show');
  document.getElementById('compareSearch').value='';
  renderCompare();`,
  `  fillCompareSelect();
  renderCompare();`);
s = s.replace(
  `  compareB=username;
  document.getElementById('compareResults').classList.remove('show');
  document.getElementById('compareSearch').value='';
  renderCompare();`,
  `  compareB=username;
  const select=document.getElementById('compareSelect');
  if(select)select.value=username||'';
  renderCompare();`);

// --- 3) the styles that are no longer needed -------------------------------
s = s.replace(/\.compare-results\{[^}]*\}/g, '');
s = s.replace(/\.compare-results\.show\{[^}]*\}/g, '');
s = s.replace(/\.compare-item\{[^}]*\}/g, '');
s = s.replace(/\.compare-item:hover\{[^}]*\}/g, '');

fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
console.log('patched index.html');
for (const c of ['id="compareSelect"', 'function fillCompareSelect()', 'id="compareSearch"', 'compareResults']) {
  console.log((s.includes(c) ? 'OK   ' : 'MISS ') + c);
}
