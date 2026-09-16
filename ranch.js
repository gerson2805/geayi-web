/* ranch.js — 🤠 RANCHO GEAYI + 🏇 CARRERAS DE CABALLOS (mundo 4 · Immokalee)
   Contenido original: granero, cercas, pacas, animales blocky propios,
   UN caballo montable de carreras, 2 caballos montables de paseo libre
   (Trueno junto al rancho, Canela en la zona tranquila al este) y una
   pista ovalada con 3 robots GeayiBoots rivales.
   Expone: addRanchContent(idx, lvl), updateRanch(dt), Ranch.riding,
   Ranch.mount (caballo montado), Ranch.ride (caballos de paseo), Ranch.horsePos().
   Cargar DESPUÉS de state.js, audio.js, vehicles.js, world.js, player.js y game.js. */
'use strict';

/* ==================== i18n (ES / EN / PT / FR) ==================== */
addStrings('es', {
  'ranch.sign': '🤠 RANCHO GEAYI',
  'ranch.mount': '🐴 SUBIR',
  'ranch.dismount': '🐴 BAJAR',
  'ranch.raceSign': '🏇 CARRERAS DE CABALLOS',
  'ranch.go': '¡YA! 🏁',
  'ranch.lapHud': '🏇 Vuelta {lap}/{laps} · {t}',
  'ranch.lap': '🔔 ¡Vuelta {lap}!',
  'ranch.win': '🏆 ¡Ganaste la carrera! Tiempo: {t}',
  'ranch.newBest': '🌟 ¡Nuevo récord! Tiempo: {t}',
  'ranch.needHorse': '🐴 ¡Sube al caballo para correr!',
  'ranch.cow1': '🐄 Lola',
  'ranch.cow2': '🐄 Pinta',
  'ranch.cow3': '🐄 Nube',
  'ranch.ride2': '🐴 ¡Paseo libre! Usa el joystick 🕹️',
  'ranch.rideHorse1': '🐴 Trueno',
  'ranch.rideHorse2': '🐴 Canela',
  'ranch.trailSign': '🐴 ZONA DE PASEO',
});
addStrings('en', {
  'ranch.sign': '🤠 RANCHO GEAYI',
  'ranch.mount': '🐴 RIDE',
  'ranch.dismount': '🐴 GET OFF',
  'ranch.raceSign': '🏇 HORSE RACES',
  'ranch.go': 'GO! 🏁',
  'ranch.lapHud': '🏇 Lap {lap}/{laps} · {t}',
  'ranch.lap': '🔔 Lap {lap}!',
  'ranch.win': '🏆 You won the race! Time: {t}',
  'ranch.newBest': '🌟 New record! Time: {t}',
  'ranch.needHorse': '🐴 Ride the horse to race!',
  'ranch.cow1': '🐄 Lola',
  'ranch.cow2': '🐄 Pinta',
  'ranch.cow3': '🐄 Nube',
  'ranch.ride2': '🐴 Free ride! Use the joystick 🕹️',
  'ranch.rideHorse1': '🐴 Trueno',
  'ranch.rideHorse2': '🐴 Canela',
  'ranch.trailSign': '🐴 TRAIL RIDES',
});
addStrings('pt', {
  'ranch.sign': '🤠 RANCHO GEAYI',
  'ranch.mount': '🐴 MONTAR',
  'ranch.dismount': '🐴 DESCER',
  'ranch.raceSign': '🏇 CORRIDAS DE CAVALOS',
  'ranch.go': 'JÁ! 🏁',
  'ranch.lapHud': '🏇 Volta {lap}/{laps} · {t}',
  'ranch.lap': '🔔 Volta {lap}!',
  'ranch.win': '🏆 Você venceu a corrida! Tempo: {t}',
  'ranch.newBest': '🌟 Novo recorde! Tempo: {t}',
  'ranch.needHorse': '🐴 Monte no cavalo para correr!',
  'ranch.cow1': '🐄 Lola',
  'ranch.cow2': '🐄 Pinta',
  'ranch.cow3': '🐄 Nube',
  'ranch.ride2': '🐴 Passeio livre! Use o joystick 🕹️',
  'ranch.rideHorse1': '🐴 Trueno',
  'ranch.rideHorse2': '🐴 Canela',
  'ranch.trailSign': '🐴 ÁREA DE PASSEIO',
});
addStrings('fr', {
  'ranch.sign': '🤠 RANCHO GEAYI',
  'ranch.mount': '🐴 MONTER',
  'ranch.dismount': '🐴 DESCENDRE',
  'ranch.raceSign': '🏇 COURSES DE CHEVAUX',
  'ranch.go': 'GO ! 🏁',
  'ranch.lapHud': '🏇 Tour {lap}/{laps} · {t}',
  'ranch.lap': '🔔 Tour {lap} !',
  'ranch.win': '🏆 Tu as gagné la course ! Temps : {t}',
  'ranch.newBest': '🌟 Nouveau record ! Temps : {t}',
  'ranch.needHorse': '🐴 Monte sur le cheval pour courir !',
  'ranch.cow1': '🐄 Lola',
  'ranch.cow2': '🐄 Pinta',
  'ranch.cow3': '🐄 Nube',
  'ranch.ride2': '🐴 Balade libre ! Utilise le joystick 🕹️',
  'ranch.rideHorse1': '🐴 Trueno',
  'ranch.rideHorse2': '🐴 Canela',
  'ranch.trailSign': '🐴 ZONE DE BALADE',
});

