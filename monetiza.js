/* ============================================================================
   monetiza.js — MONETIZACIÓN "GEAYI — Obby Xtreme 3D"
   Modelo aprobado por el dueño: MUNDOS Y NIVELES ABIERTOS PARA TODOS.
   El premium son solo LUJOS (ropa, vehículos, mascotas, pases). Nada que
   afecte el avance del juego se vende: todo se puede jugar gratis.

   Módulos globales: Shop2 (tienda), Billing (pagos), Ads (anuncios).
   Scripts planos, sin módulos: todo global. UI en español, botones grandes
   táctiles, DOM liviano (nada de canvas pesados) para Android.

   REGLAS DURAS que cumple este archivo:
   - 100% ORIGINAL: nombres propios, diseños de bloques propios, nada de
     marcas reales ni personajes copiados.
   - NO ejecuta DOM al cargar: solo define cosas. Todo el DOM se crea en
     Shop2.init() / Shop2.open().
   - SEGURIDAD: el código familiar vive en FAMILY_CODE y NUNCA se muestra
     en ninguna interfaz ni texto del juego. Solo se compara internamente.

   INTEGRACIÓN (ver reporte del subagente):
   1. index.html: <script src="monetiza.js"></script> DESPUÉS de player.js,
      vehicles.js, pets.js y world.js (usa setAvatarHat, builders de
      vehículos, petId/Pets y canvasTex).
   2. En el arranque (boot): Shop2.init().
   3. Shop2.init() agrega solo el botón "🪙" al side-menu y hace clicable
      el chip de monedas del HUD; no toca ningún archivo existente.
   4. Vehículos premium en mundos: donde world.js usa addCar()/addBike(),
      el padre puede llamar Shop2.addPremiumVehicleToLevel(lvl, id, x, y, z,
      true) cuando SAVE.ownedVehicles incluya el id.
   5. Multiplicador VIP: donde el juego otorgue monedas, multiplicar por
      Shop2.mult() (1.1 con el Pase VIP permanente; 2 con el VIP temporal
      anterior). Mostrar monedas con Shop2.coinsText() para que salga "∞"
      con código familiar.
   6. Pase Constructor: en el modo construir, usar bmMax() (buildmode.js),
      que suma Shop2.blockBonus() (+200 con el pase) al tope de 400.
   7. Pase de Vuelo: Shop2.canFly(); en player.js flyTick() + botones 🕊️/⬇️.
      Insignia corona VIP: Shop2.attachCrown(avatar) en _wrapAvatarHat().
   8. Compras: TODO en modo DEMO (Billing.buy = recibo demo, sin red de
      pagos) + PIN parental OBLIGATORIO vía Shop2._withPin() antes de
      confirmar cualquier compra. Etiqueta grande DEMO en cada diálogo.
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------ */
/* 0. Código familiar — INTERNO, NUNCA SE MUESTRA EN LA UI             */
/* ------------------------------------------------------------------ */
// ⚠️ Este valor solo se usa en la comparación de Shop2.redeemCode().
// No lo pongas en ningún texto, diálogo, toast, etiqueta ni consola
// visible del juego. La UI solo dice "Código" de forma genérica.
const FAMILY_CODE = '@uruapan16';

/* ---------------- i18n (UI en español; inglés básico) --------------- */
try {
  if (typeof addStrings === 'function') {
    addStrings('es', {
      'shop2.title': '🛍️ Tienda GEAYI',
      'shop2.coins': 'Monedas',
      'shop2.outfits': 'Ropa',
      'shop2.vehicles': 'Vehículos',
      'shop2.pets': 'Mascotas',
      'shop2.passes': 'Pases',
      'shop2.code': 'Código',
      'shop2.weapons': 'Juguetes',
      'shop2.close': 'Cerrar',
      'shop2.demo': 'DEMO',
      'shop2.buy': 'Comprar',
      'shop2.pay': '💳 Pagar',
      'shop2.redeem': '🔑 Activar con código',
      'shop2.confirm': 'Confirmar',
      'shop2.cancel': 'Cancelar',
      'shop2.codePh': 'Escribe tu código',
      'shop2.codeOk': '✅ ¡Código aceptado! Todo desbloqueado.',
      'shop2.codeBad': '❌ Código no válido.',
      'shop2.owned': '✅ Tuyo',
      'shop2.equip': 'Poner',
      'shop2.equipped': '✅ Puesto',
      'shop2.unequip': 'Quitar',
      'shop2.ad': '📺 Ver anuncio (+50 🪙)',
      'shop2.adTitle': '📺 ANUNCIO (demo)',
      'shop2.adWait': 'Anuncio demo… cierra en',
      'shop2.adDone': '✅ +50 🪙 ¡Gracias por verlo!',
      'shop2.vipOn': '👑 VIP activo',
      'shop2.inf': '∞',
    });
    addStrings('en', {
      'shop2.title': '🛍️ GEAYI Shop',
      'shop2.close': 'Close',
      'shop2.weapons': 'Toys',
      'shop2.demo': 'DEMO',
      'shop2.buy': 'Buy',
      'shop2.pay': '💳 Pay',
      'shop2.redeem': '🔑 Redeem code',
      'shop2.confirm': 'Confirm',
      'shop2.cancel': 'Cancel',
      'shop2.codePh': 'Type your code',
      'shop2.codeOk': '✅ Code accepted! Everything unlocked.',
      'shop2.codeBad': '❌ Invalid code.',
      'shop2.owned': '✅ Yours',
      'shop2.equip': 'Wear',
      'shop2.equipped': '✅ On',
      'shop2.unequip': 'Remove',
      'shop2.ad': '📺 Watch ad (+50 🪙)',
      'shop2.adDone': '✅ +50 🪙 Thanks for watching!',
    });
  }
} catch (e) {}

/* ------------------------------------------------------------------ */
/* 1. Billing — interfaz lista para Google Play Billing (futura)       */
/* ------------------------------------------------------------------ */
/* CÓMO INTEGRAR GOOGLE PLAY BILLING (cuando la app sea nativa/TWA):
   1. En Android usa la Play Billing Library (getBuyIntent / launchBillingFlow).
   2. Cambia Billing.mode a 'play' y reimplementa Billing.buy(sku) para que
      llame al puente nativo, p. ej.:
        Billing.buy = async (sku) => {
          const res = await AndroidBridge.buySku(sku); // tu WebView bridge
          return { ok: res.ok, sku, token: res.purchaseToken, demo: false };
        };
   3. Verifica la compra en tu servidor (Google Play Developer API) antes de
      entregar el producto. En DEMO no hay servidor: se entrega directo.
   4. Los skus deben existir en Google Play Console con el MISMO id.
*/
const Billing = {
  mode: 'demo', // 'demo' | 'play'
  /* Compra simulada: diálogo de confirmación propio + entrega inmediata.
     Devuelve una "recibo" marcado como demo. */
  async buy(sku) {
    await new Promise(res => setTimeout(res, 600)); // latencia simulada
    try { console.log('[Billing DEMO] compra simulada:', sku); } catch (e) {}
    return { ok: true, sku: sku, demo: true, ts: Date.now() };
  },
  /* Llamado tras confirmar el pago: desbloquea el producto en SAVE. */
  deliver(kind, id) {
    try {
      Shop2.ensureSave();
      if (kind === 'outfit' && !SAVE.ownedOutfits.includes(id)) SAVE.ownedOutfits.push(id);
      if (kind === 'vehicle' && !SAVE.ownedVehicles.includes(id)) SAVE.ownedVehicles.push(id);
      if (kind === 'pet' && !SAVE.ownedPets.includes(id)) SAVE.ownedPets.push(id);
      if (kind === 'weapon') { try { if (typeof Weapons !== 'undefined') Weapons.grant(id); } catch (e) {} }
      if (kind === 'vip') SAVE.vipUntil = Date.now() + 7 * 24 * 3600 * 1000;
      if (kind === 'builder') SAVE.builderPass = true;
      if (kind === 'pass' && PREMIUM_PASSES.some(p => p.id === id)) SAVE.passes[id] = true; // 🎫 pase permanente
      persist();
    } catch (e) {}
  }
};

/* ------------------------------------------------------------------ */
/* 2. Ads — interfaz lista para AdMob (futura)                         */
/* ------------------------------------------------------------------ */
/* CÓMO INTEGRAR ADMOB (cuando la app sea nativa/TWA):
   1. Crea un bloque de "anuncio recompensado" en AdMob.
   2. Reimplementa Ads.watch(cb) para pedir el anuncio al puente nativo:
        Ads.watch = (cb) => AndroidBridge.showRewardedAd((seen) => cb(!!seen));
   3. Solo entrega la recompensa si el callback confirma vista completa.
   En DEMO se muestra un temporizador de 5 s con mensaje "anuncio demo".
*/
const Ads = {
  mode: 'demo', // 'demo' | 'admob'
  /* Muestra el "anuncio" y luego llama cb(true). */
  watch(cb) {
    const done = (seen) => { try { cb(!!seen); } catch (e) {} };
    if (typeof document === 'undefined') { done(true); return; }
    try {
      const ov = document.createElement('div');
      ov.className = 'shop2-adov';
      let left = 5;
      ov.innerHTML = '<div class="shop2-adcard">' +
        '<div class="shop2-adbadge">' + T('shop2.adTitle') + ' · ' + T('shop2.demo') + '</div>' +
        '<div class="shop2-admsg">' + T('shop2.adWait') + ' <b id="shop2-adt">' + left + '</b>s</div>' +
        '</div>';
      document.body.appendChild(ov);
      const tick = () => {
        left--;
        const el = document.getElementById('shop2-adt');
        if (el) el.textContent = left;
        if (left <= 0) {
          try { ov.parentNode.removeChild(ov); } catch (e) {}
          done(true);
        } else setTimeout(tick, 1000);
      };
      setTimeout(tick, 1000);
    } catch (e) { done(true); }
  }
};

/* ------------------------------------------------------------------ */
/* 3. Catálogos premium — TODO DISEÑO ORIGINAL GEAYI                   */
/* ------------------------------------------------------------------ */
const COIN_PACKS = [
  { sku: 'geayi_coins_500',   coins: 500,   price: '$0.99', cents: 99 },
  { sku: 'geayi_coins_1200',  coins: 1200,  price: '$1.99', cents: 199 },
  { sku: 'geayi_coins_3000',  coins: 3000,  price: '$4.99', cents: 499 },
  { sku: 'geayi_coins_10000', coins: 10000, price: '$9.99', cents: 999 },
];

