/*! ami-update 1.1.0 | min_xml_version 6.1.0 */
(function (W, D) {
  'use strict';
  var NAME = 'ami-update', VER = '1.1.0', POLL = 90000;
  var REG = W.AMI_MODS = W.AMI_MODS || {};
  if (REG[NAME] && typeof REG[NAME].dispose === 'function') {
    try { REG[NAME].dispose(); } catch (e) {}
  }

  var timers = [], offs = [], gone = 0, seen = '', last = 0, first = 1, mo = null, busy = 0;

  function on(t, ev, fn, o) {
    t.addEventListener(ev, fn, o);
    offs.push(function () { t.removeEventListener(ev, fn, o); });
  }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function byId(id) { return D.getElementById(id); }
  function drop(id) { var n = byId(id); if (n && n.parentNode) n.parentNode.removeChild(n); }

  function dispose() {
    gone = 1;
    var w = byId('ami-lic-warn'); if (w && w.getAttribute('data-by') === NAME && w.parentNode) w.parentNode.removeChild(w);
    timers.forEach(clearTimeout); timers = [];
    offs.forEach(function (f) { f(); }); offs = [];
    drop('ami-upd-toast'); drop('ami-upd-css'); drop('ami-np-css');
    if (mo) { try { mo.disconnect(); } catch (e) {} mo = null; }
    [].forEach.call(D.querySelectorAll('.ami-np-slot'), function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    [].forEach.call(D.querySelectorAll('[data-ami-slot]'), function (n) { n.removeAttribute('data-ami-slot'); });
    if (REG[NAME] && REG[NAME].dispose === dispose) delete REG[NAME];
  }
  REG[NAME] = { version: VER, dispose: dispose };

  var RT = W.AMI_UPD_RT, SITE = 'https://ami.sch.id';
  if (!RT || RT.state !== 'ACTIVE') {
    if (!byId('ami-lic-warn') && D.body) {
      var d = D.createElement('div'), a = D.createElement('a');
      d.id = 'ami-lic-warn'; d.setAttribute('data-by', NAME); d.setAttribute('role', 'alert');
      d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483000;padding:10px 14px;background:#b71c1c;color:#fff;font:600 14px/1.4 system-ui,sans-serif;text-align:center';
      d.appendChild(D.createTextNode('Template ini belum memiliki lisensi aktif untuk situs ini. Silakan hubungi '));
      a.href = SITE; a.target = '_blank'; a.rel = 'noopener'; a.style.cssText = 'color:#fff;text-decoration:underline'; a.textContent = 'ami.sch.id';
      d.appendChild(a); d.appendChild(D.createTextNode(' untuk membeli secara resmi.'));
      D.body.appendChild(d);
    }
    return;
  }
  slots();
  if (location.pathname !== '/' || location.search) return;

  var id = (D.documentElement.lang || '').toLowerCase().indexOf('id') === 0;
  var T = id ? { m: 'Ada artikel baru', b: 'Muat ulang', x: 'Tutup' }
             : { m: 'New article available', b: 'Reload', x: 'Dismiss' };

  function css() {
    drop('ami-upd-css');
    var s = D.createElement('style'); s.id = 'ami-upd-css';
    s.textContent = '#ami-upd-toast{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99990;max-width:calc(100vw - 24px);display:flex;align-items:center;gap:10px;padding:10px 12px 10px 16px;border-radius:999px;background:var(--main-color,#1565c0);color:#fff;font:600 14px/1.3 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)}' +
      '#ami-upd-toast span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#ami-upd-toast button{border:0;border-radius:999px;padding:6px 12px;font:inherit;cursor:pointer}' +
      '#ami-upd-toast .go{background:#fff;color:#0d2a5c}#ami-upd-toast .x{background:transparent;color:#fff;padding:6px 8px}';
    D.head.appendChild(s);
  }

  function toast(title) {
    drop('ami-upd-toast'); css();
    var t = D.createElement('div'); t.id = 'ami-upd-toast'; t.setAttribute('role', 'status');
    var m = D.createElement('span'); m.textContent = T.m + (title ? ': ' + title : '');
    var go = D.createElement('button'); go.type = 'button'; go.className = 'go'; go.textContent = T.b;
    var x = D.createElement('button'); x.type = 'button'; x.className = 'x'; x.textContent = '\u00D7'; x.setAttribute('aria-label', T.x);
    go.onclick = function () {
      try { if (W.aksaraFeedCache && W.aksaraFeedCache.clear) W.aksaraFeedCache.clear(); } catch (e) {}
      soft(seen).then(function (ok) {
        if (ok) { drop('ami-upd-toast'); try { W.scrollTo(0, 0); } catch (e) {} }
        else location.reload();
      });
    };
    x.onclick = function () { drop('ami-upd-toast'); };
    t.appendChild(m); t.appendChild(go); t.appendChild(x);
    D.body.appendChild(t);
  }


  /* ---- Widget antar artikel (pembatas Next Post) ----
     Sumber: section "Widget Antar Artikel (Next Post)" di Tata Letak (#ami-np-slot).
     Isi widget disalin ke tiap artikel berikutnya yang dimuat otomatis, tepat di bawah garis pembatas. */
  function slotNode() {
    var src = byId('ami-np-slot'), box = D.createElement('div'), n = 0;
    if (!src) return null;
    box.className = 'ami-np-slot';
    [].forEach.call(src.querySelectorAll('.widget'), function (w) {
      var c = w.querySelector('.widget-content') || w, item = D.createElement('div');
      if (!(c.innerHTML || '').replace(/\s+/g, '')) return;
      item.className = 'ami-np-slot-item';
      item.innerHTML = c.innerHTML;
      [].forEach.call(item.querySelectorAll('script'), function (s) { s.parentNode.removeChild(s); });
      [].forEach.call(item.querySelectorAll('[id]'), function (e) { e.removeAttribute('id'); });
      box.appendChild(item); n++;
    });
    return n ? box : null;
  }

  function slotFill(root) {
    var ss = (root || D).querySelectorAll('section.ami-np:not([data-ami-slot])');
    for (var i = 0; i < ss.length; i++) {
      ss[i].setAttribute('data-ami-slot', '1');
      var b = slotNode();
      if (b) ss[i].insertBefore(b, ss[i].firstChild);
    }
  }

  function slots() {
    if (!byId('ami-np-slot')) return;
    drop('ami-np-css');
    var s = D.createElement('style'); s.id = 'ami-np-css';
    s.textContent = '.ami-np-slot{margin:0 0 18px}.ami-np-slot-item{margin:0 0 12px}.ami-np-slot-item:last-child{margin-bottom:0}.ami-np-slot-item img{max-width:100%;height:auto}@media print{.ami-np-slot{display:none!important}}';
    D.head.appendChild(s);
    slotFill();
    if (!W.MutationObserver) return;
    mo = new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var a = ms[i].addedNodes;
        for (var j = 0; j < a.length; j++) {
          var n = a[j];
          if (n.nodeType === 1 && (n.matches && n.matches('section.ami-np') || n.querySelector && n.querySelector('section.ami-np'))) { slotFill(); return; }
        }
      }
    });
    mo.observe(byId('main') || D.body, { childList: true, subtree: true });
  }

  function path(u) { return String(u || '').split('?')[0].split('#')[0].replace(/^https?:\/\/[^\/]+/, ''); }

  function inList(p) {
    var as = D.querySelectorAll('#main .index-post a[href]');
    for (var i = 0; i < as.length; i++) if (path(as[i].getAttribute('href')) === p) return true;
    return false;
  }


  /* Sisipkan artikel baru ke daftar beranda tanpa muat ulang halaman.
     Mengambil HTML beranda segar (parameter acak melewati cache), lalu hanya menambah kartu yang belum ada.
     Mengembalikan Promise<boolean>: true bila artikel terbaru sudah tampil. */
  function cards(root) {
    return [].filter.call(root.querySelectorAll('#main .index-post'), function (c) { return !c.classList.contains('ad-type') && c.querySelector('a[href]'); });
  }
  function cardPath(c) { var a = c.querySelector('a[href]'); return a ? path(a.getAttribute('href')) : ''; }

  function soft(p) {
    if (busy || !W.fetch || !W.DOMParser) return Promise.resolve(false);
    var cur = cards(D);
    if (!cur.length) return Promise.resolve(false);
    busy = 1;
    return fetch('/?amr=' + Date.now().toString(36), { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (h) {
        if (gone || !h) return false;
        var doc = new DOMParser().parseFromString(h, 'text/html'), fresh = cards(doc), have = {}, add = [], i;
        cur.forEach(function (c) { have[cardPath(c)] = 1; });
        var found = false;
        for (i = 0; i < fresh.length; i++) {
          var fp = cardPath(fresh[i]);
          if (fp === p) found = true;
          if (fp && !have[fp]) add.push(fresh[i]);
        }
        if (!found || !add.length) return found && !add.length;   // HTML segar pun belum memuat artikel baru: biar jalur cadangan bekerja
        var first = cur[0], parent = first.parentNode;
        add.forEach(function (n) {
          var c = D.importNode(n, true);
          [].forEach.call(c.querySelectorAll('script'), function (s) { s.parentNode.removeChild(s); });
          c.setAttribute('data-ami-live', '1');
          parent.insertBefore(c, first);
        });
        var all = cards(D), over = all.length - fresh.length;   // jaga jumlah kartu sama dengan halaman asli
        while (over-- > 0) { var t = all.pop(); if (t && t.parentNode && !t.getAttribute('data-ami-live')) t.parentNode.removeChild(t); }
        try { if (W.jQuery && W.jQuery.fn.aksaraLazy) W.jQuery('.index-post .entry-image-wrap .entry-image').not('.aksara-lazy').aksaraLazy(); } catch (e) {}
        return true;
      })
      .catch(function () { return false; })
      .then(function (ok) { busy = 0; return ok; });
  }

  function check() {
    if (gone || D.hidden || !W.fetch) return;
    last = Date.now();
    fetch('/feeds/posts/summary?alt=json&max-results=1', { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (gone || !d) return;
        var e = d.feed && d.feed.entry && d.feed.entry[0]; if (!e) return;
        var l = (e.link || []).filter(function (x) { return x.rel === 'alternate'; })[0]; if (!l) return;
        var p = path(l.href);
        if (!p || p === seen) return;
        var hasList = D.querySelector('#main .index-post'), title = e.title && e.title.$t;
        var need = first ? (hasList && !inList(p)) : true;
        seen = p; first = 0;
        if (!need) return;
        if (hasList && (W.pageYOffset || 0) < 200) soft(p).then(function (ok) { if (!ok && !gone) toast(title); });
        else toast(title);
      })
      .catch(function () {});
  }

  function loop() { if (gone) return; check(); later(loop, POLL); }
  on(D, 'visibilitychange', function () { if (!D.hidden && Date.now() - last > 60000) check(); });
  later(loop, 1500);
})(window, document);
