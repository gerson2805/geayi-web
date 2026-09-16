/* citylife1.js — 🏙️ VIDA DE CIUDAD · TANDA 1 para GEAYI: Obby Xtreme 3D
   Activo en mundos ciudad: idx 0 (Ciudad Neón) e idx 3 (Immokalee).
   - (a) Farolas propias (userData.streetLamp) que se encienden de noche usando
         el ciclo de weather.js (NO duplica el ciclo día/noche).
   - (b) Botón 🌧️ para activar/apagar la lluvia de weather.js (no duplica partículas).
   - (c) Policía 🚔 y ambulancia 🚑 de bloques originales, circuito rectangular, balizas parpadeantes.
   - (d) Semáforos propios (cambian de color) + 4 carros NPC que frenan en rojo.
   - (e) Tiendas: 🍔 comida (boost de velocidad con Player.fx.speedT) y 👕 ropa (sombreros HATS).
         Todo con SAVE.coins / persist().
   - (f) 🚌 Autobús escolar amarillo: ruta circular con paradas (se detiene 5 s).
   - (g) ⛽ Gasolinera: botón "⛽ Cargar" recarga CityLife1.fuel del carro actual.
   - (h) 🏁 Torneos de pesca de 60 s (cada 5 min o por botón), tabla local en SAVE.
   - (i) 🚔 COMISARÍA GEAYI (solo idx 3) + trabajo de policía: patrulla
         estacionada abordable (SUBIR), delincuentes NPC con antifaz que roban
         tiendas (💰), huida si te ven de frente, arresto a ≤4 m (manos arriba,
         te sigue o va en tu carro), encierro en celdas con rejas (+20 🪙,
         +25 con rango 50+), rango SAVE.policeRank (+5 por encierro), y fianza:
         cada celda muestra su precio (20 + rango/2); a los 60-90 s un NPC la
         paga, el delincuente sale libre y tú recibes el 50%.
   Diseño 100% original. Todo a nivel del suelo. Geometrías/materiales cacheados.
   Contrato: solo usa globales THREE, scene, $, SAVE, persist, LEVEL, MODE, Player,
   Vehicle, Weather, HATS, Audio2, toast, showBanner, buildCarMesh, buildBusMesh.
   NO ejecuta DOM al cargar: expón init(). Sin módulos: todo global. */
'use strict';

/* ================= estado ================= */
const CityLife1 = {
  ready: false,
  active: false,        // true en mundos ciudad (idx 0 / 3)
  idx: -1,
  rainOn: true,         // interruptor de la lluvia de weather.js
  fuel: 100,            // ⛽ combustible del carro actual (0..100)
};
const CL1 = {
  group: null,          // THREE.Group propio dentro de LEVEL.group
  lamps: [],            // {halo, panel} con userData.streetLamp
  police: null, amb: null, // {g, s, speed, bulbs:[m1,m2], phase}
  ambDef: null,          // def abordable de la ambulancia en LEVEL.cars
  rescue: null,          // {stage:'go'|'back', px, pz, hx, hz, npc, marker, ring}
  station: null,        // (i) comisaría: {x, z, cells:[...], patrolDef}
  crims: [],            // (i) delincuentes NPC activos
  cop: { on: false, spawnT: 12 }, // (i) trabajo de policía
  btnCop: null, btnArrest: null, chipCop: null,
  npcs: [],             // [{g, s, speed, lane}]
  tl: { state: 'green', t: 8 },   // semáforo: green→yellow→red
  tlHeads: [],          // {r, y, g} discos por cabeza
  bus: null,            // {g, s, speed, stopT, cool}
  stops: [],            // s (metros) de las paradas del bus
  shops: [],            // [{kind:'food'|'ropa', x, z, r}]
  gas: { x: -15, z: -2, r: 7 },
  actFor: null,         // 'food' | 'ropa' | 'gas' | null
  ui: false, btnRain: null, btnTour: null, btnAct: null, chipFuel: null, chipTour: null, panel: null,
  tour: { active: false, t: 0, start: 0, autoT: 300 },
  _fuelToastT: 0, _t: 0,
};
const CL1_WORLDS = [0, 3]; // 0 Ciudad Neón, 3 Immokalee

/* ================= cachés (Android: reutilizar) ================= */
const _cl1G = {}, _cl1M = {};
function _cl1Box(w, h, d) {
  const k = w + 'x' + h + 'x' + d;
  if (!_cl1G[k]) _cl1G[k] = new THREE.BoxGeometry(w, h, d);
  return _cl1G[k];
}
function _cl1Mat(color, basic) {
  const k = color + '|' + (basic ? 'b' : 's');
  if (!_cl1M[k]) {
    _cl1M[k] = basic
      ? new THREE.MeshBasicMaterial({ color })
      : new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
  }
  return _cl1M[k];
}
function _cl1Mesh(w, h, d, color, basic, x, y, z, parent) {
  const m = new THREE.Mesh(_cl1Box(w, h, d), _cl1Mat(color, basic));
  if (x !== undefined) m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
function _cl1SignTex(lines, bg, fg) {
  try {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 256, 128);
    x.strokeStyle = fg; x.lineWidth = 8; x.strokeRect(6, 6, 244, 116);
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    const n = lines.length;
    lines.forEach((ln, i) => {
      x.font = 'bold ' + (n > 1 ? 44 : 56) + 'px sans-serif';
      x.fillText(ln, 128, 64 + (i - (n - 1) / 2) * 52);
    });
    return new THREE.CanvasTexture(c);
  } catch (e) { return null; }
}
function _cl1Sign(parent, x, y, z, ry, w, h, lines, bg, fg) {
  const tex = _cl1SignTex(lines, bg || '#14213d', fg || '#ffffff');
  if (!tex) return null;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w || 3, h || 1.5),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = ry || 0;
  parent.add(m);
  return m;
}
function _cl1Click() { try { if (typeof Audio2 !== 'undefined' && Audio2.click) Audio2.click(); } catch (e) {} }
function _cl1Toast(msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) {} }
function _cl1Banner(t, s, ms) { try { if (typeof showBanner === 'function') showBanner(t, s, ms); } catch (e) {} }

/* ================= circuito rectangular (avenida x=0, z 0..112) ================= */
const CL1_Z0 = 0, CL1_Z1 = 112;
function _cl1LoopLen(lane) { return 2 * (CL1_Z1 - CL1_Z0) + 2 * Math.PI * lane; }
// s → {x, z, ry}; el frente de los meshes apunta a +z
function _cl1LoopPos(s, lane, out) {
  const L = CL1_Z1 - CL1_Z0, turn = Math.PI * lane;
  const total = 2 * L + 2 * turn;
  s = ((s % total) + total) % total;
  let x, z, ry;
  if (s < L) {                       // recta A: x=-lane, va a +z
    x = -lane; z = CL1_Z0 + s; ry = 0;
  } else if (s < L + turn) {         // giro norte
    const a = (s - L) / lane;
    x = -lane * Math.cos(a); z = CL1_Z1 + lane * Math.sin(a); ry = a;
  } else if (s < 2 * L + turn) {     // recta B: x=+lane, va a -z
    x = lane; z = CL1_Z1 - (s - L - turn); ry = Math.PI;
  } else {                           // giro sur
    const a = (s - 2 * L - turn) / lane;
    x = lane * Math.cos(a); z = CL1_Z0 - lane * Math.sin(a); ry = a + Math.PI;
  }
  out.x = x; out.z = z; out.ry = ry;
  return out;
}
const _cl1P = { x: 0, z: 0, ry: 0 };

/* ================= (a) farolas ================= */
function _cl1BuildLamp(x, z, color) {
  const g = new THREE.Group();
  const poleM = _cl1Mat(0x2a2f3d, false);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.45, 8), poleM);
  base.position.set(0, 0.22, 0); g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 5.6, 8), poleM);
  pole.position.set(0, 2.8, 0); g.add(pole);
  const dir = x > 0 ? -1 : 1;
  _cl1Mesh(1.7, 0.12, 0.12, 0x2a2f3d, false, dir * 0.8, 5.5, 0, g);
  _cl1Mesh(0.7, 0.18, 0.34, 0x2a2f3d, false, dir * 1.6, 5.42, 0, g);
  const panel = _cl1Mesh(0.55, 0.06, 0.24, color, true, dir * 1.6, 5.32, 0, g);
  let halo = null;
  try {
    halo = new THREE.Sprite(new THREE.SpriteMaterial({
      color, transparent: true, opacity: 0.08,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    halo.scale.set(2.6, 2.6, 1);
    halo.position.set(dir * 1.6, 5.25, 0);
    g.add(halo);
  } catch (e) {}
  g.position.set(x, 0, z);
  g.userData.streetLamp = { halo, panel, on: false }; // (a) marca propia
  CL1.lamps.push(g.userData.streetLamp);
  return g;
}
function _cl1ScanLamps() {
  // (a) escanea LEVEL.group por si algún constructor marcó farolas
  try {
    if (!LEVEL || !LEVEL.group) return;
    LEVEL.group.traverse(o => {
      if (o && o.userData && o.userData.streetLamp && CL1.lamps.indexOf(o.userData.streetLamp) === -1)
        CL1.lamps.push(o.userData.streetLamp);
    });
  } catch (e) {}
}
function _cl1NightFactor() {
  try {
    if (typeof Weather !== 'undefined') {
      if (typeof Weather.nightFactor === 'number') return Weather.nightFactor;
      if (Weather.isNight && Weather.isNight()) return 1;
    }
  } catch (e) {}
  return 0;
}

/* ================= (c) policía y ambulancia (bloques originales) ================= */
function _cl1Wheels(g, list) {
  list.forEach(([wx, wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10), _cl1Mat(0x1c1e24, false));
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    g.add(w);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.32, 8), _cl1Mat(0x9aa5b1, false));
    rim.rotation.z = Math.PI / 2;
    rim.position.set(wx, 0.36, wz);
    g.add(rim);
  });
}
function _cl1Lightbar(g, y, z, c1, c2) {
  _cl1Mesh(1.1, 0.12, 0.3, 0x2b2f3a, false, 0, y, z, g);
  const b1 = _cl1Mesh(0.42, 0.22, 0.26, c1, true, -0.28, y + 0.16, z, g);
  const b2 = _cl1Mesh(0.42, 0.22, 0.26, c2, true, 0.28, y + 0.16, z, g);
  return [b1, b2];
}
function _cl1BuildPolice() {
  const g = new THREE.Group(), W = 0xffffff, B = 0x1a56db;
  _cl1Mesh(1.9, 0.62, 4.2, W, false, 0, 0.68, 0, g);                    // carrocería blanca
  _cl1Mesh(1.92, 0.3, 4.22, B, false, 0, 0.62, 0, g);                  // franja azul
  _cl1Mesh(1.5, 0.55, 1.9, 0x9fd8ff, false, 0, 1.2, -0.2, g);           // cabina
  _cl1Mesh(1.56, 0.1, 2.0, W, false, 0, 1.52, -0.2, g);                 // techo
  _cl1Mesh(0.5, 0.3, 0.06, 0xffe95e, true, -0.6, 0.72, 2.12, g);        // faros
  _cl1Mesh(0.5, 0.3, 0.06, 0xffe95e, true, 0.6, 0.72, 2.12, g);
  _cl1Mesh(1.2, 0.35, 0.06, 0x1a56db, true, 0, 0.72, 2.13, g);          // "POLICÍA"
  _cl1Wheels(g, [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]);
  const bulbs = _cl1Lightbar(g, 1.62, -0.2, 0xff2d2d, 0x2e6bff);
  _cl1Sign(g, 0, 1.05, 2.14, 0, 1.5, 0.5, ['🚔 POLICÍA'], '#1a56db', '#ffffff');
  return { g, bulbs };
}
function _cl1BuildAmbulance() {
  const g = new THREE.Group(), W = 0xf5f7fa, R = 0xe0342b;
  _cl1Mesh(2.1, 1.7, 5.2, W, false, 0, 1.25, -0.3, g);                  // caja
  _cl1Mesh(2.12, 0.5, 1.1, 0x9fd8ff, false, 0, 1.5, 2.6, g);            // cabina
  _cl1Mesh(0.5, 0.12, 0.06, R, true, -0.45, 1.05, -2.95, g);            // cruz roja
  _cl1Mesh(0.12, 0.5, 0.06, R, true, -0.45, 1.05, -2.95, g);
  _cl1Mesh(0.5, 0.12, 0.06, R, true, 0.45, 1.05, -2.95, g);
  _cl1Mesh(0.12, 0.5, 0.06, R, true, 0.45, 1.05, -2.95, g);
  _cl1Mesh(2.14, 0.25, 5.24, R, false, 0, 0.55, -0.3, g);               // franja roja
  _cl1Mesh(0.45, 0.3, 0.06, 0xffe95e, true, -0.65, 0.85, 3.16, g);
  _cl1Mesh(0.45, 0.3, 0.06, 0xffe95e, true, 0.65, 0.85, 3.16, g);
  _cl1Wheels(g, [[-1.0, 1.9], [1.0, 1.9], [-1.0, -1.6], [1.0, -1.6]]);
  const bulbs = _cl1Lightbar(g, 2.2, -0.3, 0xff2d2d, 0xffffff);
  _cl1Sign(g, 0, 1.7, 2.36, 0, 1.6, 0.5, ['🚑 AMBULANCIA'], '#e0342b', '#ffffff');
  return { g, bulbs };
}

