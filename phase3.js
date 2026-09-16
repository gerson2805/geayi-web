/* phase3.js — FASE 3: rutas extremas 🔥, power-ups, puzzles y retos educativos
   - addExtremeRoute(lvl, cfg): ruta opcional difícil pero superable, con premio
   - addPowerup(lvl, type, x, y, z): 🌀 doble salto · 🛡️ escudo · ⚡ velocidad
   - addFloorButton / addBonusBridge / addTimedDoor: puzzles de pensar
   - addDoorChoice: elige la puerta correcta (3 puertas, 1 abre)
   - addMathStation / addColorStation: retos educativos con premio
   - updatePhase3(dt): lógica por frame (se llama desde updatePlayer)
   - addPhase3Content(idx, lvl): coloca todo por mundo (se llama desde buildLevel)
*/
'use strict';

/* ---------------- letreros 3D ---------------- */
function addSign3D(lvl, x, y, z, lines, opts) {
  opts = opts || {};
  const W = opts.w || 512, H = opts.h || 256;
  const tex = canvasTex(W, H, (g) => {
    g.fillStyle = opts.bg || '#3a2b00'; g.fillRect(0, 0, W, H);
    g.strokeStyle = opts.border || '#ffd23f'; g.lineWidth = 10; g.strokeRect(8, 8, W - 16, H - 16);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const n = lines.length;
    lines.forEach((ln, i) => {
      const size = opts.sizes && opts.sizes[i] ? opts.sizes[i] : Math.min(64, (H - 40) / n * 0.72);
      g.font = '900 ' + size + 'px "Trebuchet MS", sans-serif';
      g.fillStyle = (opts.colors && opts.colors[i]) || opts.fg || '#ffffff';
      g.fillText(ln, W / 2, (H / (n + 1)) * (i + 1));
    });
  });
  const grp = new THREE.Group(); grp.position.set(x, y, z);
  const pw = (opts.pw || 4.6), ph = (opts.ph || 2.4);
  const woodM = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 });
  if (opts.hang) {
    // 🪧 poste en la ORILLA + brazo + letrero COLGANDO (nunca en medio de la calle)
    const poleH = 4.6, armL = 1.7;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, poleH, 8), woodM);
    pole.position.y = poleH / 2; grp.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(armL, 0.12, 0.12), woodM);
    arm.position.set(-armL / 2 + 0.1, poleH - 0.12, 0); grp.add(arm); // brazo hacia -x local
    const sx = -armL + 0.35; // el letrero cuelga cerca de la punta del brazo
    grp.add(doubleFaceSign(pw, ph, tex, sx, poleH - 0.45 - ph / 2, 0, 0));
    const chainM = new THREE.MeshStandardMaterial({ color: 0x3a3d45, roughness: 0.5, metalness: 0.7 });
    [-pw / 2 + 0.35, pw / 2 - 0.35].forEach(off => { // cadenitas del brazo al letrero
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 6), chainM);
      ch.position.set(sx + off, poleH - 0.38, 0); grp.add(ch);
    });
  } else {
    const panel = doubleFaceSign(pw, ph, tex, 0, (opts.poleH || 1.6) + ph / 2, 0, 0); // legible por ambos lados
    grp.add(panel);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, (opts.poleH || 1.6) + ph / 2, 8), woodM);
    pole.position.y = ((opts.poleH || 1.6) + ph / 2) / 2; grp.add(pole);
  }
  grp.rotation.y = opts.ry || 0;
  lvl.group.add(grp);
  return grp;
}

/* ---------------- RUTA EXTREMA 🔥 ----------------
   Física del salto: GRAV=30, JUMP_V=12, SPEED=8.2
   → altura máx 2.4, distancia máx ≈ 6.56. La ruta usa huecos ≤ 5.0 y subidas ≤ 1.0:
   difícil (plataformas de 1.4) pero SIEMPRE superable. */
const EXTREME_STEPS = [
  // dx,   dy,   dz,   w,   d,   opts   (cubos más juntos: fáciles de saltar en celular)
  [0,     0,    0,   3.6, 3.6, { entry: true }],
  [4.4,   0.9,  1.2, 1.5, 1.5, {}],                       // hueco ≈ 1.9
  [4.2,   0.9, -1.6, 1.4, 1.4, {}],                       // hueco ≈ 2.8
  [4.4,   1.0,  1.0, 1.4, 1.4, {}],                       // hueco ≈ 2.9
  [4.2,   0.7,  0,   2.6, 2.6, { move: { axis: 'z', range: 3.2, speed: 3.2 } }], // movediza rápida
  [4.4,   0.8,  0,   1.6, 1.6, { ghost: { stay: 1.0, respawn: 1.8 } }],          // fantasma
  [4.2,   0.8,  0,   1.6, 1.6, { ghost: { stay: 0.9, respawn: 1.8 } }],          // fantasma
  [4.4,   0.9, -1.2, 2.2, 2.2, { sweeper: { speed: 2.6, armLen: 2.0 } }],        // barredora
  [4.8,   0.7,  1.2, 5.0, 5.0, { bonus: true }],                                // 🏆 premio
];
function addExtremeRoute(lvl, x0, y0, z0, dirX) {
  dirX = dirX || 1; // 1 = la ruta avanza hacia +x, -1 = hacia -x (Neón: sobre la plaza, sin edificios)
  const A = (x, y, z, w, d, o) => addPlatform(lvl, x, y, z, w, d, o);
  const plats = [];
  // --- entrada a nivel del suelo: la ruta extrema SIEMPRE empieza desde abajo ---
  // plaza de entrada (solo si no hay suelo ya: evita parpadeo con losas coplanares)
  const hasGround = lvl.platforms.some(p => Math.abs(p.topY) < 0.15 &&
    x0 > p.x - p.w / 2 - 1 && x0 < p.x + p.w / 2 + 1 &&
    z0 > p.z - p.d / 2 - 1 && z0 < p.z + p.d / 2 + 1);
  if (!hasGround) A(x0, 0, z0, 9, 9, { color: 0x2a2f3a, emissive: 0x00e5ff }); // plaza de entrada
  A(x0, 0.5, z0 + 2.9, 2.2, 2.2, { color: 0x3a2b00, emissive: 0xff3d00 }); // escalón a la plataforma de entrada
  let px = x0, py = y0, pz = z0;
  EXTREME_STEPS.forEach((s, i) => {
    if (i > 0) { px += s[0] * dirX; py += s[1]; pz += s[2]; }
    const o = {};
    if (s[5].move) o.move = s[5].move;
    if (s[5].ghost) { o.kind = 'ghost'; o.ghost = s[5].ghost; }
    if (s[5].bonus) { o.color = 0x6b4a00; o.emissive = 0xffd23f; }
    if (s[5].entry) { o.color = 0x3a2b00; o.emissive = 0xff3d00; }
    const p = A(px, py, pz, s[3], s[4], o);
    p.extreme = true;
    plats.push(p);
    if (s[5].sweeper) addSweeper(lvl, px, py, pz, s[5].sweeper);
  });
  // ⚠️ letrero de advertencia en la entrada (poste a la orilla, colgando)
  addSign3D(lvl, x0 + 4.4 * dirX, y0, z0 - 2.6, [T('p3.extreme.warn1'), T('p3.extreme.warn2'), T('p3.extreme.warn3')],
    { bg: '#4a1000', border: '#ff3d00', fg: '#ffffff', colors: ['#ffd23f', '#ffffff', '#7dff8a'],
      ry: dirX === -1 ? Math.PI : 0, pw: 5.2, ph: 2.6, hang: true });
  // 🏆 premio: anillo de monedas + letrero
  const b = plats[plats.length - 1];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    addCoin(lvl, b.x + Math.cos(a) * 1.7, b.topY + 1.4, b.z + Math.sin(a) * 1.7);
  }
  addCoin(lvl, b.x, b.topY + 2.2, b.z);
  addSign3D(lvl, b.x, b.topY, b.z + 3.2, [T('p3.extreme.done'), T('p3.extreme.done2')],
    { bg: '#0a3d1f', border: '#ffd23f', colors: ['#ffd23f', '#ffffff'], ry: Math.PI, pw: 5, ph: 2.2 });
  lvl.extremeRoutes = lvl.extremeRoutes || [];
  lvl.extremeRoutes.push({ platforms: plats, x0, y0, z0 });
  return plats;
}