/* ==================== estado ==================== */
const Ranch = {
  built: false, lvl: null,
  riding: false,                 // true mientras el jugador monta un caballo
  mount: null,                   // caballo montado ahora (carreras o paseo)
  horse: null,                   // caballo de carreras {group, legs, neck, tail, pos, vel, heading, ...}
  ride: [],                      // caballos de paseo libre (montables, más lentos)
  animals: [],                   // caballos/vacas decorativos paseando
  rivals: [],                    // 3 robots GeayiBoots en caballos (siguen el óvalo)
  race: { state: 'idle', t: 0, lap: 0, wp: 0, cd: 0, cdShown: 0, doneT: 0, needCd: 0, rearm: true },
  track: null,                   // {cx, cz, rx, rz, wps:[], gate}
  _jumpBuf: 0,
  _wrapped: false,
};
function Ranch_horsePos() { return Ranch.horse ? Ranch.horse.pos : null; }
Ranch.horsePos = Ranch_horsePos;

/* ---------- utilidades locales ---------- */
function rmat(color, emissive, ei) {
  if (typeof vmat === 'function') return vmat(color, emissive, ei);
  return new THREE.MeshStandardMaterial({ color: color, roughness: 0.85, metalness: 0.05 });
}
function rbox(parent, w, h, d, mat, x, y, z, rz, rx) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (rz) m.rotation.z = rz;
  if (rx) m.rotation.x = rx;
  m.castShadow = true;
  parent.add(m);
  return m;
}
function rLerpAngle(a, b, t) {
  if (typeof lerpAngle === 'function') return lerpAngle(a, b, t);
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
/* letrero con textura de canvas */
function rSign(parent, text, w, h, x, y, z, rotY, bg, fg) {
  const tex = canvasTex(512, Math.max(64, Math.round(512 * h / w)), (c2, cw, ch) => {
    c2.fillStyle = bg || '#5b3a1e'; c2.fillRect(0, 0, cw, ch);
    c2.strokeStyle = fg || '#ffe95e'; c2.lineWidth = 10; c2.strokeRect(10, 10, cw - 20, ch - 20);
    c2.fillStyle = fg || '#ffe95e'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
    let fs = 64;
    c2.font = '900 ' + fs + 'px "Trebuchet MS", sans-serif';
    while (c2.measureText(text).width > cw - 56 && fs > 22) { fs -= 4; c2.font = '900 ' + fs + 'px "Trebuchet MS", sans-serif'; }
    c2.fillText(text, cw / 2, ch / 2 + 2);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = rotY || 0;
  parent.add(m);
  return m;
}
/* etiqueta flotante (sprite: siempre mira a la cámara) */
function rLabelSprite(text) {
  const tex = canvasTex(256, 64, (c2, cw, ch) => {
    c2.font = '900 38px "Trebuchet MS", sans-serif';
    c2.textAlign = 'center'; c2.textBaseline = 'middle';
    c2.lineWidth = 7; c2.strokeStyle = 'rgba(0,0,0,0.75)';
    c2.strokeText(text, cw / 2, ch / 2);
    c2.fillStyle = '#ffffff'; c2.fillText(text, cw / 2, ch / 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  s.scale.set(2.6, 0.65, 1);
  return s;
}

/* ==================== animales ORIGINALES (diseño propio, blocky) ==================== */
function buildHorseMesh(coat, maneColor) {
  const g = new THREE.Group();
  const C = rmat(coat), M = rmat(maneColor == null ? 0x3a2a1a : maneColor), D = rmat(0x1c1c22);
  rbox(g, 0.85, 0.85, 1.7, C, 0, 1.15, 0);                    // cuerpo
  const legs = [];
  [[-0.28, 0.55], [0.28, 0.55], [-0.28, -0.55], [0.28, -0.55]].forEach(([lx, lz]) => {
    const hip = new THREE.Group(); hip.position.set(lx, 0.95, lz);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.95, 0.2), C);
    leg.position.y = -0.475; leg.castShadow = true; hip.add(leg);
    g.add(hip); legs.push(hip);
  });
  // cuello + cabeza en un pivote (para pastoreo; la pose en reposo es idéntica a la original)
  const neckG = new THREE.Group(); neckG.position.set(0, 1.35, 0.9); g.add(neckG);
  rbox(neckG, 0.34, 0.85, 0.38, C, 0, 0.40, 0.02, 0, -0.35);   // cuello
  rbox(neckG, 0.4, 0.42, 0.72, C, 0, 0.83, 0.28);             // cabeza
  rbox(neckG, 0.12, 0.22, 0.1, C, -0.13, 1.13, 0.15);         // orejas
  rbox(neckG, 0.12, 0.22, 0.1, C, 0.13, 1.13, 0.15);
  rbox(neckG, 0.13, 0.75, 0.5, M, 0, 0.65, -0.18, 0, -0.35);  // crin
  const tail = rbox(g, 0.14, 0.7, 0.14, M, 0, 1.35, -0.95, 0, 0.25); // cola
  rbox(neckG, 0.06, 0.1, 0.06, D, -0.21, 0.87, 0.45);         // ojos
  rbox(neckG, 0.06, 0.1, 0.06, D, 0.21, 0.87, 0.45);
  return { group: g, legs: legs, neck: neckG, tail: tail };
}
function buildCowMesh() {
  const g = new THREE.Group();
  const W = rmat(0xf5f2ea), B = rmat(0x2b2b30), P = rmat(0xe8a0a8), H = rmat(0xd8c49a);
  rbox(g, 1.0, 0.85, 1.6, W, 0, 1.0, 0);                     // cuerpo
  rbox(g, 0.4, 0.07, 0.5, B, -0.2, 1.44, 0.3);               // manchas (lomo)
  rbox(g, 0.35, 0.07, 0.4, B, 0.25, 1.44, -0.35);
  rbox(g, 0.3, 0.07, 0.45, B, 0.1, 1.44, 0.55);
  rbox(g, 0.07, 0.4, 0.5, B, -0.51, 1.0, -0.1);              // manchas (costados)
  rbox(g, 0.07, 0.35, 0.4, B, 0.51, 1.05, 0.4);
  [[-0.32, 0.55], [0.32, 0.55], [-0.32, -0.55], [0.32, -0.55]].forEach(([lx, lz]) => {
    rbox(g, 0.22, 0.62, 0.22, W, lx, 0.31, lz);              // patas
  });
  rbox(g, 0.5, 0.5, 0.55, W, 0, 1.45, 1.0);                  // cabeza
  rbox(g, 0.34, 0.16, 0.1, P, 0, 1.32, 1.29);                // hocico
  const hornG = new THREE.ConeGeometry(0.07, 0.3, 8);
  [[-0.22], [0.22]].forEach(([hx]) => {                      // cuernos
    const horn = new THREE.Mesh(hornG, H);
    horn.position.set(hx, 1.8, 1.0); horn.castShadow = true; g.add(horn);
  });
  rbox(g, 0.2, 0.08, 0.12, W, -0.33, 1.58, 1.0);             // orejas
  rbox(g, 0.2, 0.08, 0.12, W, 0.33, 1.58, 1.0);
  rbox(g, 0.1, 0.6, 0.1, W, 0, 1.0, -0.85, 0, 0.2);          // cola
  return { group: g, legs: [] };
}

/* ==================== construcciones ==================== */
function buildBarn(g, cx, cz) {
  const red = rmat(0xb03030), darkRed = rmat(0x8c2424),
        white = rmat(0xf5f0e6), roofM = rmat(0x6e747c);
  rbox(g, 8, 4.5, 9, red, cx, 2.25, cz);                       // cuerpo
  [[-4, -4.5], [4, -4.5], [-4, 4.5], [4, 4.5]].forEach(([ox, oz]) => {
    rbox(g, 0.35, 4.5, 0.35, white, cx + ox, 2.25, cz + oz);   // esquinas blancas
  });
  rbox(g, 0.18, 3.0, 2.3, white, cx + 4.02, 1.5, cz);          // puerta (marco)
  rbox(g, 0.2, 2.7, 1.9, darkRed, cx + 4.03, 1.35, cz);        // puerta
  rbox(g, 0.18, 1.0, 1.0, white, cx + 4.02, 3.2, cz - 2.6);    // ventanas
  rbox(g, 0.18, 1.0, 1.0, white, cx + 4.02, 3.2, cz + 2.6);
  const ang = Math.atan2(2.2, 4.6);                            // techo: 2 losas
  rbox(g, 5.5, 0.28, 10, roofM, cx - 2.3, 5.6, cz, Math.atan2(-2.2, -4.6));
  rbox(g, 5.5, 0.28, 10, roofM, cx + 2.3, 5.6, cz, Math.atan2(-2.2, 4.6));
  const tri = new THREE.Shape();                               // hastiales (triángulos)
  tri.moveTo(-4, 4.5); tri.lineTo(4, 4.5); tri.lineTo(0, 6.7); tri.closePath();
  const tg = new THREE.ShapeGeometry(tri);
  const tm = new THREE.MeshStandardMaterial({ color: 0xb03030, roughness: 0.9, side: THREE.DoubleSide });
  [cz - 4.49, cz + 4.49].forEach(zz => {
    const m = new THREE.Mesh(tg, tm); m.position.set(cx, 0, zz); g.add(m);
  });
}
function buildFence(g, x1, z1, x2, z2) {
  const wood = rmat(0x8a5a2e);
  [[x1, z1, x2, z1], [x2, z1, x2, z2], [x2, z2, x1, z2], [x1, z2, x1, z1]]
    .forEach(([ax, az, bx, bz]) => {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 2.2));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        rbox(g, 0.22, 1.15, 0.22, wood, ax + (bx - ax) * t, 0.57, az + (bz - az) * t);
      }
      [0.55, 0.95].forEach(h => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.14), wood);
        rail.position.set((ax + bx) / 2, h, (az + bz) / 2);
        rail.rotation.y = -Math.atan2(bz - az, bx - ax);
        rail.castShadow = true; g.add(rail);
      });
    });
}
function hayBale(g, x, z, rotY) {
  const grp = new THREE.Group(); grp.position.set(x, 0.75, z); grp.rotation.y = rotY || 0;
  const y = rmat(0xe3b93a), s = rmat(0x8a5a2e);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.2, 14), y);
  c.rotation.z = Math.PI / 2; c.castShadow = true; grp.add(c);
  [-0.35, 0.35].forEach(ox => {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.045, 8, 20), s);
    strap.position.x = ox; strap.rotation.y = Math.PI / 2; grp.add(strap);
  });
  g.add(grp);
}
function buildGate(g, x, z, rotY, checkered) {
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rotY;
  const post = rmat(0x7a4a21);
  [-2.6, 2.6].forEach(px => rbox(grp, 0.45, 3.6, 0.45, post, px, 1.8, 0));
  let beamM;
  if (checkered) {
    const tex = canvasTex(256, 32, (c2) => {
      for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) {
        c2.fillStyle = (i + j) % 2 ? '#111111' : '#ffffff';
        c2.fillRect(i * 16, j * 16, 16, 16);
      }
    });
    beamM = new THREE.MeshBasicMaterial({ map: tex });
  } else beamM = rmat(0xb03030);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.6, 0.6), beamM);
  beam.position.set(0, 3.6, 0); beam.castShadow = true; grp.add(beam);
  g.add(grp);
}
function buildTrackVisual(g, cx, cz) {
  const tex = canvasTex(512, 352, (c2) => {
    c2.fillStyle = '#8a6238';                                  // anillo de tierra
    c2.beginPath(); c2.ellipse(256, 176, 233, 152, 0, 0, Math.PI * 2); c2.fill();
    c2.strokeStyle = '#f5f0e6'; c2.lineWidth = 5;              // bordes blancos
    c2.beginPath(); c2.ellipse(256, 176, 233, 152, 0, 0, Math.PI * 2); c2.stroke();
    c2.beginPath(); c2.ellipse(256, 176, 186, 105, 0, 0, Math.PI * 2); c2.stroke();
    c2.fillStyle = '#62b34e';                                  // pasto interior
    c2.beginPath(); c2.ellipse(256, 176, 186, 105, 0, 0, Math.PI * 2); c2.fill();
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {   // meta cuadriculada (oeste)
      c2.fillStyle = (i + j) % 2 ? '#111111' : '#ffffff';
      c2.fillRect(23 + i * 8, 164 + j * 8, 8, 8);
    }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(44, 30),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(cx, 0.07, cz);
  g.add(m);
}
function buildPodium(g, x, z) {
  const cols = [0xc0c0c0, 0xffd23f, 0xcd7f32], hs = [0.8, 1.2, 0.5], offs = [-1.8, 0, 1.8];
  const nums = ['2', '1', '3'];
  offs.forEach((ox, i) => {
    rbox(g, 1.4, hs[i], 1.4, rmat(cols[i]), x + ox, hs[i] / 2, z);
    const tex = canvasTex(64, 64, (c2) => {
      c2.fillStyle = '#222222'; c2.font = '900 44px "Trebuchet MS", sans-serif';
      c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText(nums[i], 32, 34);
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    p.position.set(x + ox, hs[i] / 2, z + 0.71); g.add(p);
  });
}

/* ==================== construcción del rancho (solo mundo 4) ==================== */
function addRanchContent(idx, lvl) {
  if (idx !== 3 || !lvl || !lvl.group) return;
  const g = lvl.group;
  Ranch.lvl = lvl; Ranch.idx = idx; Ranch.built = true;
  Ranch.animals = []; Ranch.rivals = []; Ranch.ride = [];
  Ranch.riding = false; Ranch.mount = null;
  Ranch.race = { state: 'idle', t: 0, lap: 0, wp: 0, cd: 0, cdShown: 0, doneT: 0, needCd: 0, rearm: true };

  // piso de tierra del rancho + senderos (un solo bloque, sin costuras)
  // Rancho GEAYI al sureste del pueblo: x∈[42,118] z∈[118,162]
  // sendero oeste hacia el casino + conector norte hasta Immokalee Dr (z=108)
  addPlatform(lvl, 80, 0, 140, 76, 44, { color: 0xa08050 });
  addPlatform(lvl, 39, 0, 140, 6, 4.5, { color: 0x8a6a3e });
  addPlatform(lvl, 80, 0, 113, 4.5, 10, { color: 0x8a6a3e });

  // arco de entrada "🤠 RANCHO GEAYI" (mirando al oeste, hacia el pueblo)
  const wood = rmat(0x6e4520);
  rbox(g, 0.4, 3.6, 0.4, wood, 44, 1.8, 137.6);
  rbox(g, 0.4, 3.6, 0.4, wood, 44, 1.8, 142.4);
  rbox(g, 0.5, 1.2, 5.6, wood, 44, 3.9, 140);
  rSign(g, T('ranch.sign'), 5.2, 1.0, 43.68, 3.9, 140, -Math.PI / 2, '#5b3a1e', '#ffe95e');

  // granero rojo con techo prisma y ribetes blancos (puerta al este, hacia la pista)
  buildBarn(g, 48, 152);

  // potreros cercados
  buildFence(g, 104, 120, 114, 130);   // caballos
  buildFence(g, 104, 150, 114, 160);   // vacas

  // pacas de heno
  hayBale(g, 66, 158, 0.4); hayBale(g, 90, 158, 1.2);
  hayBale(g, 108, 135, 0.8); hayBale(g, 62, 128, 0.1); hayBale(g, 108, 145, 0.6);

  // 3 caballos decorativos paseando (marrón / blanco / negro)
  const horseCols = [[0x7a4a21, 0x2e1f10], [0xf0ece0, 0xcfc8b8], [0x2e2a28, 0x141214]];
  horseCols.forEach(([coat, mane], i) => {
    const h = buildHorseMesh(coat, mane);
    h.group.position.set(109 + (i - 1) * 2.5, 0, 125);
    g.add(h.group);
    Ranch.animals.push({
      kind: 'horse', group: h.group, legs: h.legs, t: Math.random() * 6,
      x1: 105, z1: 121, x2: 113, z2: 129,
      tx: 109, tz: 125, speed: 1.4, pause: 0,
    });
  });
  // 3 vacas decorativas con sus nombres (sustantivos propios: no se traducen)
  ['ranch.cow1', 'ranch.cow2', 'ranch.cow3'].forEach((key, i) => {
    const c = buildCowMesh();
    c.group.position.set(109 + (i - 1) * 2.5, 0, 155);
    g.add(c.group);
    const label = rLabelSprite(T(key));
    label.position.y = 2.7; c.group.add(label);
    Ranch.animals.push({
      kind: 'cow', group: c.group, legs: c.legs, t: Math.random() * 6,
      x1: 105, z1: 151, x2: 113, z2: 159,
      tx: 109, tz: 155, speed: 0.6, pause: 1 + Math.random() * 3,
    });
  });

  // 🐴 UN caballo montable junto al granero
  const rh = buildHorseMesh(0xc98a4b, 0x6e4a26);
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 1.0), rmat(0xc22f2f));
  saddle.position.set(0, 1.62, 0); saddle.castShadow = true; rh.group.add(saddle);
  rh.group.position.set(50, 0, 145); rh.group.rotation.y = Math.PI / 2;
  g.add(rh.group);
  Ranch.horse = {
    kind: 'race', group: rh.group, legs: rh.legs, neck: rh.neck, tail: rh.tail,
    pos: new THREE.Vector3(50, 0, 145), vel: new THREE.Vector3(),
    heading: Math.PI / 2, grounded: true, t: 0,
    bounds: { x1: 42, z1: 118, x2: 118, z2: 162 }, // suelto dentro del rancho
  };

  /* ---------- 🐴 caballos de paseo libre (montables, diseños originales) ----------
     Trueno (gris) junto al rancho · Canela (palomino) en la zona tranquila
     al este del rancho (pasto abierto, sin edificios cerca). */
  function addRideHorse(nameKey, coat, mane, saddleC, x, z, heading, bounds, wbox) {
    const h2 = buildHorseMesh(coat, mane);
    const sad = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 1.0), rmat(saddleC));
    sad.position.set(0, 1.62, 0); sad.castShadow = true; h2.group.add(sad);
    h2.group.position.set(x, 0, z); h2.group.rotation.y = heading;
    g.add(h2.group);
    const label = rLabelSprite(T(nameKey));
    label.position.y = 2.9; h2.group.add(label);
    Ranch.ride.push({
      kind: 'ride', key: nameKey,
      group: h2.group, legs: h2.legs, neck: h2.neck, tail: h2.tail,
      pos: new THREE.Vector3(x, 0, z), vel: new THREE.Vector3(),
      heading: heading, grounded: true, t: Math.random() * 6, phase: Math.random() * 6,
      bounds: bounds, speed: 1.2,
      tx: x, tz: z, pause: 1 + Math.random() * 2, graze: false,
      wx1: wbox[0], wz1: wbox[1], wx2: wbox[2], wz2: wbox[3], // cajón de deambulado
    });
  }
  addRideHorse('ranch.rideHorse1', 0x8a8f96, 0x3c3f45, 0x2fb9ff, 70, 125, -Math.PI / 2,
    { x1: 42, z1: 110, x2: 118, z2: 164 }, [64, 120, 80, 131]);
  addRideHorse('ranch.rideHorse2', 0xd9a86c, 0xf0ece0, 0x9d6bff, 132, 128, Math.PI,
    { x1: 116, z1: 110, x2: 146, z2: 142 }, [124, 120, 140, 136]);
  // letrero de madera "🐴 ZONA DE PASEO" junto a Canela (mirando al oeste)
  rbox(g, 0.4, 3.0, 0.4, wood, 126, 1.5, 116.8);
  rbox(g, 0.4, 3.0, 0.4, wood, 126, 1.5, 119.2);
  rSign(g, T('ranch.trailSign'), 4.6, 0.95, 125.68, 2.9, 118, -Math.PI / 2, '#0e2a33', '#ffe95e');

  /* ---------- 🏇 pista de carreras ---------- */
  const TC = { x: 78, z: 140, rx: 12, rz: 7 };
  buildTrackVisual(g, TC.x, TC.z);
  const wps = [];
  for (let k = 0; k < 12; k++) {
    const th = Math.PI + k * Math.PI / 6;
    wps.push({ x: TC.x + TC.rx * Math.cos(th), z: TC.z + TC.rz * Math.sin(th) });
  }
  Ranch.track = { cx: TC.x, cz: TC.z, rx: TC.rx, rz: TC.rz, wps: wps, gate: wps[0] };
  buildGate(g, wps[0].x, wps[0].z, Math.PI / 2, true);          // salida/meta cuadriculada
  buildGate(g, wps[4].x, wps[4].z, 2.80, false);
  buildGate(g, wps[8].x, wps[8].z, -0.34, false);
  // letrero de la pista (en el interior, mirando al oeste)
  rbox(g, 0.4, 3.2, 0.4, wood, 60, 1.6, 138.5);
  rbox(g, 0.4, 3.2, 0.4, wood, 60, 1.6, 141.5);
  rSign(g, T('ranch.raceSign'), 8, 1.6, 59.7, 3.1, 140, -Math.PI / 2, '#0e2a33', '#ffe95e');
  // podio
  buildPodium(g, 78, 157);

  // 3 robots GeayiBoots rivales sobre caballos (diseño original de vehicles.js)
  const rivalCols = [0x8a5a2e, 0x6a6a72, 0x9c6a3a];
  const rivalSpeeds = [8.5, 9.2, 9.8];
  rivalCols.forEach((coat, i) => {
    const h = buildHorseMesh(coat);
    let bot = null;
    if (typeof buildGeayiBootMesh === 'function') {
      bot = buildGeayiBootMesh();
      bot.scale.setScalar(0.72);
      bot.position.set(0, 1.35, -0.15);
      h.group.add(bot);
    }
    g.add(h.group);
    Ranch.rivals.push({
      group: h.group, legs: h.legs, bot: bot, t: Math.random() * 6,
      theta: Math.PI - 0.25 - i * 0.35, speed: rivalSpeeds[i],
    });
  });

  raceChip(); // crea el chip del HUD (oculto)
}