/* ================= (d) semáforos + NPC ================= */
function _cl1BuildTrafficLight(x, z, faceRy) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 5.2, 8), _cl1Mat(0x30343d, false));
  pole.position.set(0, 2.6, 0); g.add(pole);
  _cl1Mesh(0.5, 1.35, 0.5, 0x1c1e24, false, 0, 4.35, 0, g);
  const mk = (c, dy) => {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), _cl1Mat(c, true));
    d.position.set(0, dy, 0.26); g.add(d);
    return d;
  };
  const head = { r: mk(0xff2d2d, 4.8), y: mk(0xffb300, 4.35), g: mk(0x2eff5a, 3.9) };
  CL1.tlHeads.push(head);
  g.position.set(x, 0, z); g.rotation.y = faceRy || 0;
  return g;
}
function _cl1TlTick(dt) {
  CL1.tl.t -= dt;
  if (CL1.tl.t <= 0) {
    if (CL1.tl.state === 'green') { CL1.tl.state = 'yellow'; CL1.tl.t = 2; }
    else if (CL1.tl.state === 'yellow') { CL1.tl.state = 'red'; CL1.tl.t = 8; }
    else { CL1.tl.state = 'green'; CL1.tl.t = 8; }
  }
  const st = CL1.tl.state;
  for (const h of CL1.tlHeads) {
    h.r.visible = st === 'red';
    h.y.visible = st === 'yellow';
    h.g.visible = st === 'green';
  }
}
const CL1_NPC_LANE = 1.6;
function _cl1NpcTarget(car) {
  let v = 8;
  const st = CL1.tl.state;
  if (st !== 'green') {
    _cl1LoopPos(car.s, CL1_NPC_LANE, _cl1P);
    // recta A (va +z): frenar antes del cruce z=20; recta B (va -z): antes de z=70
    const onA = _cl1P.ry === 0, onB = Math.abs(_cl1P.ry - Math.PI) < 0.01;
    if (onA && _cl1P.z > 11 && _cl1P.z < 17.5) v = 0;
    if (onB && _cl1P.z < 79 && _cl1P.z > 72.5) v = 0;
  }
  // seguir al de adelante
  for (const o of CL1.npcs) {
    if (o === car) continue;
    let d = (o.s - car.s) % _cl1LoopLen(CL1_NPC_LANE);
    if (d < 0) d += _cl1LoopLen(CL1_NPC_LANE);
    if (d < 5.5) v = Math.min(v, o.speed);
    if (d < 3.2) v = 0;
  }
  return v;
}

/* ================= (f) autobús escolar ================= */
function _cl1BuildBusStops(parent) {
  // paradas: [s en el circuito] — se detiene 5 s
  const lane = 2.2, L = CL1_Z1 - CL1_Z0, turn = Math.PI * lane;
  CL1.stops = [30, 90, L + turn + (L - 60)];
  const signAt = (x, z) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6), _cl1Mat(0x8a8f9a, false));
    p.position.set(x, 1.3, z); parent.add(p);
    _cl1Sign(parent, x, 2.9, z, 0, 1.8, 0.9, ['🚌', 'PARADA'], '#ffb300', '#3a2a00');
  };
  _cl1LoopPos(30, lane, _cl1P); signAt(_cl1P.x - 1.6, _cl1P.z);
  _cl1LoopPos(90, lane, _cl1P); signAt(_cl1P.x - 1.6, _cl1P.z);
  _cl1LoopPos(CL1.stops[2], lane, _cl1P); signAt(_cl1P.x + 1.6, _cl1P.z);
}

/* ================= (e) tiendas ================= */
const CL1_FOOD = [
  { emoji: '🌮', name: 'Taco', price: 5, secs: 45 },
  { emoji: '🍔', name: 'Hamburguesa', price: 10, secs: 75 },
  { emoji: '🥤', name: 'Malteada grande', price: 15, secs: 120 },
];
function _cl1BuildKiosk(kind, x, z) {
  const g = new THREE.Group();
  const base = kind === 'food' ? 0xff7a1a : 0x9d6bff;
  _cl1Mesh(3.4, 2.2, 2.6, base, false, 0, 1.1, 0, g);                 // local
  _cl1Mesh(3.8, 0.25, 3.0, 0xffffff, false, 0, 2.35, 0, g);            // toldo
  _cl1Mesh(3.8, 0.5, 0.25, kind === 'food' ? 0xe0342b : 0x2e6bff, false, 0, 2.1, 1.45, g);
  _cl1Mesh(1.8, 0.9, 0.08, 0x2b2f3a, false, 0, 1.0, 1.32, g);         // ventana
  _cl1Sign(g, 0, 3.0, 1.52, 0, 3.0, 1.1,
    kind === 'food' ? ['🍔 COMIDA'] : ['👕 ROPA'], kind === 'food' ? '#e0342b' : '#2e6bff', '#ffffff');
  g.position.set(x, 0, z);
  g.userData.shop = kind;
  return g;
}
function _cl1Save() { try { if (typeof persist === 'function') persist(); } catch (e) {} }
function _cl1Coins() { try { return (typeof SAVE !== 'undefined' && SAVE.coins) || 0; } catch (e) { return 0; } }
function _cl1Spend(n) {
  try {
    if (_cl1Coins() < n) { _cl1Toast('🪙 Te faltan monedas (' + n + ' 🪙)'); return false; }
    SAVE.coins -= n; _cl1Save();
    try { const mc = document.getElementById('menu-coins'); if (mc) mc.textContent = SAVE.coins; } catch (e) {}
    return true;
  } catch (e) { return false; }
}
/* compra de comida: boost de velocidad temporal (usa Player.fx.speedT de player.js) */
CityLife1.buyFood = function (i) {
  const it = CL1_FOOD[i];
  if (!it) return;
  _cl1Click();
  if (!_cl1Spend(it.price)) return;
  try {
    if (typeof Player !== 'undefined' && Player.fx) Player.fx.speedT = Math.max(Player.fx.speedT || 0, it.secs);
  } catch (e) {}
  _cl1Toast(it.emoji + ' ¡' + it.name + '! Velocidad ×1.45 por ' + it.secs + 's ⚡');
  _cl1ClosePanel();
};
/* compra de ropa: sombreros del catálogo HATS (mismo patrón que buyItem de game.js) */
CityLife1.buyHat = function (id) {
  _cl1Click();
  try {
    const h = (typeof HATS !== 'undefined' ? HATS : []).find(hh => hh.id === id);
    if (!h) return;
    if (!SAVE.ownedHats) SAVE.ownedHats = ['none'];
    if (SAVE.ownedHats.indexOf(id) !== -1) {
      SAVE.hat = id;
      try { if (typeof Avatar !== 'undefined' && Avatar.setHat) Avatar.setHat(id); } catch (e) {}
      _cl1Save(); _cl1Toast(h.emoji + ' ¡Puesto: ' + h.name + '!');
    } else {
      if (!_cl1Spend(h.price)) return;
      SAVE.ownedHats.push(id);
      SAVE.hat = id;
      try { if (typeof Avatar !== 'undefined' && Avatar.setHat) Avatar.setHat(id); } catch (e) {}
      _cl1Save(); _cl1Toast('🎉 ¡Comprado: ' + h.emoji + ' ' + h.name + '!');
    }
  } catch (e) {}
  _cl1RenderPanel();
};

