/* citylife3.js — 🎉 VIDA DE CIUDAD · TANDA 3 (GEAYI — Obby Xtreme 3D)
   Módulo global CityLife3 con init() / onLevelStart(idx) / onLevelEnd() / update(dt).
   Todo 100% ORIGINAL (diseños propios, nombres propios), mundos a nivel del suelo,
   geometría simple y materiales/geometrías reutilizados (Android).

   Sistemas (cada uno aislado en sus funciones):
     a) 🎉 Temporadas: Halloween / Navidad / 15 de septiembre.
        Se activan por fecha real (auto) o con el botón "🎉 Temporada" (forzar).
     b) 🏪 Negocio propio: compras un local ($800), eliges giro (nombres propios),
        surtes inventario y los NPCs "compran" periódicamente. Panel con nivel
        del negocio y mejoras (nivel 1→3 aumenta ganancias).
     c) 🗺️ GPS/minimapa: canvas 2D con calles (rejilla), jugador, tiendas/trabajos,
        waypoints (toca el mapa). Se actualiza en update(dt).
     d) 🏦 Banco de monedas: edificio "BANCO GEAYI"; depositar/retirar, 2% de
        interés por "día de juego" (300 s). Todo en SAVE.
     e) 🎤 Karaoke: bar "KARAOKE ESTRELLA"; 3 canciones inventadas, la letra se
        resalta por sílabas y el jugador toca al ritmo (botón grande). Premio
        según puntaje.
     f) 🚒 Bomberos: estación + camión abordable (diseño propio GEAYI);
        incendios aleatorios pequeños; apágalo con el camión cerca + botón
        "💦 Agua". Recompensa +40 🪙.
     g) 🐾 Mascotas: botón para llamar/alejar (mejora compatible con pets.js;
        el seguimiento real ya lo hace updatePets()).

   Integración (NO modifica archivos existentes; el orquestador aplica los hooks):
     - index.html: <script src="citylife3.js"></script> ANTES de game.js
     - game.js (arranque): CityLife3.init() una vez con el DOM listo
     - game.js startLevel(i): CityLife3.onLevelStart(i)
     - game.js loop: CityLife3.update(dt)  (o el alias global updateCityLife3(dt))
     - pets.js: mejora mínima autorizada (Pets.setAway / Pets.call / Pets.isAway)
*/
'use strict';

/* ============================== i18n ============================== */
try {
  if (typeof addStrings === 'function') {
    addStrings('es', {
      'cl3.seasonBtn': '🎉 Temporada', 'cl3.seasonTitle': '🎉 TEMPORADAS',
      'cl3.seasonAuto': '📅 Automático (por fecha)', 'cl3.seasonNone': '🚫 Apagado',
      'cl3.s.halloween': '🎃 Halloween', 'cl3.s.navidad': '🎄 Navidad', 'cl3.s.sept15': '🇭🇳🇲🇽 15 de septiembre',
      'cl3.soon.halloween': '🎃 ¡Halloween llegó a la ciudad!', 'cl3.soon.navidad': '🎄 ¡Navidad en la ciudad!',
      'cl3.soon.sept15': '🇭🇳🇲🇽 ¡Fiestas del 15 de septiembre!', 'cl3.soon.off': '🎉 Temporada desactivada',
      'cl3.map': '🗺️', 'cl3.mapTitle': '🗺️ MAPA GEAYI', 'cl3.close': '✕ Cerrar',
      'cl3.waypoint': '📍 Toca el mapa para poner un punto',
      'cl3.pet': '🐾', 'cl3.petCall': '🐾 ¡Ven aquí!', 'cl3.petAway': '🐾 Quédate ahí…',
      'cl3.petNone': '🐾 Elige una mascota en Personalizar',
      'cl3.shopTitle': '🏪 MI NEGOCIO', 'cl3.shopBuy': 'COMPRAR LOCAL ($800)',
      'cl3.shopNoMoney': '💸 Te faltan monedas', 'cl3.shopBought': '🏪 ¡Local comprado! Elige tu giro',
      'cl3.shopPick': 'Elige el giro de tu negocio:', 'cl3.stock': 'Inventario',
      'cl3.level': 'Nivel', 'cl3.earned': 'Ganado', 'cl3.restock': '📦 Surtir +10 ($15)',
      'cl3.upgrade': '⬆️ Mejorar negocio', 'cl3.maxLevel': '⭐ Nivel máximo',
      'cl3.sale': '🧾 ¡Venta!', 'cl3.nostock': '📦 Sin inventario: surte tu negocio',
      'cl3.bankTitle': '🏦 BANCO GEAYI', 'cl3.balance': 'Saldo', 'cl3.day': 'Día de juego',
      'cl3.deposit': 'Depositar', 'cl3.withdraw': 'Retirar', 'cl3.all': 'Todo',
      'cl3.interest': '🏦 Intereses +', 'cl3.noFunds': '💸 Fondos insuficientes',
      'cl3.karaTitle': '🎤 KARAOKE ESTRELLA', 'cl3.karaPick': 'Elige tu canción:',
      'cl3.karaTap': '🎵 ¡CANTA!', 'cl3.karaScore': 'Puntaje',
      'cl3.karaPrize1': '🏆 ¡Increíble! Premio +60 🪙', 'cl3.karaPrize2': '🥈 ¡Muy bien! Premio +30 🪙',
      'cl3.karaPrize3': '🥉 ¡Bien! Premio +10 🪙', 'cl3.karaPrize0': '🎤 ¡Sigue practicando!',
      'cl3.fireTitle': '🚒 BOMBEROS GEAYI', 'cl3.fireAlert': '🔥 ¡Incendio! Lleva el camión 🚒',
      'cl3.fireOut': '💦 ¡Fuego apagado! +40 🪙', 'cl3.fireGone': '🔥 El fuego se apagó solo',
      'cl3.water': '💦 AGUA', 'cl3.actBank': '🏦 Banco', 'cl3.actKara': '🎤 Karaoke', 'cl3.actShop': '🏪 Negocio',
    });
    addStrings('en', {
      'cl3.seasonBtn': '🎉 Season', 'cl3.seasonTitle': '🎉 SEASONS',
      'cl3.seasonAuto': '📅 Auto (by date)', 'cl3.seasonNone': '🚫 Off',
      'cl3.s.halloween': '🎃 Halloween', 'cl3.s.navidad': '🎄 Christmas', 'cl3.s.sept15': '🇭🇳🇲🇽 Sept 15th',
      'cl3.soon.halloween': '🎃 Halloween is here!', 'cl3.soon.navidad': '🎄 Christmas in town!',
      'cl3.soon.sept15': '🇭🇳🇲🇽 Sept 15th fiestas!', 'cl3.soon.off': '🎉 Season off',
      'cl3.map': '🗺️', 'cl3.mapTitle': '🗺️ GEAYI MAP', 'cl3.close': '✕ Close',
      'cl3.waypoint': '📍 Tap the map to drop a pin',
      'cl3.pet': '🐾', 'cl3.petCall': '🐾 Come here!', 'cl3.petAway': '🐾 Stay there…',
      'cl3.petNone': '🐾 Pick a pet in Customize',
      'cl3.shopTitle': '🏪 MY BUSINESS', 'cl3.shopBuy': 'BUY STORE ($800)',
      'cl3.shopNoMoney': '💸 Not enough coins', 'cl3.shopBought': '🏪 Store bought! Pick your trade',
      'cl3.shopPick': 'Pick your business trade:', 'cl3.stock': 'Stock',
      'cl3.level': 'Level', 'cl3.earned': 'Earned', 'cl3.restock': '📦 Restock +10 ($15)',
      'cl3.upgrade': '⬆️ Upgrade business', 'cl3.maxLevel': '⭐ Max level',
      'cl3.sale': '🧾 Sale!', 'cl3.nostock': '📦 Out of stock: restock your store',
      'cl3.bankTitle': '🏦 GEAYI BANK', 'cl3.balance': 'Balance', 'cl3.day': 'Game day',
      'cl3.deposit': 'Deposit', 'cl3.withdraw': 'Withdraw', 'cl3.all': 'All',
      'cl3.interest': '🏦 Interest +', 'cl3.noFunds': '💸 Insufficient funds',
      'cl3.karaTitle': '🎤 ESTRELLA KARAOKE', 'cl3.karaPick': 'Pick your song:',
      'cl3.karaTap': '🎵 SING!', 'cl3.karaScore': 'Score',
      'cl3.karaPrize1': '🏆 Amazing! Prize +60 🪙', 'cl3.karaPrize2': '🥈 Great! Prize +30 🪙',
      'cl3.karaPrize3': '🥉 Good! Prize +10 🪙', 'cl3.karaPrize0': '🎤 Keep practicing!',
      'cl3.fireTitle': '🚒 GEAYI FIRE DEPT', 'cl3.fireAlert': '🔥 Fire! Bring the truck 🚒',
      'cl3.fireOut': '💦 Fire out! +40 🪙', 'cl3.fireGone': '🔥 The fire burned out',
      'cl3.water': '💦 WATER', 'cl3.actBank': '🏦 Bank', 'cl3.actKara': '🎤 Karaoke', 'cl3.actShop': '🏪 Business',
    });
  }
} catch (e) {}

