/* Sahadan: bina fotoğrafları dönen bir platformun çevresinde. Halka yavaşça döner; sürüklenir,
   oklarla çevrilir; öndeki fotoğrafa dokununca tam ekran açılır. Sadece ekrandayken çalışır.
   Kare başına tek dönüşüm (halka) + kart başına tek opaklık yazılır; ucuz telefonda da hafif kalsın diye. */
(function () {
  'use strict';
  const photos = window.FAHER_SAHA || [];
  const stage = document.getElementById('saha-stage');
  const ring = document.getElementById('saha-ring');
  if (!stage || !ring || !photos.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches && !/[?&]hareket/.test(location.search);   // ?hareket: önizlemede tam hareket
  const narrow = () => window.matchMedia('(max-width: 820px)').matches;
  const count = document.getElementById('saha-count');
  const pad = n => String(n).padStart(2, '0');
  const N = photos.length, STEP = 360 / N;

  /* Platform: halkayla birlikte dönen disk; kenarında FAHER yazısı */
  const disk = document.createElement('div');
  disk.className = 'saha-disk';
  const yazi = 'FAHER ASANSÖR · SAHADAN · İZMİR · ';
  disk.innerHTML = `<svg viewBox="0 0 1000 1000" aria-hidden="true"><defs>
    <radialGradient id="sdG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#2c4178" stop-opacity=".9"/><stop offset=".62" stop-color="#16244a" stop-opacity=".85"/><stop offset="1" stop-color="#0b1530" stop-opacity="0"/></radialGradient>
    <path id="sdP" d="M500,500 m-410,0 a410,410 0 1,1 820,0 a410,410 0 1,1 -820,0"/></defs>
    <circle cx="500" cy="500" r="498" fill="url(#sdG)"/>
    <circle cx="500" cy="500" r="440" fill="none" stroke="#c9ab74" stroke-opacity=".55" stroke-width="2"/>
    <circle cx="500" cy="500" r="380" fill="none" stroke="#c9ab74" stroke-opacity=".25" stroke-width="1.5" stroke-dasharray="4 10"/>
    <circle cx="500" cy="500" r="250" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1.5"/>
    <text font-size="34" letter-spacing="9" fill="#e6cf9f" fill-opacity=".7" font-family="Montserrat,Arial,sans-serif" font-weight="600"><textPath href="#sdP">${yazi.repeat(3)}</textPath></text>
    <g transform="translate(500 500)" fill="none" stroke="#c9ab74" stroke-opacity=".6" stroke-width="3"><path d="M0-70V70M-38-32L0-70L38-32"/></g></svg>`;
  ring.append(disk);

  const cards = photos.map((p, i) => {
    const c = document.createElement('button');
    c.type = 'button'; c.className = 'saha-card';
    c.setAttribute('aria-label', `${p.caption}, tam ekran aç`);
    const img = document.createElement('img');
    img.alt = p.caption; img.decoding = 'async'; img.loading = 'lazy';
    img.srcset = `${p.thumb} ${p.width}w, ${p.mid} ${p.midWidth}w`;
    img.src = p.thumb;
    const shade = document.createElement('span'); shade.className = 'saha-shade';
    c.append(img, shade);
    c.addEventListener('click', e => {
      if (moved > 6) { e.preventDefault(); return; }   // sürükleme sonu tıklama sayılmasın
      if (i === front) window.faherKutu?.(photos, 'Sahadan · tamamlanan projeler', i, c, j => turnTo(j));
      else turnTo(i);
      idle();
    });
    ring.append(c);
    return {c, shade, img};
  });

  let W, H, R;
  function size() {
    const n = narrow();
    W = n ? Math.min(window.innerWidth * .42, 170) : Math.min(window.innerWidth * .2, 270);
    H = W * 4 / 3;
    R = (W + (n ? 18 : 38)) / (2 * Math.tan(Math.PI / N));
    stage.style.setProperty('--w', W + 'px');
    stage.style.setProperty('--h', H + 'px');
    stage.style.setProperty('--r', R + 'px');
    cards.forEach(({c, img}, i) => {
      c.style.transform = `rotateY(${i * STEP}deg) translateZ(${R}px)`;
      img.sizes = Math.round(W) + 'px';
    });
    disk.style.width = disk.style.height = (R * 2 + W * 1.1) + 'px';
  }

  /* açı: derece; halka -angle döner ki i. kart öne gelsin */
  let angle = 0, vel = 0, target = null, front = 0, last = 0, running = false, hold = 0;
  const SPEED = reduce ? 0 : 7;   // derece/sn
  function frame(t) {
    if (!running) return;
    const dt = Math.min(.05, (t - last) / 1000 || 0); last = t;
    if (dragging) { /* açı işaretçiden geliyor */ }
    else if (target !== null) {
      const d = target - angle; angle += d * Math.min(1, dt * 6);
      if (Math.abs(d) < .05) { angle = target; target = null; }
    } else if (Math.abs(vel) > .5) { angle += vel * dt; vel *= Math.pow(.04, dt); }
    else if (performance.now() > hold) angle += SPEED * dt;
    ring.style.transform = `translateZ(${-R}px) rotateY(${-angle}deg)`;
    let best = -2;
    cards.forEach(({shade}, i) => {
      const rel = (i * STEP - angle) * Math.PI / 180, f = Math.cos(rel);
      shade.style.opacity = (1 - Math.max(0, f)) * .78;
      if (f > best) { best = f; front = i; }
    });
    cards.forEach(({c}, i) => c.classList.toggle('on', i === front));
    count.textContent = `${pad(front + 1)} / ${pad(N)}`;
    requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  function stop() { running = false; }
  function idle(ms = 4000) { hold = performance.now() + ms; }
  function turnTo(i) {
    let a = i * STEP;
    a += Math.round((angle - a) / 360) * 360;   // en kısa yoldan
    target = a; vel = 0; idle(5000);
  }
  document.getElementById('saha-prev').addEventListener('click', () => turnTo((front - 1 + N) % N));
  document.getElementById('saha-next').addEventListener('click', () => turnTo((front + 1) % N));

  /* sürükleme: yatay hareket halkayı çevirir, dikey kaydırma sayfaya kalır (touch-action: pan-y) */
  let dragging = false, sx = 0, sa = 0, moved = 0, lx = 0, lt = 0;
  stage.addEventListener('pointerdown', e => {
    dragging = true; moved = 0; sx = lx = e.clientX; sa = angle; lt = performance.now(); target = null; vel = 0;
  });
  window.addEventListener('pointermove', e => {
    if (!dragging) return;
    const k = narrow() ? .45 : .22;
    moved = Math.max(moved, Math.abs(e.clientX - sx));
    angle = sa - (e.clientX - sx) * k;
    const now = performance.now();
    if (now > lt) vel = -(e.clientX - lx) * k / ((now - lt) / 1000);
    lx = e.clientX; lt = now;
  }, {passive: true});
  const end = () => { if (!dragging) return; dragging = false; vel = Math.max(-240, Math.min(240, vel)); idle(); };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  stage.addEventListener('mouseenter', () => idle(600000));
  stage.addEventListener('mouseleave', () => idle(800));

  size();
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 150); }, {passive: true});
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { es[0].isIntersecting ? start() : stop(); }, {rootMargin: '100px 0px'}).observe(stage);
  } else start();
  stage.classList.add('ready');
})();
