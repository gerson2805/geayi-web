/* ============================================================================
   promos.js — CÓDIGOS PROMOCIONALES "GEAYI — Obby Xtreme 3D"
   Todo original GEAYI. Sin pagos reales (demo). No pide contraseñas ni datos.

   Módulo global: Promos
   Scripts planos, sin módulos: todo global. UI en español (+inglés básico),
   botones grandes táctiles (≥52px), DOM liviano para Android.

   QUÉ HACE:
   1. Códigos de DESCUENTO (% off) creados por el admin: se aplican en la
      tienda premium antes de "Pagar" y el precio mostrado se reduce.
   2. Códigos de MONEDAS GRATIS con límite de usos y fecha de expiración:
      al canjear, el jugador recibe las monedas vía Shop2.addCoins().
   3. Anti-doble canje: SAVE.redeemedPromos guarda los ids ya canjeados.
   4. Panel ADMIN dentro del juego: 5 toques en el logo del menú revelan la
      opción "Admin" (respaldo: botón ⚙️ discreto). Pide la clave de acceso:
      se compara con FAMILY_CODE (monetiza.js) y NUNCA se muestra en la UI.
      SAVE.famCode===true cuenta como "ya autenticado" en la sesión.
      Crear código (tipo, valor, límite, expiración), lista con usados/límite,
      activar/desactivar y borrar.
   5. Persistencia local (SAVE.promoCodes + persist()) y sincronización
      opcional a Supabase (sb() de online.js, tabla "promo_codes"):
      offline-first, con try/catch; si falla, todo sigue funcionando local.

   INTEGRACIÓN:
   1. index.html: <script src="promos.js"></script> DESPUÉS de monetiza.js
      y ANTES de game.js.
   2. En boot() (game.js): if (typeof Promos !== 'undefined') Promos.init();
   3. No edita monetiza.js: inyecta el campo de descuento/canje en la tienda
      envolviendo Shop2.open / Shop2.payFlow con guards typeof (monkey-patch
      seguro). El flujo "Activar con código"/"Pagar" existente no cambia.

   SEGURIDAD: FAMILY_CODE solo se compara en Promos.adminLogin(). Jamás se
   muestra en textos, diálogos, toasts ni consola del juego.
   ========================================================================== */
'use strict';

/* ---------------- i18n ---------------- */
try {
  if (typeof addStrings === 'function') {
    addStrings('es', {
      'promo.discountPh': '🎟️ Código de descuento',
      'promo.apply': 'Aplicar',
      'promo.redeemPh': '🎁 Canjear código',
      'promo.redeem': 'Canjear',
      'promo.remove': 'Quitar',
      'promo.discOk': '🎟️ ¡Descuento aplicado!',
      'promo.bad': '❌ Código no válido.',
      'promo.off': '⚠️ Ese código está desactivado.',
      'promo.expired': '⌛ Ese código ya expiró.',
      'promo.limit': '🚫 Ese código ya se usó todas las veces.',
      'promo.used': '⚠️ Ya canjeaste ese código.',
      'promo.needLogin': '🔐 Solo usuarios registrados pueden usar códigos. Toca 🌐 MULTIJUGADOR para crear tu cuenta.',
      'promo.notDiscount': '⚠️ Ese código no es de descuento.',
      'promo.notCoins': '⚠️ Ese código no es de monedas.',
      'promo.coinsOk': '🎁 ¡Monedas recibidas!',
      'promo.admin': '⚙️ Admin',
      'promo.adminTitle': '⚙️ Admin — Códigos promo',
      'promo.keyTitle': '🔐 Clave de acceso',
      'promo.keyPh': 'Escribe la clave',
      'promo.keyBad': '❌ Clave incorrecta.',
      'promo.newCode': '➕ Crear código',
      'promo.fCode': 'Código',
      'promo.fType': 'Tipo',
      'promo.tDisc': '🎟️ Descuento %',
      'promo.tCoins': '🪙 Monedas',
      'promo.fValue': 'Valor',
      'promo.fLimit': 'Límite de usos',
      'promo.fDays': 'Expira en (días, 0 = nunca)',
      'promo.create': 'Crear',
      'promo.gen': '🎲',
      'promo.on': 'Activar',
      'promo.offBtn': 'Desactivar',
      'promo.del': '🗑️ Borrar',
      'promo.delAsk': '¿Borrar el código',
      'promo.created': '✅ Código creado.',
      'promo.deleted': '🗑️ Código borrado.',
      'promo.active': 'Activo',
      'promo.inactive': 'Desactivado',
      'promo.never': 'nunca',
      'promo.uses': 'usos',
      'promo.close': 'Cerrar',
      'promo.list': '📋 Códigos',
    });
    addStrings('en', {
      'promo.discountPh': '🎟️ Discount code',
      'promo.apply': 'Apply',
      'promo.redeemPh': '🎁 Redeem code',
      'promo.redeem': 'Redeem',
      'promo.remove': 'Remove',
      'promo.discOk': '🎟️ Discount applied!',
      'promo.bad': '❌ Invalid code.',
      'promo.off': '⚠️ That code is disabled.',
      'promo.expired': '⌛ That code has expired.',
      'promo.limit': '🚫 That code reached its use limit.',
      'promo.used': '⚠️ You already redeemed that code.',
      'promo.needLogin': '🔐 Only registered users can use codes. Tap 🌐 MULTIPLAYER to create your account.',
      'promo.notDiscount': '⚠️ That is not a discount code.',
      'promo.notCoins': '⚠️ That is not a coins code.',
      'promo.coinsOk': '🎁 Coins received!',
      'promo.admin': '⚙️ Admin',
      'promo.adminTitle': '⚙️ Admin — Promo codes',
      'promo.keyTitle': '🔐 Access key',
      'promo.keyPh': 'Type the key',
      'promo.keyBad': '❌ Wrong key.',
      'promo.close': 'Close',
    });
  }
} catch (e) {}

