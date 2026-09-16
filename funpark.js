/* funpark.js — 🎉 DIVERSIÓN NUEVA (GEAYI — Obby Xtreme 3D)
   4 módulos originales pedidos por el usuario, todo en UN archivo nuevo:
   a) 🏟️ ESTADIO DE FÚTBOL (mundo 4 · Immokalee): partido 3 min, jugador + 4 NPCs
      de la familia vs 5 rivales, pelota con física propia, marcador y trofeo.
   b) 🏝️ PLAYA FLORIDA (mundo 4): arena, mar animado (2 planos, opacity oscilante,
      sin shaders), sombrillas, palmeras y nado familiar (sin oxígeno).
   c) 🚁 HELICÓPTERO VOLABLE (diseño de bloques propio): 1 en el aeropuerto de
      Immokalee + 1 en Ciudad Neón, con helipuerto "H". Usa el patrón de
      vehicles.js (kind:'heli'): botón SUBIR/BAJAR existente + joystick, y
      botones táctiles propios ⬆️⬇️ para subir/bajar. Vuelo lento y estable.
   d) 🎬 CINE GEAYI (1 por ciudad): sala con butacas y pantalla que reproduce una
      película 100% original ("Las Aventuras del Capitán Caramelo", 60 s, animación
      2D en canvas con figuras de bloques). Palomitas 🍿 $5 → boost 30 s.
   REGLAS: no toca archivos existentes; se engancha envolviendo buildLevel()
   (sin editar world.js) y expone FunPark.init/onLevelStart/onLevelEnd/update
   para los hooks de game.js (ver reporte de integración). Sin DOM al cargar. */
'use strict';