/* Ropa exclusiva (se dibuja sobre el avatar con bloques propios).
   priceCoins no se usa en la UI actual (activar con código o pagar),
   pero queda para un futuro "comprar con monedas". */
const PREMIUM_OUTFITS = [
  { id: 'out_neon',    slot: 'torso', emoji: '🧥', name: 'Chaqueta Neón',        price: '$0.99', priceCoins: 350, sku: 'geayi_outfit_neon' },
  { id: 'out_vaquero', slot: 'hat',   emoji: '🤠', name: 'Sombrero Vaquero GEAYI', price: '$0.99', priceCoins: 400, sku: 'geayi_outfit_vaquero' },
  { id: 'out_caramelo',slot: 'torso', emoji: '🍬', name: 'Playera Caramelo',     price: '$0.99', priceCoins: 300, sku: 'geayi_outfit_caramelo' },
  { id: 'out_botas',   slot: 'feet',  emoji: '🥾', name: 'Botas Geayi',          price: '$0.99', priceCoins: 280, sku: 'geayi_outfit_botas' },
  { id: 'out_rayo',    slot: 'hat',   emoji: '⚡', name: 'Gorra Relámpago',      price: '$0.99', priceCoins: 320, sku: 'geayi_outfit_rayo' },
  { id: 'out_arco',    slot: 'neck',  emoji: '🌈', name: 'Bufanda Arcoíris',     price: '$0.99', priceCoins: 260, sku: 'geayi_outfit_arco' },
];
/* Parte del cuerpo de cada prenda: se pueden combinar (sombrero+chaqueta+botas+bufanda). */
const OUTFIT_SLOT = {};
PREMIUM_OUTFITS.forEach(o => { OUTFIT_SLOT[o.id] = o.slot || 'hat'; });
const SLOT_LABEL = { hat: '🤠 Cabeza', torso: '🧥 Torso', feet: '🥾 Pies', neck: '🌈 Cuello' };

const PREMIUM_VEHICLES = [
  { id: 'veh_monstruo', emoji: '🛻', name: 'Troca Monstruo',  price: '$2.99', kind: 'car',  sku: 'geayi_vehicle_monstruo' },
  { id: 'veh_rayo',     emoji: '🏎️', name: 'Deportivo Rayo', price: '$2.99', kind: 'car',  sku: 'geayi_vehicle_rayo' },
  { id: 'veh_chopper',  emoji: '🏍️', name: 'Moto Chopper',   price: '$1.99', kind: 'bike', sku: 'geayi_vehicle_chopper' },
];

const PREMIUM_PETS = [
  { id: 'pet_dragon', emoji: '🐲', name: 'Dragón Mini', price: '$1.99', sku: 'geayi_pet_dragon' },
  { id: 'pet_uni',    emoji: '🦄', name: 'Unicornio',   price: '$1.99', sku: 'geayi_pet_uni' },
  { id: 'pet_robo',   emoji: '🤖', name: 'Robotito',    price: '$1.99', sku: 'geayi_pet_robo' },
];

/* 🎫 PASES DE JUEGO: compra única, perks PERMANENTES (SAVE.passes).
   Todo en modo DEMO: no se cobra dinero real. */
const PREMIUM_PASSES = [
  { id: 'vip',         emoji: '👑', name: 'Pase VIP',         desc: 'Insignia corona + 10% monedas extra por siempre', price: '$4.99', cents: 499, sku: 'geayi_pass_vip' },
  { id: 'fly',         emoji: '🕊️', name: 'Pase de Vuelo',     desc: 'Vuela por los mundos cuando quieras',             price: '$2.99', cents: 299, sku: 'geayi_pass_fly' },
  { id: 'constructor', emoji: '🧱', name: 'Pase Constructor', desc: '+200 bloques en Construir + agente más rápido',    price: '$3.99', cents: 399, sku: 'geayi_pass_constructor' },
];

