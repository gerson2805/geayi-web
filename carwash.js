/* carwash.js — 🧽 AUTOLAVADO GEAYI (negocio propio · Immokalee, mundo idx 3)
   Minijuego de autolavado: llegan carros de NPCs sucios, el jugador los lava
   por pasos (🧼→🖌️→💧→✨) con botones táctiles y cobra +15 🪙 + propina.
   Todo 100% ORIGINAL (diseños propios, marca GEAYI), a nivel del suelo,
   geometrías y materiales cacheados (Android).

   Integración (la aplica el orquestador, con guards typeof):
     - index.html: <script src="carwash.js"></script> ANTES de game.js
     - game.js boot():       if (typeof CarWash!=='undefined') CarWash.init();
     - game.js startLevel(i): tras LEVEL = buildLevel(i);
                             if (typeof CarWash!=='undefined') CarWash.buildForLevel(i, LEVEL.group);
     - game.js loop():       if (typeof CarWash!=='undefined') CarWash.update(dt);
*/
'use strict';

/* ============================== i18n ============================== */
try {
  if (typeof addStrings === 'function') {
    addStrings('es', {
      'cw.title': '🧽 AUTOLAVADO GEAYI',
      'cw.wash': '🧽 LAVAR',
      'cw.step0': '🧼 Enjabonar', 'cw.step1': '🖌️ Cepillar',
      'cw.step2': '💧 Enjuagar', 'cw.step3': '✨ Secar',
      'cw.wrong': '⏳ Sigue el orden: toca el paso iluminado',
      'cw.far': '🚗 Acércate al carro sucio para lavarlo',
      'cw.dirty': '🚗 ¡Llegó un carro sucio al autolavado!',
      'cw.paid': '🧽 ¡Carro limpio! +{n} 🪙',
      'cw.tip': '💨 ¡Rapidísimo! Propina +5 🪙',
      'cw.streak': '🔥 ¡Racha de {n} carros! Bono +25 🪙',
      'cw.stepOf': 'Paso',
    });
    addStrings('en', {
      'cw.title': '🧽 GEAYI CAR WASH',
      'cw.wash': '🧽 WASH',
      'cw.step0': '🧼 Soap', 'cw.step1': '🖌️ Scrub',
      'cw.step2': '💧 Rinse', 'cw.step3': '✨ Dry',
      'cw.wrong': '⏳ Follow the order: tap the highlighted step',
      'cw.far': '🚗 Get close to the dirty car to wash it',
      'cw.dirty': '🚗 A dirty car arrived at the car wash!',
      'cw.paid': '🧽 Car clean! +{n} 🪙',
      'cw.tip': '💨 Super fast! Tip +5 🪙',
      'cw.streak': '🔥 {n}-car streak! Bonus +25 🪙',
      'cw.stepOf': 'Step',
    });
  }
} catch (e) {}

/* ============================== ayudantes ============================== */
function _cwT(k) { try { return T(k); } catch (e) { return k; } }
function _cwNow() { try { return performance.now() / 1000; } catch (e) { return Date.now() / 1000; } }
function _cwToast(m) { try { if (typeof toast === 'function') toast(m); } catch (e) {} }
function _cwSfx(n) { try { if (typeof Audio2 !== 'undefined' && Audio2 && Audio2[n]) Audio2[n](); } catch (e) {} }
function _cwBurst(x, y, z, colors, n, power) {
  try { if (typeof Particles !== 'undefined' && Particles.burst) Particles.burst(x, y, z, colors, n, power); } catch (e) {}
}
function _cwEarn(n) {
  try {
    // Pase VIP 2x: si la tienda está cargada, Shop2.addCoins ya aplica el multiplicador
    if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.addCoins === 'function') Shop2.addCoins(n);
    else { SAVE.coins = (SAVE.coins || 0) + n; persist(); }
    const h = (typeof $ === 'function') ? $('hud-coins') : null;
    if (h) h.textContent = SAVE.coins;
  } catch (e) {}
}
function _cwD2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }

