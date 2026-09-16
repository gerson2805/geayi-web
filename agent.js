/* ============================================================
   🤖 AGENTE GEAYI — compañero constructor (GEAYI — Obby Xtreme 3D)
   ------------------------------------------------------------
   Robot compañero 100% LOCAL (sin internet, sin claves, sin red):
   - Chat con intenciones en español para CONSTRUIR en tu mundo.
   - REGLA DE ORO: SOLO construye, NUNCA destruye. Este archivo
     solo usa la API aditiva de colocación de bloques; no borra nada.
   - Solo construye en tu lote/mundo, o en mundo ajeno con visita pagada.
   - Diseños 100% originales GEAYI (rechaza marcas copiadas).
   - Prefabs: CASA, TIENDA, PARQUE, CALLE, PUENTE, TORRE, CIRCUITO,
     VOLCAN (lava que rebota, sin daño) y LAGO (zona de nado).
   - Economía de mundos: crear mundo = 100 monedas;
     construir en mundo ajeno = 25 monedas al creador por visita.
   Integración (la hace el coordinador):
   1. <script src="agent.js"></script> en index.html (después de lots.js, antes de game.js).
   2. En boot(): if (typeof GeayiAgent !== 'undefined') GeayiAgent.init();
   3. En el loop, rama MODE==='play':
      if (typeof GeayiAgent !== 'undefined') GeayiAgent.update(dt);
   ============================================================ */
'use strict';

/* ============================================================
   🖐️ PANELES ARRASTRABLES — el chat se mueve donde no estorbe.
   Arrastra desde la barra superior; la posición se guarda en SAVE.
   ============================================================ */
function makePanelDraggable(panelId, headSel, saveKey) {
  try {
    if (typeof document === 'undefined') return;
    const p = document.getElementById(panelId);
    const h = p ? p.querySelector(headSel) : null;
    if (!p || !h || h._dragInit) return;
    h._dragInit = true;
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
    h.addEventListener('pointerdown', function (e) {
      try { if (e.target && e.target.closest && e.target.closest('button,input')) return; } catch (e2) {}
      const r = p.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      dragging = true;
      p.classList.add('dragging');
      try { h.setPointerCapture(e.pointerId); } catch (e2) {}
      try { e.preventDefault(); } catch (e2) {}
    });
    h.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const r = p.getBoundingClientRect();
      let nx = ox + (e.clientX - sx), ny = oy + (e.clientY - sy);
      nx = Math.max(4, Math.min(window.innerWidth - Math.min(r.width, 120) - 4, nx));
      ny = Math.max(4, Math.min(window.innerHeight - 60, ny));
      p.style.left = nx + 'px'; p.style.top = ny + 'px';
      p.style.right = 'auto'; p.style.bottom = 'auto';
    });
    const end = function () {
      if (!dragging) return;
      dragging = false;
      p.classList.toggle('dragging', false);
      try {
        const r = p.getBoundingClientRect();
        if (typeof SAVE !== 'undefined' && saveKey) {
          SAVE[saveKey] = { x: Math.round(r.left), y: Math.round(r.top) };
          if (typeof persist === 'function') persist();
        }
      } catch (e2) {}
    };
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);
  } catch (e) {}
}
function restorePanelPos(panelId, saveKey) {
  try {
    if (typeof document === 'undefined') return;
    const p = document.getElementById(panelId);
    const s = (typeof SAVE !== 'undefined' && saveKey) ? SAVE[saveKey] : null;
    if (!p || !s || typeof s.x !== 'number' || typeof s.y !== 'number') return;
    const x = Math.max(4, Math.min(window.innerWidth - 80, s.x));
    const y = Math.max(4, Math.min(window.innerHeight - 60, s.y));
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.style.right = 'auto'; p.style.bottom = 'auto';
  } catch (e) {}
}

/* ---------- zonas de agua (las lee player.js para el nado) ---------- */
var WATER_ZONES = []; // [{x0,x1,z0,z1,y}]  y = superficie del agua
function waterZoneAt(x, z) {
  try {
    for (const zn of WATER_ZONES) {
      if (x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1) return zn;
    }
  } catch (e) {}
  return null;
}

/* ---------- oxígeno del nado (función pura, testeable) ----------
   Devuelve {oxy, rise}: rise=true cuando se acaba el aire y hay que subir. */
function swimOxygen(oxy, max, dt, headAbove) {
  let o = (oxy == null || isNaN(oxy)) ? max : oxy;
  if (headAbove) o = Math.min(max, o + dt * 10);
  else o -= dt;
  const rise = o <= 0;
  if (rise) o = 6;
  return { oxy: o, rise: rise };
}

/* ---------- monedas: siempre por la vía real del juego ---------- */
function _agSpend(n) {
  try {
    if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.spendCoins === 'function')
      return !!Shop2.spendCoins(n);
    if (typeof SAVE !== 'undefined' && (SAVE.coins || 0) >= n) {
      SAVE.coins -= n; try { persist(); } catch (e) {} return true;
    }
  } catch (e) {}
  return false;
}
function _agEarn(n) {
  try {
    if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.addCoins === 'function') { Shop2.addCoins(n); return; }
    if (typeof SAVE !== 'undefined') { SAVE.coins = (SAVE.coins || 0) + n; try { persist(); } catch (e) {} }
  } catch (e) {}
}
function _agToast(m) { try { if (typeof toast === 'function') toast(m); } catch (e) {} }

/* ============================================================
   🧱 PREFABS — diseños originales GEAYI como datos.
   Cada generador devuelve [{x,y,z,c,lava?}] relativos al origen
   (origen = centro de la base, y=0 en el suelo, coords enteras).
   ============================================================ */
