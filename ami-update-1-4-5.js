/*! ami-update 1.4.5 | min_xml_version 6.1.5 */
(function (W, D) {
  'use strict';
  var NAME = 'ami-update', VER = '1.4.5', POLL = 90000;
  var REG = W.AMI_MODS = W.AMI_MODS || {};
  if (REG[NAME] && typeof REG[NAME].dispose === 'function') {
    try { REG[NAME].dispose(); } catch (e) {}
  }

  var timers = [], offs = [], gone = 0, seen = '', last = 0, first = 1, mo = null, busy = 0,
      viewed = {}, dwell = {}, vio = null, ios = [], heroSt = null, waSt = null, prSt = null;

  function on(t, ev, fn, o) {
    t.addEventListener(ev, fn, o);
    offs.push(function () { t.removeEventListener(ev, fn, o); });
  }
  function later(fn, ms) {
    var t = setTimeout(function () { var i = timers.indexOf(t); if (i > -1) timers.splice(i, 1); fn(); }, ms);
    timers.push(t);
  }
  function byId(id) { return D.getElementById(id); }
  function drop(id) { var n = byId(id); if (n && n.parentNode) n.parentNode.removeChild(n); }

  function dispose() {
    gone = 1;
    var w = byId('ami-lic-warn'); if (w && w.getAttribute('data-by') === NAME && w.parentNode) w.parentNode.removeChild(w);
    timers.forEach(clearTimeout); timers = [];
    offs.forEach(function (f) { f(); }); offs = [];
    drop('ami-upd-toast'); drop('ami-upd-css'); drop('ami-np-css'); drop('ami-hero-css'); drop('ami-wa-css'); drop('ami-prot-css'); drop('ami-prot-toast');
    if (heroSt) { try { clearInterval(heroSt.timer); heroSt.wc.innerHTML = heroSt.orig; heroSt.wc.removeAttribute('data-ami-hero'); } catch (e) {} heroSt = null; }
    [].forEach.call(D.querySelectorAll('[data-ami="1"]'), function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    if (waSt) { try { waSt.parentNode.removeChild(waSt); } catch (e) {} waSt = null; }
    if (prSt) { try { clearTimeout(prSt.t); } catch (e) {} prSt = null; }
    if (mo) { try { mo.disconnect(); } catch (e) {} mo = null; }
    if (vio) { try { vio.disconnect(); } catch (e) {} vio = null; }
    ios.forEach(function (o) { try { o.disconnect(); } catch (e) {} }); ios = [];
    Object.keys(dwell).forEach(function (k) { clearTimeout(dwell[k]); }); dwell = {};
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
      d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483000;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));background:#b71c1c;color:#fff;font:600 14px/1.4 system-ui,sans-serif;text-align:center';
      d.appendChild(D.createTextNode('Template ini belum memiliki lisensi aktif untuk situs ini. Silakan hubungi '));
      a.href = SITE; a.target = '_blank'; a.rel = 'noopener'; a.style.cssText = 'color:#fff;text-decoration:underline'; a.textContent = 'ami.sch.id';
      d.appendChild(a); d.appendChild(D.createTextNode(' untuk membeli secara resmi.'));
      D.body.appendChild(d);
    }
    return;
  }
  slots();
  hero();
  wa();
  protect();
  speed();
  seo();
  if (location.pathname !== '/' || location.search) return;

  var id = (D.documentElement.lang || '').toLowerCase().indexOf('id') === 0;
  var T = id ? { m: 'Ada artikel baru', b: 'Muat ulang', x: 'Tutup' }
             : { m: 'New article available', b: 'Reload', x: 'Dismiss' };

  function css() {
    drop('ami-upd-css');
    var s = D.createElement('style'); s.id = 'ami-upd-css';
    s.textContent = '#ami-upd-toast{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:99990;max-width:calc(100vw - 24px);display:flex;align-items:center;gap:10px;padding:10px 12px 10px 16px;border-radius:999px;background:var(--main-color,#1565c0);color:#fff;font:600 14px/1.3 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)}' +
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


  /* ---- Widget dan hitungan tayang di artikel Next Post ----
     1) #ami-np-slot            : section "Widget Antar Artikel (Next Post)" -> di bawah garis pembatas.
     2) #before-ad / #after-ad  : isi Post ADS 1 dan Post ADS 2 -> sebelum dan sesudah isi tiap artikel berikutnya.
     Isi disalin tanpa skrip dan tanpa id. Unit AdSense (ins.adsbygoogle dengan data-ad-client dan data-ad-slot) dibuat ulang
     dan dimuat saat mendekati layar; banner HTML/CSS biasa tampil normal.
     3) Tiap artikel berikutnya yang tampil di tengah layar >= 1,2 detik dihitung sebagai satu tayangan (sekali per artikel).
     Opsi di gadget Pengaturan (Next Post): nextbanner=hide | nextadsense=hide | nextview=no | nextga=on
     (jangan memakai kata off/mati/nonaktif: kata itu mematikan seluruh fitur Next Post). */
  function cfgHas(re) {
    var c = byId('ami-next-cfg');
    return !!(c && re.test(c.getAttribute('data-cfg') || ''));
  }
  function adsenseOn() { return !cfgHas(/nextadsense\s*[=:]\s*(hide|no|skip)/i); }
  function viewsOn()   { return !cfgHas(/nextview\s*[=:]\s*(hide|no|skip)/i); }
  function gaOn()      { return cfgHas(/nextga\s*[=:]\s*on/i); }

  function cloneBox(src, cls) {
    var box = D.createElement('div'), n = 0, ads = adsenseOn();
    if (!src) return null;
    box.className = 'ami-np-slot ' + cls;
    [].forEach.call(src.querySelectorAll('.widget'), function (w) {
      var c = w.querySelector('.widget-content') || w, item = D.createElement('div');
      item.className = 'ami-np-slot-item';
      item.innerHTML = c.innerHTML;
      [].forEach.call(item.querySelectorAll('script'), function (s) { s.parentNode.removeChild(s); });
      [].forEach.call(item.querySelectorAll('ins.adsbygoogle'), function (a) {
        if (!ads || !a.getAttribute('data-ad-client') || !a.getAttribute('data-ad-slot')) { a.parentNode.removeChild(a); return; }
        ['data-adsbygoogle-status', 'data-ad-status', 'data-anchor-status', 'data-vignette-status', 'data-ami-pushed'].forEach(function (k) { a.removeAttribute(k); });
        a.innerHTML = '';
      });
      [].forEach.call(item.querySelectorAll('[id]'), function (e) { e.removeAttribute('id'); });
      if (!(item.innerHTML || '').replace(/\s+/g, '') && !item.querySelector('ins.adsbygoogle')) return;
      box.appendChild(item); n++;
    });
    return n ? box : null;
  }

  function pushAds(root) {
    [].forEach.call(root.querySelectorAll('ins.adsbygoogle:not([data-ami-pushed])'), function (a) {
      a.setAttribute('data-ami-pushed', '1');
      var go = function () { if (gone) return; try { (W.adsbygoogle = W.adsbygoogle || []).push({}); } catch (e) {} };
      if (W.IntersectionObserver) {
        var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); go(); } }, { rootMargin: '400px 0px' });
        ios.push(o); o.observe(a);
      } else go();
    });
  }

  function canon() {
    var l = D.querySelector('link[rel=canonical]');
    return path((l && l.href) || location.href);
  }

  function count(s) {
    var u = s.getAttribute('data-url') || '', p = path(u), t = s.getAttribute('data-title') || '';
    if (!p || viewed[p]) return;
    viewed[p] = 1;
    // Satu permintaan halaman artikel agar tercatat sebagai kunjungan ke artikel itu (statistik Blogger).
    if (W.fetch) { try { W.fetch(p, { cache: 'no-store', credentials: 'same-origin' }).catch(function () {}); } catch (e) {} }
    if (gaOn()) {
      try {
        if (typeof W.gtag === 'function') W.gtag('event', 'page_view', { page_location: location.origin + p, page_path: p, page_title: t });
        else if (typeof W.ga === 'function') W.ga('send', 'pageview', p);
      } catch (e) {}
    }
  }

  function watch(s) {
    if (!viewsOn() || !W.IntersectionObserver) return;
    if (!vio) {
      vio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var n = e.target, k = n.getAttribute('data-url') || '';
          if (e.isIntersecting) {
            if (!dwell[k] && !viewed[path(k)]) dwell[k] = setTimeout(function () { delete dwell[k]; if (!gone) count(n); }, 1200);
          } else if (dwell[k]) { clearTimeout(dwell[k]); delete dwell[k]; }
        });
      }, { rootMargin: '-40% 0px -40% 0px' });
    }
    vio.observe(s);
  }

  function bannersOn() { return !cfgHas(/nextbanner\s*[=:]\s*hide/i); }

  function slotFill(root) {
    var ss = (root || D).querySelectorAll('section.ami-np:not([data-ami-slot])'), ban = bannersOn();
    for (var i = 0; i < ss.length; i++) {
      var s = ss[i], b, body = s.querySelector('.ami-np-body');
      s.setAttribute('data-ami-slot', '1');
      watch(s);
      if ((b = cloneBox(byId('ami-np-slot'), 'ami-np-slot-top'))) { s.insertBefore(b, s.firstChild); pushAds(b); }
      if (!ban || !body) continue;
      if ((b = cloneBox(byId('before-ad') || byId('aksara-main-before-ad'), 'ami-np-slot-before'))) { s.insertBefore(b, body); pushAds(b); }
      if ((b = cloneBox(byId('after-ad') || byId('aksara-main-after-ad'), 'ami-np-slot-after'))) { s.insertBefore(b, body.nextSibling); pushAds(b); }
    }
  }

  function slots() {
    var any = byId('ami-np-slot') || byId('before-ad') || byId('after-ad') || byId('aksara-main-before-ad') || byId('aksara-main-after-ad');
    if (!any && !byId('post-body')) return;
    viewed[canon()] = 1;
    drop('ami-np-css');
    if (any) {
      var s = D.createElement('style'); s.id = 'ami-np-css';
      s.textContent = '.ami-np-slot{margin:0 0 18px}.ami-np-slot-before{margin:0 0 20px}.ami-np-slot-after{margin:20px 0 0}.ami-np-slot-item{margin:0 0 12px}.ami-np-slot-item:last-child{margin-bottom:0}.ami-np-slot-item img{max-width:100%;height:auto}@media print{.ami-np-slot{display:none!important}}';
      D.head.appendChild(s);
    }
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

  /* ---- Hero beranda: slide artikel + iklan + daftar artikel (section Featured Posts) ----
     Isi gadget HTML/JavaScript di Featured Posts, contoh:
       <div hidden>{getHero} $label={Berita} $results={5} $interval={5} $listlabel={recent} $listresults={4}</div>
       <template class="hero-ad"><a href="https://contoh.com"><img src="https://contoh.com/banner.jpg" alt="Iklan"></a></template>
     $label/$results: slide (maks 8). $interval: detik ganti slide (0 = tidak otomatis).
     $listlabel/$listresults: daftar di kanan (0 = tanpa daftar, maks 6). Isi template.hero-ad = iklan di atas daftar
     (gambar, HTML, atau unit AdSense ins.adsbygoogle tanpa skrip push). Skrip di dalamnya dibuang. */
  function hEl(t, c, x) { var e = D.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function hNum(v, d, lo, hi) { var n = parseFloat(v); if (n !== n) n = d; return Math.max(lo, Math.min(hi, n)); }
  function hCfg(t) { var o = {}, re = /\$(\w+)\s*=\s*\{([^}]*)\}/g, m; while ((m = re.exec(t))) o[m[1].toLowerCase()] = m[2].trim(); return o; }
  function hImg(u, w, h) {
    if (!u) return '';
    if (/img\.youtube\.com\/vi\//.test(u)) return u.replace(/\/(default|mqdefault|hqdefault)\.jpg/, w > 400 ? '/hqdefault.jpg' : '/mqdefault.jpg');
    return u.replace(/\/s\d+(-c)?\//, '/w' + w + '-h' + h + '-c/');
  }
  function hAgo(iso, idn) {
    var t = Date.parse(iso), s, m, h, d;
    if (!t) return '';
    s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return idn ? 'baru saja' : 'just now';
    m = Math.floor(s / 60); if (m < 60) return m + (idn ? ' menit lalu' : ' min ago');
    h = Math.floor(m / 60); if (h < 24) return h + (idn ? ' jam lalu' : ' h ago');
    d = Math.floor(h / 24); if (d < 30) return d + (idn ? ' hari lalu' : ' d ago');
    return new Date(t).toLocaleDateString(idn ? 'id-ID' : undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function hFeed(label, n) {
    if (!W.fetch) return Promise.resolve([]);
    var u = (!label || label === 'recent') ? '/feeds/posts/summary?alt=json&max-results=' + n
      : '/feeds/posts/summary/-/' + encodeURIComponent(label) + '?alt=json&max-results=' + n;
    return W.fetch(u, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var es = (d && d.feed && d.feed.entry) || [], out = [];
        es.forEach(function (e) {
          var l = (e.link || []).filter(function (x) { return x.rel === 'alternate'; })[0];
          if (!l) return;
          out.push({ u: l.href, t: (e.title && e.title.$t) || '', c: (e.category && e.category[0] && e.category[0].term) || '',
                     d: (e.published && e.published.$t) || '', i: (e['media$thumbnail'] && e['media$thumbnail'].url) || '' });
        });
        return out;
      })
      .catch(function () { return []; });
  }
  function hFeedF(label, n) {
    return hFeed(label, n).then(function (a) {
      if (a.length || !label || label === 'recent') return a;
      try { console.warn('[ami-hero] label "' + label + '" tidak ditemukan; memakai artikel terbaru'); } catch (e) {}
      return hFeed('recent', n);
    });
  }
  function heroCss() {
    drop('ami-hero-css');
    var s = D.createElement('style'); s.id = 'ami-hero-css';
    s.textContent = '.ami-hero{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:20px;align-items:stretch}.ami-hero.solo{grid-template-columns:minmax(0,1fr)}.ami-hero>*{min-width:0}' +
      '.ami-hero-main{position:relative;width:100%;min-width:0;aspect-ratio:3/2;min-height:240px;border-radius:var(--radius,6px);overflow:hidden;background:#161b26}' +
      '.ami-hero-slide{position:absolute;inset:0;display:block;opacity:0;visibility:hidden;will-change:opacity;transition:opacity .6s ease,visibility .6s;color:#fff;text-decoration:none}.ami-hero-slide.on{opacity:1;visibility:visible}' +
      '.ami-hero-slide img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}' +
      '.ami-hero-slide:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.78) 100%)}' +
      '.ami-hero-cap{position:absolute;left:20px;right:20px;bottom:44px;z-index:1;display:block}' +
      '.ami-hero-chip{display:inline-block;background:var(--main-color,#e0213a);color:#fff;font:700 11px/1 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.03em;padding:6px 9px;border-radius:3px;margin:0 0 10px}' +
      '.ami-hero-title{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;font-weight:700;font-size:clamp(19px,2.7vw,34px);line-height:1.22;text-shadow:0 2px 8px rgba(0,0,0,.55)}' +
      '.ami-hero-dots{position:absolute;left:0;right:0;bottom:14px;z-index:2;display:flex;justify-content:center;gap:10px}' +
      '.ami-hero-dots button{position:relative;width:8px;height:8px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.75);cursor:pointer}' +
      '.ami-hero-dots button:before{content:"";position:absolute;inset:-9px}.ami-hero-dots button.on{background:var(--main-color,#e0213a);transform:scale(1.25)}' +
      '.ami-hero-side{display:flex;flex-direction:column;min-width:0;background:var(--ami-hero-bg,#e8f4fd);border-radius:var(--radius,6px);overflow:hidden;color:#1b1f2a}' +
      '.ami-hero-ad{line-height:0;text-align:center}.ami-hero-ad img{display:block;width:100%;height:auto}' +
      '.ami-hero-list{display:flex;flex-direction:column;gap:12px;padding:14px;flex:1;overflow:hidden}' +
      '.ami-hero-item{display:flex;gap:12px;color:inherit;text-decoration:none;min-width:0}.ami-hero-item img,.ami-hero-ph{flex:none;width:100px;height:80px;object-fit:cover;border-radius:3px;background:#cfd8e3}' +
      '.ami-hero-body{display:block;min-width:0}.ami-hero-it{display:block;font-weight:700;font-size:15px;line-height:1.4}.ami-hero-item:hover .ami-hero-it{text-decoration:underline}' +
      '.ami-hero-time{display:block;margin-top:2px;font-size:13px;color:#566070}' +
      '@media(max-width:820px){.ami-hero{grid-template-columns:minmax(0,1fr);gap:14px}.ami-hero-main{aspect-ratio:16/10}.ami-hero-cap{left:14px;right:14px;bottom:36px}}' +
      '@media(prefers-reduced-motion:reduce){.ami-hero-slide{transition:none}}';
    D.head.appendChild(s);
  }

  function hero() {
    var ws = D.querySelectorAll('.widget-content'), wc = null, i;
    for (i = 0; i < ws.length; i++) if (/\{gethero\}/i.test(ws[i].textContent || '') && !ws[i].getAttribute('data-ami-hero')) { wc = ws[i]; break; }
    if (!wc) return;
    var cf = hCfg(wc.textContent || ''), idn = (D.documentElement.lang || '').toLowerCase().indexOf('id') === 0,
        n = hNum(cf.results, 5, 1, 8), ln = hNum(cf.listresults, 4, 0, 6), iv = hNum(cf.interval, 5, 0, 30),
        tp = wc.querySelector('template.hero-ad'), pl = tp ? null : wc.querySelector('.hero-ad'),
        adSrc = tp ? (tp.content ? tp.content.cloneNode(true) : null) : (pl ? pl.cloneNode(true) : null),
        st = { wc: wc, orig: wc.innerHTML, timer: 0 };
    if (iv > 0 && iv < 2) iv = 2;
    wc.setAttribute('data-ami-hero', '1'); heroSt = st;
    Promise.all([hFeedF(cf.label, n), ln ? hFeedF(cf.listlabel, ln) : Promise.resolve([])]).then(function (r) {
      if (gone || heroSt !== st) return;
      var slides = r[0], list = r[1];
      if (!slides.length) { wc.innerHTML = ''; return; }
      var root = hEl('div', 'ami-hero'), main = hEl('div', 'ami-hero-main'), side = hEl('div', 'ami-hero-side'),
          cur = 0, paused = false, dots = [], els = [], hasSide = false, x0 = null;
      main.setAttribute('role', 'region'); main.setAttribute('aria-roledescription', 'carousel');
      main.setAttribute('aria-label', idn ? 'Berita utama' : 'Top stories');
      slides.forEach(function (it, k) {
        var a = hEl('a', 'ami-hero-slide' + (k ? '' : ' on')), cap = hEl('span', 'ami-hero-cap'), u = hImg(it.i, 1000, 667);
        a.href = it.u; a.setAttribute('aria-hidden', k ? 'true' : 'false'); if (k) a.tabIndex = -1;
        if (u) {
          var im = D.createElement('img'); im.alt = ''; im.width = 1000; im.height = 667; im.decoding = 'async';
          if (k) im.setAttribute('data-src', u); else { im.src = u; im.setAttribute('fetchpriority', 'high'); }
          a.appendChild(im);
        }
        if (it.c) cap.appendChild(hEl('span', 'ami-hero-chip', it.c));
        cap.appendChild(hEl('span', 'ami-hero-title', it.t));
        a.appendChild(cap); main.appendChild(a); els.push(a);
      });
      function pre(k) {
        var s = els[(k + els.length) % els.length], im = s && s.querySelector('img');
        if (im && !im.getAttribute('src') && im.getAttribute('data-src')) im.src = im.getAttribute('data-src');
      }
      later(function () { pre(1); }, 700);
      function go(k) {
        cur = (k + els.length) % els.length; pre(cur); pre(cur + 1);
        els.forEach(function (s, j) { var o = j === cur; s.className = 'ami-hero-slide' + (o ? ' on' : ''); s.setAttribute('aria-hidden', o ? 'false' : 'true'); s.tabIndex = o ? 0 : -1; });
        dots.forEach(function (d, j) { d.className = j === cur ? 'on' : ''; d.setAttribute('aria-current', j === cur ? 'true' : 'false'); });
      }
      if (els.length > 1) {
        var dw = hEl('div', 'ami-hero-dots');
        slides.forEach(function (it, k) {
          var b = hEl('button'); b.type = 'button'; b.setAttribute('aria-label', 'Slide ' + (k + 1)); if (!k) b.className = 'on';
          b.onclick = function () { go(k); }; dots.push(b); dw.appendChild(b);
        });
        main.appendChild(dw);
        if (iv > 0 && !(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches))
          st.timer = setInterval(function () { if (!D.hidden && !paused) go(cur + 1); }, iv * 1000);
        on(main, 'mouseenter', function () { paused = true; }); on(main, 'mouseleave', function () { paused = false; });
        on(main, 'focusin', function () { paused = true; }); on(main, 'focusout', function () { paused = false; });
        on(main, 'touchstart', function (e) { x0 = e.touches && e.touches[0] ? e.touches[0].clientX : null; paused = true; }, { passive: true });
        on(main, 'touchend', function (e) {
          var t = e.changedTouches && e.changedTouches[0];
          if (x0 != null && t && Math.abs(t.clientX - x0) > 40) go(cur + (t.clientX < x0 ? 1 : -1));
          x0 = null; paused = false;
        }, { passive: true });
      }
      if (adSrc) {
        var ad = hEl('div', 'ami-hero-ad');
        if (adSrc.removeAttribute) adSrc.removeAttribute('hidden');
        ad.appendChild(adSrc);
        [].forEach.call(ad.querySelectorAll('script'), function (e) { e.parentNode.removeChild(e); });
        [].forEach.call(ad.querySelectorAll('[hidden]'), function (e) { e.removeAttribute('hidden'); });
        [].forEach.call(ad.querySelectorAll('ins.adsbygoogle'), function (a) {
          if (!a.getAttribute('data-ad-client') || !a.getAttribute('data-ad-slot')) { a.parentNode.removeChild(a); return; }
          ['data-adsbygoogle-status', 'data-ad-status', 'data-anchor-status', 'data-ami-pushed'].forEach(function (k) { a.removeAttribute(k); });
          a.innerHTML = '';
        });
        if ((ad.innerHTML || '').replace(/\s+/g, '') || ad.querySelector('ins.adsbygoogle')) { side.appendChild(ad); hasSide = true; }
      }
      if (list.length) {
        var ul = hEl('div', 'ami-hero-list');
        list.forEach(function (it) {
          var a = hEl('a', 'ami-hero-item'), b = hEl('span', 'ami-hero-body'), u = hImg(it.i, 200, 160), tm = hAgo(it.d, idn);
          a.href = it.u;
          if (u) { var im = D.createElement('img'); im.src = u; im.alt = ''; im.width = 100; im.height = 80; im.loading = 'lazy'; im.decoding = 'async'; a.appendChild(im); }
          else a.appendChild(hEl('span', 'ami-hero-ph'));
          b.appendChild(hEl('span', 'ami-hero-it', it.t));
          if (tm) b.appendChild(hEl('span', 'ami-hero-time', tm));
          a.appendChild(b); ul.appendChild(a);
        });
        side.appendChild(ul); hasSide = true;
      }
      root.appendChild(main);
      if (hasSide) root.appendChild(side); else root.className += ' solo';
      heroCss();
      wc.innerHTML = ''; wc.appendChild(root);
      var w = wc.closest && wc.closest('.widget'); if (w && w.classList) w.classList.add('is-visible');
      if (hasSide) pushAds(side);
    });
  }

  /* ---- Tombol WhatsApp melayang dan proteksi salin ----
     Tempel di gadget HTML/JavaScript yang tampil di semua halaman (mis. Footer), dibungkus <div hidden>:
       <div hidden>{getWhatsApp} $number={081234567890} $text={Halo, saya baca [judul] [url]} $greeting={Halo! Ada yang bisa kami bantu?}</div>
       <div hidden>{getProtect} $status={on}</div>
     WhatsApp: $number (wajib), $country (62), $text ([judul] dan [url] diganti otomatis), $label, $greeting, $delay (detik),
       $position (right|left), $bottom (px), $color (#hex), $show (all|home|post), $status (on|off).
     Proteksi: $status (on|off), $scope (article|all), $notice (teks pemberitahuan). Beri class allow-copy pada bagian yang boleh disalin. */
  function findGadget(re) {
    var ws = D.querySelectorAll('.widget-content'), i;
    for (i = 0; i < ws.length; i++) if (re.test(ws[i].textContent || '')) return ws[i];
    return null;
  }
  function isOff(v) { return /^(off|no|0|mati|nonaktif|hide)$/i.test(String(v || '').trim()); }

  function wa() {
    var g = findGadget(/\{getwhatsapp\}/i);
    if (!g) return;
    g.hidden = true;
    var c = hCfg(g.textContent || ''), idn = (D.documentElement.lang || '').toLowerCase().indexOf('id') === 0,
        cc = String(c.country || '62').replace(/\D/g, '') || '62', num = String(c.number || '').replace(/\D/g, ''),
        pos = /^left$/i.test(c.position || '') ? 'left' : 'right', show = String(c.show || 'all').toLowerCase(),
        home = location.pathname === '/', post = !!byId('post-body'), col = /^#[0-9a-f]{3,8}$/i.test(c.color || '') ? c.color : '',
        bottom = hNum(c.bottom, 76, 8, 400), dl = hNum(c.delay, 3, 0, 60), lab = c.label || (idn ? 'Chat WhatsApp' : 'Chat on WhatsApp'),
        key = 'amiWaG1';
    if (isOff(c.status) || !num) return;
    if ((show === 'home' && !home) || (show === 'post' && !post)) return;
    if (num.charAt(0) === '0') num = cc + num.slice(1);
    var txt = c.text || (idn ? 'Halo, saya ingin bertanya.' : 'Hello, I would like to ask.');
    function href() {
      var t = txt.replace(/\[judul\]/gi, D.title || '').replace(/\[url\]/gi, location.href);
      return 'https://wa.me/' + num + '?text=' + encodeURIComponent(t);
    }
    drop('ami-wa-css');
    var st = D.createElement('style'); st.id = 'ami-wa-css';
    st.textContent = '.ami-wa{position:fixed;' + pos + ':max(18px,env(safe-area-inset-' + pos + ',0px));bottom:calc(' + bottom + 'px + env(safe-area-inset-bottom,0px));z-index:99980;display:flex;flex-direction:column;align-items:' + (pos === 'right' ? 'flex-end' : 'flex-start') + ';gap:10px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
      '.ami-wa-btn{position:relative;display:flex;flex-direction:' + (pos === 'right' ? 'row-reverse' : 'row') + ';align-items:center;height:56px;min-width:56px;border-radius:28px;background:linear-gradient(135deg,' + (col || '#2bd36f') + ',' + (col || '#128c7e') + ');color:#fff;text-decoration:none;box-shadow:0 6px 18px rgba(18,140,126,.38),0 2px 6px rgba(0,0,0,.2);transition:transform .2s ease,box-shadow .2s ease}' +
      '.ami-wa-btn:hover,.ami-wa-btn:focus-visible{transform:translateY(-2px);box-shadow:0 10px 24px rgba(18,140,126,.45),0 3px 8px rgba(0,0,0,.22);outline:0}.ami-wa-btn:focus-visible{outline:3px solid rgba(255,255,255,.9);outline-offset:-5px}' +
      '.ami-wa-ic{flex:none;width:56px;height:56px;display:flex;align-items:center;justify-content:center}.ami-wa-ic svg{width:30px;height:30px;fill:#fff}' +
      '.ami-wa-lb{max-width:0;overflow:hidden;white-space:nowrap;font-weight:600;font-size:14.5px;letter-spacing:.01em;transition:max-width .28s ease,padding .28s ease;padding:0}.ami-wa-btn:hover .ami-wa-lb,.ami-wa-btn:focus-visible .ami-wa-lb{max-width:220px;padding:0 4px 0 20px}' +
      '.ami-wa-ring{position:absolute;bottom:0;' + pos + ':0;width:56px;height:56px;border-radius:50%;background:rgba(37,211,102,.5);opacity:0;pointer-events:none;will-change:transform,opacity;animation:amiWaP 2.6s ease-out 3}@keyframes amiWaP{0%{transform:scale(1);opacity:.55}75%,100%{transform:scale(1.7);opacity:0}}.ami-wa-btn{z-index:1}' +
      '.ami-wa-bub{position:relative;max-width:min(260px,calc(100vw - 100px));background:#fff;color:#1f2933;border-radius:14px;padding:12px 34px 12px 14px;font-size:14px;line-height:1.45;box-shadow:0 8px 28px rgba(0,0,0,.18);opacity:0;transform:translateY(8px);transition:opacity .3s ease,transform .3s ease}.ami-wa-bub.on{opacity:1;transform:none}' +
      '.ami-wa-bub:after{content:"";position:absolute;bottom:-6px;' + pos + ':22px;width:12px;height:12px;background:#fff;transform:rotate(45deg);border-radius:2px}' +
      '.ami-wa-x{position:absolute;top:6px;right:6px;width:24px;height:24px;border:0;border-radius:50%;background:transparent;color:#7b8794;font-size:18px;line-height:1;cursor:pointer}.ami-wa-x:hover{background:#eef1f4}' +
      '@media(prefers-reduced-motion:reduce){.ami-wa-btn,.ami-wa-bub,.ami-wa-lb{transition:none}.ami-wa-ring{animation:none}}@media print{.ami-wa{display:none!important}}';
    D.head.appendChild(st);
    var box = D.createElement('div'), a = D.createElement('a'), ic = D.createElement('span'), lb = D.createElement('span');
    box.className = 'ami-wa'; a.className = 'ami-wa-btn'; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.setAttribute('aria-label', lab);
    ic.className = 'ami-wa-ic';
    ic.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';
    lb.className = 'ami-wa-lb'; lb.textContent = lab;
    a.appendChild(ic); a.appendChild(lb); a.href = href();
    ['mouseenter', 'focus', 'touchstart', 'click'].forEach(function (ev) { on(a, ev, function () { a.href = href(); }, ev === 'touchstart' ? { passive: true } : undefined); });
    if (c.greeting) {
      var seen = false; try { seen = W.sessionStorage.getItem(key) === '1'; } catch (e) {}
      if (!seen) later(function () {
        if (gone || D.hidden) return;
        var bub = D.createElement('div'), x = D.createElement('button');
        bub.className = 'ami-wa-bub'; bub.setAttribute('role', 'status'); bub.textContent = c.greeting;
        x.type = 'button'; x.className = 'ami-wa-x'; x.setAttribute('aria-label', idn ? 'Tutup' : 'Close'); x.textContent = '\u00D7';
        x.onclick = function () { try { W.sessionStorage.setItem(key, '1'); } catch (e) {} if (bub.parentNode) bub.parentNode.removeChild(bub); };
        a.addEventListener('click', function () { try { W.sessionStorage.setItem(key, '1'); } catch (e) {} if (bub.parentNode) bub.parentNode.removeChild(bub); });
        bub.appendChild(x); box.insertBefore(bub, a);
        later(function () { bub.className = 'ami-wa-bub on'; }, 30);
      }, dl * 1000);
    }
    var ring = D.createElement('span'); ring.className = 'ami-wa-ring'; box.appendChild(ring);
    box.appendChild(a); D.body.appendChild(box); waSt = box;
  }

  function protect() {
    var g = findGadget(/\{getprotect\}/i);
    if (!g) return;
    g.hidden = true;
    var c = hCfg(g.textContent || ''), idn = (D.documentElement.lang || '').toLowerCase().indexOf('id') === 0;
    if (isOff(c.status)) return;
    var area = /^all$/i.test(c.scope || '') ? 'body' : '#post-body,.post-body,.ami-np-body',
        msg = c.notice || (idn ? 'Konten ini dilindungi dan tidak dapat disalin.' : 'This content is protected and cannot be copied.'), last = 0;
    drop('ami-prot-css');
    var st = D.createElement('style'); st.id = 'ami-prot-css';
    st.textContent = area.split(',').map(function (q) { return q + ',' + q + ' *'; }).join(',') + '{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}' +
      area.split(',').map(function (q) { return q + ' img'; }).join(',') + '{-webkit-user-drag:none}' +
      'input,textarea,select,[contenteditable="true"],.allow-copy,.allow-copy *{-webkit-user-select:text!important;user-select:text!important}' +
      '#ami-prot-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:99995;max-width:calc(100vw - 32px);padding:10px 18px;border-radius:999px;background:rgba(24,28,36,.92);color:#fff;font:500 14px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.28);text-align:center}';
    D.head.appendChild(st);
    prSt = { t: 0 };
    function ok(n) {
      n = n && (n.nodeType === 1 ? n : n.parentElement);
      if (!n || !n.closest) return false;
      if (n.closest('input,textarea,select,[contenteditable="true"],.allow-copy')) return false;
      return !!n.closest(area);
    }
    function hits() {
      var s = W.getSelection && W.getSelection(), els, i;
      if (!s || s.isCollapsed) return false;
      if (ok(s.anchorNode) || ok(s.focusNode)) return true;
      els = D.querySelectorAll(area);
      for (i = 0; i < els.length; i++) { try { if (s.containsNode(els[i], false) && !els[i].closest('.allow-copy')) return true; } catch (e) {} }
      return false;
    }
    function note() {
      var now = Date.now(), t;
      if (now - last < 1500) return; last = now;
      drop('ami-prot-toast');
      t = D.createElement('div'); t.id = 'ami-prot-toast'; t.setAttribute('role', 'status'); t.textContent = msg; D.body.appendChild(t);
      clearTimeout(prSt && prSt.t); if (prSt) prSt.t = setTimeout(function () { drop('ami-prot-toast'); }, 2200);
    }
    function stop(e) { e.preventDefault(); if (e.clipboardData) { try { e.clipboardData.setData('text/plain', ''); } catch (x) {} } note(); }
    on(D, 'copy', function (e) { if (hits() || ok(e.target)) stop(e); }, true);
    on(D, 'cut', function (e) { if (hits() || ok(e.target)) stop(e); }, true);
    on(D, 'contextmenu', function (e) { if (ok(e.target)) { e.preventDefault(); note(); } }, true);
    on(D, 'dragstart', function (e) { if (ok(e.target)) e.preventDefault(); }, true);
  }

  /* ---- Kecepatan dan SEO (opsional, opt-in lewat gadget) ----
     <div hidden>{getSpeed} $status={on} $prefetch={on} $preconnect={on}</div>
       prefetch: halaman artikel yang sedang di-hover atau disentuh diambil lebih dulu (maks. 8 per halaman; dilewati bila Save-Data/2G).
       preconnect: sambungan ke server iklan Google disiapkan lebih awal bila Konfigurasi AdSense terisi.
     <div hidden>{getSeo} $status={on} $alt={on} $links={on} $meta={on} $desc={Deskripsi beranda}</div>
       alt: isi atribut alt gambar artikel yang belum punya (dari keterangan gambar atau judul); alt kosong yang disengaja tidak diubah.
       links: tautan target=_blank diberi rel noopener.
       meta: bila meta description kosong atau kurang dari 50 karakter, diisi dari awal artikel (halaman artikel) atau dari $desc (beranda).
     Tiap opsi dimatikan dengan {off}. */
  function speed() {
    var g = findGadget(/\{getspeed\}/i);
    if (!g) return;
    g.hidden = true;
    var c = hCfg(g.textContent || ''), cn = W.navigator && W.navigator.connection;
    if (isOff(c.status)) return;
    if (!isOff(c.preconnect) && W.AKSARA_ADS && W.AKSARA_ADS.client) {
      ['https://pagead2.googlesyndication.com', 'https://googleads.g.doubleclick.net'].forEach(function (h) {
        var l = D.createElement('link'); l.rel = 'preconnect'; l.href = h; l.setAttribute('data-ami', '1'); D.head.appendChild(l);
      });
    }
    if (isOff(c.prefetch) || (cn && (cn.saveData || /(^|-)2g$/.test(cn.effectiveType || '')))) return;
    var seen = {}, count = 0, timer = 0,
        spec = !!(W.HTMLScriptElement && W.HTMLScriptElement.supports && W.HTMLScriptElement.supports('speculationrules'));
    function target(e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null, u;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return '';
      try { u = new URL(a.href, location.href); } catch (x) { return ''; }
      if (u.origin !== location.origin || u.search || u.hash || u.pathname === location.pathname) return '';
      if (/^\/(search|feeds|b)(\/|$)/.test(u.pathname) || /\.(pdf|zip|rar|xml|jpe?g|png|webp|gif)$/i.test(u.pathname)) return '';
      return u.href;
    }
    function fetchIt(h) {
      if (gone || !h || seen[h] || count >= 8) return;
      seen[h] = 1; count++;
      var n;
      if (spec) { n = D.createElement('script'); n.type = 'speculationrules'; n.textContent = JSON.stringify({ prefetch: [{ urls: [h] }] }); }
      else { n = D.createElement('link'); n.rel = 'prefetch'; n.href = h; n.as = 'document'; }
      n.setAttribute('data-ami', '1'); D.head.appendChild(n);
    }
    on(D, 'mouseover', function (e) { var h = target(e); clearTimeout(timer); if (h) timer = setTimeout(function () { fetchIt(h); }, 120); }, { passive: true });
    on(D, 'mouseout', function () { clearTimeout(timer); }, { passive: true });
    on(D, 'touchstart', function (e) { fetchIt(target(e)); }, { passive: true });
  }

  function seo() {
    var g = findGadget(/\{getseo\}/i);
    if (!g) return;
    g.hidden = true;
    var c = hCfg(g.textContent || '');
    if (isOff(c.status)) return;
    var imgs = D.querySelectorAll('#post-body img, .post-body img'), home = location.pathname === '/', pb = byId('post-body');
    if (!isOff(c.alt) && imgs.length) {
      var h1 = D.querySelector('h1.entry-title, h1.post-title, h1'), base = ((h1 && h1.textContent) || D.title || '').replace(/\s+/g, ' ').trim();
      [].forEach.call(imgs, function (im, i) {
        if (im.hasAttribute('alt')) return;
        var box = im.closest('figure,table.tr-caption-container'), cp = box && box.querySelector('figcaption,.tr-caption'),
            t = (cp && cp.textContent.replace(/\s+/g, ' ').trim()) || im.getAttribute('title') || (base ? base + (imgs.length > 1 ? ' - ' + (i + 1) : '') : '');
        if (t) im.setAttribute('alt', t.slice(0, 125));
      });
    }
    if (!isOff(c.links)) {
      [].forEach.call(D.querySelectorAll('a[target="_blank"]'), function (a) {
        var r = (a.getAttribute('rel') || '').toLowerCase();
        if (r.indexOf('noopener') < 0) a.setAttribute('rel', (r ? r + ' ' : '') + 'noopener');
      });
    }
    if (!isOff(c.meta)) {
      var md = D.querySelector('meta[name="description"]'), cur = md ? (md.getAttribute('content') || '').trim() : '', txt = '';
      if (cur.length < 50) {
        if (pb) txt = (pb.textContent || '').replace(/\s+/g, ' ').trim();
        else if (home && c.desc) txt = c.desc;
        if (txt.length >= 50) {
          if (txt.length > 155) txt = txt.slice(0, 155).replace(/\s+\S*$/, '') + '\u2026';
          if (!md) { md = D.createElement('meta'); md.setAttribute('name', 'description'); D.head.appendChild(md); }
          md.setAttribute('content', txt);
          ['meta[property="og:description"]', 'meta[name="twitter:description"]'].forEach(function (q) {
            var m = D.querySelector(q);
            if (m && (m.getAttribute('content') || '').trim().length < 50) m.setAttribute('content', txt);
          });
        }
      }
    }
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
