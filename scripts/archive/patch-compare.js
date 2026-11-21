// Add the "compare two channels" view.
//
// The compare button in the channel modal opens a view with the current
// channel and a second one side by side: the activity charts, the stats
// and the content tags of both.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'index.html');
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

// --- 1) the markup ----------------------------------------------------------
const MODAL_END = `<!-- CHANNEL DETAIL MODAL -->`;
if (!s.includes(MODAL_END)) { console.error('the channel modal was not found'); process.exit(1); }

const MARKUP = `<!-- COMPARE TWO CHANNELS -->
<div class="modal-overlay" id="compareOverlay" role="dialog" aria-modal="true" aria-label="Compare channels">
  <div class="modal" style="max-width:760px">
    <div class="modal-header">
      <div class="modal-avatar" style="background:var(--accent-gradient)">⚖️</div>
      <div><div class="modal-title" data-i18n="compare_title">Compare channels</div><div class="modal-user" data-i18n="compare_sub">Two channels, side by side</div></div>
      <button class="modal-close" aria-label="Close" onclick="closeCompare()">✕</button>
    </div>
    <div class="modal-body">
      <div class="compare-grid">
        <div class="compare-col" id="compareColA"></div>
        <div class="compare-col" id="compareColB"></div>
      </div>
      <div class="compare-picker">
        <input class="sug-field" id="compareSearch" placeholder="Search a channel to compare…" autocomplete="off" oninput="compareSearch(this.value)">
        <div class="compare-results" id="compareResults"></div>
      </div>
    </div>
  </div>
</div>

`;

s = s.replace(MODAL_END, MARKUP + MODAL_END);

// --- 2) the styles ----------------------------------------------------------
const STYLE_ANCHOR = '.ac-user{font-size:11px;color:var(--text-secondary)}';
if (!s.includes(STYLE_ANCHOR)) { console.error('the style anchor was not found'); process.exit(1); }
const STYLES = `.ac-user{font-size:11px;color:var(--text-secondary)}
/* ============================================================
   COMPARE TWO CHANNELS
   ============================================================ */
.compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
@media (max-width:640px){.compare-grid{grid-template-columns:1fr}}
.compare-col{background:var(--bg-secondary);border:1px solid var(--border);border-radius:14px;padding:14px}
.compare-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.compare-avatar{width:42px;height:42px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;overflow:hidden}
.compare-name{font-size:14px;font-weight:700;line-height:1.3}
.compare-user{font-size:11.5px;color:var(--text-tertiary)}
.compare-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.compare-stat{background:var(--bg-primary);border-radius:10px;padding:8px 10px;text-align:center}
.compare-stat b{display:block;font-size:16px;font-weight:800;color:var(--accent)}
.compare-stat span{font-size:10.5px;color:var(--text-secondary)}
.compare-chart{width:100%;height:120px;display:block}
.compare-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.compare-tag{font-size:10.5px;padding:2px 8px;border-radius:12px;background:var(--bg-hover);border:1px solid var(--border);color:var(--text-secondary)}
.compare-picker{position:relative}
.compare-results{position:absolute;left:0;right:0;top:100%;z-index:10;background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;max-height:220px;overflow-y:auto;display:none}
.compare-results.show{display:block}
.compare-item{display:flex;align-items:center;gap:9px;padding:9px 12px;cursor:pointer;font-size:13px}
.compare-item:hover{background:var(--bg-hover)}
.compare-empty{text-align:center;color:var(--text-tertiary);font-size:12.5px;padding:26px 10px}`;

s = s.replace(STYLE_ANCHOR, STYLES);

// --- 3) the button in the channel modal -------------------------------------
const OLD_BTN = '<button class="modal-btn modal-btn-secondary" id="modalSharePageBtn"><span>📄</span> <span data-i18n="share_page">Share page</span></button>';
const NEW_BTN = OLD_BTN + '<button class="modal-btn modal-btn-secondary" id="modalCompareBtn"><span>⚖️</span> <span data-i18n="compare">Compare</span></button>';
if (!s.includes(OLD_BTN)) { console.error('the share page button was not found'); process.exit(1); }
s = s.replace(OLD_BTN, NEW_BTN);

const OLD_HANDLER = "  document.getElementById('modalSharePageBtn').onclick=()=>shareChannelPage(username);";
const NEW_HANDLER = OLD_HANDLER + "\n  document.getElementById('modalCompareBtn').onclick=()=>openCompare(username);";
if (!s.includes(OLD_HANDLER)) { console.error('the share page handler was not found'); process.exit(1); }
s = s.replace(OLD_HANDLER, NEW_HANDLER);

// --- 4) the logic -----------------------------------------------------------
const LOGIC_ANCHOR = '// ============================================================\n// CHANNEL PROFILE — activity, stats, content tags';
if (!s.includes(LOGIC_ANCHOR)) { console.error('the profile section was not found'); process.exit(1); }

