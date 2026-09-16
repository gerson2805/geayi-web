/* neoncity.js — 🌃 CIUDAD NEÓN GIGANTE (mundo visible 2 / índice real 0)
   Reemplaza el cuerpo de buildLevel1(lvl) en world.js (ver reporte de integración).
   - Losa 360×360 a nivel del suelo: cuadrícula de calles/avenidas, aceras, cruces.
   - Decenas de rascacielos de neón (20-60 m) con texturas canvas 100% propias.
   - Letreros luminosos con nombres ORIGINALES inventados (nada de marcas reales).
   - Farolas de neón, plaza central con fuente luminosa, tiendas a nivel de calle,
     carros decorativos propios, tráfico GEAYI en la avenida principal.
   - Cero saltos obligatorios: todo caminable. Mirador bajo opcional con rampa.
   - Rendimiento Android: texturas cacheadas y reutilizadas, materiales cacheados,
     marcas viales en planos con textura repetida (no cientos de mallas).
   REGLAS: todo original, sin módulos (todo global), UI en español,
   NO ejecuta DOM al cargar (solo define funciones y cachés perezosas).
*/
'use strict';

/* ---------- PRNG con semilla (variedad estable entre cargas) ---------- */
function _ncRnd(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ---------- texturas propias de fachadas (3 variantes, cacheadas) ---------- */
const _ncFacadeTex = [null, null, null];
function _ncFacadeTexMake(v) {
  if (_ncFacadeTex[v]) return _ncFacadeTex[v];
  const pals = [
    ['#00e5ff', '#ff2fd6', '#ffe95e'], // bandas horizontales cian/magenta
    ['#7bff9e', '#00e5ff', '#ffffff'], // franjas verticales verdes
    ['#ff9f1c', '#ff2fd6', '#9d6bff']  // rejilla de puntos naranja/violeta
  ];
  const cols = pals[v % 3];
  const t = canvasTex(128, 256, (c) => {
    c.fillStyle = '#0d1020'; c.fillRect(0, 0, 128, 256);
    let s = 987 + v * 1313;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    if (v === 0) { // bandas horizontales de ventanas
      for (let r = 0; r < 12; r++) for (let col = 0; col < 6; col++) {
        c.fillStyle = rnd() < 0.6 ? cols[(rnd() * 3) | 0] : '#04060c';
        c.fillRect(4 + col * 21, 6 + r * 21, 15, 10);
      }
    } else if (v === 1) { // franjas verticales luminosas
      for (let col = 0; col < 8; col++) for (let r = 0; r < 14; r++) {
        c.fillStyle = rnd() < 0.5 ? cols[col % 3] : '#04060c';
        c.fillRect(6 + col * 15, 6 + r * 18, 9, 12);
      }
    } else { // rejilla de puntos
      for (let r = 0; r < 16; r++) for (let col = 0; col < 8; col++) {
        c.fillStyle = rnd() < 0.45 ? cols[(r + col) % 3] : '#04060c';
        c.beginPath(); c.arc(8 + col * 15, 8 + r * 16, 3.4, 0, 7); c.fill();
      }
    }
    c.fillStyle = '#1a2033'; c.fillRect(0, 0, 128, 8); // base de la fachada
  });
  _ncFacadeTex[v] = t;
  return t;
}

/* ---------- materiales propios cacheados (fachada + cornisa + tope) ---------- */
const _ncMatCache = {};
function _ncTowerMat(v, trimColor) {
  const k = 'f' + (v % 3) + '_' + trimColor;
  if (!_ncMatCache[k]) {
    const tx = _ncFacadeTexMake(v % 3);
    _ncMatCache[k] = {
      face: new THREE.MeshStandardMaterial({
        map: tx, emissive: 0xffffff, emissiveMap: tx,
        emissiveIntensity: 0.6, roughness: 0.85
      }),
      trim: new THREE.MeshBasicMaterial({ color: trimColor }),
      dark: new THREE.MeshStandardMaterial({ color: 0x11141d, roughness: 0.9 })
    };
  }
  return _ncMatCache[k];
}

/* ---------- rascacielos propio de neón (20-60 m) ---------- */
function addNeonTower(lvl, cx, cz, w, h, d, v, trimColor) {
  const m = _ncTowerMat(v, trimColor);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    [m.face, m.face, m.dark, m.dark, m.face, m.face]);
  mesh.position.set(cx, h / 2 + 0.22, cz); // sobre la acera
  lvl.group.add(mesh);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.4, d + 0.5), m.trim);
  trim.position.set(cx, h + 0.42, cz);
  lvl.group.add(trim);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), m.trim); // baliza
  beacon.position.set(cx, h + 1.1, cz);
  lvl.group.add(beacon);
  return mesh;
}