/* ==================== montar / desmontar ==================== */
/* caballo montable más cercano (carreras o paseo), dentro de 2.6 m */
function ranchNearestHorse() {
  if (typeof Player === 'undefined' || !Player.pos) return null;
  let best = null, bd = 2.6;
  const cands = [];
  if (Ranch.horse) cands.push(Ranch.horse);
  Ranch.ride.forEach(h => cands.push(h));
  cands.forEach(h => {
    const d = Math.hypot(Player.pos.x - h.pos.x, Player.pos.z - h.pos.z);
    if (d < bd) { bd = d; best = h; }
  });
  return best;
}
function ranchHorseDist() {
  const h = ranchNearestHorse();
  if (!h) return 99;
  return Math.hypot(Player.pos.x - h.pos.x, Player.pos.z - h.pos.z);
}
function ranchBtn() {
  let b = $('btn-horse');
  if (!b) {
    b = document.createElement('button');
    b.id = 'btn-horse';
    b.className = 'veh-btn hidden';
    b.style.bottom = 'calc(300px + env(safe-area-inset-bottom))';
    b.style.background = 'radial-gradient(circle at 35% 35%,#ffd9a0,#b06a1e)';
    b.style.color = '#3a2200';
    b.addEventListener('click', () => {
      Audio2.init();
      if (Ranch.riding) ranchDismount(); else ranchMount();
    });
    document.body.appendChild(b);
  }
  return b;
}
function ranchMount() {
  if (Ranch.riding || typeof MODE === 'undefined' || MODE !== 'play') return;
  if (typeof Vehicle !== 'undefined' && Vehicle.mode !== 'none') return;
  if (typeof finished !== 'undefined' && finished) return;
  const h = ranchNearestHorse();
  if (!h) { Audio2.deny(); return; }
  Ranch.mount = h;
  Ranch.riding = true;
  Ranch._jumpBuf = 0;
  Audio2.click();
  if (h.kind === 'ride') toast(T('ranch.ride2'));
}
function ranchDismount(silent) {
  const H = Ranch.mount || Ranch.horse;
  if (!Ranch.riding || !H) return;
  Ranch.riding = false;
  Ranch.mount = null;
  // el avatar baja al costado del caballo (dentro de los límites del caballo)
  const rx = Math.cos(H.heading), rz = -Math.sin(H.heading);
  const B = H.bounds || { x1: -57, z1: 1, x2: -14, z2: 126 };
  const nx = Math.min(B.x2, Math.max(B.x1, H.pos.x + rx * 1.7));
  const nz = Math.min(B.z2, Math.max(B.z1, H.pos.z + rz * 1.7));
  if (typeof Player !== 'undefined' && Player.pos) {
    Player.pos.set(nx, 0.02, nz);
    if (Player.vel) Player.vel.set(0, 0, 0);
    Player.grounded = true;
    if (typeof Player.syncMesh === 'function') Player.syncMesh();
  }
  if (H.kind === 'ride') { // se queda pastando donde quedó
    H.tx = H.pos.x; H.tz = H.pos.z; H.pause = 2; H.graze = true;
  }
  if (Ranch.race.state === 'countdown' || Ranch.race.state === 'racing') {
    Ranch.race.state = 'idle';
    hideRaceChip();
  }
  if (!silent) Audio2.click();
}

