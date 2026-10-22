// ============================================================
// state.js — the single mutable app state (persisted in
// localStorage) and shared by every module.
//
// The Explore filters are multi-select and therefore arrays:
//   filterCats  — category ids   (empty = every category)
//   filterLangs — language codes  (empty = every language)
//   filterTypes — content types   (empty = every type)
// The legacy single-select values (currentCategory / searchLang /
// exploreType) are kept in sync with them for the code paths that
// can only express one value (the Worker query, the feed).
// ============================================================

function readList(key, legacy, legacyAll) {
  const raw = localStorage.getItem(key);
  if (raw !== null) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter(x => typeof x === 'string' && x);
    } catch (e) { /* fall through to the legacy value */ }
  }
  // First run after the upgrade: migrate the old single value.
  if (legacy && legacy !== legacyAll) return [legacy];
  return [];
}

// localStorage can hold anything a previous version (or the user) wrote, so
// never let a malformed value break the import of this module: a throw here
// means a blank page with no way back.
function readJson(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(fallback)) return Array.isArray(v) ? v : fallback;
    if (fallback && typeof fallback === 'object') return v && typeof v === 'object' && !Array.isArray(v) ? v : fallback;
    return v;
  } catch (e) { return fallback; }
}

export let state={
  lang:localStorage.getItem('tgexp_lang')||'en',
  theme:localStorage.getItem('tgexp_theme')||'dark',
  workerUrl:localStorage.getItem('tgexp_worker')||'',
  currentTab:'explore',
  currentView:'grid',
  currentCategory:'all',
  searchLang:localStorage.getItem('tgexp_search_lang')||'all',
  exploreType:localStorage.getItem('tgexp_etype')||'all',
  homeType:localStorage.getItem('tgexp_home_type')||'all',
  searchQuery:'',
  searchMode:localStorage.getItem('tgexp_search_mode')||'channels',
  searchResults:[],
  favorites:readJson('tgexp_favs',[]),
  postFavs:readJson('tgexp_post_favs',[]),
  favPost:false,
  favFolder:false,
  openFolder:'',
  folderIcon:'📁',
  favSort:localStorage.getItem('tgexp_favsort')||'name',
  exploreSort:localStorage.getItem('tgexp_esort')||'name',
  exploreView:localStorage.getItem('tgexp_eview')||'grid',
  exploreSearch:localStorage.getItem('tgexp_esearch')||'',
  favPostType:localStorage.getItem('tgexp_favptype')||'all',
  folders:readJson('tgexp_folders',[]),
  livePosts:[],
  notifUpdates:[],
  notifSeen:readJson('tgexp_notif_seen',{}),
  notifEnabled:localStorage.getItem('tgexp_notif_enabled')==='1',
  suggestions:readJson('tgexp_suggestions',[]),
  lastNotifCheck:parseInt(localStorage.getItem('tgexp_last_notif')||'0',10)||0,
  feedPool:[],
  feedPage:0,
  feedDone:false,
  feedMode:'local',
  fontSize:localStorage.getItem('tgexp_fs')||'medium',
  // --- multi-select Explore filters ---
  filterCats:readList('tgexp_fcats',localStorage.getItem('tgexp_cat'),'all'),
  filterLangs:readList('tgexp_flangs',localStorage.getItem('tgexp_search_lang'),'all'),
  filterTypes:readList('tgexp_ftypes',localStorage.getItem('tgexp_etype'),'all'),
};