/* ============================== ayudantes ============================== */
function _c3t(k) { try { return T(k); } catch (e) { return k; } }
function _c3earn(n) {
  try {
    SAVE.coins = (SAVE.coins || 0) + n; persist();
    var h = $('hud-coins'); if (h) h.textContent = SAVE.coins;
  } catch (e) {}
}
function _c3spend(n) {
  try {
    if ((SAVE.coins || 0) >= n) {
      SAVE.coins -= n; persist();
      var h = $('hud-coins'); if (h) h.textContent = SAVE.coins;
      return true;
    }
  } catch (e) {}
  return false;
}
function _c3sfx(name) { try { if (typeof Audio2 !== 'undefined' && Audio2 && Audio2[name]) Audio2[name](); } catch (e) {} }
function _c3toast(m) { try { if (typeof toast === 'function') toast(m); } catch (e) {} }
function _c3burst(x, y, z, colors, n, power) {
  try { if (typeof Particles !== 'undefined' && Particles.burst) Particles.burst(x, y, z, colors, n, power); } catch (e) {}
}
function _c3d2(ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
function _c3now() { try { return performance.now() / 1000; } catch (e) { return Date.now() / 1000; } }
function _c3onFoot() {
  if (typeof MODE !== 'undefined' && MODE !== 'play') return false;
  try {
    if (typeof Vehicle !== 'undefined') {
      if (Vehicle.mode !== 'none') return false;
      if (Vehicle.near) return false;
    }
  } catch (e) {}
  return true;
}
function _c3inCity() { return (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx === 3); } // Immokalee 🌴

/* ---- caché de geometrías/materiales (rendimiento Android) ---- */
var _c3geoCache = {}, _c3matCache = {};
function _c3geo(key, maker) { if (!_c3geoCache[key]) _c3geoCache[key] = maker(); return _c3geoCache[key]; }
function _c3mat(color, extra) {
  var k = color + '|' + (extra || '');
  if (!_c3matCache[k]) {
    var o = { color: color, roughness: 0.85, metalness: 0.03 };
    if (extra === 'flat') o = { color: color };
    else if (extra === 'glass') o = { color: color, roughness: 0.15, metalness: 0.4 };
    else if (extra === 'glow') o = { color: color, emissive: color, emissiveIntensity: 0.9 };
    _c3matCache[k] = new THREE.MeshStandardMaterial(o);
  }
  return _c3matCache[k];
}
function _c3box(parent, w, h, d, color, x, y, z, ry, extra) {
  var m = new THREE.Mesh(_c3geo('bx' + w + 'x' + h + 'x' + d, function () {
    return new THREE.BoxGeometry(w, h, d);
  }), _c3mat(color, extra));
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  if (parent) parent.add(m);
  return m;
}
function _c3cyl(parent, r1, r2, h, color, x, y, z, seg) {
  var m = new THREE.Mesh(_c3geo('cy' + r1 + 'x' + r2 + 'x' + h + 'x' + (seg || 10), function () {
    return new THREE.CylinderGeometry(r1, r2, h, seg || 10);
  }), _c3mat(color));
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
function _c3signTex(lines, bg, fg) { // letrero con canvas (diseño propio)
  return canvasTex(512, 192, function (g, w, h) {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
    g.textAlign = 'center'; g.fillStyle = fg;
    g.font = '900 64px "Trebuchet MS", sans-serif';
    g.fillText(lines[0], w / 2, 84);
    if (lines[1]) { g.font = '700 44px "Trebuchet MS", sans-serif'; g.fillText(lines[1], w / 2, 140); }
  });
}
function _c3walker(color) { // peatón/cliente simple (diseño propio): cuerpo + cabeza
  var g = new THREE.Group();
  _c3box(g, 0.55, 0.9, 0.35, color, 0, 0.95, 0);
  _c3box(g, 0.6, 0.5, 0.4, 0x2b2b3a, 0, 0.25, 0); // piernas
  var head = new THREE.Mesh(_c3geo('hd', function () { return new THREE.SphereGeometry(0.24, 8, 6); }), _c3mat(0xf2c19b));
  head.position.set(0, 1.65, 0); g.add(head);
  g.userData.head = head;
  return g;
}

/* ============================== estado ============================== */
var CL3 = {
  ready: false, idx: -1,
  seasonGroup: null, seasonBuilt: 'x',
  candy: [], gifts: [], treeLights: [], snow: null, parade: [],
  cityGroup: null, shopMesh: null, truckDef: null,
  bank: null, kara: null, fire: null, cust: null,
  ui: null, panel: null, act: null, mapOv: null, mapCtx: null, mapT: 0, waypoint: null,
  dayAcc: 0, saleT: 12, proxT: 0, inited: false,
};
/* posiciones fijas en Immokalee (todo a nivel del suelo) */
var CL3_BANK = { x: -60, z: 120 };
var CL3_KARA = { x: -60, z: 70 };
var CL3_FIRE = { x: 70, z: 60 };
var CL3_SHOP = { x: -45, z: 60 };

var GIROS = [
  { id: 'tacos',   name: 'Tacos Don Fogón',   emoji: '🌮', price: 8,  color: 0xff8a3d },
  { id: 'paletas', name: 'Paletas Sabor Sol', emoji: '🍦', price: 6,  color: 0x59c8ff },
  { id: 'ropa',    name: 'Ropa Color Calle',  emoji: '👕', price: 12, color: 0xc77dff },
];
var BIZ_UP_COST = [0, 500, 1200];       // costo para subir a nivel 2 y 3
var BIZ_MULT = [1, 1, 1.5, 2];          // multiplicador de ganancia por nivel
var BANK_DAY = 300;                      // 1 "día de juego" = 300 s
var FIRE_REWARD = 40;

/* ============================== a) TEMPORADAS ============================== */
function _seasonEff() {
  var s = 'auto';
  try { s = SAVE.season || 'auto'; } catch (e) {}
  if (s !== 'auto') return s;
  try {
    var d = new Date(), m = d.getMonth(), day = d.getDate();
    if (m === 8 && day >= 13 && day <= 17) return 'sept15';              // 13–17 sep
    if ((m === 9 && day >= 24) || (m === 10 && day <= 2)) return 'halloween'; // 24 oct–2 nov
    if (m === 11 || (m === 0 && day <= 6)) return 'navidad';              // dic–6 ene
  } catch (e) {}
  return 'none';
}
function _plaza() {
  try {
    if (LEVEL && LEVEL.start) return { x: LEVEL.start.x, z: LEVEL.start.z };
  } catch (e) {}
  return { x: 0, z: 0 };
}
function _clearSeason() {
  try { if (CL3.seasonGroup && CL3.seasonGroup.parent) CL3.seasonGroup.parent.remove(CL3.seasonGroup); } catch (e) {}
  CL3.seasonGroup = null; CL3.candy = []; CL3.gifts = []; CL3.treeLights = []; CL3.snow = null; CL3.parade = [];
}
function _buildSeason() {
  _clearSeason();
  var s = _seasonEff();
  CL3.seasonBuilt = s;
  if (s === 'none' || typeof LEVEL === 'undefined' || !LEVEL || !LEVEL.group) return;
  var g = new THREE.Group();
  var c = _plaza();
  try {
    if (s === 'halloween') _decorHalloween(g, c);
    else if (s === 'navidad') _decorNavidad(g, c);
    else if (s === 'sept15') _decorSept(g, c);
    LEVEL.group.add(g);
    CL3.seasonGroup = g;
    _c3toast(_c3t('cl3.soon.' + s));
  } catch (e) {}
}
/* 🎃 Halloween: calabazas, banderines naranja/morados, monedas-dulce recolectables */
function _pumpkin(g, x, z) {
  var p = new THREE.Group();
  var body = new THREE.Mesh(_c3geo('pump', function () { return new THREE.SphereGeometry(0.55, 10, 8); }), _c3mat(0xff7a1a));
  body.position.y = 0.5; body.scale.y = 0.85; p.add(body);
  _c3box(p, 0.12, 0.3, 0.12, 0x3d7a2c, 0, 1.0, 0); // tallo
  p.position.set(x, 0, z);
  g.add(p);
}
function _bunting(g, x, z, colors) { // poste con banderines
  _c3cyl(g, 0.07, 0.09, 3.2, 0x5e3717, x, 1.6, z);
  for (var i = 0; i < 5; i++) {
    var f = _c3box(g, 0.5, 0.35, 0.03, colors[i % colors.length], x + (i - 2) * 0.55, 2.7, z, 0, 'flat');
    f.rotation.z = 0.15 * (i % 2 ? 1 : -1);
  }
}
function _decorHalloween(g, c) {
  var i, a;
  for (i = 0; i < 8; i++) { // anillo de calabazas
    a = (i / 8) * Math.PI * 2;
    _pumpkin(g, c.x + Math.cos(a) * 11, c.z + Math.sin(a) * 11);
  }
  for (i = 0; i < 4; i++) { // banderines naranja/morado
    a = (i / 4) * Math.PI * 2 + 0.4;
    _bunting(g, c.x + Math.cos(a) * 7, c.z + Math.sin(a) * 7, [0xff7a1a, 0x7b2fff]);
  }
  for (i = 0; i < 10; i++) { // monedas-dulce recolectables (+5 🪙)
    a = (i / 10) * Math.PI * 2;
    var m = new THREE.Mesh(_c3geo('candy', function () { return new THREE.SphereGeometry(0.28, 8, 6); }), _c3mat(0xffb300, 'glow'));
    m.position.set(c.x + Math.cos(a) * (4 + (i % 3) * 2), 0.7, c.z + Math.sin(a) * (4 + (i % 3) * 2));
    g.add(m);
    CL3.candy.push({ mesh: m, taken: false, t: 0 });
  }
  g.add(doubleFaceSign(7, 2, _c3signTex(['🎃 HALLOWEEN', '★ GEAYI ★'], '#2a0a4a', '#ff9e2c'), c.x, 3.2, c.z - 15, 0));
}
/* 🎄 Navidad: árbol gigante con luces, regalos (+10 🪙), nieve ligera */
function _decorNavidad(g, c) {
  _c3cyl(g, 0.35, 0.45, 1.4, 0x6b4226, c.x, 0.7, c.z); // tronco
  var tiers = [[2.8, 1.6, 1.9], [2.1, 1.6, 3.1], [1.4, 1.6, 4.2]];
  for (var i = 0; i < tiers.length; i++) {
    var cone = new THREE.Mesh(_c3geo('tree' + i, function () {
      return new THREE.ConeGeometry(tiers[i][0], tiers[i][1], 10);
    }), _c3mat(0x1e8e3e));
    cone.position.set(c.x, tiers[i][2], c.z);
    g.add(cone);
  }
  var star = new THREE.Mesh(_c3geo('star', function () { return new THREE.OctahedronGeometry(0.45); }), _c3mat(0xffe95e, 'glow'));
  star.position.set(c.x, 5.4, c.z); g.add(star);
  CL3.treeLights.push({ mesh: star, ph: 0 });
  var cols = [0xff1744, 0xffe95e, 0x00e5ff, 0xff2fd6];
  for (var k = 0; k < 14; k++) { // luces navideñas (parpadean en update)
    var a = (k / 14) * Math.PI * 2, r = 2.4 - (k % 3) * 0.6, y = 2.2 + (k % 3) * 1.1;
    var l = new THREE.Mesh(_c3geo('bulb', function () { return new THREE.SphereGeometry(0.13, 6, 5); }),
      _c3mat(cols[k % 4], 'glow'));
    l.position.set(c.x + Math.cos(a) * r, y, c.z + Math.sin(a) * r);
    g.add(l);
    CL3.treeLights.push({ mesh: l, ph: k * 0.7 });
  }
  var giftCols = [0xff1744, 0x00e5ff, 0xffe95e, 0x59d867, 0xff2fd6, 0xff8a3d];
  for (var j = 0; j < 6; j++) { // regalos: tocarlos da +10 🪙
    a = (j / 6) * Math.PI * 2;
    var gr = new THREE.Group();
    _c3box(gr, 0.8, 0.6, 0.8, giftCols[j], 0, 0.3, 0);
    _c3box(gr, 0.86, 0.12, 0.2, 0xffffff, 0, 0.62, 0);
    _c3box(gr, 0.2, 0.12, 0.86, 0xffffff, 0, 0.62, 0);
    gr.position.set(c.x + Math.cos(a) * 4.5, 0, c.z + Math.sin(a) * 4.5);
    g.add(gr);
    CL3.gifts.push({ mesh: gr, taken: false, t: 0 });
  }
  // nieve ligera: 240 copos reciclados alrededor del jugador
  try {
    var n = 240, pos = new Float32Array(n * 3);
    for (var s2 = 0; s2 < n; s2++) {
      pos[s2 * 3] = (Math.random() - 0.5) * 90;
      pos[s2 * 3 + 1] = Math.random() * 26;
      pos[s2 * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    var sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    var pts = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.85 }));
    pts.frustumCulled = false;
    g.add(pts);
    CL3.snow = { pts: pts, arr: pos, n: n };
  } catch (e) {}
  g.add(doubleFaceSign(7, 2, _c3signTex(['🎄 NAVIDAD', '★ GEAYI ★'], '#0a3a1a', '#ffe95e'), c.x, 3.2, c.z - 15, 0));
}
/* 🇭🇳🇲🇽 15 de septiembre: banderas, papel picado y desfile */
function _flagTexHN() { // dibujo propio inspirado en la bandera de Honduras
  return canvasTex(256, 160, function (g, w, h) {
    g.fillStyle = '#3b82c4'; g.fillRect(0, 0, w, h * 0.33); g.fillRect(0, h * 0.67, w, h * 0.34);
    g.fillStyle = '#ffffff'; g.fillRect(0, h * 0.33, w, h * 0.34);
    g.fillStyle = '#3b82c4';
    var cx = [w * 0.3, w * 0.7, w * 0.5, w * 0.38, w * 0.62], cy = [h * 0.42, h * 0.42, h * 0.5, h * 0.6, h * 0.6];
    for (var i = 0; i < 5; i++) { g.beginPath(); g.arc(cx[i], cy[i], 7, 0, 7); g.fill(); }
  });
}
function _flagTexMX() { // dibujo propio inspirado en la bandera de México
  return canvasTex(256, 160, function (g, w, h) {
    g.fillStyle = '#2e8b3d'; g.fillRect(0, 0, w * 0.34, h);
    g.fillStyle = '#ffffff'; g.fillRect(w * 0.33, 0, w * 0.34, h);
    g.fillStyle = '#c63b3b'; g.fillRect(w * 0.66, 0, w * 0.34, h);
  });
}
function _decorSept(g, c) {
  // (cuerdas de papel picado retiradas por pedido del usuario: estorbaban en la calle)
  var cols = [0xff2fd6, 0xffe95e, 0x59d867, 0x00e5ff, 0xff8a3d, 0x7b2fff]; // solo para el desfile
  // 4 banderas grandes en mástiles (2 de cada diseño)
  var texs = [_flagTexHN(), _flagTexMX(), _flagTexHN(), _flagTexMX()];
  for (var j = 0; j < 4; j++) {
    var a = (j / 4) * Math.PI * 2 + 0.78;
    var fx = c.x + Math.cos(a) * 13, fz = c.z + Math.sin(a) * 13;
    _c3cyl(g, 0.08, 0.1, 4.6, 0xd8d8d8, fx, 2.3, fz);
    var flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5),
      new THREE.MeshBasicMaterial({ map: texs[j], side: THREE.DoubleSide }));
    flag.position.set(fx + 1.25, 3.7, fz);
    g.add(flag);
    CL3.parade.push({ flag: flag, ph: j * 1.3 });
  }
  for (var p = 0; p < 6; p++) { // desfile: 6 peatones caminando en círculo con banderita
    var w = _c3walker(cols[p % cols.length]);
    var pole = _c3box(w, 0.05, 1.1, 0.05, 0xd8d8d8, 0.35, 1.5, 0.1);
    var mini = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.35),
      new THREE.MeshBasicMaterial({ map: texs[p % 4], side: THREE.DoubleSide }));
    mini.position.set(0.35, 1.9, 0.1);
    w.add(mini);
    w.userData.parade = { ang: (p / 6) * Math.PI * 2, r: 8.5, spd: 0.45 };
    g.add(w);
    CL3.parade.push({ walker: w });
  }
  // (rótulo gigante "15 DE SEPTIEMBRE" retirado: quedaba en medio de la calle)
}
function _updateSeason(dt) {
  var now = _c3now();
  try {
    var P = (typeof Player !== 'undefined' && Player && Player.pos) ? Player.pos : null;
    // 🍬 monedas-dulce
    for (var i = 0; i < CL3.candy.length; i++) {
      var cd = CL3.candy[i];
      if (cd.taken) {
        cd.t -= dt;
        if (cd.t <= 0) { cd.taken = false; cd.mesh.visible = true; }
        continue;
      }
      cd.mesh.rotation.y += dt * 2;
      cd.mesh.position.y = 0.7 + Math.sin(now * 3 + i) * 0.12;
      if (P && _c3d2(P.x, P.z, cd.mesh.position.x, cd.mesh.position.z) < 4) {
        cd.taken = true; cd.t = 30; cd.mesh.visible = false;
        _c3earn(5); _c3sfx('coin');
        _c3burst(cd.mesh.position.x, 1, cd.mesh.position.z, [0xffb300, 0xffffff], 10, 4);
        _c3toast('🍬 +5 🪙');
      }
    }
    // 🎁 regalos
    for (var j = 0; j < CL3.gifts.length; j++) {
      var gf = CL3.gifts[j];
      if (gf.taken) {
        gf.t -= dt;
        if (gf.t <= 0) { gf.taken = false; gf.mesh.visible = true; }
        continue;
      }
      if (P && _c3d2(P.x, P.z, gf.mesh.position.x, gf.mesh.position.z) < 5) {
        gf.taken = true; gf.t = 60; gf.mesh.visible = false;
        _c3earn(10); _c3sfx('coin');
        _c3burst(gf.mesh.position.x, 1, gf.mesh.position.z, [0xff1744, 0xffe95e, 0xffffff], 16, 5);
        _c3toast('🎁 +10 🪙');
      }
    }
    // 💡 luces del árbol
    for (var k = 0; k < CL3.treeLights.length; k++) {
      var L = CL3.treeLights[k];
      L.mesh.visible = Math.sin(now * 5 + L.ph) > -0.2;
    }
    // ❄️ nieve ligera alrededor del jugador
    if (CL3.snow && P) {
      var sn = CL3.snow, arr = sn.arr;
      for (var s2 = 0; s2 < sn.n; s2++) {
        var y = arr[s2 * 3 + 1] - dt * 2.2;
        if (y < 0) {
          y = 24 + Math.random() * 4;
          arr[s2 * 3] = P.x + (Math.random() - 0.5) * 90;
          arr[s2 * 3 + 2] = P.z + (Math.random() - 0.5) * 90;
        }
        arr[s2 * 3 + 1] = y;
      }
      try { sn.pts.geometry.attributes.position.needsUpdate = true; } catch (e) {}
    }
    // 🎺 desfile y banderas ondeando
    for (var q = 0; q < CL3.parade.length; q++) {
      var it = CL3.parade[q];
      if (it.walker) {
        var u = it.walker.userData.parade;
        u.ang += dt * u.spd;
        var c = _plaza();
        it.walker.position.set(c.x + Math.cos(u.ang) * u.r, Math.abs(Math.sin(now * 6 + u.ang * 3)) * 0.12, c.z + Math.sin(u.ang) * u.r);
        it.walker.rotation.y = Math.atan2(-Math.sin(u.ang), Math.cos(u.ang)) + Math.PI / 2;
      } else if (it.flag) {
        it.flag.rotation.y = Math.sin(now * 2.2 + it.ph) * 0.18;
      }
    }
  } catch (e) {}
}