/* charco de lava peligroso (daño real; el escudo 🛡️ lo anula una vez) */
function addLavaPool(lvl, x, y, z, r) {
  const tex = (typeof lavaTexture === 'function') ? lavaTexture() : null;
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24),
    new THREE.MeshBasicMaterial({ map: tex || null, color: tex ? 0xffffff : 0xff5a00, transparent: true, opacity: 0.95 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.05, z);
  lvl.group.add(m);
  lvl.lavaPools = lvl.lavaPools || [];
  lvl.lavaPools.push({ x, y, z, r, mesh: m });
}
function hitHazard() { // lava o peligro: escudo salva, si no = caída normal
  const P = Player;
  if (P.fx.shield) {
    P.fx.shield = false;
    P.reset(P.lastSafe.x, P.lastSafe.y + 0.5, P.lastSafe.z);
    toast(T('p3.shieldSaved'));
    if (typeof Audio2.good === 'function') Audio2.good(); else Audio2.check();
    Particles.burst(P.pos.x, P.pos.y + 1, P.pos.z, [0x59c1ff, 0xffffff], 18, 5);
  } else {
    Audio2.fall(); screenShake(0.5, 0.5);
    Particles.burst(P.pos.x, 0.5, P.pos.z, [0xff3d5e, 0x888888], 16, 5);
    if (typeof Vehicle !== 'undefined' && Vehicle.mode !== 'none' && typeof crashVehicle === 'function') crashVehicle();
    P.reset(respawn.x, respawn.y, respawn.z);
    toast(T('toast.fall'));
  }
  if (typeof updateFxHud === 'function') updateFxHud();
}

/* ---------------- POWER-UPS ---------------- */
const POWERUP_DEFS = {
  double: { emoji: '🌀', dur: 30, color: 0x00e5ff },
  shield: { emoji: '🛡️', dur: 0, color: 0x59c1ff },
  speed:  { emoji: '⚡', dur: 20, color: 0xffe95e },
};
function addPowerup(lvl, type, x, y, z) {
  const def = POWERUP_DEFS[type];
  const tex = canvasTex(128, 128, (g) => {
    g.font = '96px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(def.emoji, 64, 70);
  });
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  spr.scale.set(1.6, 1.6, 1); spr.position.set(x, y, z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 24),
    new THREE.MeshBasicMaterial({ color: def.color }));
  ring.rotation.x = Math.PI / 2; ring.position.set(x, y - 0.8, z);
  lvl.group.add(spr); lvl.group.add(ring);
  lvl.powerups = lvl.powerups || [];
  lvl.powerups.push({ type, x, y, z, taken: false, respawnT: 0, spr, ring, phase: Math.random() * TAU });
}
function collectPowerup(pu) {
  const P = Player, def = POWERUP_DEFS[pu.type];
  pu.taken = true; pu.respawnT = 12;
  pu.spr.visible = false; pu.ring.visible = false;
  if (pu.type === 'double') P.fx.doubleT = def.dur;
  else if (pu.type === 'shield') P.fx.shield = true;
  else if (pu.type === 'speed') P.fx.speedT = def.dur;
  toast(tp('p3.puGot', { n: T('p3.pu.' + pu.type) }));
  if (typeof Audio2.power === 'function') Audio2.power(); else Audio2.check();
  Particles.burst(pu.x, pu.y, pu.z, [def.color, 0xffffff], 16, 5);
  if (typeof updateFxHud === 'function') updateFxHud();
}