/* ==================== chip del HUD de la carrera ==================== */
function raceChip() {
  let c = $('hud-race');
  if (!c) {
    c = document.createElement('div');
    c.id = 'hud-race';
    c.className = 'hud-chip hidden';
    const left = document.querySelector('#hud .hud-left');
    if (left) left.appendChild(c); else document.body.appendChild(c);
  }
  return c;
}
function hideRaceChip() {
  const c = $('hud-race');
  if (c) c.classList.add('hidden');
}
function showRaceChip(html) {
  const c = raceChip();
  c.innerHTML = html;
  c.classList.remove('hidden');
}

/* ==================== lógica de la carrera ==================== */
function ranchStartCountdown() {
  const R = Ranch.race;
  R.state = 'countdown'; R.cd = 3.2; R.cdShown = 4; R.t = 0; R.lap = 1; R.wp = 0;
  Audio2.click();
}
function ranchFinishRace() {
  const R = Ranch.race;
  R.state = 'done'; R.doneT = 5; R.rearm = false; // hay que salir de la meta para rearmar
  hideRaceChip();
  const ms = Math.round(R.t * 1000);
  const P = (typeof Player !== 'undefined' && Player.pos) ? Player.pos : { x: 0, y: 0, z: 0 };
  for (let i = 0; i < 4; i++) {
    Particles.burst(P.x + (Math.random() - 0.5) * 5, P.y + 2 + Math.random() * 2.5, P.z + (Math.random() - 0.5) * 5,
      [0xff3d5e, 0xffe95e, 0x00e5ff, 0x59d867, 0xffffff], 30, 6);
  }
  Audio2.win();
  let newBest = false;
  try {
    if (typeof SAVE !== 'undefined') {
      if (SAVE.bestHorse == null || ms < SAVE.bestHorse) {
        SAVE.bestHorse = ms; newBest = true;
        if (typeof persist === 'function') persist();
      }
    }
  } catch (e) {}
  toast(tp(newBest ? 'ranch.newBest' : 'ranch.win', { t: fmtTime(ms) }));
  if (typeof Trophy !== 'undefined' && Trophy && typeof Trophy.unlock === 'function') {
    try { Trophy.unlock('horseWin'); } catch (e) {}
  }
}
function updateRace(dt) {
  const R = Ranch.race, T0 = Ranch.track;
  // la carrera solo existe con el caballo de carreras montado;
  // con un caballo de paseo solo se pasea (sin cronómetro ni rivales)
  const racing = Ranch.riding && Ranch.mount === Ranch.horse;
  if (!T0 || !racing) {
    if (!racing && R.state !== 'idle' && R.state !== 'done') { R.state = 'idle'; hideRaceChip(); }
    return;
  }
  const P = Player.pos;
  const dGate = Math.hypot(P.x - T0.gate.x, P.z - T0.gate.z);
  if (R.state === 'idle') {
    R.needCd = Math.max(0, R.needCd - dt);
    if (dGate > 6) R.rearm = true;              // salir de la meta rearma la carrera
    if (R.rearm && dGate < 3.5) {
      ranchStartCountdown();
    }
    return;
  }
  if (R.state === 'countdown') {
    R.cd -= dt;
    const n = Math.ceil(R.cd);
    if (n !== R.cdShown && n >= 1) { R.cdShown = n; toast(String(n)); Audio2.click(); }
    showRaceChip('🏁 ' + Math.min(3, Math.max(1, n)));
    if (R.cd <= 0) {
      R.state = 'racing'; R.t = 0;
      toast(T('ranch.go')); Audio2.check();
    }
    return;
  }
  if (R.state === 'racing') {
    R.t += dt;
    const next = (R.wp + 1) % T0.wps.length;
    const w = T0.wps[next];
    if (Math.hypot(P.x - w.x, P.z - w.z) < 4.2) {
      R.wp = next;
      if (next === 0) {
        R.lap++;
        if (R.lap > 2) { ranchFinishRace(); return; }
        toast(tp('ranch.lap', { lap: R.lap })); Audio2.check();
      }
    }
    showRaceChip(tp('ranch.lapHud', { lap: Math.min(R.lap, 2), laps: 2, t: fmtTime(Math.round(R.t * 1000)) }));
    return;
  }
  if (R.state === 'done') {
    R.doneT -= dt;
    if (R.doneT <= 0) R.state = 'idle';
  }
}