const LOGIC = `// ============================================================
// COMPARE TWO CHANNELS
// ============================================================
let compareA='',compareB='';

function openCompare(username){
  compareA=username;
  compareB='';
  document.getElementById('compareResults').classList.remove('show');
  document.getElementById('compareSearch').value='';
  renderCompare();
  document.getElementById('compareOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeCompare(){
  document.getElementById('compareOverlay').classList.remove('open');
  document.body.style.overflow='';
}
function pickCompareChannel(username){
  compareB=username;
  document.getElementById('compareResults').classList.remove('show');
  document.getElementById('compareSearch').value='';
  renderCompare();
}
function compareSearch(q){
  const box=document.getElementById('compareResults');
  const query=(q||'').trim().toLowerCase();
  if(query.length<1){box.classList.remove('show');return}
  const hits=getAllChannels().filter(c=>c.username.toLowerCase()!==compareA.toLowerCase()&&
    (c.title||'').toLowerCase().includes(query)).slice(0,8);
  if(!hits.length){box.innerHTML='<div class="compare-empty">'+escHtml(t('no_match'))+'</div>';box.classList.add('show');return}
  box.innerHTML=hits.map(c=>'<div class="compare-item" onclick="pickCompareChannel(\\''+c.username+'\\')">'+
    '<span style="'+avatarGrad(c.username)+';width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700">'+
    escHtml((c.title||c.username)[0].toUpperCase())+'</span><span>'+escHtml(c.title||c.username)+' <span style="color:var(--text-tertiary)">@'+escHtml(c.username)+'</span></span></div>').join('');
  box.classList.add('show');
}
function compareColumn(username,canvasId){
  if(!username)return '<div class="compare-empty">'+escHtml(t('compare_pick'))+'</div>';
  const ch=getAllChannels().find(c=>c.username===username)||{username,title:username};
  const posts=getChannelPosts(username);
  const days=chartRange||7;
  const activity=channelActivity(username,days);
  const total=activity.reduce((s,d)=>s+d.posts,0);
  const active=activity.filter(d=>d.posts>0).length;
  const perDay=(total/days).toFixed(1);
  const kw=postKeywords(posts,5);
  return '<div class="compare-head">'+
      '<div class="compare-avatar" style="'+avatarGrad(username)+'">'+escHtml((ch.title||username)[0].toUpperCase())+'</div>'+
      '<div><div class="compare-name">'+escHtml(ch.title||username)+'</div><div class="compare-user">@'+escHtml(username)+(ch.members?' · 👥 '+escHtml(ch.members):'')+'</div></div>'+
    '</div>'+
    '<div class="compare-stats">'+
      '<div class="compare-stat"><b>'+perDay+'</b><span>'+escHtml(t('posts_per_day'))+'</span></div>'+
      '<div class="compare-stat"><b>'+posts.length+'</b><span>'+escHtml(t('total_posts'))+'</span></div>'+
      '<div class="compare-stat"><b>'+active+'/'+days+'</b><span>'+escHtml(t('active_days'))+'</span></div>'+
      '<div class="compare-stat"><b>'+total+'</b><span>'+escHtml(t('total_posts'))+'</span></div>'+
    '</div>'+
    '<canvas class="compare-chart" id="'+canvasId+'"></canvas>'+
    (kw.length?'<div class="compare-tags">'+kw.map(k=>'<span class="compare-tag">'+escHtml(k[0])+' · '+k[1]+'</span>').join('')+'</div>':'');
}
function renderCompare(){
  const a=document.getElementById('compareColA');
  const b=document.getElementById('compareColB');
  if(!a||!b)return;
  a.innerHTML=compareColumn(compareA,'compareChartA');
  b.innerHTML=compareColumn(compareB,'compareChartB');
  for(const [id,username] of [['compareChartA',compareA],['compareChartB',compareB]]){
    const canvas=document.getElementById(id);
    if(!canvas||!username)continue;
    const activity=channelActivity(username,chartRange||7);
    drawCompareChart(canvas,activity);
  }
}
// A small chart for the compare view (the profile chart draws into its own
// canvas, so it cannot be reused here).
function drawCompareChart(canvas,data){
  const ctx=canvas.getContext('2d');
  const dpr=window.devicePixelRatio||1;
  const rect=canvas.getBoundingClientRect();
  if(!rect.width)return;
  canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;
  ctx.scale(dpr,dpr);
  const W=rect.width,H=rect.height;
  const padding={top:8,right:6,bottom:18,left:6};
  const chartW=W-padding.left-padding.right;
  const chartH=H-padding.top-padding.bottom;
  const values=data.map(d=>d.posts);
  const maxVal=Math.max(...values,1);
  const stepX=chartW/(values.length-1||1);
  ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--border').trim()||'#e5e5e5';
  ctx.lineWidth=0.5;
  for(let i=0;i<=3;i++){
    const y=padding.top+chartH*(1-i/3);
    ctx.beginPath();ctx.moveTo(padding.left,y);ctx.lineTo(W-padding.right,y);ctx.stroke();
  }
  const gradient=ctx.createLinearGradient(0,padding.top,0,H-padding.bottom);
  gradient.addColorStop(0,'rgba(0,136,204,0.35)');
  gradient.addColorStop(1,'rgba(0,136,204,0.02)');
  ctx.beginPath();
  ctx.moveTo(padding.left,padding.top+chartH);
  values.forEach((v,i)=>{
    const x=padding.left+i*stepX;
    const y=padding.top+chartH-(v/maxVal)*chartH;
    ctx.lineTo(x,y);
  });
  ctx.lineTo(padding.left+stepX*(values.length-1),padding.top+chartH);
  ctx.closePath();
  ctx.fillStyle=gradient;ctx.fill();
  ctx.beginPath();
  values.forEach((v,i)=>{
    const x=padding.left+i*stepX;
    const y=padding.top+chartH-(v/maxVal)*chartH;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  ctx.strokeStyle='#0088cc';ctx.lineWidth=2;ctx.stroke();
}

`;

s = s.replace(LOGIC_ANCHOR, LOGIC + LOGIC_ANCHOR);

fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
console.log('patched index.html');
for (const c of ['id="compareOverlay"', 'function openCompare(', 'function drawCompareChart(', 'id="modalCompareBtn"']) {
  console.log((s.includes(c) ? 'OK   ' : 'MISS ') + c);
}