/* ---------------- PUZZLES DE PENSAR ---------------- */
/* botón de piso: al pisarlo activa un puente (permanente o temporizado) */
function addFloorButton(lvl, x, topY, z, opts) {
  opts = opts || {};
  const grp = new THREE.Group(); grp.position.set(x, topY, z);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.25, 16),
    new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.6 }));
  base.position.y = 0.12; grp.add(base);
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: opts.color || 0xff3d5e, emissive: opts.color || 0xff3d5e, emissiveIntensity: 0.7 }));
  btn.position.y = 0.32; grp.add(btn);
  lvl.group.add(grp);
  // letrerito flotante
  const tex = canvasTex(256, 96, (g) => {
    g.font = '64px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(opts.icon || '🔘', 128, 52);
  });
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  spr.scale.set(1.4, 0.55, 1); spr.position.set(x, topY + 1.6, z); lvl.group.add(spr);
  const b = {
    x, topY, z, pressed: false, btnMesh: btn, spr,
    mode: opts.mode || 'bridge', time: opts.time || 8, timerT: 0,
    bridge: null, onPress: opts.onPress || null, wasDown: false,
  };
  if (opts.bridge) {
    const s = opts.bridge;
    const p = addPlatform(lvl, s.x, s.y, s.z, s.w, s.d, { color: 0x2a6bff, emissive: 0x2a6bff });
    p.solid = false; p.mesh.visible = false; p.isBonusBridge = true;
    b.bridge = p;
  }
  lvl.buttons = lvl.buttons || [];
  lvl.buttons.push(b);
  return b;
}
/* puerta temporizada: el puente aparece N segundos y se esconde (se puede reactivar) */
function addTimedGate(lvl, bx, by, bz, bridgeSpec, time) {
  addSign3D(lvl, bx, by, bz - 1.8, [T('p3.gate.title'), tp('p3.gate.sub', { n: time })],
    { bg: '#1a2a5e', border: '#00e5ff', pw: 4.4, ph: 2 });
  return addFloorButton(lvl, bx, by, bz, { mode: 'timed', time: time, bridge: bridgeSpec, icon: '⏱️', color: 0x00e5ff });
}

/* ---- elige la puerta correcta: 3 puertas, 1 abre (pista cercana) ---- */
function addDoorChoice(lvl, x, y, z, ry, correctIdx, hintKey) {
  const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = ry || 0;
  const wallM = new THREE.MeshStandardMaterial({ color: 0x8a6d3b, roughness: 0.8 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(10.5, 4.2, 1), wallM);
  wall.position.y = 2.1; grp.add(wall);
  lvl.group.add(grp);
  // direcciones locales → mundo
  const cos = Math.cos(ry || 0), sin = Math.sin(ry || 0);
  const doorAt = (off, lz) => ({ x: x + off * cos + lz * sin, z: z - off * sin + lz * cos });
  const doors = [];
  for (let i = 0; i < 3; i++) {
    const off = (i - 1) * 3.2;
    const dp = doorAt(off, 0.56), bp = doorAt(off, 0);
    const tex = canvasTex(128, 160, (g) => {
      g.fillStyle = '#5e3fa3'; g.fillRect(0, 0, 128, 160);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(6, 6, 116, 148);
      g.font = '900 84px "Trebuchet MS", sans-serif'; g.textAlign = 'center';
      g.fillStyle = '#ffffff'; g.fillText(String(i + 1), 64, 112);
    });
    const door = doubleFaceSign(2.2, 2.9, tex, dp.x, y + 1.7, dp.z, ry || 0); // número legible por ambos lados
    lvl.group.add(door);
    // bloqueador sólido (la puerta correcta se abre al acercarse)
    const blk = addPlatform(lvl, bp.x, y + 1.5, bp.z, 2.6, 0.8, { color: 0x5e3fa3, emissive: 0x3d2a6b });
    blk.mesh.visible = false; blk.doorBlock = true;
    doors.push({ i, door, blk, opened: false, x: bp.x, z: bp.z });
  }
  // cuartito premio detrás (local -z → mundo)
  const backX = x - 5 * sin, backZ = z - 5 * cos;
  addPlatform(lvl, backX, y, backZ, 7, 6, { color: 0x2a4a2a, emissive: 0x59d867 });
  for (let i = 0; i < 6; i++) addCoin(lvl, backX - 2 + (i % 3) * 2, y + 1.4, backZ - 1 + Math.floor(i / 3) * 2);
  addSign3D(lvl, backX, y, backZ + 2.4, [T('p3.door.win')], { bg: '#0a3d1f', border: '#ffd23f', ry: ry || 0, pw: 4.6, ph: 1.8 });
  const hx = x + 4.5 * cos + 2.5 * sin, hz = z - 4.5 * sin + 2.5 * cos;
  addSign3D(lvl, hx, y, hz, ['🔎 ' + T('p3.door.hint'), T(hintKey)],
    { bg: '#2a2a4a', border: '#7b7bff', pw: 5.4, ph: 2.4, ry: ry || 0 });
  lvl.doorChoices = lvl.doorChoices || [];
  lvl.doorChoices.push({ doors, correctIdx, x, z });
}

/* ---------------- RETO MATEMÁTICO 🔢 (educativo, para niños) ---------------- */
const MATH_FRUITS = ['🍎', '🍊', '🍋', '🍇', '🍓'];
function genMathProblem(band) {
  const f = MATH_FRUITS[(Math.random() * MATH_FRUITS.length) | 0];
  let a, b, ans, op, visual = null;
  if (band === 0) { // mundos 1-3: sumas con resultado ≤ 10 + ayuda visual
    a = 1 + ((Math.random() * 5) | 0); b = 1 + ((Math.random() * (10 - a)) | 0);
    ans = a + b; op = '+';
    visual = f.repeat(a) + '  +  ' + f.repeat(b);
  } else if (band === 1) { // mundos 4-6: sumas/restas con resultado ≤ 20
    if (Math.random() < 0.5) {
      a = 2 + ((Math.random() * 10) | 0); b = 2 + ((Math.random() * (18 - a)) | 0);
      ans = a + b; op = '+';
    } else {
      a = 3 + ((Math.random() * 12) | 0); b = 1 + ((Math.random() * (a - 1)) | 0);
      ans = a - b; op = '−';
    }
  } else { // mundos 7-9: multiplicaciones fáciles
    const m = [2, 3, 5][(Math.random() * 3) | 0];
    b = 2 + ((Math.random() * 4) | 0); a = m;
    ans = a * b; op = '×';
  }
  // 3 opciones: la correcta + 2 distractores cercanos
  const opts = [ans];
  let guard = 0;
  while (opts.length < 3 && guard++ < 50) {
    const d = ans + (1 + ((Math.random() * 3) | 0)) * (Math.random() < 0.5 ? -1 : 1);
    if (d >= 0 && opts.indexOf(d) < 0) opts.push(d);
  }
  while (opts.length < 3) opts.push(ans + opts.length + 1);
  // mezclar
  for (let i = opts.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = opts[i]; opts[i] = opts[j]; opts[j] = t;
  }
  return { a, b, ans, op, visual, opts };
}
function numLabelSprite(txt, color) {
  const tex = canvasTex(128, 128, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.fill();
    g.font = '900 64px "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = color || '#ffffff'; g.fillText(txt, 64, 70);
  });
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  spr.scale.set(1.7, 1.7, 1);
  return spr;
}
function addMathStation(lvl, x, y, z, band) {
  const prob = genMathProblem(band);
  const A = (px, py, pz, w, d, o) => addPlatform(lvl, px, py, pz, w, d, o);
  A(x, y, z, 7.5, 4, { color: 0x1a2a6b, emissive: 0x3d5afe });            // plataforma A
  A(x, y, z + 11.5, 5, 5, { color: 0x1a2a6b, emissive: 0x3d5afe });       // plataforma B (premio)
  for (let i = 0; i < 5; i++) addCoin(lvl, x - 1.6 + (i % 3) * 1.6, y + 1.4, z + 10.6 + Math.floor(i / 3) * 1.6);
  // letrero grande con el problema
  const lines = prob.visual ? [prob.visual, prob.a + ' ' + prob.op + ' ' + prob.b + ' = ?'] : [prob.a + ' ' + prob.op + ' ' + prob.b + ' = ?'];
  addSign3D(lvl, x, y, z - 1.6, ['🔢 ' + T('p3.math.title')].concat(lines),
    { bg: '#101a3d', border: '#3d5afe', fg: '#ffffff', pw: 6.4, ph: 3.4, poleH: 2.2 });
  // puente oculto sobre el hueco (7.5 de hueco: imposible saltarlo, hay que resolver)
  const bridge = A(x, y - 0.05, z + 5.75, 3.2, 7.6, { color: 0x2a6bff, emissive: 0x2a6bff });
  bridge.solid = false; bridge.mesh.visible = false; bridge.isBonusBridge = true;
  const st = { kind: 'math', solved: false, bridge, prob, x, y, z };
  // 3 botones-respuesta grandes
  prob.opts.forEach((val, i) => {
    const px = x + (i - 1) * 2.5;
    const pad = A(px, y + 0.04, z + 0.6, 1.9, 1.9, { color: 0x3d3d5e, emissive: 0x7777aa });
    const lbl = numLabelSprite(String(val), val === prob.ans ? '#7dff8a' : '#ffffff');
    lbl.position.set(px, y + 1.5, z + 0.6); lvl.group.add(lbl);
    lvl.buttons = lvl.buttons || [];
    lvl.buttons.push({
      x: px, topY: y, z: z + 0.6, pressed: false, mode: 'answer', btnMesh: null, spr: lbl,
      station: st, value: val, wasDown: false,
    });
  });
  lvl.stations = lvl.stations || [];
  lvl.stations.push(st);
  return st;
}
function solveStation(st) {
  if (st.solved) return;
  st.solved = true;
  st.bridge.solid = true; st.bridge.mesh.visible = true;
  const b = st.bridge;
  Particles.burst(b.x, b.topY + 1.5, b.z, [0xffd23f, 0xff2fd6, 0x00e5ff, 0x59d867, 0xffffff], 40, 7);
  Particles.burst(b.x, b.topY + 2.5, b.z, [0xffd23f, 0xffffff], 24, 5);
  if (typeof Audio2.good === 'function') Audio2.good(); else Audio2.win();
  toast(st.kind === 'math' ? T('p3.math.good') : T('p3.color.good'));
  try {
    SAVE.puzzles = (SAVE.puzzles || 0) + 1; persist();
    if (SAVE.puzzles >= 10 && typeof Trophy !== 'undefined' && Trophy.unlock) Trophy.unlock('puzzle10');
  } catch (e) {}
}
function wrongAnswer(st) {
  screenShake(0.18, 0.3);
  if (typeof Audio2.oops === 'function') Audio2.oops(); else Audio2.deny();
  toast(T('p3.tryAgain'));
}