/* ================= (g) gasolinera ================= */
function _cl1BuildGas(parent) {
  const g = new THREE.Group();
  const gx = CL1.gas.x, gz = CL1.gas.z;
  // marquesina
  [[-3, -2], [3, -2], [-3, 2], [3, 2]].forEach(([px, pz]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.5, 8), _cl1Mat(0xd8dce2, false));
    p.position.set(px, 2.25, pz); g.add(p);
  });
  _cl1Mesh(8, 0.5, 6, 0xe0342b, false, 0, 4.7, 0, g);
  _cl1Mesh(8.2, 0.3, 6.2, 0xffffff, false, 0, 4.4, 0, g);
  // surtidores
  [-1.6, 1.6].forEach(px => {
    _cl1Mesh(0.9, 1.5, 0.7, 0xe0342b, false, px, 0.75, 0, g);
    _cl1Mesh(0.5, 0.5, 0.1, 0x2b2f3a, false, px, 1.0, 0.36, g);
  });
  _cl1Sign(g, 0, 5.6, 0, 0, 4.6, 1.3, ['⛽ GAS GEAYI'], '#e0342b', '#ffffff');
  _cl1Sign(g, 0, 5.6, -0.05, Math.PI, 4.6, 1.3, ['⛽ GAS GEAYI'], '#e0342b', '#ffffff');
  g.position.set(gx, 0, gz);
  g.userData.gas = true;
  parent.add(g);
}
CityLife1.refuel = function () {
  _cl1Click();
  try {
    if (typeof Vehicle === 'undefined' || Vehicle.mode !== 'car') { _cl1Toast('🚗 Súbete a un carro primero'); return; }
  } catch (e) { return; }
  if (CityLife1.fuel >= 99.5) { _cl1Toast('⛽ El tanque ya está lleno'); return; }
  if (!_cl1Spend(8)) return;
  CityLife1.fuel = 100;
  _cl1Toast('⛽ ¡Tanque lleno! (8 🪙)');
  _cl1PaintFuel();
};

/* ================= (h) torneos de pesca ================= */
function _cl1TourneySave() {
  try {
    if (typeof SAVE === 'undefined') return null;
    if (!SAVE.cl1) SAVE.cl1 = {};
    if (!SAVE.cl1.tourney) SAVE.cl1.tourney = { best: 0, wins: 0, plays: 0 };
    return SAVE.cl1.tourney;
  } catch (e) { return null; }
}
CityLife1.startTourney = function () {
  _cl1Click();
  if (CL1.tour.active) return;
  if (CityLife1.idx !== 3) { _cl1Toast('🎣 El torneo es en Immokalee (mundo 4)'); return; }
  CL1.tour.active = true; CL1.tour.t = 60;
  try { CL1.tour.start = (typeof SAVE !== 'undefined' && SAVE.fish) || 0; } catch (e) { CL1.tour.start = 0; }
  const tb = _cl1TourneySave();
  _cl1Banner('🏁 ¡TORNEO DE PESCA!', 'Pesca lo más que puedas en 60 segundos 🎣', 2600);
  _cl1Toast('🏁 ¡Torneo iniciado! Récord local: ' + (tb ? tb.best : 0) + ' 🐟');
  _cl1Save();
};
function _cl1TourneyEnd() {
  CL1.tour.active = false;
  let n = 0;
  try { n = ((typeof SAVE !== 'undefined' && SAVE.fish) || 0) - CL1.tour.start; } catch (e) {}
  n = Math.max(0, n);
  const tb = _cl1TourneySave();
  let prize = 10, msg;
  if (tb) {
    tb.plays++;
    if (n > tb.best) { tb.best = n; tb.wins++; prize = 40; msg = '🏆 ¡NUEVO RÉCORD! ' + n + ' 🐟 → +' + prize + ' 🪙'; }
    else msg = '🏁 Torneo: ' + n + ' 🐟 (récord ' + tb.best + ') → +' + prize + ' 🪙';
  } else msg = '🏁 Torneo: ' + n + ' 🐟 → +' + prize + ' 🪙';
  try { if (typeof SAVE !== 'undefined') SAVE.coins = (SAVE.coins || 0) + prize; } catch (e) {}
  _cl1Save();
  _cl1Banner('🏁 ¡TORNEO TERMINADO!', msg, 3000);
  _cl1Toast(msg);
  CL1.tour.autoT = 300; // próximo automático en 5 min
}

/* ================= UI (se crea en init/onLevelStart, nunca al cargar) ================= */
function _cl1EnsureUI() {
  if (CL1.ui) return;
  try {
    const bar = document.createElement('div');
    bar.id = 'cl1-bar';
    bar.style.cssText = 'position:fixed;right:10px;bottom:150px;z-index:25;display:flex;' +
      'flex-direction:column;gap:8px;align-items:flex-end;';
    document.body.appendChild(bar);
    const mk = (id, label, title) => {
      const b = document.createElement('button');
      b.id = id; b.className = 'btn'; b.textContent = label; b.title = title || '';
      b.style.cssText = 'min-width:56px;min-height:56px;font-size:22px;border-radius:16px;display:none;';
      bar.appendChild(b);
      return b;
    };
    CL1.btnRain = mk('cl1-rain', '🌧️', 'Activar/apagar lluvia');
    CL1.btnRain.addEventListener('click', () => {
      _cl1Click();
      CityLife1.rainOn = !CityLife1.rainOn;
      _cl1PaintRain();
      _cl1Toast(CityLife1.rainOn ? '🌧️ Lluvia activada' : '🌤️ Lluvia apagada');
    });
    CL1.btnTour = mk('cl1-tour', '🏁', 'Torneo de pesca (60 s)');
    CL1.btnTour.addEventListener('click', () => CityLife1.startTourney());
    CL1.btnCop = mk('cl1-cop', '👮', 'Trabajo de policía: patrullar');
    CL1.btnCop.addEventListener('click', () => CityLife1.toggleCop());
    CL1.btnArrest = mk('cl1-arrest', '🚔', 'Arrestar / encerrar');
    CL1.btnArrest.style.minWidth = '150px';
    CL1.btnArrest.addEventListener('click', () => CityLife1.copAction());
    CL1.btnAct = mk('cl1-act', '🛒', 'Interactuar');
    CL1.btnAct.style.minWidth = '120px';
    CL1.btnAct.addEventListener('click', () => {
      if (CL1.actFor === 'gas') CityLife1.refuel();
      else if (CL1.actFor === 'food' || CL1.actFor === 'ropa') _cl1OpenPanel(CL1.actFor);
      else if (CL1.actFor === 'rPick') CityLife1.rescuePickup();
      else if (CL1.actFor === 'rDrop') CityLife1.rescueDrop();
    });
    const chip = (id, top) => {
      const c = document.createElement('div');
      c.id = id;
      c.style.cssText = 'position:fixed;right:10px;top:' + top + 'px;z-index:25;display:none;' +
        'font-size:15px;font-weight:800;background:rgba(20,10,40,.6);color:#fff;' +
        'padding:6px 12px;border-radius:999px;border:2px solid rgba(255,255,255,.7);font-family:inherit;';
      document.body.appendChild(c);
      return c;
    };
    CL1.chipFuel = chip('cl1-fuel', 96);
    CL1.chipTour = chip('cl1-tour-chip', 136);
    CL1.chipCop = chip('cl1-cop-chip', 176);
    CL1.ui = true;
    _cl1PaintRain();
  } catch (e) {}
}
function _cl1PaintRain() {
  try { if (CL1.btnRain) CL1.btnRain.textContent = CityLife1.rainOn ? '🌧️' : '🌤️'; } catch (e) {}
}
function _cl1PaintFuel() {
  try {
    if (!CL1.chipFuel) return;
    const inCar = (typeof Vehicle !== 'undefined' && Vehicle.mode === 'car');
    CL1.chipFuel.style.display = (CityLife1.active && inCar) ? '' : 'none';
    if (inCar) {
      const f = Math.round(CityLife1.fuel);
      CL1.chipFuel.textContent = '⛽ ' + f + '%';
      CL1.chipFuel.style.borderColor = f < 25 ? '#ff2d2d' : 'rgba(255,255,255,.7)';
    }
  } catch (e) {}
}
function _cl1SetAct(forWhat, label) {
  CL1.actFor = label ? forWhat : null;
  try {
    if (!CL1.btnAct) return;
    CL1.btnAct.style.display = label ? '' : 'none';
    if (label) CL1.btnAct.textContent = label;
  } catch (e) {}
}
/* panel de tienda (patrón jobs.js: overlay + data-act) */
function _cl1OpenPanel(kind) {
  _cl1Click();
  try {
    if (!CL1.panel) {
      const p = document.createElement('div');
      p.id = 'cl1-panel';
      p.className = 'screen overlay hidden';
      document.body.appendChild(p);
      CL1.panel = p;
    }
    CL1.panel.dataset.kind = kind;
    _cl1RenderPanel();
    CL1.panel.classList.remove('hidden');
  } catch (e) {}
}
function _cl1ClosePanel() {
  try { if (CL1.panel) CL1.panel.classList.add('hidden'); } catch (e) {}
}
function _cl1RenderPanel() {
  try {
    if (!CL1.panel) return;
    const kind = CL1.panel.dataset.kind || 'food';
    let html = '<div class="panel" style="max-width:430px;width:100%">';
    if (kind === 'food') {
      html += '<h2>🍔 COMIDA</h2><div class="job-note">¡Come algo rico y corre más rápido! ⚡</div>';
      CL1_FOOD.forEach((it, i) => {
        html += '<div class="job-card"><div class="job-emoji">' + it.emoji + '</div>' +
          '<div class="job-info"><div class="job-name">' + it.name + '</div>' +
          '<div class="job-desc">Velocidad ×1.45 por ' + it.secs + 's</div></div>' +
          '<button class="btn job-go" data-food="' + i + '">🪙 ' + it.price + '</button></div>';
      });
    } else {
      html += '<h2>👕 ROPA</h2><div class="job-note">Sombreros para tu personaje 🧢</div>';
      const hats = (typeof HATS !== 'undefined' ? HATS : []).filter(h => h.id !== 'none');
      const owned = (typeof SAVE !== 'undefined' && SAVE.ownedHats) || ['none'];
      hats.forEach(h => {
        const has = owned.indexOf(h.id) !== -1;
        const eq = (typeof SAVE !== 'undefined' && SAVE.hat) === h.id;
        html += '<div class="job-card"><div class="job-emoji">' + h.emoji + '</div>' +
          '<div class="job-info"><div class="job-name">' + h.name + '</div></div>' +
          '<button class="btn job-go" data-hat="' + h.id + '">' +
          (has ? (eq ? '✅ Puesto' : 'Poner') : '🪙 ' + h.price) + '</button></div>';
      });
    }
    html += '<div class="menu-buttons"><button class="btn" data-act="close">✕ Cerrar</button></div></div>';
    CL1.panel.innerHTML = html;
    Array.prototype.forEach.call(CL1.panel.querySelectorAll('[data-food]'), b => {
      b.addEventListener('click', () => CityLife1.buyFood(+b.getAttribute('data-food')));
    });
    Array.prototype.forEach.call(CL1.panel.querySelectorAll('[data-hat]'), b => {
      b.addEventListener('click', () => CityLife1.buyHat(b.getAttribute('data-hat')));
    });
    Array.prototype.forEach.call(CL1.panel.querySelectorAll('[data-act]'), b => {
      b.addEventListener('click', () => { _cl1Click(); _cl1ClosePanel(); });
    });
  } catch (e) {}
}