/* ================= helpers propios (caché de materiales) ================= */
const _fpMatCache = new Map();
function fpMat(color, emissive, ei) {
  const key = color + '|' + (emissive || 0) + '|' + (ei || 0);
  let m = _fpMatCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color, roughness: 0.7, metalness: 0.08,
      emissive: emissive || 0x000000, emissiveIntensity: ei || 0
    });
    _fpMatCache.set(key, m);
  }
  return m;
}
function fpBox(parent, w, h, d, color, x, y, z, emissive, ei) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fpMat(color, emissive, ei));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function fpTex(w, h, draw) { // textura de canvas simple (sin supersample: barato en móvil)
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  return new THREE.CanvasTexture(c);
}
function fpSignTexture(text, bg, fg, border) {
  return fpTex(512, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = border; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 56px "Trebuchet MS", sans-serif';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}
function fpOk() { // ¿juego listo para lógica de mundo?
  return (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.group &&
    typeof Player !== 'undefined' && Player && Player.pos &&
    typeof MODE !== 'undefined' && MODE === 'play' &&
    (typeof finished === 'undefined' || !finished));
}

/* ================= estado ================= */
const FunPark = {
  _ui: false,
  match: null,        // partido de fútbol activo
  swim: false, _px: 0, _pz: 0, _splashT: 0, _swimToast: false,
  sea: null,          // {m1, m2, t} planos del mar
  cinemas: [],        // cines del nivel actual
  heliLift: 0,        // -1 bajar · +1 subir (botones táctiles del helicóptero)
  _els: {},           // botones/paneles UI
  _sbT: 0,            // throttle del marcador

  /* ---------- ciclo de vida ---------- */
  init() {
    fpEnsureTrophy();
    fpWrapBuild();
    if (this._ui) return;
    this._ui = true;
    const E = this._els;
    const mk = (id, html, css) => {
      const b = document.createElement(id === 'fp-score' ? 'div' : 'button');
      b.id = id;
      b.innerHTML = html;
      b.style.cssText = 'position:fixed;z-index:45;display:none;font-family:inherit;' + css;
      document.body.appendChild(b);
      E[id] = b;
      return b;
    };
    const bigBtn = 'font-size:20px;font-weight:900;padding:14px 22px;border-radius:999px;' +
      'border:4px solid #fff;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.45);';
    // ⚽ botón de partido
    const bm = mk('fp-match', '⚽ JUGAR PARTIDO',
      bigBtn + 'left:14px;bottom:150px;background:linear-gradient(180deg,#35c759,#1e8e3e);');
    bm.addEventListener('click', () => { Audio2.init(); fpMatchStart(); });
    // marcador
    mk('fp-score', '',
      'top:56px;left:50%;transform:translateX(-50%);font-size:19px;font-weight:900;' +
      'background:rgba(0,20,10,.72);color:#fff;padding:8px 18px;border-radius:16px;' +
      'border:3px solid #35c759;text-align:center;white-space:nowrap;');
    // 🚁 subir / bajar (solo volando el helicóptero GEAYI)
    const hb = 'width:68px;height:68px;border-radius:50%;font-size:30px;border:4px solid #fff;' +
      'color:#fff;background:rgba(0,120,200,.82);box-shadow:0 4px 12px rgba(0,0,0,.4);';
    const up = mk('fp-heli-up', '⬆️', hb + 'right:150px;bottom:104px;');
    const dn = mk('fp-heli-dn', '⬇️', hb + 'right:150px;bottom:24px;');
    const hold = (el, v) => {
      const on = e => { e.preventDefault(); Audio2.init(); FunPark.heliLift = v; };
      const off = e => { e.preventDefault(); if (FunPark.heliLift === v) FunPark.heliLift = 0; };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend', off); el.addEventListener('touchcancel', off);
      el.addEventListener('mousedown', on); el.addEventListener('mouseup', off);
      el.addEventListener('mouseleave', off);
    };
    hold(up, 1); hold(dn, -1);
    // 🍿 palomitas + 🚪 salir del cine
    const bp = mk('fp-pop', '🍿 PALOMITAS $5',
      bigBtn + 'right:14px;bottom:206px;background:linear-gradient(180deg,#ff9d00,#c66a00);font-size:18px;');
    bp.addEventListener('click', () => { Audio2.init(); fpBuyPopcorn(); });
    const bx = mk('fp-cine-exit', '🚪 SALIR',
      bigBtn + 'right:14px;bottom:130px;background:linear-gradient(180deg,#5a6a7a,#333d47);font-size:18px;');
    bx.addEventListener('click', () => { Audio2.init(); fpCineExit(); });
  },

  onLevelStart(idx) {
    this.match = null;
    this.swim = false; this._swimToast = false;
    this.heliLift = 0;
    this._sbT = 0;
    if (Player && Player.pos) { this._px = Player.pos.x; this._pz = Player.pos.z; }
    fpHideUI();
  },

  onLevelEnd() {
    fpMatchCleanup();
    this.match = null;
    this.swim = false;
    this.heliLift = 0;
    fpHideUI();
  },

  update(dt) {
    try {
      if (!fpOk()) { return; }
      fpSeaUpdate(dt);
      fpSwimUpdate(dt);
      fpHeliUpdate(dt);
      fpMatchUpdate(dt);
      fpCineUpdate(dt);
      fpUIUpdate();
    } catch (e) { /* nunca romper el loop del juego */ }
  }
};

/* trofeo del partido (registro perezoso y seguro) */
function fpEnsureTrophy() {
  try {
    if (typeof Trophy !== 'undefined' && Trophy && Array.isArray(Trophy.DEFS) &&
      !Trophy.DEFS.some(d => d.id === 'soccer_win')) {
      Trophy.DEFS.push({ id: 'soccer_win', emoji: '⚽', nameKey: 'trophy.soccer', descKey: 'trophy.soccer.d' });
    }
  } catch (e) {}
}

function fpHideUI() {
  const E = FunPark._els;
  ['fp-match', 'fp-score', 'fp-heli-up', 'fp-heli-dn', 'fp-pop', 'fp-cine-exit']
    .forEach(id => { if (E[id]) E[id].style.display = 'none'; });
}

/* ================= a) 🏟️ ESTADIO DE FÚTBOL =================
   Ubicación mundo 4 (Immokalee): centro (30, -95) — zona libre verificada:
   x∈[10,50], z∈[-125,-65]. Lejos del lago (-78,18), la SR 29 (x≈133 a z=-88),
   el aeropuerto (145,-70), el rancho (x≥42,z≥118) y las casas (-40..0,-74). */
const FP_FIELD = { x0: 12, x1: 48, z0: -123, z1: -67, cx: 30, cz: -95 };
const FP_GOAL = { half: 3.6, h: 2.4 }; // media anchura y alto de la portería

function fpBuildStadium(lvl) {
  const g = lvl.group, F = FP_FIELD;
  const cx = F.cx, cz = F.cz;
  // césped de la cancha (visual; el suelo caminable ya existe)
  const turf = new THREE.Mesh(new THREE.BoxGeometry(40, 0.1, 62),
    fpMat(0x2fae4f, 0x0b3a10, 0.25));
  turf.position.set(cx, 0.0, cz); turf.receiveShadow = true; g.add(turf);
  // líneas blancas
  const lineM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const line = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), lineM);
    m.position.set(x, 0.07, z); g.add(m);
  };
  line(36, 0.3, cx, F.z0 + 0.5); line(36, 0.3, cx, F.z1 - 0.5);
  line(0.3, 56, F.x0 + 0.5, cz); line(0.3, 56, F.x1 - 0.5, cz);
  line(36, 0.3, cx, cz); // media cancha
  const circ = new THREE.Mesh(new THREE.TorusGeometry(4, 0.15, 8, 40), lineM);
  circ.rotation.x = Math.PI / 2; circ.position.set(cx, 0.07, cz); g.add(circ);
  // porterías (postes + travesaño + red de bloques)
  [F.z0, F.z1].forEach(gz => {
    const dir = gz === F.z0 ? -1 : 1;
    [-FP_GOAL.half, FP_GOAL.half].forEach(ox => fpBox(g, 0.22, FP_GOAL.h, 0.22, 0xffffff, cx + ox, FP_GOAL.h / 2, gz));
    fpBox(g, FP_GOAL.half * 2 + 0.22, 0.22, 0.22, 0xffffff, cx, FP_GOAL.h, gz);
    const net = new THREE.Mesh(new THREE.BoxGeometry(FP_GOAL.half * 2, FP_GOAL.h, 1.2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
    net.position.set(cx, FP_GOAL.h / 2, gz + dir * 0.7); g.add(net);
  });
  // graderías de bloques a los lados (4 filas, sin colisión: visual)
  [-1, 1].forEach(s => {
    for (let r = 0; r < 4; r++) {
      const col = (r % 2) ? 0x8a94a6 : 0x6b7686;
      fpBox(g, 2.4, 1.0, 58, col, cx + s * (22.5 + r * 2.4), 0.5 + r * 1.0, cz);
    }
  });
  // público de bloques (barato: cajitas de colores)
  const crowdCols = [0xff5533, 0x00a2ff, 0xffe95e, 0xff2fd6, 0x59d867, 0xffffff];
  [-1, 1].forEach(s => {
    for (let i = 0; i < 26; i++) {
      const r = (i * 7) % 4, z = cz - 26 + (i * 53 / 25);
      fpBox(g, 0.7, 0.9, 0.7, crowdCols[(i + (s > 0 ? 3 : 0)) % crowdCols.length],
        cx + s * (22.5 + r * 2.4), 1.45 + r * 1.0, z);
    }
  });
  // 4 torres de luz
  [[8, -128], [52, -128], [8, -62], [52, -62]].forEach(([px, pz]) => {
    fpBox(g, 0.5, 12, 0.5, 0x3a4150, px, 6, pz);
    fpBox(g, 2.2, 1.0, 0.6, 0xfff6b0, px, 12.4, pz, 0xffe95e, 1);
  });
  // letrero del estadio (doble cara, mirando al pueblo)
  g.add(doubleFaceSign(10, 2.4, fpSignTexture('🏟️ ESTADIO GEAYI', '#0d4d1f', '#ffffff', '#35c759'),
    cx, 4.6, -58, 0));
  // pelota (se muestra al empezar el partido)
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10),
    fpMat(0xffffff, 0x888888, 0.15));
  ball.castShadow = true; ball.visible = false;
  ball.position.set(cx, 0.34, cz);
  g.add(ball);
  lvl.fpStadium = { ball, cx, cz };
}

