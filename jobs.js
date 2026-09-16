/* jobs.js — 🧰 TRABAJOS en Immokalee (mundo idx 3)
   4 trabajos, diseño 100% original, todo a nivel del suelo:
     🌱 JARDINERÍA   — cortacésped GEAYI manejable; corta 12 parches de pasto alto (+5 🪙 c/u)
     🎨 PINTURA      — brocha mágica; pinta casas del pueblo de colores vivos (+8 🪙 c/u)
     🏗️ CONSTRUCCIÓN — levanta 6 paredes fantasma en la obra (+10 🪙 c/u, +25 de bono)
     🍔 COCINERO     — atiende la ventana de la traila "LOS HERMANOS TAMPS":
                       arma hamburguesas por pasos y sírvelas a los clientes
                       (+12 🪙 c/u, propina hasta +8 según rapidez)
   Solo funcionan en Immokalee. API:
     openJobsPanel() / closeJobsPanel() — panel desde el botón lateral 🧰
     startJob(id) / stopJob(silent)     — empezar / terminar
     updateJobs(dt)                     — llamado desde el loop de game.js
*/
'use strict';

/* ---------------- i18n ---------------- */
try {
  if (typeof addStrings === 'function') {
    addStrings('es', {
      'job.title': 'TRABAJOS', 'job.goImm': '📍 Los trabajos están en Immokalee 🌴',
      'job.travel': 'IR A IMMOKALEE', 'job.start': 'EMPEZAR', 'job.stop': 'TERMINAR TRABAJO',
      'job.close': 'Cerrar', 'job.working': 'trabajo en curso…', 'job.done': '🧰 Trabajo terminado',
      'job.brush': 'Brocha mágica', 'job.paintBtn': 'PINTAR', 'job.blockBtn': 'PONER BLOQUE',
      'job.hintGarden': '🌱 ¡Súbete a la cortacésped! (botón SUBIR)',
      'job.getOff': '⬇️ Bájate primero del vehículo', 'job.started': '🧰 ¡A trabajar!',
      'job.builtAll': '🏗️ ¡Obra completa! +25 🪙',
      'job.n.garden': 'Jardinería', 'job.d.garden': 'Maneja la cortacésped GEAYI y corta el pasto alto: +5 🪙 por parche',
      'job.n.paint': 'Pintura', 'job.d.paint': 'Pinta las casas del pueblo de colores vivos: +8 🪙 por casa',
      'job.n.build': 'Construcción', 'job.d.build': 'Levanta las 6 paredes de la obra: +10 🪙 por pared (+25 de bono)',
      'job.n.tamps': 'Cocinero · Los Hermanos Tamps',
      'job.d.tamps': 'Atiende la ventana de la traila: arma hamburguesas por pasos y sírvelas: +12 🪙 (+8 de propina)',
      'job.farTamps': '🍔 Acércate a la ventana de Los Hermanos Tamps',
      'job.tampsHint': '🍔 Arma hamburguesas con los botones y sírvelas con el botón 🍔 SERVIR',
      'job.step': 'Paso', 'job.addNow': 'agrega',
      'job.badPick': '❌ ¡Ese no! Toca el ingrediente del paso',
      'job.burgerReady': '🍔 ¡Hamburguesa lista!',
      'job.serve': 'SERVIR', 'job.tip': 'propina',
      'job.needBurgers': '🍔 Te faltan {n}: arma más hamburguesas',
      'job.trayFull': '🍔 Bandeja llena: ¡sirve ya!',
      'job.leftAngry': '😠 Un cliente se fue molesto…',
    });
    addStrings('en', {
      'job.title': 'JOBS', 'job.goImm': '📍 Jobs are in Immokalee 🌴',
      'job.travel': 'GO TO IMMOKALEE', 'job.start': 'START', 'job.stop': 'QUIT JOB',
      'job.close': 'Close', 'job.working': 'job in progress…', 'job.done': '🧰 Job finished',
      'job.brush': 'Magic brush', 'job.paintBtn': 'PAINT', 'job.blockBtn': 'LAY BRICK',
      'job.hintGarden': '🌱 Hop on the mower! (SUBIR button)',
      'job.getOff': '⬇️ Get off the vehicle first', 'job.started': '🧰 Let\'s work!',
      'job.builtAll': '🏗️ Site complete! +25 🪙',
      'job.n.garden': 'Gardening', 'job.d.garden': 'Drive the GEAYI mower and cut tall grass: +5 🪙 per patch',
      'job.n.paint': 'Painting', 'job.d.paint': 'Paint town houses in bright colors: +8 🪙 per house',
      'job.n.build': 'Construction', 'job.d.build': 'Raise the 6 ghost walls at the site: +10 🪙 per wall (+25 bonus)',
      'job.n.tamps': 'Cook · Los Hermanos Tamps',
      'job.d.tamps': 'Work the food-truck window: build burgers step by step and serve them: +12 🪙 (+8 tip)',
      'job.farTamps': '🍔 Get closer to the Los Hermanos Tamps window',
      'job.tampsHint': '🍔 Build burgers with the buttons and serve them with the 🍔 SERVE button',
      'job.step': 'Step', 'job.addNow': 'add',
      'job.badPick': '❌ Not that one! Tap the step ingredient',
      'job.burgerReady': '🍔 Burger ready!',
      'job.serve': 'SERVE', 'job.tip': 'tip',
      'job.needBurgers': '🍔 You need {n} more: build more burgers',
      'job.trayFull': '🍔 Tray is full: serve now!',
      'job.leftAngry': '😠 A customer left upset…',
    });
  }
} catch (e) {}

const JOBS = [
  { id: 'garden', emoji: '🌱', pay: 5, nameKey: 'job.n.garden', descKey: 'job.d.garden' },
  { id: 'paint',  emoji: '🎨', pay: 8, nameKey: 'job.n.paint',  descKey: 'job.d.paint' },
  { id: 'build',  emoji: '🏗️', pay: 10, nameKey: 'job.n.build', descKey: 'job.d.build' },
  { id: 'tamps',  emoji: '🍔', pay: 12, nameKey: 'job.n.tamps', descKey: 'job.d.tamps' },
];