/* ---- caché de geometrías / materiales (Android) ---- */
const _cwGeos = {}, _cwMats = {};
function _cwG(key, make) { if (!_cwGeos[key]) _cwGeos[key] = make(); return _cwGeos[key]; }
function _cwM(key, make) { if (!_cwMats[key]) _cwMats[key] = make(); return _cwMats[key]; }
function _cwBox(w, h, d, color, emissive) {
  const g = _cwG('b' + w + '|' + h + '|' + d, () => new THREE.BoxGeometry(w, h, d));
  const m = _cwM('m' + color + '|' + (emissive || 0),
    () => new THREE.MeshStandardMaterial({ color: color, roughness: 0.85, emissive: emissive || 0x000000 }));
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  return mesh;
}
function _cwCyl(rt, rb, h, color, seg) {
  const g = _cwG('c' + rt + '|' + rb + '|' + h + '|' + seg, () => new THREE.CylinderGeometry(rt, rb, h, seg || 14));
  const m = _cwM('m' + color + '|0c', () => new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 }));
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  return mesh;
}

/* ============================== estado ============================== */
const CW = {
  built: false, group: null,
  cx: 90, cz: 8,                 // centro del lote (verificado libre en tests)
  car: null,                     // {mesh, spots[], state, stepAnim}
  washing: false, step: 0, t0: 0,
  stepAnim: 0,                   // bloqueo/animación entre pasos
  streak: 0, washed: 0,
  spawnT: 2,                     // cuenta atrás para el próximo carro
  rollers: [],                   // rodillos que giran al lavar
  ui: null, btnWash: null, stepBtns: [], chip: null,
};
const CW_PRICE = 15, CW_TIP = 5, CW_TIP_TIME = 40, CW_STREAK_BONUS = 25, CW_STREAK_EVERY = 5;
const CW_COLORS = [0xff4d6d, 0x2fa9ff, 0xffd23f, 0x35c759, 0x9d6bff, 0xff7a1a, 0x00e5ff];
const CW_STEP_FX = [
  { colors: [0xffffff, 0xf2f7ff, 0xdff3ff], label: 'foam' },   // 🧼 espuma blanca
  { colors: [0x2fa9ff, 0x9fd8ff, 0xffffff], label: 'brush' },   // 🖌️ cepillo azul
  { colors: [0x00c2ff, 0x7edbff, 0xffffff], label: 'rinse' },   // 💧 agua
  { colors: [0xffd23f, 0xfff6b0, 0xffffff], label: 'dry' },     // ✨ brillo
];

/* ============================== letrero ============================== */
function _cwSignTexture() {
  try {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, '#00b8a9'); gr.addColorStop(1, '#0077b6');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 128);
    g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.strokeRect(6, 6, 500, 116);
    // burbujas originales
    g.fillStyle = 'rgba(255,255,255,.75)';
    [[40, 30, 12], [66, 88, 8], [470, 34, 10], [448, 92, 13], [90, 64, 6]].forEach(([x, y, r]) => {
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    });
    g.fillStyle = '#ffffff'; g.textAlign = 'center';
    g.font = '900 52px "Trebuchet MS", sans-serif';
    g.fillText('🧽 ' + _cwT('cw.title').replace('🧽 ', ''), 256, 82);
    const t = new THREE.CanvasTexture(c);
    return t;
  } catch (e) { return null; }
}