/* --- partido --- */
const FP_HOME_NAMES = ['ian', 'yael', 'audrey', 'esmeralda']; // de FAMILY (solo nombres/estilos)
const FP_AWAY = [ // rivales 100% originales (apodos genéricos, sin marcas)
  { name: 'Rayo', color: '#ff3d5e' }, { name: 'Trueno', color: '#7b2fff' },
  { name: 'Chispa', color: '#00a2ff' }, { name: 'Turbo', color: '#ff9d00' },
  { name: 'Flecha', color: '#59d867' }
];
function fpNpcMesh(name, style) {
  const mesh = createAvatarMesh(style);
  const label = makeNameLabel(name);
  label.position.y = 2.6;
  mesh.add(label);
  return mesh;
}
function fpMatchStart() {
  if (FunPark.match || !fpOk() || LEVEL.idx !== 3) return;
  const lvl = LEVEL, F = FP_FIELD;
  const st = lvl.fpStadium;
  if (!st) return;
  const M = {
    t: 180, home: 0, away: 0, over: false, freeze: 1.6, pkickCd: 0, endT: -1,
    ball: { x: F.cx, y: 0.34, z: F.cz, vx: 0, vy: 0, vz: 0 },
    npcs: []
  };
  // familia: portera Esmeralda + Ian, Yael, Audrey
  const homePos = [[30, -70, true], [22, -85], [38, -85], [30, -100]];
  FP_HOME_NAMES.forEach((id, i) => {
    let style = { body: '#35c759' }, nm = id;
    try {
      const f = getFamilyChar(id);
      if (f) { style = familyStyle(f); nm = f.name || id; }
    } catch (e) {}
    const mesh = fpNpcMesh(nm, style);
    mesh.position.set(homePos[i][0], 0, homePos[i][1]);
    lvl.group.add(mesh);
    M.npcs.push({ mesh, team: 'home', hx: homePos[i][0], hz: homePos[i][1], goalie: !!homePos[i][2], kickCd: 0, x: homePos[i][0], z: homePos[i][1] });
  });
  // rivales: portero Rayo + 4 de campo
  const awayPos = [[30, -120, true], [22, -105], [38, -105], [22, -90], [38, -90]];
  FP_AWAY.forEach((r, i) => {
    const mesh = fpNpcMesh(r.name, { body: r.color });
    mesh.position.set(awayPos[i][0], 0, awayPos[i][1]);
    lvl.group.add(mesh);
    M.npcs.push({ mesh, team: 'away', hx: awayPos[i][0], hz: awayPos[i][1], goalie: !!awayPos[i][2], kickCd: 0, x: awayPos[i][0], z: awayPos[i][1] });
  });
  st.ball.visible = true;
  FunPark.match = M;
  Audio2.check();
  toast('⚽ ¡Empieza el partido! Familia vs Tiburones · 3 minutos · ¡Patea la pelota acercándote!');
  fpScorePaint();
}
function fpMatchCleanup() {
  const M = FunPark.match;
  if (!M) return;
  try {
    for (const n of M.npcs) if (n.mesh && LEVEL && LEVEL.group) LEVEL.group.remove(n.mesh);
    if (LEVEL && LEVEL.fpStadium && LEVEL.fpStadium.ball) LEVEL.fpStadium.ball.visible = false;
  } catch (e) {}
}
function fpScorePaint() {
  const el = FunPark._els['fp-score'];
  if (!el || !FunPark.match) return;
  const M = FunPark.match;
  const mm = Math.floor(M.t / 60), ss = Math.floor(M.t % 60);
  el.textContent = '🏠 FAMILIA ' + M.home + ' · ' + M.away + ' TIBURONES 🦈   ⏱ ' + mm + ':' + String(ss).padStart(2, '0');
}
function fpKickoff(M, first) {
  for (const n of M.npcs) { n.x = n.hx; n.z = n.hz; n.mesh.position.set(n.hx, 0, n.hz); n.kickCd = 0.5; }
  M.ball.x = FP_FIELD.cx; M.ball.z = FP_FIELD.cz; M.ball.y = 0.34;
  M.ball.vx = M.ball.vy = M.ball.vz = 0;
  M.freeze = first ? 1.6 : 1.2;
  if (LEVEL && LEVEL.fpStadium) LEVEL.fpStadium.ball.visible = true;
}
function fpGoal(M, team) {
  if (team === 'home') {
    M.home++;
    toast('⚽ ¡GOOOL DE LA FAMILIA! 🎉');
    try { Audio2.good(); } catch (e) {}
  } else {
    M.away++;
    toast('🦈 Gol de los Tiburones… ¡a remontar!');
    try { Audio2.oops(); } catch (e) {}
  }
  fpScorePaint();
  fpKickoff(M, false);
}
function fpMatchEnd(M) {
  M.over = true; M.endT = 5;
  const P = Player;
  if (M.home > M.away) {
    fpEnsureTrophy();
    try { if (typeof Trophy !== 'undefined') Trophy.unlock('soccer_win'); } catch (e) {}
    toast('🏆 ¡CAMPEONES! La Familia gana ' + M.home + '-' + M.away + ' 🎉');
  } else if (M.home === M.away) {
    toast('🤝 ¡Empate ' + M.home + '-' + M.away + '! Buen partido.');
    try { Audio2.check(); } catch (e) {}
  } else {
    toast('🦈 Ganan los Tiburones ' + M.away + '-' + M.home + '. ¡La revancha te espera!');
    try { Audio2.oops(); } catch (e) {}
  }
  try {
    Particles.burst(P.pos.x, P.pos.y + 2, P.pos.z,
      [0x35c759, 0xffffff, 0xffd23f, 0x00e5ff], 40, 8);
  } catch (e) {}
  fpScorePaint();
}
function fpMatchUpdate(dt) {
  const M = FunPark.match;
  if (!M || !LEVEL || LEVEL.idx !== 3) return;
  const F = FP_FIELD, P = Player;
  const st = LEVEL.fpStadium;
  if (!st) { FunPark.match = null; return; }
  if (M.over) {
    M.endT -= dt;
    if (M.endT <= 0) { fpMatchCleanup(); FunPark.match = null; fpHideUI(); }
    return;
  }
  M.t -= dt;
  if (M.t <= 0) { M.t = 0; fpMatchEnd(M); return; }
  FunPark._sbT -= dt;
  if (FunPark._sbT <= 0) { FunPark._sbT = 0.25; fpScorePaint(); }
  const B = M.ball;
  if (M.freeze > 0) M.freeze -= dt;
  // --- física de la pelota (gravedad + rebote + fricción) ---
  B.vy -= 24 * dt;
  B.x += B.vx * dt; B.y += B.vy * dt; B.z += B.vz * dt;
  if (B.y < 0.34) {
    B.y = 0.34;
    if (B.vy < -1.5) { try { Audio2.land(); } catch (e) {} }
    B.vy *= -0.5; B.vx *= 0.72; B.vz *= 0.72;
    if (Math.abs(B.vy) < 0.8) B.vy = 0;
  }
  if (B.y <= 0.35) { const fr = Math.pow(0.25, dt); B.vx *= fr; B.vz *= fr; }
  const sp = Math.hypot(B.vx, B.vz);
  if (sp < 0.25 && B.y <= 0.35) { B.vx = 0; B.vz = 0; }
  // bandas laterales
  if (B.x < F.x0 + 0.4) { B.x = F.x0 + 0.4; B.vx = Math.abs(B.vx) * 0.6; }
  if (B.x > F.x1 - 0.4) { B.x = F.x1 - 0.4; B.vx = -Math.abs(B.vx) * 0.6; }
  // porterías / línea de fondo
  const inMouth = Math.abs(B.x - F.cx) < FP_GOAL.half && B.y < FP_GOAL.h + 0.3;
  if (B.z < F.z0) {
    if (inMouth) { fpGoal(M, 'home'); return; } // la Familia ataca al norte
    B.z = F.z0; B.vz = Math.abs(B.vz) * 0.6;
  }
  if (B.z > F.z1) {
    if (inMouth) { fpGoal(M, 'away'); return; }
    B.z = F.z1; B.vz = -Math.abs(B.vz) * 0.6;
  }
  st.ball.position.set(B.x, B.y, B.z);
  st.ball.rotation.x += sp * dt * 2; st.ball.rotation.z -= B.vx * dt;
  // --- patada del jugador (acercarse a la pelota) ---
  M.pkickCd = Math.max(0, M.pkickCd - dt);
  if (M.freeze <= 0 && M.pkickCd <= 0 && (!Vehicle || Vehicle.mode === 'none')) {
    const dx = B.x - P.pos.x, dz = B.z - P.pos.z;
    if (dx * dx + dz * dz < 2.1 && B.y < 1.8) {
      const a = P.heading;
      B.vx = Math.sin(a) * 15; B.vz = Math.cos(a) * 15; B.vy = 3.4;
      M.pkickCd = 0.6;
      try {
        Audio2.tone(200, 0.12, 'square', 0.2, 0, 90);
        Particles.burst(B.x, B.y + 0.3, B.z, [0xffffff, 0x35c759], 8, 3);
      } catch (e) {}
    } else if (dx * dx + dz * dz < 0.64) { // no atravesar la pelota: empujarla suave
      const d = Math.max(0.4, Math.hypot(dx, dz));
      B.vx += (dx / d) * 4 * dt * 10; B.vz += (dz / d) * 4 * dt * 10;
    }
  }
  // --- IA simple de los NPCs ---
  for (const n of M.npcs) {
    n.kickCd = Math.max(0, n.kickCd - dt);
    let tx = n.hx, tz = n.hz, spd = 3.2;
    if (M.freeze <= 0) {
      if (n.goalie) {
        tx = Math.max(F.cx - 3.2, Math.min(F.cx + 3.2, B.x));
        tz = n.team === 'home' ? F.z1 - 1.6 : F.z0 + 1.6;
        spd = 4.5;
      } else {
        // el más cercano de cada equipo (sin portero) persigue la pelota
        let chaser = null, bd = 1e9;
        for (const o of M.npcs) {
          if (o.team !== n.team || o.goalie) continue;
          const d = Math.hypot(o.x - B.x, o.z - B.z);
          if (d < bd) { bd = d; chaser = o; }
        }
        if (chaser === n) { tx = B.x; tz = B.z; spd = 5.4; }
      }
    }
    const dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz);
    if (d > 0.25) {
      const step = Math.min(d, spd * dt);
      n.x += dx / d * step; n.z += dz / d * step;
      n.mesh.rotation.y = Math.atan2(dx, dz);
    }
    n.x = Math.max(F.x0 + 1, Math.min(F.x1 - 1, n.x));
    n.z = Math.max(F.z0 + 1, Math.min(F.z1 - 1, n.z));
    n.mesh.position.set(n.x, 0, n.z);
    try { animateAvatarMesh(n.mesh, dt, Math.min(6, d * 3), true); } catch (e) {}
    // patada de NPC
    if (M.freeze <= 0 && n.kickCd <= 0) {
      const bdx = B.x - n.x, bdz = B.z - n.z;
      if (bdx * bdx + bdz * bdz < 2.9 && B.y < 1.8) {
        const gz = n.team === 'home' ? F.z0 : F.z1; // cada equipo ataca su fondo
        const gx = F.cx + (Math.random() * 5 - 2.5);
        const gd = Math.max(1, Math.hypot(gx - B.x, gz - B.z));
        B.vx = (gx - B.x) / gd * 13; B.vz = (gz - B.z) / gd * 13; B.vy = 2.4;
        n.kickCd = 1.0;
        try { Audio2.tone(220, 0.1, 'square', 0.16, 0, 110); } catch (e) {}
      }
    }
  }
}