/* ============================== EDIFICIOS DE CIUDAD (Immokalee) ============================== */
function _clearCity() {
  try { if (CL3.cityGroup && CL3.cityGroup.parent) CL3.cityGroup.parent.remove(CL3.cityGroup); } catch (e) {}
  CL3.cityGroup = null; CL3.shopMesh = null; CL3.truckDef = null; CL3.cust = null;
}
function _buildingBase(g, x, z, w, h, d, wallColor, signLines, signBg, signFg) {
  _c3box(g, w, h, d, wallColor, x, h / 2, z);                    // cuerpo
  _c3box(g, w + 0.6, 0.4, d + 0.6, 0x3a3f4d, x, h + 0.2, z);    // techo
  _c3box(g, 2.2, 2.6, 0.25, 0x2b2b3a, x, 1.3, z + d / 2 + 0.05); // puerta
  g.add(doubleFaceSign(6.5, 1.8, _c3signTex(signLines, signBg, signFg), x, h + 1.6, z + d / 2, 0));
}
function _buildCity() {
  _clearCity();
  if (!_c3inCity() || typeof LEVEL === 'undefined' || !LEVEL || !LEVEL.group) return;
  var g = new THREE.Group();
  try {
    // 🏦 BANCO GEAYI
    _buildingBase(g, CL3_BANK.x, CL3_BANK.z, 9, 5, 7, 0xcfd6e4, ['🏦 BANCO GEAYI', '★ MONEDAS SEGURAS ★'], '#12305e', '#ffe95e');
    for (var i = -1; i <= 1; i += 2) { // columnas
      _c3cyl(g, 0.3, 0.34, 4.4, 0xffffff, CL3_BANK.x + i * 3.4, 2.2, CL3_BANK.z + 3.6);
    }
    // 🎤 KARAOKE ESTRELLA
    _buildingBase(g, CL3_KARA.x, CL3_KARA.z, 8, 4.5, 7, 0x5b2a86, ['🎤 KARAOKE ESTRELLA', '★ CANTA Y GANA ★'], '#2a0a4a', '#ff9eff');
    // 🚒 BOMBEROS GEAYI
    _buildingBase(g, CL3_FIRE.x, CL3_FIRE.z, 10, 5.5, 8, 0xc63b3b, ['🚒 BOMBEROS GEAYI', '★ SIEMPRE LISTOS ★'], '#7a1010', '#ffffff');
    _c3box(g, 6.4, 3.6, 0.3, 0x2b2b3a, CL3_FIRE.x, 1.8, CL3_FIRE.z + 4.05); // portón
    _buildShopMesh(g); // 🏪 negocio propio (solo si ya es dueño)
    LEVEL.group.add(g);
    CL3.cityGroup = g;
    _parkFireTruck();
  } catch (e) {}
}
/* ---- camión de bomberos: diseño 100% propio, marca GEAYI ---- */
function _buildFireTruckMesh(color) {
  var g = new THREE.Group(), red = 0xd63b2f;
  _c3box(g, 2.4, 0.9, 5.8, red, 0, 0.95, 0);                       // chasis
  _c3box(g, 2.4, 1.5, 1.7, red, 0, 1.9, 1.9);                      // cabina
  _c3box(g, 2.0, 0.7, 0.15, 0xbfe8ff, 0, 2.1, 2.78, 0, 'glass');   // parabrisas
  _c3box(g, 2.44, 0.35, 3.6, 0xffffff, 0, 1.15, -0.8);             // franja blanca
  _c3box(g, 2.4, 1.9, 3.4, red, 0, 1.85, -1.1);                    // caja trasera
  _c3box(g, 0.6, 0.18, 5.2, 0xb9c2cc, 0, 3.0, -0.4);               // escalera
  _c3box(g, 0.14, 0.5, 5.2, 0xb9c2cc, -0.3, 2.8, -0.4);
  _c3box(g, 0.14, 0.5, 5.2, 0xb9c2cc, 0.3, 2.8, -0.4);
  _c3box(g, 0.5, 0.22, 0.5, 0xff1744, -0.5, 2.85, 1.9, 0, 'glow'); // luces
  _c3box(g, 0.5, 0.22, 0.5, 0x2979ff, 0.5, 2.85, 1.9, 0, 'glow');
  _c3box(g, 2.5, 0.35, 0.4, 0xb9c2cc, 0, 0.6, 3.0);                // defensa
  var wg = _c3geo('fwheel', function () { return new THREE.CylinderGeometry(0.48, 0.48, 0.4, 12); });
  [[-1.05, 1.9], [1.05, 1.9], [-1.05, -1.2], [1.05, -1.2], [-1.05, -2.3], [1.05, -2.3]].forEach(function (p) {
    var w = new THREE.Mesh(wg, _c3mat(0x1c1c22));
    w.rotation.z = Math.PI / 2;
    w.position.set(p[0], 0.48, p[1]);
    g.add(w);
  });
  return g;
}
function _registerFireTruck() {
  try {
    if (typeof VEHICLE_TYPES === 'undefined' || typeof VEHICLE_BUILDERS === 'undefined') return;
    if (!VEHICLE_TYPES['geayi-fire']) {
      VEHICLE_TYPES['geayi-fire'] = { name: 'Camión Geayi de Bomberos 🚒', emoji: '🚒', maxSpeed: 14, accel: 12, seatY: 1.0 };
    }
    VEHICLE_BUILDERS['geayi-fire'] = _buildFireTruckMesh;
  } catch (e) {}
}
function _parkFireTruck() {
  try {
    if (typeof addVehicle !== 'function' || !LEVEL || !LEVEL.cars) return;
    addVehicle(LEVEL, 'geayi-fire', CL3_FIRE.x - 8, 0, CL3_FIRE.z + 2, 0xd63b2f, true, Math.PI / 2);
    var def = LEVEL.cars[LEVEL.cars.length - 1];
    if (def && def.vtype === 'geayi-fire') { def.cl3fire = true; CL3.truckDef = def; }
  } catch (e) {}
}
function _removeFireTruck() {
  try {
    if (CL3.truckDef && LEVEL && LEVEL.cars) {
      var i = LEVEL.cars.indexOf(CL3.truckDef);
      if (i >= 0) LEVEL.cars.splice(i, 1);
      if (CL3.truckDef.mesh && CL3.truckDef.mesh.parent) CL3.truckDef.mesh.parent.remove(CL3.truckDef.mesh);
      if (typeof Vehicle !== 'undefined' && Vehicle.near && Vehicle.near.def === CL3.truckDef) Vehicle.near = null;
    }
  } catch (e) {}
  CL3.truckDef = null;
}