/* ---------------- estado ---------------- */
const JB = {
  active: null,          // 'garden' | 'paint' | 'build' | null
  group: null,           // grupo 3D del trabajo activo
  mower: null,           // def de lvl.cars de la cortacésped
  patches: [],           // 🌱 parches de pasto
  ghosts: [],            // 🏗️ paredes fantasma
  builtCount: 0,         // 🏗️ paredes levantadas
  paintTarget: null,     // 🎨 casa cercana
  buildTarget: null,     // 🏗️ fantasma cercano
  actionFor: null,       // 'paint' | 'build' | 'serve' | null (botón de acción visible)
  ui: false, btn: null, chip: null, panel: null,
  tamps: null,           // 🍔 estado del trabajo de cocinero
};

function _jobT(key) { try { return T(key); } catch (e) { return key; } }
function _inImmokalee() { return (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx === 3); }
function _now() { try { return performance.now() / 1000; } catch (e) { return Date.now() / 1000; } }
function _d2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
function _jobName(id) { const j = JOBS.find(x => x.id === id); return j ? _jobT(j.nameKey) : id; }
function _jobDesc(id) { const j = JOBS.find(x => x.id === id); return j ? _jobT(j.descKey) : ''; }
function _jobEmoji(id) { const j = JOBS.find(x => x.id === id); return j ? j.emoji : '🧰'; }

function _earn(n) {
  try {
    // Pase VIP 2x: si la tienda está cargada, Shop2.addCoins ya aplica el
    // multiplicador; si no (p. ej. en pruebas), suma directa como antes.
    if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.addCoins === 'function') {
      Shop2.addCoins(n);
    } else {
      SAVE.coins += n; persist();
    }
    const h = $('hud-coins'); if (h) h.textContent = SAVE.coins;
  } catch (e) {}
}
function _sfxCoin() {
  try { if (typeof Audio2 !== 'undefined' && Audio2.coin) Audio2.coin(); } catch (e) {}
}
function _burst(x, y, z, colors, n, power) {
  try {
    if (typeof Particles !== 'undefined' && Particles.burst) Particles.burst(x, y, z, colors, n, power);
  } catch (e) {}
}
function _toast(msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) {} }

/* ---------------- UI: botón de acción + chip ---------------- */
function _ensureUI() {
  if (JB.ui) return;
  JB.ui = true;
  try {
    const btn = document.createElement('button');
    btn.id = 'job-action-btn';
    btn.style.cssText = 'position:fixed;right:14px;bottom:252px;z-index:40;display:none;' +
      'font-size:20px;font-weight:900;padding:14px 20px;border-radius:999px;border:4px solid #fff;' +
      'background:linear-gradient(180deg,#b14dff,#7b2fff);color:#fff;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.45);font-family:inherit;';
    btn.addEventListener('click', function () { _jobAction(); });
    document.body.appendChild(btn);
    JB.btn = btn;

    const chip = document.createElement('div');
    chip.id = 'job-chip';
    chip.style.cssText = 'position:fixed;top:56px;right:10px;z-index:16;display:none;' +
      'font-size:15px;font-weight:800;background:rgba(20,10,40,.6);color:#fff;' +
      'padding:6px 12px;border-radius:999px;border:2px solid rgba(255,255,255,.7);font-family:inherit;';
    document.body.appendChild(chip);
    JB.chip = chip;
  } catch (e) {}
}
function _setActionBtn(label, visible, forWhat) {
  JB.actionFor = visible ? (forWhat || null) : null;
  if (!JB.btn) return;
  JB.btn.style.display = visible ? '' : 'none';
  if (visible && label) JB.btn.textContent = label;
}
function _setChip(label, visible) {
  if (!JB.chip) return;
  JB.chip.style.display = visible ? '' : 'none';
  if (visible && label) JB.chip.textContent = label;
}

/* ---------------- panel de trabajos ---------------- */
function _ensurePanel() {
  if (JB.panel) return;
  try {
    const p = document.createElement('div');
    p.id = 'job-panel';
    p.className = 'screen overlay hidden';
    document.body.appendChild(p);
    JB.panel = p;
  } catch (e) {}
}
function _renderPanel() {
  _ensurePanel();
  if (!JB.panel) return;
  const inImm = _inImmokalee();
  let html = '<div class="panel" style="max-width:430px;width:100%">' +
    '<h2>🧰 ' + _jobT('job.title') + '</h2>';
  if (!inImm) html += '<div class="job-note">' + _jobT('job.goImm') + '</div>';
  if (JB.active) {
    html += '<div class="job-active">' + _jobEmoji(JB.active) + ' <b>' + _jobName(JB.active) +
      '</b><br><span>' + _jobT('job.working') + '</span></div>' +
      '<div class="menu-buttons"><button class="btn btn-big" data-act="stop">🛑 ' + _jobT('job.stop') + '</button>' +
      '<button class="btn" data-act="close">✕ ' + _jobT('job.close') + '</button></div>';
  } else {
    JOBS.forEach(function (j) {
      html += '<div class="job-card"><div class="job-emoji">' + j.emoji + '</div>' +
        '<div class="job-info"><div class="job-name">' + _jobT(j.nameKey) + '</div>' +
        '<div class="job-desc">' + _jobT(j.descKey) + '</div></div>' +
        '<button class="btn job-go" data-go="' + j.id + '">' +
        (inImm ? '▶ ' + _jobT('job.start') : '🌴 ' + _jobT('job.travel')) + '</button></div>';
    });
    html += '<div class="menu-buttons"><button class="btn" data-act="close">✕ ' + _jobT('job.close') + '</button></div>';
  }
  html += '</div>';
  JB.panel.innerHTML = html;
  Array.prototype.forEach.call(JB.panel.querySelectorAll('[data-go]'), function (b) {
    b.addEventListener('click', function () { _startOrTravel(b.getAttribute('data-go')); });
  });
  Array.prototype.forEach.call(JB.panel.querySelectorAll('[data-act]'), function (b) {
    b.addEventListener('click', function () {
      const a = b.getAttribute('data-act');
      try { if (typeof Audio2 !== 'undefined') Audio2.click(); } catch (e) {}
      if (a === 'stop') { closeJobsPanel(); stopJob(false); }
      else closeJobsPanel();
    });
  });
}
function openJobsPanel() {
  try { if (typeof Audio2 !== 'undefined') Audio2.click(); } catch (e) {}
  _ensureUI();
  _renderPanel();
  if (JB.panel) JB.panel.classList.remove('hidden');
}
function closeJobsPanel() { if (JB.panel) JB.panel.classList.add('hidden'); }
function _startOrTravel(id) {
  closeJobsPanel();
  if (!_inImmokalee()) {
    _toast(_jobT('job.goImm'));
    if (typeof startLevel === 'function') startLevel(3); // 🌴 viajar a Immokalee
    return;
  }
  startJob(id);
}

