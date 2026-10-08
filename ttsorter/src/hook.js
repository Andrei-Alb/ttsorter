// Roda no MAIN world em document_start: só daqui dá pra ver as respostas da API
// do TikTok (fetch/XHR) antes do app consumir. A UI fica no isolated world.
(() => {
  if (window.__ttsorterHook) return;
  window.__ttsorterHook = true;

  const TAG = '__ttsorter';
  const items = new Map();
  let pending = [];
  let flushTimer = 0;

  const post = (type, payload) => window.postMessage({ [TAG]: 'out', type, payload }, location.origin);

  const num = (...vals) => {
    let best = 0;
    for (const v of vals) {
      const n = Number(v);
      if (Number.isFinite(n) && n > best) best = n;
    }
    return best;
  };

  const isItem = (o) =>
    typeof o.id === 'string' && /^\d{8,}$/.test(o.id) && o.stats && typeof o.stats === 'object' &&
    (o.video || o.imagePost) && o.author;

  function sourcesOf(video) {
    const out = [];
    for (const b of video.bitrateInfo || []) {
      const pa = b.PlayAddr || {};
      if (pa.UrlList?.length) {
        out.push({ urls: pa.UrlList, w: pa.Width || 0, h: pa.Height || 0, bitrate: b.Bitrate || 0, codec: b.CodecType || '', size: pa.DataSize || 0 });
      }
    }
    // playAddr é o stream do player web, sem marca d'água (downloadAddr tem).
    if (video.playAddr) {
      out.push({ urls: [video.playAddr], w: video.width || 0, h: video.height || 0, bitrate: video.bitrate || 0, codec: video.codecType || '', size: 0 });
    }
    // Maior resolução primeiro; empate decide pelo bitrate.
    return out.sort((a, b) => b.w * b.h - a.w * a.h || b.bitrate - a.bitrate);
  }

  function normalize(raw) {
    const s = raw.stats || {};
    const s2 = raw.statsV2 || {};
    const a = typeof raw.author === 'object' ? raw.author : { uniqueId: raw.author, nickname: raw.nickname };
    const v = raw.video || {};
    const images = (raw.imagePost?.images || []).map((im) => im.imageURL?.urlList?.[0]).filter(Boolean);
    return {
      id: raw.id,
      desc: raw.desc || '',
      createTime: num(raw.createTime),
      author: {
        uniqueId: a.uniqueId || '',
        nickname: a.nickname || a.uniqueId || '',
        avatar: a.avatarThumb || a.avatarMedium || raw.avatarThumb || '',
      },
      stats: {
        views: num(s.playCount, s2.playCount),
        likes: num(s.diggCount, s2.diggCount),
        comments: num(s.commentCount, s2.commentCount),
        shares: num(s.shareCount, s2.shareCount),
      },
      cover: v.cover || v.originCover || raw.imagePost?.cover?.imageURL?.urlList?.[0] || images[0] || '',
      // Itens patrocinados chegam com a duração em ms; o TikTok não aceita upload acima de 60 min.
      duration: num(v.duration) > 3600 ? num(v.duration) / 1000 : num(v.duration),
      isPhoto: !v.playAddr && images.length > 0,
      images,
      sources: sourcesOf(v),
    };
  }

  function walk(node, depth) {
    if (!node || typeof node !== 'object' || depth > 12) return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n, depth + 1);
      return;
    }
    if (isItem(node)) {
      // Anúncio do feed: o link /video/<id> dá "Video currently unavailable" e as métricas não são orgânicas.
      if (node.isAd === true || node.adInfo || node.ad_info) return;
      const it = normalize(node);
      // Algumas respostas vêm sem playAddr/stats completos; não perder o que já temos.
      const prev = items.get(it.id);
      if (prev) {
        if (!it.sources.length) it.sources = prev.sources;
        for (const k of Object.keys(it.stats)) it.stats[k] = Math.max(it.stats[k], prev.stats[k]);
        if (!it.cover) it.cover = prev.cover;
      }
      items.set(it.id, it);
      pending.push(it);
      schedule();
      return;
    }
    for (const k in node) walk(node[k], depth + 1);
  }

  function schedule() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = 0;
      const batch = pending;
      pending = [];
      if (batch.length) post('items', batch);
    }, 80);
  }

  function scanText(text) {
    if (!text || text.length < 20) return;
    const c = text.trimStart()[0];
    if (c !== '{' && c !== '[') return;
    try {
      walk(JSON.parse(text), 0);
    } catch {}
  }

  const watched = (url) => {
    try {
      const u = new URL(url, location.href);
      return /(^|\.)tiktok\.com$/.test(u.hostname) && u.pathname.includes('/api/');
    } catch {
      return false;
    }
  };

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const p = origFetch.apply(this, arguments);
    try {
      const url = typeof input === 'string' ? input : input?.url || String(input);
      if (watched(url)) p.then((r) => r.clone().text()).then(scanText).catch(() => {});
    } catch {}
    return p;
  };

  const XHR = XMLHttpRequest.prototype;
  const origOpen = XHR.open;
  const origSend = XHR.send;
  XHR.open = function (method, url) {
    this.__ttsorterUrl = url;
    return origOpen.apply(this, arguments);
  };
  XHR.send = function () {
    if (watched(String(this.__ttsorterUrl || ''))) {
      this.addEventListener('load', () => {
        try {
          if (this.responseType === '' || this.responseType === 'text') scanText(this.responseText);
          else if (this.responseType === 'json') walk(this.response, 0);
        } catch {}
      });
    }
    return origSend.apply(this, arguments);
  };

  function scanSSR() {
    for (const id of ['__UNIVERSAL_DATA_FOR_REHYDRATION__', 'SIGI_STATE', '__NEXT_DATA__']) {
      const el = document.getElementById(id);
      if (el) scanText(el.textContent);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scanSSR, { once: true });
  else scanSSR();

  // ---------- download ----------
  const safe = (s) => s.replace(/[\\/:*?"<>|\u0000-\u001f#]+/g, ' ').replace(/\s+/g, ' ').trim();
  const fileName = (it, ext) => {
    const desc = safe(it.desc).slice(0, 60);
    return `${safe('@' + (it.author.uniqueId || 'tiktok'))} - ${desc ? desc + ' - ' : ''}${it.id}.${ext}`;
  };

  async function fetchBlob(url, onProgress) {
    const res = await origFetch(url, { credentials: 'include', referrer: 'https://www.tiktok.com/', referrerPolicy: 'unsafe-url' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const total = Number(res.headers.get('content-length')) || 0;
    if (!res.body) return res.blob();
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      onProgress(total ? got / total : 0);
    }
    const blob = new Blob(chunks, { type: res.headers.get('content-type') || 'video/mp4' });
    // Resposta HTML/JSON de bloqueio não é vídeo.
    if (blob.size < 10_000 || /text|json/.test(blob.type)) throw new Error('resposta inválida');
    return blob;
  }

  function save(blob, name) {
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.style.display = 'none';
    document.documentElement.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 60_000);
  }

  async function download(id, reqId) {
    const it = items.get(id);
    const progress = (p) => post('dl', { reqId, state: 'progress', p });
    try {
      if (!it) throw new Error('vídeo não encontrado');
      if (it.isPhoto) {
        // As imagens ficam no tiktokcdn.com, que não libera CORS pra página; o
        // gerenciador de downloads não tem essa restrição.
        const files = it.images.map((url, i) => ({ url, filename: fileName(it, `${i + 1}.jpg`) }));
        post('dl', { reqId, state: 'fallback', files });
        return;
      }
      const urls = it.sources.flatMap((s) => s.urls);
      if (!urls.length) throw new Error('sem link de vídeo');
      let lastErr;
      for (const url of urls) {
        try {
          const blob = await fetchBlob(url, progress);
          save(blob, fileName(it, 'mp4'));
          post('dl', { reqId, state: 'done' });
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      // CORS/expiração no fetch da página: o background tenta via chrome.downloads.
      post('dl', { reqId, state: 'fallback', files: [{ url: urls[0], filename: fileName(it, 'mp4') }], error: String(lastErr?.message || lastErr) });
    } catch (e) {
      post('dl', { reqId, state: 'error', error: String(e?.message || e) });
    }
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window || e.data?.[TAG] !== 'in') return;
    const { type, payload } = e.data;
    if (type === 'hello') post('items', [...items.values()]);
    else if (type === 'download') download(payload.id, payload.reqId);
  });
})();
