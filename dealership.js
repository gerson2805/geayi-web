/* ============================================================================
   dealership.js — 🚗 TIENDA DE CARROS GEAYI (Immokalee, mundo idx 3)
   Diseños 100% ORIGINALES, marca GEAYI. Nada de marcas reales ni personajes
   copiados (regla permanente del juego).

   Módulo global: Dealership. Script plano, sin módulos: todo global.
   UI en español + inglés (addStrings), botones grandes táctiles (≥52px),
   DOM liviano para Android. Todo a nivel del suelo, sin saltos.

   Catálogo (60 carros: 5 modelos × 12 colores, para que la gente se dé gusto
   ELIGIENDO):
   - Trotador GEAYI (800 🪙), Campestre GEAYI (1500 🪙), Veloz GT GEAYI
     (2500 🪙): se compran con monedas del juego.
   - Diamante GT y Fénix Imperial (8000 🪙, premium): cada tarjeta de lujo
     muestra los DOS botones "🔑 Activar con código" y "💳 Pagar" (modo DEMO,
     sin pagos reales), como las tarjetas de monetiza.js.
     El código es la constante FAMILY_CODE de monetiza.js; la UI solo dice
     "Escribe tu código" de forma genérica: el valor NUNCA se muestra.
   Los ids originales ('dl_trotador' etc.) se conservan como la variante base
   de cada modelo, para no romper SAVE.ownedDealerCars ya guardados.

   Persistencia: SAVE.ownedDealerCars (array de ids). Los carros propios
   aparecen MANEJABLES en el lote cada vez que se entra a Immokalee
   (registrados en lvl.cars con kind:'car', como addCar() de vehicles.js).

   INTEGRACIÓN (la hace el padre, no este archivo):
   1. index.html: <script src="dealership.js"></script> DESPUÉS de monetiza.js
      y ANTES de game.js.
   2. boot(): if (typeof Dealership!=='undefined') Dealership.init();
   3. startLevel(i): tras LEVEL = buildLevel(i);
      if (typeof Dealership!=='undefined') Dealership.buildForLevel(i, LEVEL.group);
   4. loop(): if (typeof Dealership!=='undefined' && typeof Dealership.update==='function') Dealership.update(dt);
   ========================================================================== */
'use strict';

/* ---------------- i18n (es + en, patrón de jobs.js / monetiza.js) ------- */
try {
  if (typeof addStrings === 'function') {
    addStrings('es', {
      'dealer.title': '🚗 TIENDA DE CARROS GEAYI',
      'dealer.subtitle': 'Diseños originales · 100% eléctricos',
      'dealer.close': 'Cerrar',
      'dealer.coins': 'Monedas',
      'dealer.buy': 'Comprar',
      'dealer.pay': '💳 Pagar',
      'dealer.redeem': '🔑 Activar con código',
      'dealer.demo': 'DEMO',
      'dealer.owned': '✅ Tuyo',
      'dealer.codeTitle': '🔑 Código',
      'dealer.codeHint': 'Escribe el código que te dio el dueño del juego.',
      'dealer.codePh': 'Escribe tu código',
      'dealer.codeOk': '✅ ¡Código aceptado! Carro desbloqueado.',
      'dealer.codeBad': '❌ Código no válido.',
      'dealer.noCoins': '❌ No tienes monedas suficientes.',
      'dealer.bought': '✅ ¡Carro comprado! Búscalo en la tienda de Immokalee.',
      'dealer.paid': '✅ ¡Pago demo confirmado! Carro desbloqueado.',
      'dealer.payTitle': '💳 Pagar (demo)',
      'dealer.payBody': 'Pago SIMULADO: no se cobra nada real.',
      'dealer.confirm': 'Confirmar',
      'dealer.cancel': 'Cancelar',
      'dealer.note': 'Los carros que compres aparecen manejables en el lote de Immokalee. La tienda abre en el menú lateral (🚗).',
      'dealer.lotSign': 'TIENDA DE CARROS GEAYI',
      'dealer.lotSub': '¡Compra y maneja!',
      'dealer.n.trotador': 'Trotador GEAYI',
      'dealer.d.trotador': 'Compacto urbano ágil y económico.',
      'dealer.n.campestre': 'Campestre GEAYI',
      'dealer.d.campestre': 'Troca con caja, lista para el trabajo.',
      'dealer.n.veloz': 'Veloz GT GEAYI',
      'dealer.d.veloz': 'Deportivo bajo con alerón de carreras.',
      'dealer.n.diamante': 'Diamante GT',
      'dealer.d.diamante': 'Coupé de lujo plateado con detalles dorados.',
      'dealer.n.fenix': 'Fénix Imperial',
      'dealer.d.fenix': 'Gran turismo negro con línea dorada exclusiva.',
      'dealer.c.rojo': 'Rojo', 'dealer.c.azul': 'Azul', 'dealer.c.verde': 'Verde',
      'dealer.c.amarillo': 'Amarillo', 'dealer.c.naranja': 'Naranja', 'dealer.c.morado': 'Morado',
      'dealer.c.rosa': 'Rosa', 'dealer.c.blanco': 'Blanco', 'dealer.c.negro': 'Negro',
      'dealer.c.gris': 'Gris', 'dealer.c.celeste': 'Celeste', 'dealer.c.dorado': 'Dorado',
      'dealer.c.plata': 'Plata',
    });
    addStrings('en', {
      'dealer.title': '🚗 GEAYI CAR DEALERSHIP',
      'dealer.subtitle': 'Original designs · 100% electric',
      'dealer.close': 'Close',
      'dealer.coins': 'Coins',
      'dealer.buy': 'Buy',
      'dealer.pay': '💳 Pay',
      'dealer.redeem': '🔑 Redeem code',
      'dealer.demo': 'DEMO',
      'dealer.owned': '✅ Yours',
      'dealer.codeTitle': '🔑 Code',
      'dealer.codeHint': 'Type the code the game owner gave you.',
      'dealer.codePh': 'Type your code',
      'dealer.codeOk': '✅ Code accepted! Car unlocked.',
      'dealer.codeBad': '❌ Invalid code.',
      'dealer.noCoins': '❌ Not enough coins.',
      'dealer.bought': '✅ Car bought! Find it at the Immokalee dealership.',
      'dealer.paid': '✅ Demo payment confirmed! Car unlocked.',
      'dealer.payTitle': '💳 Pay (demo)',
      'dealer.payBody': 'SIMULATED payment: nothing is really charged.',
      'dealer.confirm': 'Confirm',
      'dealer.cancel': 'Cancel',
      'dealer.note': 'Cars you buy show up drivable at the Immokalee lot. Open the shop from the side menu (🚗).',
      'dealer.lotSign': 'GEAYI CAR DEALERSHIP',
      'dealer.lotSub': 'Buy and drive!',
      'dealer.n.trotador': 'GEAYI Trotter',
      'dealer.d.trotador': 'Nimble, affordable city compact.',
      'dealer.n.campestre': 'GEAYI Country',
      'dealer.d.campestre': 'Pickup with bed, ready for work.',
      'dealer.n.veloz': 'GEAYI Veloz GT',
      'dealer.d.veloz': 'Low sports car with racing spoiler.',
      'dealer.n.diamante': 'Diamond GT',
      'dealer.d.diamante': 'Silver luxury coupe with gold trim.',
      'dealer.n.fenix': 'Imperial Phoenix',
      'dealer.d.fenix': 'Black grand tourer with exclusive gold line.',
      'dealer.c.rojo': 'Red', 'dealer.c.azul': 'Blue', 'dealer.c.verde': 'Green',
      'dealer.c.amarillo': 'Yellow', 'dealer.c.naranja': 'Orange', 'dealer.c.morado': 'Purple',
      'dealer.c.rosa': 'Pink', 'dealer.c.blanco': 'White', 'dealer.c.negro': 'Black',
      'dealer.c.gris': 'Gray', 'dealer.c.celeste': 'Sky Blue', 'dealer.c.dorado': 'Gold',
      'dealer.c.plata': 'Silver',
    });
  }
} catch (e) {}