/* ---------------- empezar / terminar ---------------- */
function startJob(id) {
  if (JB.active) stopJob(true);
  if (typeof MODE !== 'undefined' && MODE !== 'play') return false;
  if (!_inImmokalee()) { _toast(_jobT('job.goImm')); return false; }
  if (typeof Vehicle !== 'undefined' && Vehicle.mode !== 'none') { _toast(_jobT('job.getOff')); return false; }
  if (id === 'garden') _startGarden();
  else if (id === 'paint') _startPaint();
  else if (id === 'build') _startBuild();
  else if (id === 'tamps') _startTamps();
  else return false;
  if (!JB.active) return false;
  _ensureUI();
  _toast(_jobT('job.started'));
  return true;
}
function stopJob(silent) {
  if (!JB.active) return;
  try {
    // bajar de la cortacésped si el jugador estaba subido
    if (JB.mower && typeof Vehicle !== 'undefined' && Vehicle.def === JB.mower && Vehicle.mode !== 'none') {
      if (typeof exitVehicle === 'function') exitVehicle();
    }
    _removeMower();
    _stopTampsUI(); // 🍔 oculta la cocina táctil
    // el grupo se retira de la escena; las geometrías/materiales son caché
    // compartida (no se liberan) y clearLevel() limpia todo al cambiar de mundo
    if (JB.group && JB.group.parent) JB.group.parent.remove(JB.group);
  } catch (e) {}
  JB.active = null; JB.group = null; JB.mower = null;
  JB.patches = []; JB.ghosts = []; JB.builtCount = 0;
  JB.paintTarget = null; JB.buildTarget = null; JB.tamps = null;
  _setActionBtn('', false);
  _setChip('', false);
  if (!silent) _toast(_jobT('job.done'));
}
function _removeMower() {
  try {
    const lvl = (typeof LEVEL !== 'undefined') ? LEVEL : null;
    if (JB.mower && lvl && lvl.cars) {
      const i = lvl.cars.indexOf(JB.mower);
      if (i >= 0) lvl.cars.splice(i, 1);
      if (JB.mower.mesh && JB.mower.mesh.parent) JB.mower.mesh.parent.remove(JB.mower.mesh);
      // si el prompt de vehículo apuntaba a la cortacésped, limpiarlo (ya no existe)
      if (typeof Vehicle !== 'undefined' && Vehicle.near && Vehicle.near.def === JB.mower) Vehicle.near = null;
    }
  } catch (e) {}
  JB.mower = null;
}

/* ================= 🌱 JARDINERÍA =================
   12 parches de pasto alto en el jardín (zona de pasto al oeste del centro).
   La cortacésped aparece cerca del jugador; al pasar sobre un parche (< 3 m)
   se corta: +5 🪙, partículas verdes, y rebrota a los 60 s. */
const GARDEN_CX = 30, GARDEN_CZ = 118; // jardín GEAYI (pasto abierto, sin construcciones)
function _gardenSpots() {
  const spots = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++)
    spots.push([GARDEN_CX + (c - 1.5) * 6.5, GARDEN_CZ + (r - 1) * 6.5]);
  return spots;
}
let _patchTallG = null, _patchTallM = null, _patchShortG = null, _patchShortM = null;
function _patchCache() {
  if (!_patchTallG) {
    _patchTallG = new THREE.ConeGeometry(0.32, 1.35, 6);
    _patchTallM = new THREE.MeshStandardMaterial({ color: 0x2fd65e, roughness: 1 });
    _patchShortG = new THREE.ConeGeometry(0.55, 0.3, 8);
    _patchShortM = new THREE.MeshStandardMaterial({ color: 0x1e9e4a, roughness: 1 });
  }
}
function _makePatch(x, z) {
  _patchCache();
  const p = new THREE.Group();
  const tall = new THREE.Group();
  for (let i = 0; i < 5; i++) { // mechones altos de pasto
    const blade = new THREE.Mesh(_patchTallG, _patchTallM);
    const a = (i / 5) * Math.PI * 2;
    blade.position.set(Math.cos(a) * 0.5, 0.6, Math.sin(a) * 0.5);
    blade.rotation.z = (Math.random() - 0.5) * 0.35;
    tall.add(blade);
  }
  const short = new THREE.Mesh(_patchShortG, _patchShortM);
  short.position.y = 0.12; short.visible = false;
  p.add(tall); p.add(short);
  p.position.set(x, 0.02, z);
  p.userData = { cut: false, regrowT: 0, tall: tall, short: short };
  return p;
}
function _gardenSignTex() {
  return canvasTex(512, 256, function (g, w, h) {
    g.fillStyle = '#1e8e3e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.lineWidth = 12; g.strokeRect(8, 8, w - 16, h - 16);
    g.textAlign = 'center';
    g.fillStyle = '#ffffff'; g.font = '900 84px "Trebuchet MS", sans-serif';
    g.fillText('🌱 JARDÍN', w / 2, h / 2 + 10);
    g.fillStyle = '#ffe95e'; g.font = '700 44px "Trebuchet MS", sans-serif';
    g.fillText('★ GEAYI ★', w / 2, h / 2 + 70);
  });
}
function _startGarden() {
  _ensureUI();
  const lvl = LEVEL;
  // cortacésped cerca del jugador
  let px = Player.pos.x + 3.5, pz = Player.pos.z, py = Player.pos.y;
  try {
    if (typeof findGroundBelow === 'function') {
      const g0 = findGroundBelow(px, pz, Player.pos.y + 2);
      if (g0 != null) py = g0;
    }
  } catch (e) {}
  addVehicle(lvl, 'geayi-mower', px, py, pz, 0x35c759, true, (Player.heading || 0));
  const def = lvl.cars.find(function (c) { return c.vtype === 'geayi-mower' && !c.jobMower; });
  if (!def) return; // no se pudo crear: no activar el trabajo
  def.jobMower = true;
  JB.mower = def;
  // parches + letrero del jardín
  const grp = new THREE.Group();
  JB.patches = [];
  _gardenSpots().forEach(function (s) {
    const p = _makePatch(s[0], s[1]);
    grp.add(p); JB.patches.push(p);
  });
  try {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x5e3717, roughness: 0.9 }));
    pole.position.set(GARDEN_CX - 14, 1.3, GARDEN_CZ - 8); grp.add(pole);
    grp.add(doubleFaceSign(7, 2.4, _gardenSignTex(), GARDEN_CX - 14, 3.4, GARDEN_CZ - 8, 0.5));
  } catch (e) {}
  lvl.group.add(grp);
  JB.group = grp;
  JB.active = 'garden';
  _setChip('🌱 ' + _jobT('job.n.garden'), true);
  _toast(_jobT('job.hintGarden'));
}
function _cutPatch(p) {
  p.userData.cut = true;
  p.userData.regrowT = 60; // rebrota en 60 s
  p.userData.tall.visible = false;
  p.userData.short.visible = true;
  _earn(5);
  _burst(p.position.x, 1, p.position.z, [0x2fd65e, 0x9dff6e, 0xffffff], 14, 5);
  _sfxCoin();
  _toast('🌱 +5 🪙');
}
function _updateGarden(dt) {
  // cortar: solo mientras se maneja la cortacésped
  const riding = (typeof Vehicle !== 'undefined' && Vehicle.mode === 'car' &&
    Vehicle.def && Vehicle.def === JB.mower && JB.mower.mesh);
  if (riding) {
    const mp = JB.mower.mesh.position;
    for (const p of JB.patches) {
      if (p.userData.cut) continue;
      if (_d2(mp.x, mp.z, p.position.x, p.position.z) < 9) _cutPatch(p); // < 3 m
    }
  }
  // rebrote
  for (const p of JB.patches) {
    if (!p.userData.cut) continue;
    p.userData.regrowT -= dt;
    if (p.userData.regrowT <= 0) {
      p.userData.cut = false;
      p.userData.tall.visible = true;
      p.userData.short.visible = false;
    }
  }
}

