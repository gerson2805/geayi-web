/* concerts.js — 🎤 CONCIERTOS GEAYI en Ciudad Neón (GEAYI — Obby Xtreme 3D)
   Módulo global Concerts con init() / buildForLevel(i, group) / update(dt).
   100% ORIGINAL (diseños, letreros y música generada propios), todo a nivel
   del suelo, geometría simple con cachés compartidas (Android).

   Qué hace:
   - 🎤 Escenario permanente "ESCENARIO GEAYI" en Ciudad Neón (mundo idx 0),
     junto a la plaza central (0,0) sin tapar la fuente: tarima baja, arco de
     luces de colores que parpadean al ritmo, bocinas y pantallas.
   - 🎶 Conciertos periódicos: cada ~4 minutos empieza un show de ~60 s con
     banner "🎶 ¡CONCIERTO EN VIVO!"; una banda de 4 músicos (bloques
     originales con instrumentos) toca en el escenario.
   - 🎵 Música en vivo generada con osciladores (Audio2.tone/noise, tempo
     alegre 132 BPM, melodía original): arranca y para con el show; se corta
     sola si se sale al menú o se pausa (el secuenciador revisa MODE).
   - 👥 Público NPC (12 muñecos de bloques) que baila al ritmo frente al
     escenario; al terminar aplaude (brazos arriba) y se dispersa.

   Integración (NO modifica archivos existentes; el orquestador aplica los hooks):
     - index.html: <script src="concerts.js"></script> ANTES de game.js
     - game.js boot():        if (typeof Concerts !== 'undefined') Concerts.init();
     - game.js startLevel(i): tras LEVEL = buildLevel(i);
                              if (typeof Concerts !== 'undefined') Concerts.buildForLevel(i, LEVEL.group);
     - game.js loop (MODE==='play'): if (typeof Concerts !== 'undefined') Concerts.update(dt);
*/
'use strict';

/* ============================== i18n ============================== */
try {
  if (typeof addStrings === 'function') {
    addStrings('es', {
      'ct.stage': '🎤 ESCENARIO GEAYI',
      'ct.show': '🎶 ¡CONCIERTO EN VIVO!',
      'ct.showSub': 'La banda Geayi toca en vivo 🎸🥁🎹',
      'ct.end': '👏 ¡Gracias, Ciudad Neón!',
    });
    addStrings('en', {
      'ct.stage': '🎤 GEAYI STAGE',
      'ct.show': '🎶 LIVE CONCERT!',
      'ct.showSub': 'The Geayi band plays live 🎸🥁🎹',
      'ct.end': '👏 Thank you, Neon City!',
    });
  }
} catch (e) {}

function _ctT(k) { try { return T(k); } catch (e) { return k; } }
function _ctBanner(a, b, ms) {
  try { if (typeof showBanner === 'function') { showBanner(a, b, ms); return; } } catch (e) {}
  try { if (typeof toast === 'function') toast(a); } catch (e) {}
}