/* ---------------- catálogo (diseños originales GEAYI) --------------------
   60 carros = 5 modelos × 12 colores. Cada entrada lleva `model` (la forma 3D)
   y `colorKey` (nombre del color para la UI). Los ids originales ('dl_trotador',
   'dl_campestre', 'dl_veloz', 'dl_diamante', 'dl_fenix') se conservan como la
   variante base de su modelo (con su color original), así SAVE.ownedDealerCars
   ya guardados siguen funcionando. */
const DEALER_MODELS = {
  trotador:  { emoji: '🚗',  nameKey: 'dealer.n.trotador',  descKey: 'dealer.d.trotador',  coins: 800,  premium: false },
  campestre: { emoji: '🛻',  nameKey: 'dealer.n.campestre', descKey: 'dealer.d.campestre', coins: 1500, premium: false },
  veloz:     { emoji: '🏎️', nameKey: 'dealer.n.veloz',     descKey: 'dealer.d.veloz',     coins: 2500, premium: false },
  diamante:  { emoji: '💎',  nameKey: 'dealer.n.diamante',  descKey: 'dealer.d.diamante',  coins: 8000, premium: true },
  fenix:     { emoji: '🔥',  nameKey: 'dealer.n.fenix',     descKey: 'dealer.d.fenix',     coins: 8000, premium: true },
};
/* 12 colores originales por modelo (nombres 100% genéricos, sin marcas) */
const DEALER_COLORS = [
  { key: 'rojo',     c: 0xe63b3b },
  { key: 'azul',     c: 0x00a2ff },
  { key: 'verde',    c: 0x59d867 },
  { key: 'amarillo', c: 0xffd23f },
  { key: 'naranja',  c: 0xff7a1a },
  { key: 'morado',   c: 0x7b2fff },
  { key: 'rosa',     c: 0xff2fd6 },
  { key: 'blanco',   c: 0xf2f4f8 },
  { key: 'negro',    c: 0x23262e },
  { key: 'gris',     c: 0x8a8f9a },
  { key: 'celeste',  c: 0x2fd6ff },
  { key: 'dorado',   c: 0xffb300 },
];
/* Diamante GT: misma docena pero con 'plata' (su color original) en vez de 'gris' */
const DEALER_COLORS_DIAMANTE = [
  { key: 'rojo',     c: 0xe63b3b },
  { key: 'azul',     c: 0x00a2ff },
  { key: 'verde',    c: 0x59d867 },
  { key: 'amarillo', c: 0xffd23f },
  { key: 'naranja',  c: 0xff7a1a },
  { key: 'morado',   c: 0x7b2fff },
  { key: 'rosa',     c: 0xff2fd6 },
  { key: 'blanco',   c: 0xf2f4f8 },
  { key: 'negro',    c: 0x23262e },
  { key: 'plata',    c: 0xd9dee8 },
  { key: 'celeste',  c: 0x2fd6ff },
  { key: 'dorado',   c: 0xffb300 },
];
/* color base de cada modelo = el color original de su id clásico */
const DEALER_BASE_COLOR = { trotador: 'azul', campestre: 'verde', veloz: 'rojo', diamante: 'plata', fenix: 'negro' };
const DEALER_BASE_ID = { trotador: 'dl_trotador', campestre: 'dl_campestre', veloz: 'dl_veloz', diamante: 'dl_diamante', fenix: 'dl_fenix' };

const DEALER_CARS = [];
(function buildDealerCatalog() {
  Object.keys(DEALER_MODELS).forEach(function (model) {
    const m = DEALER_MODELS[model];
    const colors = (model === 'diamante') ? DEALER_COLORS_DIAMANTE : DEALER_COLORS;
    colors.forEach(function (col) {
      const isBase = (col.key === DEALER_BASE_COLOR[model]);
      const id = isBase ? DEALER_BASE_ID[model] : ('dl_' + model + '_' + col.key);
      const entry = {
        id: id, model: model, emoji: m.emoji,
        nameKey: m.nameKey, colorKey: 'dealer.c.' + col.key, descKey: m.descKey,
        coins: m.coins, color: col.c, premium: !!m.premium,
      };
      if (m.premium) entry.sku = 'geayi_dealer_' + id; // flujo premium por variante
      DEALER_CARS.push(entry);
    });
  });
})();