/* ================= construcción del nivel ================= */
function _cl1Clear() {
  try {
    if (CL1.group && CL1.group.parent) CL1.group.parent.remove(CL1.group);
  } catch (e) {}
  try { CityLife1.cancelRescue(); } catch (e) {}
  try { // retirar la ambulancia abordable de LEVEL.cars
    if (CL1.ambDef) {
      const lvl = (typeof LEVEL !== 'undefined') ? LEVEL : null;
      if (lvl && lvl.cars) {
        const i = lvl.cars.indexOf(CL1.ambDef);
        if (i >= 0) lvl.cars.splice(i, 1);
      }
      try { if (typeof Vehicle !== 'undefined' && Vehicle.def === CL1.ambDef) { Vehicle.def = null; Vehicle.mode = 'none'; } } catch (e2) {}
    }
  } catch (e) {}
  try { // retirar la patrulla de la comisaría de LEVEL.cars
    if (CL1.station && CL1.station.patrolDef) {
      const lvl = (typeof LEVEL !== 'undefined') ? LEVEL : null;
      if (lvl && lvl.cars) {
        const i = lvl.cars.indexOf(CL1.station.patrolDef);
        if (i >= 0) lvl.cars.splice(i, 1);
      }
      try { if (typeof Vehicle !== 'undefined' && Vehicle.def === CL1.station.patrolDef) { Vehicle.def = null; Vehicle.mode = 'none'; } } catch (e2) {}
    }
  } catch (e) {}
  CL1.group = null; CL1.lamps = []; CL1.police = null; CL1.amb = null;
  CL1.ambDef = null; CL1.rescue = null; CL1._ambWasBoarded = false;
  CL1.station = null; CL1.crims = [];
  CL1.cop = { on: false, spawnT: 12 };
  CL1.npcs = []; CL1.tlHeads = []; CL1.bus = null; CL1.stops = [];
  CL1.shops = []; CL1.actFor = null;
  CL1.tl = { state: 'green', t: 8 };
  CL1.tour = { active: false, t: 0, start: 0, autoT: 300 };
}
function _cl1Build(idx) {
  _cl1Clear();
  const g = new THREE.Group();
  CL1.group = g;

  // (a) farolas propias a lo largo de la avenida
  [-7, 7].forEach(x => [-6, 34, 68, 102].forEach((z, i) =>
    g.add(_cl1BuildLamp(x, z, [0xffe95e, 0x9fd8ff, 0xffffff][i % 3]))));
  _cl1ScanLamps(); // escanea LEVEL.group (marca las de otros constructores si las hubiera)

  // (c) policía + ambulancia en circuito (carriles ±2.6)
  const pol = _cl1BuildPolice(); pol.s = 0; pol.speed = 9.5; pol.lane = 2.6;
  _cl1LoopPos(0, 2.6, _cl1P); pol.g.position.set(_cl1P.x, 0, _cl1P.z);
  g.add(pol.g); CL1.police = pol;
  const amb = _cl1BuildAmbulance(); amb.s = 60; amb.speed = 11; amb.lane = 2.6;
  _cl1LoopPos(60, 2.6, _cl1P); amb.g.position.set(_cl1P.x, 0, _cl1P.z);
  g.add(amb.g); CL1.amb = amb;
  _cl1RegisterAmbulanceType();
  // cabezal del paciente rescatado (oculto hasta subirlo a la ambulancia)
  try {
    amb.riderHead = _cl1Mesh(0.5, 0.5, 0.5, 0xf2c89b, false, 0, 1.62, -1.5, amb.g);
    amb.riderHead.visible = false;
  } catch (e) {}
  // la ambulancia decorativa también es abordable con el botón SUBIR (como los carros)
  try {
    const spec = (typeof VEHICLE_TYPES !== 'undefined' && VEHICLE_TYPES['geayi-ambulance']) || {};
    CL1.ambDef = {
      kind: 'car', vtype: 'geayi-ambulance',
      x: amb.g.position.x, y: 0, z: amb.g.position.z,
      mesh: amb.g, taken: false, heading: 0,
      maxSpeed: spec.maxSpeed || 14, accel: spec.accel || 12, seatY: spec.seatY || 0.8,
      cl1amb: true,
    };
    if (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.cars) LEVEL.cars.push(CL1.ambDef);
  } catch (e) { CL1.ambDef = null; }

  // (d) semáforos en los cruces z=20 y z=70 (doble cara)
  g.add(_cl1BuildTrafficLight(-4.4, 20.6, Math.PI)); // mira a -z (los que van a +z)
  g.add(_cl1BuildTrafficLight(4.4, 19.4, 0));        // mira a +z
  g.add(_cl1BuildTrafficLight(-4.4, 70.6, Math.PI));
  g.add(_cl1BuildTrafficLight(4.4, 69.4, 0));

  // (d) 4 carros NPC (reutiliza buildCarMesh de vehicles.js)
  if (typeof buildCarMesh === 'function') {
    const cols = [0xff5e3a, 0x2fa9ff, 0xffe95e, 0x9d6bff];
    for (let i = 0; i < 4; i++) {
      const mesh = buildCarMesh(cols[i]);
      const s = i * 55;
      _cl1LoopPos(s, CL1_NPC_LANE, _cl1P);
      mesh.position.set(_cl1P.x, 0, _cl1P.z); mesh.rotation.y = _cl1P.ry;
      g.add(mesh);
      CL1.npcs.push({ g: mesh, s, speed: 0, lane: CL1_NPC_LANE });
    }
  }

  // (f) autobús escolar (reutiliza buildBusMesh)
  if (typeof buildBusMesh === 'function') {
    const bm = buildBusMesh(0xffc400);
    _cl1LoopPos(10, 2.2, _cl1P);
    bm.position.set(_cl1P.x, 0, _cl1P.z); bm.rotation.y = _cl1P.ry;
    _cl1Sign(bm, 0, 3.2, 0, 0, 3.4, 0.9, ['🚌 ESCOLAR'], '#ffb300', '#3a2a00');
    g.add(bm);
    CL1.bus = { g: bm, s: 10, speed: 7, lane: 2.2, stopT: 0, cool: [0, 0, 0] };
    _cl1BuildBusStops(g);
  }

  // (e) tiendas: comida al oeste, ropa al este
  g.add(_cl1BuildKiosk('food', -8.5, 26));
  g.add(_cl1BuildKiosk('ropa', 8.5, 26));
  CL1.shops = [
    { kind: 'food', x: -8.5, z: 26, r: 4.5 },
    { kind: 'ropa', x: 8.5, z: 26, r: 4.5 },
  ];

  // (g) gasolinera
  _cl1BuildGas(g);

  // (i) comisaría + trabajo de policía (solo Immokalee / idx 3)
  if (idx === 3) _cl1BuildStation(g);

  try { if (LEVEL && LEVEL.group) LEVEL.group.add(g); } catch (e) {}
}

/* ================= API pública ================= */
CityLife1.init = function () {
  if (CityLife1.ready) return;
  CityLife1.ready = true;
  _cl1TourneySave(); // crea SAVE.cl1.tourney si no existe
};
CityLife1.onLevelStart = function (idx) {
  CityLife1.idx = idx;
  _cl1EnsureUI();
  if (CL1_WORLDS.indexOf(idx) === -1) { CityLife1.active = false; _cl1Clear(); _cl1HideUI(); return; }
  CityLife1.active = true;
  _cl1Build(idx);
  _cl1ShowUI();
  _cl1PaintRain();
};
CityLife1.onLevelEnd = function () {
  CityLife1.active = false;
  _cl1ClosePanel();
  _cl1Clear();
  _cl1HideUI();
};
function _cl1ShowUI() {
  try {
    if (CL1.btnRain) CL1.btnRain.style.display = '';
    if (CL1.btnTour) CL1.btnTour.style.display = CityLife1.idx === 3 ? '' : 'none';
    if (CL1.btnCop) CL1.btnCop.style.display = CityLife1.idx === 3 ? '' : 'none';
  } catch (e) {}
}
function _cl1HideUI() {
  try {
    [CL1.btnRain, CL1.btnTour, CL1.btnAct, CL1.btnCop, CL1.btnArrest].forEach(b => { if (b) b.style.display = 'none'; });
    if (CL1.chipFuel) CL1.chipFuel.style.display = 'none';
    if (CL1.chipTour) CL1.chipTour.style.display = 'none';
    if (CL1.chipCop) CL1.chipCop.style.display = 'none';
  } catch (e) {}
}
/* instantánea para pruebas */
CityLife1.state = function () {
  return {
    active: CityLife1.active, idx: CityLife1.idx, rainOn: CityLife1.rainOn, fuel: CityLife1.fuel,
    lamps: CL1.lamps.length, npcs: CL1.npcs.length, tl: CL1.tl.state,
    actFor: CL1.actFor, tour: { active: CL1.tour.active, t: Math.round(CL1.tour.t) },
    bus: !!CL1.bus, police: !!CL1.police, amb: !!CL1.amb, shops: CL1.shops.length,
    ambBoardable: !!CL1.ambDef, rescue: CityLife1.rescueInfo(),
    station: !!(CL1.station && CL1.station.cells),
    cells: CL1.station ? CL1.station.cells.map(c => c.occupied ? '1' : '0').join('') : null,
    cop: !!(CL1.cop && CL1.cop.on), crims: CL1.crims.length,
    rank: _cl1Rank(), patrol: !!(CL1.station && CL1.station.patrolDef),
  };
};