/* ---------------- RETO DE COLORES 🎨 ---------------- */
const COLOR_SETS = [
  [ // mundos 1-3: primarios
    { hex: 0xe53935, key: 'p3.color.red' }, { hex: 0x1e88e5, key: 'p3.color.blue' },
    { hex: 0xffd600, key: 'p3.color.yellow' }, { hex: 0x43a047, key: 'p3.color.green' },
  ],
  [ // mundos 4-6: + secundarios
    { hex: 0xe53935, key: 'p3.color.red' }, { hex: 0x1e88e5, key: 'p3.color.blue' },
    { hex: 0xffd600, key: 'p3.color.yellow' }, { hex: 0x43a047, key: 'p3.color.green' },
    { hex: 0x8e24aa, key: 'p3.color.purple' }, { hex: 0xfb8c00, key: 'p3.color.orange' },
  ],
  [ // mundos 7-9: + rosa y celeste
    { hex: 0xe53935, key: 'p3.color.red' }, { hex: 0x1e88e5, key: 'p3.color.blue' },
    { hex: 0xffd600, key: 'p3.color.yellow' }, { hex: 0x43a047, key: 'p3.color.green' },
    { hex: 0x8e24aa, key: 'p3.color.purple' }, { hex: 0xfb8c00, key: 'p3.color.orange' },
    { hex: 0xec407a, key: 'p3.color.pink' }, { hex: 0x4dd0e1, key: 'p3.color.cyan' },
  ],
];
function addColorStation(lvl, x, y, z, tier) {
  const set = COLOR_SETS[tier] || COLOR_SETS[0];
  const target = set[(Math.random() * set.length) | 0];
  const others = set.filter(c => c !== target);
  const opts = [target];
  while (opts.length < 3) {
    const c = others[(Math.random() * others.length) | 0];
    if (opts.indexOf(c) < 0) opts.push(c);
  }
  for (let i = opts.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = opts[i]; opts[i] = opts[j]; opts[j] = t;
  }
  const A = (px, py, pz, w, d, o) => addPlatform(lvl, px, py, pz, w, d, o);
  A(x, y, z, 7.5, 4, { color: 0x3d1a4d, emissive: 0xa03dfe });
  A(x, y, z + 11.5, 5, 5, { color: 0x3d1a4d, emissive: 0xa03dfe });
  for (let i = 0; i < 5; i++) addCoin(lvl, x - 1.6 + (i % 3) * 1.6, y + 1.4, z + 10.6 + Math.floor(i / 3) * 1.6);
  addSign3D(lvl, x, y, z - 1.6, ['🎨 ' + T('p3.color.title'), tp('p3.color.ask', { n: T(target.key) })],
    { bg: '#2a0f3d', border: '#e040fb', pw: 6.4, ph: 2.8, poleH: 2.2 });
  const bridge = A(x, y - 0.05, z + 5.75, 3.2, 7.6, { color: 0xa03dfe, emissive: 0xa03dfe });
  bridge.solid = false; bridge.mesh.visible = false; bridge.isBonusBridge = true;
  const st = { kind: 'color', solved: false, bridge, target, x, y, z };
  opts.forEach((c, i) => {
    const px = x + (i - 1) * 2.5;
    A(px, y + 0.04, z + 0.6, 1.9, 1.9, { color: c.hex, emissive: c.hex });
    lvl.buttons = lvl.buttons || [];
    lvl.buttons.push({ x: px, topY: y, z: z + 0.6, pressed: false, mode: 'answer', btnMesh: null, station: st, value: c, wasDown: false });
  });
  lvl.stations = lvl.stations || [];
  lvl.stations.push(st);
  return st;
}