/* ---------- letrero luminoso propio (nombres originales, cacheado por texto) ---------- */
const _ncSignTex = {};
function _ncSignTexture(text, color) {
  const k = text + '_' + color;
  if (_ncSignTex[k]) return _ncSignTex[k];
  const t = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#05060e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = color; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
    g.shadowColor = color; g.shadowBlur = 26;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = color;
    const size = text.length > 12 ? 44 : 58;
    g.font = '900 ' + size + 'px "Trebuchet MS", sans-serif';
    g.fillText(text, w / 2, h / 2 + 2);
    g.shadowBlur = 0;
  });
  _ncSignTex[k] = t;
  return t;
}
function addNeonSign(lvl, x, y, z, text, color, ry, pw, ph) {
  const tex = _ncSignTexture(text, color);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0;
  const w = pw || 6, h = ph || 1.6;
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex })); // Basic = se ve luminoso de noche
  f.position.z = 0.06; g.add(f);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex }));
  b.position.z = -0.06; b.rotation.y = Math.PI; g.add(b);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, h + 0.25, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x141824, roughness: 0.7 }));
  frame.position.z = 0; g.add(frame);
  lvl.group.add(g);
  return g;
}

/* ---------- tienda a nivel de calle con letrero ---------- */
const NCSHOPS = [ // nombres 100% inventados (nada de marcas reales)
  ['TAQUERÍA LUNA', '#ff2fd6'], ['DULCES GEAYI', '#00e5ff'],
  ['CINE ESTRELLA', '#ffe95e'], ['PIZZA COMETA', '#ff9f1c'],
  ['HELADOS POLAR', '#7bff9e'], ['TIENDA SOL', '#ffd23f'],
  ['BAR AURORA', '#9d6bff'], ['LIBROS COMETA', '#00e5ff'],
  ['CAFÉ NÉBULA', '#ff6a5e'], ['JUGUETES COHETE', '#ffe95e']
];
function addStorefront(lvl, x, z, w, name, color, ry) {
  const d = 6, h = 4.2;
  const g = new THREE.Group(); g.position.set(x, 0.22, z); g.rotation.y = ry || 0;
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: 0x232838, roughness: 0.85, emissive: 0x0a0e1c, emissiveIntensity: 0.4 }));
  box.position.y = h / 2; g.add(box);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 2.2),
    new THREE.MeshBasicMaterial({ color: 0x9fe8ff })); // vitrina encendida
  glass.position.set(0, 1.6, d / 2 + 0.03); g.add(glass);
  const awn = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.25, 2.2),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color).getHex() }));
  awn.position.set(0, 3.4, d / 2 + 0.8); g.add(awn);
  lvl.group.add(g);
  addNeonSign(lvl, x, 4.6, z, name, color, ry, Math.min(w + 1, 9), 1.7);
}

/* ---------- fuente luminosa de la plaza ---------- */
function addNeonFountain(lvl, cx, cz) {
  const g = lvl.group;
  const stone = new THREE.MeshStandardMaterial({ color: 0x3a4a6b, roughness: 0.7 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.6, 1.2, 20), stone);
  base.position.set(cx, 0.8, cz); g.add(base);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.4, 0.5, 20),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff })); // agua luminosa
  water.position.set(cx, 1.35, cz); g.add(water);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 3.4, 12), stone);
  col.position.set(cx, 3, cz); g.add(col);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.4, 0.8, 14), stone);
  bowl.position.set(cx, 4.9, cz); g.add(bowl);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 2.6, 8),
    new THREE.MeshBasicMaterial({ color: 0xbff6ff, transparent: true, opacity: 0.85 }));
  jet.position.set(cx, 6.4, cz); g.add(jet);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6.9, 0.18, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xff2fd6 })); // anillo neón
  ring.rotation.x = Math.PI / 2; ring.position.set(cx, 0.35, cz); g.add(ring);
}

/* ---------- mirador bajo opcional (rampa desde el suelo + barandal) ---------- */
function addNeonMirador(lvl, x, z) {
  const A = (px, py, pz, w, d, o) => addPlatform(lvl, px, py, pz, w, d, o);
  const mat = { color: 0x2b3350, emissive: 0x0e1a33 };
  A(x, 0.5, z + 9, 5, 3.4, mat);   // escalones-rampa (0.5 m: se suben fácil)
  A(x, 1.0, z + 5.6, 5, 3.4, mat);
  A(x, 1.5, z + 2.2, 5, 3.4, mat);
  A(x, 2.0, z - 4, 10, 10, mat);   // plataforma del mirador (10×10 a 2 m)
  const rail = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  const mk = (w, d, px, pz) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d), rail);
    r.position.set(x + px, 2.95, z - 4 + pz); lvl.group.add(r);
  };
  mk(10, 0.15, 0, -4.9); mk(10, 0.15, 0, 4.9); mk(0.15, 10, -4.9, 0); mk(0.15, 10, 4.9, 0);
  addNeonSign(lvl, x, 4.2, z - 8.6, 'MIRADOR GEAYI', '#00e5ff', 0, 7, 1.5);
  coinLine(lvl, x - 3, 3.1, z - 4, x + 3, 3.1, z - 4, 4);
}