/* ================= update(dt) — llamar cada frame desde el loop ================= */
CityLife1.update = function (dt) {
  if (!CityLife1.active || typeof MODE === 'undefined' || MODE !== 'play') return;
  if (typeof THREE === 'undefined') return;
  CL1._t += dt;
  const t = CL1._t;

  // (b) la lluvia la dibuja weather.js; aquí solo aplicamos el interruptor
  //     (este update debe correr DESPUÉS de updateWeather en el loop)
  try {
    if (typeof Weather !== 'undefined' && Weather._rain && Weather._rain.pts)
      Weather._rain.pts.visible = Weather._rain.pts.visible && CityLife1.rainOn;
  } catch (e) {}

  // (a) farolas: se encienden de noche según el ciclo de weather.js
  const nf = _cl1NightFactor();
  for (const L of CL1.lamps) {
    try {
      if (L.halo) L.halo.material.opacity = 0.06 + nf * 0.55;
    } catch (e) {}
  }

  // (d) semáforos
  _cl1TlTick(dt);

  // (c) emergencia: circuito + balizas parpadeantes (alternadas, 4 Hz;
  //     8 Hz cuando la ambulancia está en rescate con el jugador al volante)
  const ambBoarded = !!(CL1.ambDef && CL1.ambDef.taken &&
    typeof Vehicle !== 'undefined' && Vehicle.def === CL1.ambDef);
  if (ambBoarded) CL1._ambWasBoarded = true;
  else if (CL1._ambWasBoarded) {
    // el jugador se bajó: el circuito continúa desde donde quedó (sin teletransporte)
    CL1._ambWasBoarded = false;
    _cl1AmbResync();
  }
  for (const em of [CL1.police, CL1.amb]) {
    if (!em) continue;
    if (!(em === CL1.amb && ambBoarded)) { // la ambulancia abordada la maneja el jugador
      em.s += em.speed * dt;
      _cl1LoopPos(em.s, em.lane, _cl1P);
      em.g.position.set(_cl1P.x, 0, _cl1P.z);
      em.g.rotation.y = _cl1P.ry;
    }
    const fast = (em === CL1.amb && CL1.rescue && ambBoarded);
    const ph = Math.floor(t * (fast ? 8 : 4)) % 2;
    try {
      em.bulbs[0].visible = ph === 0;
      em.bulbs[1].visible = ph === 1;
    } catch (e) {}
  }

  // (d) NPC: avanzan, frenan en rojo y siguen al de adelante
  for (const car of CL1.npcs) {
    const tv = _cl1NpcTarget(car);
    car.speed += Math.sign(tv - car.speed) * Math.min(Math.abs(tv - car.speed), 7 * dt);
    car.s += car.speed * dt;
    _cl1LoopPos(car.s, car.lane, _cl1P);
    car.g.position.set(_cl1P.x, 0, _cl1P.z);
    car.g.rotation.y = _cl1P.ry;
  }

  // (f) bus escolar con paradas de 5 s
  if (CL1.bus) {
    const b = CL1.bus, total = _cl1LoopLen(b.lane);
    if (b.stopT > 0) {
      b.stopT -= dt;
    } else {
      for (let i = 0; i < CL1.stops.length; i++) {
        if (b.cool[i] > 0) continue;
        let d = CL1.stops[i] - b.s;
        d = ((d % total) + total) % total;
        if (d < 0.7) {
          b.stopT = 5; b.cool[i] = 90;
          try { // 🔇 no avisar la parada si estás adentro de una casa/tienda o la parada queda lejos
            const P = (typeof Player !== 'undefined') ? Player : null;
            const bp = b.g && b.g.position;
            const indoors = !!(P && P.indoors);
            const far = !!(P && P.pos && bp && Math.hypot(P.pos.x - bp.x, P.pos.z - bp.z) > 30);
            if (!indoors && !far) _cl1Toast('🚌 Parada: suben y bajan niños…');
          } catch (e) { _cl1Toast('🚌 Parada: suben y bajan niños…'); }
          break;
        }
      }
      for (let i = 0; i < b.cool.length; i++) b.cool[i] = Math.max(0, b.cool[i] - dt);
      b.s += (b.stopT > 0 ? 0 : b.speed) * dt;
    }
    _cl1LoopPos(b.s, b.lane, _cl1P);
    b.g.position.set(_cl1P.x, 0, _cl1P.z);
    b.g.rotation.y = _cl1P.ry;
  }

  // (g) combustible: se gasta al manejar; sin gasolina el carro se detiene
  try {
    if (typeof Vehicle !== 'undefined' && Vehicle.mode === 'car') {
      const sp = Math.abs(Vehicle.speed || 0);
      if (sp > 1) CityLife1.fuel = Math.max(0, CityLife1.fuel - dt * 0.8);
      if (CityLife1.fuel <= 0) {
        Vehicle.speed *= Math.max(0, 1 - dt * 3);
        CL1._fuelToastT -= dt;
        if (CL1._fuelToastT <= 0) {
          CL1._fuelToastT = 4;
          _cl1Toast('⛽ ¡Sin gasolina! Ve a la gasolinera (-15, -2)');
        }
      }
    }
  } catch (e) {}
  _cl1PaintFuel();

  // (e)(g) prompts por proximidad
  let px = 0, pz = 0;
  try {
    if (typeof Player !== 'undefined' && Player.pos) { px = Player.pos.x; pz = Player.pos.z; }
  } catch (e) {}
  // 🚑 rescate: recoger al paciente / entregarlo en el hospital (prioridad sobre tiendas)
  let rescueAct = null;
  try {
    const r = CL1.rescue;
    if (r && CityLife1.active) {
      let ax = px, az = pz, driving = false;
      try {
        driving = (typeof Vehicle !== 'undefined' && Vehicle.def === CL1.ambDef && Vehicle.mode === 'car');
        if (driving && CL1.amb && CL1.amb.g) { ax = CL1.amb.g.position.x; az = CL1.amb.g.position.z; }
      } catch (e2) {}
      if (r.stage === 'go' && Math.hypot(ax - r.px, az - r.pz) < (driving ? 10 : 6))
        rescueAct = ['rPick', '🚑 RECOGER'];
      else if (r.stage === 'back' && driving && Math.hypot(ax - r.hx, az - r.hz) < 14)
        rescueAct = ['rDrop', '🏥 ENTREGAR'];
    }
  } catch (e) {}
  let best = null, bestD = 1e9;
  for (const s of CL1.shops) {
    const d = Math.hypot(px - s.x, pz - s.z);
    if (d < s.r && d < bestD) { bestD = d; best = s.kind; }
  }
  let inCar = false;
  try { inCar = typeof Vehicle !== 'undefined' && Vehicle.mode === 'car'; } catch (e) {}
  const gd = Math.hypot(px - CL1.gas.x, pz - CL1.gas.z);
  if (inCar && gd < CL1.gas.r) {
    let sp0 = 0;
    try { sp0 = Math.abs(Vehicle.speed || 0); } catch (e) {}
    if (sp0 < 1.5 && CityLife1.fuel < 99.5) best = 'gas';
  }
  if (rescueAct) _cl1SetAct(rescueAct[0], rescueAct[1]);
  else if (best === 'gas') _cl1SetAct('gas', '⛽ Cargar (8 🪙)');
  else if (best === 'food') _cl1SetAct('food', '🛒 Tienda 🍔');
  else if (best === 'ropa') _cl1SetAct('ropa', '🛒 Tienda 👕');
  else _cl1SetAct(null, null);

  // (h) torneo: cuenta regresiva + auto cada 5 min (solo idx 3)
  if (CL1.tour.active) {
    CL1.tour.t -= dt;
    try {
      if (CL1.chipTour) {
        CL1.chipTour.style.display = '';
        CL1.chipTour.textContent = '🏁 ' + Math.ceil(CL1.tour.t) + 's';
      }
    } catch (e) {}
    if (CL1.tour.t <= 0) {
      try { if (CL1.chipTour) CL1.chipTour.style.display = 'none'; } catch (e) {}
      _cl1TourneyEnd();
    }
  } else {
    try { if (CL1.chipTour) CL1.chipTour.style.display = 'none'; } catch (e) {}
    if (CityLife1.idx === 3) {
      CL1.tour.autoT -= dt;
      if (CL1.tour.autoT <= 0) CityLife1.startTourney();
    }
  }

  // 🚑 rescate: animación del marcador 📍
  _cl1UpdateRescueFx(dt);

  // (i) comisaría + trabajo de policía (solo idx 3; sin estación no hace nada)
  _cl1CopTick(dt);
  _cl1CopUI();
};

/* ================= 🚑 ambulancia abordable + rescates (extensión) =================
   La ambulancia decorativa del circuito se registra en LEVEL.cars como
   'geayi-ambulance' para abordarla con el botón SUBIR estándar. Al bajarse,
   el circuito continúa desde donde quedó (sin teletransporte).
   Rescate: CityLife1.startRescue(hx,hz) crea un paciente ≤60 m del hospital;
   "🚑 RECOGER" lo sube y "🏥 ENTREGAR" lo deja en el hospital (+25 🪙). */
