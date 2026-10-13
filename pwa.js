/* PWA SMP IT Al Mubarok: pendaftaran service worker + tombol "Pasang Aplikasi".
 * Android/Chrome: memakai prompt bawaan browser. iPhone/Safari: menampilkan petunjuk "Tambah ke Layar Utama". */
(function () {
  'use strict';
  var KUNCI_TUNDA = 'pwa_tunda_sampai';
  var HARI_TUNDA = 7;
  var promptTertunda = null;

  function sudahTerpasang() {
    try {
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
             window.navigator.standalone === true;
    } catch (e) { return false; }
  }
  function isIOS() {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function dalamIframe() { try { return window.self !== window.top; } catch (e) { return true; } }
  function sedangDitunda() {
    try { return Date.now() < parseInt(localStorage.getItem(KUNCI_TUNDA) || '0', 10); } catch (e) { return false; }
  }
  function tundaBanner() {
    try { localStorage.setItem(KUNCI_TUNDA, String(Date.now() + HARI_TUNDA * 86400000)); } catch (e) {}
  }

  // 1) Service worker
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !dalamIframe()) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  if (sudahTerpasang() || dalamIframe()) return;

  // 2) Gaya banner (CSS mandiri, tidak bergantung tailwind.css)
  var css = document.createElement('style');
  css.textContent =
    '#pwa-banner{position:fixed;left:50%;bottom:88px;transform:translate(-50%,16px);width:94%;max-width:440px;z-index:9997;' +
    'display:none;align-items:center;gap:12px;background:#1f287d;color:#fff;border-radius:20px;padding:12px 14px;' +
    'box-shadow:0 12px 32px rgba(15,23,42,.35);opacity:0;transition:opacity .25s ease,transform .25s ease;font-family:inherit}' +
    '#pwa-banner.tampil{display:flex;opacity:1;transform:translate(-50%,0)}' +
    '#pwa-banner img{width:44px;height:44px;border-radius:12px;background:#fff;object-fit:contain;padding:3px;flex-shrink:0}' +
    '#pwa-banner .pwa-teks{flex:1;min-width:0;line-height:1.25}' +
    '#pwa-banner .pwa-judul{font-weight:800;font-size:13px}' +
    '#pwa-banner .pwa-sub{font-size:11px;opacity:.8;margin-top:2px}' +
    '#pwa-banner button{border:0;cursor:pointer;font-family:inherit}' +
    '#pwa-banner .pwa-pasang{background:#fff;color:#1f287d;font-weight:800;font-size:12px;border-radius:999px;padding:9px 16px;flex-shrink:0}' +
    '#pwa-banner .pwa-tutup{background:transparent;color:#fff;opacity:.7;font-size:22px;line-height:1;padding:4px 6px;flex-shrink:0}' +
    '.pwa-tombol-footer{display:inline-flex;align-items:center;gap:8px;margin-top:14px;background:rgba(255,255,255,.12);' +
    'color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:9px 18px;font-size:12px;font-weight:700;cursor:pointer}' +
    '.pwa-tombol-footer:hover{background:rgba(255,255,255,.22)}';
  document.head.appendChild(css);

  function bangunBanner() {
    if (document.getElementById('pwa-banner')) return;
    var el = document.createElement('div');
    el.id = 'pwa-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Pasang aplikasi SMP IT Al Mubarok');
    el.innerHTML =
      '<img src="/logo.png" alt="">' +
      '<div class="pwa-teks"><div class="pwa-judul">Pasang Aplikasi Sekolah</div>' +
      '<div class="pwa-sub">Akses cepat dari layar utama HP Anda</div></div>' +
      '<button type="button" class="pwa-pasang">Pasang</button>' +
      '<button type="button" class="pwa-tutup" aria-label="Tutup">&times;</button>';
    document.body.appendChild(el);
    el.querySelector('.pwa-pasang').addEventListener('click', window.pasangAplikasi);
    el.querySelector('.pwa-tutup').addEventListener('click', function () { tundaBanner(); sembunyiBanner(); });
  }
  function tampilBanner() {
    if (sudahTerpasang() || sedangDitunda()) return;
    if (document.body.classList.contains('splash-aktif')) { setTimeout(tampilBanner, 1500); return; }
    bangunBanner();
    var el = document.getElementById('pwa-banner');
    if (el) requestAnimationFrame(function () { el.classList.add('tampil'); });
  }
  function sembunyiBanner() {
    var el = document.getElementById('pwa-banner');
    if (el) el.classList.remove('tampil');
  }

  function petunjukIOS() {
    var html =
      '<div style="text-align:left;font-size:14px;line-height:1.7">' +
      '<p style="margin:0 0 8px">Di iPhone/iPad, pasang lewat <b>Safari</b>:</p>' +
      '<ol style="margin:0;padding-left:20px">' +
      '<li>Ketuk tombol <b>Bagikan</b> (ikon kotak dengan panah ke atas) di bagian bawah layar.</li>' +
      '<li>Gulir, pilih <b>Tambah ke Layar Utama</b>.</li>' +
      '<li>Ketuk <b>Tambah</b>.</li></ol></div>';
    if (window.Swal) Swal.fire({ title: 'Pasang Aplikasi', html: html, confirmButtonText: 'Mengerti', confirmButtonColor: '#1f287d' });
    else alert('Di Safari: ketuk tombol Bagikan, lalu pilih "Tambah ke Layar Utama".');
  }
  function petunjukUmum() {
    var teks = 'Buka menu browser (titik tiga di kanan atas), lalu pilih "Pasang aplikasi" atau "Tambahkan ke Layar utama".';
    if (window.Swal) Swal.fire({ title: 'Pasang Aplikasi', text: teks, confirmButtonText: 'Mengerti', confirmButtonColor: '#1f287d' });
    else alert(teks);
  }

  // Dipanggil dari banner maupun tombol di footer
  window.pasangAplikasi = function () {
    if (sudahTerpasang()) return;
    if (promptTertunda) {
      var p = promptTertunda;
      promptTertunda = null;
      p.prompt();
      p.userChoice.then(function (h) { if (h && h.outcome === 'dismissed') tundaBanner(); }).catch(function () {});
      sembunyiBanner();
    } else if (isIOS()) {
      petunjukIOS();
    } else {
      petunjukUmum();
    }
  };

  // 3) Tombol tetap di footer (selalu tersedia walau banner ditutup)
  function pasangTombolFooter() {
    if (document.getElementById('pwa-footer-btn')) return;
    var kolom = document.querySelector('#footer-social');
    var tujuan = kolom && kolom.parentNode;
    if (!tujuan) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'pwa-footer-btn';
    b.className = 'pwa-tombol-footer';
    b.innerHTML = '<i class="fas fa-mobile-screen-button"></i> Pasang Aplikasi di HP';
    b.addEventListener('click', window.pasangAplikasi);
    tujuan.appendChild(b);
  }

  // 4) Android / Chrome / Edge
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    promptTertunda = e;
    setTimeout(tampilBanner, 4000);
  });
  window.addEventListener('appinstalled', function () {
    promptTertunda = null;
    sembunyiBanner();
    var f = document.getElementById('pwa-footer-btn');
    if (f) f.remove();
  });

  function mulai() {
    pasangTombolFooter();
    // iPhone tidak punya beforeinstallprompt -> tampilkan banner petunjuk sendiri
    if (isIOS()) setTimeout(tampilBanner, 6000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
  else mulai();
})();