/* ================= b) 🏝️ PLAYA FLORIDA (nado familiar) =================
   Ubicación mundo 4: arena centro (-175, 185) de 50×40 (top y=0.06);
   mar x∈[-200,-150], z∈[205,231] con fondo del mapa a y=-0.02.
   Zona libre: el cultivo más cercano (lechuga -128,190) empieza en x=-142;
   la casa rural (-160,-60) queda lejos (z=-60). */
const FP_SEA = { x0: -200, x1: -150, z0: 205, z1: 231 };

function fpBuildBeach(lvl) {
  const g = lvl.group;
  // arena (sólida, top y=0.06: se camina sobre ella)
  addPlatform(lvl, -175, 0.06, 185, 50, 40, { color: 0xf2e0a8, emissive: 0x8a6f3a });
  // mar: 2 planos transparentes, opacidad oscilante en update (sin shaders)
  const mkSea = (y, color, op) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(50, 26),
      new THREE.MeshStandardMaterial({
        color, transparent: true, opacity: op, roughness: 0.25, metalness: 0.1,
        emissive: color, emissiveIntensity: 0.18
      }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(-175, y, 218);
    g.add(m);
    return m;
  };
  FunPark.sea = { m1: mkSea(0.12, 0x00a8e0, 0.5), m2: mkSea(0.17, 0x4fd8ff, 0.62), t: Math.random() * 10 };
  // sombrillas (3)
  const umbCols = [0xff3d5e, 0x00a2ff, 0xffd23f];
  [[-190, 176], [-172, 192], [-158, 180]].forEach(([ux, uz], i) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), fpMat(0x8a6f3a));
    pole.position.set(ux, 1.2, uz); g.add(pole);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.9, 10), fpMat(umbCols[i], umbCols[i], 0.25));
    cone.position.set(ux, 2.6, uz); cone.castShadow = true; g.add(cone);
  });
  // palmeras en la orilla (usa el generador del juego)
  try {
    makePalm(-192, 168, 0.9, g); makePalm(-158, 168, 1.0, g);
    makePalm(-185, 200, 0.85, g); makePalm(-165, 200, 0.95, g);
  } catch (e) {}
  // letrero de la playa
  g.add(doubleFaceSign(9, 2.2, fpSignTexture('🏝️ PLAYA GEAYI', '#0a6aa8', '#ffffff', '#4fd8ff'),
    -158, 3.4, 166, Math.PI / 4));
  // pelotas playeras decorativas
  [[-180, 178, 0xff3d5e], [-168, 188, 0xffd23f]].forEach(([bx, bz, col]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), fpMat(col, col, 0.3));
    b.position.set(bx, 0.56, bz); b.castShadow = true; g.add(b);
  });
}

function fpSeaUpdate(dt) {
  const s = FunPark.sea;
  if (!s || !s.m1) return;
  s.t += dt;
  s.m1.material.opacity = 0.42 + 0.22 * Math.sin(s.t * 1.7);
  s.m2.material.opacity = 0.68 - 0.22 * Math.sin(s.t * 1.7);
}

