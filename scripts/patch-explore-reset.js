// Reset the Explore pagination whenever the result set changes (a filter,
// the sort order or the view mode) — otherwise the user would land on an
// empty page after narrowing the results.
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'index.html');
const raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

const REPLACEMENTS = [
  // the sort changes
  ["function setExploreSort(v){state.exploreSort=v;localStorage.setItem('tgexp_esort',v);syncUrlFilters(true);renderResults()}",
   "function setExploreSort(v){state.exploreSort=v;localStorage.setItem('tgexp_esort',v);syncUrlFilters(true);resetExplorePage();renderResults()}"],
  // the view mode changes
  ["function setExploreView(v){\n  state.exploreView=v;localStorage.setItem('tgexp_eview',v);",
   "function setExploreView(v){\n  state.exploreView=v;localStorage.setItem('tgexp_eview',v);resetExplorePage();"],
  // a filter changes
  ["  saveFilters();\n  syncUrlFilters(true);\n  renderFilterBar();\n  renderFilterChips();\n  applyFiltersToView();",
   "  saveFilters();\n  syncUrlFilters(true);\n  resetExplorePage();\n  renderFilterBar();\n  renderFilterChips();\n  applyFiltersToView();"],
  // the content type changes
  ["  saveFilters();\n  syncUrlFilters(true);\n  renderFilterBar();\n  renderFilterChips();\n  applyFiltersToView();\n}\n// Re-render the current view with the new filters.",
   "  saveFilters();\n  syncUrlFilters(true);\n  resetExplorePage();\n  renderFilterBar();\n  renderFilterChips();\n  applyFiltersToView();\n}\n// Re-render the current view with the new filters."],
  // clearing the filters
  ["function clearFilters(){\n  state.filterCats=[];\n  state.filterLangs=[];\n  state.filterTypes=[];\n  saveFilters();\n  syncUrlFilters(true);",
   "function clearFilters(){\n  state.filterCats=[];\n  state.filterLangs=[];\n  state.filterTypes=[];\n  saveFilters();\n  syncUrlFilters(true);\n  resetExplorePage();"],
];

let changed = 0;
for (const [from, to] of REPLACEMENTS) {
  if (!s.includes(from)) { console.log('skip (not found): ' + from.slice(0, 60)); continue; }
  s = s.replace(from, to);
  changed++;
}

fs.writeFileSync(p, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
console.log('applied ' + changed + ' of ' + REPLACEMENTS.length + ' replacements');
const resets = (s.match(/resetExplorePage\(\)/g) || []).length;
console.log('resetExplorePage() call sites: ' + resets);