/* ================= 🎨 PINTURA =================
   Con la "brocha mágica" (indicador en el HUD), cerca de una casa (< 6 m)
   aparece el botón 🎨 PINTAR: la casa cambia a un color vivo aleatorio
   (paleta caramelo/neón), +8 🪙. Cada casa tiene cooldown de 120 s. */
const PAINT_PALETTE = [0xff2fd6, 0x00e5ff, 0xffe95e, 0x59d867, 0xff6f00, 0x7b2fff, 0xff1744, 0x35c759];
const PAINT_COOLDOWN = 120;
function _startPaint() {
  _ensureUI();
  JB.active = 'paint';
  _setChip('🎨 ' + _jobT('job.brush'), true);
}
function _paintHouse(h) {
  const c = PAINT_PALETTE[(Math.random() * PAINT_PALETTE.length) | 0];
  try {
    // material propio (no el compartido por color): solo esta casa cambia
    const nm = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0.02 });
    (h.wallMeshes || [h.walls]).forEach(m => { if (m) m.material = nm; });
  } catch (e) {}
  h.paintCd = _now() + PAINT_COOLDOWN;
  _earn(8);
  _burst(h.x, 2.2, h.z, [c, 0xffffff, 0xffe95e], 20, 6);
  _sfxCoin();
  _toast('🎨 +8 🪙');
  JB.paintTarget = null;
  _setActionBtn('', false);
}
function _onFoot() {
  if (typeof MODE !== 'undefined' && MODE !== 'play') return false;
  if (typeof Vehicle !== 'undefined') {
    if (Vehicle.mode !== 'none') return false;
    if (Vehicle.near) return false; // no pelear con el botón SUBIR
  }
  return true;
}
function _updatePaint(dt) {
  JB.paintTarget = null;
  if (!_onFoot() || typeof Player === 'undefined' || !Player.pos) { _setActionBtn('', false); return; }
  const houses = (LEVEL && LEVEL.houses) || [];
  const now = _now();
  let best = null, bd = 36; // 6 m
  for (const h of houses) {
    if (h.paintCd && h.paintCd > now) continue;
    const d2 = _d2(Player.pos.x, Player.pos.z, h.x, h.z);
    if (d2 < bd) { bd = d2; best = h; }
  }
  JB.paintTarget = best;
  if (best) _setActionBtn('🎨 ' + _jobT('job.paintBtn'), true, 'paint');
  else _setActionBtn('', false);
}

/* ================= 🏗️ CONSTRUCCIÓN =================
   Obra en un lote vacío (todo a nivel del suelo): letrero 🚧 CONSTRUCCIÓN,
   conos naranjas y andamios. 6 "fantasmas" de pared semitransparentes;
   cerca de uno (< 4 m) aparece 🧱 PONER BLOQUE: se vuelve pared sólida
   de color, +10 🪙. Al completar las 6: bono +25 y confeti. */