function _cl1RegisterAmbulanceType() {
  try {
    if (typeof VEHICLE_TYPES !== 'undefined' && !VEHICLE_TYPES['geayi-ambulance']) {
      VEHICLE_TYPES['geayi-ambulance'] = {
        name: 'Ambulancia GEAYI', emoji: '🚑', maxSpeed: 14, accel: 12, seatY: 0.8,
      };
    }
  } catch (e) {}
}
/* reancla el circuito a la posición actual de la malla (muestreo del loop) */
function _cl1AmbResync() {
  try {
    const em = CL1.amb;
    if (!em || !em.g) return;
    const total = _cl1LoopLen(em.lane), out = { x: 0, z: 0, ry: 0 };
    let best = 0, bd = 1e12;
    for (let i = 0; i < 120; i++) {
      const s = (total * i) / 120;
      _cl1LoopPos(s, em.lane, out);
      const d = (out.x - em.g.position.x) * (out.x - em.g.position.x) +
                (out.z - em.g.position.z) * (out.z - em.g.position.z);
      if (d < bd) { bd = d; best = s; }
    }
    em.s = best;
  } catch (e) {}
}
function _cl1Earn(n) {
  try {
    SAVE.coins = Math.max(0, (SAVE.coins || 0) + n);
    _cl1Save();
    try { const h = document.getElementById('hud-coins'); if (h) h.textContent = SAVE.coins; } catch (e2) {}
    try { if (typeof Audio2 !== 'undefined' && Audio2.coin) Audio2.coin(); } catch (e3) {}
  } catch (e) {}
}
/* sprite flotante con emoji (caché por emoji; diseño propio) */
const _cl1EmojiCache = {};
function _cl1EmojiSprite(emoji, scale) {
  const key = emoji + '|' + (scale || 1);
  if (_cl1EmojiCache[key]) return _cl1EmojiCache[key].clone();
  try {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g2 = c.getContext('2d');
    g2.font = '96px serif'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
    g2.fillText(emoji, 64, 70);
    const tex = new THREE.CanvasTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const s = 2.2 * (scale || 1);
    spr.scale.set(s, s, 1);
    _cl1EmojiCache[key] = spr;
    return spr.clone();
  } catch (e) { return null; }
}
/* paciente en camilla (muñeco de bloques original) */
function _cl1BuildRescuePatient() {
  const g = new THREE.Group();
  _cl1Mesh(0.9, 0.14, 2.1, 0x8a94a6, false, 0, 0.55, 0, g);          // camilla
  [[-0.35, -0.85], [0.35, -0.85], [-0.35, 0.85], [0.35, 0.85]].forEach(([lx, lz]) =>
    _cl1Mesh(0.09, 0.55, 0.09, 0x5a6270, false, lx, 0.27, lz, g));    // patas
  const shirt = [0x2fa9ff, 0xff9f2f, 0x59d668][(Math.random() * 3) | 0];
  _cl1Mesh(0.62, 0.34, 1.35, shirt, false, 0, 0.79, 0.18, g);         // cuerpo acostado
  _cl1Mesh(0.44, 0.4, 0.44, 0xf2c89b, false, 0, 0.86, -0.78, g);      // cabeza
  _cl1Mesh(0.48, 0.12, 0.48, 0xffffff, true, 0, 1.02, -0.78, g);      // venda 🤕
  return g;
}
/* inicia un rescate: paciente a ≤60 m de la puerta del hospital (hx,hz) */
CityLife1.startRescue = function (hx, hz) {
  try {
    if (!CityLife1.active || CL1.rescue || !CL1.group) return false;
    if (typeof hx !== 'number' || typeof hz !== 'number') return false;
    const a = Math.random() * Math.PI * 2, r = 25 + Math.random() * 30; // 25..55 m
    const px = hx + Math.cos(a) * r, pz = hz + Math.sin(a) * r;
    const npc = _cl1BuildRescuePatient();
    npc.position.set(px, 0, pz);
    CL1.group.add(npc);
    const marker = _cl1EmojiSprite('📍', 1.2);
    let ring = null;
    if (marker) { marker.position.set(px, 4.2, pz); CL1.group.add(marker); }
    try {
      ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.22, 8, 24), _cl1Mat(0xff2d2d, true));
      ring.rotation.x = Math.PI / 2; ring.position.set(px, 0.25, pz);
      CL1.group.add(ring);
    } catch (e) {}
    CL1.rescue = { stage: 'go', px: px, pz: pz, hx: hx, hz: hz, npc: npc, marker: marker, ring: ring, t: 0 };
    _cl1Banner('🚑 ¡LLAMADA DE EMERGENCIA!', 'Un paciente te espera en el 📍 ¡Ve en la ambulancia!', 4200);
    _cl1Toast('🚑 ¡Emergencia! Recoge al paciente del 📍');
    return true;
  } catch (e) { return false; }
};
/* cancela el rescate actual (sin pago) */
CityLife1.cancelRescue = function () {
  try {
    const r = CL1.rescue;
    if (!r) return;
    [r.npc, r.marker, r.ring].forEach(o => { try { if (o && o.parent) o.parent.remove(o); } catch (e) {} });
    try { if (CL1.amb && CL1.amb.riderHead) CL1.amb.riderHead.visible = false; } catch (e) {}
    CL1.rescue = null;
    if (CL1.actFor === 'rPick' || CL1.actFor === 'rDrop') _cl1SetAct(null, null);
  } catch (e) {}
};
/* estado del rescate para otros módulos / pruebas */
CityLife1.rescueInfo = function () {
  const r = CL1.rescue;
  return r ? { stage: r.stage, px: r.px, pz: r.pz, hx: r.hx, hz: r.hz } : null;
};
/* "🚑 RECOGER": el paciente sube a la ambulancia */
CityLife1.rescuePickup = function () {
  try {
    const r = CL1.rescue;
    if (!r || r.stage !== 'go') return false;
    r.stage = 'back';
    [r.npc, r.marker].forEach(o => { try { if (o) o.visible = false; } catch (e) {} });
    try { if (r.ring) r.ring.visible = false; } catch (e) {}
    try { if (CL1.amb && CL1.amb.riderHead) CL1.amb.riderHead.visible = true; } catch (e) {}
    // el marcador 📍 ahora señala el hospital
    try {
      const m2 = _cl1EmojiSprite('🏥', 1.2);
      if (m2 && CL1.group) { m2.position.set(r.hx, 4.2, r.hz); CL1.group.add(m2); r.marker = m2; }
    } catch (e) {}
    _cl1Toast('🚑 ¡Paciente a bordo! Llévalo al hospital 🏥');
    _cl1Click();
    return true;
  } catch (e) { return false; }
};
/* "🏥 ENTREGAR": fin del rescate, +25 🪙 */
CityLife1.rescueDrop = function () {
  try {
    const r = CL1.rescue;
    if (!r || r.stage !== 'back') return false;
    const driving = (typeof Vehicle !== 'undefined' && Vehicle.def === CL1.ambDef && Vehicle.mode === 'car');
    if (!driving) { _cl1Toast('🚑 Llega manejando la ambulancia'); return false; }
    _cl1Earn(25);
    try {
      if (CL1.amb && CL1.amb.g) {
        const p = CL1.amb.g.position;
        if (typeof Particles !== 'undefined' && Particles.burst)
          Particles.burst(p.x, 2, p.z, [0xff5a5a, 0xffffff, 0x59ff7a], 30, 6);
      }
    } catch (e) {}
    try { if (typeof Audio2 !== 'undefined' && Audio2.good) Audio2.good(); } catch (e) {}
    _cl1Banner('🚑 ¡RESCATE COMPLETO!', 'Paciente entregado en el hospital · +25 🪙', 3500);
    CityLife1.cancelRescue();
    return true;
  } catch (e) { return false; }
};
/* animación del marcador 📍 (flota y pulsa) */
function _cl1UpdateRescueFx(dt) {
  try {
    const r = CL1.rescue;
    if (!r) return;
    r.t += dt;
    if (r.marker && r.marker.visible !== false) {
      const base = r.stage === 'go' ? 4.2 : 4.2;
      r.marker.position.y = base + Math.sin(r.t * 3) * 0.5;
    }
    if (r.ring && r.ring.visible !== false) {
      const s = 1 + Math.sin(r.t * 5) * 0.12;
      r.ring.scale.set(s, s, 1);
    }
  } catch (e) {}
}

/* ================= (i) 🚔 COMISARÍA GEAYI + trabajo de policía (solo idx 3) =================
   - Estación a nivel del suelo en (-8,152) — rectángulo 24×18 verificado libre
     (evita traila Tamps, puentes, lote de carros, hospital, tiendas y la avenida).
   - Patrulla estacionada abordable con el botón SUBIR (como los carros).
   - Delincuentes NPC con antifaz 🥷 que roban tiendas (icono 💰). Si te ven
     venir de frente a >10 m huyen (persecución a pie o en patrulla); a ≤4 m
     los arrestos con "🚔 ARRESTAR": manos arriba 🙌 y te sigue (o va en tu
     carro). Al encerrarlo en una celda libre: +20 🪙 (+25 con rango 50+),
     rango +5, y la puerta se cierra con rejas.
   - Fianza: cada celda muestra su precio (20 + rango/2). A los 60-90 s un NPC
     la paga: el delincuente sale libre (la celda queda libre) y tú recibes
     el 50% de la fianza.
   - Rango SAVE.policeRank 0..100: a 50+ los delincuentes huyen más lento.
   Diseño 100% original ("GEAYI", sin marcas reales). Arresto amistoso, sin
   violencia gráfica. Todo a nivel del suelo. Geometrías/materiales cacheados. */