/* ---------------- actualización por frame ---------------- */
function updatePhase3(dt) {
  const P = Player;
  if (!P || !P.fx) return;
  // power-ups: flotar, recoger, reaparecer
  for (const pu of LEVEL.powerups || []) {
    if (!pu.taken) {
      pu.spr.position.y = pu.y + Math.sin(levelTime * 2.4 + pu.phase) * 0.25;
      pu.ring.rotation.z += dt * 1.5;
      const dx = P.pos.x - pu.x, dy = (P.pos.y + 0.9) - pu.spr.position.y, dz = P.pos.z - pu.z;
      if (dx * dx + dy * dy + dz * dz < 2.6) collectPowerup(pu);
    } else {
      pu.respawnT -= dt;
      if (pu.respawnT <= 0) { pu.taken = false; pu.spr.visible = true; pu.ring.visible = true; }
    }
  }
  // botones de piso
  for (const b of LEVEL.buttons || []) {
    const dx = P.pos.x - b.x, dz = P.pos.z - b.z;
    const down = (dx * dx + dz * dz < 1.44) && Math.abs(P.pos.y - b.topY) < 1.6;
    if (down && !b.wasDown) { // ¡pisado!
      b.wasDown = true;
      if (b.btnMesh) b.btnMesh.position.y = 0.2;
      Audio2.click();
      Particles.burst(b.x, b.topY + 0.8, b.z, [0xffffff, 0xffd23f], 10, 4);
      if (b.mode === 'answer' && b.station) {
        if (b.station.solved) continue;
        const ok = (b.station.kind === 'math') ? (b.value === b.station.prob.ans) : (b.value === b.station.target);
        if (ok) solveStation(b.station); else wrongAnswer(b.station);
      } else if (b.bridge) {
        b.bridge.solid = true; b.bridge.mesh.visible = true;
        Particles.burst(b.bridge.x, b.bridge.topY + 1, b.bridge.z, [0x2a6bff, 0xffffff], 18, 5);
        if (b.mode === 'timed') b.timerT = b.time;
        toast(T('p3.bridgeOn'));
      }
      if (b.onPress) b.onPress(b);
    } else if (!down) {
      b.wasDown = false;
      if (b.btnMesh) b.btnMesh.position.y = 0.32;
    }
    if (b.mode === 'timed' && b.bridge && b.bridge.solid) {
      b.timerT -= dt;
      if (b.timerT <= 0) { b.bridge.solid = false; b.bridge.mesh.visible = false; }
    }
  }
  // puertas: la correcta se abre al acercarse
  for (const dc of LEVEL.doorChoices || []) {
    dc.doors.forEach(d => {
      if (d.opened || d.i !== dc.correctIdx) return;
      const dx = P.pos.x - d.x, dz = P.pos.z - d.z;
      if (dx * dx + dz * dz < 3.2 && Math.abs(P.pos.y - (d.blk.topY - 1.5)) < 3) {
        d.opened = true; d.blk.solid = false; d.door.visible = false;
        Audio2.check(); toast(T('p3.door.open'));
        Particles.burst(d.x, d.blk.topY, d.z, [0xffd23f, 0xffffff], 16, 5);
      }
    });
  }
  // charcos de lava
  for (const lp of LEVEL.lavaPools || []) {
    const dx = P.pos.x - lp.x, dz = P.pos.z - lp.z;
    if (dx * dx + dz * dz < lp.r * lp.r && Math.abs(P.pos.y - lp.y) < 1.4 && !finished) hitHazard();
  }
}

