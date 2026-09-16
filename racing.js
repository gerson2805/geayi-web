/* racing.js — 🏁 CARRERAS GEAYI: pista de carreras de tierra en Immokalee (mundo 4, idx 3)
   - Óvalo de tierra (~46 x 30) con 4 arcos de meta (salida/meta + 3 controles)
   - 4 carros GEAYI manejables en la parrilla de salida (usan el sistema de vehículos existente)
   - 3 robots GeayiBoots rivales que dan vueltas solos por el circuito
   - Lógica de carrera: 3 vueltas, cronómetro, mejor tiempo guardado, confeti y trofeo
   Diseños 100% originales (marca ficticia GEAYI del juego). */
'use strict';

/* ==================== i18n (prefijo race.) ==================== */
addStrings('es', {
  'race.sign': '🏁 CARRERAS GEAYI',
  'race.start': '🏁 ¡A correr! Sigue a los robots 🤖 3…',
  'race.ready': '🏁 ¡Prepárate! {n}…',
  'race.go': '🏁 ¡YA! ¡Acelera! 🚗💨',
  'race.hud': '🏁 Vuelta {lap}/3 · {t}',
  'race.checkpoint': '🚩 ¡Punto de control {n}!',
  'race.lap': '🏁 ¡Vuelta {n}/3!',
  'race.finish': '🏆 ¡Carrera terminada! Tiempo: {t}{best}',
  'race.newBest': ' ⭐ ¡NUEVO RÉCORD!',
});
addStrings('en', {
  'race.sign': '🏁 GEAYI RACING',
  'race.start': "🏁 Let's race! Follow the robots 🤖 3…",
  'race.ready': '🏁 Get ready! {n}…',
  'race.go': '🏁 GO! Floor it! 🚗💨',
  'race.hud': '🏁 Lap {lap}/3 · {t}',
  'race.checkpoint': '🚩 Checkpoint {n}!',
  'race.lap': '🏁 Lap {n}/3!',
  'race.finish': '🏆 Race finished! Time: {t}{best}',
  'race.newBest': ' ⭐ NEW RECORD!',
});
addStrings('pt', {
  'race.sign': '🏁 CORRIDAS GEAYI',
  'race.start': '🏁 Vamos correr! Siga os robôs 🤖 3…',
  'race.ready': '🏁 Prepare-se! {n}…',
  'race.go': '🏁 VAI! Acelera! 🚗💨',
  'race.hud': '🏁 Volta {lap}/3 · {t}',
  'race.checkpoint': '🚩 Ponto de controle {n}!',
  'race.lap': '🏁 Volta {n}/3!',
  'race.finish': '🏆 Corrida concluída! Tempo: {t}{best}',
  'race.newBest': ' ⭐ NOVO RECORDE!',
});
addStrings('fr', {
  'race.sign': '🏁 COURSES GEAYI',
  'race.start': '🏁 C’est parti ! Suis les robots 🤖 3…',
  'race.ready': '🏁 Prépare-toi ! {n}…',
  'race.go': '🏁 C’EST PARTI ! À fond ! 🚗💨',
  'race.hud': '🏁 Tour {lap}/3 · {t}',
  'race.checkpoint': '🚩 Point de contrôle {n} !',
  'race.lap': '🏁 Tour {n}/3 !',
  'race.finish': '🏆 Course terminée ! Temps : {t}{best}',
  'race.newBest': ' ⭐ NOUVEAU RECORD !',
});

/* ==================== estado ==================== */
const RACE = {
  built: false,
  cx: 78, cz: 86,          // centro del óvalo (al norte de Immokalee Dr: libre de tiendas, casino y casas)
  a: 8.5, r: 12,           // rectas (mitad) y radio de las curvas → huella ~46.8 x 29.6
  gates: [],               // [{x,z,armed}]
  waypoints: [],           // [{x,z}] línea central en orden de carrera
  cum: [], total: 0,       // longitudes acumuladas / perímetro
  rivals: [],               // [{mesh,s,speed,base,bot}]
  hud: null,
  phase: 'idle',           // idle | countdown | racing | finished
  countT: 0, lastN: 0,
  raceTime: 0, nextGate: 0, lapsDone: 0, finishT: 0,
};
function resetRaceState() {
  RACE.phase = 'idle';
  RACE.countT = 0; RACE.lastN = 0;
  RACE.raceTime = 0; RACE.nextGate = 0; RACE.lapsDone = 0; RACE.finishT = 0;
  RACE.gates.forEach(gt => { gt.armed = true; });
  // la meta se desarma al reiniciar: hay que alejarse (>7) y volver a cruzarla
  // para empezar otra carrera (evita reinicios automáticos si el carro quedó parado sobre la meta)
  if (RACE.gates[0]) RACE.gates[0].armed = false;
  hideRaceHud();
}

