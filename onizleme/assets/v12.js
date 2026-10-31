/* v12: Kimin için sekmeleri, bölge haritası animasyonu, iletişim haritası (yaklaşınca yüklenir). */
(function () {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const watch = (el, fn, opts) => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); fn(); }
    }, opts);
    io.observe(el);
  };

  /* Ödül fotoğrafı da diğer .fade öğeleri gibi görünür olunca yerine otursun */
  const award = document.querySelector('.award-hero-img');
  watch(award, () => award.classList.add('in'), {threshold: .2});

  /* ---- Kimin için: erişilebilir sekmeler (ok tuşları dahil) ---- */
  const tabs = [...document.querySelectorAll('.cz-tabs [role="tab"]')];
  const select = tab => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', e => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      const next = tabs[(i + step + tabs.length) % tabs.length];
      select(next); next.focus();
    });
  });

  /* ---- Bölge haritası: görünür olunca rotalar fabrikadan ilçelere çizilir ---- */
  const map = document.getElementById('bolge-map');
  const list = document.getElementById('bolge-list');
  if (map && list) {
    /* Telefonda merkeze 15 km'den yakın ilçelerin adı haritada üst üste biner; listede okunur */
    const items = [...list.children];
    items.forEach(li => {
      const km = parseFloat(li.querySelector('span').textContent);
      if (km < 15) map.querySelector(`.b-ilce[data-i="${li.dataset.i}"]`)?.classList.add('yakin');
    });
    const start = () => { map.classList.add('on'); list.classList.add('on'); };
    if (reduce) start(); else watch(map, start, {threshold: .3});
    /* Listede üstüne gelinen ya da dokunulan ilçe haritada yanar */
    const light = i => {
      items.forEach(li => li.classList.toggle('hl', li.dataset.i === i));
      map.querySelectorAll('.b-ilce').forEach(g => g.classList.toggle('hl', g.dataset.i === i));
    };
    items.forEach(li => {
      li.addEventListener('mouseenter', () => light(li.dataset.i));
      li.addEventListener('click', () => light(li.dataset.i));
    });
    list.addEventListener('mouseleave', () => light(null));
  }

  /* ---- İletişim haritası: sayfa açılışını yavaşlatmasın diye yaklaşınca yüklenir ---- */
  const frame = document.getElementById('ct-map');
  watch(frame, () => {
    const f = document.createElement('iframe');
    f.title = 'Faher Asansör konumu, Google Haritalar';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.src = 'https://www.google.com/maps?q=' +
      encodeURIComponent('Zafer Mah. Turgut Özal Cd. No:125/19, Buca, İzmir') + '&hl=tr&z=15&output=embed';
    frame.prepend(f);
  }, {rootMargin: '600px 0px'});
})();

/* Lacivert imleç: nokta fareyi birebir izler, halka yumuşak gelir. Tıklanabilir yerde büyür,
   fotoğrafta "Büyüt", Sahadan sahnesinde "Sürükle" yazar; koyu zeminde açık bronza döner.
   Dokunmatik cihazda hiç kurulmaz. */
(function () {
  'use strict';
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement, body = document.body;
  const dot = document.createElement('div'); dot.className = 'imlec-nokta';
  const ring = document.createElement('div'); ring.className = 'imlec-halka';
  body.append(dot, ring);
  root.classList.add('imlec');
  let x = -100, y = -100, rx = -100, ry = -100, raf = 0;
  const KOYU = '.lift,.saha,.bolge-map,.btn-k,.fab,.vt-tab[aria-selected="true"] .vt-tab-cap';
  const LINK = 'a,button,[role="tab"],summary,label,.bolge-list li';
  const loop = () => {
    rx += (x - rx) * (reduce ? 1 : .2); ry += (y - ry) * (reduce ? 1 : .2);
    ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    raf = Math.abs(x - rx) + Math.abs(y - ry) > .1 ? requestAnimationFrame(loop) : 0;
  };
  document.addEventListener('mousemove', e => {
    x = e.clientX; y = e.clientY;
    dot.style.transform = `translate3d(${x}px,${y}px,0)`;
    body.classList.add('imlec-on');
    const t = e.target instanceof Element ? e.target : null;
    if (t) {
      body.classList.toggle('imlec-koyu', !!t.closest(KOYU));
      let etiket = '';
      if (t.closest('.vt-item.on,.saha-card.on')) etiket = 'Büyüt';
      else if (t.closest('.saha-stage')) etiket = 'Sürükle';
      body.classList.toggle('imlec-etiket', !!etiket);
      body.classList.toggle('imlec-link', !etiket && !!t.closest(LINK));
      if (ring.textContent !== etiket) ring.textContent = etiket;
    }
    if (!raf) raf = requestAnimationFrame(loop);
  }, {passive: true});
  document.addEventListener('mousedown', () => body.classList.add('imlec-bas'));
  document.addEventListener('mouseup', () => body.classList.remove('imlec-bas'));
  /* pencereden ya da Google harita çerçevesine çıkınca gizlen (çerçevenin kendi imleci var) */
  document.addEventListener('mouseout', e => { if (!e.relatedTarget || e.relatedTarget.tagName === 'IFRAME') body.classList.remove('imlec-on'); });
})();

/* Süreç çizelgesi: bölüm görününce çizgi dolar, adımlar sırayla gelir */
(function () {
  const s = document.getElementById('steps');
  if (!s) return;
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { s.classList.add('on'); return; }
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { s.classList.add('on'); io.disconnect(); } }, {threshold: .3});
  io.observe(s);
})();
