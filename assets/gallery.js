/* File/http compatible. Justified rows: every photo keeps its own aspect ratio, no empty frame. */
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

  /* Satır dağıtımı: fotoğraflar oranlarıyla satıra yerleşir, satır genişliği tam dolar. */
  function split(ratios, rowCount) {
    const count = ratios.length;
    const share = ratios.reduce((sum, value) => sum + value, 0) / rowCount;
    const rows = []; let current = [], sum = 0;
    for (let i = 0; i < count; i++) {
      current.push(i); sum += ratios[i];
      const rowsLeft = rowCount - rows.length - 1;
      const itemsLeft = count - i - 1;
      if (rowsLeft <= 0) continue;
      if (itemsLeft <= rowsLeft || sum >= share * 0.92) { rows.push(current); current = []; sum = 0; }
    }
    if (current.length) rows.push(current);
    const last = rows[rows.length - 1], before = rows[rows.length - 2];
    if (last && before && last.length === 1 && before.length > 2) last.unshift(before.pop());
    return rows;
  }

  function place(grid, category, gap, target, maxHeight) {
    const width = grid.clientWidth;
    if (!width) return;
    const ratios = category.photos.map(p => p.width / p.height);
    const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
    const totalWidth = totalRatio * target + gap * (ratios.length - 1);
    let rowCount = Math.min(ratios.length, Math.max(1, Math.round(totalWidth / width)));
    // Satırlar hedefin çok altına inmesin: fotoğraf azsa satır sayısını artırıp boyutu büyüt.
    while (rowCount < ratios.length && width * rowCount / totalRatio < target * 0.74) rowCount++;
    const rows = split(ratios, rowCount);
    const boxes = grid.children;
    rows.forEach(row => {
      const sum = row.reduce((total, i) => total + ratios[i], 0);
      const free = Math.floor(width - gap * (row.length - 1)) - 1;
      const height = Math.min(free / sum, maxHeight);
      let used = 0;
      row.forEach((i, position) => {
        let box = Math.max(1, Math.floor(ratios[i] * height));
        if (position === row.length - 1 && free / sum <= maxHeight) box = Math.max(1, free - used);
        used += box;
        const node = boxes[i];
        node.style.width = box + 'px';
        node.style.height = Math.round(height) + 'px';
        node.style.marginRight = position === row.length - 1 ? '0' : gap + 'px';
      });
    });
  }

  const built = [];
  categories.forEach(category => {
    const row = document.createElement('section');
    row.className = 'gallery-row';
    row.setAttribute('aria-labelledby', `category-${category.id}`);
    const heading = document.createElement('h3');
    heading.id = `category-${category.id}`;
    const split2 = category.title.lastIndexOf(' ');
    heading.append(document.createTextNode(split2 < 0 ? '' : category.title.slice(0, split2) + ' '));
    const accent = document.createElement('em');
    accent.textContent = split2 < 0 ? category.title : category.title.slice(split2 + 1);
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
    const grid = document.createElement('div');
    grid.className = 'gallery-grid';
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
      grid.append(button);
    });
    row.append(grid);
    host.append(row);
    const measure = () => {
      const narrow = window.innerWidth <= 820;
      place(grid, category, narrow ? 8 : 14, narrow ? 200 : 330, narrow ? window.innerHeight * 0.62 : 520);
    };
    measure();
    new ResizeObserver(measure).observe(grid);
    built.push({row, measure, count: category.photos.length});
  });

  /* Telefonda galeri 19 ekran surdugu ve Hizmetler bolumunu gomdugu icin ilk iki bolum
     gosterilir, kalani dugmeyle acilir. Katli satirlar display:none oldugundan lazy
     gorseller de inmez. Masaustunde galeri tam haliyle kalir. */
  const FOLD = 2;
  const query = window.matchMedia('(max-width: 820px)');
  const rest = built.slice(FOLD);
  let opened = false;

  if (rest.length) {
    const hiddenPhotos = rest.reduce((sum, item) => sum + item.count, 0);
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'gallery-more';
    more.hidden = true;
    more.append(document.createTextNode('Kalan fotoğrafları göster'));
    const badge = document.createElement('span');
    badge.textContent = '(' + String(hiddenPhotos).padStart(2, '0') + ')';
    more.append(badge);
    host.append(more);
    rest.forEach(item => { item.row.querySelector('h3').tabIndex = -1; });

    function fold() {
      if (opened) return;
      const on = query.matches;
      rest.forEach(item => { item.row.hidden = on; });
      more.hidden = !on;
    }
    more.addEventListener('click', () => {
      opened = true;
      more.hidden = true;
      rest.forEach(item => { item.row.hidden = false; item.measure(); });
      rest[0].row.querySelector('h3').focus({preventScroll: true});
    });
    fold();
    // Eski Android tarayicilarinda matchMedia'nin addEventListener'i olmayabilir.
    if (query.addEventListener) query.addEventListener('change', fold);
    else if (query.addListener) query.addListener(fold);
    else window.addEventListener('resize', fold);
  }
})();