/* ==================== geometría del óvalo ==================== */
function buildRaceWaypoints() {
  const pts = [];
  const { cx, cz, a, r } = RACE;
  const step = 2.7;
  const push = (x, z) => {
    const l = pts[pts.length - 1];
    if (!l || Math.hypot(x - l.x, z - l.z) >= step * 0.9) pts.push({ x, z });
  };
  for (let x = cx - a; x <= cx + a; x += step) push(x, cz - r);            // recta sur (+x)
  for (let t = -Math.PI / 2; t <= Math.PI / 2; t += step / r)               // curva este
    push(cx + a + r * Math.cos(t), cz + r * Math.sin(t));
  for (let x = cx + a; x >= cx - a; x -= step) push(x, cz + r);             // recta norte (-x)
  for (let t = Math.PI / 2; t <= Math.PI * 1.5; t += step / r)             // curva oeste
    push(cx - a + r * Math.cos(t), cz + r * Math.sin(t));
  RACE.waypoints = pts;
  RACE.cum = [0];
  for (let i = 1; i <= pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i % pts.length];
    RACE.cum.push(RACE.cum[i - 1] + Math.hypot(p1.x - p0.x, p1.z - p0.z));
  }
  RACE.total = RACE.cum[pts.length];
}
function racePointAt(s) { // punto + tangente de la línea central
  const W = RACE.waypoints, n = W.length;
  s = ((s % RACE.total) + RACE.total) % RACE.total;
  let i = 0;
  while (i < n - 1 && RACE.cum[i + 1] < s) i++;
  const p0 = W[i], p1 = W[(i + 1) % n];
  const seg = RACE.cum[i + 1] - RACE.cum[i] || 1;
  const t = (s - RACE.cum[i]) / seg;
  const dx = p1.x - p0.x, dz = p1.z - p0.z, d = Math.hypot(dx, dz) || 1;
  return { x: p0.x + dx * t, z: p0.z + dz * t, tx: dx / d, tz: dz / d };
}
function nearestRaceS(x, z) { // arco más cercano a un punto (para el rubber-banding)
  const W = RACE.waypoints;
  let bi = 0, bd = Infinity;
  for (let i = 0; i < W.length; i++) {
    const d = (W[i].x - x) * (W[i].x - x) + (W[i].z - z) * (W[i].z - z);
    if (d < bd) { bd = d; bi = i; }
  }
  return RACE.cum[bi];
}

/* ==================== texturas ==================== */
let _raceCheckerTex = null;
function raceCheckerTex() {
  if (_raceCheckerTex) return _raceCheckerTex;
  _raceCheckerTex = canvasTex(128, 32, (g, w, h) => {
    const s = 16;
    for (let y = 0; y < h / s; y++) for (let x = 0; x < w / s; x++) {
      g.fillStyle = (x + y) % 2 ? '#111111' : '#ffffff';
      g.fillRect(x * s, y * s, s, s);
    }
  });
  return _raceCheckerTex;
}
let _raceSignTex = null;
function raceSignTex() {
  if (_raceSignTex) return _raceSignTex;
  _raceSignTex = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#101418'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { // borde de cuadros
      g.fillStyle = (x / 32) % 2 ? '#ffffff' : '#111111';
      g.fillRect(x, 0, 32, 14); g.fillRect(x, h - 14, 32, 14);
    }
    g.strokeStyle = '#ffd23f'; g.lineWidth = 5; g.strokeRect(20, 20, w - 40, h - 40);
    g.fillStyle = '#ffffff'; g.textAlign = 'center';
    g.font = '900 52px "Trebuchet MS", sans-serif';
    g.fillText(T('race.sign'), w / 2, 84);
  });
  return _raceSignTex;
}