/* ============================== b) NEGOCIO PROPIO ============================== */
function _giroById(id) { for (var i = 0; i < GIROS.length; i++) if (GIROS[i].id === id) return GIROS[i]; return null; }
function _bizSave() { try { persist(); } catch (e) {} }
function _buildShopMesh(g) {
  if (!SAVE.biz || !SAVE.biz.owned || !SAVE.biz.giro) return;
  var giro = _giroById(SAVE.biz.giro);
  if (!giro) return;
  var x = CL3_SHOP.x, z = CL3_SHOP.z;
  _c3box(g, 7, 3.4, 5.5, 0xf5ead2, x, 1.7, z);                        // local
  _c3box(g, 7.4, 0.35, 2.6, giro.color, x, 3.1, z + 3.2, 0);          // toldo
  _c3box(g, 7.4, 0.5, 5.9, 0x3a3f4d, x, 3.65, z);                     // techo
  _c3box(g, 2.0, 2.4, 0.25, 0x2b2b3a, x, 1.2, z + 2.8);               // puerta
  _c3box(g, 2.6, 0.9, 1.2, 0x8a5a33, x + 1.4, 0.45, z + 1.6);         // mostrador
  g.add(doubleFaceSign(6, 1.6, _c3signTex([giro.emoji + ' ' + giro.name, '★ NIVEL ' + SAVE.biz.level + ' ★'], '#3d2b00', '#ffe95e'), x, 4.6, z + 2.8, 0));
  CL3.shopMesh = true;
}
function _rebuildShop() { // reconstruye la ciudad para mostrar el local comprado
  if (CL3.idx === 3) _buildCity();
}
function _buyStore() {
  if (SAVE.biz.owned) return;
  if (!_c3spend(800)) { _c3toast(_c3t('cl3.shopNoMoney')); _c3sfx('deny'); return; }
  SAVE.biz.owned = true; _bizSave();
  _c3sfx('buy'); _c3toast(_c3t('cl3.shopBought'));
  _rebuildShop();
  _openShopPanel();
}
function _pickGiro(id) {
  var giro = _giroById(id);
  if (!giro || !SAVE.biz.owned) return;
  SAVE.biz.giro = id; SAVE.biz.stock = 10; _bizSave();
  _c3sfx('check'); _c3toast(giro.emoji + ' ' + giro.name);
  _rebuildShop();
  _openShopPanel();
}
function _restock() {
  if (!SAVE.biz.giro) return;
  if (!_c3spend(15)) { _c3toast(_c3t('cl3.shopNoMoney')); _c3sfx('deny'); return; }
  SAVE.biz.stock += 10; _bizSave();
  _c3sfx('buy');
  _openShopPanel();
}
function _upgradeBiz() {
  var lv = SAVE.biz.level || 1;
  if (lv >= 3) return;
  var cost = BIZ_UP_COST[lv];
  if (!_c3spend(cost)) { _c3toast(_c3t('cl3.shopNoMoney')); _c3sfx('deny'); return; }
  SAVE.biz.level = lv + 1; _bizSave();
  _c3sfx('power');
  _c3burst(CL3_SHOP.x, 3, CL3_SHOP.z, [0xffe95e, 0xffffff], 24, 6);
  _rebuildShop();
  _openShopPanel();
}
/* cliente NPC que camina al local, "compra" y se va */
function _updateBusiness(dt) {
  if (!_c3inCity() || !SAVE.biz || !SAVE.biz.owned || !SAVE.biz.giro) return;
  var giro = _giroById(SAVE.biz.giro);
  if (!giro) return;
  try {
    if (!CL3.cust) {
      CL3.saleT -= dt;
      if (CL3.saleT <= 0) {
        CL3.saleT = 8 + Math.random() * 8;
        if (SAVE.biz.stock > 0) {
          var w = _c3walker([0xff8a3d, 0x59c8ff, 0xc77dff, 0x59d867][(Math.random() * 4) | 0]);
          var sx = CL3_SHOP.x + (Math.random() < 0.5 ? -14 : 14), sz = CL3_SHOP.z + 8 + Math.random() * 6;
          w.position.set(sx, 0, sz);
          LEVEL.group.add(w);
          CL3.cust = { g: w, phase: 'in', wait: 0 };
        } else {
          _c3toast(_c3t('cl3.nostock'));
        }
      }
      return;
    }
    var cu = CL3.cust, tx = CL3_SHOP.x + 1.4, tz = CL3_SHOP.z + 3.4;
    var dx = tx - cu.g.position.x, dz = tz - cu.g.position.z;
    var d = Math.sqrt(dx * dx + dz * dz);
    if (cu.phase === 'in') {
      if (d > 0.6) {
        var sp = 3.2 * dt / Math.max(d, 0.001);
        cu.g.position.x += dx * sp; cu.g.position.z += dz * sp;
        cu.g.rotation.y = Math.atan2(dx, dz);
        cu.g.position.y = Math.abs(Math.sin(_c3now() * 9)) * 0.08;
      } else { // ¡compra!
        cu.phase = 'wait'; cu.wait = 1.6;
        var profit = Math.round(giro.price * BIZ_MULT[SAVE.biz.level || 1]);
        SAVE.biz.stock--; SAVE.biz.earned = (SAVE.biz.earned || 0) + profit; _bizSave();
        _c3earn(profit); _c3sfx('coin');
        _c3burst(tx, 1.6, tz, [0xffe95e, 0x59d867, 0xffffff], 18, 5);
        _c3toast(_c3t('cl3.sale') + ' +' + profit + ' 🪙');
      }
    } else if (cu.phase === 'wait') {
      cu.wait -= dt;
      if (cu.wait <= 0) { cu.phase = 'out'; cu.ox = cu.g.position.x + (cu.g.position.x < CL3_SHOP.x ? -16 : 16); }
    } else { // out
      var ox = cu.ox - cu.g.position.x, oz = (CL3_SHOP.z + 10) - cu.g.position.z;
      var od = Math.sqrt(ox * ox + oz * oz);
      if (od > 1) {
        var s2 = 3.2 * dt / Math.max(od, 0.001);
        cu.g.position.x += ox * s2; cu.g.position.z += oz * s2;
        cu.g.rotation.y = Math.atan2(ox, oz);
        cu.g.position.y = Math.abs(Math.sin(_c3now() * 9)) * 0.08;
      } else {
        try { if (cu.g.parent) cu.g.parent.remove(cu.g); } catch (e) {}
        CL3.cust = null;
      }
    }
  } catch (e) { CL3.cust = null; }
}