/* Lote en Immokalee: rectángulo libre de 30×24 verificado sin edificios
   ni puentes (puentes en (0,17) y (0,90); traila Tamps en (-16,44)). */
const DEALER_LOT = { x: -30, z: 128, w: 30, d: 24 };

const Dealership = {
  _inited: false,
  _view: 'list',   // 'list' | { code: <carId> }
  _spin: [],       // vitrinas giratorias {mesh, speed}

  /* ---------------- guardado ---------------- */
  ensureSave() {
    try {
      if (!SAVE) return;
      if (!Array.isArray(SAVE.ownedDealerCars)) SAVE.ownedDealerCars = [];
    } catch (e) {}
  },
  owns(id) {
    try { this.ensureSave(); return SAVE.ownedDealerCars.indexOf(id) !== -1; }
    catch (e) { return false; }
  },
  _unlock(id) {
    this.ensureSave();
    if (SAVE.ownedDealerCars.indexOf(id) === -1) {
      SAVE.ownedDealerCars.push(id);
      try { persist(); } catch (e) {}
    }
  },
  coinsText() {
    try {
      if (typeof Shop2 !== 'undefined' && typeof Shop2.coinsText === 'function') return Shop2.coinsText();
      return String(SAVE.coins);
    } catch (e) { return '0'; }
  },
  /* nombre visible: "Modelo Color" (ej "Trotador GEAYI Rojo", "Veloz GT GEAYI Azul") */
  carName(def) {
    try {
      if (!def) return '';
      const base = T(def.nameKey);
      const col = def.colorKey ? T(def.colorKey) : '';
      return col ? (base + ' ' + col) : base;
    } catch (e) { return def && def.id ? def.id : ''; }
  },

  /* ---------------- compras ---------------- */
  buyWithCoins(id) {
    this.ensureSave();
    const def = DEALER_CARS.find(c => c.id === id);
    if (!def) return { ok: false, msg: T('dealer.codeBad') };
    if (this.owns(id)) return { ok: false, msg: T('dealer.owned') };
    let paid = false;
    try {
      if (typeof Shop2 !== 'undefined' && typeof Shop2.spendCoins === 'function') {
        paid = !!Shop2.spendCoins(def.coins); // respeta ∞ del código familiar
      } else if (SAVE.coins >= def.coins) {
        SAVE.coins -= def.coins; paid = true;
      }
    } catch (e) {}
    if (!paid) {
      try { if (typeof Audio2 !== 'undefined') Audio2.deny(); } catch (e) {}
      return { ok: false, msg: T('dealer.noCoins') };
    }
    this._unlock(id);
    try { if (typeof toast === 'function') toast(T('dealer.bought')); } catch (e) {}
    try { if (typeof Shop2 !== 'undefined' && Shop2.refreshCoinLabels) Shop2.refreshCoinLabels(); } catch (e) {}
    return { ok: true, msg: T('dealer.bought') };
  },

  /* Flujo premium con código: genérico; el valor real (FAMILY_CODE) solo se
     compara internamente y NUNCA aparece en la UI. */
  redeemCodeFor(code, id) {
    this.ensureSave();
    const c = String(code == null ? '' : code).trim();
    if (!c) return { ok: false, msg: T('dealer.codeBad') };
    let ok = false;
    try {
      if (typeof Shop2 !== 'undefined' && typeof Shop2.redeemCode === 'function') {
        const r = Shop2.redeemCode(c); // mismo código familiar de la tienda
        ok = !!(r && r.ok);
      } else if (typeof FAMILY_CODE !== 'undefined') {
        ok = (c === FAMILY_CODE);
      }
    } catch (e) {}
    if (!ok) return { ok: false, msg: T('dealer.codeBad') };
    const def = DEALER_CARS.find(x => x.id === id);
    if (def && def.premium) this._unlock(id); // el código desbloquea el carro de lujo
    try { if (typeof Shop2 !== 'undefined' && Shop2.refreshCoinLabels) Shop2.refreshCoinLabels(); } catch (e) {}
    return { ok: true, msg: T('dealer.codeOk') };
  },

  /* Pago demo (sin cargos reales): usa Billing si existe, si no entrega directo. */
  async payDemo(id) {
    this.ensureSave();
    const def = DEALER_CARS.find(c => c.id === id);
    if (!def || !def.premium) return { ok: false, msg: T('dealer.codeBad') };
    if (this.owns(id)) return { ok: false, msg: T('dealer.owned') };
    try {
      if (typeof Billing !== 'undefined' && typeof Billing.buy === 'function') {
        const r = await Billing.buy(def.sku || ('geayi_dealer_' + id));
        if (!(r && r.ok)) return { ok: false, msg: T('dealer.codeBad') };
      }
    } catch (e) {}
    this._unlock(id);
    try { if (typeof toast === 'function') toast(T('dealer.paid')); } catch (e) {}
    return { ok: true, msg: T('dealer.paid') };
  },

  /* ================================================================== */
  /* 3D — constructores originales con caché (rendimiento Android)       */
  /* ================================================================== */
  _geo: {},
  _mat: {},
  dGeo(key, make) {
    if (!this._geo[key]) this._geo[key] = make();
    return this._geo[key];
  },
  dMat(color, emissive, ei) {
    const k = color + '|' + (emissive || 0) + '|' + (ei || 0);
    if (!this._mat[k]) {
      this._mat[k] = new THREE.MeshStandardMaterial({
        color: color, roughness: 0.55, metalness: 0.25,
        emissive: emissive || 0x000000, emissiveIntensity: ei || 0
      });
    }
    return this._mat[k];
  },
  /* caja de bloques: geometría cacheada por dimensiones */
  dbx(g, w, h, d, color, x, y, z, emissive, ei) {
    const geo = this.dGeo('b' + w + 'x' + h + 'x' + d, () => new THREE.BoxGeometry(w, h, d));
    const m = new THREE.Mesh(geo, this.dMat(color, emissive, ei));
    m.position.set(x, y, z); m.castShadow = true;
    g.add(m); return m;
  },
  /* llanta de bloques: cilindro cacheado */
  wheel(g, r, wd, color, x, y, z) {
    const geo = this.dGeo('w' + r + 'x' + wd, () => new THREE.CylinderGeometry(r, r, wd, 12));
    const m = new THREE.Mesh(geo, this.dMat(color || 0x1c1c22));
    m.rotation.z = Math.PI / 2; m.position.set(x, y, z); m.castShadow = true;
    g.add(m); return m;
  },

  /* Carros 100% originales de bloques, marca GEAYI (insignia eléctrica). */
  buildDealerMesh(id) {
    try {
      if (typeof THREE === 'undefined') return null;
      const g = new THREE.Group();
      const glass = 0x9fd8ff, dark = 0x2b2f3a, gold = 0xffd23f;
      const W = (x, y, z, r, wd) => this.wheel(g, r == null ? 0.36 : r, wd || 0.3, 0x1c1c22, x, y, z);
      const def = DEALER_CARS.find(c => c.id === id);
      const col = def ? def.color : 0x00a2ff;
      const model = def ? def.model : 'trotador'; // la FORMA depende del modelo, el color de la variante

      if (model === 'trotador') {
        // Trotador: compacto urbano de 2 volúmenes
        this.dbx(g, 1.6, 0.6, 2.9, col, 0, 0.66, 0);
        this.dbx(g, 1.34, 0.52, 1.4, glass, 0, 1.2, -0.2, glass, 0.25);
        this.dbx(g, 1.42, 0.1, 1.5, col, 0, 1.5, -0.2);
        this.dbx(g, 1.64, 0.16, 2.94, dark, 0, 0.4, 0);
        this.dbx(g, 0.3, 0.2, 0.08, 0xfff6b0, -0.5, 0.68, 1.46, 0xffe95e, 0.9);
        this.dbx(g, 0.3, 0.2, 0.08, 0xfff6b0, 0.5, 0.68, 1.46, 0xffe95e, 0.9);
        this.dbx(g, 0.28, 0.2, 0.08, 0xff3d5e, -0.5, 0.68, -1.46, 0xff3d5e, 0.8);
        this.dbx(g, 0.28, 0.2, 0.08, 0xff3d5e, 0.5, 0.68, -1.46, 0xff3d5e, 0.8);
        W(-0.85, 0.36, 0.95); W(0.85, 0.36, 0.95); W(-0.85, 0.36, -0.95); W(0.85, 0.36, -0.95);
      } else if (model === 'campestre') {
        // Campestre: troca con caja abierta
        this.dbx(g, 1.7, 0.62, 3.4, col, 0, 0.68, 0);
        this.dbx(g, 1.5, 0.55, 1.15, glass, 0, 1.25, 0.75, glass, 0.25); // cabina al frente
        this.dbx(g, 1.56, 0.12, 1.25, col, 0, 1.58, 0.75);
        this.dbx(g, 1.7, 0.5, 0.12, col, 0, 1.15, -1.6);                  // tapa de caja
        this.dbx(g, 0.12, 0.5, 1.6, col, -0.85, 1.15, -0.85);             // laterales de caja
        this.dbx(g, 0.12, 0.5, 1.6, col, 0.85, 1.15, -0.85);
        this.dbx(g, 1.74, 0.18, 3.44, dark, 0, 0.42, 0);
        this.dbx(g, 0.3, 0.22, 0.08, 0xfff6b0, -0.52, 0.7, 1.72, 0xffe95e, 0.9);
        this.dbx(g, 0.3, 0.22, 0.08, 0xfff6b0, 0.52, 0.7, 1.72, 0xffe95e, 0.9);
        this.dbx(g, 0.3, 0.22, 0.08, 0xff3d5e, -0.52, 0.7, -1.72, 0xff3d5e, 0.8);
        this.dbx(g, 0.3, 0.22, 0.08, 0xff3d5e, 0.52, 0.7, -1.72, 0xff3d5e, 0.8);
        W(-0.9, 0.4, 1.1, 0.4, 0.32); W(0.9, 0.4, 1.1, 0.4, 0.32);
        W(-0.9, 0.4, -1.1, 0.4, 0.32); W(0.9, 0.4, -1.1, 0.4, 0.32);
      } else if (model === 'veloz') {
        // Veloz GT: deportivo bajo con alerón
        this.dbx(g, 1.7, 0.45, 3.3, col, 0, 0.55, 0);
        this.dbx(g, 1.2, 0.4, 1.3, glass, 0, 0.95, -0.3, glass, 0.3);
        this.dbx(g, 0.08, 0.35, 0.5, col, -0.5, 0.95, 1.35);              // faldones del alerón
        this.dbx(g, 0.08, 0.35, 0.5, col, 0.5, 0.95, 1.35);
        this.dbx(g, 1.5, 0.1, 0.45, col, 0, 1.15, -1.45, col, 0.4);       // alerón
        this.dbx(g, 1.74, 0.14, 3.34, dark, 0, 0.36, 0);
        this.dbx(g, 0.34, 0.16, 0.08, 0xfff6b0, -0.52, 0.55, 1.66, 0xffe95e, 1);
        this.dbx(g, 0.34, 0.16, 0.08, 0xfff6b0, 0.52, 0.55, 1.66, 0xffe95e, 1);
        this.dbx(g, 1.2, 0.12, 0.08, 0xff3d5e, 0, 0.62, -1.66, 0xff3d5e, 1); // barra trasera
        W(-0.88, 0.32, 1.05, 0.32, 0.34); W(0.88, 0.32, 1.05, 0.32, 0.34);
        W(-0.88, 0.32, -1.05, 0.34, 0.36); W(0.88, 0.32, -1.05, 0.34, 0.36);
      } else if (model === 'diamante') {
        // Diamante GT: coupé de lujo largo, plateado + oro
        this.dbx(g, 1.8, 0.55, 4.2, col, 0, 0.62, 0, col, 0.15);
        this.dbx(g, 1.44, 0.5, 1.9, glass, 0, 1.12, -0.2, glass, 0.35);
        this.dbx(g, 1.5, 0.1, 2.0, col, 0, 1.4, -0.2);
        this.dbx(g, 1.84, 0.12, 4.24, gold, 0, 0.42, 0, gold, 0.5);        // línea dorada
        this.dbx(g, 1.84, 0.16, 4.24, dark, 0, 0.32, 0);
        this.dbx(g, 0.34, 0.2, 0.08, 0xfff6b0, -0.55, 0.62, 2.11, 0xffe95e, 1);
        this.dbx(g, 0.34, 0.2, 0.08, 0xfff6b0, 0.55, 0.62, 2.11, 0xffe95e, 1);
        this.dbx(g, 1.3, 0.14, 0.08, 0xff3d5e, 0, 0.66, -2.11, 0xff3d5e, 1);
        this.dbx(g, 0.1, 0.5, 0.1, gold, -0.8, 1.2, 0.6, gold, 0.6);       // aletas doradas
        this.dbx(g, 0.1, 0.5, 0.1, gold, 0.8, 1.2, 0.6, gold, 0.6);
        W(-0.92, 0.38, 1.35, 0.38, 0.34); W(0.92, 0.38, 1.35, 0.38, 0.34);
        W(-0.92, 0.38, -1.35, 0.38, 0.34); W(0.92, 0.38, -1.35, 0.38, 0.34);
      } else if (model === 'fenix') {
        // Fénix Imperial: gran turismo negro con franja dorada y aletas
        this.dbx(g, 1.85, 0.6, 4.4, col, 0, 0.64, 0);
        this.dbx(g, 1.46, 0.52, 2.0, glass, 0, 1.18, -0.3, glass, 0.35);
        this.dbx(g, 1.52, 0.12, 2.1, col, 0, 1.5, -0.3);
        this.dbx(g, 0.3, 0.1, 4.3, gold, 0, 0.95, 0, gold, 0.7);           // franja central dorada
        this.dbx(g, 1.89, 0.14, 4.44, dark, 0, 0.38, 0);
        this.dbx(g, 0.36, 0.2, 0.08, 0xe8f6ff, -0.56, 0.66, 2.21, 0x9fd8ff, 1); // faros hielo
        this.dbx(g, 0.36, 0.2, 0.08, 0xe8f6ff, 0.56, 0.66, 2.21, 0x9fd8ff, 1);
        this.dbx(g, 1.35, 0.16, 0.08, 0xff6a00, 0, 0.7, -2.21, 0xff6a00, 1);   // barra fuego
        this.dbx(g, 0.5, 0.28, 0.08, gold, -0.45, 1.0, -2.2, gold, 0.6);       // aletas traseras
        this.dbx(g, 0.5, 0.28, 0.08, gold, 0.45, 1.0, -2.2, gold, 0.6);
        W(-0.94, 0.4, 1.4, 0.4, 0.36); W(0.94, 0.4, 1.4, 0.4, 0.36);
        W(-0.94, 0.4, -1.4, 0.4, 0.36); W(0.94, 0.4, -1.4, 0.4, 0.36);
      } else {
        return null;
      }
      // insignia GEAYI eléctrica (vehicles.js) al frente
      try {
        if (typeof addGeayiBadge === 'function') addGeayiBadge(g, 0, 1.05, 1.72, 0, 0.8, 0.3);
      } catch (e) {}
      g.userData.dealerCar = id;
      return g;
    } catch (e) { return null; }
  },

  /* Registra el carro del catálogo en el nivel como MANEJABLE
     (mismo formato que addCar(): kind 'car' en lvl.cars). */
  addDealerCar(lvl, id, x, y, z, drivable, heading) {
    try {
      const group = (lvl && lvl.group) ? lvl.group : lvl;
      if (!group) return null;
      const mesh = this.buildDealerMesh(id);
      if (!mesh) return null;
      mesh.position.set(x, y || 0, z);
      mesh.rotation.y = heading || 0;
      group.add(mesh);
      if (drivable) {
        let cars = (lvl && lvl.cars) ? lvl.cars : null;
        if (!cars && typeof LEVEL !== 'undefined' && LEVEL && LEVEL.cars) cars = LEVEL.cars;
        if (cars) cars.push({ kind: 'car', vtype: 'dealer-' + id, x, y: y || 0, z, mesh, taken: false, heading: heading || 0, dealer: id });
      }
      return mesh;
    } catch (e) { return null; }
  },

  /* ================================================================== */
  /* Lote 3D en Immokalee (idx 3): letrero, barda, techo y exhibición    */
  /* ================================================================== */
  buildForLevel(i, lvlOrGroup) {
    if (i !== 3) return; // la tienda solo existe en Immokalee
    try {
      if (typeof THREE === 'undefined') return;
      const lvl = (lvlOrGroup && lvlOrGroup.group) ? lvlOrGroup : null;
      const group = lvl ? lvl.group : lvlOrGroup;
      if (!group) return;
      this._spin = [];
      const LX = DEALER_LOT.x, LZ = DEALER_LOT.z, W = DEALER_LOT.w, D = DEALER_LOT.d;

      /* piso del lote (losa visual delgada, a nivel del suelo) */
      const floor = new THREE.Mesh(
        this.dGeo('lotfloor', () => new THREE.BoxGeometry(W, 0.1, D)),
        this.dMat(0x3a4150));
      floor.position.set(LX, 0.0, LZ);
      floor.receiveShadow = true;
      group.add(floor);
      /* franja de entrada (amarilla) */
      const stripe = new THREE.Mesh(
        this.dGeo('lotstripe', () => new THREE.BoxGeometry(6, 0.12, 1.2)),
        this.dMat(0xffd23f, 0xffd23f, 0.3));
      stripe.position.set(LX, 0.01, LZ - D / 2 + 0.6);
      group.add(stripe);

      /* barda baja alrededor (postes + rieles), con hueco de entrada al norte */
      const postG = this.dGeo('lotpost', () => new THREE.BoxGeometry(0.22, 1.1, 0.22));
      const railX = this.dGeo('lotrailx', () => new THREE.BoxGeometry(3, 0.14, 0.14));
      const railZ = this.dGeo('lotrailz', () => new THREE.BoxGeometry(0.14, 0.14, 3));
      const postM = this.dMat(0x8a8f9a), railM = this.dMat(0x00e5ff, 0x00e5ff, 0.25);
      const x0 = LX - W / 2, x1 = LX + W / 2, z0 = LZ - D / 2, z1 = LZ + D / 2;
      const putPost = (x, z) => {
        const p = new THREE.Mesh(postG, postM); p.position.set(x, 0.55, z); group.add(p);
      };
      const putRailX = (x, z) => {
        const r = new THREE.Mesh(railX, railM); r.position.set(x, 0.85, z); group.add(r);
      };
      const putRailZ = (x, z) => {
        const r = new THREE.Mesh(railZ, railM); r.position.set(x, 0.85, z); group.add(r);
      };
      for (let x = x0; x <= x1 + 0.01; x += 3) {
        const inGap = Math.abs(x - LX) < 3.2; // entrada de 6 m al norte
        if (z0 != null && !inGap) { putPost(x, z0); if (x + 3 <= x1 + 0.01 && Math.abs(x + 1.5 - LX) >= 3.2) putRailX(x + 1.5, z0); }
        putPost(x, z1); if (x + 3 <= x1 + 0.01) putRailX(x + 1.5, z1);
      }
      for (let z = z0 + 3; z < z1; z += 3) {
        putPost(x0, z); putRailZ(x0, z - 1.5 + 1.5);
        putPost(x1, z); putRailZ(x1, z);
      }

      /* letrero 3D de doble cara: 🚗 TIENDA DE CARROS GEAYI */
      const signTex = (typeof canvasTex === 'function') ? canvasTex(1024, 224, (c, w, h) => {
        c.fillStyle = '#101828'; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#00e5ff'; c.lineWidth = 10; c.strokeRect(10, 10, w - 20, h - 20);
        c.textAlign = 'center';
        c.fillStyle = '#00e5ff'; c.font = '900 84px "Trebuchet MS", sans-serif';
        c.fillText('🚗 ' + T('dealer.lotSign'), w / 2, 108);
        c.fillStyle = '#ffd23f'; c.font = '700 52px "Trebuchet MS", sans-serif';
        c.fillText(T('dealer.lotSub'), w / 2, 178);
      }) : null;
      const poleG = this.dGeo('signpole', () => new THREE.CylinderGeometry(0.16, 0.16, 5.4, 10));
      [-4.6, 4.6].forEach(px => {
        const pole = new THREE.Mesh(poleG, this.dMat(0x8a8f9a));
        pole.position.set(LX + px, 2.7, z0 - 0.6); group.add(pole);
      });
      if (signTex && typeof doubleFaceSign === 'function') {
        const sign = doubleFaceSign(13, 2.85, signTex, LX, 6.2, z0 - 0.6, 0);
        sign.userData.dealerSign = true;
        group.add(sign);
      }

      /* techo de la zona de exhibición (4 postes + losa) */
      const cz = LZ + 5; // mitad sur del lote
      const cPoleG = this.dGeo('canopole', () => new THREE.CylinderGeometry(0.18, 0.18, 4.6, 10));
      [[-8, -5], [8, -5], [-8, 5], [8, 5]].forEach(([ox, oz]) => {
        const p = new THREE.Mesh(cPoleG, this.dMat(0x3949ab));
        p.position.set(LX + ox, 2.3, cz + oz); p.castShadow = true; group.add(p);
      });
      const roof = new THREE.Mesh(
        this.dGeo('canoroof', () => new THREE.BoxGeometry(18, 0.35, 12)),
        this.dMat(0x141a36, 0x00e5ff, 0.12));
      roof.position.set(LX, 4.75, cz); roof.castShadow = true; group.add(roof);

      /* exhibición: 3 filas × 6 carros (18) + vitrina giratoria (19 en total).
         Mezcla de los 5 modelos en varios colores, para que se vea la variedad.
         Fila A/B bajo el techo (carros cortos: z libre de los postes en z=128/138);
         fila C al aire libre (los largos: diamante/fénix). */
      const colX = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
      const rowA = ['dl_trotador', 'dl_trotador_rojo', 'dl_trotador_verde',
                    'dl_trotador_amarillo', 'dl_trotador_morado', 'dl_trotador_celeste'];
      const rowB = ['dl_campestre', 'dl_campestre_rojo', 'dl_campestre_azul',
                    'dl_veloz', 'dl_veloz_azul', 'dl_veloz_verde'];
      const rowC = ['dl_diamante_azul', 'dl_diamante_dorado', 'dl_fenix',
                    'dl_fenix_rojo', 'dl_fenix_azul', 'dl_fenix_blanco'];
      const rows = [
        { ids: rowA, z: LZ + 8 },    // 136: bajo techo, lado sur
        { ids: rowB, z: LZ + 2.5 },  // 130.5: bajo techo, lado norte
        { ids: rowC, z: LZ - 4 },    // 124: al aire libre
      ];
      const self = this;
      rows.forEach(function (row) {
        row.ids.forEach(function (cid, k) {
          const mesh = self.buildDealerMesh(cid);
          if (!mesh) return;
          mesh.position.set(LX + colX[k], 0.06, row.z);
          mesh.rotation.y = Math.PI; // de frente a la entrada
          group.add(mesh);
          mesh.userData.dealerDisplay = cid;
        });
      });
      /* vitrina giratoria estrella: Diamante GT plata (id clásico) al este del techo */
      (function () {
        const mesh = self.buildDealerMesh('dl_diamante');
        if (!mesh) return;
        const disc = new THREE.Mesh(
          self.dGeo('turntable', () => new THREE.CylinderGeometry(2.4, 2.4, 0.25, 24)),
          self.dMat(0x2b2f4a, 0x00e5ff, 0.35));
        disc.position.set(LX + 11, 0.12, LZ + 5); group.add(disc);
        mesh.position.set(LX + 11, 0.25, LZ + 5);
        group.add(mesh);
        mesh.userData.dealerDisplay = 'dl_diamante';
        self._spin.push({ mesh: mesh, speed: 0.5 });
      })();

      /* carros PROPIOS: manejables cerca de la entrada (fila compacta, máx 10) */
      this.ensureSave();
      const owned = SAVE.ownedDealerCars.filter(id => DEALER_CARS.some(c => c.id === id));
      owned.slice(0, 10).forEach((id, k) => {
        const ox = LX - 13.05 + k * 2.9;
        const oz = LZ - 8.5;
        this.addDealerCar(lvlOrGroup, id, ox, 0, oz, true, Math.PI / 2);
      });
    } catch (e) {}
  },

  /* vitrinas giratorias */
  update(dt) {
    try {
      if (!this._spin || !this._spin.length) return;
      this._spin.forEach(s => { if (s.mesh) s.mesh.rotation.y += s.speed * dt; });
    } catch (e) {}
  },

  /* ================================================================== */
  /* UI táctil                                                          */
  /* ================================================================== */
  init() {
    if (this._inited) return;
    this._inited = true;
    this.ensureSave();
    if (typeof document === 'undefined') return;
    try {
      if (!document.getElementById('dlr-css')) {
        const st = document.createElement('style');
        st.id = 'dlr-css';
        st.textContent =
          '.dlr-ov{position:fixed;inset:0;z-index:9990;display:flex;align-items:center;justify-content:center;background:rgba(5,1,15,.78);padding:12px}' +
          '.dlr-card{background:#141a36;border:2px solid #00e5ff;border-radius:18px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column;color:#fff;box-shadow:0 0 30px #00e5ff55}' +
          '.dlr-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #3949ab}' +
          '.dlr-head h2{margin:0;font-size:20px;flex:1}' +
          '.dlr-coins{background:#0a0e24;border:1px solid #ffd23f;border-radius:12px;padding:6px 12px;font-weight:bold;color:#ffd23f}' +
          '.dlr-x{background:#ff3b5c;border:none;color:#fff;border-radius:10px;font-size:18px;min-width:52px;min-height:52px;cursor:pointer}' +
          '.dlr-sub{padding:8px 14px 0;color:#aab;font-size:13px}' +
          '.dlr-body{padding:12px;overflow-y:auto}' +
          '.dlr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}' +
          '.dlr-item{background:#1a2040;border:2px solid #3949ab;border-radius:14px;padding:12px 8px;text-align:center}' +
          '.dlr-item .emoji{font-size:40px;display:block}' +
          '.dlr-item .pname{font-weight:bold;margin:6px 0;font-size:15px}' +
          '.dlr-item .pdesc{font-size:12px;color:#aab;min-height:30px}' +
          '.dlr-item .pprice{color:#ffd23f;font-weight:bold;margin:6px 0}' +
          '.dlr-item.owned{border-color:#00e676}' +
          '.dlr-item.lux{border-color:#ffd23f}' +
          '.dlr-btn{display:block;width:100%;margin-top:8px;border:none;border-radius:12px;padding:12px;font-size:15px;font-weight:bold;cursor:pointer;min-height:52px}' +
          '.dlr-btn-buy{background:linear-gradient(135deg,#00c2a8,#00a2ff);color:#fff}' +
          '.dlr-btn-pay{background:linear-gradient(135deg,#7b2fff,#00a2ff);color:#fff}' +
          '.dlr-btn-code{background:#2b2f4a;color:#ffe95e;border:2px solid #ffe95e}' +
          '.dlr-btn-ok{background:#00e676;color:#06281a}' +
          '.dlr-btn-no{background:#3949ab;color:#fff}' +
          '.dlr-btn:active{transform:scale(.96)}' +
          '.dlr-demo{background:#ff9d00;color:#201100;font-size:11px;font-weight:bold;border-radius:8px;padding:2px 8px}' +
          '.dlr-codeRow{display:flex;gap:8px;margin:12px 0}' +
          '.dlr-codeRow input{flex:1;font-size:18px;padding:12px;border-radius:12px;border:2px solid #3949ab;background:#0a0e24;color:#fff;min-height:52px}' +
          '.dlr-msg{text-align:center;font-size:16px;font-weight:bold;margin:10px 0;min-height:24px}' +
          '.dlr-msg.ok{color:#00e676}.dlr-msg.bad{color:#ff5f6e}' +
          '.dlr-note{font-size:12px;color:#aab;text-align:center;margin-top:10px;line-height:1.5}' +
          '.dlr-dlgtitle{font-size:20px;font-weight:bold;padding:14px 14px 4px;text-align:center}' +
          '.dlr-dlgbody{padding:10px 16px;text-align:center;font-size:16px;line-height:1.5}' +
          '.dlr-dlgbtns{display:flex;gap:10px;padding:12px 16px 16px}' +
          '.dlr-dlgbtns .dlr-btn{margin-top:0}';
        document.head.appendChild(st);
      }
      /* botón 🚗 en el side-menu (abre la tienda) */
      const sm = document.getElementById('side-menu');
      if (sm && !document.getElementById('btn-side-dealer')) {
        const b = document.createElement('button');
        b.id = 'btn-side-dealer';
        b.className = 'side-btn';
        b.setAttribute('aria-label', 'Tienda de carros');
        b.innerHTML = '<span style="font-size:26px">🚗</span><span>Carros</span>';
        b.addEventListener('click', () => { try { if (typeof Audio2 !== 'undefined') Audio2.click(); } catch (e) {} this.open(); });
        sm.appendChild(b);
      }
    } catch (e) {}
  },

  _card(def) {
    const d = document.createElement('div');
    const owned = this.owns(def.id);
    d.className = 'dlr-item' + (owned ? ' owned' : '') + (def.premium && !owned ? ' lux' : '');
    d.innerHTML = '<span class="emoji">' + def.emoji + '</span>' +
      '<div class="pname">' + this.carName(def) + '</div>' +
      '<div class="pdesc">' + T(def.descKey) + '</div>' +
      '<div class="pprice">' + (owned ? T('dealer.owned') : '🪙 ' + def.coins) + '</div>';
    if (!owned) {
      const bBuy = document.createElement('button');
      bBuy.className = 'dlr-btn dlr-btn-buy';
      bBuy.textContent = T('dealer.buy') + ' · 🪙' + def.coins;
      bBuy.addEventListener('click', () => {
        const r = this.buyWithCoins(def.id);
        if (!r.ok) { try { if (typeof toast === 'function') toast(r.msg); } catch (e) {} }
        this.render();
      });
      d.appendChild(bBuy);
      if (def.premium) {
        /* flujo premium: los DOS botones, como las tarjetas de monetiza.js */
        const bCode = document.createElement('button');
        bCode.className = 'dlr-btn dlr-btn-code';
        bCode.textContent = T('dealer.redeem');
        bCode.addEventListener('click', () => { this._view = { code: def.id }; this.render(); });
        const bPay = document.createElement('button');
        bPay.className = 'dlr-btn dlr-btn-pay';
        bPay.textContent = T('dealer.pay') + ' · ' + T('dealer.demo');
        bPay.addEventListener('click', () => this.payDialog(def));
        d.appendChild(bCode);
        d.appendChild(bPay);
      }
    }
    return d;
  },

  /* diálogo de pago demo (sin cargos reales) */
  payDialog(def) {
    const ov = document.getElementById('dlr-ov');
    if (!ov) return;
    const wrap = document.createElement('div');
    wrap.className = 'dlr-ov'; wrap.style.zIndex = 9995;
    wrap.innerHTML = '<div class="dlr-card" style="max-width:420px">' +
      '<div class="dlr-dlgtitle">' + T('dealer.payTitle') + '</div>' +
      '<div class="dlr-dlgbody"><b>' + def.emoji + ' ' + this.carName(def) + '</b><br>' +
      '<span class="dlr-demo">' + T('dealer.demo') + '</span><br>' + T('dealer.payBody') + '</div>' +
      '<div class="dlr-dlgbtns"></div></div>';
    const btns = wrap.querySelector('.dlr-dlgbtns');
    const bOk = document.createElement('button');
    bOk.className = 'dlr-btn dlr-btn-ok'; bOk.textContent = T('dealer.confirm');
    const bNo = document.createElement('button');
    bNo.className = 'dlr-btn dlr-btn-no'; bNo.textContent = T('dealer.cancel');
    const close = () => { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); };
    bNo.addEventListener('click', close);
    bOk.addEventListener('click', async () => {
      close();
      const r = await this.payDemo(def.id);
      if (!r.ok) { try { if (typeof toast === 'function') toast(r.msg); } catch (e) {} }
      this.render();
    });
    btns.appendChild(bOk); btns.appendChild(bNo);
    document.body.appendChild(wrap);
  },

  _renderCode(body, carId) {
    const def = DEALER_CARS.find(c => c.id === carId);
    const t = document.createElement('div');
    t.innerHTML = '<div class="dlr-sub" style="font-size:16px;font-weight:bold;color:#ffe95e">🔑 ' +
      (def ? this.carName(def) : '') + '</div>' +
      '<div class="dlr-sub">' + T('dealer.codeHint') + '</div>';
    const row = document.createElement('div');
    row.className = 'dlr-codeRow';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = T('dealer.codePh'); // genérico: NUNCA se muestra el código real
    inp.autocomplete = 'off';
    const btn = document.createElement('button');
    btn.className = 'dlr-btn dlr-btn-ok';
    btn.style.width = 'auto';
    btn.textContent = T('dealer.redeem');
    const msg = document.createElement('div');
    msg.className = 'dlr-msg';
    btn.addEventListener('click', () => {
      const r = this.redeemCodeFor(inp.value, carId);
      msg.textContent = r.msg;
      msg.className = 'dlr-msg ' + (r.ok ? 'ok' : 'bad');
      inp.value = '';
      if (r.ok) { this._view = 'list'; this.render(); try { if (typeof toast === 'function') toast(r.msg); } catch (e) {} }
    });
    row.appendChild(inp); row.appendChild(btn);
    const back = document.createElement('button');
    back.className = 'dlr-btn dlr-btn-no';
    back.textContent = T('dealer.close');
    back.addEventListener('click', () => { this._view = 'list'; this.render(); });
    body.appendChild(t); body.appendChild(row); body.appendChild(msg); body.appendChild(back);
  },

  render() {
    const ov = document.getElementById('dlr-ov');
    if (!ov) return;
    const body = ov.querySelector('.dlr-body');
    const coinsEl = ov.querySelector('#dlr-coins');
    if (coinsEl) coinsEl.textContent = this.coinsText();
    if (!body) return;
    body.innerHTML = '';
    if (this._view && this._view.code) {
      this._renderCode(body, this._view.code);
      return;
    }
    const sub = document.createElement('div');
    sub.className = 'dlr-sub';
    sub.textContent = T('dealer.subtitle');
    const grid = document.createElement('div');
    grid.className = 'dlr-grid';
    DEALER_CARS.forEach(def => grid.appendChild(this._card(def)));
    const note = document.createElement('div');
    note.className = 'dlr-note';
    note.textContent = T('dealer.note');
    body.appendChild(sub); body.appendChild(grid); body.appendChild(note);
  },

  open() {
    if (typeof document === 'undefined') return;
    try {
      this.ensureSave();
      let ov = document.getElementById('dlr-ov');
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
      ov = document.createElement('div');
      ov.id = 'dlr-ov';
      ov.className = 'dlr-ov';
      ov.innerHTML = '<div class="dlr-card">' +
        '<div class="dlr-head"><h2>' + T('dealer.title') + '</h2>' +
        '<div class="dlr-coins">🪙 <span id="dlr-coins">' + this.coinsText() + '</span></div>' +
        '<button class="dlr-x" id="dlr-x">✕</button></div>' +
        '<div class="dlr-body"></div></div>';
      document.body.appendChild(ov);
      ov.querySelector('#dlr-x').addEventListener('click', () => {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
      });
      this._view = 'list';
      this.render();
    } catch (e) {}
  },
};

/* exponer global */
try {
  if (typeof window !== 'undefined') window.Dealership = Dealership;
} catch (e) {}
if (typeof globalThis !== 'undefined') {
  try { globalThis.Dealership = Dealership; } catch (e) {}
}