/* ==================== construcción ==================== */
// clamp local: racing.js no depende del orden de carga de otros scripts
const raceClamp = (v, a, b) => v < a ? a : (v > b ? b : v);
function raceFmtTime(ms) {
  if (ms == null) return '—';
  const t = ms / 1000, m = Math.floor(t / 60), s = Math.floor(t % 60), d = Math.floor((t % 1) * 10);
  return m + ':' + String(s).padStart(2, '0') + '.' + d;
}
function raceToast(msg) { if (typeof toast === 'function') toast(msg); }
function raceMat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 });
}
function addRaceDecal(lvl, x, y, z, w, d, color) { // visual plano NO sólido (no interfiere con la física)
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  lvl.group.add(m);
  return m;
}
function addRaceGate(lvl, x, z, alongX) {
  const g = lvl.group;
  const postM = raceMat(0x2b2f3a);
  const off = 3.4;
  if (alongX) { // la pista va en x → el arco cruza en z
    [[x, z - off], [x, z + off]].forEach(([px, pz]) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.4, 0.6), postM);
      p.position.set(px, 2.2, pz); p.castShadow = true; g.add(p);
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, off * 2 + 0.8),
      new THREE.MeshBasicMaterial({ map: raceCheckerTex() }));
    beam.position.set(x, 4.4, z); g.add(beam);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(1.4, off * 2 - 0.6),
      new THREE.MeshBasicMaterial({ map: raceCheckerTex() }));
    strip.rotation.x = -Math.PI / 2; strip.position.set(x, 0.06, z); g.add(strip);
  } else { // la pista va en z → el arco cruza en x
    [[x - off, z], [x + off, z]].forEach(([px, pz]) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.4, 0.6), postM);
      p.position.set(px, 2.2, pz); p.castShadow = true; g.add(p);
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(off * 2 + 0.8, 1.1, 0.7),
      new THREE.MeshBasicMaterial({ map: raceCheckerTex() }));
    beam.position.set(x, 4.4, z); g.add(beam);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(off * 2 - 0.6, 1.4),
      new THREE.MeshBasicMaterial({ map: raceCheckerTex() }));
    strip.rotation.x = -Math.PI / 2; strip.position.set(x, 0.06, z); g.add(strip);
  }
  RACE.gates.push({ x, z, armed: true });
}
function addRaceSign(lvl, x, z) {
  const g = lvl.group;
  const postM = raceMat(0x2b2f3a);
  [[-3.6], [3.6]].forEach(([ox]) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.4, 8), postM);
    p.position.set(x + ox, 1.7, z); p.castShadow = true; g.add(p);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25),
    new THREE.MeshBasicMaterial({ map: raceSignTex(), side: THREE.DoubleSide }));
  sign.position.set(x, 3.4, z);
  g.add(sign);
}
function addRacePodium(lvl, x, z) {
  const g = lvl.group;
  const steps = [
    { dx: -2.3, h: 0.9, c: 0xc0c0c0 },  // 2° plata
    { dx: 0, h: 1.4, c: 0xffd23f },     // 1° oro
    { dx: 2.3, h: 0.55, c: 0xcd7f32 },  // 3° bronce
  ];
  steps.forEach(s => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(2, s.h, 2), raceMat(s.c));
    b.position.set(x + s.dx, s.h / 2, z); b.castShadow = true; g.add(b);
  });
}
function addRivalCar(lvl, vtype, color, s0, baseSpeed) {
  const pt = racePointAt(s0);
  const mesh = (typeof addVehicle === 'function')
    ? addVehicle(lvl, vtype, pt.x, 0, pt.z, color, false, Math.atan2(pt.tx, pt.tz))
    : null;
  if (!mesh) return;
  let bot = null;
  if (typeof buildGeayiBootMesh === 'function') { // 🤖 piloto robot sentado
    bot = buildGeayiBootMesh();
    bot.scale.setScalar(0.55);
    bot.position.set(-0.35, 0.85, -0.25);
    mesh.add(bot);
  }
  RACE.rivals.push({ mesh, s: s0, speed: baseSpeed, base: baseSpeed, bot });
}