/* ============================== cachés (Android) ============================== */
const _ctGeoCache = {};
const _ctMatCache = {};
function _ctGeo(key, make) {
  let g = _ctGeoCache[key];
  if (!g) { g = make(); _ctGeoCache[key] = g; }
  return g;
}
function _ctMat(color, emissive, ei) {
  const key = color + '|' + (emissive || 0) + '|' + (ei || 0);
  let m = _ctMatCache[key];
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: color, roughness: 0.75, metalness: 0.08,
      emissive: emissive || 0x000000, emissiveIntensity: ei || 0,
    });
    _ctMatCache[key] = m;
  }
  return m;
}
const _CT_FLASH = [0xff2fd6, 0x00e5ff, 0xffe95e, 0x59d867, 0xff6f00, 0x7b2fff];
function _ctFlashMat(i) {
  const c = _CT_FLASH[((i % 6) + 6) % 6];
  return _ctMat(c, c, 1.6);
}
function _ctBox(parent, w, h, d, color, x, y, z, o) {
  o = o || {};
  const m = new THREE.Mesh(
    _ctGeo('b' + w + 'x' + h + 'x' + d, () => new THREE.BoxGeometry(w, h, d)),
    o.mat || _ctMat(color, o.emissive, o.ei));
  m.position.set(x, y, z);
  if (o.ry) m.rotation.y = o.ry;
  if (o.rx) m.rotation.x = o.rx;
  if (o.rz) m.rotation.z = o.rz;
  parent.add(m);
  return m;
}
function _ctCyl(parent, r1, r2, h, color, x, y, z, seg) {
  const m = new THREE.Mesh(
    _ctGeo('c' + r1 + 'x' + r2 + 'x' + h, () => new THREE.CylinderGeometry(r1, r2, h, seg || 10)),
    _ctMat(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function _ctBall(parent, r, x, y, z, mat) {
  const m = new THREE.Mesh(
    _ctGeo('s' + r, () => new THREE.SphereGeometry(r, 10, 10)),
    mat || _ctMat(0xffffff));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/* ============================== letreros ============================== */
function _ctSignTex(lines, bg, fg) {
  try {
    if (typeof canvasTex !== 'function') return null;
    return canvasTex(512, 256, function (g, w, h) {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
      g.textAlign = 'center'; g.fillStyle = fg;
      const n = lines.length;
      lines.forEach(function (ln, i) {
        g.font = '900 ' + (n > 1 && i === 0 ? 64 : 76) + 'px "Trebuchet MS", sans-serif';
        g.fillText(ln, w / 2, h / 2 - (n - 1) * 44 + i * 88 + 24);
      });
    });
  } catch (e) { return null; }
}
function _ctSignMesh(w, h, tex, x, y, z) {
  // letrero de doble cara mirando al público (cara -z); respaldo sin canvasTex
  try {
    if (tex && typeof doubleFaceSign === 'function') {
      const g = new THREE.Group();
      g.add(doubleFaceSign(w, h, tex, x, y, z, Math.PI));
      return g;
    }
  } catch (e) {}
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    _ctGeo('pl' + w + 'x' + h, () => new THREE.PlaneGeometry(w, h)),
    tex ? new THREE.MeshBasicMaterial({ map: tex }) : _ctMat(0x12081f, 0xff2fd6, 0.5));
  m.position.set(x, y, z); m.rotation.y = Math.PI; g.add(m);
  return g;
}
let _ctEQ = null;
function _ctEQTex() { // ecualizador pintado para las pantallas laterales
  if (_ctEQ) return _ctEQ;
  try {
    _ctEQ = canvasTex(256, 160, function (g, w, h) {
      g.fillStyle = '#0b0618'; g.fillRect(0, 0, w, h);
      const cols = _CT_FLASH;
      for (let i = 0; i < 12; i++) {
        const bh = 20 + Math.abs(Math.sin(i * 1.7)) * 100;
        g.fillStyle = cols[i % 6];
        g.fillRect(8 + i * 20, h - 10 - bh, 14, bh);
      }
      g.fillStyle = '#ffffff'; g.font = '900 26px "Trebuchet MS", sans-serif';
      g.textAlign = 'center'; g.fillText('♪ EN VIVO ♪', w / 2, 30);
    });
  } catch (e) { _ctEQ = null; }
  return _ctEQ;
}

/* ============================== estado ============================== */
const CT = {
  idx: -1, group: null, stage: null, stageGroup: null,
  stageLamps: [], stageFrames: [],
  next: 200, beatT: 0,
  show: null,              // {t, phase, g, band[], crowd[], wall}
  musicTimer: null, musicOn: false, step: 0,
};
const CT_STAGE = { x: 0, z: 20 };  // junto a la plaza (0,0), sin tapar la fuente (radio ~7)
const CT_SHOW_EVERY = 240;         // ~4 min entre shows
const CT_SHOW_LEN = 60;            // 60 s de show

/* ============================== música en vivo (original, generada) ============================== */
const _CT_BASS = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
const _CT_LEAD = [440, 523.25, 587.33, 659.25, 587.33, 523.25, 440, 392.00,
                  440, 523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 440];
function _ctBeat() {
  try {
    // seguridad: si se salió al menú o se pausó, la música se corta sola
    if (typeof MODE !== 'undefined' && MODE !== 'play') { _ctMusicStop(); return; }
    if (!CT.show || CT.show.phase !== 'play') { _ctMusicStop(); return; }
    if (typeof Audio2 === 'undefined' || !Audio2.ctx) return;
    const s = CT.step % 16;
    if (s % 4 === 0) Audio2.tone(120, 0.14, 'sine', 0.30, 0, 45);   // bombo
    if (s === 4 || s === 12) Audio2.noise(0.12, 0.15);               // redoblante
    if (s % 2 === 0) Audio2.tone(8200, 0.03, 'sine', 0.028);         // hi-hat
    Audio2.tone(_CT_BASS[(s >> 1) % 8], 0.20, 'triangle', 0.12);     // bajo
    if (s % 2 === 0) Audio2.tone(_CT_LEAD[s], 0.16, 'square', 0.042); // melodía
  } catch (e) {}
  CT.step++;
}
function _ctMusicStart() {
  try { if (typeof Audio2 !== 'undefined') Audio2.init(); } catch (e) {}
  if (CT.musicTimer != null) return;
  CT.step = 0; CT.musicOn = true;
  try { CT.musicTimer = setInterval(_ctBeat, 227); } catch (e) { CT.musicTimer = 0; } // 132 BPM (corcheas)
}
function _ctMusicStop() {
  try { if (CT.musicTimer != null && typeof clearInterval === 'function') clearInterval(CT.musicTimer); } catch (e) {}
  CT.musicTimer = null; CT.musicOn = false;
}

/* ============================== personajes (diseño propio) ============================== */
const _CT_SKINS = [0xf2c89b, 0xe8b07e, 0xc98a5a, 0x8a5a34];
const _CT_SHIRTS = [0xff2fd6, 0x00e5ff, 0xffe95e, 0x59d867, 0xff6f00, 0x7b2fff, 0xff5e5e, 0x4dd0e1];
function _ctPerson(shirt, skin) {
  const g = new THREE.Group();
  _ctCyl(g, 0.34, 0.4, 1.1, shirt, 0, 0.95, 0);                    // torso
  _ctBall(g, 0.3, 0, 1.85, 0, _ctMat(skin || 0xf2c89b));           // cabeza
  _ctCyl(g, 0.32, 0.32, 0.14, 0x2b2f3a, 0, 2.08, 0);               // gorra
  const armGeo = _ctGeo('arm', () => new THREE.BoxGeometry(0.22, 1.0, 0.22));
  function arm(sx) {
    const pivot = new THREE.Group(); pivot.position.set(sx * 0.5, 1.42, 0);
    const m = new THREE.Mesh(armGeo, _ctMat(shirt)); m.position.y = -0.45;
    pivot.add(m); g.add(pivot); return pivot;
  }
  return { g: g, armL: arm(-1), armR: arm(1) };
}
function _ctMusician(kind) { // músico de bloques con instrumento original
  const shirts = { singer: 0xff2fd6, guitar: 0x00e5ff, drums: 0xffe95e, keys: 0x59d867 };
  const p = _ctPerson(shirts[kind] || 0xffffff, _CT_SKINS[Math.floor(Math.random() * _CT_SKINS.length)]);
  const g = p.g;
  if (kind === 'singer') {                       // cantante con micrófono
    _ctCyl(g, 0.06, 0.08, 1.7, 0x2b2f3a, 0.35, 0.85, -0.7);
    _ctBall(g, 0.15, 0.35, 1.78, -0.7, _ctMat(0xc0c6d4));
  } else if (kind === 'guitar') {                // guitarrista
    _ctBox(g, 0.55, 0.75, 0.28, 0xc23b2e, 0.1, 1.0, -0.55, { rz: 0.25 });
    _ctBox(g, 0.12, 1.2, 0.12, 0x5a3a1e, 0.5, 1.5, -0.55, { rz: -0.6 });
  } else if (kind === 'drums') {                 // baterista
    _ctCyl(g, 0.45, 0.45, 0.5, 0xc23b2e, -0.5, 0.25, -0.95);
    _ctCyl(g, 0.35, 0.35, 0.45, 0x00a2ff, 0.5, 0.22, -0.95);
    _ctBox(g, 0.07, 0.07, 0.9, 0xd9c9a8, -0.3, 1.15, -0.8, { rx: 0.5 });
    _ctBox(g, 0.07, 0.07, 0.9, 0xd9c9a8, 0.3, 1.15, -0.8, { rx: 0.5 });
  } else if (kind === 'keys') {                  // tecladista
    _ctBox(g, 1.5, 0.16, 0.55, 0xf2f2f2, 0, 0.95, -0.85);
    for (let k = 0; k < 5; k++) _ctBox(g, 0.14, 0.05, 0.3, 0x222222, -0.5 + k * 0.25, 1.05, -0.85);
    _ctBox(g, 0.12, 0.9, 0.12, 0x2b2f3a, -0.6, 0.45, -0.85);
    _ctBox(g, 0.12, 0.9, 0.12, 0x2b2f3a, 0.6, 0.45, -0.85);
  }
  return p;
}

/* ============================== escenario permanente ============================== */
function _ctBuildStage(group) {
  const st = new THREE.Group();
  st.position.set(CT_STAGE.x, 0, CT_STAGE.z);
  // tarima baja (1.2 m, todo a nivel del suelo: no hay que saltar)
  _ctBox(st, 16, 1.2, 6, 0x3a2b52, 0, 0.6, 0);
  _ctBox(st, 16.4, 0.16, 6.4, 0xff2fd6, 0, 1.26, 0, { emissive: 0xff2fd6, ei: 1 });
  // pared trasera + letrero
  _ctBox(st, 16, 4.4, 0.4, 0x1d1430, 0, 3.4, 2.85);
  st.add(_ctSignMesh(12, 2.6, _ctSignTex(['🎤', 'ESCENARIO GEAYI'], '#12081f', '#ff2fd6'), 0, 3.6, 2.6));
  // arco de luces sobre el escenario
  _ctCyl(st, 0.18, 0.22, 5.6, 0x8a8f9a, -7.2, 2.8, -1.5);
  _ctCyl(st, 0.18, 0.22, 5.6, 0x8a8f9a, 7.2, 2.8, -1.5);
  _ctBox(st, 15.2, 0.5, 0.5, 0x23233a, 0, 5.7, -1.5);
  for (let i = 0; i < 7; i++) CT.stageLamps.push(_ctBall(st, 0.3, -6 + i * 2, 5.35, -1.5, _ctFlashMat(i)));
  // torres de luces laterales
  [-9.6, 9.6].forEach(function (tx, ti) {
    _ctCyl(st, 0.16, 0.2, 5, 0x8a8f9a, tx, 2.5, -2.5);
    _ctBox(st, 1.7, 0.6, 0.6, 0x23233a, tx, 5.2, -2.5);
    for (let k = 0; k < 3; k++)
      CT.stageLamps.push(_ctBall(st, 0.26, tx - 0.5 + k * 0.5, 5.2, -2.15, _ctFlashMat(ti * 3 + k)));
  });
  // bocinas (stacks dobles con conos)
  [-8.8, 8.8].forEach(function (sx) {
    _ctBox(st, 1.7, 1.1, 1.5, 0x14141f, sx, 0.55, 0.5);
    _ctBox(st, 1.7, 1.1, 1.5, 0x14141f, sx, 1.68, 0.5);
    [0.55, 1.68].forEach(function (sy) {
      const wfr = new THREE.Mesh(_ctGeo('wf', () => new THREE.CircleGeometry(0.38, 12)), _ctMat(0x3a3f52));
      wfr.position.set(sx, sy, -0.26); wfr.rotation.y = Math.PI; st.add(wfr);
    });
  });
  // pantallas laterales con marco que parpadea
  [-11.8, 11.8].forEach(function (sx, si) {
    _ctBox(st, 0.3, 3.4, 0.3, 0x4a4f5a, sx, 1.7, -2);
    CT.stageFrames.push(_ctBox(st, 4.7, 3.1, 0.18, 0x7b2fff, sx, 3.6, -1.9, { emissive: 0x7b2fff, ei: 1.2 }));
    const scr = new THREE.Mesh(
      _ctGeo('scr', () => new THREE.PlaneGeometry(4.4, 2.8)),
      new THREE.MeshBasicMaterial({ map: _ctEQTex() }));
    scr.position.set(sx, 3.6, -1.79); scr.rotation.y = Math.PI; st.add(scr);
  });
  group.add(st);
  CT.stage = st;
  CT.stageGroup = group;
}

/* ============================== show ============================== */
function _ctStartShow() {
  if (CT.idx !== 0 || !CT.stage || !CT.group || CT.show) return false;
  const g = new THREE.Group();
  const band = [], crowd = [];
  // banda: 4 músicos sobre la tarima
  const kinds = ['singer', 'guitar', 'drums', 'keys'];
  const bx = [-4.8, -1.6, 1.6, 4.8];
  for (let i = 0; i < 4; i++) {
    const m = _ctMusician(kinds[i]);
    m.g.position.set(bx[i], 1.2, CT_STAGE.z + 0.2);
    g.add(m.g);
    band.push({ g: m.g, phase: Math.random() * 6.28, y0: 1.2 });
  }
  // público: 12 NPC frente al escenario, a nivel del suelo
  const rows = [12.4, 14.2, 16.0], xs = [-4.6, -1.55, 1.55, 4.6];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const p = _ctPerson(_CT_SHIRTS[(r * 4 + c) % _CT_SHIRTS.length],
      _CT_SKINS[Math.floor(Math.random() * _CT_SKINS.length)]);
    const jx = (Math.random() - 0.5) * 0.5, jz = (Math.random() - 0.5) * 0.5;
    p.g.position.set(xs[c] + jx, 0, rows[r] + jz);
    g.add(p.g);
    crowd.push({ g: p.g, armL: p.armL, armR: p.armR, phase: Math.random() * 6.28,
      x0: p.g.position.x, z0: p.g.position.z, y0: 0, dir: null });
  }
  CT.group.add(g);
  CT.show = { t: CT_SHOW_LEN, phase: 'play', g: g, band: band, crowd: crowd, wall: Date.now() };
  _ctBanner(_ctT('ct.show'), _ctT('ct.showSub'), 5000);
  _ctMusicStart();
  return true;
}
function _ctClearShow() {
  try {
    _ctMusicStop();
    if (CT.show && CT.show.g) {
      const p = CT.show.g.parent || CT.group; // parent puede no existir en stubs de prueba
      if (p) p.remove(CT.show.g);
    }
  } catch (e) {}
  CT.show = null;
}
function _ctDanceCrowd() {
  const s = CT.show; if (!s) return;
  const w = CT.beatT * 13.8; // ~2.2 Hz = tempo 132 BPM
  s.crowd.forEach(function (c) {
    const p = c.phase;
    c.g.position.y = c.y0 + Math.abs(Math.sin(w + p)) * 0.3;  // saltito al ritmo
    c.g.rotation.z = Math.sin(w * 0.5 + p) * 0.14;             // balanceo
    c.armL.rotation.x = Math.sin(w + p) * 0.7;                // brazos al aire
    c.armR.rotation.x = Math.sin(w + p + Math.PI) * 0.7;
    c.armL.rotation.z = 0; c.armR.rotation.z = 0;
  });
}
function _ctDanceBand() {
  const s = CT.show; if (!s) return;
  const w = CT.beatT * 13.8;
  s.band.forEach(function (b) {
    b.g.position.y = b.y0 + Math.abs(Math.sin(w + b.phase)) * 0.22;
    b.g.rotation.z = Math.sin(w * 0.5 + b.phase) * 0.08;
  });
}
function _ctApplaud() { // aplauso: brazos arriba y palmas rápidas
  const s = CT.show; if (!s) return;
  const w = CT.beatT * 22;
  s.crowd.forEach(function (c) {
    const clap = Math.sin(w + c.phase) * 0.3;
    c.armL.rotation.z = -2.4 + clap; c.armR.rotation.z = 2.4 - clap;
    c.armL.rotation.x = 0; c.armR.rotation.x = 0;
    c.g.position.y = c.y0 + Math.abs(Math.sin(CT.beatT * 9 + c.phase)) * 0.12;
    c.g.rotation.z = 0;
  });
  s.band.forEach(function (b) { b.g.position.y = b.y0; b.g.rotation.z = 0; });
}
function _ctLeave(dt) { // el público se dispersa caminando
  const s = CT.show; if (!s) return;
  s.crowd.forEach(function (c) {
    if (!c.dir) {
      const dx = c.x0 - CT_STAGE.x, dz = c.z0 - (CT_STAGE.z - 3);
      const l = Math.hypot(dx, dz) || 1;
      c.dir = { x: dx / l, z: dz / l };
    }
    c.g.position.x += c.dir.x * 2.4 * dt;
    c.g.position.z += c.dir.z * 2.4 * dt;
    c.g.position.y = c.y0 + Math.abs(Math.sin(CT.beatT * 8 + c.phase)) * 0.1;
  });
}
function _ctFlash() { // luces de colores parpadeando al ritmo
  const rate = (CT.show && CT.show.phase === 'play') ? 4.4 : 1.1;
  const f = Math.floor(CT.beatT * rate);
  for (let i = 0; i < CT.stageLamps.length; i++) CT.stageLamps[i].material = _ctFlashMat(f + i * 2);
  for (let i = 0; i < CT.stageFrames.length; i++) CT.stageFrames[i].material = _ctFlashMat(f + i * 3 + 1);
}

/* ============================== módulo público ============================== */
const Concerts = {
  init: function () {
    try { CT.next = 200 + Math.random() * 60; } catch (e) {}
  },
  buildForLevel: function (i, group) {
    try {
      _ctClearShow();
      CT.idx = (typeof i === 'number') ? i : -1;
      CT.group = group || null;
      CT.next = 200 + Math.random() * 60;
      CT.stageLamps = []; CT.stageFrames = [];
      if (CT.stage) {
        try { if (CT.stageGroup) CT.stageGroup.remove(CT.stage); } catch (e) {}
        CT.stage = null; CT.stageGroup = null;
      }
      if (CT.idx === 0 && group) _ctBuildStage(group); // solo en Ciudad Neón
    } catch (e) {}
  },
  onLevelEnd: function () {
    try { _ctClearShow(); CT.idx = -1; } catch (e) {}
  },
  update: function (dt) {
    try {
      if (typeof MODE !== 'undefined' && MODE !== 'play') { _ctMusicStop(); return; }
      if (CT.idx !== 0 || !CT.stage) { if (CT.show) _ctClearShow(); return; }
      CT.beatT += dt;
      _ctFlash();
      if (!CT.show) {
        CT.next -= dt;
        if (CT.next <= 0) _ctStartShow(); // 🎶 ¡CONCIERTO EN VIVO!
        return;
      }
      const s = CT.show;
      if (Date.now() - s.wall > 120000) { _ctClearShow(); CT.next = CT_SHOW_EVERY; return; } // seguridad
      s.t -= dt;
      if (s.phase === 'play') {
        _ctDanceCrowd(); _ctDanceBand();
        if (s.t <= 0) {
          s.phase = 'applause'; s.t = 3;
          _ctMusicStop();
          _ctBanner(_ctT('ct.end'), '👏👏👏', 3000);
        }
      } else if (s.phase === 'applause') {
        _ctApplaud();
        if (s.t <= 0) { s.phase = 'leave'; s.t = 4; }
      } else if (s.phase === 'leave') {
        _ctLeave(dt);
        if (s.t <= 0) { _ctClearShow(); CT.next = CT_SHOW_EVERY + Math.random() * 60; }
      }
    } catch (e) {}
  },
  startShow: function () { try { return _ctStartShow(); } catch (e) { return false; } },
  stopShow: function () { try { if (CT.show) CT.show.t = Math.min(CT.show.t, 0.01); } catch (e) {} },
  get stage() { return CT.stage; },
  get show() { return CT.show; },
  get musicOn() { return CT.musicOn; },
  get idx() { return CT.idx; },
};

if (typeof window !== 'undefined') {
  window.Concerts = Concerts;
}