/* ------------------------------------------------------------------ */
/* 4. Shop2 — tienda, códigos, monedas                                 */
/* ------------------------------------------------------------------ */
const Shop2 = {
  _inited: false,

  /* ---- estado ---- */
  ensureSave() {
    try {
      if (!Array.isArray(SAVE.ownedOutfits)) SAVE.ownedOutfits = [];
      if (!Array.isArray(SAVE.ownedVehicles)) SAVE.ownedVehicles = [];
      if (!Array.isArray(SAVE.ownedPets)) SAVE.ownedPets = [];
      if (typeof SAVE.vipUntil !== 'number') SAVE.vipUntil = 0;
      if (typeof SAVE.builderPass !== 'boolean') SAVE.builderPass = false;
      if (!SAVE.passes || typeof SAVE.passes !== 'object') SAVE.passes = {}; // 🎫 pases permanentes: {vip, fly, constructor}
      if (typeof SAVE.famCode !== 'boolean') SAVE.famCode = false;
      if (typeof SAVE.coinsInf !== 'boolean') SAVE.coinsInf = false;
      if (!SAVE.outfits || typeof SAVE.outfits !== 'object') SAVE.outfits = {};
      // migración: si el sombrero guardado era una prenda premium de otra parte, consérvala en su parte
      try {
        if (typeof SAVE.hat === 'string' && OUTFIT_SLOT[SAVE.hat] && OUTFIT_SLOT[SAVE.hat] !== 'hat')
          SAVE.outfits[OUTFIT_SLOT[SAVE.hat]] = SAVE.hat;
      } catch (e) {}
    } catch (e) {}
  },

  /* ---- monedas ---- */
  hasInfinite() { try { return !!SAVE.coinsInf; } catch (e) { return false; } },
  coinsText() { try { return SAVE.coinsInf ? '∞' : String(SAVE.coins || 0); } catch (e) { return '0'; } },
  vipActive() { try { return Date.now() < (SAVE.vipUntil || 0); } catch (e) { return false; } },
  hasPass(id) { // 🎫 pase permanente (usa hasOwnProperty: 'constructor' es heredado de Object!)
    try {
      this.ensureSave();
      const p = SAVE.passes || {};
      return Object.prototype.hasOwnProperty.call(p, id) && !!p[id];
    } catch (e) { return false; }
  },
  canFly() { return this.hasPass('fly'); }, // 🕊️ Pase de Vuelo
  mult() {
    try { if (Date.now() < (SAVE.vipUntil || 0)) return 2; } catch (e) {}      // VIP temporal anterior
    try { if (this.hasPass('vip')) return 1.1; } catch (e) {}                  // 👑 Pase VIP permanente: +10%
    return 1;
  },
  blockBonus() {
    let b = 0;
    try { if (SAVE.builderPass) b += 150; } catch (e) {}                          // pase anterior
    try { if (this.hasPass('constructor')) b += 200; } catch (e) {}               // 🧱 Pase Constructor
    return b;
  },
  addCoins(n) {
    try {
      this.ensureSave();
      if (SAVE.coinsInf) { this.refreshCoinLabels(); return SAVE.coins; }
      SAVE.coins = (SAVE.coins || 0) + Math.round(n * this.mult());
      persist();
      this.refreshCoinLabels();
      return SAVE.coins;
    } catch (e) { return 0; }
  },
  spendCoins(n) {
    try {
      this.ensureSave();
      if (SAVE.coinsInf) return true; // infinitas: no descuenta
      if ((SAVE.coins || 0) < n) return false;
      SAVE.coins -= n;
      persist();
      this.refreshCoinLabels();
      return true;
    } catch (e) { return false; }
  },
  refreshCoinLabels() {
    try {
      const t = this.coinsText();
      ['menu-coins', 'custom-coins', 'hud-coins', 'shop2-coins'].forEach(id => {
        const el = $(id);
        if (el) el.textContent = t;
      });
    } catch (e) {}
  },

  /* 🕊️ muestra/oculta los botones de vuelo según el Pase de Vuelo (llamado cada cuadro) */
  refreshFlyBtns() {
    try {
      if (typeof document === 'undefined') return;
      if (!this._flyBtns) { // caché: no buscar en el DOM cada cuadro
        const bf = document.getElementById('btn-fly');
        const bd = document.getElementById('btn-flydown');
        if (!bf || !bd) return;
        this._flyBtns = { bf: bf, bd: bd };
      }
      const bf = this._flyBtns.bf, bd = this._flyBtns.bd;
      const driving = (typeof Vehicle !== 'undefined' && Vehicle && Vehicle.mode !== 'none');
      const show = this.canFly() && (typeof MODE === 'undefined' || MODE === 'play') && !driving;
      bf.style.display = show ? '' : 'none';
      const flying = show && typeof Player !== 'undefined' && Player && Player.flyMode;
      bd.style.display = flying ? '' : 'none';
      if (show) bf.style.opacity = flying ? '1' : '0.55';
      if (!show && typeof Player !== 'undefined' && Player) { Player.flyMode = false; Player.flyDown = false; }
    } catch (e) {}
  },

  /* ---- activación con código (genérico; el valor real nunca se muestra) ---- */
  redeemCode(raw) {
    this.ensureSave();
    const code = String(raw || '').trim();
    if (!code) return { ok: false, msg: T('shop2.codeBad') };
    if (code === FAMILY_CODE) {
      try {
        SAVE.famCode = true;
        SAVE.coinsInf = true;                    // monedas infinitas: muestra ∞ y no descuenta
        PREMIUM_OUTFITS.forEach(o => { if (!SAVE.ownedOutfits.includes(o.id)) SAVE.ownedOutfits.push(o.id); });
        PREMIUM_VEHICLES.forEach(v => { if (!SAVE.ownedVehicles.includes(v.id)) SAVE.ownedVehicles.push(v.id); });
        PREMIUM_PETS.forEach(p => { if (!SAVE.ownedPets.includes(p.id)) SAVE.ownedPets.push(p.id); });
        SAVE.vipUntil = Date.now() + 7 * 24 * 3600 * 1000; // VIP incluido
        SAVE.builderPass = true;                             // Constructor incluido
        if (!SAVE.passes || typeof SAVE.passes !== 'object') SAVE.passes = {};
        SAVE.passes.vip = true; SAVE.passes.fly = true; SAVE.passes.constructor = true; // 🎫 pases permanentes incluidos
        persist();
        this.refreshCoinLabels();
      } catch (e) {}
      return { ok: true, msg: T('shop2.codeOk') };
    }
    return { ok: false, msg: T('shop2.codeBad') };
  },

  /* ---- consultas ---- */
  owns(kind, id) {
    try {
      this.ensureSave();
      if (kind === 'outfit') return SAVE.ownedOutfits.includes(id);
      if (kind === 'vehicle') return SAVE.ownedVehicles.includes(id);
      if (kind === 'pet') return SAVE.ownedPets.includes(id);
      if (kind === 'vip') return this.vipActive();
      if (kind === 'builder') return !!SAVE.builderPass;
      if (kind === 'pass') return this.hasPass(id);
    } catch (e) {}
    return false;
  },

  /* ---- 🔒 PIN parental OBLIGATORIO antes de CUALQUIER compra ---- */
  _pinOk: false, // la sesión queda verificada tras un PIN correcto
  _withPin(cb) {
    const go = () => { try { cb(); } catch (e) {} };
    try {
      if (this._pinOk) { go(); return; }
      if (typeof document === 'undefined') return; // node/tests: fijar Shop2._pinOk a mano
      if (typeof Weapons !== 'undefined' && Weapons && typeof Weapons.openPinPad === 'function') {
        Weapons.openPinPad(() => { this._pinOk = true; go(); }); // reutiliza el PIN de adulto existente
        return;
      }
      this._ownPinPad((ok) => { if (ok) { this._pinOk = true; go(); } });
    } catch (e) {}
  },
  /* PIN parental propio (solo si Weapons no existe): mismo patrón de 4
     dígitos guardado en SAVE.parental.pin (nunca se muestra). */
  _ownPinPad(cb) {
    const done = (ok) => { try { cb(!!ok); } catch (e) {} };
    if (typeof document === 'undefined') { done(false); return; }
    try {
      if (!SAVE.parental || typeof SAVE.parental !== 'object') SAVE.parental = { pin: null };
      const creating = !SAVE.parental.pin;
      let step = 1, first = '', cur = '';
      const ov = document.createElement('div');
      ov.className = 'shop2-ov';
      ov.style.zIndex = '99980';
      const press = (v) => {
        if (v === 'bk') { cur = cur.slice(0, -1); draw(); return; }
        if (cur.length >= 4) return;
        cur += v;
        if (cur.length < 4) { draw(); return; }
        if (!creating) {
          if (String(cur) === String(SAVE.parental.pin)) {
            try { ov.parentNode.removeChild(ov); } catch (e) {}
            try { toast('🔓 ¡Desbloqueado!'); } catch (e2) {}
            done(true);
          } else { cur = ''; draw(); const m = ov.querySelector('#pp-msg'); if (m) m.textContent = '❌ PIN incorrecto'; }
        } else if (step === 1) { first = cur; cur = ''; step = 2; draw(); }
        else {
          if (cur === first && /^\d{4}$/.test(cur)) {
            SAVE.parental.pin = cur;
            try { persist(); } catch (e) {}
            try { ov.parentNode.removeChild(ov); } catch (e) {}
            try { toast('🔓 ¡Desbloqueado!'); } catch (e2) {}
            done(true);
          } else { step = 1; first = ''; cur = ''; draw(); }
        }
      };
      const draw = () => {
        let d = '';
        for (let i = 0; i < 4; i++) d += (i < cur.length ? '●' : '○');
        ov.innerHTML = '<div class="shop2-card shop2-dlg">' +
          '<div class="shop2-dlgtitle">🔒 ' + (creating ? 'Solo adultos' : 'Pide a un adulto') + '</div>' +
          '<div class="shop2-dlgbody"><div style="font-size:34px;letter-spacing:12px;color:#ffe95e;min-height:48px">' + d + '</div>' +
          '<div id="pp-msg" style="min-height:22px;color:#ff8a80"></div>' +
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px">' +
          ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'bk'].map(k =>
            k ? '<button class="shop2-btn" data-k="' + k + '" style="margin-top:0;min-height:64px;font-size:26px">' + (k === 'bk' ? '⌫' : k) + '</button>' : '<span></span>').join('') +
          '</div><div style="font-size:13px;color:#aab;margin-top:8px">' +
          (creating ? (step === 1 ? 'Crea tu PIN de adulto (4 dígitos)' : 'Repite tu PIN para confirmar') : 'Ingresa el PIN de adulto') +
          '</div></div>' +
          '<div class="shop2-dlgbtns"><button class="shop2-btn shop2-btn-no" data-x="1">✕ Cerrar</button></div></div>';
        const xb = ov.querySelector('[data-x]');
        if (xb) xb.addEventListener('click', () => { try { ov.parentNode.removeChild(ov); } catch (e) {} done(false); });
        const keys = ov.querySelectorAll('[data-k]');
        for (let i = 0; i < keys.length; i++) {
          keys[i].addEventListener('click', ((el) => () => press(el.getAttribute('data-k')))(keys[i]));
        }
      };
      document.body.appendChild(ov);
      draw();
    } catch (e) { done(false); }
  },

  /* Etiqueta grande DEMO obligatoria en cada diálogo de compra. */
  _demoBanner() {
    return '<div class="shop2-demobig">🧪 DEMO — NO SE COBRA DINERO REAL</div>';
  },

  /* 💳 Banner/nota según el modo de pago (demo o real). */
  _isLivePay() {
    try { return typeof PaymentsLive !== 'undefined' && PaymentsLive.isLive(); } catch (e) { return false; }
  },
  _payBanner() {
    if (this._isLivePay()) {
      return '<div class="shop2-demobig" style="background:#1b5e20">💳 PAGO REAL — se cobrará a tu tarjeta</div>';
    }
    return this._demoBanner();
  },
  _payNote() {
    if (this._isLivePay()) {
      return '<small>Pago real con tarjeta. El dueño lo activa cuando ordene.</small>';
    }
    return '<small>Pago simulado: no se cobra nada real.</small>';
  },
  /* Centavos (USD) de un producto: campo cents o parseo de "$4.99". */
  _centsOf(item) {
    try {
      if (item && typeof item.cents === 'number' && item.cents > 0) return Math.floor(item.cents);
      const m = String(item && item.price || '').match(/\$?\s*([\d.]+)/);
      if (m) return Math.max(1, Math.round(parseFloat(m[1]) * 100));
    } catch (e) {}
    return 0;
  },

  /* ---- compras programáticas (lógica pura, testeable): exigen PIN verificado ---- */
  buyPassDemo(passId) {
    const self = this;
    return (async () => {
      try {
        self.ensureSave();
        if (!self._pinOk) return { ok: false, reason: 'pin' };
        const p = PREMIUM_PASSES.find(x => x.id === passId);
        if (!p) return { ok: false, reason: 'id' };
        if (self.hasPass(passId)) return { ok: true, reason: 'owned', demo: true };
        const r = await PaymentsLive.route(p.sku, p.cents, 'Pase: ' + p.name); // demo o real según PaymentsLive
        if (r && r.ok) {
          Billing.deliver('pass', passId);
          try { toast('✅ ' + p.name + (r.demo === false ? '' : ' (demo)')); } catch (e) {}
          return { ok: true, demo: r.demo !== false };
        }
        return { ok: false, reason: 'billing' };
      } catch (e) { return { ok: false, reason: 'err' }; }
    })();
  },
  buyCoinsDemo(coins) {
    const self = this;
    return (async () => {
      try {
        self.ensureSave();
        if (!self._pinOk) return { ok: false, reason: 'pin' };
        const p = COIN_PACKS.find(x => x.coins === coins);
        if (!p) return { ok: false, reason: 'id' };
        const r = await PaymentsLive.route(p.sku, p.cents, p.coins + ' monedas GEAYI'); // demo o real según PaymentsLive
        if (r && r.ok) {
          self.addCoins(p.coins);
          try { toast('✅ +' + p.coins + ' 🪙' + (r.demo === false ? '' : ' (demo)')); } catch (e) {}
          return { ok: true, demo: r.demo !== false, coins: p.coins };
        }
        return { ok: false, reason: 'billing' };
      } catch (e) { return { ok: false, reason: 'err' }; }
    })();
  },

  /* ---- ropa: aplicar al avatar (por parte del cuerpo: se pueden combinar) ---- */
  isOutfit(id) { try { return !!OUTFIT_SLOT[id]; } catch (e) { return false; } },
  outfitSlot(id) { try { return OUTFIT_SLOT[id] || 'hat'; } catch (e) { return 'hat'; } },
  equipOutfit(id) {
    try {
      this.ensureSave();
      if (!SAVE.ownedOutfits.includes(id)) return false;
      const slot = this.outfitSlot(id);
      if (slot === 'hat') SAVE.hat = id; // el sombrero sigue viviendo en SAVE.hat
      else SAVE.outfits[slot] = id;      // torso/pies/cuello: cada uno en su parte (no se quitan entre sí)
      persist();
      if (typeof Avatar !== 'undefined' && Avatar && typeof Avatar.refreshOutfits === 'function') Avatar.refreshOutfits();
      return true;
    } catch (e) { return false; }
  },
  unequipOutfit(id) {
    try {
      this.ensureSave();
      const slot = this.outfitSlot(id);
      if (slot === 'hat') { if (SAVE.hat === id) SAVE.hat = 'none'; }
      else if (SAVE.outfits && SAVE.outfits[slot] === id) delete SAVE.outfits[slot];
      persist();
      if (typeof Avatar !== 'undefined' && Avatar && typeof Avatar.refreshOutfits === 'function') Avatar.refreshOutfits();
      return true;
    } catch (e) { return false; }
  },
  equippedOutfit(id) {
    try {
      this.ensureSave();
      const slot = this.outfitSlot(id);
      return slot === 'hat' ? SAVE.hat === id : !!(SAVE.outfits && SAVE.outfits[slot] === id);
    } catch (e) { return false; }
  },
  /* Quita del avatar la prenda de una parte del cuerpo (sin tocar las demás). */
  clearOutfitSlot(avatar, slot) {
    try {
      if (!avatar || !avatar.userData) return;
      const ud = avatar.userData; ud.outfitMeshes = ud.outfitMeshes || {};
      const v = ud.outfitMeshes[slot]; if (!v) return;
      const drop = m => { try { if (m && m.parent) m.parent.remove(m); } catch (e) {} };
      if (v.hidden) v.hidden.forEach(m => { try { m.visible = true; } catch (e) {} });
      (v.groups || (Array.isArray(v) ? v : [v])).forEach(drop);
      delete ud.outfitMeshes[slot];
    } catch (e) {}
  },
  /* Re-dibuja sombrero + prendas premium según lo equipado. */
  applyOutfits(avatar) {
    try {
      if (!avatar || typeof THREE === 'undefined') return;
      const self = this;
      ['hat', 'torso', 'feet', 'neck'].forEach(s => self.clearOutfitSlot(avatar, s));
      this.ensureSave();
      const hatId = (typeof SAVE !== 'undefined' && SAVE.hat) || 'none';
      if (typeof setAvatarHat === 'function') setAvatarHat(avatar, hatId); // el wrapper dibuja el sombrero premium
      const eq = SAVE.outfits || {};
      ['torso', 'feet', 'neck'].forEach(slot => {
        const oid = eq[slot];
        if (oid && OUTFIT_SLOT[oid] === slot) { try { self.attachOutfit(avatar, oid); } catch (e) {} }
      });
    } catch (e) {}
  },
  /* Dibuja la prenda premium sobre el avatar (bloques propios, sin marcas). */
  attachOutfit(avatar, id) {
    try {
      if (typeof THREE === 'undefined' || !avatar) return;
      const slot = this.outfitSlot(id);
      this.clearOutfitSlot(avatar, slot); // quitar la prenda anterior de ESTA parte (las demás se quedan)
      avatar.userData.outfitMeshes = avatar.userData.outfitMeshes || {};
      const g = new THREE.Group();
      const sp = avatar.userData && avatar.userData.species;
      const human = sp !== 'dog' && sp !== 'cuyo' && sp !== 'turtle' && sp !== 'panther';
      const M = (c, e, ei) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.1, emissive: e || 0x000000, emissiveIntensity: ei || 0 });
      const B = (w, h, d, m, x, y, z) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); q.position.set(x, y, z); q.castShadow = true; g.add(q); return q; };
      const yHat = human ? 2.32 : 1.5, yTorso = human ? 1.32 : 0.85, s = human ? 1 : 0.7;

      if (id === 'out_vaquero') {
        // Sombrero vaquero GEAYI: ala ancha + copa, color arena con cinta turquesa
        const ala = new THREE.Mesh(new THREE.CylinderGeometry(0.46 * s, 0.46 * s, 0.07, 18), M(0xd9a45b));
        ala.position.y = 0.10; g.add(ala);
        const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.26 * s, 0.30, 14), M(0xd9a45b));
        copa.position.y = 0.28; g.add(copa);
        const cinta = new THREE.Mesh(new THREE.CylinderGeometry(0.265 * s, 0.265 * s, 0.09, 14), M(0x00e5ff, 0x00e5ff, 0.35));
        cinta.position.y = 0.18; g.add(cinta);
      } else if (id === 'out_rayo') {
        // Gorra relámpago: gorra roja + rayo amarillo al frente
        const cm = M(0xe63b3b);
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.56 * s, 0.22, 0.54 * s), cm); top.position.y = 0.12; g.add(top);
        const brim = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.07, 0.34), cm); brim.position.set(0, 0.03, 0.42 * s); g.add(brim);
        const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 0.04), M(0xffe95e, 0xffe95e, 0.9));
        bolt.position.set(0, 0.12, 0.28 * s); bolt.rotation.z = 0.35; g.add(bolt);
      } else if (id === 'out_neon') {
        // Chaqueta neón: torso con bordes brillantes + hombreras
        B(0.68 * s, 0.62 * s, 0.44 * s, M(0x1c1c26), 0, 0, 0);
        const edge = M(0x00e5ff, 0x00e5ff, 1);
        B(0.70 * s, 0.06, 0.46 * s, edge, 0, 0.30 * s, 0);
        B(0.70 * s, 0.06, 0.46 * s, edge, 0, -0.30 * s, 0);
        B(0.20 * s, 0.14, 0.14, M(0x00e5ff, 0x00e5ff, 0.8), -0.42 * s, 0.36 * s, 0);
        B(0.20 * s, 0.14, 0.14, M(0x00e5ff, 0x00e5ff, 0.8), 0.42 * s, 0.36 * s, 0);
        g.position.y = yTorso;
      } else if (id === 'out_caramelo') {
        // Playera caramelo: playera color caramelo + dulce al pecho
        B(0.64 * s, 0.60 * s, 0.42 * s, M(0xc97b2d), 0, 0, 0);
        B(0.20 * s, 0.16, 0.10, M(0xff5f8f, 0xff5f8f, 0.5), 0, 0.05, 0.24 * s); // dulce
        B(0.10, 0.10, 0.04, M(0xffffff), -0.14 * s, 0.05, 0.24 * s);
        B(0.10, 0.10, 0.04, M(0xffffff), 0.14 * s, 0.05, 0.24 * s);
        g.position.y = yTorso;
      } else if (id === 'out_botas') {
        const parts = (avatar.userData && avatar.userData.parts) || {};
        if (human && parts.legL && parts.legR) {
          // 🥾 Botas ATADAS a cada pierna: caminan con el cuerpo (no flotan)
          const hidden = [], groups = [];
          [parts.legL, parts.legR].forEach(piv => {
            try {
              piv.children.forEach(m => {
                if (m.name && m.name.indexOf('shoe') === 0) { m.visible = false; hidden.push(m); }
              });
            } catch (e) {}
            const bg = new THREE.Group();
            const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.27 * s, 0.38 * s, 0.37 * s), M(0x2b2f3a));
            shaft.position.set(0, -0.58, 0.03); shaft.castShadow = true; bg.add(shaft);
            const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.29 * s, 0.10, 0.39 * s), M(0x00e5ff, 0x00e5ff, 0.5));
            cuff.position.set(0, -0.42, 0.03); bg.add(cuff);
            const sole = new THREE.Mesh(new THREE.BoxGeometry(0.30 * s, 0.10, 0.48 * s), M(0x00e5ff, 0x00e5ff, 0.7));
            sole.position.set(0, -0.75, 0.06); bg.add(sole);
            piv.add(bg); groups.push(bg);
          });
          avatar.userData.outfitMeshes[slot] = { groups: groups, hidden: hidden };
          return;
        }
        // mascotas o avatares sin piernas articuladas: botas simples al cuerpo
        [-1, 1].forEach(sgn => {
          B(0.26 * s, 0.34 * s, 0.34 * s, M(0x2b2f3a), sgn * 0.19 * s, 0.17, 0.03);
          B(0.30 * s, 0.09, 0.46 * s, M(0x00e5ff, 0x00e5ff, 0.7), sgn * 0.19 * s, 0.045, 0.06);
        });
        g.position.y = human ? 0.10 : 0.05;
      } else if (id === 'out_arco') {
        // Bufanda arcoíris: anillo al cuello + tira colgando
        const cols = [0xff3b3b, 0xff9d00, 0xffe95e, 0x59d867, 0x00a2ff, 0x7b2fff];
        cols.forEach((c, i) => {
          const seg = new THREE.Mesh(new THREE.TorusGeometry(0.24 * s, 0.045, 8, 20, Math.PI * 2 / cols.length + 0.12), M(c));
          seg.rotation.x = Math.PI / 2; seg.rotation.z = (i / cols.length) * Math.PI * 2;
          seg.position.y = 0; g.add(seg);
        });
        cols.slice(0, 4).forEach((c, i) => B(0.09, 0.30, 0.05, M(c), 0.12 * s, -0.28 - i * 0.02, 0.20 * s));
        g.position.y = human ? 1.78 : 1.15;
      }
      if (id === 'out_vaquero' || id === 'out_rayo') g.position.y = yHat;
      avatar.userData.outfitMeshes[slot] = g;
      avatar.add(g);
    } catch (e) {}
  },

  /* 👑 Insignia del Pase VIP: coronita dorada sobre el avatar (diseño propio). */
  attachCrown(avatar) {
    try {
      if (typeof THREE === 'undefined' || !avatar || !avatar.userData) return;
      avatar.userData.outfitMeshes = avatar.userData.outfitMeshes || {};
      const old = avatar.userData.outfitMeshes.passcrown;
      if (old) { try { if (old.parent) old.parent.remove(old); } catch (e) {} }
      const g = new THREE.Group();
      const gold = new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.7, roughness: 0.3, emissive: 0xffd23f, emissiveIntensity: 0.25 });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.12, 10), gold);
      band.castShadow = true; g.add(band);
      for (let i = 0; i < 5; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 6), gold);
        const a = (i / 5) * Math.PI * 2;
        spike.position.set(Math.cos(a) * 0.17, 0.11, Math.sin(a) * 0.17);
        g.add(spike);
      }
      const sp = avatar.userData.species;
      const human = sp !== 'dog' && sp !== 'cuyo' && sp !== 'turtle' && sp !== 'panther';
      g.position.y = human ? 2.60 : 1.76;
      if (typeof avatar.add === 'function') avatar.add(g);
      avatar.userData.outfitMeshes.passcrown = g;
    } catch (e) {}
  },

  /* ---- vehículos premium: agregar al nivel ---- */
  /* Construye la malla del vehículo especial (diseños propios de bloques). */
  buildVehicleMesh(id) {
    try {
      if (typeof THREE === 'undefined') return null;
      const vb = (typeof vbox === 'function') ? vbox : null;
      let mesh = null;
      if (id === 'veh_monstruo') {
        // Troca Monstruo: carrocería naranja levantada + 4 ruedotas
        const base = (typeof buildCarMesh === 'function') ? buildCarMesh(0xff6a00) : new THREE.Group();
        base.position.y = 0.85;
        const g = new THREE.Group();
        g.add(base);
        const wg = new THREE.CylinderGeometry(0.55, 0.55, 0.42, 14);
        const wm = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.8 });
        [[-0.95, 1.05], [0.95, 1.05], [-0.95, -1.05], [0.95, -1.05]].forEach(p => {
          const w = new THREE.Mesh(wg, wm);
          w.rotation.z = Math.PI / 2; w.position.set(p[0], 0.55, p[1]); w.castShadow = true;
          g.add(w);
          const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.44, 10),
            new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.6 }));
          hub.rotation.z = Math.PI / 2; hub.position.copy(w.position); g.add(hub);
        });
        if (vb) vb(g, 0.5, 0.5, 0.12, 0xffe95e, 0, 2.35, 1.55, 0xffe95e, 0.8); // faros extra
        mesh = g;
      } else if (id === 'veh_rayo') {
        // Deportivo Rayo: amarillo veloz + alerón + neón bajo
        const base = (typeof buildCarMesh === 'function') ? buildCarMesh(0xffe95e) : new THREE.Group();
        const g = new THREE.Group();
        g.add(base);
        if (vb) {
          vb(g, 1.5, 0.10, 0.45, 0x1c1c22, 0, 1.75, -1.45);                    // alerón
          vb(g, 0.10, 0.45, 0.10, 0x1c1c22, -0.6, 1.5, -1.45);
          vb(g, 0.10, 0.45, 0.10, 0x1c1c22, 0.6, 1.5, -1.45);
          vb(g, 1.6, 0.08, 2.9, 0x00e5ff, 0, 0.12, 0, 0x00e5ff, 1);           // neón bajo
          vb(g, 0.9, 0.18, 0.06, 0xffffff, 0, 0.85, 1.56, 0xffffff, 0.9);      // luz frontal
        }
        mesh = g;
      } else if (id === 'veh_chopper') {
        // Moto Chopper: horquilla larga + respaldo alto, morada
        const base = (typeof buildBikeMesh === 'function') ? buildBikeMesh(0x7b2fff) : new THREE.Group();
        const g = new THREE.Group();
        g.add(base);
        if (vb) {
          const fork = vb(g, 0.09, 1.15, 0.09, 0x9aa5b1, 0, 0.85, -1.15);      // horquilla larga
          fork.rotation.x = -0.5;
          vb(g, 0.34, 0.5, 0.10, 0x2b2f3a, 0, 1.25, 0.85);                     // respaldo
          vb(g, 0.20, 0.20, 0.5, 0xff2fd6, 0, 0.45, 0.9, 0xff2fd6, 0.7);      // escape
        }
        mesh = g;
      }
      if (mesh && typeof addGeayiBadge === 'function') {
        try { addGeayiBadge(mesh, 0, 1.9, 0, 0); } catch (e) {}
      }
      return mesh;
    } catch (e) { return null; }
  },
  /* Hook de integración: agrega el vehículo premium al nivel para que sea
     abordable como los normales (entra a LEVEL.cars). */
  addPremiumVehicleToLevel(lvl, id, x, y, z, drivable) {
    try {
      if (!lvl || !lvl.group) return null;
      const def = PREMIUM_VEHICLES.find(v => v.id === id);
      if (!def) return null;
      const mesh = this.buildVehicleMesh(id);
      if (!mesh) return null;
      mesh.position.set(x, y, z);
      lvl.group.add(mesh);
      if (drivable) {
        if (!lvl.cars) lvl.cars = [];
        lvl.cars.push({ kind: def.kind, x, y, z, mesh, taken: false, heading: 0, premium: id });
      }
      return mesh;
    } catch (e) { return null; }
  },

  /* ---- mascotas premium: constructores 3D originales ---- */
  buildPetMesh(id) {
    try {
      if (typeof THREE === 'undefined') return null;
      const bx = (typeof box === 'function') ? box : null;
      const lm = (typeof lam === 'function') ? lam : (c => new THREE.MeshLambertMaterial({ color: c }));
      if (!bx) return null;
      const g = new THREE.Group();
      let legs = [], tail = null, head = null;
      const mkLegs = (w, h, d, c, pts) => pts.map(p => { const l = bx(w, h, d, c, p[0], h / 2, p[1]); g.add(l); legs.push(l); return l; });
      if (id === 'pet_dragon') {
        // Dragón Mini: cuerpo verde, alitas, cuernitos, cola con punta
        const gr = 0x3fae5a, dk = 0x2a7a3f, cr = 0xffe95e;
        g.add(bx(0.36, 0.30, 0.50, gr, 0, 0.36, 0));
        head = new THREE.Group(); head.position.set(0, 0.60, 0.28);
        head.add(bx(0.30, 0.28, 0.28, gr, 0, 0, 0));
        head.add(bx(0.14, 0.10, 0.12, dk, 0, -0.05, 0.18));                 // hocico
        head.add(bx(0.06, 0.07, 0.02, 0x1a1a1a, -0.08, 0.05, 0.15));        // ojo L
        head.add(bx(0.06, 0.07, 0.02, 0x1a1a1a, 0.08, 0.05, 0.15));         // ojo R
        const h1 = bx(0.06, 0.14, 0.06, cr, -0.10, 0.18, 0); h1.rotation.z = 0.4;   // cuernito L
        const h2 = bx(0.06, 0.14, 0.06, cr, 0.10, 0.18, 0); h2.rotation.z = -0.4;  // cuernito R
        head.add(h1); head.add(h2);
        g.add(head);
        const wL = bx(0.26, 0.06, 0.30, dk, -0.26, 0.52, -0.05); wL.rotation.z = 0.5;  // alita L
        const wR = bx(0.26, 0.06, 0.30, dk, 0.26, 0.52, -0.05); wR.rotation.z = -0.5;  // alita R
        tail = bx(0.08, 0.08, 0.34, gr, 0, 0.42, -0.36); tail.rotation.x = -0.4;
        const tip = bx(0.14, 0.10, 0.06, cr, 0, 0.52, -0.52); tip.rotation.x = -0.4; g.add(tip);
        mkLegs(0.10, 0.24, 0.10, dk, [[-0.13, 0.18], [0.13, 0.18], [-0.13, -0.18], [0.13, -0.18]]);
        g.userData = { legs, tail, head, wings: [wL, wR] };
      } else if (id === 'pet_uni') {
        // Unicornio: cuerpo blanco, crin arcoíris, cuerno dorado
        const wh = 0xf5f0ff, pk = 0xf2a0c0, gd = 0xffd23f;
        g.add(bx(0.34, 0.30, 0.52, wh, 0, 0.36, 0));
        head = new THREE.Group(); head.position.set(0, 0.62, 0.28);
        head.add(bx(0.28, 0.30, 0.30, wh, 0, 0, 0));
        head.add(bx(0.14, 0.12, 0.14, pk, 0, -0.06, 0.18));                 // hocico rosa
        head.add(bx(0.05, 0.06, 0.02, 0x1a1a1a, -0.08, 0.05, 0.16));
        head.add(bx(0.05, 0.06, 0.02, 0x1a1a1a, 0.08, 0.05, 0.16));
        const horn = bx(0.07, 0.22, 0.07, gd, 0, 0.22, 0.05); horn.rotation.x = 0.25; // cuerno
        head.add(horn);
        const eL = bx(0.10, 0.14, 0.05, wh, -0.10, 0.16, -0.02); eL.rotation.z = 0.25;
        const eR = bx(0.10, 0.14, 0.05, wh, 0.10, 0.16, -0.02); eR.rotation.z = -0.25;
        head.add(eL); head.add(eR);
        const rainbow = [0xff3b3b, 0xff9d00, 0xffe95e, 0x59d867, 0x00a2ff];
        rainbow.forEach((c, i) => head.add(bx(0.30 - i * 0.02, 0.07, 0.10, c, 0, 0.13 - i * 0.07, -0.12 - i * 0.02))); // crin
        g.add(head);
        tail = new THREE.Group(); tail.position.set(0, 0.40, -0.28);
        rainbow.forEach((c, i) => { const s2 = bx(0.08, 0.16, 0.08, c, 0, -i * 0.13, -i * 0.03); tail.add(s2); });
        g.add(tail);
        mkLegs(0.09, 0.24, 0.09, gd, [[-0.12, 0.18], [0.12, 0.18], [-0.12, -0.18], [0.12, -0.18]]); // cascos dorados
        g.userData = { legs, tail, head };
      } else if (id === 'pet_robo') {
        // Robotito: cajita metálica, antena con foco, ojos visor
        const mt = 0x9aa5b1, dk = 0x4a5568, cy = 0x00e5ff;
        g.add(bx(0.36, 0.34, 0.36, mt, 0, 0.40, 0));                        // cuerpo
        head = new THREE.Group(); head.position.set(0, 0.72, 0);
        head.add(bx(0.34, 0.26, 0.32, mt, 0, 0, 0));                        // cabeza
        head.add(bx(0.26, 0.10, 0.02, cy, 0, 0.02, 0.17));                  // visor
        const ant = bx(0.04, 0.20, 0.04, dk, 0, 0.22, 0); head.add(ant);    // antena
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xff3b3b, emissiveIntensity: 1 }));
        bulb.position.set(0, 0.34, 0); head.add(bulb);
        head.add(bx(0.06, 0.16, 0.06, dk, -0.20, 0, 0));                    // oreja L
        head.add(bx(0.06, 0.16, 0.06, dk, 0.20, 0, 0));                     // oreja R
        g.add(head);
        tail = bx(0.06, 0.06, 0.22, dk, 0, 0.40, -0.28);                    // cable-cola
        const btn1 = bx(0.08, 0.08, 0.03, 0x59d867, -0.08, 0.40, 0.19);     // botones
        const btn2 = bx(0.08, 0.08, 0.03, 0xffe95e, 0.08, 0.40, 0.19);
        g.userData = { legs, tail, head };
        mkLegs(0.12, 0.22, 0.12, dk, [[-0.11, 0.12], [0.11, 0.12], [-0.11, -0.12], [0.11, -0.12]]); // patas cortas
      } else return null;
      return g;
    } catch (e) { return null; }
  },
  /* Etiqueta flotante para mascotas premium (usa canvasTex de world.js). */
  buildPetLabelPremium(id) {
    try {
      const def = PREMIUM_PETS.find(p => p.id === id);
      if (!def || typeof canvasTex !== 'function') return null;
      const tex = canvasTex(256, 64, (g, w, h) => {
        g.fillStyle = 'rgba(10,14,30,0.72)';
        g.beginPath();
        if (g.roundRect) g.roundRect(4, 6, w - 8, h - 12, 16); else g.rect(4, 6, w - 8, h - 12);
        g.fill();
        g.strokeStyle = '#ffe95e'; g.lineWidth = 3; g.stroke();
        g.fillStyle = '#ffffff';
        g.font = '700 28px "Trebuchet MS", sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(def.emoji + ' ' + def.name, w / 2, h / 2 + 1);
      });
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sp.scale.set(1.9, 0.475, 1);
      sp.position.y = 1.15;
      return sp;
    } catch (e) { return null; }
  },
  choosePet(id) {
    try {
      this.ensureSave();
      if (!PREMIUM_PETS.some(p => p.id === id)) return false;
      if (!SAVE.ownedPets.includes(id)) return false;
      SAVE.pet = id; persist();
      if (typeof Pets !== 'undefined' && Pets && typeof Pets.onLevelStart === 'function') Pets.onLevelStart();
      return true;
    } catch (e) { return false; }
  },

  /* ---- pago (PIN parental obligatorio; demo o REAL según PaymentsLive) ---- */
  payFlow(kind, item, onDone) {
    const sku = item.sku || (kind + '_' + item.id);
    this._withPin(() => {
      this.confirmDlg(
        '💳 ' + T('shop2.pay'),
        this._payBanner() +
        '<b>' + item.name + '</b><br>' + item.price + ' <span class="shop2-demo">' + (this._isLivePay() ? '💳 real' : T('shop2.demo')) + '</span><br>' +
        this._payNote(),
        async () => {
          const r = await PaymentsLive.route(sku, this._centsOf(item), 'Compra: ' + item.name); // demo o real
          if (r && r.ok) {
            Billing.deliver(kind, item.id);
            try { toast('✅ ' + item.name); } catch (e) {}
            if (typeof onDone === 'function') onDone();
          }
        }
      );
    });
  },
  /* Diálogo de confirmación genérico (botones grandes táctiles). */
  confirmDlg(title, html, onOk) {
    if (typeof document === 'undefined') { onOk(); return; }
    try {
      const ov = document.createElement('div');
      ov.className = 'shop2-ov';
      ov.innerHTML = '<div class="shop2-card shop2-dlg">' +
        '<div class="shop2-dlgtitle">' + title + '</div>' +
        '<div class="shop2-dlgbody">' + html + '</div>' +
        '<div class="shop2-dlgbtns">' +
        '<button class="shop2-btn shop2-btn-ok">' + T('shop2.confirm') + '</button>' +
        '<button class="shop2-btn shop2-btn-no">' + T('shop2.cancel') + '</button>' +
        '</div></div>';
      const close = () => { try { ov.parentNode.removeChild(ov); } catch (e) {} };
      ov.querySelector('.shop2-btn-ok').addEventListener('click', () => { close(); onOk(); });
      ov.querySelector('.shop2-btn-no').addEventListener('click', close);
      document.body.appendChild(ov);
    } catch (e) { onOk(); }
  },

  /* ---- anuncio con recompensa ---- */
  watchAd() {
    Ads.watch((seen) => {
      if (seen) {
        this.addCoins(50); // addCoins aplica el 2x del Pase VIP si está activo
        try { toast(T('shop2.adDone')); } catch (e) {}
        this.render();
      }
    });
  },

  /* ================= UI ================= */
  init() {
    if (this._inited) return;
    this._inited = true;
    this.ensureSave();
    this._wrapAvatarHat();
    this._wrapPets();
    if (typeof document === 'undefined') return;
    try {
      // estilos propios (livianos, sin canvas)
      if (!document.getElementById('shop2-css')) {
        const st = document.createElement('style');
        st.id = 'shop2-css';
        st.textContent =
          '.shop2-ov{position:fixed;inset:0;z-index:9990;display:flex;align-items:center;justify-content:center;background:rgba(5,1,15,.78);backdrop-filter:blur(4px);padding:12px}' +
          '.shop2-card{background:#141a36;border:2px solid #00e5ff;border-radius:18px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column;color:#fff;box-shadow:0 0 30px #00e5ff55}' +
          '.shop2-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #3949ab}' +
          '.shop2-head h2{margin:0;font-size:20px;flex:1}' +
          '.shop2-coins{background:#0a0e24;border:1px solid #ffd23f;border-radius:12px;padding:6px 12px;font-weight:bold;color:#ffd23f}' +
          '.shop2-x{background:#ff3b5c;border:none;color:#fff;border-radius:10px;font-size:18px;min-width:44px;min-height:44px;cursor:pointer}' +
          '.shop2-tabs{display:flex;gap:6px;padding:10px 12px 0;overflow-x:auto}' +
          '.shop2-tab{flex:0 0 auto;white-space:nowrap;background:#1a2040;border:2px solid #3949ab;color:#fff;border-radius:12px;padding:10px 14px;font-size:14px;font-weight:bold;cursor:pointer;min-height:48px}' +
          '.shop2-tab.on{border-color:#ffe95e;background:#262c55}' +
          '.shop2-body{padding:12px;overflow-y:auto}' +
          '.shop2-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}' +
          '.shop2-item{background:#1a2040;border:2px solid #3949ab;border-radius:14px;padding:12px 8px;text-align:center}' +
          '.shop2-item .emoji{font-size:40px;display:block}' +
          '.shop2-item .pname{font-weight:bold;margin:6px 0;font-size:15px}' +
          '.shop2-item .pslot{font-size:12px;color:#9be8ff;margin:-2px 0 4px}' +
          '.shop2-item .pdesc{font-size:12px;color:#aab;min-height:30px}' +
          '.shop2-item .pprice{color:#ffd23f;font-weight:bold;margin:6px 0}' +
          '.shop2-item.owned{border-color:#00e676}' +
          '.shop2-item.equipped{border-color:#ffe95e;box-shadow:0 0 14px #ffe95e88}' +
          '.shop2-btn{display:block;width:100%;margin-top:8px;border:none;border-radius:12px;padding:12px;font-size:15px;font-weight:bold;cursor:pointer;min-height:48px}' +
          '.shop2-btn-pay{background:linear-gradient(135deg,#00c2a8,#00a2ff);color:#fff}' +
          '.shop2-btn-code{background:#2b2f4a;color:#ffe95e;border:2px solid #ffe95e}' +
          '.shop2-btn-ok{background:#00e676;color:#06281a}' +
          '.shop2-btn-no{background:#3949ab;color:#fff}' +
          '.shop2-btn:active{transform:scale(.96)}' +
          '.shop2-demo{background:#ff9d00;color:#201100;font-size:11px;font-weight:bold;border-radius:8px;padding:2px 8px}' +
          '.shop2-demobig{background:#3a2b00;border:2px solid #ffd23f;color:#ffe95e;font-weight:bold;font-size:16px;border-radius:12px;padding:10px;margin:0 0 10px;text-align:center}' +
          '.shop2-dlgtitle{font-size:20px;font-weight:bold;padding:14px 14px 4px;text-align:center}' +
          '.shop2-dlgbody{padding:10px 16px;text-align:center;font-size:16px;line-height:1.5}' +
          '.shop2-dlgbtns{display:flex;gap:10px;padding:12px 16px 16px}' +
          '.shop2-dlgbtns .shop2-btn{margin-top:0}' +
          '.shop2-codeRow{display:flex;gap:8px;margin:12px 0}' +
          '.shop2-codeRow input{flex:1;font-size:18px;padding:12px;border-radius:12px;border:2px solid #3949ab;background:#0a0e24;color:#fff;min-height:48px}' +
          '.shop2-msg{text-align:center;font-size:16px;font-weight:bold;margin:10px 0;min-height:24px}' +
          '.shop2-msg.ok{color:#00e676}.shop2-msg.bad{color:#ff5f6e}' +
          '.shop2-note{font-size:12px;color:#aab;text-align:center;margin-top:10px;line-height:1.5}' +
          '.shop2-adov{position:fixed;inset:0;z-index:9999;background:#000;display:flex;align-items:center;justify-content:center}' +
          '.shop2-adcard{background:#141a36;border:3px solid #ffd23f;border-radius:18px;padding:30px;text-align:center;color:#fff}' +
          '.shop2-adbadge{font-size:20px;font-weight:bold;color:#ffd23f;margin-bottom:12px}' +
          '.shop2-admsg{font-size:18px}' +
          '.shop2-secTitle{font-size:16px;font-weight:bold;margin:4px 0 10px;color:#ffe95e}';
        document.head.appendChild(st);
      }
      // botón "🪙" en el side-menu (abre la tienda)
      const sm = document.getElementById('side-menu');
      if (sm && !document.getElementById('btn-side-shop2')) {
        const b = document.createElement('button');
        b.id = 'btn-side-shop2';
        b.className = 'side-btn';
        b.setAttribute('aria-label', 'Tienda GEAYI');
        b.innerHTML = '<span style="font-size:26px">🪙</span><span>Tienda</span>';
        b.addEventListener('click', () => Shop2.open());
        sm.appendChild(b);
      }
      // el chip de monedas del HUD también abre la tienda
      const chip = document.getElementById('hud-coins');
      if (chip && chip.parentNode && !chip.parentNode.__shop2) {
        chip.parentNode.__shop2 = true;
        chip.parentNode.style.cursor = 'pointer';
        chip.parentNode.addEventListener('click', () => Shop2.open());
      }
      // 🕊️ botones de vuelo del Pase de Vuelo (se muestran solo con el pase)
      try {
        if (!document.getElementById('btn-fly')) {
          const bf = document.createElement('button');
          bf.id = 'btn-fly';
          bf.textContent = '🕊️';
          bf.setAttribute('aria-label', 'Volar / caminar');
          bf.style.cssText = 'position:fixed;right:16px;bottom:470px;z-index:16;width:64px;height:64px;' +
            'border-radius:50%;font-size:30px;border:3px solid #bffcff;display:none;touch-action:manipulation;' +
            'background:radial-gradient(circle at 35% 30%,#c4f5ff,#7b2fff 75%);color:#fff;box-shadow:0 0 18px #7b2fffaa,0 4px 0 #3d1a7a;';
          bf.addEventListener('click', () => {
            try {
              if (typeof Player === 'undefined') return;
              Player.flyMode = !Player.flyMode;
              if (!Player.flyMode) Player.flyDown = false;
              toast(Player.flyMode ? '🕊️ ¡Volando! Toca ⬇️ para bajar' : '🚶 A caminar');
            } catch (e) {}
          });
          document.body.appendChild(bf);
          const bd = document.createElement('button');
          bd.id = 'btn-flydown';
          bd.textContent = '⬇️';
          bd.setAttribute('aria-label', 'Bajar volando');
          bd.style.cssText = 'position:fixed;right:16px;bottom:548px;z-index:16;width:64px;height:64px;' +
            'border-radius:50%;font-size:30px;border:3px solid #bffcff;display:none;touch-action:manipulation;' +
            'background:radial-gradient(circle at 35% 30%,#c4f5ff,#00a2ff 75%);color:#fff;box-shadow:0 0 18px #00a2ffaa,0 4px 0 #006978;';
          const dn = (v) => { try { if (typeof Player !== 'undefined') Player.flyDown = v; } catch (e) {} };
          bd.addEventListener('pointerdown', () => dn(true));
          bd.addEventListener('pointerup', () => dn(false));
          bd.addEventListener('pointerleave', () => dn(false));
          bd.addEventListener('pointercancel', () => dn(false));
          document.body.appendChild(bd);
        }
      } catch (e) {}
      this.refreshCoinLabels();
    } catch (e) {}
  },

  _tab: 'coins',
  open() {
    if (typeof document === 'undefined') return;
    try {
      this.ensureSave();
      let ov = document.getElementById('shop2-ov');
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
      ov = document.createElement('div');
      ov.id = 'shop2-ov';
      ov.className = 'shop2-ov';
      ov.innerHTML = '<div class="shop2-card">' +
        '<div class="shop2-head"><h2>' + T('shop2.title') + ' <span class="shop2-demo">' + T('shop2.demo') + '</span></h2>' +
        '<div class="shop2-coins">🪙 <span id="shop2-coins">' + this.coinsText() + '</span></div>' +
        '<button class="shop2-x" id="shop2-x" aria-label="' + T('shop2.close') + '">✕</button></div>' +
        '<div class="shop2-tabs" id="shop2-tabs"></div>' +
        '<div class="shop2-body" id="shop2-body"></div>' +
        '</div>';
      document.body.appendChild(ov);
      document.getElementById('shop2-x').addEventListener('click', () => { try { ov.parentNode.removeChild(ov); } catch (e) {} });
      const tabs = [['coins', '🪙 MONEDAS'], ['outfits', '👕 ' + T('shop2.outfits')],
        ['vehicles', '🚗 ' + T('shop2.vehicles')], ['pets', '🐾 ' + T('shop2.pets')],
        ['passes', '🎫 PASES'], ['code', '🔑 ' + T('shop2.code')],
        ['weapons', '🧸 ' + T('shop2.weapons')]];
      const bar = document.getElementById('shop2-tabs');
      tabs.forEach(t => {
        const b = document.createElement('button');
        b.className = 'shop2-tab' + (this._tab === t[0] ? ' on' : '');
        b.textContent = t[1];
        b.addEventListener('click', () => { this._tab = t[0]; this.render(); });
        bar.appendChild(b);
      });
      this.render();
    } catch (e) {}
  },
  render() {
    try {
      const body = document.getElementById('shop2-body');
      if (!body) return;
      body.innerHTML = '';
      const bar = document.getElementById('shop2-tabs');
      if (bar) Array.from(bar.children).forEach(b => b.classList.remove('on'));
      if (bar && bar.children) {
        const idx = { coins: 0, outfits: 1, vehicles: 2, pets: 3, passes: 4, code: 5, weapons: 6 }[this._tab];
        if (bar.children[idx]) bar.children[idx].classList.add('on');
      }
      if (this._tab === 'coins') this._renderCoins(body);
      else if (this._tab === 'outfits') this._renderOutfits(body);
      else if (this._tab === 'vehicles') this._renderVehicles(body);
      else if (this._tab === 'pets') this._renderPets(body);
      else if (this._tab === 'passes') this._renderPasses(body);
      else if (this._tab === 'weapons') this._renderWeapons(body);
      else this._renderCode(body);
      const c = document.getElementById('shop2-coins');
      if (c) c.textContent = this.coinsText();
    } catch (e) {}
  },

  /* Tarjeta genérica de item premium con los DOS botones requeridos. */
  _card(item, kind, extraHtml) {
    const d = document.createElement('div');
    const owned = this.owns(kind, item.id);
    const eq = (kind === 'outfit' && this.equippedOutfit(item.id)) ||
               (kind === 'pet' && SAVE.pet === item.id);
    d.className = 'shop2-item' + (owned ? ' owned' : '') + (eq ? ' equipped' : '');
    const slotTag = (kind === 'outfit' && item.slot && SLOT_LABEL[item.slot])
      ? '<div class="pslot">' + SLOT_LABEL[item.slot] + '</div>' : '';
    d.innerHTML = '<span class="emoji">' + item.emoji + '</span>' +
      '<div class="pname">' + item.name + '</div>' + slotTag +
      (item.desc ? '<div class="pdesc">' + item.desc + '</div>' : '') +
      '<div class="pprice">' + (owned ? T('shop2.owned') + (eq ? ' · ' + T('shop2.equipped') : '') : item.price) + '</div>' +
      (extraHtml || '');
    if (!owned) {
      const bCode = document.createElement('button');
      bCode.className = 'shop2-btn shop2-btn-code';
      bCode.textContent = T('shop2.redeem');
      bCode.addEventListener('click', () => { this._tab = 'code'; this._pendingItem = { kind, item }; this.render(); });
      const bPay = document.createElement('button');
      bPay.className = 'shop2-btn shop2-btn-pay';
      bPay.textContent = T('shop2.pay') + ' ' + item.price + (this._isLivePay() ? ' 💳' : ' · ' + T('shop2.demo'));
      bPay.addEventListener('click', () => this.payFlow(kind, item, () => this.render()));
      d.appendChild(bCode);
      d.appendChild(bPay);
    } else if (kind === 'outfit' && !eq) {
      const b = document.createElement('button');
      b.className = 'shop2-btn shop2-btn-ok';
      b.textContent = T('shop2.equip');
      b.addEventListener('click', () => { this.equipOutfit(item.id); this.render(); });
      d.appendChild(b);
    } else if (kind === 'outfit' && eq) {
      const b = document.createElement('button');
      b.className = 'shop2-btn shop2-btn-no';
      b.textContent = T('shop2.equipped') + ' · ' + T('shop2.unequip');
      b.addEventListener('click', () => { this.unequipOutfit(item.id); this.render(); });
      d.appendChild(b);
    } else if (kind === 'pet' && !eq) {
      const b = document.createElement('button');
      b.className = 'shop2-btn shop2-btn-ok';
      b.textContent = T('shop2.equip');
      b.addEventListener('click', () => { this.choosePet(item.id); this.render(); });
      d.appendChild(b);
    }
    return d;
  },

  _renderCoins(body) {
    const t = document.createElement('div');
    t.innerHTML = '<div class="shop2-secTitle">🪙 MONEDAS' +
      (this.vipActive() ? ' · ' + T('shop2.vipOn') + ' (2x)' : (this.hasPass('vip') ? ' · 👑 VIP +10%' : '')) + '</div>' +
      this._payBanner();
    const grid = document.createElement('div');
    grid.className = 'shop2-grid';
    COIN_PACKS.forEach(p => {
      const d = document.createElement('div');
      d.className = 'shop2-item';
      d.innerHTML = '<span class="emoji">🪙</span><div class="pname">' + p.coins + ' monedas</div>' +
        '<div class="pprice">' + p.price + '</div>';
      const b = document.createElement('button');
      b.className = 'shop2-btn shop2-btn-pay';
      b.textContent = T('shop2.buy') + (this._isLivePay() ? ' 💳' : ' · ' + T('shop2.demo'));
      b.addEventListener('click', () => {
        this._withPin(() => {
          this.confirmDlg('🪙 ' + T('shop2.buy'),
            this._payBanner() +
            '<b>' + p.coins + ' monedas</b> por ' + p.price + ' <span class="shop2-demo">' + (this._isLivePay() ? '💳 real' : T('shop2.demo')) + '</span><br>' +
            this._payNote(),
            async () => {
              const r = await PaymentsLive.route(p.sku, p.cents, p.coins + ' monedas GEAYI'); // demo o real
              if (r && r.ok) {
                this.addCoins(p.coins);
                try { toast('✅ +' + p.coins + ' 🪙'); } catch (e) {}
                this.render();
              }
            });
        });
      });
      d.appendChild(b);
      grid.appendChild(d);
    });
    body.appendChild(t); body.appendChild(grid);
    // anuncio opcional con recompensa
    const adB = document.createElement('button');
    adB.className = 'shop2-btn shop2-btn-code';
    adB.style.marginTop = '14px';
    adB.textContent = T('shop2.ad') + ' · ' + T('shop2.demo');
    adB.addEventListener('click', () => this.watchAd());
    body.appendChild(adB);
    const note = document.createElement('div');
    note.className = 'shop2-note';
    note.textContent = this._isLivePay()
      ? '💳 PAGOS REALES activos. Los anuncios siguen en demo.'
      : 'Pagos y anuncios en modo DEMO: nada se cobra ni se muestra de verdad. ' +
        'Listo para pagos reales cuando el dueño lo active.';
    body.appendChild(note);
  },

  _renderOutfits(body) {
    const t = document.createElement('div');
    t.innerHTML = '<div class="shop2-secTitle">👕 ' + T('shop2.outfits') + ' — diseños originales GEAYI</div>';
    const grid = document.createElement('div');
    grid.className = 'shop2-grid';
    PREMIUM_OUTFITS.forEach(o => grid.appendChild(this._card(o, 'outfit')));
    body.appendChild(t); body.appendChild(grid);
  },

  _renderVehicles(body) {
    const t = document.createElement('div');
    t.innerHTML = '<div class="shop2-secTitle">🚗 ' + T('shop2.vehicles') + ' — diseños originales de bloques</div>';
    const grid = document.createElement('div');
    grid.className = 'shop2-grid';
    PREMIUM_VEHICLES.forEach(v => {
      const extra = this.owns('vehicle', v.id)
        ? '<div class="pdesc">Aparece en los mundos con zonas de manejo. Integración: Shop2.addPremiumVehicleToLevel().</div>'
        : '';
      grid.appendChild(this._card(v, 'vehicle', extra));
    });
    body.appendChild(t); body.appendChild(grid);
  },

  _renderPets(body) {
    const t = document.createElement('div');
    t.innerHTML = '<div class="shop2-secTitle">🐾 ' + T('shop2.pets') + ' — diseños originales</div>';
    const grid = document.createElement('div');
    grid.className = 'shop2-grid';
    PREMIUM_PETS.forEach(p => grid.appendChild(this._card(p, 'pet')));
    body.appendChild(t); body.appendChild(grid);
  },

  /* 🧸 Juguetes: control parental con PIN + línea básica (🪙) + premium (💳). */
  _renderWeapons(body) {
    try {
      const t = document.createElement('div');
      t.innerHTML = '<div class="shop2-secTitle">🧸 ' + T('shop2.weapons') + ' — juguetes de espuma y agua</div>';
      body.appendChild(t);
      if (typeof Weapons === 'undefined') return;
      if (!Weapons.isUnlocked()) { // 🔒 sesión bloqueada → PIN
        const d = document.createElement('div');
        d.className = 'shop2-grid';
        const card = document.createElement('div');
        card.className = 'shop2-item';
        card.innerHTML = '<span class="emoji">🔒</span><div class="pname">Sección de adultos</div>' +
          '<div class="pdesc">Los juguetes solo los activa un adulto con su PIN.</div>';
        const b = document.createElement('button');
        b.className = 'shop2-btn shop2-btn-pay';
        b.textContent = Weapons.hasPin() ? '🔓 Ingresar PIN' : '🔒 Crear PIN de adulto';
        b.addEventListener('click', () => Weapons.openPinPad(() => this.render()));
        card.appendChild(b);
        d.appendChild(card);
        body.appendChild(d);
        return;
      }
      const grid = document.createElement('div');
      grid.className = 'shop2-grid';
      Weapons.list().forEach(w => {
        const card = document.createElement('div');
        card.className = 'shop2-item';
        card.innerHTML = '<span class="emoji">' + w.emoji + '</span><div class="pname">' + w.name + '</div>' +
          '<div class="pdesc">' + w.desc + '</div>' +
          '<div class="pprice">' + (w.coin ? w.price + ' 🪙' : w.price + ' USD') + '</div>';
        const eq = Weapons.equipped() === w.id;
        if (Weapons.owns(w.id)) {
          const row = document.createElement('div');
          const ok = document.createElement('button');
          ok.className = 'shop2-btn ' + (eq ? 'shop2-btn-no' : 'shop2-btn-ok');
          ok.textContent = eq ? '✅ Puesto · Quitar' : 'Equipar';
          ok.addEventListener('click', () => { if (eq) Weapons.unequip(); else Weapons.equip(w.id); this.render(); });
          row.appendChild(ok);
          card.appendChild(row);
        } else if (w.coin) {
          const b = document.createElement('button');
          b.className = 'shop2-btn';
          b.textContent = '🪙 Comprar ' + w.price;
          b.addEventListener('click', () => { Weapons.buyBasic(w.id); this.render(); });
          card.appendChild(b);
        } else {
          const b = document.createElement('button');
          b.className = 'shop2-btn shop2-btn-pay';
          b.textContent = '💳 Comprar';
          b.addEventListener('click', () => {
            this.payFlow('weapon', { id: w.id, name: w.name, price: w.price + ' USD', sku: w.sku },
              () => { try { Weapons.equip(w.id); } catch (e) {} this.render(); });
          });
          card.appendChild(b);
        }
        grid.appendChild(card);
      });
      body.appendChild(grid);
    } catch (e) {}
  },

  /* 🎫 PASES DE JUEGO: compra única, perks permanentes */
  _renderPasses(body) {
    const t = document.createElement('div');
    t.innerHTML = '<div class="shop2-secTitle">🎫 PASES — compra única, perks para siempre</div>' + this._payBanner();
    const grid = document.createElement('div');
    grid.className = 'shop2-grid';
    PREMIUM_PASSES.forEach(p => {
      const d = document.createElement('div');
      const owned = this.hasPass(p.id);
      d.className = 'shop2-item' + (owned ? ' owned' : '');
      d.innerHTML = '<span class="emoji">' + p.emoji + '</span><div class="pname">' + p.name + '</div>' +
        '<div class="pdesc">' + p.desc + '</div>' +
        '<div class="pprice">' + (owned ? T('shop2.owned') : p.price) + '</div>';
      if (!owned) {
        const bCode = document.createElement('button');
        bCode.className = 'shop2-btn shop2-btn-code';
        bCode.textContent = T('shop2.redeem');
        bCode.addEventListener('click', () => { this._tab = 'code'; this._pendingItem = { kind: 'pass', item: p }; this.render(); });
        const bPay = document.createElement('button');
        bPay.className = 'shop2-btn shop2-btn-pay';
        bPay.textContent = T('shop2.pay') + ' ' + p.price + (this._isLivePay() ? ' 💳' : ' · ' + T('shop2.demo'));
        bPay.addEventListener('click', () => this.payFlow('pass', p, () => this.render()));
        d.appendChild(bCode);
        d.appendChild(bPay);
      }
      grid.appendChild(d);
    });
    body.appendChild(t); body.appendChild(grid);
  },

  _pendingItem: null,
  _renderCode(body) {
    const t = document.createElement('div');
    let title = '🔑 ' + T('shop2.code');
    if (this._pendingItem) title += ' — ' + this._pendingItem.item.name;
    t.innerHTML = '<div class="shop2-secTitle">' + title + '</div>' +
      '<div class="pdesc" style="text-align:center;margin-bottom:6px">Escribe el código que te dio el dueño del juego.</div>';
    const row = document.createElement('div');
    row.className = 'shop2-codeRow';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = T('shop2.codePh'); // genérico: NUNCA se muestra el código real
    inp.autocomplete = 'off';
    const btn = document.createElement('button');
    btn.className = 'shop2-btn shop2-btn-ok';
    btn.style.width = 'auto';
    btn.textContent = T('shop2.redeem');
    const msg = document.createElement('div');
    msg.className = 'shop2-msg';
    btn.addEventListener('click', () => {
      const r = this.redeemCode(inp.value);
      msg.textContent = r.msg;
      msg.className = 'shop2-msg ' + (r.ok ? 'ok' : 'bad');
      inp.value = '';
      if (r.ok) { this._pendingItem = null; try { toast(r.msg); } catch (e) {} }
      this.render(); // refresca estados (∞ y todo desbloqueado)
    });
    row.appendChild(inp); row.appendChild(btn);
    body.appendChild(t); body.appendChild(row); body.appendChild(msg);
  },

  /* ---- envolturas de integración (no editan archivos existentes) ---- */
  _wrapAvatarHat() {
    try {
      if (typeof setAvatarHat !== 'function' || setAvatarHat.__shop2) return;
      const orig = setAvatarHat;
      const w = function (avatar, id) {
        let r;
        if (PREMIUM_OUTFITS.some(o => o.id === id)) {
          orig.call(this, avatar, 'none'); // limpia sombrero anterior
          Shop2.attachOutfit(avatar, id);  // dibuja la prenda premium
        } else {
          r = orig.call(this, avatar, id);
        }
        try { if (Shop2.hasPass('vip')) Shop2.attachCrown(avatar); } catch (e) {} // 👑 insignia VIP
        return r;
      };
      w.__shop2 = true;
      try { setAvatarHat = w; } catch (e) { try { window.setAvatarHat = w; } catch (_) {} }
    } catch (e) {}
  },
  _wrapPets() {
    try {
      // petId acepta también mascotas premium
      if (typeof petId === 'function' && !petId.__shop2) {
        const orig = petId;
        const w = function () {
          try {
            const p = SAVE.pet;
            if (PREMIUM_PETS.some(x => x.id === p)) return p;
          } catch (e) {}
          return orig();
        };
        w.__shop2 = true;
        try { petId = w; } catch (e) { try { window.petId = w; } catch (_) {} }
      }
      // Pets.onLevelStart construye la mascota premium si está elegida
      if (typeof Pets !== 'undefined' && Pets && typeof Pets.onLevelStart === 'function' && !Pets.onLevelStart.__shop2) {
        const origStart = Pets.onLevelStart;
        const ws = function () {
          let pk = 'none';
          try { pk = SAVE.pet || 'none'; } catch (e) {}
          const prem = PREMIUM_PETS.find(x => x.id === pk);
          if (!prem) return origStart.call(Pets);
          try {
            if (typeof petGroup !== 'undefined' && petGroup) {
              try { scene.remove(petGroup); } catch (e) {}
              try { if (typeof disposeGroup === 'function') disposeGroup(petGroup); } catch (e) {}
            }
            petGroup = new THREE.Group();
            const inner = Shop2.buildPetMesh(pk);
            if (!inner) return origStart.call(Pets);
            petGroup.add(inner);
            petGroup.userData.inner = inner;
            const lbl = Shop2.buildPetLabelPremium(pk);
            if (lbl) petGroup.add(lbl);
            try {
              const fx = Math.sin(Player.heading), fz = Math.cos(Player.heading);
              petGroup.position.set(Player.pos.x - fx * 1.6, Player.pos.y, Player.pos.z - fz * 1.6);
              petGroup.rotation.y = Player.heading;
            } catch (e) {}
            scene.add(petGroup);
          } catch (e) {}
        };
        ws.__shop2 = true;
        Pets.onLevelStart = ws;
      }
    } catch (e) {}
  },
};

/* exponer globales */
try {
  if (typeof window !== 'undefined') {
    window.Shop2 = Shop2;
    window.Billing = Billing;
    window.Ads = Ads;
    window.FAMILY_CODE = undefined; // el código NO se expone en window
  }
} catch (e) {}
if (typeof globalThis !== 'undefined') {
  try { globalThis.Shop2 = Shop2; globalThis.Billing = Billing; globalThis.Ads = Ads; } catch (e) {}
}
