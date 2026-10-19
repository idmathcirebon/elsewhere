/*! ami-update 1.0.0 | min_xml_version 6.1.0
 *  Modul pertama untuk sistem pembaruan AMI.
 *  Fungsi: memberi tahu pembaca beranda bahwa ada artikel baru tanpa harus menutup dan membuka lagi.
 *
 *  ATURAN MODUL (wajib): aman dieksekusi dua kali.
 *  Ketika nomor versi berganti saat halaman masih terbuka, loader memasang <script> baru dan
 *  berkas ini dijalankan ulang. Karena itu:
 *   1. eksekusi sebelumnya di-dispose dulu lewat registri window.AMI_MODS[NAME];
 *   2. semua timer dan listener dicatat agar bisa dilepas;
 *   3. elemen DOM dan <style> memakai id tetap, dihapus sebelum dibuat ulang;
 *   4. tidak ada state global lain selain registri tersebut.
 */
(function (W, D) {
  'use strict';
  var NAME = 'ami-update', VER = '1.0.0', POLL = 180000;
  var REG = W.AMI_MODS = W.AMI_MODS || {};

  // (1) bersihkan eksekusi sebelumnya
  if (REG[NAME] && typeof REG[NAME].dispose === 'function') {
    try { REG[NAME].dispose(); } catch (e) {}
  }

  var timers = [], offs = [], gone = 0, seen = '', last = 0, first = 1;

  function on(t, ev, fn, o) {
    t.addEventListener(ev, fn, o);
    offs.push(function () { t.removeEventListener(ev, fn, o); });
  }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function byId(id) { return D.getElementById(id); }
  function drop(id) { var n = byId(id); if (n && n.parentNode) n.parentNode.removeChild(n); }

  function dispose() {
    gone = 1;
    timers.forEach(clearTimeout); timers = [];
    offs.forEach(function (f) { f(); }); offs = [];
    drop('ami-upd-toast'); drop('ami-upd-css');
    if (REG[NAME] && REG[NAME].dispose === dispose) delete REG[NAME];
  }
  REG[NAME] = { version: VER, dispose: dispose };

  // Hanya beranda polos. Halaman label/pencarian/artikel tidak diperiksa (menghindari false positive).
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
      location.reload();
    };
    x.onclick = function () { drop('ami-upd-toast'); };
    t.appendChild(m); t.appendChild(go); t.appendChild(x);
    D.body.appendChild(t);
  }

  function path(u) { return String(u || '').split('?')[0].split('#')[0].replace(/^https?:\/\/[^\/]+/, ''); }

  function inList(p) {
    var as = D.querySelectorAll('#main .index-post a[href]');
    for (var i = 0; i < as.length; i++) if (path(as[i].getAttribute('href')) === p) return true;
    return false;
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
        var hasList = D.querySelector('#main .index-post');
        // Pengecekan pertama: bandingkan dengan daftar artikel di halaman (HTML bisa basi).
        // Pengecekan berikutnya: cukup lihat apakah artikel terbaru berubah.
        if (first ? (hasList && !inList(p)) : true) toast(e.title && e.title.$t);
        seen = p; first = 0;
      })
      .catch(function () {});
  }

  function loop() { if (gone) return; check(); later(loop, POLL); }
  on(D, 'visibilitychange', function () { if (!D.hidden && Date.now() - last > 60000) check(); });
  later(loop, 4000);
})(window, document);