/* ---------------- contenido fase 3 por mundo ---------------- */
function bonusSpot(lvl, x, y, z) { // plataforma premio con monedas (para puentes bonus)
  addPlatform(lvl, x, y, z, 4, 4, { color: 0x6b4a00, emissive: 0xffd23f });
  for (let i = 0; i < 6; i++) addCoin(lvl, x - 1.2 + (i % 3) * 1.2, y + 1.4, z - 0.6 + Math.floor(i / 3) * 1.2);
}
function addPhase3Content(idx, lvl) {
  // botón en el recorrido → puente lateral a plataforma premio
  const B = (x, y, z, spec) => {
    const b = addFloorButton(lvl, x, y, z, { bridge: spec });
    bonusSpot(lvl, spec.x + spec.w / 2 + 1, spec.y, spec.z);
    return b;
  };
  // puerta temporizada en el recorrido → puente lateral a plataforma premio
  const G = (x, y, z, spec, time) => {
    addTimedGate(lvl, x, y, z, spec, time);
    bonusSpot(lvl, spec.x + (spec.x > x ? spec.w / 2 + 1 : -spec.w / 2 - 1), spec.y, spec.z);
  };
  // puzzle de 3 puertas: plataforma lateral ancha + muro con premio detrás
  const D = (px, py, pz, correctIdx, hintKey) => {
    addPlatform(lvl, px, py, pz, 12, 8, { color: 0x5e3fa3, emissive: 0x3d2a6b });
    addDoorChoice(lvl, px, py, pz + 1, Math.PI, correctIdx, hintKey);
  };
  // 🔥 ruta extrema en los 9 mundos (entrada a nivel del suelo junto al inicio)
  // Neón: dirX=-1 para que avance sobre la plaza oeste, sin chocar con edificios
  addExtremeRoute(lvl, 7.5, 1, -5, idx === 0 ? -1 : 1);
  if (idx === 1) { // 🌋 charcos de lava bajo la ruta extrema del volcán
    addLavaPool(lvl, 11.9, -1, -3.8, 2.4);
    addLavaPool(lvl, 16.1, -1, -4.2, 2.4);
  }
  if (idx === 0) { // NEÓN 🌃 (estaciones a nivel de calle, en las franjas laterales)
    addMathStation(lvl, 11, 0.12, 30, 0);
    addColorStation(lvl, -11, 0.12, 40, 0);
    // botón en la franja este → plataforma premio a nivel de suelo (sin parkour)
    addFloorButton(lvl, 11, 0, 58, { bridge: { x: 11, y: 0.07, z: 63.5, w: 4, d: 5 } });
    addPlatform(lvl, 11, 0.07, 70, 4, 4, { color: 0x6b4a00, emissive: 0xffd23f });
    for (let i = 0; i < 6; i++) addCoin(lvl, 11 - 1.2 + (i % 3) * 1.2, 1.5, 70 - 0.6 + Math.floor(i / 3) * 1.2);
    addPowerup(lvl, 'double', 0, 2.2, 20);
    addPowerup(lvl, 'speed', 0, 2.2, 50);
  } else if (idx === 1) { // VOLCÁN
    addMathStation(lvl, 7.5, 1.2, 50, 0);
    addColorStation(lvl, -7.5, 1.2, 58, 0);
    G(2, 0, 47, { x: 7.5, y: 0.07, z: 47, w: 8, d: 3 }, 8);
    addPowerup(lvl, 'shield', 0, 3, 25);
  } else if (idx === 2) { // DULCE
    addMathStation(lvl, 7.5, 2.2, 34, 0);
    addColorStation(lvl, -7.5, 2.2, 62, 0);
    D(8, 2.2, 58, 1, 'p3.door.h0');
    addPowerup(lvl, 'double', 0, 3.5, 30);
  } else if (idx === 3) { // IMMOKALEE
    addMathStation(lvl, 7.5, 2.4, 78, 1);
    addColorStation(lvl, -7.5, 2.4, 84, 1);
    B(1, 0, 40, { x: 5.5, y: 0.07, z: 40, w: 6, d: 3 });
    G(-1, 0, 76, { x: -6.5, y: 0.07, z: 76, w: 8, d: 3 }, 8);
    addPowerup(lvl, 'shield', 0, 3.5, 26);
    addPowerup(lvl, 'speed', 0, 3.5, 45);
  } else if (idx === 4) { // HONDURAS
    addMathStation(lvl, 7.5, 2.6, 78, 1);
    addColorStation(lvl, -7.5, 2.6, 84, 1);
    D(8, 2.2, 48, 0, 'p3.door.h1');
    G(2, 2.2, 48, { x: 7.5, y: 2.2, z: 48, w: 8, d: 3 }, 8);
    addPowerup(lvl, 'double', 0, 4, 30);
    addPowerup(lvl, 'shield', 0, 4, 74);
  } else if (idx === 5) { // MÉXICO
    addMathStation(lvl, 7.5, 2.6, 100, 1);
    addColorStation(lvl, -7.5, 2.6, 106, 1);
    B(1.5, 0, 77, { x: 6, y: 0.07, z: 77, w: 6, d: 3 });
    G(-1.5, 0, 77, { x: -7, y: 0.07, z: 77, w: 8, d: 3 }, 8);
    D(8, 2.6, 88, 2, 'p3.door.h2');
    addPowerup(lvl, 'speed', 0, 4, 40);
    addPowerup(lvl, 'double', 0, 4, 77);
    addPowerup(lvl, 'shield', 0, 4, 106);
  } else if (idx === 6) { // USA
    addMathStation(lvl, 7.5, 8.2, 104, 2);
    addColorStation(lvl, -7.5, 8.2, 108, 2);
    D(8, 9.2, 106, 1, 'p3.door.h3');
    G(1.5, 9.2, 106, { x: 6, y: 9.2, z: 106, w: 8, d: 3 }, 8);
    G(-1.5, 9.2, 106, { x: -6, y: 9.2, z: 106, w: 8, d: 3 }, 6);
    addPowerup(lvl, 'double', 0, 9.5, 60);
    addPowerup(lvl, 'shield', 0, 9.5, 87);
    addPowerup(lvl, 'speed', 0, 10, 103);
  } else if (idx === 7) { // ESPAÑA
    addMathStation(lvl, 7.5, 8.4, 104, 2);
    addColorStation(lvl, -7.5, 8.4, 110, 2);
    B(-1, 8.2, 86, { x: -5.5, y: 8.2, z: 86, w: 6, d: 3 });
    G(1, 8.2, 86, { x: 5.5, y: 8.2, z: 86, w: 8, d: 3 }, 8);
    D(7.5, 8, 93, 0, 'p3.door.h4');
    addPowerup(lvl, 'double', 0, 10, 70);
    addPowerup(lvl, 'shield', 0, 10, 86);
    addPowerup(lvl, 'speed', 0, 10.5, 102);
  } else if (idx === 8) { // NIEVE ❄️
    addMathStation(lvl, 7.5, 2.6, 78, 2);
    addColorStation(lvl, -7.5, 2.6, 84, 2);
    B(1.5, 0, 40, { x: 6, y: 0.07, z: 40, w: 6, d: 3 });
    addPowerup(lvl, 'shield', 0, 4, 56);
    addPowerup(lvl, 'speed', 0, 4, 74);
  }
}