const BUILD_CX = 60, BUILD_CZ = 140; // lote vacío al sureste del centro
let _ghostG = null, _ghostM = null;
const _solidMats = {};
function _buildCache() {
  if (!_ghostG) {
    _ghostG = new THREE.BoxGeometry(1, 1, 1);
    _ghostM = new THREE.MeshStandardMaterial({
      color: 0xff9e2c, transparent: true, opacity: 0.45, roughness: 0.6, depthWrite: false,
    });
  }
}
function _solidMat(color) {
  if (!_solidMats[color])
    _solidMats[color] = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8, metalness: 0.02 });
  return _solidMats[color];
}
function _buildSignTex() {
  return canvasTex(512, 256, function (g, w, h) {
    g.fillStyle = '#ff6f00'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1a1a1a';
    for (let i = 0; i < 8; i++) { g.fillRect(i * 72, 0, 34, 34); g.fillRect(i * 72 + 34, h - 34, 38, 34); }
    g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.strokeRect(10, 40, w - 20, h - 80);
    g.textAlign = 'center';
    g.fillStyle = '#ffffff'; g.font = '900 72px "Trebuchet MS", sans-serif';
    g.fillText('🚧 OBRA', w / 2, h / 2 + 8);
    g.fillStyle = '#1a1a1a'; g.font = '700 40px "Trebuchet MS", sans-serif';
    g.fillText('★ GEAYI ★', w / 2, h / 2 + 62);
  });
}
function _makeCone(x, z) { // cono naranja de tráfico (diseño propio simple)
  const grp = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.85, 10),
    new THREE.MeshStandardMaterial({ color: 0xff6f00, roughness: 0.7 }));
  cone.position.y = 0.55; grp.add(cone);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.18, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
  band.position.y = 0.55; grp.add(band);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xd65a00, roughness: 0.8 }));
  base.position.y = 0.05; grp.add(base);
  grp.position.set(x, 0.02, z);
  return grp;
}
function _makeScaffold(x, z) { // andamio simple: 4 postes + 2 tablones
  const grp = new THREE.Group();
  const postM = new THREE.MeshStandardMaterial({ color: 0x8a8f9a, roughness: 0.5, metalness: 0.4 });
  const plankM = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.85 });
  [[-1.2, -0.8], [1.2, -0.8], [-1.2, 0.8], [1.2, 0.8]].forEach(function (p) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.2, 8), postM);
    post.position.set(p[0], 1.6, p[1]); grp.add(post);
  });
  [1.5, 3.0].forEach(function (py) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 2.2), plankM);
    plank.position.y = py; grp.add(plank);
  });
  grp.position.set(x, 0.02, z);
  return grp;
}
function _makeGhostWall(x, z, w, rotY, color) { // sección de pared fantasma
  _buildCache();
  const m = new THREE.Mesh(_ghostG, _ghostM);
  if (rotY) m.scale.set(0.4, 2.6, w);
  else m.scale.set(w, 2.6, 0.4);
  m.position.set(x, 1.32, z);
  m.userData = { built: false, color: color };
  return m;
}
function _startBuild() {
  _ensureUI();
  _buildCache();
  const grp = new THREE.Group();
  // letrero de la obra
  try {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.0, 8),
      new THREE.MeshStandardMaterial({ color: 0x5e3717, roughness: 0.9 }));
    pole.position.set(BUILD_CX, 1.5, BUILD_CZ - 8); grp.add(pole);
    grp.add(doubleFaceSign(8, 2.6, _buildSignTex(), BUILD_CX, 3.6, BUILD_CZ - 8, 0));
  } catch (e) {}
  // conos alrededor del lote
  [[-12, -9], [12, -9], [-12, 9], [12, 9], [0, -9], [0, 9], [-12, 0], [12, 0]].forEach(function (o) {
    grp.add(_makeCone(BUILD_CX + o[0], BUILD_CZ + o[1]));
  });
  // andamios
  grp.add(_makeScaffold(BUILD_CX - 8, BUILD_CZ + 5));
  grp.add(_makeScaffold(BUILD_CX + 8, BUILD_CZ - 5));
  // 6 fantasmas: casa de 10 x 7 m (2 al frente, 2 atrás, 1 a cada lado)
  JB.ghosts = [];
  const wallCols = [0xffb3d9, 0xb9e8ff, 0xfff3b0, 0x9dff6e, 0xffc400, 0xff8a5e];
  const defs = [
    [BUILD_CX - 2.4, BUILD_CZ - 3.5, 4.6, 0], [BUILD_CX + 2.4, BUILD_CZ - 3.5, 4.6, 0],
    [BUILD_CX - 2.4, BUILD_CZ + 3.5, 4.6, 0], [BUILD_CX + 2.4, BUILD_CZ + 3.5, 4.6, 0],
    [BUILD_CX - 5, BUILD_CZ, 6.2, 1], [BUILD_CX + 5, BUILD_CZ, 6.2, 1],
  ];
  defs.forEach(function (d, i) {
    const w = _makeGhostWall(d[0], d[1], d[2], d[3], wallCols[i % wallCols.length]);
    grp.add(w); JB.ghosts.push(w);
  });
  LEVEL.group.add(grp);
  JB.group = grp;
  JB.builtCount = 0;
  JB.active = 'build';
  _setChip('🏗️ ' + _jobT('job.n.build') + ' 0/6', true);
}
function _buildWall(w) {
  w.userData.built = true;
  w.material = _solidMat(w.userData.color);
  _earn(10);
  _burst(w.position.x, 1.8, w.position.z, [w.userData.color, 0xffffff], 18, 6);
  _sfxCoin();
  JB.builtCount++;
  _setChip('🏗️ ' + _jobT('job.n.build') + ' ' + JB.builtCount + '/6', true);
  if (JB.builtCount >= JB.ghosts.length) {
    _earn(25);
    _toast(_jobT('job.builtAll'));
    for (let k = 0; k < 4; k++) { // confeti de celebración
      setTimeout(function () {
        _burst(BUILD_CX + (Math.random() - 0.5) * 10, 3 + Math.random() * 3, BUILD_CZ + (Math.random() - 0.5) * 8,
          [0xffd23f, 0xff2fd6, 0x00e5ff, 0x59d867, 0xffffff], 26, 8);
      }, k * 200);
    }
  } else {
    _toast('🧱 +10 🪙');
  }
  JB.buildTarget = null;
  _setActionBtn('', false);
}
function _updateBuild(dt) {
  JB.buildTarget = null;
  if (!_onFoot() || typeof Player === 'undefined' || !Player.pos) { _setActionBtn('', false); return; }
  let best = null, bd = 16; // 4 m
  for (const w of JB.ghosts) {
    if (w.userData.built) continue;
    const d2 = _d2(Player.pos.x, Player.pos.z, w.position.x, w.position.z);
    if (d2 < bd) { bd = d2; best = w; }
  }
  JB.buildTarget = best;
  if (best) _setActionBtn('🧱 ' + _jobT('job.blockBtn'), true, 'build');
  else _setActionBtn('', false);
}

/* ---------------- acción del botón ---------------- */
function _jobAction() {
  if (!JB.active || !JB.actionFor) return;
  if (typeof MODE !== 'undefined' && MODE !== 'play') return;
  if (JB.actionFor === 'paint' && JB.paintTarget) _paintHouse(JB.paintTarget);
  else if (JB.actionFor === 'build' && JB.buildTarget) _buildWall(JB.buildTarget);
  else if (JB.actionFor === 'serve') _serveBurger();
}

/* ---------------- bucle (llamado desde game.js) ---------------- */
function updateJobs(dt) {
  _ensureUI();
  const ok = (typeof MODE === 'undefined' || MODE === 'play') && _inImmokalee() && JB.active;
  if (!ok) {
    _setActionBtn('', false);
    if (JB.chip) JB.chip.style.display = 'none';
    return;
  }
  if (JB.chip) JB.chip.style.display = '';
  try {
    if (JB.active === 'garden') _updateGarden(dt);
    else if (JB.active === 'paint') _updatePaint(dt);
    else if (JB.active === 'build') _updateBuild(dt);
    else if (JB.active === 'tamps') _updateTamps(dt);
  } catch (e) {}
}

/* ---------------- teclado (E = acción, como en pesca) ---------------- */
try {
  if (typeof window !== 'undefined' && !window.__jobsKeys) {
    window.__jobsKeys = true;
    window.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      if (e.code === 'KeyE') _jobAction();
    });
  }
} catch (e) {}