try {
  if (typeof addStrings === 'function') {
    addStrings('es', {
      'cp.station': '🚔 COMISARÍA GEAYI',
      'cp.patrolTip': 'Trabajo de policía: patrulla la ciudad',
      'cp.onDuty': '👮 ¡A patrullar! Camina o maneja la patrulla 🚔',
      'cp.offDuty': '👮 Fin del patrullaje',
      'cp.arrest': '🚔 ARRESTAR', 'cp.jail': '🔒 ENCERRAR',
      'cp.arrested': '🚔 ¡Arrestado! 🙌 Llévalo a una celda libre',
      'cp.tooFar': '🚔 Acércate más (≤4 m)',
      'cp.jailed': '🔒 ¡Encarcelado!',
      'cp.noCell': '🔒 Acércalo a una celda libre',
      'cp.flee': '🥷 ¡El delincuente huye! ¡Persíguelo!',
      'cp.escaped': '🥷 El delincuente escapó…',
      'cp.stealing': '🥷 ¡Un delincuente roba una tienda! 💰',
      'cp.bail': '💰 Fianza', 'cp.bailFree': '🟢 LIBRE',
      'cp.bailPaid': '💰 ¡Fianza pagada!',
      'cp.freed': '🥷 ¡Quedó libre bajo fianza!',
      'cp.rank': '👮 Rango',
    });
    addStrings('en', {
      'cp.station': '🚔 GEAYI POLICE STATION',
      'cp.patrolTip': 'Police job: patrol the city',
      'cp.onDuty': '👮 On patrol! Walk or drive the patrol car 🚔',
      'cp.offDuty': '👮 Patrol over',
      'cp.arrest': '🚔 ARREST', 'cp.jail': '🔒 JAIL',
      'cp.arrested': '🚔 Arrested! 🙌 Take them to a free cell',
      'cp.tooFar': '🚔 Get closer (≤4 m)',
      'cp.jailed': '🔒 Jailed!',
      'cp.noCell': '🔒 Bring them to a free cell',
      'cp.flee': '🥷 The crook is fleeing! Chase them!',
      'cp.escaped': '🥷 The crook got away…',
      'cp.stealing': '🥷 A crook is robbing a shop! 💰',
      'cp.bail': '💰 Bail', 'cp.bailFree': '🟢 FREE',
      'cp.bailPaid': '💰 Bail paid!',
      'cp.freed': '🥷 Freed on bail!',
      'cp.rank': '👮 Rank',
    });
  }
} catch (e) {}
function _cpT(k) { try { return T(k); } catch (e) { return k; } }
/* rango persistente 0..100 */
function _cl1Rank() {
  try { return Math.max(0, Math.min(100, (typeof SAVE !== 'undefined' && SAVE.policeRank) || 0)); }
  catch (e) { return 0; }
}
function _cl1AddRank(n) {
  try {
    if (typeof SAVE === 'undefined') return;
    SAVE.policeRank = Math.max(0, Math.min(100, _cl1Rank() + n));
    _cl1Save();
  } catch (e) {}
}
/* ubicación verificada libre con scan temporal (24×18): x∈[-20,4], z∈[143,161] */
const CL1_STATION = { x: -8, z: 152 };
/* letrero con texto dinámico (canvas; en tests se degrada sin romper) */
function _cl1DynSign(parent, x, y, z, w, h) {
  const s = { mesh: null, tex: null, ctx: null };
  try {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 96;
    s.ctx = c.getContext('2d');
    s.tex = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: s.tex, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    parent.add(m);
    s.mesh = m;
  } catch (e) {}
  s.draw = function (lines, bg, fg) {
    if (!s.ctx) return;
    try {
      const x2 = s.ctx;
      x2.fillStyle = bg || '#14213d'; x2.fillRect(0, 0, 256, 96);
      x2.strokeStyle = fg || '#ffffff'; x2.lineWidth = 6; x2.strokeRect(4, 4, 248, 88);
      x2.fillStyle = fg || '#ffffff'; x2.textAlign = 'center'; x2.textBaseline = 'middle';
      x2.font = 'bold 38px sans-serif';
      lines.forEach((ln, i) => x2.fillText(ln, 128, 50 + (i - (lines.length - 1) / 2) * 42));
      if (s.tex) s.tex.needsUpdate = true;
    } catch (e) {}
  };
  return s;
}
/* celda con barrotes y puerta que se abre/cierra */
function _cl1BuildCell(g, cx, cz) {
  const cell = { cx, cz, occupied: false, crim: null, bail: 0, bailT: 0, byPlayer: false, door: null, doorT: 0, sign: null };
  const wallC = 0x3d4a63, barC = 0x9aa5b1;
  _cl1Mesh(5.5, 2.8, 0.3, wallC, false, cx, 1.4, cz - 3, g);       // fondo
  _cl1Mesh(0.3, 2.8, 6, wallC, false, cx - 2.75, 1.4, cz, g);     // laterales
  _cl1Mesh(0.3, 2.8, 6, wallC, false, cx + 2.75, 1.4, cz, g);
  _cl1Mesh(5.9, 0.25, 6.4, 0x2b3550, false, cx, 2.95, cz, g);      // techo
  // frente de barrotes (z = cz+3), con hueco de puerta de 1.7 m
  for (let bx = cx - 2.5; bx <= cx + 2.51; bx += 0.55) {
    if (Math.abs(bx - (cx - 0.8)) < 0.95) continue;
    _cl1Mesh(0.14, 2.6, 0.14, barC, false, bx, 1.3, cz + 3, g);
  }
  _cl1Mesh(5.5, 0.22, 0.22, barC, false, cx, 2.72, cz + 3, g);    // riel superior
  // puerta de rejas (pivote a la izquierda)
  const dg = new THREE.Group();
  dg.position.set(cx - 1.65, 0, cz + 3);
  g.add(dg);
  for (let bx = 0.15; bx <= 1.6; bx += 0.36) _cl1Mesh(0.13, 2.6, 0.13, 0x6b7688, false, bx, 1.3, 0, dg);
  _cl1Mesh(1.75, 0.18, 0.18, 0x6b7688, false, 0.87, 2.62, 0, dg);
  _cl1Mesh(1.75, 0.18, 0.18, 0x6b7688, false, 0.87, 0.12, 0, dg);
  cell.door = dg;
  cell.doorT = 0; // 0 = cerrada, -1.9 = abierta
  // letrero de fianza
  cell.sign = _cl1DynSign(g, cx, 3.45, cz + 3.15, 3.6, 1.1);
  cell.sign.draw([_cpT('cp.bailFree')], '#0d4d1f', '#7dff9e');
  return cell;
}
/* registra el tipo de vehículo de la patrulla (patrón ambulancia) */
function _cl1RegisterPoliceType() {
  try {
    if (typeof VEHICLE_TYPES !== 'undefined' && !VEHICLE_TYPES['geayi-police']) {
      VEHICLE_TYPES['geayi-police'] = {
        name: 'Patrulla GEAYI', emoji: '🚔', maxSpeed: 15, accel: 13, seatY: 0.8,
      };
    }
  } catch (e) {}
}
/* construye la comisaría (solo idx 3) */
function _cl1BuildStation(g) {
  const SX = CL1_STATION.x, SZ = CL1_STATION.z;
  try { if (typeof SAVE !== 'undefined' && SAVE.policeRank == null) { SAVE.policeRank = 0; _cl1Save(); } } catch (e) {}
  _cl1RegisterPoliceType();
  _cl1Mesh(24, 0.12, 18, 0x8b95a5, false, SX, 0.06, SZ, g);        // losa
  const WC = 0xe8ecf3, RC = 0x1a56db;
  // vestíbulo x∈[-18,2] z∈[151,159], entrada abierta al sur (hacia el pueblo)
  _cl1Mesh(20, 3, 0.4, WC, false, SX, 1.5, SZ - 1, g);            // fondo norte
  _cl1Mesh(0.4, 3, 8, WC, false, SX - 10, 1.5, SZ + 3, g);        // oeste
  _cl1Mesh(0.4, 3, 8, WC, false, SX + 10, 1.5, SZ + 3, g);        // este
  _cl1Mesh(8, 3, 0.4, WC, false, SX - 6, 1.5, SZ + 7, g);         // frente sur izq
  _cl1Mesh(8, 3, 0.4, WC, false, SX + 6, 1.5, SZ + 7, g);         // frente sur der
  _cl1Mesh(20.6, 0.35, 8.6, RC, false, SX, 3.2, SZ + 3, g);       // techo azul
  _cl1Mesh(2.6, 1.0, 1.2, 0x6b4f2e, false, SX, 0.5, SZ + 2.5, g);  // escritorio
  _cl1Mesh(0.9, 0.5, 0.9, 0x2b2f3a, false, SX, 0.25, SZ + 4.4, g); // banco
  _cl1Sign(g, SX, 4.15, SZ + 7.35, Math.PI, 7.5, 1.5,
    ['🚔', _cpT('cp.station')], '#1a56db', '#ffffff');
  // 3 celdas al norte
  const cells = [-6, 0, 6].map(dx => _cl1BuildCell(g, SX + dx, SZ - 6));
  CL1.station = { x: SX, z: SZ, cells, patrolDef: null };
  // patrulla estacionada abordable con el botón SUBIR (como los carros)
  try {
    _cl1RegisterPoliceType();
    const spec = (typeof VEHICLE_TYPES !== 'undefined' && VEHICLE_TYPES['geayi-police']) || {};
    const pc = _cl1BuildPolice();
    pc.g.position.set(SX, 0, SZ + 12);
    pc.g.rotation.y = Math.PI; // frente al pueblo
    g.add(pc.g);
    const def = {
      kind: 'car', vtype: 'geayi-police',
      x: SX, y: 0, z: SZ + 12,
      mesh: pc.g, taken: false, heading: Math.PI,
      maxSpeed: spec.maxSpeed || 15, accel: spec.accel || 13, seatY: spec.seatY || 0.8,
      cl1police: true,
    };
    if (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.cars) LEVEL.cars.push(def);
    CL1.station.patrolDef = def;
  } catch (e) {}
}
/* delincuente: muñeco de bloques original con antifaz 🥷 */
function _cl1BuildCrim() {
  const g = new THREE.Group();
  const hood = 0x3a3f4d, skin = 0xd9a066, pants = 0x2b2f3a;
  _cl1Mesh(0.28, 0.5, 0.28, pants, false, -0.18, 0.25, 0, g);
  _cl1Mesh(0.28, 0.5, 0.28, pants, false, 0.18, 0.25, 0, g);
  _cl1Mesh(0.7, 0.75, 0.42, hood, false, 0, 0.9, 0, g);            // sudadera
  const armL = new THREE.Group(); armL.position.set(-0.46, 1.22, 0);
  _cl1Mesh(0.2, 0.62, 0.2, hood, false, 0, -0.28, 0, armL); g.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.46, 1.22, 0);
  _cl1Mesh(0.2, 0.62, 0.2, hood, false, 0, -0.28, 0, armR); g.add(armR);
  _cl1Mesh(0.5, 0.5, 0.5, skin, false, 0, 1.55, 0, g);             // cabeza
  _cl1Mesh(0.54, 0.2, 0.54, 0x14161c, false, 0, 1.58, 0, g);       // antifaz
  _cl1Mesh(0.56, 0.12, 0.56, hood, false, 0, 1.86, 0, g);         // capucha
  const icon = _cl1EmojiSprite('💰', 0.45);                       // robando una tienda
  if (icon) { icon.position.set(0, 2.5, 0); icon.visible = false; g.add(icon); }
  g.userData.crim = { armL, armR, icon };
  return g;
}
function _cl1SpawnCrim() {
  try {
    if (!CL1.group) return null;
    const active = CL1.crims.filter(c =>
      c.state === 'steal' || c.state === 'flee' || c.state === 'follow' || c.state === 'incar').length;
    if (active >= 2) return null;
    const shops = CL1.shops.length ? CL1.shops : [{ x: -8.5, z: 26 }, { x: 8.5, z: 26 }];
    const sh = shops[(Math.random() * shops.length) | 0];
    const g = _cl1BuildCrim();
    const x = sh.x + (Math.random() * 4 - 2), z = sh.z + 3.5 + Math.random() * 2;
    g.position.set(x, 0, z);
    CL1.group.add(g);
    const c = { g, x, z, dir: Math.random() * Math.PI * 2, state: 'steal', t: 0, bob: Math.random() * 6 };
    CL1.crims.push(c);
    _cl1Toast(_cpT('cp.stealing'));
    return c;
  } catch (e) { return null; }
}
function _cl1RemoveCrim(i) {
  try {
    const c = CL1.crims[i];
    if (c && c.g && c.g.parent) c.g.parent.remove(c.g);
  } catch (e) {}
  CL1.crims.splice(i, 1);
}
function _cl1PlayerXZ() {
  try {
    if (typeof Player !== 'undefined' && Player.pos) return [Player.pos.x, Player.pos.z];
  } catch (e) {}
  return [0, 0];
}
/* manos arriba 🙌 (arresto amistoso) o abajo */
function _cl1ArmsUp(ud, up, dt) {
  try {
    if (!ud || !ud.armL || !ud.armR) return;
    const k = Math.min(1, dt * 8), L = up ? -2.6 : 0, Rr = up ? 2.6 : 0;
    ud.armL.rotation.z += (L - ud.armL.rotation.z) * k;
    ud.armR.rotation.z += (Rr - ud.armR.rotation.z) * k;
  } catch (e) {}
}
/* 👮 empezar / terminar el patrullaje */
CityLife1.toggleCop = function () {
  _cl1Click();
  if (!CityLife1.active || CityLife1.idx !== 3) return;
  CL1.cop.on = !CL1.cop.on;
  if (CL1.cop.on) {
    CL1.cop.spawnT = 6;
    _cl1Banner('👮 ' + _cpT('cp.patrolTip'), _cpT('cp.onDuty'), 2600);
  } else {
    for (let i = CL1.crims.length - 1; i >= 0; i--) {
      const c = CL1.crims[i];
      if (c.state === 'steal' || c.state === 'flee' || c.state === 'follow' || c.state === 'incar')
        _cl1RemoveCrim(i); // los encarcelados se quedan en su celda
    }
    _cl1Toast(_cpT('cp.offDuty'));
  }
  try { if (CL1.btnCop) CL1.btnCop.textContent = CL1.cop.on ? '👮🟢' : '👮'; } catch (e) {}
};
/* celda libre más cercana (radio r) */
function _cl1NearFreeCell(x, z, r) {
  if (!CL1.station) return null;
  let best = null, bd = r;
  for (const cell of CL1.station.cells) {
    if (cell.occupied) continue;
    const d = Math.hypot(x - cell.cx, z - cell.cz);
    if (d < bd) { bd = d; best = cell; }
  }
  return best;
}
/* 🔒 encerrar: pago, rango, puerta con rejas y fianza */
function _cl1JailCrim(c, cell) {
  c.state = 'jailed'; c.t = 0;
  c.x = cell.cx; c.z = cell.cz;
  c.g.position.set(c.x, 0, c.z);
  c.g.rotation.y = 0; c.g.visible = true;
  const ud = (c.g.userData && c.g.userData.crim) || {};
  _cl1ArmsUp(ud, false, 1);
  if (ud.icon) { try { ud.icon.visible = false; } catch (e) {} }
  cell.occupied = true; cell.crim = c; cell.byPlayer = true;
  cell.doorT = 0; // la celda se cierra con rejas
  _cl1AddRank(5);
  const rank = _cl1Rank();
  const pay = rank >= 50 ? 25 : 20;
  _cl1Earn(pay);
  cell.bail = 20 + Math.floor(rank / 2);
  cell.bailT = 60 + Math.random() * 30; // 60-90 s
  if (cell.sign) cell.sign.draw([_cpT('cp.bail') + ': ' + cell.bail + ' 🪙'], '#3a2a00', '#ffd23f');
  _cl1Banner(_cpT('cp.jailed'), '+' + pay + ' 🪙 · ' + _cpT('cp.rank') + ' ' + rank, 2400);
  try { if (typeof Audio2 !== 'undefined' && Audio2.good) Audio2.good(); } catch (e) {}
}
/* 💰 un NPC paga la fianza: el delincuente sale libre y tú recibes el 50% */
function _cl1BailPaid(cell) {
  const c = cell.crim;
  const cut = Math.floor(cell.bail / 2);
  cell.occupied = false; cell.crim = null;
  cell.doorT = -1.9; // la puerta se abre
  if (cell.sign) cell.sign.draw([_cpT('cp.bailFree')], '#0d4d1f', '#7dff9e');
  if (c) { c.state = 'leaving'; c.t = 0; }
  if (cell.byPlayer && cut > 0) {
    _cl1Earn(cut);
    _cl1Toast(_cpT('cp.bailPaid') + ' +' + cut + ' 🪙');
  } else {
    _cl1Toast(_cpT('cp.freed'));
  }
  cell.byPlayer = false;
}
/* 🚔 ARRESTAR / 🔒 ENCERRAR (botón contextual) */
CityLife1.copAction = function () {
  _cl1Click();
  if (!CL1.cop.on || !CL1.station) return;
  const [px, pz] = _cl1PlayerXZ();
  // 1) ¿encerrar? arrestado que te sigue, junto a una celda libre
  for (const c of CL1.crims) {
    if (c.state !== 'follow') continue;
    const cell = _cl1NearFreeCell(c.x, c.z, 3.5);
    if (cell) { _cl1JailCrim(c, cell); return; }
  }
  // 2) ¿arrestar? delincuente a ≤4 m (a pie o en patrulla)
  let best = null, bd = 4.0;
  for (const c of CL1.crims) {
    if (c.state !== 'steal' && c.state !== 'flee') continue;
    const d = Math.hypot(px - c.x, pz - c.z);
    if (d <= bd) { bd = d; best = c; }
  }
  if (best) {
    best.state = 'follow'; best.t = 0;
    _cl1Toast(_cpT('cp.arrested'));
  } else {
    const anyFollow = CL1.crims.some(c => c.state === 'follow');
    _cl1Toast(anyFollow ? _cpT('cp.noCell') : _cpT('cp.tooFar'));
  }
};
/* IA de delincuentes + fianza, cada cuadro */
function _cl1CopTick(dt) {
  if (!CityLife1.active || CityLife1.idx !== 3 || !CL1.station) return;
  if (CL1.cop.on) {
    CL1.cop.spawnT -= dt;
    if (CL1.cop.spawnT <= 0) { _cl1SpawnCrim(); CL1.cop.spawnT = 22 + Math.random() * 18; }
  }
  const [px, pz] = _cl1PlayerXZ();
  const rank = _cl1Rank();
  let inCar = false;
  try { inCar = typeof Vehicle !== 'undefined' && Vehicle.mode === 'car'; } catch (e) {}
  for (let i = CL1.crims.length - 1; i >= 0; i--) {
    const c = CL1.crims[i];
    c.t += dt;
    const dx = px - c.x, dz = pz - c.z, d = Math.hypot(dx, dz) || 0.001;
    const ud = (c.g.userData && c.g.userData.crim) || {};
    if (c.state === 'steal') {
      c.bob += dt * 6;
      c.g.position.y = Math.abs(Math.sin(c.bob)) * 0.12;
      if (ud.icon) { try { ud.icon.visible = true; } catch (e) {} }
      // ¿te ve venir de frente a >10 m? → huye
      if (d > 10 && d < 60) {
        const fx = Math.sin(c.dir), fz = Math.cos(c.dir);
        if ((fx * dx + fz * dz) / d > 0.5) {
          c.state = 'flee';
          if (ud.icon) { try { ud.icon.visible = false; } catch (e) {} }
          _cl1Toast(_cpT('cp.flee'));
        }
      }
    } else if (c.state === 'flee') {
      const sp = rank >= 50 ? 5.0 : 6.8; // a rango 50+ huyen más lento
      c.dir = Math.atan2(-dx, -dz);
      c.x += Math.sin(c.dir) * sp * dt;
      c.z += Math.cos(c.dir) * sp * dt;
      c.g.position.set(c.x, Math.abs(Math.sin(c.t * 10)) * 0.15, c.z);
      c.g.rotation.y = c.dir;
      _cl1ArmsUp(ud, false, dt);
      if (d > 80) { _cl1RemoveCrim(i); _cl1Toast(_cpT('cp.escaped')); continue; } // se pierde
    } else if (c.state === 'follow') {
      _cl1ArmsUp(ud, true, dt); // 🙌 manos arriba
      if (ud.icon) { try { ud.icon.visible = false; } catch (e) {} }
      if (inCar) { c.state = 'incar'; c.g.visible = false; continue; } // va en la patrulla
      if (d > 2.4) {
        c.dir = Math.atan2(dx, dz);
        const step = Math.min(7.2 * dt, d - 2.2);
        c.x += Math.sin(c.dir) * step;
        c.z += Math.cos(c.dir) * step;
        c.g.position.set(c.x, Math.abs(Math.sin(c.t * 9)) * 0.12, c.z);
        c.g.rotation.y = c.dir;
      } else {
        c.g.position.y = 0;
        c.g.rotation.y = Math.atan2(dx, dz);
      }
    } else if (c.state === 'incar') {
      if (!inCar) { // te bajaste: el arrestado sale junto a ti
        c.state = 'follow'; c.g.visible = true;
        c.x = px + 1.5; c.z = pz + 1.5;
        c.g.position.set(c.x, 0, c.z);
      }
    } else if (c.state === 'jailed') {
      c.g.position.y = 0;
      c.g.rotation.y += dt * 0.6;
      _cl1ArmsUp(ud, false, dt);
    } else if (c.state === 'leaving') {
      _cl1ArmsUp(ud, false, dt);
      const tx = CL1.station.x, tz = CL1.station.z + 20;
      const lx = tx - c.x, lz = tz - c.z, ld = Math.hypot(lx, lz) || 1;
      c.dir = Math.atan2(lx, lz);
      c.x += (lx / ld) * 4 * dt;
      c.z += (lz / ld) * 4 * dt;
      c.g.position.set(c.x, Math.abs(Math.sin(c.t * 9)) * 0.12, c.z);
      c.g.rotation.y = c.dir;
      if (ld < 2) {
        _cl1RemoveCrim(i);
        for (const cell of CL1.station.cells) if (!cell.occupied) cell.doorT = 0; // se cierra
        continue;
      }
    }
  }
  // puertas de celdas + cuenta regresiva de fianzas
  for (const cell of CL1.station.cells) {
    try {
      const dg = cell.door;
      if (dg) dg.rotation.y += (cell.doorT - dg.rotation.y) * Math.min(1, dt * 6);
    } catch (e) {}
    if (!cell.occupied || !cell.crim) continue;
    cell.bailT -= dt;
    if (cell.bailT <= 0) _cl1BailPaid(cell);
  }
}
/* botón contextual 🚔/🔒 + chip de rango, cada cuadro */
function _cl1CopUI() {
  try {
    if (!CL1.btnArrest) return;
    if (!CityLife1.active || CityLife1.idx !== 3 || !CL1.cop.on) {
      CL1.btnArrest.style.display = 'none';
      if (CL1.chipCop) CL1.chipCop.style.display = 'none';
      return;
    }
    if (CL1.chipCop) {
      CL1.chipCop.style.display = '';
      CL1.chipCop.textContent = _cpT('cp.rank') + ' ' + _cl1Rank();
    }
    const [px, pz] = _cl1PlayerXZ();
    let label = null;
    for (const c of CL1.crims) {
      if (c.state !== 'follow') continue;
      if (_cl1NearFreeCell(c.x, c.z, 3.5)) { label = _cpT('cp.jail'); break; }
    }
    if (!label) {
      for (const c of CL1.crims) {
        if (c.state !== 'steal' && c.state !== 'flee') continue;
        if (Math.hypot(px - c.x, pz - c.z) <= 4.5) { label = _cpT('cp.arrest'); break; }
      }
    }
    CL1.btnArrest.style.display = label ? '' : 'none';
    if (label) CL1.btnArrest.textContent = label;
  } catch (e) {}
}
