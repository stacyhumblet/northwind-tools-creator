const TOOLS_SHEET_ID = '1emAXWbsmxsSvlsgiU7W0PeWyrW4iU-rk7fLkal3huUE';
const TOOLS_TAB_NAME = 'Prod Links';
const THEME_FILTER   = 'Creator & Ecommerce';
const CACHE_KEY      = 'nw_ce_v1';
const CACHE_TTL      = 21600; // 6 hours

/* ─── Entry point ─── */
function doGet() {
  try {
    const apps = getAppsData();
    return ContentService
      .createTextOutput(JSON.stringify(apps))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/* ─── Fetch and parse apps from sheet ─── */
function getAppsData() {
  // Try cache first
  const cache  = CacheService.getScriptCache();
  const cached = cache.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const ss    = SpreadsheetApp.openById(TOOLS_SHEET_ID);
  const sheet = ss.getSheetByName(TOOLS_TAB_NAME);
  if (!sheet) throw new Error('Tab "' + TOOLS_TAB_NAME + '" not found in spreadsheet.');

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  // Detect columns by header name (case-insensitive, partial match)
  const headers = data[0].map(h => h.toString().toLowerCase().trim());
  const col = (...names) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  // Matches sheet headers: Category | Web App Name | Purpose | Prod Link | Theme
  const titleIdx      = col('web app name', 'title', 'name', 'app');
  const categoryIdx   = col('category', 'cat', 'group', 'type');
  const urlIdx        = col('prod link', 'url', 'link', 'href');
  const purposeIdx    = col('purpose', 'description', 'desc', 'detail', 'note');
  const screenshotIdx = col('screenshot', 'image', 'preview', 'img');
  const themeIdx      = col('theme');

  const apps = [];
  for (let i = 1; i < data.length; i++) {
    const row   = data[i];
    const theme = themeIdx >= 0 ? row[themeIdx].toString().trim() : '';
    if (theme !== THEME_FILTER) continue; // only include matching theme rows

    const title    = titleIdx    >= 0 ? row[titleIdx].toString().trim()      : '';
    const url      = urlIdx      >= 0 ? row[urlIdx].toString().trim()        : '';
    const category = (categoryIdx >= 0 ? row[categoryIdx].toString().trim() : '') || 'Tools';
    const purpose  = purposeIdx  >= 0 ? row[purposeIdx].toString().trim()    : '';
    const screenshot = screenshotIdx >= 0 ? row[screenshotIdx].toString().trim() : '';

    if (!title || !url) continue; // skip incomplete rows
    apps.push({ title, category, url, purpose, screenshot });
  }

  try { cache.put(CACHE_KEY, JSON.stringify(apps), CACHE_TTL); } catch (e) {}
  return apps;
}

/* ─── Force-clear cache (run from editor to reset) ─── */
function clearCache() {
  CacheService.getScriptCache().remove(CACHE_KEY);
  Logger.log('Cache cleared.');
}