/* ================= 🍔 COCINERO · LOS HERMANOS TAMPS =================
   Trabajo en la traila de la familia (-16, 44), ventana al sur.
   Todo a nivel del suelo: el jugador atiende la ventana, arma hamburguesas
   por pasos en la cocina táctil (pan base → carne → queso → lechuga →
   tomate → pan tapa) y las sirve a los clientes NPC que llegan a la ventana.
   Paga: +12 🪙 por hamburguesa servida + propina hasta +8 según rapidez.
   Si un cliente espera demasiado se va molesto (sin pago, la racha vuelve a 0).
   Con racha ≥ 3 servidas seguidas, algunos clientes piden 2 hamburguesas.
   Diseño 100% original (muñecos de bloques propios, marca de la familia
   usada con respeto). Geometrías y materiales en caché para Android. */
const TAMPS_X = -16, TAMPS_Z = 44;      // traila "LOS HERMANOS TAMPS"
const TAMPS_WIN_Z = 45.9;               // ventana de servicio (lado sur)
const TAMPS_START_D2 = 144;             // 12 m: hay que estar cerca para empezar
const TAMPS_SERVE_D2 = 196;             // 14 m: hay que estar cerca para servir
const TAMPS_PAY = 12, TAMPS_TIP_MAX = 8, TAMPS_TRAY_MAX = 3;
const TAMPS_RECIPE = [
  { id: 'bunB',    emoji: '🍞', h: 0.18, es: 'PAN BASE', en: 'BOTTOM BUN' },
  { id: 'meat',    emoji: '🥩', h: 0.16, es: 'CARNE',    en: 'PATTY' },
  { id: 'cheese',  emoji: '🧀', h: 0.07, es: 'QUESO',    en: 'CHEESE' },
  { id: 'lettuce', emoji: '🥬', h: 0.06, es: 'LECHUGA',  en: 'LETTUCE' },
  { id: 'tomato',  emoji: '🍅', h: 0.12, es: 'TOMATE',   en: 'TOMATO' },
  { id: 'bunT',    emoji: '🍞', h: 0.30, es: 'PAN TAPA', en: 'TOP BUN' },
];
const TAMPS_QX = [-18.5, -16.7, -14.9, -13.1]; // fila de la ventana (4 lugares)
const TAMPS_QZ = 49.2;
const TAMPS_TABLE_X = -10.5, TAMPS_TABLE_Z = 48.5;  // mesa de armado
const TAMPS_TRAY_X = -10.5, TAMPS_TRAY_Z = 46.6;    // bandeja de listas

/* ---- caché de geometrías / materiales (se crea una vez) ---- */
let _tampsGeo = null;
function _tampsCache() {
  if (_tampsGeo) return _tampsGeo;
  const std = function (color, extra) {
    const o = { color: color, roughness: 0.85 }; if (extra) for (const k in extra) o[k] = extra[k];
    return new THREE.MeshStandardMaterial(o);
  };
  _tampsGeo = {
    // cliente (muñeco de bloques original)
    headG: new THREE.BoxGeometry(0.46, 0.46, 0.46),
    bodyG: new THREE.BoxGeometry(0.72, 0.72, 0.42),
    armG: new THREE.BoxGeometry(0.2, 0.62, 0.2),
    legG: new THREE.BoxGeometry(0.24, 0.7, 0.24),
    eyeG: new THREE.BoxGeometry(0.09, 0.11, 0.03),
    bubbleG: new THREE.PlaneGeometry(0.95, 0.95),
    skinM: std(0xd9a066), eyeM: std(0x1a1a1a, { roughness: 0.4 }),
    pantsM: std(0x3a5a8c),
    shirtMs: [0xe5382f, 0x2f7fe5, 0x59d867, 0xffd23f, 0xb14dff, 0xff8a5e].map(function (c) { return std(c); }),
    // mesas
    topG: new THREE.BoxGeometry(2.2, 0.1, 1.3),
    tlegG: new THREE.BoxGeometry(0.12, 0.95, 0.12),
    woodM: std(0x7a5230),
    // capas de la hamburguesa
    layer: {
      bunB:    { g: new THREE.CylinderGeometry(0.55, 0.6, 0.18, 12), m: std(0xe8b96a) },
      meat:    { g: new THREE.CylinderGeometry(0.5, 0.5, 0.16, 12),  m: std(0x7a4a21) },
      cheese:  { g: new THREE.BoxGeometry(0.95, 0.06, 0.95),         m: std(0xffd23f) },
      lettuce: { g: new THREE.BoxGeometry(1.0, 0.05, 1.0),            m: std(0x59d867) },
      tomato:  { g: new THREE.CylinderGeometry(0.42, 0.42, 0.12, 12), m: std(0xe5382f) },
      bunT:    { g: new THREE.SphereGeometry(0.55, 12, 8),            m: std(0xe8b96a) },
    },
    bubbleTex: {}, // 'x1' / 'x2' → CanvasTexture
  };
  return _tampsGeo;
}
function _tampsBubbleTex(order) {
  const c = _tampsCache(), key = 'x' + order;
  if (!c.bubbleTex[key]) {
    c.bubbleTex[key] = canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = 'rgba(255,255,255,.95)';
      g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#e5382f'; g.lineWidth = 8; g.stroke();
      g.fillStyle = '#e5382f'; g.textAlign = 'center';
      g.font = '900 56px "Trebuchet MS", sans-serif';
      g.fillText('×' + order, 64, 84);
    });
  }
  return c.bubbleTex[key];
}
function _tampsLayer(id) { // una capa de la hamburguesa (malla con caché)
  const c = _tampsCache(), L = c.layer[id];
  const m = new THREE.Mesh(L.g, L.m);
  if (id === 'bunT') m.scale.y = 0.62;
  if (id === 'cheese') m.rotation.y = 0.5;
  if (id === 'lettuce') m.rotation.y = -0.3;
  return m;
}
function _tampsSignTex() {
  return canvasTex(512, 192, function (g, w, h) {
    g.fillStyle = '#a31616'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffe95e'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    g.textAlign = 'center';
    g.fillStyle = '#ffffff'; g.font = '900 52px "Trebuchet MS", sans-serif';
    g.fillText('🍔 LOS HERMANOS', w / 2, 78);
    g.fillStyle = '#ffe95e'; g.font = '900 52px "Trebuchet MS", sans-serif';
    g.fillText('★ TAMPS ★', w / 2, 140);
  });
}
function _tampsTable(x, z) {
  const c = _tampsCache(), g = new THREE.Group();
  const top = new THREE.Mesh(c.topG, c.woodM); top.position.y = 0.95; g.add(top);
  [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]].forEach(function (p) {
    const l = new THREE.Mesh(c.tlegG, c.woodM); l.position.set(p[0], 0.47, p[1]); g.add(l);
  });
  g.position.set(x, 0, z);
  return g;
}
function _tampsPersonMesh(order) { // cliente NPC: muñeco de bloques original
  const c = _tampsCache(), g = new THREE.Group();
  const shirt = c.shirtMs[(Math.random() * c.shirtMs.length) | 0];
  const lL = new THREE.Mesh(c.legG, c.pantsM); lL.position.set(-0.17, 0.35, 0); g.add(lL);
  const lR = new THREE.Mesh(c.legG, c.pantsM); lR.position.set(0.17, 0.35, 0); g.add(lR);
  const body = new THREE.Mesh(c.bodyG, shirt); body.position.y = 1.06; g.add(body);
  const aL = new THREE.Mesh(c.armG, shirt); aL.position.set(-0.48, 1.06, 0); g.add(aL);
  const aR = new THREE.Mesh(c.armG, shirt); aR.position.set(0.48, 1.06, 0); g.add(aR);
  const head = new THREE.Mesh(c.headG, c.skinM); head.position.y = 1.68; g.add(head);
  const eL = new THREE.Mesh(c.eyeG, c.eyeM); eL.position.set(-0.12, 1.7, 0.24); g.add(eL);
  const eR = new THREE.Mesh(c.eyeG, c.eyeM); eR.position.set(0.12, 1.7, 0.24); g.add(eR);
  const bub = new THREE.Mesh(c.bubbleG,
    new THREE.MeshBasicMaterial({ map: _tampsBubbleTex(order), transparent: true }));
  bub.position.y = 2.45; g.add(bub);
  g.rotation.y = Math.PI; // mira hacia la ventana (norte)
  return g;
}

