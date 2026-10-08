// TikTok sometimes answers 403 to a page opened in a new tab and lets the next
// attempt through. Tabs opened by the extension reload themselves when that happens.
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;
// ponytail: in-memory state; if the service worker sleeps between the 403 and the reload, that tab gets no retry.
const retriesLeft = new Map();

async function openTikTok(url) {
  const tab = await chrome.tabs.create({ url });
  retriesLeft.set(tab.id, MAX_RETRIES);
}

chrome.webRequest.onCompleted.addListener(
  ({ tabId, statusCode }) => {
    const left = retriesLeft.get(tabId);
    if (left === undefined) return;
    if (statusCode !== 403) return void retriesLeft.delete(tabId);
    if (left === 0) return void retriesLeft.delete(tabId);
    retriesLeft.set(tabId, left - 1);
    setTimeout(() => chrome.tabs.reload(tabId).catch(() => retriesLeft.delete(tabId)), RETRY_DELAY_MS);
  },
  { urls: ['https://www.tiktok.com/*'], types: ['main_frame'] },
);
chrome.tabs.onRemoved.addListener((tabId) => retriesLeft.delete(tabId));

chrome.action.onClicked.addListener((tab) => {
  if (tab.id != null) chrome.tabs.sendMessage(tab.id, { type: 'toggle' }).catch(() => openTikTok('https://www.tiktok.com/'));
});

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === 'open' && typeof msg.url === 'string' && msg.url.startsWith('https://www.tiktok.com/')) {
    openTikTok(msg.url);
    return;
  }
  // Fallback for files the page can't fetch (tiktokcdn.com CORS, expired link):
  // the download manager fetches them directly, with TikTok's cookies.
  if (msg?.type !== 'download' || !Array.isArray(msg.files)) return;
  Promise.all(
    msg.files.map((f) => chrome.downloads.download({ url: f.url, filename: `ttsorter/${f.filename}`, conflictAction: 'uniquify' })),
  ).then((ids) => reply({ ok: true, ids }), (e) => reply({ ok: false, error: String(e?.message || e) }));
  return true;
});