/* ============================== d) BANCO ============================== */
function _bankUpdate(dt) {
  if (!_c3inCity()) return;
  try {
    CL3.dayAcc = (CL3.dayAcc || 0) + dt;
    if (CL3.dayAcc >= BANK_DAY) {
      CL3.dayAcc = 0;
      var bal = (SAVE.bank && SAVE.bank.balance) || 0;
      if (bal > 0) {
        var bonus = Math.max(1, Math.round(bal * 0.02));
        SAVE.bank.balance = bal + bonus; _bizSave();
        _c3toast(_c3t('cl3.interest') + bonus + ' 🪙');
        _c3sfx('coin');
      }
    }
  } catch (e) {}
}
function _bankMove(kind, amount) { // kind: 'dep' | 'wd'
  try {
    SAVE.bank = SAVE.bank || { balance: 0 };
    if (kind === 'dep') {
      var have = SAVE.coins || 0;
      var dep = amount === 'all' ? have : Math.min(amount, have);
      if (dep <= 0) { _c3toast(_c3t('cl3.noFunds')); _c3sfx('deny'); return; }
      SAVE.coins = have - dep; SAVE.bank.balance += dep;
    } else {
      var bal = SAVE.bank.balance || 0;
      var wd = amount === 'all' ? bal : Math.min(amount, bal);
      if (wd <= 0) { _c3toast(_c3t('cl3.noFunds')); _c3sfx('deny'); return; }
      SAVE.bank.balance = bal - wd; SAVE.coins = (SAVE.coins || 0) + wd;
    }
    persist();
    var h = $('hud-coins'); if (h) h.textContent = SAVE.coins;
    _c3sfx('check');
    _openBankPanel();
  } catch (e) {}
}