/* nado: se aplica DESPUÉS de updatePlayer (sin tocar player.js):
   - el avance a velocidad normal se anula y se reemplaza por nado lento (3.6),
   - el avatar se hunde visualmente 0.42 (chapuzón), sin animación de ahogo,
   - no hay barra de oxígeno ni daño: 100% familiar. */
function fpSwimUpdate(dt) {
  const P = Player, FP = FunPark, S = FP_SEA;
  const inSea = LEVEL.idx === 3 && (!Vehicle || Vehicle.mode === 'none') &&
    P.pos.x > S.x0 && P.pos.x < S.x1 && P.pos.z > S.z0 && P.pos.z < S.z1;
  if (inSea) {
    // 1) anular el avance que updatePlayer ya aplicó este cuadro
    const dx = P.pos.x - FP._px, dz = P.pos.z - FP._pz;
    P.pos.x -= dx; P.pos.z -= dz;
    // 2) avance de nado lento con la dirección del joystick
    const hs = Math.hypot(P.vel.x, P.vel.z);
    if (hs > 0.4) {
      const SP = 3.6;
      P.pos.x += P.vel.x / hs * SP * dt;
      P.pos.z += P.vel.z / hs * SP * dt;
      P.heading = Math.atan2(P.vel.x, P.vel.z);
      FP._splashT -= dt;
      if (FP._splashT <= 0 && hs > 1.2) {
        FP._splashT = 0.16;
        try {
          Particles.spawn(P.pos.x, 0.25, P.pos.z, {
            n: 3, colors: [0xffffff, 0x9fd8ff, 0x4fd8ff], speed: 2, up: 2.2,
            life: 0.55, size: 0.42, spread: 0.9, grav: 6
          });
        } catch (e) {}
      }
    }
    P.vel.x *= 0.1; P.vel.z *= 0.1;
    // 3) chapuzón visual (syncMesh ya posicionó el avatar: se compensa para render)
    try { if (typeof Avatar !== 'undefined' && Avatar.group) Avatar.group.position.y -= 0.42; } catch (e) {}
    if (!FP._swimToast) {
      FP._swimToast = true;
      toast('🏊 ¡Al agua! Nada despacio con el joystick · zona familiar 💙');
    }
    FP.swim = true;
  } else {
    FP.swim = false; FP._swimToast = false;
  }
  FP._px = P.pos.x; FP._pz = P.pos.z;
}

/* ================= c) 🚁 HELICÓPTERO VOLABLE =================
   Diseño de bloques 100% propio ("GEAYI"). Se registra en LEVEL.cars con
   kind:'heli' para reutilizar el sistema de vehicles.js (SUBIR con prompt
   automático, vuelo con joystick/WASD, turbo con SALTAR, descenso seguro).
   Ubicaciones: helipuerto (132, -88) en el aeropuerto de Immokalee
   (pista en x=145, terminal en 155 — zona libre) y (-4, -6) en Ciudad Neón
   (franja central, junto a la pista de aviones de (10,10), sin tapar el
   estacionamiento de (15,-6) ni la senda de peatones de x=-5.8). */
function fpBuildHeliMesh() {
  const g = new THREE.Group();
  const TEAL = 0x00b3a6;
  // patines
  [-0.7, 0.7].forEach(x => {
    fpBox(g, 0.14, 0.14, 2.6, 0x2a2f3a, x, 0.07, 0);
    fpBox(g, 0.12, 0.55, 0.12, 0x2a2f3a, x, 0.4, 0.7);
    fpBox(g, 0.12, 0.55, 0.12, 0x2a2f3a, x, 0.4, -0.7);
  });
  // cabina de bloques
  fpBox(g, 1.5, 1.05, 2.1, TEAL, 0, 0.95, 0, TEAL, 0.35);
  fpBox(g, 1.56, 0.4, 1.6, 0xffffff, 0, 1.6, -0.1); // techo blanco
  fpBox(g, 1.3, 0.62, 0.55, 0x9fd8ff, 0, 1.05, 1.1, 0x9fd8ff, 0.5); // parabrisas
  fpBox(g, 0.1, 0.5, 1.2, 0x9fd8ff, 0.78, 1.05, 0, 0x9fd8ff, 0.5); // ventanas laterales
  fpBox(g, 0.1, 0.5, 1.2, 0x9fd8ff, -0.78, 1.05, 0, 0x9fd8ff, 0.5);
  // emblema GEAYI en los costados
  try {
    addGeayiBadge(g, 0.77, 1.0, 0, Math.PI / 2, 1.3, 0.5);
    addGeayiBadge(g, -0.77, 1.0, 0, -Math.PI / 2, 1.3, 0.5);
  } catch (e) {}
  // cola
  fpBox(g, 0.34, 0.34, 2.8, TEAL, 0, 1.2, -2.3, TEAL, 0.35);
  fpBox(g, 0.12, 1.0, 0.55, 0xffffff, 0, 1.7, -3.5);
  fpBox(g, 1.1, 0.12, 0.5, TEAL, 0, 1.35, -3.5, TEAL, 0.35);
  // rotor trasero (animado)
  const tailR = new THREE.Group();
  tailR.position.set(0.12, 1.7, -3.55);
  fpBox(tailR, 0.08, 1.1, 0.14, 0x2a2f3a, 0, 0, 0);
  fpBox(tailR, 0.08, 0.14, 1.1, 0x2a2f3a, 0, 0, 0);
  g.add(tailR);
  g.userData.tailRotor = tailR;
  // rotor principal (animado)
  fpBox(g, 0.3, 0.5, 0.3, 0x2a2f3a, 0, 2.0, -0.1);
  const rotor = new THREE.Group();
  rotor.position.set(0, 2.28, -0.1);
  fpBox(rotor, 5.0, 0.09, 0.34, 0x2a2f3a, 0, 0, 0);
  fpBox(rotor, 0.34, 0.09, 5.0, 0x2a2f3a, 0, 0, 0);
  fpBox(rotor, 0.5, 0.18, 0.5, 0xffd23f, 0, 0, 0, 0xffd23f, 0.6);
  g.add(rotor);
  g.userData.rotor = rotor;
  return g;
}