/* Puerta de entrada para el mundo 4 (Immokalee, idx 3). El padre la conecta en buildLevel. */
function addRacingContent(idx, lvl) {
  if (idx !== 3) return;
  RACE.built = false;
  RACE.gates = []; RACE.rivals = [];
  resetRaceState();
  buildRaceWaypoints();
  const { cx, cz, a, r } = RACE;
  const DIRT = 0x9c6b3f, DIRT_D = 0x8a5a33, GRASS = 0x62b34e;

  /* NOTA de física: moveAxis() no permite subir ni 1 cm (cualquier borde sobre
     las ruedas bloquea el carro). Por eso TODA la superficie manejable es UNA
     sola plataforma plana a topY=0: el anillo de tierra, el faldón y el
     interior son calcomanías visuales no sólidas sobre ella. */
  addPlatform(lvl, cx, 0, cz, 47, 30, { color: DIRT, emissive: 0x000000 }); // campo de tierra 47x30

  // --- interior de pasto (paddock) ---
  addRaceDecal(lvl, cx, 0.015, cz, 30, 18, GRASS);
  // --- anillo de tierra: la línea de carrera (5 de ancho), calcomanías no sólidas ---
  const W = RACE.waypoints;
  for (let i = 0; i < W.length; i++) {
    addRaceDecal(lvl, W[i].x, 0.02 + (i % 4) * 0.005, W[i].z, 5.6, 5.6, 0xa9713f);
  }
  // --- faldón exterior de tierra oscura (se ve la zona de seguridad) ---
  for (let i = 0; i < W.length; i++) {
    const p0 = W[(i + W.length - 1) % W.length], p1 = W[(i + 1) % W.length];
    let tx = p1.x - p0.x, tz = p1.z - p0.z;
    const d = Math.hypot(tx, tz) || 1; tx /= d; tz /= d;
    const d1 = Math.hypot(W[i].x - tz * 6 - cx, W[i].z + tx * 6 - cz);
    const d2 = Math.hypot(W[i].x + tz * 6 - cx, W[i].z - tx * 6 - cz);
    const sgn = d1 > d2 ? 1 : -1; // normal exterior
    const nx = -tz * sgn, nz = tx * sgn;
    addRaceDecal(lvl, W[i].x + nx * 5.9, 0.018 + (i % 4) * 0.005, W[i].z + nz * 5.9, 5.6, 5.6, DIRT_D);
  }

  // --- 4 arcos: salida/meta + 3 controles (en orden de carrera) ---
  addRaceGate(lvl, cx, cz - r, true);        // G0 salida/meta (recta sur)
  addRaceGate(lvl, cx + a + r, cz, false);   // G1 curva este
  addRaceGate(lvl, cx, cz + r, true);        // G2 recta norte
  addRaceGate(lvl, cx - a - r, cz, false);   // G3 curva oeste

  // --- letrero (en el interior, junto a la recta de salida) y podio ---
  addRaceSign(lvl, cx - 8, cz - 5);
  addRacePodium(lvl, cx, cz);

  // --- 4 carros GEAYI manejables en la parrilla (usan addVehicle: SUBIR/E para manejar) ---
  const H = Math.PI / 2; // mirando +x (dirección de carrera)
  if (typeof addVehicle === 'function') {
    addVehicle(lvl, 'geayi-pickup', cx - 10, 0, cz - r - 1.2, 0xffffff, true, H);
    addVehicle(lvl, 'geayi-gt', cx - 5.5, 0, cz - r - 1.2, 0xff3d5e, true, H);
    addVehicle(lvl, 'geayi-taxi', cx - 10, 0, cz - r + 1.4, 0xffcf3f, true, H);
    addVehicle(lvl, 'geayi-bus', cx - 5.5, 0, cz - r + 1.4, 0x00a2ff, true, H);
  }

  // --- 3 rivales: robots GeayiBoots en carros GEAYI, dando vueltas solos ---
  addRivalCar(lvl, 'geayi-gt', 0x7b2fff, RACE.total * 0.15, 9.5);
  addRivalCar(lvl, 'geayi-pickup', 0x59d867, RACE.total * 0.45, 10.5);
  addRivalCar(lvl, 'geayi-taxi', 0xff9d00, RACE.total * 0.75, 11.5);

  ensureRaceHud();
  RACE.built = true;
}