function pfCasa() {
  const B = [], cA = '#ffd9e8', cB = '#ff5e8a', cR = '#00a2ff';
  for (let x = -3; x <= 3; x++) for (let z = -2; z <= 2; z++) {
    const e = (x === -3 || x === 3 || z === -2 || z === 2);
    if (!e) continue;
    for (let y = 0; y < 3; y++) {
      if (z === 2 && x >= -1 && x <= 0 && y < 2) continue; // puerta
      if (y === 1 && z === 0 && (x === -3 || x === 3)) continue; // ventanas
      B.push({ x: x, y: y, z: z, c: (y === 2 ? cB : cA) });
    }
  }
  for (let x = -3; x <= 3; x++) for (let z = -2; z <= 2; z++) B.push({ x: x, y: 3, z: z, c: cR }); // techo
  B.push({ x: 2, y: 4, z: -1, c: '#8a5a33' }, { x: 2, y: 5, z: -1, c: '#8a5a33' }); // chimenea
  return B;
}
function pfTienda() {
  const B = [], cA = '#fff3b0', cB = '#ff9d00';
  for (let x = -3; x <= 2; x++) for (let z = -2; z <= 1; z++) {
    const e = (x === -3 || x === 2 || z === -2 || z === 1);
    if (!e) continue;
    for (let y = 0; y < 3; y++) {
      if (z === 1 && x >= -1 && x <= 0 && y < 2) continue; // entrada
      if (y === 1 && z === 0 && (x === -3 || x === 2)) continue; // vitrinas
      B.push({ x: x, y: y, z: z, c: (y === 2 ? cB : cA) });
    }
  }
  for (let x = -3; x <= 2; x++) B.push({ x: x, y: 2, z: 2, c: (x % 2 === 0 ? '#ff5e8a' : '#ffffff') }); // toldo
  for (let x = -2; x <= 1; x++) B.push({ x: x, y: 3, z: 1, c: '#00a2ff' }); // letrero
  return B;
}
function pfParque() {
  const B = [];
  const tree = function (tx, tz) {
    for (let y = 0; y < 3; y++) B.push({ x: tx, y: y, z: tz, c: '#8a5a33' });
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let dy = 0; dy < 2; dy++) {
      if (Math.abs(dx) + Math.abs(dz) === 2 && dy === 1) continue;
      B.push({ x: tx + dx, y: 3 + dy, z: tz + dz, c: '#59d867' });
    }
  };
  tree(-4, -3); tree(3, -3); tree(-4, 3); tree(3, 3);
  for (let a = 0; a < 8; a++) // fuente
    B.push({ x: Math.round(Math.cos(a * Math.PI / 4) * 2), y: 0, z: Math.round(Math.sin(a * Math.PI / 4) * 2), c: '#00a2ff' });
  B.push({ x: 0, y: 0, z: 0, c: '#ffffff' }, { x: 0, y: 1, z: 0, c: '#00a2ff' });
  for (const bz of [5, -5]) for (let bx = -1; bx <= 1; bx++) B.push({ x: bx, y: 0, z: bz, c: '#8a5a33' }); // bancas
  return B;
}
function pfCalle() {
  const B = [];
  for (let x = -8; x <= 7; x++) for (let z = -1; z <= 1; z++) {
    if (z === 0 && ((x + 8) % 2 === 0)) continue;
    B.push({ x: x, y: 0, z: z, c: '#3a3f4d' });
  }
  for (let x = -8; x <= 7; x += 2) B.push({ x: x, y: 0, z: 0, c: '#ffe95e' }); // línea central
  for (const lx of [-6, 6]) for (const lz of [-2, 2]) // farolas
    B.push({ x: lx, y: 0, z: lz, c: '#2b2f3a' }, { x: lx, y: 1, z: lz, c: '#2b2f3a' }, { x: lx, y: 2, z: lz, c: '#ffe95e' });
  return B;
}
function pfPuente() {
  const B = [];
  for (let x = -6; x <= 6; x++) for (let z = -1; z <= 0; z++) B.push({ x: x, y: 3, z: z, c: '#8a5a33' }); // tablero
  for (let x = -6; x <= 6; x++) { B.push({ x: x, y: 4, z: -2, c: '#ff9d00' }, { x: x, y: 4, z: 1, c: '#ff9d00' }); } // barandas
  for (let s = -1; s <= 1; s += 2) // rampas de subida
    for (let i = 0; i < 3; i++) { const x = s * (7 + i); for (let z = -1; z <= 0; z++) B.push({ x: x, y: 2 - i, z: z, c: '#8a5a33' }); }
  for (const px of [-6, 6]) for (const pz of [-1, 0]) for (let y = 0; y < 3; y++) B.push({ x: px, y: y, z: pz, c: '#5a3a20' }); // pilares
  return B;
}
function pfTorre() {
  const B = [];
  for (const cx of [-2, 2]) for (const cz of [-2, 2]) for (let y = 0; y < 10; y++) B.push({ x: cx, y: y, z: cz, c: '#7b2fff' });
  for (const fy of [3, 6]) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) B.push({ x: x, y: fy, z: z, c: '#00c2a8' });
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) B.push({ x: x, y: 10, z: z, c: '#ffe95e' }); // mirador
  for (let x = -2; x <= 2; x++) { B.push({ x: x, y: 11, z: -2, c: '#ff5e8a' }, { x: x, y: 11, z: 2, c: '#ff5e8a' }); }
  for (let z = -2; z <= 2; z++) { B.push({ x: -2, y: 11, z: z, c: '#ff5e8a' }, { x: 2, y: 11, z: z, c: '#ff5e8a' }); }
  for (let y = 0; y < 10; y++) B.push({ x: 0, y: y, z: 1, c: '#ffffff' }); // escalera
  return B;
}
function pfCircuito() {
  const B = [];
  const steps = [[-10, 4], [-5, 5], [0, 6], [5, 7], [10, 8]];
  for (const s of steps) {
    const px = s[0], py = s[1];
    for (let x = -2; x <= 1; x++) for (let z = -1; z <= 1; z++) B.push({ x: px + x, y: py, z: z, c: '#ff9d00' });
    for (let x = -2; x <= 1; x++) { B.push({ x: px + x, y: py + 1, z: -2, c: '#ff2fd6' }, { x: px + x, y: py + 1, z: 2, c: '#ff2fd6' }); }
  }
  for (let i = 0; i < 4; i++) { // escalones entre plataformas
    const mid = Math.round((steps[i][0] + 2 + steps[i + 1][0] - 2) / 2);
    B.push({ x: mid, y: steps[i][1] + 1, z: 0, c: '#ffffff' });
  }
  return B;
}
function pfVolcan() {
  const B = [];
  const layers = [[3, '#5a4a5a'], [2, '#6b5a6e'], [1, '#5a4a5a']];
  let y = 0;
  for (const L of layers) {
    const r = L[0];
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) B.push({ x: x, y: y, z: z, c: L[1] });
    y++;
  }
  B.push({ x: 0, y: y, z: 0, c: '#3a2f3a' });
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++)
    B.push({ x: x, y: y, z: z, c: '#ff4400', lava: true }); // 🔥 lava: visual, sin colisión, rebota
  B.push({ x: 4, y: 0, z: 2, c: '#3a2f3a' }, { x: -4, y: 0, z: -3, c: '#3a2f3a' }, { x: 3, y: 1, z: -4, c: '#6b5a6e' });
  return B;
}
function pfLago() {
  const B = [];
  // 🏖️ piscina honda: pared de 2 bloques con entrada de arena a nivel del suelo
  for (let y = 0; y < 2; y++) for (let x = -5; x <= 4; x++) for (let z = -4; z <= 3; z++) {
    const e = (x === -5 || x === 4 || z === -4 || z === 3);
    if (!e) continue;
    if (z === 3 && x >= -1 && x <= 1) continue; // entrada de arena (sin pared)
    B.push({ x: x, y: y, z: z, c: '#ffe9a8' });
  }
  B.push({ x: -3, y: 0, z: -2, c: '#ffffff' }, { x: -3, y: 1, z: -2, c: '#ffffff' }, { x: -3, y: 2, z: -2, c: '#ff5e8a' }); // sombrilla
  return B;
}
var PREFABS = {
  CASA: pfCasa, TIENDA: pfTienda, PARQUE: pfParque, CALLE: pfCalle,
  PUENTE: pfPuente, TORRE: pfTorre, CIRCUITO: pfCircuito, VOLCAN: pfVolcan, LAGO: pfLago,
};
var PREFAB_OK = {
  CASA: '🏠 ¡Casa construida! Quedó hermosa 😄',
  TIENDA: '🏪 ¡Tienda lista! A vender se ha dicho 🪙',
  PARQUE: '🌳 ¡Parque construido! A jugar 🌞',
  CALLE: '🛣️ ¡Calle lista! Ya pueden pasear 🚶',
  PUENTE: '🌉 ¡Puente elevado construido! Cruza con cuidado 😎',
  TORRE: '🗼 ¡Torre de 10 pisos! ¿Te atreves a subir? 😱',
  CIRCUITO: '🎢 ¡Circuito de adrenalina listo! Corre sin caerte 😎',
  VOLCAN: '🌋 ¡Volcán construido! La lava solo rebota 🔥 (no hace daño)',
  LAGO: '🏖️ ¡Lago listo! Métete a nadar 🏊 (tienes 30 s de aire)',
};
/* ============================================================
   💰 ECONOMÍA DE MUNDOS (libro local en SAVE)
   - Crear un mundo en tu lote: 100 monedas.
   - Construir en mundo ajeno: 25 monedas al creador por visita.
   ============================================================ */