function fpAddHeli(lvl, x, y, z, heading) {
  const g = lvl.group;
  // helipuerto: disco + anillo amarillo + H blanca
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 3.9, 0.32, 24), fpMat(0x2e3440));
  pad.position.set(x, y + 0.16, z); pad.receiveShadow = true; g.add(pad);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.14, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xffd23f }));
  ring.rotation.x = Math.PI / 2; ring.position.set(x, y + 0.34, z); g.add(ring);
  const hm = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [[-0.5, 0], [0.5, 0]].forEach(([ox]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 2.2), hm);
    p.position.set(x + ox, y + 0.34, z); g.add(p);
  });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.5), hm);
  bar.position.set(x, y + 0.34, z); g.add(bar);
  // poste con letrero
  fpBox(g, 0.25, 3.4, 0.25, 0x3a4150, x + 4.4, y + 1.7, z + 3.2);
  g.add(doubleFaceSign(6, 1.6, fpSignTexture('🚁 HELIPUERTO', '#0a3a5c', '#ffffff', '#00e5ff'),
    x + 4.4, y + 4.2, z + 3.2, Math.PI / 4));
  // el helicóptero
  const mesh = fpBuildHeliMesh();
  mesh.position.set(x, y + 0.34, z);
  mesh.rotation.y = heading || 0;
  g.add(mesh);
  // registro compatible con vehicles.js (kind:'heli' → abordable con SUBIR)
  if (typeof VEHICLE_TYPES !== 'undefined' && !VEHICLE_TYPES['geayi-funcopter']) {
    VEHICLE_TYPES['geayi-funcopter'] = {
      name: 'Helicóptero GEAYI 🚁', emoji: '🚁',
      maxSpeed: 10, accel: 8, seatY: 0.55
    };
  }
  lvl.cars.push({
    kind: 'heli', vtype: 'geayi-funcopter', mesh,
    x, y: y + 0.34, z,
    taken: false, busy: false, landing: false,
    heading: heading || 0,
    fc: { cruise: 8, turbo: 5, yaw: 1.15, pitch: 0.42, minY: 1.7, maxY: 42 },
    rideY: 0, seatY: 0.55
  });
}

/* botones táctiles ⬆️⬇️ del helicóptero GEAYI (complementan joystick/WASD) */
function fpHeliUpdate(dt) {
  if (FunPark.heliLift === 0) return;
  try {
    if (typeof Vehicle === 'undefined' || Vehicle.mode !== 'heli') return;
    const def = Vehicle.def;
    if (!def || def.vtype !== 'geayi-funcopter') return;
    const fc = def.fc || {};
    const minY = fc.minY != null ? fc.minY : 1.7;
    const maxY = fc.maxY != null ? fc.maxY : 42;
    if (Vehicle.pPos) {
      Vehicle.pPos.y = Math.max(minY, Math.min(maxY, Vehicle.pPos.y + FunPark.heliLift * 7 * dt));
    }
  } catch (e) {}
}

/* ================= d) 🎬 CINE GEAYI (1 por ciudad) =================
   Sala física en el mundo: butacas, pantalla grande y película original de
   60 s ("Las Aventuras del Capitán Caramelo") animada en canvas.
   Coordenadas (puerta mirando al oeste, zona libre verificada):
   - Ciudad Neón (0): (30, -8) · resto de ciudades (1,2,4,5,6,7,8): (24, -8)
   - Immokalee (3): (100, 30) */