/* Códigos de ejemplo precargados (se pueden desactivar desde el panel). */
const PROMO_SEEDS = [
  { id: 'BIENVENIDO10', type: 'descuento', value: 10, limit: 500, used: 0, expiresAt: 0, active: true },
  { id: 'AMIGOS500', type: 'monedas', value: 500, limit: 100, used: 0, expiresAt: Date.now() + 30 * 86400000, active: true },
];

const Promos = {
  _inited: false,
  _adminAuth: false,      // clave correcta en esta sesión
  activeDiscount: 0,      // % de descuento vigente en la tienda (sesión)
  activeDiscountId: null,

  /* ---------------- persistencia ---------------- */
  ensureSave() {
    try {
      if (!Array.isArray(SAVE.promoCodes)) {
        SAVE.promoCodes = PROMO_SEEDS.map(c => Object.assign({}, c));
        persist();
      }
      if (!Array.isArray(SAVE.redeemedPromos)) { SAVE.redeemedPromos = []; persist(); }
    } catch (e) {}
  },

  norm(raw) { return String(raw == null ? '' : raw).trim().toUpperCase().replace(/\s+/g, ''); },
  get(id) {
    try {
      const n = this.norm(id);
      return (SAVE.promoCodes || []).find(c => c.id === n) || null;
    } catch (e) { return null; }
  },
  list() {
    try { return (SAVE.promoCodes || []).map(c => Object.assign({}, c)); } catch (e) { return []; }
  },

  /* ---------------- crear / editar / borrar (admin) ---------------- */
  createCode(o) {
    this.ensureSave();
    try {
      const id = this.norm(o && o.id);
      const type = (o && o.type) === 'monedas' ? 'monedas' : 'descuento';
      const value = Math.round(Number(o && o.value) || 0);
      const limit = Math.round(Number(o && o.limit) || 0);
      const days = Number(o && o.days) || 0;
      if (!/^[A-Z0-9][A-Z0-9\-_]{1,23}$/.test(id))
        return { ok: false, msg: '❌ El código debe tener 2-24 caracteres (letras, números, - _).' };
      if (this.get(id)) return { ok: false, msg: '⚠️ Ese código ya existe.' };
      if (type === 'descuento' && (value < 1 || value > 90))
        return { ok: false, msg: '❌ El descuento debe ser de 1 a 90%.' };
      if (type === 'monedas' && (value < 1 || value > 100000))
        return { ok: false, msg: '❌ Las monedas deben ser de 1 a 100000.' };
      if (limit < 1 || limit > 1000000)
        return { ok: false, msg: '❌ El límite de usos debe ser de 1 en adelante.' };
      if (days < 0 || days > 3650)
        return { ok: false, msg: '❌ Los días deben ser de 0 a 3650.' };
      SAVE.promoCodes.push({
        id, type, value, limit, used: 0,
        expiresAt: days > 0 ? Date.now() + days * 86400000 : 0,
        active: true, createdAt: Date.now()
      });
      persist();
      this.sync();
      try { toast(T('promo.created')); } catch (e) {}
      return { ok: true, id };
    } catch (e) { return { ok: false, msg: '❌ No se pudo crear.' }; }
  },
  setActive(id, on) {
    try {
      const c = this.get(id);
      if (!c) return false;
      c.active = !!on;
      persist();
      this.sync();
      return true;
    } catch (e) { return false; }
  },
  deleteCode(id) {
    try {
      const n = this.norm(id);
      const arr = SAVE.promoCodes || [];
      const i = arr.findIndex(c => c.id === n);
      if (i < 0) return false;
      arr.splice(i, 1);
      persist();
      this.sync();
      return true;
    } catch (e) { return false; }
  },

  /* ---------------- validación común ---------------- */
  /* ¿hay usuario registrado con sesión? */
  _sesion() {
    try { if (typeof Net !== 'undefined' && Net && Net.me) return Net.me; } catch (e) {}
    return null;
  },
  /* códigos ya canjeados por ESTA CUENTA (viven en su perfil online, valen en cualquier dispositivo) */
  async _metaCanjeados() {
    try {
      if (typeof sb !== 'function') return [];
      const client = sb();
      if (!client) return [];
      const { data } = await client.auth.getUser();
      const arr = data && data.user && data.user.user_metadata && data.user.user_metadata.redeemedPromos;
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  },
  async _marcarCanjeadoMeta(id) {
    try {
      if (typeof sb !== 'function') return false;
      const client = sb();
      if (!client) return false;
      const ya = await this._metaCanjeados();
      if (ya.indexOf(id) < 0) ya.push(id);
      const { error } = await client.auth.updateUser({ data: { redeemedPromos: ya } });
      return !error;
    } catch (e) { return false; }
  },
  _check(raw) {
    const c = this.get(raw);
    if (!c) return { ok: false, msg: T('promo.bad') };
    if (!this._sesion()) return { ok: false, msg: T('promo.needLogin'), needLogin: true };
    if (!c.active) return { ok: false, msg: T('promo.off') };
    if (c.expiresAt && Date.now() > c.expiresAt) return { ok: false, msg: T('promo.expired') };
    if (c.used >= c.limit) return { ok: false, msg: T('promo.limit') };
    try {
      if ((SAVE.redeemedPromos || []).indexOf(c.id) >= 0) return { ok: false, msg: T('promo.used') };
    } catch (e) {}
    return { ok: true, code: c };
  },

  /* ---------------- descuento en tienda ---------------- */
  async applyDiscount(raw) {
    const r = this._check(raw);
    if (!r.ok) return r;
    if (r.code.type !== 'descuento') return { ok: false, msg: T('promo.notDiscount') };
    /* una sola vez por cuenta (revisado en su perfil online) */
    try {
      const meta = await this._metaCanjeados();
      if (meta.indexOf(r.code.id) >= 0) return { ok: false, msg: T('promo.used') };
      await this._marcarCanjeadoMeta(r.code.id);
    } catch (e) {}
    this.activeDiscount = r.code.value;
    this.activeDiscountId = r.code.id;
    try { toast(T('promo.discOk') + ' −' + r.code.value + '%'); } catch (e) {}
    return { ok: true, pct: r.code.value, msg: T('promo.discOk') };
  },
  clearDiscount() { this.activeDiscount = 0; this.activeDiscountId = null; },
  /* '$2.99' + 10 → '$2.69' (conserva el símbolo que traiga el precio). */
  discountedPrice(priceStr, pct) {
    try {
      const s = String(priceStr == null ? '' : priceStr);
      const m = s.match(/(\d+(?:[.,]\d+)?)/);
      if (!m) return s;
      const v = parseFloat(m[1].replace(',', '.'));
      const d = Math.max(0, v * (1 - pct / 100));
      const sym = s.slice(0, m.index);
      return sym + d.toFixed(2);
    } catch (e) { return String(priceStr); }
  },
  /* consume un uso del descuento al concretar la compra (lo llama el wrapper). */
  _consumeDiscountUse() {
    try {
      const c = this.activeDiscountId ? this.get(this.activeDiscountId) : null;
      if (c) { c.used = Math.min(c.limit, c.used + 1); persist(); this.sync(); }
    } catch (e) {}
    this.clearDiscount();
  },

  /* ---------------- canje de monedas ---------------- */
  async redeemCoins(raw) {
    this.ensureSave();
    const r = this._check(raw);
    if (!r.ok) return r;
    if (r.code.type !== 'monedas') return { ok: false, msg: T('promo.notCoins') };
    /* una sola vez por cuenta (revisado en su perfil online) */
    try {
      const meta = await this._metaCanjeados();
      if (meta.indexOf(r.code.id) >= 0) return { ok: false, msg: T('promo.used') };
    } catch (e) {}
    try {
      await this._marcarCanjeadoMeta(r.code.id);
      r.code.used = Math.min(r.code.limit, r.code.used + 1);
      SAVE.redeemedPromos.push(r.code.id);
      persist();
      let coins = 0;
      if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.addCoins === 'function')
        coins = Shop2.addCoins(r.code.value);
      else { SAVE.coins = (SAVE.coins || 0) + r.code.value; persist(); }
      this.sync();
      try { toast('🎁 +' + r.code.value + ' 🪙 ' + T('promo.coinsOk')); } catch (e) {}
      return { ok: true, coins: r.code.value, total: coins, msg: T('promo.coinsOk') };
    } catch (e) { return { ok: false, msg: '❌ No se pudo canjear.' }; }
  },

  /* ---------------- acceso admin ---------------- */
  /* Compara con FAMILY_CODE (monetiza.js). NUNCA se muestra en la UI. */
  adminLogin(raw) {
    try {
      const k = String(raw == null ? '' : raw).trim();
      if (k && typeof FAMILY_CODE !== 'undefined' && k === FAMILY_CODE) {
        this._adminAuth = true;
        try { SAVE.famCode = true; persist(); } catch (e) {}
        return true;
      }
    } catch (e) {}
    return false;
  },
  adminLogout() { this._adminAuth = false; },
  isAdmin() {
    try { return this._adminAuth || (typeof SAVE !== 'undefined' && SAVE.famCode === true); }
    catch (e) { return this._adminAuth; }
  },

  /* ---------------- sincronización Supabase (opcional, offline-first) ---------------- */
  /* Solo si sb() de online.js devuelve cliente e internet. try/catch: si falla,
     todo sigue funcionando con localStorage. Sin timers ni reintentos. */
  sync() {
    try {
      if (typeof sb !== 'function') return;
      const client = sb();
      if (!client) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      const rows = (SAVE.promoCodes || []).map(c => ({
        id: c.id, type: c.type, value: c.value, limit: c.limit, used: c.used,
        expires_at: c.expiresAt || null, active: !!c.active,
        updated_at: new Date().toISOString()
      }));
      const p = client.from('promo_codes').upsert(rows, { onConflict: 'id' });
      if (p && typeof p.then === 'function') p.then(function () {}, function () {});
    } catch (e) {}
  },

  /* ================================================================== */
  /* ARRANQUE                                                            */
  /* ================================================================== */
  init() {
    if (this._inited) return;
    this._inited = true;
    this.ensureSave();
    this._wrapShop();
    if (typeof document === 'undefined') return;
    try {
      if (!document.getElementById('promo-css')) {
        const st = document.createElement('style');
        st.id = 'promo-css';
        st.textContent =
          '.promo-strip{background:#0a0e24;border:1px solid #7b2fff;border-radius:14px;padding:10px;margin:0 12px 8px}' +
          '.promo-row{display:flex;gap:8px;margin:6px 0}' +
          '.promo-inp{flex:1;font-size:16px;padding:12px;border-radius:12px;border:2px solid #3949ab;background:#141a36;color:#fff;min-height:52px;text-transform:uppercase}' +
          '.promo-msg{text-align:center;font-size:14px;font-weight:bold;min-height:20px;margin:2px 0}' +
          '.promo-msg.ok{color:#00e676}.promo-msg.bad{color:#ff5f6e}' +
          '.promo-toggle{background:#1a2150;border:1px solid #7b2fff;color:#fff;border-radius:10px;font-size:18px;padding:6px 10px;min-height:40px}' +
          '.promo-toggle span{font-size:12px;color:#00e676;font-weight:bold}' +
          '.promo-btn{border:none;border-radius:12px;padding:12px 14px;font-size:15px;font-weight:bold;cursor:pointer;min-height:52px}' +
          '.promo-btn-apply{background:linear-gradient(135deg,#7b2fff,#00a2ff);color:#fff;min-width:96px}' +
          '.promo-btn-ghost{background:#2b2f4a;color:#ffe95e;border:2px solid #ffe95e}' +
          '.promo-btn-on{background:#00e676;color:#06281a}' +
          '.promo-btn-off{background:#ff3b5c;color:#fff}' +
          '.promo-btn:active{transform:scale(.96)}' +
          '.promo-gear{position:fixed;right:10px;bottom:10px;z-index:9000;background:#141a36cc;border:1px solid #3949ab;color:#aab;border-radius:14px;font-size:20px;min-width:52px;min-height:52px;opacity:.55;cursor:pointer}' +
          '.promo-adminbtn{display:none;margin:8px auto;min-width:200px}' +
          '.promo-adminbtn.show{display:block}' +
          '.promo-ov{position:fixed;inset:0;z-index:9995;display:flex;align-items:center;justify-content:center;background:rgba(5,1,15,.85);padding:12px}' +
          '.promo-card{background:#141a36;border:2px solid #7b2fff;border-radius:18px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column;color:#fff;box-shadow:0 0 30px #7b2fff55}' +
          '.promo-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #3949ab}' +
          '.promo-head h2{margin:0;font-size:19px;flex:1}' +
          '.promo-body{padding:12px;overflow-y:auto}' +
          '.promo-form{background:#1a2040;border:2px solid #3949ab;border-radius:14px;padding:12px;margin-bottom:12px}' +
          '.promo-form label{display:block;font-size:14px;font-weight:bold;margin:10px 0 4px;color:#cdd}' +
          '.promo-form input,.promo-form select{width:100%;box-sizing:border-box;font-size:16px;padding:12px;border-radius:12px;border:2px solid #3949ab;background:#0a0e24;color:#fff;min-height:52px}' +
          '.promo-typerow{display:flex;gap:8px}' +
          '.promo-typerow .promo-btn{flex:1;margin-top:0}' +
          '.promo-typerow .sel{outline:3px solid #ffe95e}' +
          '.promo-code-row{background:#1a2040;border:2px solid #3949ab;border-radius:14px;padding:10px;margin-bottom:8px}' +
          '.promo-code-row.off{opacity:.55;border-color:#555}' +
          '.promo-code-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
          '.promo-code-id{font-weight:bold;font-size:17px;flex:1}' +
          '.promo-badge{font-size:12px;font-weight:bold;border-radius:8px;padding:4px 8px}' +
          '.promo-badge.disc{background:#7b2fff;color:#fff}.promo-badge.coins{background:#ffd23f;color:#201100}' +
          '.promo-code-sub{font-size:13px;color:#aab;margin:4px 0 8px}' +
          '.promo-code-btns{display:flex;gap:8px}' +
          '.promo-code-btns .promo-btn{flex:1;margin-top:0;font-size:14px}';
        document.head.appendChild(st);
      }
      this._installAdminAccess();
    } catch (e) {}
  },

  /* ---- acceso discreto: 5 toques en el logo + respaldo ⚙️ ---- */
  _installAdminAccess() {
    try {
      const menu = document.getElementById('screen-menu');
      if (!menu) return;
      // 1) 5 toques en el logo del juego revelan la opción "Admin"
      const logo = menu.querySelector('.game-title') || menu.querySelector('h1');
      if (logo && !logo.__promosAdmin) {
        logo.__promosAdmin = true;
        try { logo.style.cursor = 'pointer'; } catch (e) {}
        let taps = 0, last = 0;
        logo.addEventListener('click', () => {
          const n = Date.now();
          if (n - last > 2500) taps = 0;
          last = n; taps++;
          if (taps >= 5) {
            taps = 0;
            const b = document.getElementById('btn-promo-admin');
            if (b) { b.classList.add('show'); try { toast('⚙️ Admin'); } catch (e) {} }
          }
        });
      }
      // opción "Admin" (oculta hasta los 5 toques)
      const inner = menu.querySelector('.menu-inner') || menu;
      if (!document.getElementById('btn-promo-admin')) {
        const b = document.createElement('button');
        b.id = 'btn-promo-admin';
        b.className = 'btn btn-small promo-adminbtn';
        b.textContent = T('promo.admin');
        b.setAttribute('aria-label', 'Admin');
        b.addEventListener('click', () => Promos._requestAdmin());
        try { inner.appendChild(b); } catch (e) {}
      }
      // 2) respaldo: botón ⚙️ pequeño y discreto (siempre visible)
      if (!document.getElementById('btn-promo-gear')) {
        const g = document.createElement('button');
        g.id = 'btn-promo-gear';
        g.className = 'promo-gear';
        g.textContent = '⚙️';
        g.setAttribute('aria-label', 'Admin');
        g.addEventListener('click', () => Promos._requestAdmin());
        try { document.body.appendChild(g); } catch (e) {}
      }
    } catch (e) {}
  },
  _requestAdmin() {
    try {
      if (this.isAdmin()) { this._openPanel(); return; }
      this._keyDialog();
    } catch (e) {}
  },
  /* Diálogo de clave: input tipo password, la clave NUNCA se muestra. */
  _keyDialog() {
    if (typeof document === 'undefined') return;
    try {
      const ov = document.createElement('div');
      ov.className = 'promo-ov';
      ov.innerHTML = '<div class="promo-card" style="max-width:380px">' +
        '<div class="promo-head"><h2>' + T('promo.keyTitle') + '</h2></div>' +
        '<div class="promo-body">' +
        '<input id="promo-key-inp" class="promo-inp" style="width:100%;box-sizing:border-box;text-transform:none" type="password" placeholder="' + T('promo.keyPh') + '" autocomplete="off">' +
        '<div id="promo-key-msg" class="promo-msg"></div>' +
        '<div style="display:flex;gap:8px">' +
        '<button id="promo-key-ok" class="promo-btn promo-btn-on" style="flex:1">OK</button>' +
        '<button id="promo-key-no" class="promo-btn promo-btn-ghost" style="flex:1">' + T('promo.close') + '</button>' +
        '</div></div></div>';
      const close = () => { try { ov.parentNode.removeChild(ov); } catch (e) {} };
      const go = () => {
        const inp = document.getElementById('promo-key-inp');
        const v = inp ? inp.value : '';
        if (Promos.adminLogin(v)) { close(); Promos._openPanel(); }
        else {
          const m = document.getElementById('promo-key-msg');
          if (m) { m.textContent = T('promo.keyBad'); m.className = 'promo-msg bad'; }
          if (inp) inp.value = '';
        }
      };
      document.body.appendChild(ov);
      const okB = document.getElementById('promo-key-ok');
      const noB = document.getElementById('promo-key-no');
      const inp = document.getElementById('promo-key-inp');
      if (okB) okB.addEventListener('click', go);
      if (noB) noB.addEventListener('click', close);
      if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      if (inp) setTimeout(() => { try { inp.focus(); } catch (e) {} }, 60);
    } catch (e) {}
  },

  /* ---------------- panel admin ---------------- */
  _openPanel() {
    if (typeof document === 'undefined') return;
    try {
      let ov = document.getElementById('promo-admin-ov');
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
      ov = document.createElement('div');
      ov.id = 'promo-admin-ov';
      ov.className = 'promo-ov';
      ov.innerHTML = '<div class="promo-card">' +
        '<div class="promo-head"><h2>' + T('promo.adminTitle') + '</h2>' +
        '<button id="promo-admin-x" class="promo-btn promo-btn-off" style="min-width:52px" aria-label="' + T('promo.close') + '">✕</button></div>' +
        '<div class="promo-body" id="promo-admin-body"></div></div>';
      document.body.appendChild(ov);
      document.getElementById('promo-admin-x').addEventListener('click', () => {
        try { ov.parentNode.removeChild(ov); } catch (e) {}
      });
      this._renderPanel();
    } catch (e) {}
  },
  _renderPanel() {
    try {
      const body = document.getElementById('promo-admin-body');
      if (!body) return;
      body.innerHTML = '';
      // ---- formulario crear ----
      const f = document.createElement('div');
      f.className = 'promo-form';
      f.innerHTML = '<div style="font-weight:bold;font-size:16px;margin-bottom:4px">' + T('promo.newCode') + '</div>' +
        '<label>' + T('promo.fCode') + '</label>' +
        '<div class="promo-row"><input id="promo-f-id" class="promo-inp" style="text-transform:uppercase" maxlength="24" placeholder="GEAYI20" autocomplete="off">' +
        '<button id="promo-f-gen" class="promo-btn promo-btn-ghost" title="Generar">' + T('promo.gen') + '</button></div>' +
        '<label>' + T('promo.fType') + '</label>' +
        '<div class="promo-typerow"><button id="promo-f-tdisc" class="promo-btn promo-btn-ghost sel">' + T('promo.tDisc') + '</button>' +
        '<button id="promo-f-tcoins" class="promo-btn promo-btn-ghost">' + T('promo.tCoins') + '</button></div>' +
        '<label id="promo-f-vlabel">' + T('promo.fValue') + ' (%)</label>' +
        '<input id="promo-f-value" class="promo-inp" style="text-transform:none" type="number" inputmode="numeric" min="1" value="10">' +
        '<label>' + T('promo.fLimit') + '</label>' +
        '<input id="promo-f-limit" class="promo-inp" style="text-transform:none" type="number" inputmode="numeric" min="1" value="100">' +
        '<label>' + T('promo.fDays') + '</label>' +
        '<input id="promo-f-days" class="promo-inp" style="text-transform:none" type="number" inputmode="numeric" min="0" value="30">' +
        '<button id="promo-f-create" class="promo-btn promo-btn-apply" style="width:100%;margin-top:12px">' + T('promo.create') + '</button>';
      body.appendChild(f);
      let ftype = 'descuento';
      const bD = f.querySelector('#promo-f-tdisc'), bC = f.querySelector('#promo-f-tcoins');
      const vlab = f.querySelector('#promo-f-vlabel'), vinp = f.querySelector('#promo-f-value');
      const setType = t => {
        ftype = t;
        if (bD) bD.classList.toggle('sel', t === 'descuento');
        if (bC) bC.classList.toggle('sel', t === 'monedas');
        if (vlab) vlab.textContent = T('promo.fValue') + (t === 'descuento' ? ' (%)' : ' (🪙)');
        if (vinp) vinp.value = t === 'descuento' ? '10' : '500';
      };
      if (bD) bD.addEventListener('click', () => setType('descuento'));
      if (bC) bC.addEventListener('click', () => setType('monedas'));
      const gen = f.querySelector('#promo-f-gen'), idInp = f.querySelector('#promo-f-id');
      if (gen) gen.addEventListener('click', () => {
        const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let s = 'GEAYI';
        for (let i = 0; i < 4; i++) s += abc[Math.floor(Math.random() * abc.length)];
        if (idInp) idInp.value = s;
      });
      const cr = f.querySelector('#promo-f-create');
      if (cr) cr.addEventListener('click', () => {
        const r = Promos.createCode({
          id: idInp ? idInp.value : '',
          type: ftype,
          value: vinp ? vinp.value : 0,
          limit: f.querySelector('#promo-f-limit') ? f.querySelector('#promo-f-limit').value : 0,
          days: f.querySelector('#promo-f-days') ? f.querySelector('#promo-f-days').value : 0
        });
        if (!r.ok) { try { toast(r.msg); } catch (e) {} return; }
        Promos._renderPanel();
      });
      // ---- lista ----
      const lt = document.createElement('div');
      lt.innerHTML = '<div style="font-weight:bold;font-size:16px;margin:6px 0 10px">' + T('promo.list') + '</div>';
      body.appendChild(lt);
      const codes = this.list().slice().reverse(); /* los nuevos primero */
      if (!codes.length) {
        const e = document.createElement('div');
        e.className = 'promo-code-sub';
        e.textContent = '—';
        body.appendChild(e);
      }
      codes.forEach(c => {
        const row = document.createElement('div');
        row.className = 'promo-code-row' + (c.active ? '' : ' off');
        const exp = c.expiresAt
          ? (Date.now() > c.expiresAt ? '⌛ ' : '') + new Date(c.expiresAt).toLocaleDateString()
          : T('promo.never');
        const badge = c.type === 'descuento'
          ? '<span class="promo-badge disc">−' + c.value + '%</span>'
          : '<span class="promo-badge coins">+' + c.value + ' 🪙</span>';
        const st = document.createElement('div');
        st.innerHTML = '<div class="promo-code-top"><span class="promo-code-id">' + c.id + '</span>' + badge + '</div>' +
          '<div class="promo-code-sub">📊 ' + c.used + '/' + c.limit + ' ' + T('promo.uses') +
          ' · ⏳ ' + exp + ' · ' + (c.active ? '✅ ' + T('promo.active') : '⛔ ' + T('promo.inactive')) + '</div>';
        const btns = document.createElement('div');
        btns.className = 'promo-code-btns';
        const bT = document.createElement('button');
        bT.className = 'promo-btn ' + (c.active ? 'promo-btn-off' : 'promo-btn-on');
        bT.textContent = c.active ? T('promo.offBtn') : T('promo.on');
        bT.addEventListener('click', () => { Promos.setActive(c.id, !c.active); Promos._renderPanel(); });
        const bDel = document.createElement('button');
        bDel.className = 'promo-btn promo-btn-ghost';
        bDel.textContent = T('promo.del');
        bDel.addEventListener('click', () => {
          let okDel = true;
          try { if (typeof confirm === 'function') okDel = confirm(T('promo.delAsk') + ' ' + c.id + '?'); } catch (e) {}
          if (okDel) {
            Promos.deleteCode(c.id);
            try { toast(T('promo.deleted')); } catch (e) {}
            Promos._renderPanel();
          }
        });
        btns.appendChild(bT); btns.appendChild(bDel);
        row.appendChild(st); row.appendChild(btns);
        body.appendChild(row);
      });
    } catch (e) {}
  },

  /* ================================================================== */
  /* INTEGRACIÓN CON LA TIENDA (monkey-patch seguro, no edita monetiza.js) */
  /* ================================================================== */
  _wrapShop() {
    try {
      if (typeof Shop2 === 'undefined' || !Shop2 || Shop2.__promos) return;
      Shop2.__promos = true;
      // 1) al abrir la tienda, inyectar la tira de descuento + canje
      const origOpen = Shop2.open;
      if (typeof origOpen === 'function') {
        Shop2.open = function () {
          const r = origOpen.call(this);
          try { Promos._afterShopOpen(); } catch (e) {}
          return r;
        };
      }
      // 2) al pagar, mostrar el precio con descuento y consumir el uso al comprar
      const origPay = Shop2.payFlow;
      if (typeof origPay === 'function') {
        Shop2.payFlow = function (kind, item, onDone) {
          const d = Promos.activeDiscount;
          if (d > 0 && item && item.price) {
            const np = Promos.discountedPrice(item.price, d);
            const item2 = Object.assign({}, item, { price: np + ' 🎟️−' + d + '%' });
            return origPay.call(this, kind, item2, function () {
              Promos._consumeDiscountUse(); // consume 1 uso + limpia el descuento
              if (typeof onDone === 'function') onDone();
            });
          }
          return origPay.call(this, kind, item, onDone);
        };
      }
    } catch (e) {}
  },
  /* Tira "🎟️ descuento + 🎁 canje" dentro de la tarjeta de la tienda. */
  _afterShopOpen() {
    try {
      if (typeof document === 'undefined') return;
      const ov = document.getElementById('shop2-ov');
      if (!ov || document.getElementById('promo-strip')) return;
      const card = ov.querySelector('.shop2-card');
      const tabs = document.getElementById('shop2-tabs');
      if (!card) return;
      const strip = document.createElement('div');
      strip.id = 'promo-strip';
      strip.className = 'promo-strip';
      strip.style.display = 'none'; // 🎟️ empieza oculta: se abre con el botón aparte
      strip.innerHTML =
        '<div class="promo-row"><input id="promo-disc-inp" class="promo-inp" maxlength="24" placeholder="' + T('promo.discountPh') + '" autocomplete="off">' +
        '<button id="promo-disc-btn" class="promo-btn promo-btn-apply">' + T('promo.apply') + '</button></div>' +
        '<div id="promo-disc-msg" class="promo-msg"></div>' +
        '<div class="promo-row"><input id="promo-coin-inp" class="promo-inp" maxlength="24" placeholder="' + T('promo.redeemPh') + '" autocomplete="off">' +
        '<button id="promo-coin-btn" class="promo-btn promo-btn-apply">' + T('promo.redeem') + '</button></div>' +
        '<div id="promo-coin-msg" class="promo-msg"></div>';
      if (tabs && card.insertBefore) { try { card.insertBefore(strip, tabs); } catch (e) { card.appendChild(strip); } }
      else { try { card.appendChild(strip); } catch (e) {} }
      const say = (id, okk, msg) => {
        const m = document.getElementById(id);
        if (m) { m.textContent = msg; m.className = 'promo-msg ' + (okk ? 'ok' : 'bad'); }
      };
      const dBtn = document.getElementById('promo-disc-btn');
      const dInp = document.getElementById('promo-disc-inp');
      if (dBtn) dBtn.addEventListener('click', async () => {
        const r = await Promos.applyDiscount(dInp ? dInp.value : '');
        say('promo-disc-msg', r.ok, r.ok ? r.msg + ' −' + r.pct + '%' : r.msg);
        if (r.ok) { const tg = document.getElementById('promo-toggle'); if (tg) tg.innerHTML = '🎟️<span> −' + r.pct + '%</span>'; }
        if (dInp) dInp.value = '';
      });
      const cBtn = document.getElementById('promo-coin-btn');
      const cInp = document.getElementById('promo-coin-inp');
      if (cBtn) cBtn.addEventListener('click', async () => {
        const r = await Promos.redeemCoins(cInp ? cInp.value : '');
        say('promo-coin-msg', r.ok, r.ok ? '🎁 +' + r.coins + ' 🪙' : r.msg);
        if (cInp) cInp.value = '';
      });
      // al cerrar la tienda se limpia el descuento vigente
      const x = document.getElementById('shop2-x');
      // 🎟️ botón aparte para los códigos (descuento + canje): abre/cierra la tira
      try {
        const head = ov.querySelector('.shop2-head');
        if (head && x && !document.getElementById('promo-toggle')) {
          const tg = document.createElement('button');
          tg.id = 'promo-toggle';
          tg.className = 'promo-toggle';
          tg.setAttribute('aria-label', 'Códigos de descuento');
          tg.innerHTML = '🎟️' + (this.activeDiscount > 0 ? '<span> −' + this.activeDiscount + '%</span>' : '');
          tg.addEventListener('click', () => {
            const s = document.getElementById('promo-strip');
            if (s) s.style.display = (s.style.display === 'none' ? '' : 'none');
          });
          head.insertBefore(tg, x);
        }
      } catch (e) {}
      if (x && !x.__promos) {
        x.__promos = true;
        x.addEventListener('click', () => Promos.clearDiscount());
      }
      // muestra el descuento si ya había uno activo
      if (this.activeDiscount > 0)
        say('promo-disc-msg', true, T('promo.discOk') + ' −' + this.activeDiscount + '%');
    } catch (e) {}
  },
};

/* exponer global */
try {
  if (typeof globalThis !== 'undefined') globalThis.Promos = Promos;
  if (typeof window !== 'undefined') window.Promos = Promos;
} catch (e) {}