/* ============================== construcción ============================== */
function _cwBuildArches(g) {
  // túnel de lavado: 3 arcos bajos con rodillos de colores (diseño original GEAYI)
  const rollerCols = [0x00e5ff, 0xff4d94, 0xffd23f];
  [-2.5, 0, 2.5].forEach((dx, ai) => {
    const ax = CW.cx + dx;
    [-1.9, 1.9].forEach(dz => { // postes del arco
      const p = _cwBox(0.5, 3.4, 0.5, 0x2b3a4a);
      p.position.set(ax, 1.7, CW.cz + dz); g.add(p);
    });
    const beam = _cwBox(0.5, 0.5, 4.6, rollerCols[ai % 3], rollerCols[ai % 3]);
    beam.position.set(ax, 3.55, CW.cz); g.add(beam);
  });
  // rodillos laterales (verticales, giran al enjabonar/cepillar)
  [-1.15, 1.15].forEach((dz, i) => {
    const r = _cwCyl(0.5, 0.5, 2.2, rollerCols[i % 3], 12);
    r.position.set(CW.cx, 1.25, CW.cz + dz);
    r.userData.spinAxis = 'y';
    g.add(r); CW.rollers.push(r);
  });
  // rodillo superior (horizontal, gira sobre su eje)
  const top = _cwCyl(0.45, 0.45, 2.6, rollerCols[2], 12);
  top.rotation.x = Math.PI / 2;
  top.position.set(CW.cx, 2.05, CW.cz);
  top.userData.spinAxis = 'z';
  g.add(top); CW.rollers.push(top);
}

function _cwBuildLot(g) {
  const cx = CW.cx, cz = CW.cz;
  // losa del lote 24×16 (a nivel del suelo)
  const pad = _cwBox(24, 0.12, 16, 0x9fb6c9);
  pad.position.set(cx, 0.06, cz); pad.castShadow = false; g.add(pad);
  // franja del carril de lavado (un poco más clara)
  const lane = _cwBox(20, 0.14, 3.4, 0xc7d8e8);
  lane.position.set(cx, 0.07, cz); lane.castShadow = false; g.add(lane);
  // muros bajos laterales (entrada/salida ABIERTAS al este y oeste)
  [-6.2, 6.2].forEach(dz => {
    const w = _cwBox(20, 1.1, 0.4, 0x00b8a9);
    w.position.set(cx, 0.55, cz + dz); g.add(w);
    const trim = _cwBox(20, 0.18, 0.5, 0xffd23f);
    trim.position.set(cx, 1.18, cz + dz); g.add(trim);
  });
  // arcos + rodillos
  _cwBuildArches(g);
  // quiosco de cobro (esquina suroeste, fuera del carril)
  const k = _cwBox(3, 2.4, 2.6, 0xffffff); k.position.set(cx - 9, 1.2, cz + 5.4); g.add(k);
  const kr = _cwBox(3.6, 0.25, 3.2, 0xff4d94); kr.position.set(cx - 9, 2.55, cz + 5.4); g.add(kr);
  const kd = _cwBox(1.1, 1.7, 0.12, 0x263238); kd.position.set(cx - 9, 0.95, cz + 4.05); g.add(kd);
  const kc = _cwBox(0.9, 0.5, 0.6, 0x2b2f3a); kc.position.set(cx - 9, 2.9, cz + 5.4); g.add(kc); // caja
  // tanque de agua (esquina noreste)
  const tank = _cwCyl(1.2, 1.2, 2.6, 0x2fa9ff, 16); tank.position.set(cx + 8.5, 1.3, cz - 5.2); g.add(tank);
  const tcap = _cwCyl(1.3, 1.3, 0.25, 0xffffff, 16); tcap.position.set(cx + 8.5, 2.7, cz - 5.2); g.add(tcap);
  // cerca baja en los bordes norte/sur (postes + riel)
  for (let x = -11; x <= 11; x += 2.75) {
    [-7.6, 7.6].forEach(dz => {
      const p = _cwBox(0.18, 0.9, 0.18, 0xffffff);
      p.position.set(cx + x, 0.45, cz + dz); g.add(p);
    });
  }
  [-7.6, 7.6].forEach(dz => {
    const r = _cwBox(22.5, 0.12, 0.12, 0xffd23f);
    r.position.set(cx, 0.8, cz + dz); g.add(r);
  });
  // letrero 3D de doble cara (hacia el este, a la avenida)
  const pole = _cwCyl(0.14, 0.16, 4.6, 0x2b3a4a, 10); pole.position.set(cx + 13.5, 2.3, cz + 5); g.add(pole);
  const tex = _cwSignTexture();
  const sm = tex
    ? new THREE.MeshBasicMaterial({ map: tex })
    : new THREE.MeshBasicMaterial({ color: 0x00b8a9 });
  const sg = _cwG('cwsign', () => new THREE.PlaneGeometry(8, 2));
  [Math.PI / 2, -Math.PI / 2].forEach(ry => {
    const s = new THREE.Mesh(sg, sm);
    s.position.set(cx + 13.5, 4.6, cz + 5); s.rotation.y = ry;
    g.add(s);
  });
}

