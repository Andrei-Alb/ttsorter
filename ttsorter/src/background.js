// O TikTok às vezes responde 403 a uma página aberta em aba nova e libera na
// tentativa seguinte. As abas que a extensão abre recarregam sozinhas nesse caso.
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;
// ponytail: estado em memória; se o service worker dormir entre o 403 e o reload, aquela aba fica sem retry.
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
  // Caminho pros arquivos que a página não consegue buscar (CORS do tiktokcdn.com,
  // link expirado): o gerenciador de downloads baixa direto, com os cookies do TikTok.
  if (msg?.type !== 'download' || !Array.isArray(msg.files)) return;
  Promise.all(
    msg.files.map((f) => chrome.downloads.download({ url: f.url, filename: `ttsorter/${f.filename}`, conflictAction: 'uniquify' })),
  ).then((ids) => reply({ ok: true, ids }), (e) => reply({ ok: false, error: String(e?.message || e) }));
  return true;
});