/* ============================== e) KARAOKE ============================== */
/* 3 canciones 100% inventadas (letras propias, cortas) */
var KARAOKE_SONGS = [
  {
    id: 's1', title: 'Luces de mi ciudad', emoji: '🌃',
    beats: ['Bri', 'lla', 'la', 'ciu', 'dad', 'can', 'ta', 'con', 'mi', 'go', 'la', 'no', 'che', 'es', 'fies', 'ta', 'y', 'paz'],
  },
  {
    id: 's2', title: 'El camión de la alegría', emoji: '🛻',
    beats: ['Su', 'be', 'al', 'ca', 'mión', 'que', 'ya', 'va', 'a', 'sa', 'lir', 'la', 'fies', 'ta', 'no', 'va', 'a', 'pa', 'rar'],
  },
  {
    id: 's3', title: 'Sabor a paleta', emoji: '🍦',
    beats: ['Dul', 'ce', 'pa', 'le', 'ta', 'de', 'li', 'món', 'fres', 'ca', 'pa', 'ra', 'el', 'ca', 'lor', 'qué', 'ri', 'co', 'sa', 'bor'],
  },
];
var KARA_BEAT = 0.55, KARA_WIN = 0.28;
function _karaStart(songId) {
  var song = null;
  for (var i = 0; i < KARAOKE_SONGS.length; i++) if (KARAOKE_SONGS[i].id === songId) song = KARAOKE_SONGS[i];
  if (!song) return;
  var times = [];
  for (var b = 0; b < song.beats.length; b++) times.push(1.2 + b * KARA_BEAT); // 1.2 s de conteo
  CL3.kara = { song: song, times: times, hits: 0, cur: 0, t: 0, done: false, lastCur: -1 };
  _c3sfx('power');
  _renderKaraPanel();
}
function _karaTap() {
  var k = CL3.kara;
  if (!k || k.done) return;
  try { Audio2.init(); } catch (e) {}
  var ti = k.times[k.cur];
  if (ti == null) return;
  if (Math.abs(k.t - ti) <= KARA_WIN) {
    k.hits++; k.cur++;
    _c3sfx('check');
    _c3burst(CL3_KARA.x, 2.5, CL3_KARA.z + 4, [0xff9eff, 0xffe95e, 0xffffff], 8, 4);
  } else {
    _c3sfx('oops');
  }
  _karaPaint();
}
function _karaEnd() {
  var k = CL3.kara;
  if (!k || k.done) return;
  k.done = true;
  var total = k.song.beats.length;
  var score = Math.round((k.hits / total) * 100);
  var prize = 0, msg;
  if (score >= 85) { prize = 60; msg = 'cl3.karaPrize1'; }
  else if (score >= 60) { prize = 30; msg = 'cl3.karaPrize2'; }
  else if (score >= 30) { prize = 10; msg = 'cl3.karaPrize3'; }
  else msg = 'cl3.karaPrize0';
  if (prize > 0) { _c3earn(prize); _c3sfx('win'); } else { _c3sfx('oops'); }
  _c3toast(_c3t(msg));
  CL3.kara = null;
  _openKaraPanel();
}
function _updateKaraoke(dt) {
  var k = CL3.kara;
  if (!k || k.done) return;
  try {
    k.t += dt;
    // sílabas perdidas (se pasó la ventana sin tocar)
    while (k.cur < k.times.length && k.t > k.times[k.cur] + KARA_WIN) k.cur++;
    if (k.cur >= k.times.length) { _karaEnd(); return; }
    if (k.cur !== k.lastCur) _karaPaint();
    // bip de guía en cada sílaba (suave)
    if (k.cur !== k.lastCur) {
      try { if (typeof Audio2 !== 'undefined' && Audio2.tone) Audio2.tone(660, 0.07, 'sine', 0.06); } catch (e) {}
      k.lastCur = k.cur;
    }
  } catch (e) {}
}
function _karaPaint() { // resalta la sílaba actual en el panel
  var k = CL3.kara;
  if (!k) return;
  try {
    var el = document.getElementById('cl3-klyr');
    if (!el) return;
    var spans = el.querySelectorAll('span');
    for (var i = 0; i < spans.length; i++) {
      var sp = spans[i];
      if (i < k.cur) { sp.style.color = '#59d867'; sp.style.background = 'transparent'; }
      else if (i === k.cur) { sp.style.color = '#1a1a1a'; sp.style.background = '#ffe95e'; }
      else { sp.style.color = '#fff'; sp.style.background = 'transparent'; }
    }
    var sc = document.getElementById('cl3-ksc');
    if (sc) sc.textContent = _c3t('cl3.karaScore') + ': ' + k.hits + '/' + k.song.beats.length;
  } catch (e) {}
}

/* ============================== f) BOMBEROS ============================== */
function _clearFire() {
  try { if (CL3.fire && CL3.fire.group && CL3.fire.group.parent) CL3.fire.group.parent.remove(CL3.fire.group); } catch (e) {}
  CL3.fire = null;
}
function _startFire() {
  _clearFire();
  if (!_c3inCity() || !LEVEL || !LEVEL.group) return;
  try {
    var hx = 20 + Math.random() * 60, hz = 60 + Math.random() * 60;
    var houses = (LEVEL && LEVEL.houses) || [];
    if (houses.length) {
      var h = houses[(Math.random() * houses.length) | 0];
      hx = h.x; hz = h.z;
    }
    var g = new THREE.Group();
    var flames = [];
    var fcols = [0xff6f00, 0xffc400, 0xff1744];
    for (var i = 0; i < 3; i++) {
      var f = new THREE.Mesh(_c3geo('flm' + i, (function (n) {
        return function () { return new THREE.ConeGeometry(0.5 - n * 0.1, 1.3 - n * 0.25, 8); };
      })(i)), _c3mat(fcols[i], 'glow'));
      f.position.set(hx + (i - 1) * 0.5, 0.7, hz + (i % 2) * 0.4 - 0.2);
      g.add(f); flames.push(f);
    }
    var smokes = [];
    for (var s2 = 0; s2 < 6; s2++) {
      var sm = new THREE.Mesh(_c3geo('fsmk', function () { return new THREE.SphereGeometry(0.55, 7, 6); }), _c3mat(0x555560));
      sm.position.set(hx, 1 + s2 * 0.5, hz);
      sm.userData.t = Math.random() * 3;
      g.add(sm); smokes.push(sm);
    }
    LEVEL.group.add(g);
    CL3.fire = { group: g, x: hx, z: hz, flames: flames, smokes: smokes, ttl: 120, next: 40 + Math.random() * 40 };
    _c3toast(_c3t('cl3.fireAlert'));
    _c3sfx('fall');
  } catch (e) {}
}
function _putOutFire() {
  var F = CL3.fire;
  if (!F) return;
  try {
    _c3burst(F.x, 2, F.z, [0x59c8ff, 0xffffff, 0x2979ff], 40, 8);
    _clearFire();
    CL3.fire = { next: 40 + Math.random() * 40 }; // sin grupo = esperando el próximo
    _c3earn(FIRE_REWARD); _c3sfx('win');
    _c3toast(_c3t('cl3.fireOut'));
  } catch (e) {}
}
function _inFireTruck() {
  try {
    return (typeof Vehicle !== 'undefined' && Vehicle.mode === 'car' && Vehicle.def &&
      Vehicle.def.vtype === 'geayi-fire' && Vehicle.def.mesh);
  } catch (e) { return false; }
}
function _updateFire(dt) {
  if (!_c3inCity()) { _clearFire(); return; }
  try {
    if (!CL3.fire || !CL3.fire.group) {
      var nx = (CL3.fire && CL3.fire.next) || 25;
      nx -= dt;
      CL3.fire = { next: nx };
      if (nx <= 0) _startFire();
      return;
    }
    var F = CL3.fire, now = _c3now();
    for (var i = 0; i < F.flames.length; i++) { // llamas que parpadean
      F.flames[i].scale.y = 0.85 + Math.abs(Math.sin(now * 11 + i * 2)) * 0.5;
      F.flames[i].rotation.y += dt * 3;
    }
    for (var s2 = 0; s2 < F.smokes.length; s2++) { // humo que sube en loop
      var sm = F.smokes[s2];
      sm.userData.t += dt;
      var tt = sm.userData.t % 3;
      sm.position.y = 1.5 + tt * 1.6;
      var sc = 0.7 + tt * 0.5;
      sm.scale.set(sc, sc, sc);
    }
    F.ttl -= dt;
    if (F.ttl <= 0) { // se apagó solo
      _clearFire();
      CL3.fire = { next: 40 + Math.random() * 40 };
      _c3toast(_c3t('cl3.fireGone'));
    }
  } catch (e) {}
}

/* ============================== c) GPS / MINIMAPA ============================== */
var MAP_R = 170, MAP_PX = 300;
function _mapLandmarks() {
  var lm = [];
  if (_c3inCity()) {
    lm.push({ e: '🏦', x: CL3_BANK.x, z: CL3_BANK.z });
    lm.push({ e: '🎤', x: CL3_KARA.x, z: CL3_KARA.z });
    lm.push({ e: '🚒', x: CL3_FIRE.x, z: CL3_FIRE.z });
    if (SAVE.biz && SAVE.biz.owned) lm.push({ e: '🏪', x: CL3_SHOP.x, z: CL3_SHOP.z });
    lm.push({ e: '🏠', x: -20, z: 40 });
    lm.push({ e: '🌱', x: 30, z: 118 });
    lm.push({ e: '🏗️', x: 60, z: 140 });
  }
  var p = _plaza();
  lm.push({ e: '🎉', x: p.x, z: p.z });
  return lm;
}
function _w2m(x, z) { // mundo → píxeles del mapa
  return [(x + MAP_R) / (MAP_R * 2) * MAP_PX, (z + MAP_R) / (MAP_R * 2) * MAP_PX];
}
function _m2w(px, pz) { // píxeles → mundo
  return [px / MAP_PX * (MAP_R * 2) - MAP_R, pz / MAP_PX * (MAP_R * 2) - MAP_R];
}
function _drawMap() {
  var ctx = CL3.mapCtx;
  if (!ctx) return;
  try {
    ctx.fillStyle = '#0d1626'; ctx.fillRect(0, 0, MAP_PX, MAP_PX);
    ctx.strokeStyle = 'rgba(120,180,255,0.25)'; ctx.lineWidth = 1;
    for (var s = 0; s <= MAP_PX; s += MAP_PX / 17) { // rejilla de calles
      ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(s, MAP_PX); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, s); ctx.lineTo(MAP_PX, s); ctx.stroke();
    }
    ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var lm = _mapLandmarks();
    for (var i = 0; i < lm.length; i++) {
      var p = _w2m(lm[i].x, lm[i].z);
      ctx.fillText(lm[i].e, p[0], p[1]);
    }
    if (CL3.waypoint) { // waypoint 📍
      var w = _w2m(CL3.waypoint.x, CL3.waypoint.z);
      ctx.fillText('📍', w[0], w[1] - 10);
    }
    if (typeof Player !== 'undefined' && Player && Player.pos) { // jugador 🔵
      var pp = _w2m(Player.pos.x, Player.pos.z);
      ctx.fillStyle = '#29b6ff';
      ctx.beginPath(); ctx.arc(pp[0], pp[1], 7, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      var hd = Player.heading || 0;
      ctx.strokeStyle = '#ffe95e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(pp[0], pp[1]);
      ctx.lineTo(pp[0] + Math.sin(hd) * 16, pp[1] + Math.cos(hd) * 16); ctx.stroke();
      if (CL3.waypoint) { // distancia al punto
        var dd = Math.sqrt(_c3d2(Player.pos.x, Player.pos.z, CL3.waypoint.x, CL3.waypoint.z));
        var el = document.getElementById('cl3-mapdist');
        if (el) el.textContent = '📍 ' + Math.round(dd) + ' m';
      }
    }
  } catch (e) {}
}
function _toggleMap(open) {
  try {
    if (!CL3.mapOv) return;
    var show = (typeof open === 'boolean') ? open : CL3.mapOv.classList.contains('hidden');
    CL3.mapOv.classList.toggle('hidden', !show);
    if (show) { _c3sfx('click'); _drawMap(); }
  } catch (e) {}
}

