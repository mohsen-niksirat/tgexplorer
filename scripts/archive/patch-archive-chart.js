// Use the monthly archive for the long-term activity chart.
//
// The post archive only keeps a rolling three-day window, but the monthly
// archive keeps the post count per channel per day for the whole month.
// The app reads it with the Compression Streams API, so a 90 day chart
// costs a few kilobytes.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'index.html');
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

// --- 1) the loader ----------------------------------------------------------
const ANCHOR = '// ============================================================\n// CHANNEL PROFILE — activity, stats, content tags';
if (!s.includes(ANCHOR)) { console.error('the profile section was not found'); process.exit(1); }

const LOADER = `// The monthly archives: the post count per channel per day, gzipped.
// Loaded lazily and only when a long range is asked for.
let archiveCache=null;
async function loadArchives(){
  if(archiveCache)return archiveCache;
  const out={channels:{},months:[]};
  try{
    const idx=await fetch('archive/index.json').then(r=>r.ok?r.json():null);
    if(!idx||!idx.months||!idx.months.length)return (archiveCache=out);
    out.months=idx.months;
    for(const month of idx.months.slice(-4)){
      const res=await fetch('archive/'+month+'.json.gz');
      if(!res.ok)continue;
      let text;
      if(typeof DecompressionStream!=='undefined'){
        const stream=res.body.pipeThrough(new DecompressionStream('gzip'));
        text=await new Response(stream).text();
      }else{
        // No Compression Streams: the archive cannot be read.
        continue;
      }
      const data=JSON.parse(text);
      for(const [u,days] of Object.entries(data.channels||{})){
        out.channels[u]=Object.assign({},out.channels[u],days);
      }
    }
  }catch(e){}
  return (archiveCache=out);
}

// The daily post counts of a channel for the last N days, from the archive.
async function archivedActivity(username,days){
  const archives=await loadArchives();
  const counts=archives.channels[username];
  if(!counts)return null;
  const today=new Date();
  today.setUTCHours(0,0,0,0);
  const out=[];
  for(let i=days-1;i>=0;i--){
    const d=new Date(today.getTime()-i*86400000);
    const key=d.toISOString().slice(0,10);
    out.push({date:key,posts:counts[key]||0});
  }
  return out;
}

`;
s = s.replace(ANCHOR, LOADER + ANCHOR);

// --- 2) the chart range uses it --------------------------------------------
const OLD_RANGE = `// Switch the activity chart between the 7 and 30 day window.
function setChartRange(days){
  chartRange=days;
  if(chartUsername)renderChannelProfile(chartUsername);
}`;
const NEW_RANGE = `// Switch the activity chart between the 7, 30 and 90 day window.
// The 90 day window comes from the monthly archive.
async function setChartRange(days){
  chartRange=days;
  document.querySelectorAll('.chart-range-btn').forEach(b=>b.classList.toggle('active',Number(b.dataset.days)===days));
  const title=document.getElementById('activityChartTitle');
  if(title)title.textContent=days===90?t('activity_90d'):(days===30?t('activity_30d'):t('activity_chart'));
  if(!chartUsername)return;
  if(days>30){
    const archived=await archivedActivity(chartUsername,days);
    if(archived){
      renderChart(archived);
      return;
    }
  }
  renderChannelProfile(chartUsername);
}`;
if (!s.includes(OLD_RANGE)) { console.error('the range switch was not found'); process.exit(1); }
s = s.replace(OLD_RANGE, NEW_RANGE);

// --- 3) the third button ----------------------------------------------------
const OLD_BTN = '<button class="chart-range-btn" data-days="30" onclick="setChartRange(30)">30</button>';
const NEW_BTN = '<button class="chart-range-btn" data-days="30" onclick="setChartRange(30)">30</button><button class="chart-range-btn" data-days="90" onclick="setChartRange(90)">90</button>';
if (!s.includes(OLD_BTN)) { console.error('the range buttons were not found'); process.exit(1); }
s = s.replace(OLD_BTN, NEW_BTN);

fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
console.log('patched index.html');
for (const c of ['async function loadArchives()', 'async function archivedActivity(', 'activity_90d', 'data-days="90"']) {
  console.log((s.includes(c) ? 'OK   ' : 'MISS ') + c);
}