var WorldEconomy = {
  COST_CREATE: 100, FEE_VISIT: 25,
  REAL_CREATE_CENTS: 299, // 💳 $2.99 decidido por el dueño (solo se cobra con pagos reales activos)
  _visits: {}, // sesión: worldKey -> true (visita ya pagada)
  key: function (w, l) { return w + ':' + l; },
  /* texto del precio según el modo: $2.99 real o 100🪙 demo */
  priceText: function () {
    try { if (typeof PaymentsLive !== 'undefined' && PaymentsLive.isLive()) return '$2.99'; } catch (e) {}
    return '100🪙';
  },
  _ensure: function () {
    try {
      if (typeof SAVE === 'undefined') return;
      if (!SAVE.worlds || typeof SAVE.worlds !== 'object') SAVE.worlds = {};
      if (typeof SAVE.creatorEarnings !== 'number') SAVE.creatorEarnings = 0;
    } catch (e) {}
  },
  /* lote (comprado o no) bajo los pies del jugador */
  lotUnder: function () {
    try {
      if (typeof LEVEL === 'undefined' || !LEVEL || LEVEL.idx == null) return null;
      if (typeof Player === 'undefined' || !Player || !Player.pos) return null;
      if (typeof LotSystem === 'undefined') return null;
      const defs = LotSystem.lotsFor(LEVEL.idx) || [];
      for (const d of defs) {
        if (Math.abs(Player.pos.x - d.x) <= d.w / 2 && Math.abs(Player.pos.z - d.z) <= d.d / 2)
          return { worldIdx: LEVEL.idx, def: d, mine: !!LotSystem.isOwned(LEVEL.idx, d.id) };
      }
    } catch (e) {}
    return null;
  },
  /* mundo registrado bajo los pies (propio o ajeno) */
  worldUnder: function () {
    const l = this.lotUnder();
    if (!l) return null;
    this._ensure();
    let rec = null;
    try { rec = SAVE.worlds[this.key(l.worldIdx, l.def.id)] || null; } catch (e) {}
    if (!rec) return null;
    return { worldIdx: l.worldIdx, def: l.def, rec: rec, mine: !!l.mine, key: this.key(l.worldIdx, l.def.id) };
  },
  /* ¿puede el agente construir aquí? */
  canBuild: function () {
    const w = this.worldUnder();
    if (!w) return { ok: false, reason: 'noworld' };
    if (w.mine) return { ok: true, key: w.key, worldIdx: w.worldIdx, def: w.def };
    if (this._visits[w.key]) return { ok: true, key: w.key, worldIdx: w.worldIdx, def: w.def };
    return { ok: false, reason: 'visit', world: w };
  },
  createWorld: function () {
    this._ensure();
    const l = this.lotUnder();
    if (!l || !l.mine) {
      GeayiAgent.say('Para crear un mundo párate en tu lote 🪧. Si aún no es tuyo, cómpralo con el botón 🪧 cuando estés cerca.');
      return false;
    }
    const k = this.key(l.worldIdx, l.def.id);
    if (SAVE.worlds[k]) { GeayiAgent.say('Aquí ya tienes tu mundo: ' + (SAVE.worlds[k].name || 'Mi mundo') + ' 🌍'); return true; }
    /* 💳 pagos reales activos → $2.99 con tarjeta (PIN parental obligatorio) */
    if (typeof PaymentsLive !== 'undefined' && PaymentsLive.isLive()) { this._createWorldReal(k, l); return true; }
    if (!_agSpend(this.COST_CREATE)) {
      GeayiAgent.say('Crear un mundo cuesta 100🪙 y te faltan monedas. Juega un rato, junta monedas y volvemos 🪙.');
      return false;
    }
    SAVE.worlds[k] = { name: l.def.name || 'Mi mundo', created: Date.now(), visits: 0, lava: [], water: [] };
    try { persist(); } catch (e) {}
    GeayiAgent.say('🌍 ¡Mundo creado: ' + (l.def.name || 'Mi mundo') + '! Ahora pídeme: "hazme una casa", "quiero un volcán"… 🔨');
    return true;
  },
  /* 💳 crear mundo con dinero REAL (solo cuando PaymentsLive está activo) */
  _createWorldReal: function (k, l) {
    const charge = function () {
      GeayiAgent.say('💳 Creando tu mundo por $2.99…');
      try {
        PaymentsLive.route('world-create', 299, 'Crear mundo GEAYI').then(function (r) {
          if (r && r.ok) {
            SAVE.worlds[k] = { name: l.def.name || 'Mi mundo', created: Date.now(), visits: 0, lava: [], water: [], paidReal: true };
            try { persist(); } catch (e) {}
            GeayiAgent.say('🌍 ¡Mundo creado! Pago de $2.99 confirmado ✅. Ahora pídeme: "hazme una casa", "quiero un volcán"… 🔨');
          } else {
            GeayiAgent.say('No se pudo completar el pago de $2.99 💳. Inténtalo de nuevo.');
          }
        });
      } catch (e) { GeayiAgent.say('No se pudo completar el pago de $2.99 💳. Inténtalo de nuevo.'); }
    };
    try {
      if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2._withPin === 'function') Shop2._withPin(charge);
      else charge();
    } catch (e) { charge(); }
  },
  payVisit: function (w) {
    if (!w) return false;
    if (!_agSpend(this.FEE_VISIT)) {
      GeayiAgent.say('Construir en este mundo cuesta 25🪙 por visita y te faltan monedas 🪙.');
      return false;
    }
    this._ensure();
    w.rec.visits = (w.rec.visits || 0) + 1;
    try { persist(); } catch (e) {}
    this._visits[w.key] = true;
    try { // 📡 avisar al creador si está en la misma sala (multijugador)
      if (typeof Net !== 'undefined' && Net && Net.active && Net.channel && Net.me) {
        Net.channel.send({
          type: 'broadcast', event: 'gvisit',
          payload: { from: Net.me.id, amt: this.FEE_VISIT, world: w.rec.name || 'un mundo' },
        });
      }
    } catch (e) {}
    GeayiAgent.say('✅ Pagaste 25🪙 al creador de ' + (w.rec.name || 'este mundo') + '. ¡Ya puedes construir aquí! Dime qué hacemos 🔨.');
    return true;
  },
  /* 🌍 ir a un mundo propio: entra al nivel y teletransporta al lote */
  enterWorld: function (key) {
    try {
      this._ensure();
      const rec = (typeof SAVE !== 'undefined' && SAVE.worlds) ? SAVE.worlds[key] : null;
      if (!rec) return false;
      const parts = String(key).split(':');
      const wi = parseInt(parts[0], 10);
      const lotId = parts.slice(1).join(':');
      if (typeof startLevel !== 'function' || isNaN(wi)) return false;
      startLevel(wi);
      let def = null;
      try {
        if (typeof LotSystem !== 'undefined' && LotSystem) {
          def = (typeof LotSystem._defOf === 'function') ? LotSystem._defOf(wi, lotId) : null;
          if (!def && typeof LotSystem.lotsFor === 'function') { const ds = LotSystem.lotsFor(wi) || []; def = ds[0] || null; }
        }
      } catch (e) {}
      if (def && typeof Player !== 'undefined' && Player) {
        const px = def.x || 0, pz = def.z || 0;
        try {
          if (typeof Player.reset === 'function') Player.reset(px, 2, pz);
          else { Player.pos.x = px; Player.pos.y = 2; Player.pos.z = pz; }
        } catch (e) {}
        try { respawn = { x: px, y: 2, z: pz }; } catch (e) {}
      }
      try { GeayiAgent.say('🌍 ¡Llegamos a ' + (rec.name || 'tu mundo') + '! Pídeme qué construimos 🔨.'); } catch (e) {}
      return true;
    } catch (e) { return false; }
  },
}; /* WorldEconomy */
/* ============================================================
   🤖 GeayiAgent — robot compañero, chat e intenciones.
   ============================================================ */