/* ---- idioma de la receta ---- */
function _tampsLang() { try { return (typeof LANG !== 'undefined' && LANG === 'en') ? 'en' : 'es'; } catch (e) { return 'es'; } }

/* ---- empezar ---- */
function _startTamps() {
  _ensureUI();
  if (typeof Player === 'undefined' || !Player.pos) return;
  if (_d2(Player.pos.x, Player.pos.z, TAMPS_X, TAMPS_Z) > TAMPS_START_D2) {
    _toast(_jobT('job.farTamps')); // hay que estar junto a la traila
    return;
  }
  _tampsCache();
  const grp = new THREE.Group();
  grp.add(_tampsTable(TAMPS_TABLE_X, TAMPS_TABLE_Z)); // mesa de armado
  grp.add(_tampsTable(TAMPS_TRAY_X, TAMPS_TRAY_Z));   // bandeja de listas
  try {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x5e3717, roughness: 0.9 }));
    pole.position.set(TAMPS_TABLE_X + 1.6, 1.1, TAMPS_TABLE_Z); grp.add(pole);
    grp.add(doubleFaceSign(4.4, 1.7, _tampsSignTex(), TAMPS_TABLE_X + 1.6, 2.9, TAMPS_TABLE_Z, 0));
  } catch (e) {}
  LEVEL.group.add(grp);
  JB.group = grp;
  const st = JB.tamps = {
    served: 0, earned: 0, step: 0, ready: 0, streak: 0,
    customers: [], spots: [false, false, false, false], spawnT: 8,
    readyMeshes: [], buildY: 0, buildGrp: null, stepEl: null,
  };
  st.buildGrp = new THREE.Group();
  st.buildGrp.position.set(TAMPS_TABLE_X, 1.0, TAMPS_TABLE_Z);
  grp.add(st.buildGrp);
  for (let i = 0; i < 3; i++) _tampsSpawn(st); // 3 clientes al abrir
  JB.active = 'tamps';
  _tampsShowKitchen(true);
  _tampsStepLabel();
  _tampsChip();
  _toast(_jobT('job.tampsHint'));
}
function _stopTampsUI() {
  try { const el = document.getElementById('tamps-kitchen'); if (el) el.style.display = 'none'; } catch (e) {}
}

/* ---- clientes ---- */
function _tampsSpawn(st) {
  const spot = st.spots.indexOf(false);
  if (spot < 0 || st.customers.length >= 4) return;
  st.spots[spot] = true;
  const order = (st.streak >= 3 && Math.random() < 0.5) ? 2 : 1; // en racha piden 2
  const x = TAMPS_QX[spot], z = TAMPS_QZ;
  const mesh = _tampsPersonMesh(order);
  mesh.position.set(x, 0, z);
  JB.group.add(mesh);
  st.customers.push({
    mesh: mesh, x: x, z: z, spot: spot, order: order,
    t0: _now(), maxWait: 55 - Math.min(20, st.streak * 2), // 55 s → 35 s en racha
  });
}
function _tampsRemoveCustomer(st, c) {
  try { if (c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh); } catch (e) {}
  st.spots[c.spot] = false;
  const i = st.customers.indexOf(c);
  if (i >= 0) st.customers.splice(i, 1);
}

/* ---- minijuego de cocina ---- */
function _tampsPick(i) { // toca un ingrediente (botón táctil ≥52px)
  const st = JB.tamps;
  if (!st || JB.active !== 'tamps') return;
  if (st.ready >= TAMPS_TRAY_MAX) { _toast(_jobT('job.trayFull')); return; }
  const want = TAMPS_RECIPE[st.step];
  if (!want) return;
  if (TAMPS_RECIPE[i] && TAMPS_RECIPE[i].id === want.id) {
    const m = _tampsLayer(want.id); // paso correcto: se apila en la mesa
    m.position.y = st.buildY;
    st.buildGrp.add(m);
    st.buildY += want.h;
    st.step++;
    _burst(TAMPS_TABLE_X, 1.6, TAMPS_TABLE_Z, [0xffffff, 0xffd23f, 0x59d867], 6, 3);
    if (st.step >= TAMPS_RECIPE.length) _tampsFinishBurger();
    else _tampsStepLabel();
  } else {
    _toast(_jobT('job.badPick')); // sin castigo duro: solo reintentar
  }
}
function _tampsFinishBurger() { // 6/6 pasos: hamburguesa lista a la bandeja
  const st = JB.tamps;
  const bg = new THREE.Group();
  let y = 0;
  TAMPS_RECIPE.forEach(function (r) {
    const m = _tampsLayer(r.id); m.position.y = y; bg.add(m); y += r.h;
  });
  bg.position.set(TAMPS_TRAY_X - 0.6 + st.readyMeshes.length * 0.6, 1.0, TAMPS_TRAY_Z);
  JB.group.add(bg);
  st.readyMeshes.push(bg);
  st.buildGrp.children.slice().forEach(function (m) { st.buildGrp.remove(m); }); // limpiar mesa
  st.buildY = 0; st.step = 0; st.ready++;
  _sfxCoin();
  _toast(_jobT('job.burgerReady'));
  _tampsChip();
  _tampsStepLabel();
}

