// Paginate the Explore views.
//
// Rendering all 116 channels at once cost ~4.6 s of style and layout work
// on a mid-range phone (the Lighthouse run showed a total blocking time of
// 1.28 s). Rendering a page of 24 and letting the user ask for more keeps
// the first paint fast.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'index.html');
const raw = fs.readFileSync(p, 'utf8');
// Work with LF internally and restore the original line endings at the end.
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

// --- 1) a page size constant + a "show more" handler ------------------------
const ANCHOR = "// ============================================================\n// EXPLORE\n// ============================================================";
if (!s.includes(ANCHOR)) { console.error('the EXPLORE section was not found'); process.exit(1); }
const BLOCK = ANCHOR + `
// How many channels the Explore grid renders at once.
const EXPLORE_PAGE=24;
// Show the next page of the Explore grid.
function showMoreExplore(){
  state.explorePage=(state.explorePage||EXPLORE_PAGE)+EXPLORE_PAGE;
  renderResults();
}
// Back to the first page (used when a filter or the sort changes).
function resetExplorePage(){state.explorePage=EXPLORE_PAGE}
`;
s = s.replace(ANCHOR, BLOCK);

// --- 2) slice the list in renderExploreView ---------------------------------
const OLD_GRID = "  let filtered=sortExplore(type==='all'?items:items.filter(ch=>typeOf(ch)===type));";
const NEW_GRID = "  let filtered=sortExplore(type==='all'?items:items.filter(ch=>typeOf(ch)===type));\n  const page=state.explorePage||EXPLORE_PAGE;\n  const shown=filtered.slice(0,page);\n  filtered=shown;";
if (!s.includes(OLD_GRID)) { console.error('the explore filter line was not found'); process.exit(1); }
s = s.replace(OLD_GRID, NEW_GRID);

// --- 3) the "show more" button at the end of the grid -----------------------
const OLD_TAIL = "  container.innerHTML=bar+exploreSortHtml()+searchHtml+(state.exploreView==='list'?listBody:`<div class=\"explore-grid\">";
if (!s.includes(OLD_TAIL)) { console.error('the explore grid template was not found'); process.exit(1); }
s = s.replace(OLD_TAIL, "  const more=items.length>page?'<div class=\"explore-more\"><button class=\"explore-more-btn\" onclick=\"showMoreExplore()\">'+escHtml(t('show_more_channels'))+'</button></div>':'';\n  container.innerHTML=bar+exploreSortHtml()+searchHtml+(state.exploreView==='list'?listBody:`<div class=\"explore-grid\">");

// close the grid div and add the button
const OLD_END = "  }).join('')}</div>`);";
const NEW_END = "  }).join('')}</div>`)+more;";
if (!s.includes(OLD_END)) { console.error('the end of the explore grid was not found'); process.exit(1); }
s = s.replace(OLD_END, NEW_END);

// --- 4) the list view ------------------------------------------------------
const OLD_LIST = "function renderListView(container,items){container.innerHTML=`<div class=\"results-list\">${items.map(ch=>";
const NEW_LIST = "function renderListView(container,items){const page=state.explorePage||EXPLORE_PAGE;const shown=items.slice(0,page);container.innerHTML=`<div class=\"results-list\">${shown.map(ch=>";
if (!s.includes(OLD_LIST)) { console.error('the list view was not found'); process.exit(1); }
s = s.replace(OLD_LIST, NEW_LIST);

const OLD_LIST_END = "}</div>`}\n\nfunction getChannelPosts(username){";
const NEW_LIST_END = "}</div>`+(items.length>page?'<div class=\"explore-more\"><button class=\"explore-more-btn\" onclick=\"showMoreExplore()\">'+escHtml(t('show_more_channels'))+'</button></div>':'')}\n\nfunction getChannelPosts(username){";
if (!s.includes(OLD_LIST_END)) { console.error('the end of the list view was not found'); process.exit(1); }
s = s.replace(OLD_LIST_END, NEW_LIST_END);

fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
console.log('patched index.html');
for (const c of ['const EXPLORE_PAGE=24', 'function showMoreExplore()', 'const shown=filtered.slice(0,page)',
  'explore-more-btn', 'show_more_channels']) {
  console.log((s.includes(c) ? 'OK   ' : 'MISS ') + c);
}