function fpNewMovie() {
  const c = document.createElement('canvas');
  c.width = 480; c.height = 270;
  const mv = { canvas: c, ctx: c.getContext('2d'), tex: new THREE.CanvasTexture(c), t: Math.random() * 60, last: -1, _poster: false };
  fpDrawMovie(mv); // primer cuadro para que la pantalla no nazca negra
  return mv;
}
/* --- personajes y utilidades de la película (bloques 2D) --- */
function fpHero(g, x, y, s) { // el Capitán Caramelo, y = pies
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#5a3a1e'; g.fillRect(-13, -20, 10, 20); g.fillRect(3, -20, 10, 20);
  g.fillStyle = '#1a3a8f'; g.fillRect(-15, -54, 30, 36);
  g.fillStyle = '#ffd23f'; g.fillRect(-15, -40, 30, 6);
  g.fillStyle = '#f3c9a2'; g.fillRect(-11, -74, 22, 22);
  g.fillStyle = '#222'; g.fillRect(-6, -66, 5, 5); g.fillRect(2, -66, 5, 5);
  g.fillStyle = '#7a4a21'; g.fillRect(-11, -58, 22, 6);
  g.fillStyle = '#ffffff'; g.fillRect(-13, -94, 26, 20);
  g.fillStyle = '#e63946';
  for (let i = 0; i < 4; i++) g.fillRect(-13 + i * 7, -94, 3.5, 20);
  g.restore();
}
function fpShip(g, x, y, s, tilt) {
  g.save(); g.translate(x, y); g.rotate(tilt || 0); g.scale(s, s);
  g.fillStyle = '#7a4a21'; g.fillRect(-60, -24, 120, 26);
  g.fillStyle = '#5a3a1e'; g.fillRect(-52, 2, 104, 8);
  g.fillStyle = '#8a5a2e'; g.fillRect(-6, -90, 12, 68);
  g.fillStyle = '#ffffff'; g.fillRect(6, -88, 46, 56);
  g.fillStyle = '#e63946'; g.fillRect(6, -88, 46, 12);
  g.fillStyle = '#ffd23f'; g.fillRect(-70, -46, 12, 12);
  g.restore();
}
function fpPalm2d(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#7a4a21'; g.fillRect(-5, -60, 10, 60);
  g.fillStyle = '#35c759';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.5;
    g.fillRect(-5 + Math.cos(a) * 26, -60 + Math.sin(a) * 18, 26, 8);
  }
  g.restore();
}
function fpSub(g, txt) {
  g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(0, 226, 480, 44);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '20px "Trebuchet MS", sans-serif';
  g.fillText(txt, 240, 249);
}
function fpSky(g, top, bot) {
  const gr = g.createLinearGradient(0, 0, 0, 200);
  gr.addColorStop(0, top); gr.addColorStop(1, bot);
  g.fillStyle = gr; g.fillRect(0, 0, 480, 200);
}
function fpDrawMovie(mv) {
  const g = mv.ctx, t = mv.t, W = 480;
  const scene = Math.floor(t / 10) % 6, lt = t % 10;
  g.clearRect(0, 0, W, 270);
  if (scene === 0) { // 1 · zarpa el capitán
    fpSky(g, '#4fa8ff', '#bfe8ff');
    g.fillStyle = '#ffe95e'; g.fillRect(392, 22, 46, 46);
    g.fillStyle = '#0a6aa8'; g.fillRect(0, 180, W, 46);
    g.fillStyle = '#4fd8ff';
    for (let i = 0; i < 8; i++) g.fillRect(((i * 90 + t * 40) % 520) - 20, 192 + (i % 3) * 10, 46, 6);
    fpShip(g, 240, 178 + Math.sin(t * 2) * 4, 1, Math.sin(t * 1.3) * 0.05);
    fpHero(g, 240, 168 + Math.sin(t * 2) * 4, 0.85);
    fpSub(g, 'El Capitán Caramelo zarpa en busca del Tesoro Dulce…');
  } else if (scene === 1) { // 2 · la tormenta
    fpSky(g, '#1a2340', '#3a4a6a');
    g.fillStyle = '#2a3450';
    for (let i = 0; i < 5; i++) g.fillRect(((i * 130 + t * 30) % 520) - 20, 30 + (i % 2) * 40, 110, 26);
    if (lt % 2 < 0.25) { g.fillStyle = 'rgba(255,255,220,.85)'; g.fillRect(0, 0, W, 200); }
    g.strokeStyle = 'rgba(160,200,255,.8)'; g.lineWidth = 2;
    for (let i = 0; i < 42; i++) {
      const rx = (i * 97 + t * 420) % 500 - 10, ry = (i * 53 + t * 720) % 230;
      g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 6, ry + 14); g.stroke();
    }
    g.fillStyle = '#0a2a4a'; g.fillRect(0, 180, W, 46);
    fpShip(g, 240, 186, 1, Math.sin(t * 6) * 0.16);
    fpSub(g, '¡Tormenta a la vista! ¡Aguanta, capitán!');
  } else if (scene === 2) { // 3 · la isla dulce
    fpSky(g, '#4fa8ff', '#bfe8ff');
    g.fillStyle = '#ffe95e'; g.fillRect(60, 22, 46, 46);
    g.fillStyle = '#0a6aa8'; g.fillRect(0, 190, W, 36);
    g.fillStyle = '#f2e0a8';
    g.beginPath(); g.ellipse(240, 210, 150, 34, 0, 0, Math.PI * 2); g.fill();
    fpPalm2d(g, 330, 205, 1);
    g.fillStyle = '#e63946';
    for (let i = 0; i < 6; i++) g.fillRect(150 + i * 22, 196 + (i % 2) * 6, 12, 12); // caramelos
    fpHero(g, 70 + (lt / 10) * 300, 200, 0.9);
    fpSub(g, '¡Tierra! Una isla hecha de caramelo…');
  } else if (scene === 3) { // 4 · el mapa
    g.fillStyle = '#2a1a0a'; g.fillRect(0, 0, W, 270);
    g.fillStyle = '#e8cf9a'; g.fillRect(90, 30, 300, 170);
    g.strokeStyle = '#8a6f3a'; g.lineWidth = 6; g.strokeRect(90, 30, 300, 170);
    g.fillStyle = '#7a4a21';
    const dots = Math.floor(lt * 4);
    for (let i = 0; i <= dots && i < 16; i++) {
      const px = 120 + i * 16, py = 120 + Math.sin(i * 0.9) * 40;
      g.beginPath(); g.arc(px, py, 5, 0, Math.PI * 2); g.fill();
    }
    const xp = 1 + Math.sin(t * 5) * 0.12;
    g.save(); g.translate(360, 100); g.scale(xp, xp);
    g.fillStyle = '#e63946'; g.font = '900 44px "Trebuchet MS", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('X', 0, 0);
    g.restore();
    fpHero(g, 240, 236, 0.62);
    fpSub(g, 'El mapa marca el tesoro con una X roja.');
  } else if (scene === 4) { // 5 · el tesoro
    g.fillStyle = '#140a20'; g.fillRect(0, 0, W, 270);
    const gl = g.createRadialGradient(240, 170, 8, 240, 170, 120);
    gl.addColorStop(0, 'rgba(255,215,63,.9)'); gl.addColorStop(1, 'rgba(255,215,63,0)');
    g.fillStyle = gl; g.fillRect(0, 0, W, 270);
    g.fillStyle = '#7a4a21'; g.fillRect(190, 150, 100, 60);
    g.fillStyle = '#5a3a1e'; g.fillRect(190, 150, 100, 18);
    g.fillStyle = '#ffd23f'; g.fillRect(232, 162, 16, 22);
    const coins = Math.floor(lt * 3);
    g.fillStyle = '#ffe95e';
    for (let i = 0; i < coins && i < 18; i++) {
      g.beginPath(); g.arc(150 + (i * 67) % 200, 120 - (i % 5) * 12, 9, 0, Math.PI * 2); g.fill();
    }
    fpHero(g, 330, 226 - Math.abs(Math.sin(t * 4)) * 26, 0.9); // celebra saltando
    fpSub(g, '¡El Tesoro Dulce! ¡Misión cumplida, capitán!');
  } else { // 6 · fin
    g.fillStyle = '#0a0a24'; g.fillRect(0, 0, W, 270);
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.7 + i / 3) % 1, r = ph * 62, a = 1 - ph;
      const cols = ['#ff3d5e', '#ffd23f', '#00e5ff'];
      g.fillStyle = cols[i]; g.globalAlpha = a;
      for (let k = 0; k < 8; k++) {
        const an = k / 8 * Math.PI * 2;
        g.fillRect(150 + i * 90 + Math.cos(an) * r - 3, 90 + Math.sin(an) * r - 3, 6, 6);
      }
      g.globalAlpha = 1;
    }
    g.fillStyle = '#ffd23f'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 64px "Trebuchet MS", sans-serif';
    g.fillText('FIN', 240, 190);
    fpSub(g, 'FIN 🎬 ¡Gracias por venir al CINE GEAYI!');
  }
  mv.tex.needsUpdate = true;
}

function fpBuildCinema(lvl, cx, cz) {
  const g = lvl.group, W = 13, D = 11, H = 5;
  // piso y paredes (puerta de 2.4 en la pared oeste)
  fpBox(g, W, 0.2, D, 0x3a3f4a, cx, 0.1, cz);
  fpBox(g, W, H, 0.4, 0x8a1f3d, cx, H / 2, cz - D / 2);
  fpBox(g, W, H, 0.4, 0x8a1f3d, cx, H / 2, cz + D / 2);
  fpBox(g, 0.4, H, 4.3, 0x8a1f3d, cx - W / 2, H / 2, cz - 3.35);
  fpBox(g, 0.4, H, 4.3, 0x8a1f3d, cx - W / 2, H / 2, cz + 3.35);
  fpBox(g, 0.4, 1.2, 2.4, 0x8a1f3d, cx - W / 2, H - 0.6, cz);
  fpBox(g, 0.4, H, D, 0x8a1f3d, cx + W / 2, H / 2, cz);
  fpBox(g, W + 0.6, 0.4, D + 0.6, 0x2e3440, cx, H + 0.2, cz); // techo
  // letrero exterior
  g.add(doubleFaceSign(8, 2, fpSignTexture('🎬 CINE GEAYI', '#5c0a1e', '#ffd23f', '#ffffff'),
    cx - W / 2 - 0.4, 4.4, cz, -Math.PI / 2));
  // pantalla grande en la pared este
  const movie = fpNewMovie();
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.2),
    new THREE.MeshBasicMaterial({ map: movie.tex }));
  scr.rotation.y = -Math.PI / 2;
  scr.position.set(cx + W / 2 - 0.3, 2.7, cz);
  g.add(scr);
  fpBox(g, 0.3, 4.6, 8.4, 0x14141c, cx + W / 2 - 0.1, 2.7, cz);
  // butacas (3 filas × 5, terciopelo rojo, mirando a la pantalla)
  for (let r = 0; r < 3; r++) {
    for (let q = 0; q < 5; q++) {
      const sx = cx - 3.5 + q * 1.75, sz = cz - 2.8 + r * 2.8;
      fpBox(g, 1.1, 0.45, 1.0, 0xa5121f, sx, 0.42, sz, 0xa5121f, 0.2);
      fpBox(g, 0.25, 0.95, 1.0, 0x7a0d16, sx - 0.62, 0.85, sz);
    }
  }
  // alfombra del pasillo
  fpBox(g, W - 2, 0.06, 1.6, 0xd42a2a, cx, 0.23, cz, 0xd42a2a, 0.15);
  // puesto de palomitas dentro
  const px = cx - 4.2, pz = cz + 3.6;
  fpBox(g, 1.5, 1.1, 1.5, 0xffd23f, px, 0.75, pz, 0xffd23f, 0.25);
  fpBox(g, 1.6, 0.25, 1.6, 0xe63946, px, 1.42, pz);
  g.add(doubleFaceSign(3.2, 0.8, fpSignTexture('🍿 $5', '#e63946', '#ffffff', '#ffd23f'),
    px, 2.1, pz, 0));
  FunPark.cinemas.push({ cx, cz, doorX: cx - W / 2, doorZ: cz, movie });
}