/* ---------------- textos fase 3 (4 idiomas) ---------------- */
addStrings('es', {
  'p3.sled.board': 'SUBIR', 'p3.sled.exit': 'BAJAR',
  'p3.sled.go': '🛷 ¡Allá vamos!', 'p3.sled.done': '🛷 ¡Buen descenso!',
  'p3.extreme.warn1': '⚠️ RUTA EXTREMA 🔥', 'p3.extreme.warn2': '¡Solo expertos!', 'p3.extreme.warn3': 'Premio al final 🏆',
  'p3.extreme.done': '🏆 ¡LO LOGRASTE!', 'p3.extreme.done2': '¡Eres extremo! 🔥',
  'p3.shieldSaved': '🛡️ ¡El escudo te salvó!',
  'p3.puGot': '¡{n} activado!', 'p3.pu.double': 'Doble salto 🌀', 'p3.pu.shield': 'Escudo 🛡️', 'p3.pu.speed': 'Velocidad ⚡',
  'p3.bridgeOn': '🌉 ¡Puente activado!',
  'p3.gate.title': '⏱️ PUERTA DE TIEMPO', 'p3.gate.sub': '¡Cruza en {n}s!',
  'p3.door.hint': '🔎 Pista:', 'p3.door.win': '🧠 ¡Bien pensado!', 'p3.door.open': '🚪 ¡Puerta abierta!',
  'p3.door.h0': 'La del medio abre el camino.',
  'p3.door.h1': 'La primera es la buena.',
  'p3.door.h2': 'La última es la vencida.',
  'p3.door.h3': 'Ni la primera ni la última.',
  'p3.door.h4': 'Empieza por la primera.',
  'p3.math.title': 'RETO MATEMÁTICO', 'p3.math.good': '¡Muy bien! 🎉',
  'p3.color.title': 'RETO DE COLORES', 'p3.color.ask': '¿Cuál es el {n}?', 'p3.color.good': '¡Muy bien! 🎉',
  'p3.color.red': 'rojo', 'p3.color.blue': 'azul', 'p3.color.yellow': 'amarillo', 'p3.color.green': 'verde',
  'p3.color.purple': 'morado', 'p3.color.orange': 'naranja', 'p3.color.pink': 'rosa', 'p3.color.cyan': 'celeste',
  'p3.tryAgain': '💪 ¡Casi! Intenta de nuevo',
});
addStrings('en', {
  'p3.sled.board': 'RIDE', 'p3.sled.exit': 'GET OFF',
  'p3.sled.go': '🛷 Here we go!', 'p3.sled.done': '🛷 Nice ride!',
  'p3.extreme.warn1': '⚠️ EXTREME ROUTE 🔥', 'p3.extreme.warn2': 'Experts only!', 'p3.extreme.warn3': 'Prize at the end 🏆',
  'p3.extreme.done': '🏆 YOU DID IT!', 'p3.extreme.done2': 'You are extreme! 🔥',
  'p3.shieldSaved': '🛡️ The shield saved you!',
  'p3.puGot': '{n} on!', 'p3.pu.double': 'Double jump 🌀', 'p3.pu.shield': 'Shield 🛡️', 'p3.pu.speed': 'Speed ⚡',
  'p3.bridgeOn': '🌉 Bridge on!',
  'p3.gate.title': '⏱️ TIMED GATE', 'p3.gate.sub': 'Cross in {n}s!',
  'p3.door.hint': '🔎 Hint:', 'p3.door.win': '🧠 Smart!', 'p3.door.open': '🚪 Door open!',
  'p3.door.h0': 'The middle one opens the way.',
  'p3.door.h1': 'The first one is the one.',
  'p3.door.h2': 'The last one wins.',
  'p3.door.h3': 'Neither the first nor the last.',
  'p3.door.h4': 'Start with the first.',
  'p3.math.title': 'MATH CHALLENGE', 'p3.math.good': 'Great job! 🎉',
  'p3.color.title': 'COLOR CHALLENGE', 'p3.color.ask': 'Which is {n}?', 'p3.color.good': 'Great job! 🎉',
  'p3.color.red': 'red', 'p3.color.blue': 'blue', 'p3.color.yellow': 'yellow', 'p3.color.green': 'green',
  'p3.color.purple': 'purple', 'p3.color.orange': 'orange', 'p3.color.pink': 'pink', 'p3.color.cyan': 'light blue',
  'p3.tryAgain': '💪 Almost! Try again',
});
addStrings('pt', {
  'p3.sled.board': 'SUBIR', 'p3.sled.exit': 'DESCER',
  'p3.sled.go': '🛷 Vamos lá!', 'p3.sled.done': '🛷 Boa descida!',
  'p3.extreme.warn1': '⚠️ ROTA EXTREMA 🔥', 'p3.extreme.warn2': 'Só para experts!', 'p3.extreme.warn3': 'Prêmio no final 🏆',
  'p3.extreme.done': '🏆 CONSEGUIU!', 'p3.extreme.done2': 'Você é extremo! 🔥',
  'p3.shieldSaved': '🛡️ O escudo te salvou!',
  'p3.puGot': '{n} ativado!', 'p3.pu.double': 'Pulo duplo 🌀', 'p3.pu.shield': 'Escudo 🛡️', 'p3.pu.speed': 'Velocidade ⚡',
  'p3.bridgeOn': '🌉 Ponte ativada!',
  'p3.gate.title': '⏱️ PORTÃO DO TEMPO', 'p3.gate.sub': 'Atravesse em {n}s!',
  'p3.door.hint': '🔎 Dica:', 'p3.door.win': '🧠 Muito bem!', 'p3.door.open': '🚪 Porta aberta!',
  'p3.door.h0': 'A do meio abre o caminho.',
  'p3.door.h1': 'A primeira é a certa.',
  'p3.door.h2': 'A última é a vencedora.',
  'p3.door.h3': 'Nem a primeira nem a última.',
  'p3.door.h4': 'Comece pela primeira.',
  'p3.math.title': 'DESAFIO DE MATEMÁTICA', 'p3.math.good': 'Muito bem! 🎉',
  'p3.color.title': 'DESAFIO DAS CORES', 'p3.color.ask': 'Qual é o {n}?', 'p3.color.good': 'Muito bem! 🎉',
  'p3.color.red': 'vermelho', 'p3.color.blue': 'azul', 'p3.color.yellow': 'amarelo', 'p3.color.green': 'verde',
  'p3.color.purple': 'roxo', 'p3.color.orange': 'laranja', 'p3.color.pink': 'rosa', 'p3.color.cyan': 'azul-claro',
  'p3.tryAgain': '💪 Quase! Tente de novo',
});
addStrings('fr', {
  'p3.sled.board': 'MONTER', 'p3.sled.exit': 'DESCENDRE',
  'p3.sled.go': '🛷 C’est parti !', 'p3.sled.done': '🛷 Belle descente !',
  'p3.extreme.warn1': '⚠️ PARCOURS EXTRÊME 🔥', 'p3.extreme.warn2': 'Experts uniquement !', 'p3.extreme.warn3': 'Prix à la fin 🏆',
  'p3.extreme.done': '🏆 BRAVO !', 'p3.extreme.done2': 'Tu es extrême ! 🔥',
  'p3.shieldSaved': '🛡️ Le bouclier t’a sauvé !',
  'p3.puGot': '{n} activé !', 'p3.pu.double': 'Double saut 🌀', 'p3.pu.shield': 'Bouclier 🛡️', 'p3.pu.speed': 'Vitesse ⚡',
  'p3.bridgeOn': '🌉 Pont activé !',
  'p3.gate.title': '⏱️ PORTE CHRONO', 'p3.gate.sub': 'Traverse en {n} s !',
  'p3.door.hint': '🔎 Indice :', 'p3.door.win': '🧠 Bien réfléchi !', 'p3.door.open': '🚪 Porte ouverte !',
  'p3.door.h0': 'Celle du milieu ouvre le chemin.',
  'p3.door.h1': 'La première est la bonne.',
  'p3.door.h2': 'La dernière est la gagnante.',
  'p3.door.h3': 'Ni la première ni la dernière.',
  'p3.door.h4': 'Commence par la première.',
  'p3.math.title': 'DÉFI DE MATHS', 'p3.math.good': 'Bravo ! 🎉',
  'p3.color.title': 'DÉFI DES COULEURS', 'p3.color.ask': 'Lequel est {n} ?', 'p3.color.good': 'Bravo ! 🎉',
  'p3.color.red': 'rouge', 'p3.color.blue': 'bleu', 'p3.color.yellow': 'jaune', 'p3.color.green': 'vert',
  'p3.color.purple': 'violet', 'p3.color.orange': 'orange', 'p3.color.pink': 'rose', 'p3.color.cyan': 'bleu clair',
  'p3.tryAgain': '💪 Presque ! Essaie encore',
});

