/* v17 "Hizmetlerimiz": bölüm görününce fotoğraf maskeyle açılır, yazılar sırayla gelir.
   Masaüstünde soldaki kat göstergesi ekranın ortasındaki hizmete geçer; altın kabin o kata iner.
   Kat bağlantılarının kaydırmasını site.js'in genel # işleyicisi yapıyor (90 px pay). */
(function () {
  'use strict';
  const hz = document.getElementById('hizmetler');
  if (!hz) return;
  hz.classList.add('hz-js');
  const panels = [...hz.querySelectorAll('.hz-p')];
  const links = [...hz.querySelectorAll('.hz-floors a')];
  const led = document.getElementById('hz-led');
  const ledBox = hz.querySelector('.hz-led');
  const cab = hz.querySelector('.hz-cab');
  const az = document.documentElement.classList.contains('az-hareket');
  const pad = n => String(n).padStart(2, '0');
  const reveal = [...panels, hz.querySelector('.hz-sys-grid')].filter(Boolean);

  if (!('IntersectionObserver' in window)) { reveal.forEach(el => el.classList.add('in')); return; }

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), {rootMargin: '0px 0px -14% 0px'});
  reveal.forEach(el => io.observe(el));

  /* kat göstergesi */
  let cur = -1, degTimer;
  function kabin() {
    const a = links[cur];
    if (!cab || !a || !a.offsetHeight) return;
    cab.style.setProperty('--cy', a.offsetTop + 'px');
    cab.style.setProperty('--ch', a.offsetHeight + 'px');
  }
  function setActive(i) {
    if (i === cur || i < 0) return;
    const yukari = i > cur; cur = i;
    links.forEach((a, k) => a.setAttribute('aria-current', k === i ? 'true' : 'false'));
    kabin();
    if (!led) return;
    ledBox.classList.toggle('asagi', !yukari);
    if (az) { led.textContent = pad(i + 1); return; }
    clearTimeout(degTimer);
    led.classList.add('deg');
    degTimer = setTimeout(() => { led.textContent = pad(i + 1); led.classList.remove('deg'); }, 230);
  }
  if (links.length) {
    /* Etkin hizmet her kaydırmada konumdan hesaplanır: üst kenarı ekranın ortasını geçmiş son hizmet.
       (Gözlemciyle yapınca menüden atlayınca gösterge eski katta kalıyordu.) Gösterge sadece masaüstünde var. */
    const rail = hz.querySelector('.hz-rail');
    let acik = true, raf = 0;
    const olc = () => { acik = getComputedStyle(rail).display !== 'none'; };
    function hesapla() {
      raf = 0;
      if (!acik) return;
      const r = hz.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const mid = innerHeight * .5;
      let i = 0;
      panels.forEach((p, k) => { if (p.getBoundingClientRect().top < mid) i = k; });
      setActive(i);
    }
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(hesapla); }, {passive: true});
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { olc(); kabin(); hesapla(); }, 150); }, {passive: true});
    if (document.fonts?.ready) document.fonts.ready.then(kabin);
    olc(); setActive(0); hesapla();
  }
})();
