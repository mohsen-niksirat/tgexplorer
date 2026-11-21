// Register the background sync and tell the service worker which channels
// to watch (the favourites).
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'index.html');
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

const ANCHOR = 'function registerSW(){';
if (!s.includes(ANCHOR)) { console.error('the registerSW function was not found'); process.exit(1); }

const BLOCK = `// Tell the service worker which channels to watch, so the periodic
// sync can show a local notification when one of them posts something new.
async function syncWatchList(){
  if(!('serviceWorker' in navigator))return;
  try{
    const reg=await navigator.serviceWorker.ready;
    const channels=(state.favorites||[]).map(f=>f.username).filter(Boolean);
    const worker=reg.active||navigator.serviceWorker.controller;
    if(worker&&worker.postMessage)worker.postMessage({type:'watch',channels});
    // Record the ids the worker has already seen, so the first sync only
    // registers them and does not notify about old posts.
    if(channels.length&&state.notifSeen){
      const seen={};
      for(const u of channels){
        const posts=getChannelPosts(u);
        if(posts.length)seen[u]=posts.map(p=>String(p.id)).slice(0,50);
      }
      if(worker&&worker.postMessage)worker.postMessage({type:'seen',seen});
    }
  }catch(e){}
}

// Ask the browser for a periodic background sync (where it is supported).
async function registerPeriodicSync(){
  if(!('serviceWorker' in navigator))return;
  try{
    const reg=await navigator.serviceWorker.ready;
    if(!('periodicSync' in reg))return;
    const status=await navigator.permissions.query({name:'periodic-background-sync'});
    if(status.state==='granted'){
      await reg.periodicSync.register('tg-check-posts',{minInterval:6*60*60*1000});
    }
  }catch(e){}
}
function registerSW(){`;

s = s.replace(ANCHOR, BLOCK);

// Call them once the app is up.
const BOOT = 'registerSW();checkPWA();';
if (!s.includes(BOOT)) { console.error('the boot sequence was not found'); process.exit(1); }
s = s.replace(BOOT, 'registerSW();registerPeriodicSync();syncWatchList();checkPWA();');

fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
console.log('patched index.html');
for (const c of ['async function syncWatchList()', 'async function registerPeriodicSync()', 'registerPeriodicSync();syncWatchList();']) {
  console.log((s.includes(c) ? 'OK   ' : 'MISS ') + c);
}
