(() => {
  const TAG = '__ttsorte';
  const items = new Map();
  const cards = new Map();
  const downloads = new Map();
  // Perfil carrega recomendados de outros autores junto; em página de perfil o padrão é filtrar.
  const state = { sort: 'views', dir: 'desc', open: true, query: '', onlyProfile: true };

  const SORTS = [
    { key: 'views', label: 'Views', icon: 'eye' },
    { key: 'likes', label: 'Curtidas', icon: 'heart' },
    { key: 'comments', label: 'Coment.', icon: 'comment' },
    { key: 'shares', label: 'Compart.', icon: 'share' },
    { key: 'date', label: 'Data', icon: 'calendar' },
  ];

  const ICONS = {
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    comment: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    share: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5 5.5 5.5 0 0 0 9.5 20H13"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    open: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    minus: '<path d="M5 12h14"/>',
    arrow: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    photo: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  };
  const icon = (name, cls = '') =>
    `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  const LOGO = chrome.runtime.getURL('icons/128.png');

  const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat('pt-BR');
  const fmtDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
  const rel = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  const relTime = (sec) => {
    const diff = sec - Date.now() / 1000;
    const abs = Math.abs(diff);
    if (abs < 3600) return rel.format(Math.round(diff / 60), 'minute');
    if (abs < 86400) return rel.format(Math.round(diff / 3600), 'hour');
    if (abs < 86400 * 30) return rel.format(Math.round(diff / 86400), 'day');
    return fmtDate.format(sec * 1000);
  };
  const fmtDur = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '');
  const videoUrl = (it) => `https://www.tiktok.com/@${it.author.uniqueId}/${it.isPhoto ? 'photo' : 'video'}/${it.id}`;
  const metric = (it, key) => (key === 'date' ? it.createTime : it.stats[key]);
  const profileFromPath = () => location.pathname.match(/^\/@([^/?#]+)/)?.[1] || '';

  // ---------- montagem ----------
  const host = document.createElement('ttsorte-root');
  host.style.cssText = 'all: initial; position: fixed; z-index: 2147483646; inset: auto 0 0 auto;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <link rel="stylesheet" href="${chrome.runtime.getURL('src/panel.css')}">
    <button class="fab" part="fab" title="Abrir ttsorte">
      <img src="${LOGO}" alt=""><span class="fab-count">0</span>
    </button>
    <section class="panel" role="dialog" aria-label="ttsorte">
      <header class="head">
        <div class="brand">
          <span class="mark"><img src="${LOGO}" alt=""></span>
          <div class="brand-txt"><strong>ttsorte</strong><span class="sub"><b class="count">0</b> vídeos capturados</span></div>
        </div>
        <div class="head-actions">
          <button class="ghost clear" title="Limpar lista">${icon('trash')}</button>
          <button class="ghost min" title="Minimizar">${icon('minus')}</button>
        </div>
      </header>
      <div class="sorts" role="tablist">
        ${SORTS.map((s) => `<button class="sort" role="tab" data-key="${s.key}">${icon(s.icon)}<span>${s.label}</span></button>`).join('')}
        <span class="sort-pill"></span>
      </div>
      <div class="tools">
        <label class="search">${icon('search')}<input type="search" placeholder="Legenda ou @perfil" aria-label="Buscar por legenda ou @perfil" spellcheck="false"></label>
        <button class="chip dir" title="Inverter ordem">${icon('arrow')}<span>Maior</span></button>
        <button class="chip scope" title="Mostrar só vídeos do perfil aberto">${icon('user')}<span>Perfil</span></button>
      </div>
      <div class="list" role="list"></div>
      <div class="empty">
        <div class="empty-art"><span></span><span></span><span></span></div>
        <strong>Role o feed pra capturar vídeos</strong>
        <p>Abra um perfil, a busca ou o Para Você. Cada vídeo carregado entra aqui com as métricas.</p>
      </div>
    </section>
    <div class="toast" role="status"></div>
  `;
  const $ = (sel) => root.querySelector(sel);
  const panel = $('.panel');
  const list = $('.list');
  const fab = $('.fab');
  const searchInput = $('.search input');
  const scopeBtn = $('.scope');

  function mount() {
    (document.body || document.documentElement).appendChild(host);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });

  // ---------- estado persistido ----------
  chrome.storage.local.get(['sort', 'dir', 'open']).then((s) => {
    if (SORTS.some((x) => x.key === s.sort)) state.sort = s.sort;
    if (s.dir === 'asc' || s.dir === 'desc') state.dir = s.dir;
    if (typeof s.open === 'boolean') state.open = s.open;
    syncChrome();
    render(false);
  });
  const persist = () => chrome.storage.local.set({ sort: state.sort, dir: state.dir, open: state.open });

  function setOpen(open) {
    state.open = open;
    persist();
    syncChrome();
  }

  function syncChrome() {
    panel.classList.toggle('is-open', state.open);
    fab.classList.toggle('is-hidden', state.open);
    root.querySelectorAll('.sort').forEach((b) => {
      const on = b.dataset.key === state.sort;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on);
    });
    movePill();
    const dirBtn = $('.dir');
    dirBtn.classList.toggle('asc', state.dir === 'asc');
    dirBtn.querySelector('span').textContent = state.sort === 'date' ? (state.dir === 'desc' ? 'Recentes' : 'Antigos') : state.dir === 'desc' ? 'Maior' : 'Menor';
    const prof = profileFromPath();
    scopeBtn.hidden = !prof;
    scopeBtn.classList.toggle('on', state.onlyProfile && !!prof);
    scopeBtn.querySelector('span').textContent = prof ? `@${prof}` : 'Perfil';
  }

  function movePill() {
    const on = root.querySelector('.sort.on');
    const pill = $('.sort-pill');
    if (!on || !on.offsetWidth) return;
    pill.style.width = `${on.offsetWidth}px`;
    pill.style.transform = `translateX(${on.offsetLeft}px)`;
  }

  // ---------- cards ----------
  function buildCard(it) {
    const el = document.createElement('article');
    el.className = 'card';
    el.setAttribute('role', 'listitem');
    el.innerHTML = `
      <a class="thumb" target="_blank" rel="noopener">
        <img alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">
        <span class="rank"></span>
        <span class="dur"></span>
      </a>
      <div class="body">
        <div class="meta"><span class="who"></span><span class="when"></span></div>
        <p class="desc"></p>
        <div class="stats">
          <span data-k="views">${icon('eye')}<b></b></span>
          <span data-k="likes">${icon('heart')}<b></b></span>
          <span data-k="comments">${icon('comment')}<b></b></span>
          <span data-k="shares">${icon('share')}<b></b></span>
        </div>
      </div>
      <div class="actions">
        <button class="act dl" title="Baixar em alta qualidade, sem marca d'água">
          <svg class="ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16"/></svg>
          <span class="dl-ico">${icon('download')}</span>
        </button>
        <button class="act copy" title="Copiar link">${icon('link')}</button>
        <a class="act open" target="_blank" rel="noopener" title="Abrir no TikTok">${icon('open')}</a>
      </div>`;
    el.querySelector('.dl').addEventListener('click', () => startDownload(it.id));
    for (const a of el.querySelectorAll('a.thumb, a.open')) {
      a.addEventListener('click', (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        chrome.runtime.sendMessage({ type: 'open', url: a.href }).catch(() => window.open(a.href, '_blank', 'noopener'));
      });
    }
    el.querySelector('.copy').addEventListener('click', async () => {
      const cur = items.get(it.id);
      try {
        await navigator.clipboard.writeText(videoUrl(cur));
        toast('Link copiado');
      } catch {
        toast('Não deu pra copiar o link');
      }
    });
    const img = el.querySelector('img');
    img.addEventListener('error', () => img.classList.add('broken'), { once: true });
    return el;
  }

  function fillCard(el, it, rank) {
    const url = videoUrl(it);
    el.querySelector('.thumb').href = url;
    el.querySelector('.open').href = url;
    const img = el.querySelector('img');
    if (it.cover && img.getAttribute('src') !== it.cover) img.src = it.cover;
    el.querySelector('.rank').textContent = rank;
    el.querySelector('.dur').innerHTML = it.isPhoto ? `${icon('photo')}${it.images.length}` : fmtDur(it.duration);
    el.querySelector('.who').textContent = `@${it.author.uniqueId}`;
    const when = el.querySelector('.when');
    when.textContent = it.createTime ? relTime(it.createTime) : '';
    when.title = it.createTime ? new Date(it.createTime * 1000).toLocaleString('pt-BR') : '';
    el.querySelector('.desc').textContent = it.desc || 'Sem legenda';
    el.querySelector('.desc').classList.toggle('muted', !it.desc);
    for (const span of el.querySelectorAll('.stats span')) {
      const k = span.dataset.k;
      span.querySelector('b').textContent = compact.format(it.stats[k]);
      span.title = `${full.format(it.stats[k])} ${SORTS.find((s) => s.key === k).label.toLowerCase()}`;
      span.classList.toggle('hot', state.sort === k);
    }
    when.classList.toggle('hot', state.sort === 'date');
    el.querySelector('.dl').title = it.isPhoto ? 'Baixar fotos do carrossel' : "Baixar em alta qualidade, sem marca d'água";
  }

  function visibleItems() {
    const q = state.query.trim().toLowerCase().replace(/^@/, '');
    const prof = state.onlyProfile ? profileFromPath().toLowerCase() : '';
    const out = [];
    for (const it of items.values()) {
      if (prof && it.author.uniqueId.toLowerCase() !== prof) continue;
      if (q && !it.desc.toLowerCase().includes(q) && !it.author.uniqueId.toLowerCase().includes(q) && !it.author.nickname.toLowerCase().includes(q)) continue;
      out.push(it);
    }
    const sign = state.dir === 'desc' ? -1 : 1;
    return out.sort((a, b) => sign * (metric(a, state.sort) - metric(b, state.sort)) || (b.stats.views - a.stats.views));
  }

  let raf = 0;
  let animateNext = false;
  function render(animate = false) {
    animateNext = animateNext || animate;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const doAnim = animateNext && state.open && !matchMedia('(prefers-reduced-motion: reduce)').matches;
      animateNext = false;
      draw(doAnim);
    });
  }

  function draw(animate) {
    const sorted = visibleItems();
    const listTop = list.getBoundingClientRect().top;
    const first = new Map();
    if (animate) {
      for (const [id, el] of cards) {
        if (!el.isConnected) continue;
        const top = el.getBoundingClientRect().top - listTop;
        if (top > -200 && top < list.clientHeight + 200) first.set(id, top);
      }
    }

    const keep = new Set(sorted.map((it) => it.id));
    for (const [id, el] of cards) if (!keep.has(id)) el.remove();

    let prev = null;
    sorted.forEach((it, i) => {
      let el = cards.get(it.id);
      const isNew = !el;
      if (isNew) {
        el = buildCard(it);
        cards.set(it.id, el);
        el.classList.add('enter');
        el.addEventListener('animationend', () => el.classList.remove('enter'), { once: true });
      }
      fillCard(el, it, i + 1);
      const want = prev ? prev.nextSibling : list.firstChild;
      if (el !== want) list.insertBefore(el, want);
      prev = el;
    });

    if (animate) {
      for (const [id, top] of first) {
        const el = cards.get(id);
        if (!el?.isConnected) continue;
        const dy = top - (el.getBoundingClientRect().top - listTop);
        if (Math.abs(dy) > 1) {
          el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], {
            duration: 420,
            easing: 'cubic-bezier(.2,.8,.2,1)',
          });
        }
      }
    }

    const n = items.size;
    $('.count').textContent = full.format(n);
    $('.fab-count').textContent = n > 999 ? '999+' : String(n);
    fab.classList.toggle('has', n > 0);
    panel.classList.toggle('is-empty', sorted.length === 0);
    $('.empty strong').textContent = n === 0 ? 'Role o feed pra capturar vídeos' : 'Nada bate com o filtro';
    $('.empty p').hidden = n !== 0;
    for (const [id, d] of downloads) paintDownload(id, d);
  }

  // ---------- download ----------
  let reqSeq = 0;
  const reqToId = new Map();

  function startDownload(id) {
    const d = downloads.get(id);
    if (d?.state === 'progress') return;
    const reqId = `${Date.now()}-${++reqSeq}`;
    reqToId.set(reqId, id);
    downloads.set(id, { state: 'progress', p: 0 });
    paintDownload(id, downloads.get(id));
    window.postMessage({ [TAG]: 'in', type: 'download', payload: { id, reqId } }, location.origin);
  }

  function paintDownload(id, d) {
    const btn = cards.get(id)?.querySelector('.dl');
    if (!btn) return;
    btn.dataset.state = d.state;
    btn.style.setProperty('--p', d.state === 'progress' ? Math.max(0.04, d.p || 0) : d.state === 'done' ? 1 : 0);
    btn.classList.toggle('indeterminate', d.state === 'progress' && !d.p);
    btn.querySelector('.dl-ico').innerHTML = icon(d.state === 'done' ? 'check' : d.state === 'error' ? 'alert' : 'download');
    if (d.state === 'error') btn.title = `Falhou: ${d.error}. Clique pra tentar de novo.`;
  }

  function finish(id, d) {
    downloads.set(id, d);
    paintDownload(id, d);
    if (d.state === 'done' || d.state === 'error') {
      setTimeout(() => {
        if (downloads.get(id) === d) {
          downloads.delete(id);
          paintDownload(id, { state: 'idle' });
          const it = items.get(id);
          if (it) fillCard(cards.get(id), it, cards.get(id).querySelector('.rank').textContent);
        }
      }, d.state === 'done' ? 2500 : 6000);
    }
  }

  async function onDownloadMsg({ reqId, state: st, p, files, error }) {
    const id = reqToId.get(reqId);
    if (!id) return;
    if (st === 'progress') return finish(id, { state: 'progress', p });
    if (st === 'done') {
      reqToId.delete(reqId);
      toast('Download concluído');
      return finish(id, { state: 'done' });
    }
    if (st === 'fallback') {
      finish(id, { state: 'progress', p: 0 });
      const r = await chrome.runtime.sendMessage({ type: 'download', files }).catch((e) => ({ ok: false, error: String(e) }));
      reqToId.delete(reqId);
      if (r?.ok) {
        toast('Download enviado pro navegador');
        return finish(id, { state: 'done' });
      }
      toast('Não consegui baixar esse vídeo');
      return finish(id, { state: 'error', error: r?.error || error });
    }
    reqToId.delete(reqId);
    toast(`Erro: ${error}`);
    finish(id, { state: 'error', error });
  }

  // ---------- toast ----------
  let toastTimer = 0;
  function toast(msg) {
    const t = $('.toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- eventos ----------
  window.addEventListener('message', (e) => {
    if (e.source !== window || e.data?.[TAG] !== 'out') return;
    const { type, payload } = e.data;
    if (type === 'items') {
      for (const it of payload) items.set(it.id, it);
      render(false);
    } else if (type === 'dl') onDownloadMsg(payload);
  });
  // O hook pode ter capturado antes desta UI escutar.
  window.postMessage({ [TAG]: 'in', type: 'hello' }, location.origin);

  root.querySelectorAll('.sort').forEach((b) =>
    b.addEventListener('click', () => {
      if (state.sort === b.dataset.key) state.dir = state.dir === 'desc' ? 'asc' : 'desc';
      else {
        state.sort = b.dataset.key;
        state.dir = 'desc';
      }
      persist();
      syncChrome();
      list.scrollTo({ top: 0 });
      render(true);
    }),
  );
  $('.dir').addEventListener('click', () => {
    state.dir = state.dir === 'desc' ? 'asc' : 'desc';
    persist();
    syncChrome();
    render(true);
  });
  scopeBtn.addEventListener('click', () => {
    state.onlyProfile = !state.onlyProfile;
    syncChrome();
    render(true);
  });
  searchInput.addEventListener('input', () => {
    state.query = searchInput.value;
    render(false);
  });
  // Teclas digitadas no filtro não podem virar atalho do player do TikTok.
  for (const ev of ['keydown', 'keyup', 'keypress']) searchInput.addEventListener(ev, (e) => e.stopPropagation());
  $('.clear').addEventListener('click', () => {
    items.clear();
    for (const el of cards.values()) el.remove();
    cards.clear();
    render(false);
    toast('Lista limpa');
  });
  $('.min').addEventListener('click', () => setOpen(false));
  fab.addEventListener('click', () => {
    setOpen(true);
    requestAnimationFrame(movePill);
  });
  panel.addEventListener('transitionend', movePill);

  // SPA: o TikTok troca de rota sem recarregar.
  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    syncChrome();
    if (state.onlyProfile) render(true);
  }, 500);

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'toggle') setOpen(!state.open);
  });

  // Fonte carregada muda a largura das abas.
  root.querySelector('link').addEventListener('load', () => requestAnimationFrame(movePill));
})();