/* ============================================================
   buildNeonCity(lvl) — CIUDAD NEÓN GIGANTE (reemplazo de buildLevel1)
   ============================================================ */
function buildNeonCity(lvl) {
  const G = lvl.group;
  const A = (x, y, z, w, d, o) => addPlatform(lvl, x, y, z, w, d, o);
  const rnd = _ncRnd(20260913);

  const HS = 180;                       // media losa: 360×360
  const STREETS = [-150, -90, -30, 30, 90, 150]; // ejes de calles (ancho 8)
  const SW = 8, CELL = 60, BW = CELL - SW;       // manzana de 52×52

  // ===== 1. losa base: asfalto gigante caminable =====
  A(0, 0, 0, HS * 2, HS * 2, { color: 0x161a26, emissive: 0x05070f });

  // ===== 2. marcas viales en planos con textura repetida (barato en Android) =====
  const dashTex = canvasTex(16, 64, (c) => {
    c.clearRect(0, 0, 16, 64);
    c.fillStyle = '#ffe95e'; c.fillRect(5, 8, 6, 40); // guion neón amarillo
  });
  dashTex.wrapS = dashTex.wrapT = THREE.RepeatWrapping;
  const dashMat = new THREE.MeshBasicMaterial({ map: dashTex, transparent: true });
  const crossTex = canvasTex(128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) c.fillRect(8, 6 + i * 25, 112, 13); // franjas del cruce
  });
  const crossMat = new THREE.MeshBasicMaterial({ map: crossTex, transparent: true });
  const dashGeoV = new THREE.PlaneGeometry(0.55, HS * 2);
  const dashGeoH = new THREE.PlaneGeometry(HS * 2, 0.55);
  const crossGeo = new THREE.PlaneGeometry(SW, SW);
  STREETS.forEach(s => {
    const pv = new THREE.Mesh(dashGeoV, dashMat);
    pv.rotation.x = -Math.PI / 2; pv.position.set(s, 0.03, 0); G.add(pv);
    const ph = new THREE.Mesh(dashGeoH, dashMat);
    ph.rotation.x = -Math.PI / 2; ph.position.set(0, 0.03, s); G.add(ph);
  });
  STREETS.forEach(sx => STREETS.forEach(sz => { // cruces peatonales en cada intersección
    const cr = new THREE.Mesh(crossGeo, crossMat);
    cr.rotation.x = -Math.PI / 2; cr.position.set(sx, 0.035, sz); G.add(cr);
  }));

  // ===== 3. manzanas: acera + rascacielos + tienda =====
  const trimCols = [0x00e5ff, 0xff2fd6, 0xffe95e, 0x7bff9e];
  let shopI = 0;
  const isPlaza = (cx, cz) => cx === 0 && cz === 0;
  STREETS.forEach(cx => STREETS.forEach(cz => {
    if (isPlaza(cx, cz)) return; // la manzana central es la plaza
    A(cx, 0.22, cz, BW, BW, { color: 0x2c3145, emissive: 0x0c1226 }); // acera elevada
    const nB = 2 + (rnd() < 0.35 ? 1 : 0);
    for (let b = 0; b < nB; b++) {
      const w = 10 + rnd() * 9, d = 10 + rnd() * 9;
      const h = 20 + rnd() * 40;                       // 20-60 m
      const bx = cx + (rnd() - 0.5) * (BW - w - 6);
      const bz = cz + (rnd() - 0.5) * (BW - d - 6);
      if (rnd() < 0.5) {
        addNeonBuilding(lvl, bx, bz, w, h, d, (rnd() * 100) | 0); // helper de world.js
      } else {
        addNeonTower(lvl, bx, bz, w, h, d, (rnd() * 3) | 0, trimCols[(rnd() * 4) | 0]);
      }
    }
    // tienda a nivel de calle en el borde de la manzana (cara a la avenida)
    const [nm, nc] = NCSHOPS[shopI++ % NCSHOPS.length];
    const edge = rnd() < 0.5 ? -1 : 1;
    addStorefront(lvl, cx + edge * (BW / 2 - 4), cz, 12, nm, nc, edge > 0 ? -Math.PI / 2 : Math.PI / 2);
  }));

  // ===== 4. plaza central con fuente luminosa =====
  A(0, 0.22, 0, BW, BW, { color: 0x343b58, emissive: 0x101a3a }); // piso de la plaza
  addNeonFountain(lvl, 0, 0);
  const benchM = new THREE.MeshStandardMaterial({ color: 0x4a3b2a, roughness: 0.9 });
  for (let i = 0; i < 8; i++) { // bancas alrededor de la fuente
    const a = (i / 8) * Math.PI * 2;
    const bq = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1), benchM);
    bq.position.set(Math.cos(a) * 11, 0.65, Math.sin(a) * 11);
    bq.rotation.y = -a + Math.PI / 2; G.add(bq);
  }
  addNeonSign(lvl, 0, 5.4, -20, 'PLAZA GEAYI', '#ffe95e', 0, 10, 2);

  // ===== 5. farolas de neón (helper de world.js): esquinas + avenida principal =====
  const lampCols = [0x00e5ff, 0xff2fd6, 0xffe95e];
  let li = 0;
  STREETS.forEach(sx => STREETS.forEach(sz => {
    addStreetLamp(G, sx + SW / 2 + 1, sz + SW / 2 + 1, lampCols[(li++) % 3]);
  }));
  for (let z = -162; z <= 162; z += 36) {
    addStreetLamp(G, 6.5, z, lampCols[(li++) % 3]);
    addStreetLamp(G, -6.5, z + 18, lampCols[(li++) % 3]);
  }

  // ===== 6. tráfico GEAYI en la avenida principal (decorativo: frena si estás al frente) =====
  const wps = [{ x: 2.2, z: -172 }, { x: 2.2, z: 172 }, { x: -2.2, z: 172 }, { x: -2.2, z: -172 }];
  lvl.traffic = [];
  [[0xff3d5e, 0, 6.5, 'car'], [0x00e5ff, 1, 7.5, 'car'], [0xffd23f, 2, 5.5, 'taxi'], [0x7b2fff, 3, 5, 'bus']]
    .forEach(([col, wi, sp, kind]) => {
      const mesh = kind === 'taxi' ? buildTaxiMesh(col) : kind === 'bus' ? buildBusMesh(col) : buildCarMesh(col);
      const wp = wps[wi];
      mesh.position.set(wp.x, 0, wp.z);
      const nx = wps[(wi + 1) % 4];
      mesh.rotation.y = Math.atan2(nx.x - wp.x, nx.z - wp.z);
      G.add(mesh);
      lvl.traffic.push({ mesh, wps, i: (wi + 1) % 4, speed: sp });
    });

  // ===== 7. carros decorativos estacionados (constructores propios de vehicles.js) =====
  const parkCols = [0x00e5ff, 0xff2fd6, 0x7bff9e, 0xff9f1c, 0x9d6bff, 0xffffff];
  STREETS.forEach((s, si) => {
    if (si % 2) return;
    const car = buildCarMesh(parkCols[si % parkCols.length]);
    car.position.set(s + 5.6, 0, -120 + (si * 37) % 200); car.rotation.y = Math.PI / 2; G.add(car);
    const car2 = buildCarMesh(parkCols[(si + 3) % parkCols.length]);
    car2.position.set(s - 5.6, 0, 60 - (si * 53) % 160); car2.rotation.y = -Math.PI / 2; G.add(car2);
  });

  // ===== 8. mirador bajo opcional (rampa desde el suelo, con barandal) =====
  addNeonMirador(lvl, -150, -150);

  // ===== 9. recorrido: aeropuerto, letrero, puntos, monedas y meta =====
  addAirport(lvl, -14, 0, -160); // ✈️ viajes (sistema de travel)
  addSign3D(lvl, 0, 0, -166, ['🌃 ' + T('world.n0'), T('world.d0')],
    { bg: '#0a0e1a', border: '#00e5ff', fg: '#ffffff', pw: 9, ph: 3, poleH: 2.6 });
  addCheckpoint(lvl, 5.5, 0, -110); // 🚩 fuera de la avenida (el tráfico va por x=±2.2)
  addCheckpoint(lvl, 5.5, 0, -30);
  addCheckpoint(lvl, 5.5, 0, 50);
  addCheckpoint(lvl, 5.5, 0, 130);
  coinLine(lvl, 4.5, 1.3, -160, 4.5, 1.3, 168, 22);   // monedas por la acera este
  coinLine(lvl, -4.5, 1.3, 168, -4.5, 1.3, -160, 22); // monedas por la acera oeste
  for (let i = 0; i < 12; i++) { // anillo de monedas en la plaza
    const a = (i / 12) * Math.PI * 2;
    addCoin(lvl, Math.cos(a) * 15, 1.3, Math.sin(a) * 15);
  }
  addFinish(lvl, 0, 0, 172);

  lvl.start = { x: 0, y: 0, z: -172 };
  lvl.killY = -12;
}
