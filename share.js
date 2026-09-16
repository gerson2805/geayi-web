/* 📤 Compartir GEAYI en redes sociales — Facebook, Instagram, WhatsApp, TikTok.
   - En Android usa el menú nativo (navigator.share): ahí salen WhatsApp, TikTok, Instagram, Facebook, etc.
   - Si el navegador no lo soporta, botones directos: WhatsApp y Facebook por URL,
     Instagram y TikTok copiando el enlace (no tienen URL pública para compartir).
   Todo original GEAYI. Sin dependencias. */
(function () {
  'use strict';

  function shareText() {
    return '🎮 ¡Juega GEAYI: Obby Xtreme 3D! 🌍 Explora, construye y vive en tu ciudad 🏙️';
  }
  function shareUrl() {
    try { return location.href.split('#')[0]; } catch (e) { return 'https://geayi.games'; }
  }
  function click() { try { if (typeof Audio2 !== 'undefined' && Audio2.click) Audio2.click(); } catch (e) {} }

  function injectCss() {
    if (document.getElementById('share-css')) return;
    const s = document.createElement('style');
    s.id = 'share-css';
    s.textContent =
      '#share-ov{position:fixed;inset:0;background:rgba(5,8,25,.72);z-index:99960;display:flex;align-items:center;justify-content:center;padding:18px}' +
      '.share-card{background:linear-gradient(160deg,#1b2140,#10142c);border:2px solid #ffb300;border-radius:20px;max-width:380px;width:100%;padding:20px;text-align:center;color:#fff;box-shadow:0 10px 40px rgba(0,0,0,.6)}' +
      '.share-card h2{margin:0 0 4px;font-size:22px}' +
      '.share-card p{margin:0 0 14px;color:#aab4d8;font-size:14px}' +
      '.share-btn{display:flex;align-items:center;gap:12px;width:100%;margin:8px 0;padding:14px;border:none;border-radius:14px;font-size:17px;font-weight:bold;color:#fff;cursor:pointer;text-align:left}' +
      '.share-btn .e{font-size:26px}' +
      '.share-wa{background:#1faa53}.share-fb{background:#1877f2}.share-ig{background:linear-gradient(45deg,#f58529,#dd2a7b,#8134af)}.share-tt{background:#111}.share-tt{border:1px solid #444}.share-sys{background:#3949ab}' +
      '.share-close{margin-top:10px;background:#2a2f55;color:#fff;border:none;border-radius:12px;padding:12px 22px;font-size:16px;font-weight:bold;cursor:pointer}';
    document.head.appendChild(s);
  }

  function toast(msg) {
    try {
      if (typeof window.toast === 'function') { window.toast(msg); return; }
    } catch (e) {}
    try {
      const d = document.createElement('div');
      d.textContent = msg;
      d.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#222a55;color:#fff;padding:12px 18px;border-radius:12px;z-index:99999;font-size:15px;border:2px solid #ffb300';
      document.body.appendChild(d);
      setTimeout(() => { try { d.remove(); } catch (e) {} }, 2200);
    } catch (e) {}
  }

  function copyLink() {
    const url = shareUrl();
    const done = () => toast('📋 ¡Enlace copiado! Pégalo en Instagram o TikTok 🎵');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText() + ' ' + url).then(done, () => fallbackCopy(url, done));
      } else fallbackCopy(url, done);
    } catch (e) { fallbackCopy(url, done); }
  }
  function fallbackCopy(url, done) {
    try {
      const ta = document.createElement('textarea');
      ta.value = shareText() + ' ' + url;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove(); done();
    } catch (e) { toast('Copia este enlace: ' + url); }
  }

  function nativeShare() {
    const data = { title: 'GEAYI: Obby Xtreme 3D', text: shareText(), url: shareUrl() };
    try {
      if (navigator.share) { navigator.share(data).catch(() => {}); return true; }
    } catch (e) {}
    return false;
  }

  function openPanel() {
    click();
    injectCss();
    closePanel();
    const ov = document.createElement('div');
    ov.id = 'share-ov';
    const canNative = !!(navigator.share);
    ov.innerHTML =
      '<div class="share-card"><h2>📤 Compartir GEAYI</h2>' +
      '<p>Invita a tus amigos a jugar 🌍</p>' +
      (canNative ? '<button class="share-btn share-sys" id="sh-sys"><span class="e">📱</span> Compartir… <small style="font-weight:normal">(WhatsApp, TikTok, Instagram…)</small></button>' : '') +
      '<button class="share-btn share-wa" id="sh-wa"><span class="e">💬</span> WhatsApp</button>' +
      '<button class="share-btn share-fb" id="sh-fb"><span class="e">📘</span> Facebook</button>' +
      '<button class="share-btn share-ig" id="sh-ig"><span class="e">📸</span> Instagram <small style="font-weight:normal">(copiar enlace)</small></button>' +
      '<button class="share-btn share-tt" id="sh-tt"><span class="e">🎵</span> TikTok <small style="font-weight:normal">(copiar enlace)</small></button>' +
      '<button class="share-close" id="sh-x">✕ Cerrar</button></div>';
    document.body.appendChild(ov);
    const q = id => document.getElementById(id);
    if (canNative) q('sh-sys').addEventListener('click', () => { click(); nativeShare(); });
    q('sh-wa').addEventListener('click', () => {
      click();
      window.open('https://wa.me/?text=' + encodeURIComponent(shareText() + ' ' + shareUrl()), '_blank');
    });
    q('sh-fb').addEventListener('click', () => {
      click();
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl()) + '&quote=' + encodeURIComponent(shareText()), '_blank');
    });
    q('sh-ig').addEventListener('click', () => { click(); copyLink(); });
    q('sh-tt').addEventListener('click', () => { click(); copyLink(); });
    q('sh-x').addEventListener('click', () => { click(); closePanel(); });
    ov.addEventListener('click', e => { if (e.target === ov) closePanel(); });
  }
  function closePanel() {
    try { const o = document.getElementById('share-ov'); if (o) o.remove(); } catch (e) {}
  }

  window.ShareButtons = {
    init() {
      try {
        const b = document.getElementById('btn-share');
        if (b && !b._sh) { b._sh = true; b.addEventListener('click', openPanel); }
      } catch (e) {}
    },
    open: openPanel
  };
})();