/* ============================== carros NPC ============================== */
function _cwAddDirt(mesh, seed) {
  // manchas marrones visibles; cada una con su material para limpiar por etapas
  const spots = [];
  const sg = _cwG('cwdirt', () => new THREE.BoxGeometry(0.55, 0.12, 0.55));
  const rnd = (() => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const spotsPos = [
    [-0.45, 1.06, 0.9], [0.4, 1.06, 0.7], [0, 1.62, -0.3], [-0.3, 1.62, -0.6],
    [-0.92, 0.75, 0.2], [0.92, 0.72, -0.4], [-0.5, 1.02, -1.1], [0.55, 1.02, -1.0],
  ];
  spotsPos.forEach(([x, y, z], i) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1, transparent: true, opacity: 1 });
    const sp = new THREE.Mesh(sg, m);
    sp.position.set(x + (rnd() - 0.5) * 0.2, y, z + (rnd() - 0.5) * 0.2);
    sp.rotation.y = rnd() * Math.PI;
    mesh.add(sp);
    spots.push(sp);
  });
  return spots;
}

function CarWash_spawnCar() {
  if (CW.car || !CW.built) return null;
  if (typeof buildCarMesh !== 'function') return null;
  const color = CW_COLORS[CW.washed % CW_COLORS.length];
  const mesh = buildCarMesh(color);
  mesh.rotation.y = Math.PI / 2; // largo del carro a lo largo del carril (eje x)
  mesh.position.set(CW.cx + 20, 0, CW.cz); // llega desde el este (avenida)
  CW.group.add(mesh);
  CW.car = { mesh: mesh, spots: _cwAddDirt(mesh, Date.now() % 100000 + 7), state: 'arriving', stepAnim: 0 };
  _cwToast(_cwT('cw.dirty'));
  _cwSfx('click');
  return CW.car;
}

function CarWash_removeCar() {
  if (!CW.car) return;
  try {
    if (CW.car.mesh && CW.car.mesh.parent) CW.car.mesh.parent.remove(CW.car.mesh);
    CW.car.spots.forEach(sp => { try { if (sp.material) sp.material.dispose(); } catch (e) {} });
  } catch (e) {}
  CW.car = null;
}

/* ============================== minijuego ============================== */
function _cwPlayerNear() {
  try {
    if (typeof Player === 'undefined' || !Player || !Player.pos || !CW.car) return false;
    const p = CW.car.mesh.position;
    return _cwD2(Player.pos.x, Player.pos.z, p.x, p.z) < 36; // 6 m
  } catch (e) { return false; }
}

function CarWash_startWash() {
  if (CW.washing || !CW.car || CW.car.state !== 'waiting') return false;
  if (!_cwPlayerNear()) { _cwToast(_cwT('cw.far')); return false; }
  CW.washing = true; CW.step = 0; CW.t0 = _cwNow(); CW.stepAnim = 0;
  CW.car.state = 'washing';
  _cwRenderSteps();
  _cwSfx('click');
  return true;
}

function CarWash_doStep(i) {
  if (!CW.washing || !CW.car || CW.car.state !== 'washing') return false;
  if (CW.stepAnim > 0) return false;                    // animación en curso
  if (i !== CW.step) { _cwToast(_cwT('cw.wrong')); return false; } // orden incorrecto: no avanza
  const p = CW.car.mesh.position;
  const fx = CW_STEP_FX[CW.step];
  _cwBurst(p.x, 1.6, p.z, fx.colors, 22, 5);
  // el carro se ve más limpio por etapas
  const op = [0.72, 0.45, 0.18, 0][CW.step];
  CW.car.spots.forEach(sp => { sp.material.opacity = op; if (op === 0) sp.visible = false; });
  CW.step++;
  CW.stepAnim = 0.9;
  _cwSfx('click');
  if (CW.step >= 4) CarWash_finishWash();
  else _cwRenderSteps();
  return true;
}