var GeayiAgent = {
  _inited: false, _robot: null, _placed: false, _tip: null,
  _hist: [], _last: '', _guide: null, _pendingVisit: null,
  _visLevel: -1, _lava: [], _lavaCd: 0, _waterMeshes: [], _visitHook: false,
  _spawnQueue: [], // 🧱 cola de bloques por aparecer (construcción progresiva)

  /* ---------------- chat UI ---------------- */
  init: function () {
    if (this._inited) return true;
    this._inited = true;
    try {
      if (typeof document === 'undefined') return true;
      const b = $('btn-agent'); if (b) b.addEventListener('click', () => this.toggle());
      const c = $('agent-close'); if (c) c.addEventListener('click', () => this.toggle(false));
      const e2 = $('agent-eye');
      if (e2) { e2.addEventListener('click', () => this.toggleRobot()); e2.textContent = this.isRobotHidden() ? '🙈' : '👁️'; }
      const s = $('agent-send'); if (s) s.addEventListener('click', () => this._send());
      const i = $('agent-input');
      if (i) i.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._send(); });
      makePanelDraggable('agent-panel', '.ag-head', 'agentChatPos'); // 🖐️ el chat se puede mover
      this.say('¡Hola! Soy el Agente GEAYI 🤖. Te ayudo a construir tu mundo: pídeme "hazme una casa" 🔨.');
    } catch (e) {}
    return true;
  },
  toggle: function (force) {
    try {
      const p = $('agent-panel'); if (!p) return;
      const show = (typeof force === 'boolean') ? force : p.classList.contains('hidden');
      if (show) {
        p.className = 'agent-panel'; // visible (sin tocar nada más del DOM)
        restorePanelPos('agent-panel', 'agentChatPos'); // 🖐️ vuelve donde lo dejaste
        const i = $('agent-input'); if (i) setTimeout(() => i.focus(), 60);
      } else p.classList.add('hidden');
    } catch (e) {}
  },
  /* 👁️ ocultar/mostrar el robot (el chat se cierra con ✖ o tocando 🤖) */
  isRobotHidden: function () {
    try { return !!(typeof SAVE !== 'undefined' && SAVE.agentHidden); } catch (e) { return false; }
  },
  toggleRobot: function () {
    try {
      const hide = !this.isRobotHidden();
      if (typeof SAVE !== 'undefined') { SAVE.agentHidden = hide; }
      try { if (typeof persist === 'function') persist(); } catch (e) {}
      const inPlay = (typeof MODE !== 'undefined' && MODE === 'play');
      this._setRobotVisible(inPlay && !hide);
      const e2 = (typeof $ !== 'undefined') ? $('agent-eye') : null;
      if (e2) e2.textContent = hide ? '🙈' : '👁️';
      this.say(hide ? '🙈 Me escondo. Toca 👁️ cuando me necesites.' : '👁️ ¡De vuelta! ¿Qué construimos? 🔨');
    } catch (e) {}
  },
  _esc: function (t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
  _paint: function () {
    try {
      if (typeof document === 'undefined') return;
      const box = $('agent-msgs'); if (!box) return;
      box.innerHTML = this._hist.map(m =>
        '<div class="ag-msg' + (m.me ? ' me' : '') + '">' + this._esc(m.t) + '</div>').join('');
      box.scrollTop = box.scrollHeight;
    } catch (e) {}
  },
  _push: function (me, t) {
    this._hist.push({ me: !!me, t: String(t) });
    if (this._hist.length > 40) this._hist = this._hist.slice(-40);
    this._paint();
  },
  say: function (t) { this._last = String(t); this._push(false, t); },
  _send: function () {
    try {
      const i = $('agent-input'); if (!i) return;
      const t = i.value.trim().slice(0, 120);
      i.value = '';
      if (t) this.onText(t);
    } catch (e) {}
  },

  /* ---------------- entrada de texto (con filtro SafeWords) ---------------- */
  onText: function (raw) {
    const text = String(raw || '').slice(0, 120);
    if (!text.trim()) return;
    this._push(true, text);
    let chk = { ok: true };
    try { if (typeof SafeWords !== 'undefined' && SafeWords) chk = SafeWords.check(text); } catch (e) {}
    if (!chk.ok) { // 🛡️ filtro infantil: siempre activo, sin regaños
      this.say('🛡️ Ese mensaje no lo puedo procesar. Mejor hablemos de construir cosas divertidas 🔨.');
      return;
    }
    this._runIntent(this._detect(text));
  },
  _norm: function (s) {
    return String(s || '').toLowerCase()
      .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n');
  },
  _detect: function (t) {
    const n = this._norm(t);
    if (/(destruy|destroza|borra|rompe|quita|elimina|tumba|demuele)/.test(n)) return { id: 'ONLY_BUILD' };
    if (/(nike|adidas|puma|disney|mario|pokemon|lego|roblox|minecraft|ferrari|coca|pepsi|iphone|samsung|barbie|spider|batman|naruto|goku|fifa|fortnite|tiktok|youtube)/.test(n)) return { id: 'REFUSE_BRAND' };
    if (/crea.{0,12}mundo|mundo nuevo|hasme un mundo|hazme un mundo/.test(n)) return { id: 'CREATE_WORLD' };
    if (/pagar visita|quiero pagar|pago la visita/.test(n)) return { id: 'PAY_VISIT' };
    if (/ganancia/.test(n)) return { id: 'EARNINGS' };
    if (/llevame/.test(n)) return { id: 'GUIDE', to: n };
    if (/ayuda|como se juega|que puedes hacer|comandos|que sabes/.test(n)) return { id: 'HELP' };
    if (/chiste/.test(n)) return { id: 'JOKE' };
    if (/^hola|^buenas|^hey/.test(n)) return { id: 'HELLO' };
    if (/gracias/.test(n)) return { id: 'THANKS' };
    if (/volcan|lava/.test(n)) return { id: 'BUILD', p: 'VOLCAN' };
    if (/lago|piscina|alberca/.test(n)) return { id: 'BUILD', p: 'LAGO' };
    if (/nadar|nado|agua/.test(n)) return { id: 'SWIM_INFO' };
    if (/casa|hogar|casita/.test(n)) return { id: 'BUILD', p: 'CASA' };
    if (/tienda|negocio/.test(n)) return { id: 'BUILD', p: 'TIENDA' };
    if (/parque|jardin/.test(n)) return { id: 'BUILD', p: 'PARQUE' };
    if (/circuito|adrenalina|carrera/.test(n)) return { id: 'BUILD', p: 'CIRCUITO' };
    if (/puente/.test(n)) return { id: 'BUILD', p: 'PUENTE' };
    if (/torre|edificio|rascacielos/.test(n)) return { id: 'BUILD', p: 'TORRE' };
    if (/calle|carretera|avenida/.test(n)) return { id: 'BUILD', p: 'CALLE' };
    return { id: 'FALLBACK' };
  },
  _runIntent: function (it) {
    it = it || { id: 'FALLBACK' };
    if (it.id === 'ONLY_BUILD') {
      this.say('Solo construyo, no destruyo 🔨. Dime qué quieres que te construya: ¿una casa, un parque, un volcán?');
      return;
    }
    if (it.id === 'REFUSE_BRAND') {
      this.say('Solo hago diseños originales GEAYI 🎨, nada copiado. ¿Te armo algo original y divertido?');
      return;
    }
    if (it.id === 'CREATE_WORLD') { WorldEconomy.createWorld(); return; }
    if (it.id === 'PAY_VISIT') {
      const w = WorldEconomy.worldUnder();
      if (w && !w.mine) { if (WorldEconomy.payVisit(w)) this._pendingVisit = null; }
      else this.say('Párate en el mundo que quieres visitar 🌍 y di "pagar visita".');
      return;
    }
    if (it.id === 'EARNINGS') {
      WorldEconomy._ensure();
      const g = (typeof SAVE !== 'undefined' && SAVE.creatorEarnings) || 0;
      this.say('💰 Has ganado ' + g + '🪙 de visitantes en tus mundos. ¡Sigue creando mundos divertidos! 🌍');
      return;
    }
    if (it.id === 'GUIDE') { this._guideTo(it.to || ''); return; }
    if (it.id === 'HELP') {
      this.say('Puedo construir en tu mundo: 🏠 casa, 🏪 tienda, 🌳 parque, 🛣️ calle, 🌉 puente, 🗼 torre, 🎢 circuito, 🌋 volcán y 🏖️ lago para nadar. Útil: "crear mundo" (' + WorldEconomy.priceText() + '), "mis ganancias", "llévame a mi lote" y "cuéntame un chiste" 😄.');
      return;
    }
    if (it.id === 'JOKE') {
      const J = [
        '¿Qué hace una abeja en el gimnasio? ¡Zum-ba! 🐝',
        '¿Qué le dice un techo a otro techo? ¡Techo de menos! 🏠',
        '¿Cuál es el colmo de un constructor? ¡Que le falte un bloque! 🧱',
        '¿Por qué el mar no se seca? ¡Porque tiene muchas olas que lo saludan! 🌊',
        '¿Qué hace un bloque en una fiesta? ¡Se pone a bailar el block-block! 🎉',
        '¿Cómo se despiden los volcanes? ¡Lava-nos! 🌋',
      ];
      this.say(J[Math.floor(Math.random() * J.length)]);
      return;
    }
    if (it.id === 'HELLO') {
      this.say('¡Hola! 👋 Soy el Agente GEAYI. ¿Qué construimos hoy? Prueba: "hazme una casa" 🔨.');
      return;
    }
    if (it.id === 'THANKS') { this.say('¡De nada! 😊 Construir contigo es divertido. ¿Qué más hacemos?'); return; }
    if (it.id === 'SWIM_INFO') {
      this.say('¡A nadar! 🏊 Pídeme "hazme un lago" y lo construyo en tu mundo. Dentro del agua muévete con el joystick y salta para subir. Tienes 30 segundos de aire 🫁: ¡sal a respirar a tiempo!');
      return;
    }
    if (it.id === 'BUILD') { this._build(it.p); return; }
    this.say('Puedo construir: 🏠 casa, 🏪 tienda, 🌳 parque, 🛣️ calle, 🌉 puente, 🗼 torre, 🎢 circuito, 🌋 volcán o 🏖️ lago. ¿Cuál quieres? 🔨');
  },
  _guideTo: function (n) {
    let target = null;
    try {
      if (/lote|mundo/.test(n) && typeof LotSystem !== 'undefined' && typeof LEVEL !== 'undefined' && LEVEL) {
        const defs = LotSystem.lotsFor(LEVEL.idx) || [];
        let best = null, bd = Infinity;
        for (const d of defs) {
          if (!LotSystem.isOwned(LEVEL.idx, d.id)) continue;
          const dd = Math.hypot(Player.pos.x - d.x, Player.pos.z - d.z);
          if (dd < bd) { bd = dd; best = d; }
        }
        if (best) target = { x: best.x, z: best.z };
      }
    } catch (e) {}
    if (target) { this._guide = target; this.say('¡Sígueme! Te llevo a tu lote 🧭🤖'); }
    else this.say('Puedo llevarte a tu lote: di "llévame a mi lote" 🧭.');
  },
  /* ---------------- construcción aditiva (nunca borra) ---------------- */
  _build: function (p) {
    const perm = WorldEconomy.canBuild();
    if (!perm.ok) {
      if (perm.reason === 'visit' && perm.world) {
        this._pendingVisit = perm.world;
        this.say('Este mundo es de otro creador 🌍. Para construir aquí paga 25🪙 al creador: di "pagar visita".');
      } else {
        this.say('Para construir párate en tu mundo 🌍. Si aún no tienes uno, di "crear mundo" (cuesta ' + WorldEconomy.priceText() + ').');
      }
      return 0;
    }
    const gen = PREFABS[p];
    if (!gen) { this.say('Ese aún no sé construirlo 🤖. Prueba: casa, parque, volcán…'); return 0; }
    let ox = 0, oz = 0;
    try { ox = Math.round(Player.pos.x); oz = Math.round(Player.pos.z); } catch (e) {}
    const n = this._stamp(perm.key, perm.worldIdx, perm.def, gen(), ox, oz);
    if (n > 0) {
      if (p === 'LAGO') this._registerWater(perm, ox, oz);
      this.say(PREFAB_OK[p] || ('¡Listo! Coloqué ' + n + ' bloques 🔨'));
      try { if (typeof Audio2 !== 'undefined' && Audio2.build) Audio2.build(); } catch (e) {}
    }
    return n;
  },
  /* coloca bloques SOLO sumando: jamás quita los que ya existen */
  _stamp: function (key, worldIdx, def, blocks, ox, oz) {
    try {
      if (typeof LotSystem === 'undefined' || !def) return 0;
      const cur = LotSystem.getBlocks(worldIdx, def.id) || [];
      const add = [];
      for (const b of blocks) {
        add.push({
          s: 'cube', c: String(b.c || '#ff9d00').slice(0, 16),
          x: Math.round(ox + b.x), y: Math.max(0, Math.min(14, Math.round(b.y))), z: Math.round(oz + b.z),
          r: 0, lava: !!b.lava,
        });
      }
      if (cur.length + add.length > 400) {
        this.say('🚧 Tu lote está lleno (400 bloques). Entra a 🧱 Construir, guarda espacio y seguimos.');
        return 0;
      }
      const merged = cur.concat(add.map(a => ({ s: a.s, c: a.c, x: a.x, y: a.y, z: a.z, r: a.r })));
      if (!LotSystem._saveBlocks(worldIdx, def.id, merged)) return 0;
      const gy = def.groundY || 0;
      const x0 = def.x - def.w / 2, x1 = def.x + def.w / 2 - 1;
      const z0 = def.z - def.d / 2, z1 = def.z + def.d / 2 - 1;
      const lavaPts = [];
      let placed = 0;
      for (const a of add) {
        if (a.x < x0 || a.x > x1 || a.z < z0 || a.z > z1) continue; // fuera del lote: no se pone
        if (a.lava) { lavaPts.push({ x: a.x, y: gy + a.y, z: a.z }); this._spawnLava(a.x, gy + a.y, a.z); }
        else this._spawnQueue.push({ worldIdx: worldIdx, lotId: def.id, gy: gy, a: a }); // 🧱 aparece poco a poco
        placed++;
      }
      if (lavaPts.length) { // la lava queda anotada en el mundo (rebota, sin daño)
        WorldEconomy._ensure();
        try {
          const rec = SAVE.worlds[key];
          if (rec) {
            if (!Array.isArray(rec.lava)) rec.lava = [];
            for (const L of lavaPts) rec.lava.push(L);
            persist();
          }
        } catch (e) {}
        for (const L of lavaPts) this._lava.push(L);
      }
      return placed;
    } catch (e) { return 0; }
  },
  /* 🧱 Pase Constructor: el agente construye más rápido (más bloques por cuadro) */
  _buildBatch: function () {
    try { if (typeof Shop2 !== 'undefined' && typeof Shop2.hasPass === 'function' && Shop2.hasPass('constructor')) return 120; } catch (e) {}
    return 12;
  },
  _drainQueue: function () {
    try {
      if (typeof LEVEL === 'undefined' || !LEVEL || !LEVEL.group) return;
      let n = this._buildBatch();
      while (n-- > 0 && this._spawnQueue.length) {
        const j = this._spawnQueue[0];
        // si cambió de nivel, se descartan los pendientes (los datos ya están en SAVE)
        if (LEVEL.idx == null || j.worldIdx !== LEVEL.idx) { this._spawnQueue.shift(); continue; }
        this._spawnQueue.shift();
        this._spawnBlock(j.worldIdx, j.lotId, j.gy, j.a);
      }
    } catch (e) {}
  },
  _spawnBlock: function (worldIdx, lotId, gy, b) {
    try {
      if (typeof LEVEL === 'undefined' || !LEVEL || !LEVEL.group) return;
      if (typeof THREE === 'undefined') return;
      let mesh;
      if (typeof bmShapeGeo === 'function' && typeof bmMat === 'function') {
        mesh = new THREE.Mesh(bmShapeGeo('cube'), bmMat(b.c));
        mesh.position.set(b.x, gy + b.y + 0.5, b.z);
      } else {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial({ color: b.c, roughness: 0.8 }));
        mesh.position.set(b.x, gy + b.y + 0.5, b.z);
      }
      mesh.userData.lotBlock = lotId;
      LEVEL.group.add(mesh);
      if (Array.isArray(LEVEL.platforms)) LEVEL.platforms.push({
        x: b.x, z: b.z, topY: gy + b.y + 1, w: 1, h: 1, d: 1,
        kind: 'wall', solid: true, lotTag: worldIdx + ':' + lotId,
      });
    } catch (e) {}
  },
  _spawnLava: function (x, y, z) { // 🔥 visual caliente, SIN colisión: solo rebota
    try {
      if (typeof THREE === 'undefined' || typeof LEVEL === 'undefined' || !LEVEL || !LEVEL.group) return;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.5, 0.96),
        new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.9, roughness: 0.4 }));
      m.position.set(x, y + 0.25, z);
      LEVEL.group.add(m);
    } catch (e) {}
  },
  _registerWater: function (perm, ox, oz) {
    try {
      const gy = perm.def.groundY || 0;
      const zn = { x0: ox - 4, x1: ox + 3, z0: oz - 3, z1: oz + 2, y: gy + 1.9 }; // superficie honda: la cabeza queda bajo el agua
      WorldEconomy._ensure();
      const rec = SAVE.worlds[perm.key];
      if (rec) {
        if (!Array.isArray(rec.water)) rec.water = [];
        rec.water.push(zn);
        persist();
      }
      WATER_ZONES.push(zn);
      this._spawnWater(zn);
    } catch (e) {}
  },
  _spawnWater: function (zn) {
    try {
      if (typeof THREE === 'undefined' || typeof LEVEL === 'undefined' || !LEVEL || !LEVEL.group) return;
      const w = zn.x1 - zn.x0 + 1, d = zn.z1 - zn.z0 + 1;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshStandardMaterial({ color: 0x00a2ff, transparent: true, opacity: 0.62, roughness: 0.25 })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set((zn.x0 + zn.x1) / 2, zn.y, (zn.z0 + zn.z1) / 2);
      LEVEL.group.add(m);
      this._waterMeshes.push(m);
    } catch (e) {}
  },
  /* ---------------- robot 3D (diseño original GEAYI) ---------------- */
  _buildRobot: function () {
    if (this._robot) return;
    try {
      if (typeof THREE === 'undefined' || typeof scene === 'undefined') return;
      const g = new THREE.Group();
      const mBody = new THREE.MeshStandardMaterial({ color: 0x00c2a8, roughness: 0.45, metalness: 0.25 });
      const mDark = new THREE.MeshStandardMaterial({ color: 0x14343a, roughness: 0.6 });
      const mEye = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const mPup = new THREE.MeshStandardMaterial({ color: 0x10222b, roughness: 0.4 });
      const mGlow = new THREE.MeshStandardMaterial({ color: 0xffe95e, emissive: 0xffb400, emissiveIntensity: 1 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.8, 0.5), mBody);
      body.position.y = 0.75; g.add(body);
      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.12, 0.54), mDark);
      belt.position.y = 0.45; g.add(belt);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), mBody);
      head.position.y = 1.42; g.add(head);
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mEye);
        eye.position.set(s * 0.13, 1.46, 0.28); g.add(eye);
        const pup = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mPup);
        pup.position.set(s * 0.13, 1.46, 0.36); g.add(pup);
      }
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), mDark);
      ant.position.y = 1.85; g.add(ant);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mGlow);
      tip.position.y = 2.02; g.add(tip); this._tip = tip;
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.55, 8), mBody);
        arm.position.set(s * 0.48, 0.8, 0); arm.rotation.z = s * 0.5; g.add(arm);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mGlow);
        hand.position.set(s * 0.62, 0.62, 0); g.add(hand);
      }
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.16, 16), mDark);
      disc.position.y = 0.12; g.add(disc);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 8, 20), mGlow);
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.12; g.add(ring);
      g.visible = false;
      scene.add(g);
      this._robot = g;
    } catch (e) {}
  },
  _setRobotVisible: function (v) {
    try {
      this._buildRobot();
      if (!this._robot) return;
      if (v && !this._placed) {
        try { this._robot.position.set(Player.pos.x, Player.pos.y + 1.5, Player.pos.z); } catch (e) {}
        this._placed = true;
      }
      this._robot.visible = !!v;
    } catch (e) {}
  },
  /* lava: rebota al jugador con mensaje tierno (sin daño) */
  _lavaCheck: function () {
    try {
      if (!this._lava || !this._lava.length) return;
      if (this._lavaCd > 0) return;
      const p = Player.pos;
      for (const L of this._lava) {
        if (Math.abs(p.x - L.x) < 0.8 && Math.abs(p.z - L.z) < 0.8 && Math.abs(p.y - L.y) < 1.4) {
          p.x = p.x + (p.x >= L.x ? 1.6 : -1.6);
          if (Player.vel) Player.vel.y = 7;
          _agToast('🔥 ¡Caliente! Aléjate');
          this.say('🔥 ¡Caliente! Esa lava solo rebota, pero mejor aléjate un poquito 😉.');
          this._lavaCd = 2;
          return;
        }
      }
    } catch (e) {}
  },
  /* recarga lava/agua del mundo al entrar a un nivel */
  _syncLevel: function () {
    try {
      if (typeof LEVEL === 'undefined' || !LEVEL || LEVEL.idx == null) return;
      if (this._visLevel === LEVEL.idx) return;
      this._visLevel = LEVEL.idx;
      this._lava = []; this._lavaCd = 0; WATER_ZONES = [];
      // nota: el grupo del nivel anterior se descarta completo; solo soltamos referencias
      this._waterMeshes = [];
      WorldEconomy._ensure();
      if (typeof SAVE === 'undefined' || !SAVE.worlds) return;
      for (const k of Object.keys(SAVE.worlds)) {
        if (k.indexOf(LEVEL.idx + ':') !== 0) continue;
        const rec = SAVE.worlds[k];
        if (rec && Array.isArray(rec.lava)) for (const L of rec.lava) {
          this._lava.push(L); this._spawnLava(L.x, L.y, L.z);
        }
        if (rec && Array.isArray(rec.water)) for (const zn of rec.water) {
          WATER_ZONES.push(zn); this._spawnWater(zn);
        }
      }
    } catch (e) {}
  },
  /* 📡 si alguien paga visita al creador en la misma sala, avisarle */
  _listenVisits: function () {
    if (this._visitHook) return;
    this._visitHook = true;
    try {
      if (typeof Net === 'undefined' || !Net || !Net.channel || typeof Net.channel.on !== 'function') return;
      Net.channel.on('broadcast', { event: 'gvisit' }, (msg) => {
        try {
          const ev = (msg && msg.payload) || {};
          WorldEconomy._ensure();
          SAVE.creatorEarnings = (SAVE.creatorEarnings || 0) + (ev.amt || 0);
          persist();
          this.say('🎉 ¡Alguien visitó tu mundo ' + (ev.world || '') + ' y pagó ' + (ev.amt || 0) + '🪙! Ya llevas ' + SAVE.creatorEarnings + '🪙 en ganancias 💰.');
          _agToast('🎉 ¡Visita pagada! +' + (ev.amt || 0) + '🪙');
        } catch (e) {}
      });
    } catch (e) {}
  },
  /* ---------------- loop (lo llama game.js) ---------------- */
  update: function (dt) {
    try {
      const inPlay = (typeof MODE !== 'undefined' && MODE === 'play');
      this._setRobotVisible(inPlay && !this.isRobotHidden());
      if (!inPlay) return;
      this._buildRobot();
      this._syncLevel();
      this._listenVisits();
      this._drainQueue(); // 🧱 bloques pendientes del agente
      if (this._lavaCd > 0) this._lavaCd -= Math.max(0, dt || 0);
      if (!this._robot || !this._robot.visible) return;
      const g = this._robot, p = Player.pos;
      let tx, ty, tz;
      if (this._guide) { // 🧭 llevar al jugador: el robot va adelante
        tx = this._guide.x; ty = p.y; tz = this._guide.z;
        const d = Math.hypot(p.x - tx, p.z - tz);
        if (d < 2) { this._guide = null; this.say('¡Llegamos! 🎉 Este es tu lote 🪧. Pídeme qué construimos 🔨.'); }
      } else { // seguir al jugador a 2.2 m, a un lado
        const a = (Player.heading || 0) + 2.4;
        tx = p.x + Math.sin(a) * 2.2; ty = p.y; tz = p.z + Math.cos(a) * 2.2;
      }
      const k = Math.min(1, (dt || 0.016) * 4);
      g.position.x += (tx - g.position.x) * k;
      g.position.z += (tz - g.position.z) * k;
      g.position.y += ((ty + 1.2) - g.position.y) * k;
      try { g.lookAt(p.x, g.position.y, p.z); } catch (e) {}
      this._lavaCheck();
      let now = 0; // 🌊 olas en el agua
      try { now = performance.now() / 1000; } catch (e) {}
      for (const m of this._waterMeshes) {
        try { m.position.y = m.position.y + Math.sin(now * 2 + m.position.x) * 0.002; } catch (e) {}
      }
      if (this._tip && this._tip.material) { // 💡 antena parpadeante
        try {
          const s = 1 + Math.sin(now * 6) * 0.18;
          this._tip.scale.set(s, s, s);
        } catch (e) {}
      }
    } catch (e) {}
  },
};