/* ==================== update principal ==================== */
function swingLegs(legs, t, amp) {
  if (!legs || !legs.length) return;
  const sw = Math.sin(t) * amp;
  legs[0].rotation.x = sw; legs[3].rotation.x = -sw;
  legs[1].rotation.x = -sw; legs[2].rotation.x = sw;
}
function updateRanch(dt) {
  // envolver tryJump una sola vez (SALTAR / Espacio = saltito del caballo)
  if (!Ranch._wrapped && typeof tryJump === 'function') {
    Ranch._wrapped = true;
    try {
      const _tj = tryJump;
      tryJump = function () {
        if (Ranch.riding) { Ranch._jumpBuf = 0.15; return; }
        return _tj();
      };
    } catch (e) {}
  }
  const btn = ranchBtn();
  const active = Ranch.built && typeof LEVEL !== 'undefined' && LEVEL === Ranch.lvl &&
    typeof MODE !== 'undefined' && MODE === 'play';
  if (!active) {
    if (btn) btn.classList.add('hidden');
    hideRaceChip();
    if (Ranch.riding) ranchDismount(true);
    return;
  }
  const P = Player;

  /* --- animales decorativos: paseo lento por waypoints --- */
  Ranch.animals.forEach(a => {
    a.t += dt;
    if (a.pause > 0) { a.pause -= dt; swingLegs(a.legs, a.t, 0); return; }
    const dx = a.tx - a.group.position.x, dz = a.tz - a.group.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.4) {
      a.tx = a.x1 + Math.random() * (a.x2 - a.x1);
      a.tz = a.z1 + Math.random() * (a.z2 - a.z1);
      a.pause = a.kind === 'cow' ? 2 + Math.random() * 4 : 1 + Math.random() * 2.5;
    } else {
      a.group.position.x += dx / d * a.speed * dt;
      a.group.position.z += dz / d * a.speed * dt;
      a.group.rotation.y = rLerpAngle(a.group.rotation.y, Math.atan2(dx, dz),
        1 - Math.pow(0.01, dt * 4));
      swingLegs(a.legs, a.t * (2 + a.speed * 2), Math.min(0.4, a.speed * 0.25));
    }
  });

  /* --- montura: física de cabalgata (caballo de carreras o de paseo) --- */
  const Mnt = (Ranch.riding && Ranch.mount) ? Ranch.mount : null;
  if (Mnt) {
    const inp = (typeof readInput === 'function') ? readInput() : { x: 0, z: 0 };
    const hasInput = Math.hypot(inp.x, inp.z) > 0.12;
    const SPEED_H = Mnt.kind === 'ride' ? 6 : 10;   // paseo tranquilo, carrera rápida
    if (hasInput && !(typeof finished !== 'undefined' && finished)) {
      const a = Math.atan2(inp.x, inp.z);
      const wx = Math.sin(P.camYaw - a), wz = Math.cos(P.camYaw - a);
      const k = 1 - Math.pow(0.0001, dt);
      Mnt.vel.x += (wx * SPEED_H - Mnt.vel.x) * k;
      Mnt.vel.z += (wz * SPEED_H - Mnt.vel.z) * k;
      Mnt.heading = rLerpAngle(Mnt.heading, Math.atan2(Mnt.vel.x, Mnt.vel.z), 1 - Math.pow(0.0001, dt * 8));
      // GEAYI cámara libre: no auto-girar al cabalgar (el jugador la mueve arrastrando)
    } else {
      const f = Math.pow(0.001, dt);
      Mnt.vel.x *= f; Mnt.vel.z *= f;
    }
    Ranch._jumpBuf = Math.max(0, Ranch._jumpBuf - dt);
    if (Ranch._jumpBuf > 0 && Mnt.grounded) {
      Mnt.vel.y = 8; Mnt.grounded = false; Ranch._jumpBuf = 0;
      Audio2.jump();
      Particles.burst(Mnt.pos.x, Mnt.pos.y + 0.2, Mnt.pos.z, [0xffffff, 0xd8c49a], 8, 2.5);
    }
    Mnt.vel.y -= 30 * dt;
    if (Mnt.vel.y < -20) Mnt.vel.y = -20;
    Mnt.pos.x += Mnt.vel.x * dt; Mnt.pos.z += Mnt.vel.z * dt; Mnt.pos.y += Mnt.vel.y * dt;
    if (Mnt.pos.y <= 0) { Mnt.pos.y = 0; Mnt.vel.y = 0; Mnt.grounded = true; }
    const MB = Mnt.bounds || { x1: 42, z1: 118, x2: 118, z2: 162 };
    Mnt.pos.x = Math.min(MB.x2, Math.max(MB.x1, Mnt.pos.x)); // dentro de su zona
    Mnt.pos.z = Math.min(MB.z2, Math.max(MB.z1, Mnt.pos.z));
    Mnt.group.position.copy(Mnt.pos);
    Mnt.group.rotation.y = Mnt.heading;
    Mnt.t += dt * (2 + Math.hypot(Mnt.vel.x, Mnt.vel.z) * 1.2);
    const sp = Math.hypot(Mnt.vel.x, Mnt.vel.z);
    swingLegs(Mnt.legs, Mnt.t, Math.min(0.7, sp * 0.09));
    if (Mnt.tail) Mnt.tail.rotation.z = Math.sin(Mnt.t * 3) * 0.2;
    // el avatar va SENTADO en el caballo
    P.pos.set(Mnt.pos.x, Mnt.pos.y, Mnt.pos.z);
    P.vel.set(Mnt.vel.x, Mnt.vel.y, Mnt.vel.z);
    P.grounded = Mnt.grounded; P.heading = Mnt.heading;
    if (typeof P.syncMesh === 'function') P.syncMesh();
    if (Avatar && Avatar.group) {
      Avatar.group.position.set(Mnt.pos.x, Mnt.pos.y + 1.05, Mnt.pos.z); // sentado en la silla
      Avatar.group.rotation.y = Mnt.heading;
      if (typeof Avatar.animate === 'function') Avatar.animate(dt, 0, true);
    }
  }

  /* --- caballo de carreras sin jinete: pastando junto al granero --- */
  const H = Ranch.horse;
  if (H && H !== Mnt) {
    H.t += dt;
    H.group.position.copy(H.pos);
    H.group.rotation.y = H.heading + Math.sin(H.t * 0.5) * 0.08;
    swingLegs(H.legs, H.t, 0);
    if (H.tail) H.tail.rotation.z = Math.sin(H.t * 2.2) * 0.25;
  }

  /* --- caballos de paseo sin jinete: deambulan y pastan (barato) --- */
  Ranch.ride.forEach(h => {
    if (h === Mnt) return;
    h.t += dt;
    const walking = h.pause <= 0;
    if (h.pause > 0) {
      h.pause -= dt;
      swingLegs(h.legs, h.t, 0);
    } else {
      const dx = h.tx - h.group.position.x, dz = h.tz - h.group.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.4) {
        h.tx = h.wx1 + Math.random() * (h.wx2 - h.wx1);
        h.tz = h.wz1 + Math.random() * (h.wz2 - h.wz1);
        h.pause = 2 + Math.random() * 4;
        h.graze = Math.random() < 0.55;
      } else {
        h.group.position.x += dx / d * h.speed * dt;
        h.group.position.z += dz / d * h.speed * dt;
        h.pos.set(h.group.position.x, 0, h.group.position.z);
        h.group.rotation.y = rLerpAngle(h.group.rotation.y, Math.atan2(dx, dz),
          1 - Math.pow(0.01, dt * 4));
        h.heading = h.group.rotation.y;
        swingLegs(h.legs, h.t * (2 + h.speed * 2), Math.min(0.4, h.speed * 0.25));
      }
    }
    // cabeza: abajo pastando en la pausa, leve cabeceo al caminar
    const nTarget = (h.pause > 0 && h.graze) ? 0.95 : (walking ? Math.sin(h.t * 5) * 0.05 : 0);
    h.neck.rotation.x += (nTarget - h.neck.rotation.x) * Math.min(1, dt * 3);
    h.tail.rotation.z = Math.sin(h.t * 2.2 + h.phase) * 0.28;
  });

  /* --- botón flotante 🐴 SUBIR / BAJAR --- */
  if (Ranch.riding) {
    btn.classList.remove('hidden');
    btn.textContent = T('ranch.dismount');
  } else if (typeof Vehicle !== 'undefined' && Vehicle.mode === 'none' &&
             !(typeof finished !== 'undefined' && finished) && ranchNearestHorse()) {
    btn.classList.remove('hidden');
    btn.textContent = T('ranch.mount');
  } else {
    btn.classList.add('hidden');
  }

  /* --- rivales: robots GeayiBoots dando vueltas al óvalo --- */
  const T0 = Ranch.track;
  if (T0) {
    Ranch.rivals.forEach(r => {
      r.theta += r.speed * dt / 14.5;
      const x = T0.cx + T0.rx * Math.cos(r.theta), z = T0.cz + T0.rz * Math.sin(r.theta);
      r.group.position.set(x, 0, z);
      r.group.rotation.y = Math.atan2(-T0.rx * Math.sin(r.theta), T0.rz * Math.cos(r.theta));
      r.t += dt * (2 + r.speed * 1.4);
      swingLegs(r.legs, r.t, 0.55);
      if (r.bot && typeof animateGeayiBoot === 'function') animateGeayiBoot(r.bot, dt, r.speed);
    });
  }

  /* --- carrera --- */
  if (!Ranch.riding && Ranch.race.state === 'idle' && T0) {
    // a pie cruzando la meta: avisar que hay que montar (con enfriamiento)
    Ranch.race.needCd = Math.max(0, Ranch.race.needCd - dt);
    if (Ranch.race.needCd <= 0 &&
        Math.hypot(P.pos.x - T0.gate.x, P.pos.z - T0.gate.z) < 3.5) {
      Ranch.race.needCd = 4;
      toast(T('ranch.needHorse')); Audio2.deny();
    }
  }
  updateRace(dt);
}

/* ==================== tecla E (con las guardias pedidas) ==================== */
window.addEventListener('keydown', function ranchKey(e) {
  if (!e || e.code !== 'KeyE') return;
  if (typeof MODE === 'undefined' || MODE !== 'play') return;
  if (typeof finished !== 'undefined' && finished) return;
  if (!Ranch.built || typeof LEVEL === 'undefined' || LEVEL !== Ranch.lvl) return;
  if (Ranch.riding) { ranchDismount(); return; }
  // guardias: a pie, sin vehículo y sin otro vehículo cerca
  if (typeof Vehicle !== 'undefined' && Vehicle.mode === 'none' && !Vehicle.near &&
      ranchHorseDist() < 2.6) {
    ranchMount();
  }
});