function fpCinemaAt() {
  for (const c of FunPark.cinemas) {
    if (Math.abs(Player.pos.x - c.cx) < 5.6 && Math.abs(Player.pos.z - c.cz) < 4.9) return c;
  }
  return null;
}
function fpBuyPopcorn() {
  if (!fpCinemaAt()) return;
  if (typeof SAVE === 'undefined' || SAVE.coins == null) return;
  if (SAVE.coins >= 5) {
    SAVE.coins -= 5;
    try { persist(); } catch (e) {}
    const el = (typeof $ !== 'undefined') ? $('hud-coins') : null;
    if (el) el.textContent = SAVE.coins;
    if (Player.fx) Player.fx.speedT = 30; // boost de velocidad 30 s
    try {
      Audio2.buy();
      Particles.burst(Player.pos.x, Player.pos.y + 1.6, Player.pos.z, [0xffd23f, 0xffffff], 14, 4);
    } catch (e) {}
    toast('🍿 ¡Palomitas! Velocidad +45% por 30 segundos ⚡');
  } else {
    try { Audio2.deny(); } catch (e) {}
    toast('🪙 Te faltan monedas: las palomitas cuestan $5');
  }
}
function fpCineExit() {
  const c = fpCinemaAt();
  if (!c) return;
  Player.pos.x = c.doorX - 2.5;
  Player.pos.z = c.doorZ;
  try { Audio2.click(); } catch (e) {}
  toast('🍿 ¡Hasta la próxima función! 🎬');
}
function fpCineUpdate(dt) {
  const FP = FunPark, here = fpOk() ? fpCinemaAt() : null;
  for (const c of FP.cinemas) {
    const m = c.movie;
    if (!m) continue;
    if (here === c) {
      m.t = (m.t + dt) % 60;
      if (m.t - m.last > 0.12 || m.last < 0) { m.last = m.t; fpDrawMovie(m); }
      m._poster = false;
    } else if (!m._poster && m.last >= 0) { // cartel cuando nadie mira
      m._poster = true;
      const g = m.ctx;
      g.fillStyle = '#1a0a2a'; g.fillRect(0, 0, 480, 270);
      g.fillStyle = '#ffd23f'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '900 36px "Trebuchet MS", sans-serif';
      g.fillText('🎬 CINE GEAYI', 240, 100);
      g.fillStyle = '#fff'; g.font = '22px "Trebuchet MS", sans-serif';
      g.fillText('PRÓXIMA FUNCIÓN', 240, 150);
      g.fillText('🍿 Palomitas $5', 240, 185);
      m.tex.needsUpdate = true;
    }
  }
  if (here && !FP._cineIn) {
    FP._cineIn = true;
    toast('🎬 ¡Bienvenido al CINE GEAYI! 🍿 Palomitas $5 · mira la película');
    try { Audio2.check(); } catch (e) {}
  } else if (!here) {
    FP._cineIn = false;
  }
}

/* ================= enganche a los niveles ================= */
function addFunContent(idx, lvl) {
  FunPark.cinemas = [];
  FunPark.sea = null;
  FunPark.match = null;
  fpEnsureTrophy();
  if (idx === 3) { // Immokalee
    fpBuildStadium(lvl);
    fpBuildBeach(lvl);
    fpAddHeli(lvl, 132, 0, -88, 0.6);   // helipuerto del aeropuerto
    fpBuildCinema(lvl, 100, 30);        // cine de Immokalee
  } else if (idx === 0) { // Ciudad Neón
    fpAddHeli(lvl, -4, 0, -6, -0.5);    // junto a la pista de aviones (10,10)
    fpBuildCinema(lvl, 30, -8);        // al este, libre del estacionamiento (x≤22)
  } else if (idx >= 1 && idx <= 8) { // resto de ciudades
    fpBuildCinema(lvl, 24, -8);
  }
}
let _fpWrapped = false;
function fpWrapBuild() {
  if (_fpWrapped) return;
  _fpWrapped = true;
  if (typeof buildLevel !== 'function') return;
  const orig = buildLevel;
  buildLevel = function (idx) {
    const lvl = orig(idx);
    try { addFunContent(idx, lvl); } catch (e) { /* nunca romper el nivel */ }
    return lvl;
  };
}
fpWrapBuild(); // al cargar: solo envuelve buildLevel, sin tocar el DOM

/* ================= visibilidad de la UI ================= */
function fpUIUpdate() {
  const E = FunPark._els, FP = FunPark, P = Player;
  const show = (id, v) => { const el = E[id]; if (el) el.style.display = v ? 'block' : 'none'; };
  // ⚽ botón de partido (cerca del estadio, mundo 4, sin vehículo)
  const vMode = (typeof Vehicle !== 'undefined') ? Vehicle.mode : 'none';
  show('fp-match', LEVEL.idx === 3 && !FP.match && vMode === 'none' &&
    Math.hypot(P.pos.x - FP_FIELD.cx, P.pos.z - FP_FIELD.cz) < 30);
  show('fp-score', !!FP.match);
  // 🚁 botones subir/bajar (volando el helicóptero GEAYI)
  const inHeli = typeof Vehicle !== 'undefined' && Vehicle.mode === 'heli' &&
    Vehicle.def && Vehicle.def.vtype === 'geayi-funcopter';
  show('fp-heli-up', inHeli); show('fp-heli-dn', inHeli);
  // 🎬 botones del cine (dentro de la sala)
  const c = fpCinemaAt();
  show('fp-pop', !!c); show('fp-cine-exit', !!c);
}
