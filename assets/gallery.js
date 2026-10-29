/* File/http compatible. Yatay serit: her fotograf kendi oranini korur, kutu boslugu olmaz.
   Sayfa kisa kalsin diye fotograflar seritte kucuk durur, buyutmek icin pop-up acilir. */
(function () {
  'use strict';
  const host = document.getElementById('gallery-rows');
  const categories = (window.FAHER_GALERI?.categories || []).filter(c => c.visible && c.photos.length);
  const dialog = document.getElementById('lightbox');
  const photo = dialog.querySelector('img');
  const caption = document.getElementById('lightbox-caption');
  const counter = document.getElementById('lightbox-counter');
  const status = document.getElementById('lightbox-status');
  const close = dialog.querySelector('[data-close]');
  let active, index = 0, opener, token = 0, preloaded;
  const mod = (n, length) => (n + length) % length;
  async function show(position) {
    index = mod(position, active.photos.length);
    const current = active.photos[index], request = ++token;
    photo.style.opacity = '0';
    status.textContent = 'Fotoğraf yükleniyor…';
    caption.textContent = current.caption;
    counter.textContent = `${index + 1} / ${active.photos.length}`;
    const loaded = new Image();
    loaded.src = current.large;
    try {
      await loaded.decode();
      if (request !== token || !dialog.open) return;
      photo.src = current.large;
      photo.alt = current.caption;
      photo.width = current.largeWidth;
      photo.height = current.largeHeight;
      photo.style.opacity = '1';
      status.textContent = '';
      preloaded = new Image();
      preloaded.src = active.photos[mod(index + 1, active.photos.length)].large;
    } catch (_) {
      if (request === token) status.textContent = 'Fotoğraf yüklenemedi. Diğer fotoğrafları görüntüleyebilirsiniz.';
    }
  }
  function open(category, position, trigger) {
    active = category; opener = trigger;
    document.getElementById('lightbox-title').textContent = category.title;
    window.faherScroll?.stop();
    document.body.classList.add('lightbox-open');
    dialog.showModal();
    close.focus();
    show(position);
  }
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    token++;
    photo.removeAttribute('src');
    preloaded = null;
    document.body.classList.remove('lightbox-open');
    window.faherScroll?.start();
    opener?.focus({preventScroll:true});
  });
  dialog.querySelector('[data-prev]').addEventListener('click', () => show(index - 1));
  dialog.querySelector('[data-next]').addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(index - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(index + 1); }
    if (event.key === 'Tab') {
      const buttons = [...dialog.querySelectorAll('button')];
      const first = buttons[0], last = buttons[buttons.length-1];
      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    }
  });
  let startX = 0, startY = 0;
  const viewport = dialog.querySelector('.lightbox-photo');
  viewport.addEventListener('touchstart', event => {
    startX = event.touches[0].clientX; startY = event.touches[0].clientY;
  }, {passive:true});
  viewport.addEventListener('touchend', event => {
    const dx = event.changedTouches[0].clientX-startX, dy = event.changedTouches[0].clientY-startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)*1.5) show(index + (dx < 0 ? 1 : -1));
  }, {passive:true});

  /* Serit yuksekligi: telefonda kisa, masaustunde daha iri. Genislik orandan gelir. */
  const narrow = () => window.matchMedia('(max-width: 820px)').matches;
  const stripHeight = () => narrow() ? 138 : 212;
  const measures = [];

  categories.forEach(category => {
    const row = document.createElement('section');
    row.className = 'gallery-row';
    row.setAttribute('aria-labelledby', `category-${category.id}`);
    const heading = document.createElement('h3');
    heading.id = `category-${category.id}`;
    const split = category.title.lastIndexOf(' ');
    heading.append(document.createTextNode(split < 0 ? '' : category.title.slice(0, split) + ' '));
    const accent = document.createElement('em');
    accent.textContent = split < 0 ? category.title : category.title.slice(split + 1);
    heading.append(accent);
    const head = document.createElement('div');
    head.className = 'gallery-head';
    head.append(heading);
    const count = document.createElement('span');
    count.className = 'tag';
    count.textContent = `(${String(category.photos.length).padStart(2, '0')})`;
    head.append(count);
    row.append(head);
    if (category.summary) {
      const summary = document.createElement('p');
      summary.className = 'gallery-sum';
      summary.textContent = category.summary;
      row.append(summary);
    }

    const wrap = document.createElement('div');
    wrap.className = 'gallery-strip-wrap';
    const strip = document.createElement('div');
    strip.className = 'gallery-strip';
    strip.tabIndex = 0;
    strip.setAttribute('role', 'group');
    strip.setAttribute('aria-label', `${category.title}, ${category.photos.length} fotoğraf, yana kaydırın`);
    const track = document.createElement('div');
    track.className = 'gallery-track';
    category.photos.forEach((item, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gallery-photo';
      button.setAttribute('aria-label', `${item.caption}, fotoğrafı büyüt`);
      const image = document.createElement('img');
      image.alt = item.caption;
      image.width = item.width; image.height = item.height;
      image.loading = 'lazy'; image.decoding = 'async'; image.src = item.thumb;
      button.append(image);
      button.addEventListener('click', () => open(category, i, button));
      track.append(button);
    });
    strip.append(track);
    wrap.append(strip);
    row.append(wrap);
    host.append(row);

    /* Sagda devami oldugunu gosteren solma; sona gelince kalkar. */
    const edge = () => {
      const more = strip.scrollWidth - strip.clientWidth - strip.scrollLeft > 4;
      wrap.classList.toggle('has-more', more);
      wrap.classList.toggle('has-prev', strip.scrollLeft > 4);
    };
    const measure = () => {
      const height = stripHeight();
      const boxes = track.children;
      category.photos.forEach((item, i) => {
        const node = boxes[i];
        node.style.height = height + 'px';
        node.style.width = Math.max(1, Math.round(item.width / item.height * height)) + 'px';
      });
      edge();
    };
    strip.addEventListener('scroll', edge, {passive:true});
    measures.push(measure);
    measure();
  });

  let timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => measures.forEach(fn => fn()), 120);
  }, {passive:true});
})();