/* ==================== HUD ==================== */
function ensureRaceHud() {
  if (RACE.hud || typeof document === 'undefined') return;
  const d = document.createElement('div');
  d.id = 'race-hud';
  d.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);' +
    'background:rgba(10,14,20,.74);color:#fff;font:700 15px/1.5 system-ui,sans-serif;' +
    'padding:6px 16px;border-radius:20px;border:2px solid #ffd23f;z-index:60;' +
    'display:none;pointer-events:none;white-space:nowrap;';
  document.body.appendChild(d);
  RACE.hud = d;
}
function showRaceHud(on) {
  ensureRaceHud();
  if (RACE.hud) RACE.hud.style.display = on ? '' : 'none';
}
function hideRaceHud() { if (RACE.hud) RACE.hud.style.display = 'none'; }
function updateRaceHud() {
  if (!RACE.hud || RACE.phase === 'idle') return;
  if (RACE.phase === 'countdown') {
    RACE.hud.textContent = tp('race.ready', { n: Math.max(1, Math.ceil(RACE.countT)) });
  } else if (RACE.phase === 'racing') {
    RACE.hud.textContent = tp('race.hud', {
      lap: Math.min(3, RACE.lapsDone + 1),
      t: raceFmtTime(Math.floor(RACE.raceTime * 1000))
    });
  } else if (RACE.phase === 'finished') {
    RACE.hud.textContent = tp('race.hud', { lap: 3, t: raceFmtTime(Math.floor(RACE.raceTime * 1000)) });
  }
}