/* ---- servir ---- */
function _serveBurger() {
  const st = JB.tamps;
  if (!st || JB.active !== 'tamps') return;
  let best = null, bd = 1e12;
  for (const c of st.customers) {
    const d = _d2(TAMPS_X, TAMPS_WIN_Z, c.x, c.z);
    if (d < bd) { bd = d; best = c; }
  }
  if (!best) return;
  if (_d2(Player.pos.x, Player.pos.z, TAMPS_X, TAMPS_Z) > TAMPS_SERVE_D2) {
    _toast(_jobT('job.farTamps')); return;
  }
  if (st.ready < best.order) {
    _toast(_jobT('job.needBurgers').replace('{n}', best.order - st.ready));
    return;
  }
  const waited = _now() - best.t0;
  const tip = Math.round(TAMPS_TIP_MAX * Math.max(0, 1 - waited / best.maxWait)); // propina por rapidez
  const pay = TAMPS_PAY + tip;
  _earn(pay); // respeta Pase VIP 2x vía Shop2
  _sfxCoin();
  _burst(best.x, 1.8, best.z, [0xffd23f, 0xffffff, 0xff8a5e], 16, 5);
  for (let i = 0; i < best.order; i++) { // consumir hamburguesas de la bandeja
    const m = st.readyMeshes.shift();
    if (m && m.parent) m.parent.remove(m);
  }
  st.ready -= best.order;
  st.served++; st.earned += pay; st.streak++;
  _tampsRemoveCustomer(st, best);
  _toast('😋 +' + pay + ' 🪙' + (tip > 0 ? ' (' + _jobT('job.tip') + ' +' + tip + ')' : ''));
  _tampsChip();
  _tampsStepLabel();
}

/* ---- UI: cocina táctil + chip ---- */
function _tampsShowKitchen(show) {
  try {
    let el = document.getElementById('tamps-kitchen');
    if (show) {
      if (!el) {
        el = document.createElement('div');
        el.id = 'tamps-kitchen';
        el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:118px;z-index:35;' +
          'display:none;background:rgba(20,12,4,.9);border:3px solid #ffb13d;border-radius:18px;' +
          'padding:10px 12px;font-family:inherit;color:#fff;text-align:center;max-width:96vw;';
        const lab = document.createElement('div');
        lab.id = 'tamps-step';
        lab.style.cssText = 'font-size:14px;font-weight:800;margin-bottom:8px;';
        el.appendChild(lab);
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,64px);gap:8px;justify-content:center;';
        TAMPS_RECIPE.forEach(function (r, i) {
          const b = document.createElement('button');
          b.style.cssText = 'width:64px;height:64px;font-size:26px;line-height:1;border-radius:14px;' +
            'border:3px solid #fff;background:#3a2410;color:#fff;font-family:inherit;';
          const em = document.createElement('div'); em.textContent = r.emoji; b.appendChild(em);
          const tx = document.createElement('div');
          tx.style.cssText = 'font-size:9px;font-weight:800;margin-top:2px;';
          tx.textContent = r.es; b.appendChild(tx);
          b.addEventListener('click', function () { _tampsPick(i); });
          grid.appendChild(b);
        });
        el.appendChild(grid);
        document.body.appendChild(el);
      }
      el.style.display = '';
      const st = JB.tamps;
      if (st) st.stepEl = el.querySelector('#tamps-step');
    } else if (el) {
      el.style.display = 'none';
    }
  } catch (e) {}
}
function _tampsStepLabel() {
  const st = JB.tamps;
  if (!st || !st.stepEl) return;
  let txt;
  if (st.ready >= TAMPS_TRAY_MAX) {
    txt = '🍔 ' + _jobT('job.trayFull');
  } else {
    const r = TAMPS_RECIPE[st.step], lang = _tampsLang();
    txt = '🍔 ' + _jobT('job.step') + ' ' + (st.step + 1) + '/6 · ' + _jobT('job.addNow') +
      ' ' + r.emoji + ' ' + (lang === 'en' ? r.en : r.es) +
      (st.ready > 0 ? '   ·   🍔×' + st.ready : '');
  }
  try { st.stepEl.textContent = txt; } catch (e) {}
}
function _tampsChip() {
  const st = JB.tamps;
  if (!st) return;
  _setChip('🍔 ' + st.served + ' · +' + st.earned + ' 🪙', true);
}

/* ---- bucle ---- */
function _updateTamps(dt) {
  const st = JB.tamps;
  if (!st) return;
  const now = _now();
  // clientes molestos: se van sin pagar y la racha vuelve a 0
  for (let i = st.customers.length - 1; i >= 0; i--) {
    const c = st.customers[i];
    if (now - c.t0 > c.maxWait) {
      _tampsRemoveCustomer(st, c);
      st.streak = 0;
      _toast(_jobT('job.leftAngry'));
    }
  }
  // mantener 2–4 clientes en la fila
  st.spawnT -= dt;
  if (st.customers.length < 4) {
    let waiting = 0;
    for (const c of st.customers) waiting++;
    if (waiting < 2 && st.spawnT <= 0) { _tampsSpawn(st); st.spawnT = 5 + Math.random() * 4; }
  }
  // botón 🍔 SERVIR cuando hay cliente esperando y el jugador está en la ventana
  let anyWait = false;
  for (const c of st.customers) { anyWait = true; break; }
  const near = (typeof Player !== 'undefined' && Player.pos) &&
    _d2(Player.pos.x, Player.pos.z, TAMPS_X, TAMPS_Z) <= TAMPS_SERVE_D2;
  if (anyWait && near) _setActionBtn('🍔 ' + _jobT('job.serve'), true, 'serve');
  else _setActionBtn('', false);
}