function CarWash_finishWash() {
  if (!CW.washing) return;
  const secs = _cwNow() - CW.t0;
  const tip = secs < CW_TIP_TIME ? CW_TIP : 0;
  CW.streak++;
  CW.washed++;
  const bonus = (CW.streak % CW_STREAK_EVERY === 0) ? CW_STREAK_BONUS : 0;
  const total = CW_PRICE + tip + bonus;
  _cwEarn(total);
  _cwToast(_cwT('cw.paid').replace('{n}', total));
  if (tip > 0) setTimeout(() => _cwToast(_cwT('cw.tip')), 900);
  if (bonus > 0) setTimeout(() => _cwToast(_cwT('cw.streak').replace('{n}', CW.streak)), 1800);
  const p = CW.car.mesh.position;
  _cwBurst(p.x, 1.8, p.z, [0xffd23f, 0xfff6b0, 0xffffff, 0x00e5ff], 40, 7);
  _cwSfx('coin');
  CW.car.state = 'leaving';
  CW.washing = false; CW.step = 0;
  _cwHideSteps();
}

/* ============================== UI táctil ============================== */
function _cwEnsureUI() {
  if (CW.ui) return;
  try {
    const ui = document.createElement('div');
    ui.id = 'cw-ui';
    ui.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:45;pointer-events:none;display:none;';
    // botón LAVAR (aparece cerca del carro sucio)
    const bw = document.createElement('button');
    bw.id = 'cw-wash-btn';
    bw.textContent = _cwT('cw.wash');
    bw.style.cssText = 'position:fixed;left:14px;bottom:252px;z-index:45;display:none;pointer-events:auto;' +
      'font-size:20px;font-weight:900;padding:14px 22px;border-radius:999px;border:4px solid #fff;' +
      'background:linear-gradient(180deg,#00c2a8,#0077b6);color:#fff;min-width:64px;min-height:64px;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.45);font-family:inherit;';
    bw.addEventListener('click', () => CarWash_startWash());
    document.body.appendChild(bw);
    CW.btnWash = bw;
    // barra de pasos ①→④ (botones táctiles ≥52px)
    const bar = document.createElement('div');
    bar.id = 'cw-steps';
    bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:118px;z-index:45;' +
      'display:none;pointer-events:auto;gap:10px;';
    bar.style.display = 'none';
    const labels = [_cwT('cw.step0'), _cwT('cw.step1'), _cwT('cw.step2'), _cwT('cw.step3')];
    CW.stepBtns = labels.map((lb, i) => {
      const b = document.createElement('button');
      b.textContent = lb;
      b.style.cssText = 'font-size:15px;font-weight:900;padding:10px 12px;border-radius:16px;' +
        'border:3px solid #fff;background:#334155;color:#fff;min-width:56px;min-height:56px;' +
        'box-shadow:0 4px 12px rgba(0,0,0,.4);font-family:inherit;';
      b.addEventListener('click', () => CarWash_doStep(i));
      bar.appendChild(b);
      return b;
    });
    document.body.appendChild(bar);
    CW.stepBar = bar;
    // chip de estado (paso, tiempo, racha)
    const chip = document.createElement('div');
    chip.id = 'cw-chip';
    chip.style.cssText = 'position:fixed;top:56px;left:10px;z-index:16;display:none;' +
      'font-size:14px;font-weight:800;background:rgba(0,60,80,.65);color:#fff;' +
      'padding:6px 12px;border-radius:999px;border:2px solid rgba(255,255,255,.7);font-family:inherit;';
    document.body.appendChild(chip);
    CW.chip = chip;
    CW.ui = ui;
  } catch (e) {}
}