/* ==================== lógica de carrera ==================== */
function raceDriving() { // ¿el jugador maneja un carro GEAYI?
  return typeof Vehicle !== 'undefined' && Vehicle.mode === 'car' &&
    Vehicle.def && Vehicle.def.vtype && Vehicle.def.vtype.indexOf('geayi') === 0;
}
function raceLeftArea() {
  const P = (typeof Player !== 'undefined') ? Player : null;
  if (!P) return true;
  return Math.hypot(P.pos.x - RACE.cx, P.pos.z - RACE.cz) > 48;
}
function raceStartCountdown() {
  RACE.phase = 'countdown';
  RACE.countT = 3.2; RACE.lastN = 4;
  RACE.raceTime = 0; RACE.nextGate = 1; RACE.lapsDone = 0;
  RACE.gates.forEach(gt => { gt.armed = true; });
  if (RACE.gates[0]) RACE.gates[0].armed = false; // acabamos de cruzar la meta
  raceToast(T('race.start'));
  if (typeof Audio2 !== 'undefined') { if (Audio2.count) Audio2.count(); else Audio2.click(); }
  showRaceHud(true);
  updateRaceHud();
}
function raceCheckGates() {
  const P = (typeof Player !== 'undefined') ? Player : null;
  if (!P) return;
  const gt = RACE.gates[RACE.nextGate];
  if (!gt || !gt.armed) return;
  if (Math.hypot(P.pos.x - gt.x, P.pos.z - gt.z) > 4.2) return;
  gt.armed = false;
  const g = RACE.nextGate;
  if (typeof Audio2 !== 'undefined') Audio2.check();
  if (g === 0) {
    RACE.lapsDone++;
    if (RACE.lapsDone >= 3) { raceFinish(); return; }
    raceToast(tp('race.lap', { n: RACE.lapsDone + 1 }));
  } else {
    raceToast(tp('race.checkpoint', { n: g }));
  }
  RACE.nextGate = (g + 1) % 4;
}
function raceFinish() {
  RACE.phase = 'finished';
  RACE.finishT = 6;
  const ms = Math.floor(RACE.raceTime * 1000);
  let best = '';
  if (typeof SAVE !== 'undefined' && (!SAVE.bestRace || ms < SAVE.bestRace)) {
    SAVE.bestRace = ms;
    if (typeof persist === 'function') persist();
    best = T('race.newBest');
  }
  raceToast(tp('race.finish', { t: raceFmtTime(ms), best: best }));
  if (typeof Audio2 !== 'undefined') Audio2.win();
  const P = (typeof Player !== 'undefined') ? Player.pos : { x: RACE.cx, y: 0, z: RACE.cz };
  if (typeof Particles !== 'undefined') {
    Particles.burst(P.x, P.y + 2, P.z, [0xffd23f, 0x00e5ff, 0xff2fd6, 0x35c759], 40, 7);
    Particles.burst(P.x, P.y + 4, P.z, [0xffffff, 0xffe95e], 25, 5);
  }
  if (typeof Trophy !== 'undefined' && Trophy && typeof Trophy.unlock === 'function') {
    try { Trophy.unlock('raceWin'); } catch (e) {}
  }
  updateRaceHud();
}
function updateRaceRivals(dt) {
  if (!RACE.rivals.length || !RACE.total) return;
  const racing = RACE.phase === 'racing';
  let pS = -1;
  if (racing && typeof Player !== 'undefined') pS = nearestRaceS(Player.pos.x, Player.pos.z);
  for (const rv of RACE.rivals) {
    let target = rv.base;
    if (pS >= 0) { // rubber-banding suave: ni se escapan ni se quedan atrás
      const ahead = (((rv.s - pS) % RACE.total) + RACE.total) % RACE.total;
      if (ahead < RACE.total / 2) { if (ahead > 20) target = rv.base - 2; }
      else if (RACE.total - ahead > 20) target = rv.base + 2;
    }
    rv.speed += (target - rv.speed) * Math.min(1, dt * 1.2);
    rv.speed = raceClamp(rv.speed, 7, 14.5);
    rv.s = (rv.s + rv.speed * dt) % RACE.total;
    const pt = racePointAt(rv.s);
    rv.mesh.position.set(pt.x, 0, pt.z);
    rv.mesh.rotation.y = Math.atan2(pt.tx, pt.tz);
    const spin = rv.speed * dt * 1.6;
    (rv.mesh.userData.wheels || []).forEach(w => { w.rotation.x += spin; });
    if (rv.bot && typeof animateGeayiBoot === 'function') animateGeayiBoot(rv.bot, dt, rv.speed * 0.4);
  }
}
/* Llamada cada frame en modo play (el padre la conecta en el loop, junto a updateWorldFx). */
function updateRacing(dt) {
  if (!RACE.built) return;
  if (typeof LEVEL === 'undefined' || !LEVEL || LEVEL.idx !== 3) { hideRaceHud(); return; }
  if (typeof MODE !== 'undefined' && MODE !== 'play') return;
  dt = Math.min(dt, 0.05);
  updateRaceRivals(dt);
  // re-armar puertas al alejarse (evita doble conteo y permite reiniciar la carrera)
  if (typeof Player !== 'undefined') {
    for (const gt of RACE.gates) {
      if (!gt.armed && Math.hypot(Player.pos.x - gt.x, Player.pos.z - gt.z) > 7) gt.armed = true;
    }
  }
  if (RACE.phase === 'idle') {
    if (raceDriving()) {
      const g0 = RACE.gates[0];
      if (g0 && g0.armed && Math.hypot(Player.pos.x - g0.x, Player.pos.z - g0.z) < 4.2) raceStartCountdown();
    }
    return;
  }
  if (RACE.phase === 'countdown') {
    if (!raceDriving() || raceLeftArea()) { resetRaceState(); return; }
    RACE.countT -= dt;
    const n = Math.ceil(RACE.countT);
    if (n !== RACE.lastN && n >= 1) {
      RACE.lastN = n;
      raceToast(n + '…');
      if (typeof Audio2 !== 'undefined') { if (Audio2.count) Audio2.count(); else Audio2.click(); }
    }
    raceCheckGates();
    if (RACE.countT <= 0) {
      RACE.phase = 'racing';
      RACE.raceTime = 0;
      raceToast(T('race.go'));
      if (typeof Audio2 !== 'undefined') Audio2.check();
    }
    updateRaceHud();
  } else if (RACE.phase === 'racing') {
    if (!raceDriving() || raceLeftArea()) { resetRaceState(); return; }
    RACE.raceTime += dt;
    raceCheckGates();
    updateRaceHud();
  } else if (RACE.phase === 'finished') {
    RACE.finishT -= dt;
    if (RACE.finishT <= 0 || !raceDriving()) resetRaceState();
    else updateRaceHud();
  }
}