/* ---------------- 🛷 TRINEO MONTADO (mundo 9) ---------------- */
const Sled = { riding: false, near: false, t: 0, cur: null, _nearSled: null, _was: false };
function _polyLen(path) {
  let L = 0;
  for (let i = 1; i < path.length; i++) L += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y, path[i].z - path[i - 1].z);
  return L;
}
function _polyAt(path, d) {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    if (d <= seg) {
      const k = seg ? d / seg : 0;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
    }
    d -= seg;
  }
  const l = path[path.length - 1];
  return { x: l.x, y: l.y, z: l.z };
}
function addSled(lvl, x, y, z, path) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x9c5a2e, roughness: 0.8 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 3), wood); base.position.y = 0.6; g.add(base);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 0.25), wood); back.position.set(0, 1.1, -1.4); g.add(back);
  [-0.7, 0.7].forEach(rx => {
    const runner = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.6, roughness: 0.4 }));
    runner.position.set(rx, 0.15, 0); g.add(runner);
  });
  g.position.set(x, y, z); lvl.group.add(g);
  lvl.sleds = lvl.sleds || [];
  const s = { x, y, z, path, mesh: g, _len: 0 };
  s._len = _polyLen(path);
  lvl.sleds.push(s);
  return s;
}
Sled.startRide = function (s) {
  this.riding = true; this.cur = s; this.t = 0; this.near = false;
  Audio2.pad();
  toast(T('p3.sled.go'));
  $('btn-jump').style.display = 'none';
};
Sled.tick = function (dt) {
  const P = Player, s = this.cur;
  if (!s) { this.riding = false; return; }
  this.t += dt * (6 + this.t * 1.4); // acelera bajando
  if (this.t >= s._len) { this.stopRide(); return; }
  const pt = _polyAt(s.path, this.t);
  P.pos.set(pt.x, pt.y + 0.55, pt.z);
  P.vel.set(0, 0, 0);
  s.mesh.position.set(pt.x, pt.y + 0.1, pt.z);
  if (Math.random() < 0.5)
    Particles.spawn(pt.x, pt.y + 0.2, pt.z, { n: 1, colors: [0xffffff, 0xd8efff], speed: 1.5, up: 1.5, life: 0.7, size: 0.28, grav: 0.4 });
  P.syncMesh();
  if (typeof levelTriggers === 'function') levelTriggers(dt);
};
Sled.stopRide = function () {
  const P = Player, s = this.cur;
  this.riding = false;
  if (s) {
    const pt = _polyAt(s.path, s._len);
    P.pos.set(pt.x, pt.y + 0.9, pt.z);
    s.mesh.position.set(s.x, s.y, s.z);
  }
  P.vel.set(0, 2, 0);
  $('btn-jump').style.display = '';
  toast(T('p3.sled.done'));
};
Sled.tryInteract = function () {
  if (typeof MODE === 'undefined' || MODE !== 'play' || (typeof finished !== 'undefined' && finished)) return false;
  if (this.riding) { this.stopRide(); return true; }
  if (this.near && this._nearSled) { this.startRide(this._nearSled); return true; }
  return false;
};
Sled.reset = function () { this.riding = false; this.near = false; this.cur = null; this._nearSled = null; };

/* humo de chimeneas (mundo 9) */
function _updateSmoke(dt) {
  const srcs = LEVEL.smokeSrc;
  if (!srcs) return;
  for (const s of srcs) {
    s.acc += dt * 1.6;
    if (s.acc >= 1) {
      s.acc = 0;
      Particles.spawn(s.x + (Math.random() - 0.5) * 0.5, s.y, s.z + (Math.random() - 0.5) * 0.5,
        { n: 1, colors: [0xdddddd, 0xbbbbbb], speed: 0.5, up: 2.2, life: 1.8, size: 0.5, grav: -0.2 });
    }
  }
}

/* cercanía al trineo + botones SUBIR/BAJAR */
function _updateSled(dt) {
  const P = Player;
  Sled.near = false; Sled._nearSled = null;
  if (!Sled.riding && typeof MODE !== 'undefined' && MODE === 'play') {
    for (const s of LEVEL.sleds || []) {
      const dx = P.pos.x - s.x, dz = P.pos.z - s.z, dy = P.pos.y - (s.y + 1);
      if (dx * dx + dz * dz < 6.8 && Math.abs(dy) < 3) { Sled.near = true; Sled._nearSled = s; break; }
    }
  }
  const bb = $('btn-board'), be = $('btn-exit');
  const vehBusy = (typeof Vehicle !== 'undefined') && Vehicle.mode !== 'none';
  if (!vehBusy && typeof MODE !== 'undefined' && MODE === 'play') {
    if (Sled.riding) {
      bb.classList.add('hidden'); be.classList.remove('hidden');
      be.textContent = '🛷 ' + T('p3.sled.exit');
    } else if (Sled.near) {
      be.classList.add('hidden'); bb.classList.remove('hidden');
      bb.textContent = '🛷 ' + T('p3.sled.board');
    } else if (Sled._was) {
      bb.classList.add('hidden'); be.classList.add('hidden');
      $('btn-jump').style.display = '';
    }
  }
  Sled._was = Sled.riding || Sled.near;
}