function _cwRenderSteps() {
  if (!CW.stepBar) return;
  CW.stepBar.style.display = 'flex';
  const labels = [_cwT('cw.step0'), _cwT('cw.step1'), _cwT('cw.step2'), _cwT('cw.step3')];
  CW.stepBtns.forEach((b, i) => {
    b.textContent = (i < CW.step ? '✅ ' : (i === CW.step ? '👉 ' : '')) + labels[i];
    b.style.background = i < CW.step ? '#16a34a' : (i === CW.step ? '#f59e0b' : '#334155');
    b.style.opacity = i === CW.step ? '1' : '0.85';
  });
  if (CW.chip) {
    CW.chip.style.display = '';
    _cwChipTick();
  }
}
function _cwHideSteps() {
  if (CW.stepBar) CW.stepBar.style.display = 'none';
  if (CW.btnWash) CW.btnWash.style.display = 'none';
  if (CW.chip) CW.chip.style.display = 'none';
}
function _cwChipTick() {
  if (!CW.chip || !CW.washing) return;
  const secs = Math.floor(_cwNow() - CW.t0);
  CW.chip.textContent = '🧽 ' + _cwT('cw.stepOf') + ' ' + (CW.step + 1) + '/4 · ⏱️' + secs + 's · 🔥' + CW.streak;
}

/* ============================== API pública ============================== */
const CarWash = {
  init() { _cwEnsureUI(); },

  buildForLevel(i, group) {
    // limpiar construcción anterior
    try {
      if (CW.group && CW.group.parent) CW.group.parent.remove(CW.group);
    } catch (e) {}
    CW.group = null; CW.car = null; CW.built = false;
    CW.washing = false; CW.step = 0; CW.stepAnim = 0; CW.streak = 0; CW.spawnT = 2.5;
    CW.rollers = [];
    _cwHideSteps();
    if (i !== 3 || !group) return; // solo Immokalee
    CW.group = new THREE.Group();
    group.add(CW.group);
    _cwBuildLot(CW.group);
    CW.built = true;
  },

  update(dt) {
    if (!CW.built) return;
    try { if (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx !== 3) return; } catch (e) {}
    if (CW.stepAnim > 0) CW.stepAnim -= dt;
    // rodillos giran al enjabonar/cepillar (pasos 0-1) o durante la animación
    const spin = CW.washing && (CW.step <= 1 || CW.stepAnim > 0);
    CW.rollers.forEach(r => {
      if (!spin) return;
      if (r.userData.spinAxis === 'y') r.rotation.y += dt * 7;
      else r.rotation.z += dt * 7;
    });
    const c = CW.car;
    if (c) {
      const p = c.mesh.position;
      if (c.state === 'arriving') {
        p.x -= dt * 4;
        if (p.x <= CW.cx) { p.x = CW.cx; c.state = 'waiting'; }
      } else if (c.state === 'leaving') {
        p.x -= dt * 5.5;
        if (p.x < CW.cx - 24) { CarWash_removeCar(); CW.spawnT = 3 + Math.random() * 3; }
      }
    } else {
      CW.spawnT -= dt;
      if (CW.spawnT <= 0) { CarWash_spawnCar(); CW.spawnT = 6; }
    }
    // botón LAVAR: solo si hay carro esperando y el jugador está cerca y a pie
    let show = false;
    try {
      show = !!c && c.state === 'waiting' && !CW.washing && _cwPlayerNear() &&
        (typeof MODE === 'undefined' || MODE === 'play') &&
        (typeof Vehicle === 'undefined' || !Vehicle || Vehicle.mode === 'none');
    } catch (e) {}
    if (CW.btnWash) CW.btnWash.style.display = show ? '' : 'none';
    if (CW.washing) _cwChipTick();
  },

  // --- expuestas para UI y pruebas ---
  spawnCar: CarWash_spawnCar,
  startWash: CarWash_startWash,
  doStep: CarWash_doStep,
  finishWash: CarWash_finishWash,
  removeCar: CarWash_removeCar,
};