/* ============================== g) MASCOTA: llamar / alejar ============================== */
function _petEquipped() {
  try {
    if (typeof petId === 'function') return petId() !== 'none';
    return (SAVE.pet === 'dog' || SAVE.pet === 'cat');
  } catch (e) { return false; }
}
function _togglePet() {
  if (!_petEquipped()) { _c3toast(_c3t('cl3.petNone')); _c3sfx('deny'); return; }
  try {
    if (typeof Pets === 'undefined') return;
    if (Pets.isAway && Pets.isAway()) {
      if (Pets.call) Pets.call();
      _c3sfx('check');
      _c3toast(_c3t('cl3.petCall'));
      _c3burst(Player.pos.x, 1.5, Player.pos.z, [0xffe95e, 0xffffff], 12, 4);
    } else {
      if (Pets.setAway) Pets.setAway(true);
      _c3sfx('click');
      _c3toast(_c3t('cl3.petAway'));
    }
  } catch (e) {}
}

/* ============================== UI: botones, panel, proximidad ============================== */
function _mkBtn(id, label, top, onclick) {
  var b = document.createElement('button');
  b.id = id;
  b.textContent = label;
  b.style.cssText = 'position:fixed;right:10px;top:' + top + 'px;z-index:41;width:52px;height:52px;' +
    'font-size:26px;border-radius:16px;border:3px solid #fff;background:rgba(20,14,40,.72);' +
    'box-shadow:0 4px 12px rgba(0,0,0,.45);font-family:inherit;';
  b.addEventListener('click', onclick);
  document.body.appendChild(b);
  return b;
}
function _ensureUI() {
  if (CL3.ui) return;
  CL3.ui = true;
  try {
    _mkBtn('cl3-map-btn', '🗺️', 100, function () { _toggleMap(); });
    _mkBtn('cl3-season-btn', '🎉', 160, function () { _openSeasonPanel(); });
    _mkBtn('cl3-pet-btn', '🐾', 280, function () { _togglePet(); });
    // botón de acción contextual (banco / karaoke / negocio / agua)
    var act = document.createElement('button');
    act.id = 'cl3-act-btn';
    act.style.cssText = 'position:fixed;right:14px;bottom:336px;z-index:41;display:none;' +
      'font-size:20px;font-weight:900;padding:14px 20px;border-radius:999px;border:4px solid #fff;' +
      'background:linear-gradient(180deg,#29b6ff,#1565ff);color:#fff;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.45);font-family:inherit;';
    act.addEventListener('click', function () { _actPress(); });
    document.body.appendChild(act);
    CL3.act = act;
    // panel genérico
    var p = document.createElement('div');
    p.id = 'cl3-panel';
    p.className = 'screen overlay hidden';
    document.body.appendChild(p);
    CL3.panel = p;
    // overlay del minimapa
    var ov = document.createElement('div');
    ov.id = 'cl3-mapov';
    ov.className = 'screen overlay hidden';
    ov.innerHTML = '<div class="panel" style="max-width:340px;width:100%;text-align:center">' +
      '<h2>' + _c3t('cl3.mapTitle') + '</h2>' +
      '<canvas id="cl3-mapcv" width="' + MAP_PX + '" height="' + MAP_PX + '" ' +
      'style="width:100%;border-radius:12px;border:3px solid #fff;touch-action:manipulation"></canvas>' +
      '<div id="cl3-mapdist" style="margin:6px 0;font-weight:800;color:#ffe95e;min-height:22px"></div>' +
      '<div style="font-size:13px;opacity:.8;margin-bottom:8px">' + _c3t('cl3.waypoint') + '</div>' +
      '<div class="menu-buttons"><button class="btn" id="cl3-mapclose">✕ ' + _c3t('cl3.close') + '</button></div></div>';
    document.body.appendChild(ov);
    CL3.mapOv = ov;
    var cv = document.getElementById('cl3-mapcv');
    if (cv) {
      CL3.mapCtx = cv.getContext('2d');
      cv.addEventListener('click', function (ev) {
        try {
          var r = cv.getBoundingClientRect();
          var px = (ev.clientX - r.left) / r.width * MAP_PX;
          var pz = (ev.clientY - r.top) / r.height * MAP_PX;
          var w = _m2w(px, pz);
          CL3.waypoint = { x: w[0], z: w[1] };
          _c3sfx('click');
          _drawMap();
        } catch (e) {}
      });
    }
    var mc = document.getElementById('cl3-mapclose');
    if (mc) mc.addEventListener('click', function () { _toggleMap(false); });
  } catch (e) {}
}
function _openPanel(html) {
  _ensureUI();
  if (!CL3.panel) return;
  CL3.panel.innerHTML = '<div class="panel" style="max-width:430px;width:100%">' + html +
    '<div class="menu-buttons"><button class="btn" id="cl3-pclose">✕ ' + _c3t('cl3.close') + '</button></div></div>';
  CL3.panel.classList.remove('hidden');
  var c = document.getElementById('cl3-pclose');
  if (c) c.addEventListener('click', function () { _closePanel(); _c3sfx('click'); });
}
function _closePanel() { try { if (CL3.panel) CL3.panel.classList.add('hidden'); } catch (e) {} }
function _panelBtn(id, fn) {
  try {
    var b = document.getElementById(id);
    if (b) b.addEventListener('click', function () { try { Audio2.init(); Audio2.click(); } catch (e) {} fn(); });
  } catch (e) {}
}
/* ---- panel de temporadas ---- */
function _openSeasonPanel() {
  _c3sfx('click');
  var cur = 'auto';
  try { cur = SAVE.season || 'auto'; } catch (e) {}
  var opts = [
    ['auto', _c3t('cl3.seasonAuto')], ['halloween', _c3t('cl3.s.halloween')],
    ['navidad', _c3t('cl3.s.navidad')], ['sept15', _c3t('cl3.s.sept15')], ['none', _c3t('cl3.seasonNone')],
  ];
  var html = '<h2>' + _c3t('cl3.seasonTitle') + '</h2>';
  opts.forEach(function (o) {
    html += '<div class="menu-buttons"><button class="btn btn-big" data-sea="' + o[0] + '" ' +
      (cur === o[0] ? 'style="outline:3px solid #ffe95e"' : '') + '>' + o[1] + '</button></div>';
  });
  _openPanel(html);
  Array.prototype.forEach.call(CL3.panel.querySelectorAll('[data-sea]'), function (b) {
    b.addEventListener('click', function () {
      try {
        SAVE.season = b.getAttribute('data-sea'); persist();
        _buildSeason();
        if (SAVE.season === 'none') _c3toast(_c3t('cl3.soon.off'));
        _closePanel();
      } catch (e) {}
    });
  });
}
/* ---- panel del negocio ---- */
function _openShopPanel() {
  _c3sfx('click');
  var html = '<h2>' + _c3t('cl3.shopTitle') + '</h2>';
  if (!SAVE.biz.owned) {
    html += '<div class="job-note">🏪 $800</div>' +
      '<div class="menu-buttons"><button class="btn btn-big" id="cl3-buy">🏪 ' + _c3t('cl3.shopBuy') + '</button></div>';
    _openPanel(html);
    _panelBtn('cl3-buy', _buyStore);
    return;
  }
  if (!SAVE.biz.giro) {
    html += '<div class="job-note">' + _c3t('cl3.shopPick') + '</div>';
    GIROS.forEach(function (gr) {
      html += '<div class="job-card"><div class="job-emoji">' + gr.emoji + '</div>' +
        '<div class="job-info"><div class="job-name">' + gr.name + '</div>' +
        '<div class="job-desc">$' + gr.price + ' 🪙 c/u</div></div>' +
        '<button class="btn job-go" data-giro="' + gr.id + '">▶</button></div>';
    });
    _openPanel(html);
    Array.prototype.forEach.call(CL3.panel.querySelectorAll('[data-giro]'), function (b) {
      b.addEventListener('click', function () { _pickGiro(b.getAttribute('data-giro')); });
    });
    return;
  }
  var giro = _giroById(SAVE.biz.giro), lv = SAVE.biz.level || 1;
  var gain = Math.round(giro.price * BIZ_MULT[lv]);
  html += '<div class="job-active">' + giro.emoji + ' <b>' + giro.name + '</b><br>' +
    '<span>' + _c3t('cl3.level') + ': ' + lv + '/3 · ' + _c3t('cl3.stock') + ': ' + SAVE.biz.stock +
    ' · ' + _c3t('cl3.earned') + ': ' + (SAVE.biz.earned || 0) + ' 🪙</span><br>' +
    '<span>🧾 $' + gain + ' 🪙 por venta</span></div>' +
    '<div class="menu-buttons"><button class="btn btn-big" id="cl3-restock">' + _c3t('cl3.restock') + '</button></div>';
  if (lv < 3) html += '<div class="menu-buttons"><button class="btn btn-big" id="cl3-up">' +
    _c3t('cl3.upgrade') + ' ($' + BIZ_UP_COST[lv] + ')</button></div>';
  else html += '<div class="job-note">' + _c3t('cl3.maxLevel') + '</div>';
  _openPanel(html);
  _panelBtn('cl3-restock', _restock);
  _panelBtn('cl3-up', _upgradeBiz);
}
/* ---- panel del banco ---- */
function _openBankPanel() {
  _c3sfx('click');
  var bal = (SAVE.bank && SAVE.bank.balance) || 0;
  var pct = Math.min(100, Math.round(((CL3.dayAcc || 0) / BANK_DAY) * 100));
  var html = '<h2>' + _c3t('cl3.bankTitle') + '</h2>' +
    '<div class="job-active">💰 <b>' + _c3t('cl3.balance') + ': ' + bal + ' 🪙</b><br>' +
    '<span>' + _c3t('cl3.day') + ': ' + pct + '% · +2%</span></div>' +
    '<div class="job-note">💵 ' + _c3t('cl3.deposit') + '</div>' +
    '<div class="menu-buttons"><button class="btn" data-bk="dep:10">+10</button>' +
    '<button class="btn" data-bk="dep:100">+100</button>' +
    '<button class="btn" data-bk="dep:all">' + _c3t('cl3.all') + '</button></div>' +
    '<div class="job-note">💸 ' + _c3t('cl3.withdraw') + '</div>' +
    '<div class="menu-buttons"><button class="btn" data-bk="wd:10">−10</button>' +
    '<button class="btn" data-bk="wd:100">−100</button>' +
    '<button class="btn" data-bk="wd:all">' + _c3t('cl3.all') + '</button></div>';
  _openPanel(html);
  Array.prototype.forEach.call(CL3.panel.querySelectorAll('[data-bk]'), function (b) {
    b.addEventListener('click', function () {
      var p = b.getAttribute('data-bk').split(':');
      _bankMove(p[0], p[1] === 'all' ? 'all' : parseInt(p[1], 10));
    });
  });
}
/* ---- panel del karaoke ---- */
function _openKaraPanel() {
  _c3sfx('click');
  var html = '<h2>' + _c3t('cl3.karaTitle') + '</h2>' +
    '<div class="job-note">' + _c3t('cl3.karaPick') + '</div>';
  KARAOKE_SONGS.forEach(function (s) {
    html += '<div class="job-card"><div class="job-emoji">' + s.emoji + '</div>' +
      '<div class="job-info"><div class="job-name">' + s.title + '</div>' +
      '<div class="job-desc">' + s.beats.length + ' 🎵</div></div>' +
      '<button class="btn job-go" data-song="' + s.id + '">▶</button></div>';
  });
  _openPanel(html);
  Array.prototype.forEach.call(CL3.panel.querySelectorAll('[data-song]'), function (b) {
    b.addEventListener('click', function () { _karaStart(b.getAttribute('data-song')); });
  });
}
function _renderKaraPanel() {
  var k = CL3.kara;
  if (!k) return;
  var words = k.song.beats.map(function (b) { return '<span style="padding:2px 3px;border-radius:6px">' + b + '</span>'; }).join(' ');
  _openPanel('<h2>' + k.song.emoji + ' ' + k.song.title + '</h2>' +
    '<div id="cl3-klyr" style="font-size:22px;font-weight:800;line-height:2;background:rgba(0,0,0,.35);' +
    'border-radius:12px;padding:12px;margin-bottom:10px">' + words + '</div>' +
    '<div id="cl3-ksc" style="font-size:18px;font-weight:800;color:#ffe95e;margin-bottom:10px"></div>' +
    '<div class="menu-buttons"><button class="btn btn-big" id="cl3-ktap" ' +
    'style="font-size:30px;padding:22px">' + _c3t('cl3.karaTap') + '</button></div>');
  _panelBtn('cl3-ktap', _karaTap);
  k.lastCur = -1;
  _karaPaint();
}
/* ---- botón de acción contextual por proximidad ---- */
var CL3_ACT = null; // 'bank' | 'kara' | 'shop' | 'water'
function _actPress() {
  if (!CL3_ACT) return;
  if (CL3_ACT === 'bank') _openBankPanel();
  else if (CL3_ACT === 'kara') _openKaraPanel();
  else if (CL3_ACT === 'shop') _openShopPanel();
  else if (CL3_ACT === 'water') _putOutFire();
}
function _setAct(label, act) {
  CL3_ACT = act || null;
  try {
    if (!CL3.act) return;
    CL3.act.style.display = label ? '' : 'none';
    if (label) CL3.act.textContent = label;
  } catch (e) {}
}
function _proximity(dt) {
  CL3.proxT -= dt;
  if (CL3.proxT > 0) return;
  CL3.proxT = 0.25;
  _setAct(null);
  if (typeof MODE === 'undefined' || MODE !== 'play' || !_c3inCity()) return;
  try {
    // 💦 apagar incendio: en el camión y cerca del fuego
    if (CL3.fire && CL3.fire.group && _inFireTruck()) {
      var tp = Vehicle.def.mesh.position;
      if (_c3d2(tp.x, tp.z, CL3.fire.x, CL3.fire.z) < 196) { // < 14 m
        _setAct(_c3t('cl3.water'), 'water');
        return;
      }
    }
    if (!_c3onFoot() || !Player || !Player.pos) return;
    var P = Player.pos;
    if (_c3d2(P.x, P.z, CL3_BANK.x, CL3_BANK.z) < 36) { _setAct(_c3t('cl3.actBank'), 'bank'); }
    else if (_c3d2(P.x, P.z, CL3_KARA.x, CL3_KARA.z) < 36) { _setAct(_c3t('cl3.actKara'), 'kara'); }
    else if (_c3d2(P.x, P.z, CL3_SHOP.x, CL3_SHOP.z) < 36) { _setAct(_c3t('cl3.actShop'), 'shop'); }
  } catch (e) {}
}

