chrome.action.onClicked.addListener((tab) => {
  if (tab.id != null) chrome.tabs.sendMessage(tab.id, { type: 'toggle' }).catch(() => chrome.tabs.create({ url: 'https://www.tiktok.com/' }));
});

// Caminho pros arquivos que a página não consegue buscar (CORS do tiktokcdn.com,
// link expirado): o gerenciador de downloads baixa direto, com os cookies do TikTok.
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type !== 'download' || !Array.isArray(msg.files)) return;
  Promise.all(
    msg.files.map((f) => chrome.downloads.download({ url: f.url, filename: `ttsorte/${f.filename}`, conflictAction: 'uniquify' })),
  ).then((ids) => reply({ ok: true, ids }), (e) => reply({ ok: false, error: String(e?.message || e) }));
  return true;
});
