/* v12 vitrin: kategori sekmeleri + büyük fotoğraf şeridi. Fotoğraf kırpılmaz, kutu boşluğu olmaz:
   her karenin genişliği kendi oranından gelir. Ortadaki öne çıkar, kenardakiler sönük durur.
   Kaydırma tarayıcının kendi yatay kaydırması (telefonda en akıcısı); oklar ve otomatik geçiş onu sürer.
   Dokununca tam ekran açılır. */
(function () {
  'use strict';
  const host = document.getElementById('vitrin');
  const cats = (window.FAHER_VITRIN?.categories || []).filter(c => c.photos.length);
  if (!host || !cats.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = () => window.matchMedia('(max-width: 820px)').matches;
  const pad = n => String(n).padStart(2, '0');
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  /* ---- iskelet ---- */
  const tabs = el('div', 'vt-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Galeri bölümleri');
  const tabsWrap = el('div', 'vt-tabs-wrap');
  const tabsLbl = el('p', 'vt-tabs-lbl tag', `Bölüm seçin · ${cats.length} bölüm`);
  tabsWrap.append(tabsLbl, tabs);
  const head = el('div', 'vt-head');
  const hNum = el('span', 'vt-num tag');
  const hTitle = el('h3', 'vt-title');
  const hSum = el('p', 'vt-sum');
  const hText = el('div', 'vt-htext'); hText.append(hNum, hTitle, hSum);
  const nav = el('div', 'vt-nav');
  const prev = el('button', 'vt-arrow', '←'); prev.type = 'button'; prev.setAttribute('aria-label', 'Önceki fotoğraf');
  const next = el('button', 'vt-arrow', '→'); next.type = 'button'; next.setAttribute('aria-label', 'Sonraki fotoğraf');
  const count = el('span', 'vt-count'); count.setAttribute('aria-live', 'polite');
  nav.append(count, prev, next);
  head.append(hText, nav);
  const strip = el('div', 'vt-strip'); strip.tabIndex = 0;
  const track = el('div', 'vt-track'); strip.append(track);
  const bar = el('div', 'vt-bar'); const barFill = el('i'); bar.append(barFill);
  host.append(tabsWrap, head, strip, bar);

  let cat = 0, cur = 0, items = [], timer = null, lastTouch = 0, inView = false, padL = 0;

  const tabBtns = cats.map((c, i) => {
    /* Bölüm kartı: kapak fotoğrafı + ad + fotoğraf sayısı. Düz yazı sekme tıklanabilir görünmüyordu. */
    const b = el('button', 'vt-tab'); b.type = 'button'; b.setAttribute('role', 'tab');
    const cover = el('img'); cover.alt = ''; cover.loading = 'lazy'; cover.decoding = 'async';
    cover.src = c.photos[0].thumb; cover.width = c.photos[0].width; cover.height = c.photos[0].height;
    const cap = el('span', 'vt-tab-cap');
    cap.append(el('span', 'vt-tab-n', pad(i + 1)), el('b', null, c.title), el('span', 'vt-tab-c', `${c.photos.length} fotoğraf`));
    b.append(cover, cap);
    b.addEventListener('click', () => {
      touch(); setCat(i);
      /* şerit ekranın altında kaldıysa sayfayı başlığa getir */
      if (strip.getBoundingClientRect().top > window.innerHeight * .55) {
        const y = head.getBoundingClientRect().top + window.scrollY - 90;
        if (window.faherScroll?.scrollTo) window.faherScroll.scrollTo(y); else window.scrollTo({top: y, behavior: reduce ? 'auto' : 'smooth'});
      }
    });
    tabs.append(b); return b;
  });

  /* ---- ölçü: telefonda ekranın ~%60'ı, masaüstünde ~%70'i yükseklik; geniş kare ekrana sığdırılır ---- */
  function size() {
    const vh = window.innerHeight, vw = strip.clientWidth || window.innerWidth;
    const H = narrow() ? Math.min(vh * .6, 540) : Math.min(vh * .72, 760);
    const maxW = narrow() ? vw * .84 : vw * .72;
    items.forEach(({node, img, p}) => {
      const a = p.largeWidth / p.largeHeight;
      let w = a * H, h = H;
      if (w > maxW) { w = maxW; h = w / a; }
      node.style.width = Math.round(w) + 'px'; node.style.height = Math.round(h) + 'px';
      img.sizes = Math.round(w) + 'px';
    });
    strip.style.height = Math.round(H) + 'px';
    /* ilk ve son kare de ortaya gelebilsin */
    /* telefonda etkin kare ortada; masaüstünde sayfa hizasında solda */
    if (items.length) {
      const gut = parseFloat(getComputedStyle(host).getPropertyValue('--gut')) || 16;
      padL = narrow() ? Math.max(0, (vw - items[0].node.offsetWidth) / 2) : gut;
      track.style.paddingLeft = padL + 'px';
      track.style.paddingRight = (narrow() ? Math.max(0, (vw - items[items.length - 1].node.offsetWidth) / 2) : vw - items[items.length - 1].node.offsetWidth - gut) + 'px';
    }
  }

  function build() {
    const c = cats[cat];
    track.textContent = '';
    items = c.photos.map((p, i) => {
      const node = el('button', 'vt-item'); node.type = 'button';
      node.setAttribute('aria-label', `${p.caption}, tam ekran aç`);
      node.style.setProperty('--d', `${Math.min(i, 4) * .09}s`);
      const img = el('img'); img.alt = p.caption; img.decoding = 'async';
      img.loading = i < 3 ? 'eager' : 'lazy';
      img.width = p.largeWidth; img.height = p.largeHeight;
      img.srcset = `${p.thumb} ${p.width}w, ${p.mid} ${p.midWidth}w, ${p.large} ${p.largeWidth}w`;
      img.src = p.mid;
      img.addEventListener('load', () => node.classList.add('ok'), {once: true});
      if (img.complete) node.classList.add('ok');
      node.append(img);
      node.addEventListener('click', () => {
        touch();
        if (i === cur) openBox(i, node); else go(i);
      });
      track.append(node);
      return {node, img, p};
    });
    size();
    strip.scrollLeft = 0; cur = 0;
    mark();
    requestAnimationFrame(() => track.classList.add('in'));
  }

  function setCat(i, first) {
    cat = i;
    tabBtns.forEach((b, k) => { b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; });
    const c = cats[i];
    hNum.textContent = `${pad(i + 1)} / ${pad(cats.length)}`;
    hTitle.textContent = c.title; hSum.textContent = c.summary;
    /* scrollIntoView sayfayı dikeyde de kaydırabiliyor; sadece sekme şeridi yana kaydırılır */
    const tb = tabBtns[i];
    tabs.scrollTo({left: tb.offsetLeft - (tabs.clientWidth - tb.offsetWidth) / 2, behavior: first || reduce ? 'auto' : 'smooth'});
    if (first || reduce) { build(); return; }
    head.classList.add('swap'); track.classList.remove('in'); track.classList.add('out');
    setTimeout(() => { track.classList.remove('out'); build(); head.classList.remove('swap'); }, 380);
  }

  /* ortadaki kare = etkin kare */
  function mark() {
    const n = narrow(), mid = n ? strip.scrollLeft + strip.clientWidth / 2 : strip.scrollLeft + padL;
    let best = 0, dist = Infinity;
    items.forEach(({node}, i) => {
      const c = n ? node.offsetLeft + node.offsetWidth / 2 : node.offsetLeft, d = Math.abs(c - mid);
      if (d < dist) { dist = d; best = i; }
    });
    cur = best;
    items.forEach(({node}, i) => node.classList.toggle('on', i === cur));
    count.textContent = `${pad(cur + 1)} / ${pad(items.length)}`;
    prev.disabled = cur === 0; next.disabled = cur === items.length - 1;
  }
  function go(i) {
    i = Math.max(0, Math.min(items.length - 1, i));
    const n = items[i].node;
    const left = narrow() ? n.offsetLeft - (strip.clientWidth - n.offsetWidth) / 2 : n.offsetLeft - padL;
    strip.scrollTo({left, behavior: reduce ? 'auto' : 'smooth'});
  }
  let raf;
  strip.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(mark); }, {passive: true});
  prev.addEventListener('click', () => { touch(); go(cur - 1); });
  next.addEventListener('click', () => { touch(); go(cur + 1); });
  strip.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); touch(); go(cur + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); touch(); go(cur - 1); }
  });
  ['pointerdown', 'wheel', 'touchstart'].forEach(t => strip.addEventListener(t, touch, {passive: true}));
  tabs.addEventListener('keydown', e => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault(); touch();
    const n = (cat + step + cats.length) % cats.length; setCat(n); tabBtns[n].focus();
  });

  /* ---- otomatik geçiş: görünürken 5 sn'de bir ilerler; dokunulunca 10 sn bekler; sonda sonraki bölüme geçer ---- */
  const STEP = 5000;
  function touch() { lastTouch = Date.now(); restartBar(); }
  function restartBar() {
    barFill.style.transition = 'none'; barFill.style.transform = 'scaleX(0)';
    if (reduce || !inView) return;
    void barFill.offsetWidth;
    const wait = Math.max(STEP, lastTouch + 10000 - Date.now());
    barFill.style.transition = `transform ${wait}ms linear`; barFill.style.transform = 'scaleX(1)';
    clearTimeout(timer);
    timer = setTimeout(tick, wait);
  }
  function tick() {
    if (!inView || document.hidden || box.open) { restartBar(); return; }
    if (cur < items.length - 1) go(cur + 1); else setCat((cat + 1) % cats.length);
    restartBar();
  }
  if (!reduce && 'IntersectionObserver' in window) {
    new IntersectionObserver(es => {
      inView = es[0].isIntersecting;
      if (inView) restartBar(); else { clearTimeout(timer); barFill.style.transition = 'none'; barFill.style.transform = 'scaleX(0)'; }
    }, {threshold: .45}).observe(strip);
  }
  host.addEventListener('mouseenter', () => { if (!narrow()) { lastTouch = Date.now() + 600000; restartBar(); } });
  host.addEventListener('mouseleave', () => { if (!narrow()) { lastTouch = Date.now(); restartBar(); } });

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); go(cur); }, 140); }, {passive: true});

  /* ---- tam ekran (mevcut pop-up iskeleti) ---- */
  const box = document.getElementById('lightbox');
  const bImg = box.querySelector('img');
  const bCap = document.getElementById('lightbox-caption');
  const bCnt = document.getElementById('lightbox-counter');
  const bSt = document.getElementById('lightbox-status');
  const bClose = box.querySelector('[data-close]');
  let bi = 0, token = 0, opener, liste = null, disari = null;   // liste: açık fotoğraflar; disari: Sahadan gibi başka bölümden açıldıysa
  async function show(i) {
    const ps = liste; bi = (i + ps.length) % ps.length;
    const p = ps[bi], req = ++token;
    bImg.style.opacity = '0'; bSt.textContent = 'Fotoğraf yükleniyor…';
    bCap.textContent = p.caption; bCnt.textContent = `${bi + 1} / ${ps.length}`;
    const pre = new Image(); pre.src = p.large;
    try {
      await pre.decode();
      if (req !== token || !box.open) return;
      bImg.src = p.large; bImg.alt = p.caption; bImg.width = p.largeWidth; bImg.height = p.largeHeight;
      bImg.style.opacity = '1'; bSt.textContent = '';
      new Image().src = ps[(bi + 1) % ps.length].large;
    } catch (_) { if (req === token) bSt.textContent = 'Fotoğraf yüklenemedi. Diğer fotoğraflara geçebilirsiniz.'; }
  }
  function openBox(i, trigger, list, title, onClose) {
    opener = trigger; liste = list || cats[cat].photos; disari = onClose || null;
    document.getElementById('lightbox-title').textContent = title || cats[cat].title;
    window.faherScroll?.stop();
    document.body.classList.add('lightbox-open');
    box.showModal(); bClose.focus(); show(i);
  }
  bClose.addEventListener('click', () => box.close());
  box.addEventListener('close', () => {
    token++; bImg.removeAttribute('src');
    document.body.classList.remove('lightbox-open');
    window.faherScroll?.start();
    if (disari) disari(bi); else { go(bi); opener = items[bi]?.node || opener; }
    opener?.focus({preventScroll: true});
    touch();
  });
  box.querySelector('[data-prev]').addEventListener('click', () => show(bi - 1));
  box.querySelector('[data-next]').addEventListener('click', () => show(bi + 1));
  box.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); box.close(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(bi - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(bi + 1); }
    if (e.key === 'Tab') {
      const bs = [...box.querySelectorAll('button')], f = bs[0], l = bs[bs.length - 1];
      if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
      else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
    }
  });
  let sx = 0, sy = 0;
  const vp = box.querySelector('.lightbox-photo');
  vp.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, {passive: true});
  vp.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(bi + (dx < 0 ? 1 : -1));
  }, {passive: true});

  /* Sahadan halkası aynı tam ekranı kullanır */
  window.faherKutu = (list, title, i, trigger, onClose) => openBox(i, trigger, list, title, onClose);
  setCat(0, true);
})();