/* ============================== API pública ============================== */
var CityLife3 = {
  init: function () {
    if (CL3.inited) return;
    CL3.inited = true;
    try {
      SAVE.season = SAVE.season || 'auto';
      SAVE.biz = Object.assign({ owned: false, giro: null, stock: 0, level: 1, earned: 0 }, SAVE.biz || {});
      SAVE.bank = Object.assign({ balance: 0 }, SAVE.bank || {});
      persist();
    } catch (e) {}
    _registerFireTruck();
    _ensureUI();
  },
  onLevelStart: function (idx) {
    CL3.idx = (typeof idx === 'number') ? idx : -1;
    try {
      _ensureUI();
      _clearSeason(); _clearCity(); _clearFire();
      CL3.kara = null; CL3.cust = null; CL3.saleT = 12;
      CL3.dayAcc = 0; CL3.waypoint = null;
      _closePanel(); _toggleMap(false);
      _buildCity();    // banco, karaoke, bomberos, negocio (solo Immokalee)
      _buildSeason();  // decoración de temporada (todos los mundos)
      if (!_c3inCity()) _removeFireTruck();
      else if (CL3.fire) CL3.fire.next = 25;
      else CL3.fire = { next: 25 };
    } catch (e) {}
  },
  onLevelEnd: function () {
    try {
      _clearSeason(); _clearCity(); _clearFire();
      CL3.kara = null; CL3.cust = null;
      _closePanel(); _toggleMap(false);
      _setAct(null);
      persist();
    } catch (e) {}
  },
  update: function (dt) {
    try {
      _ensureUI();
      if (typeof MODE === 'undefined' || MODE !== 'play') { _setAct(null); return; }
      if (_seasonEff() !== CL3.seasonBuilt) _buildSeason(); // cambió la fecha o el botón
      _updateSeason(dt);
      _updateBusiness(dt);
      _bankUpdate(dt);
      _updateKaraoke(dt);
      _updateFire(dt);
      _proximity(dt);
      if (CL3.mapOv && !CL3.mapOv.classList.contains('hidden')) {
        CL3.mapT -= dt;
        if (CL3.mapT <= 0) { CL3.mapT = 0.15; _drawMap(); }
      }
    } catch (e) {}
  },
};

/* alias estilo game.js (como updateJobs) para el hook del loop */
function updateCityLife3(dt) { try { CityLife3.update(dt); } catch (e) {} }
function cityLife3LevelStart(idx) { try { CityLife3.onLevelStart(idx); } catch (e) {} }

if (typeof window !== 'undefined') {
  window.CityLife3 = CityLife3;
  window.updateCityLife3 = updateCityLife3;
  window.cityLife3LevelStart = cityLife3LevelStart;
}
