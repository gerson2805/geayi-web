/* infinite.js — 🌆 CALLES INFINITAS (GEAYI — Obby Xtreme 3D)
   Fase 3 "como Roblox": la ciudad nunca se acaba. Generación procedural por
   chunks DETERMINISTAS (el mismo chunk siempre genera exactamente lo mismo)
   fuera del núcleo hecho a mano de Ciudad Neón (idx 0) e Immokalee (idx 3).
   - Cada chunk: 60×60 m. Calles en los bordes (cuadrícula vial continua),
     aceras, 2-4 edificios con ventanas, postes de luz y árboles/palmeras.
   - Geometrías y materiales COMPARTIDOS (Android gama media): ~9-12 chunks
     vivos como máximo, sin sombras ni luces nuevas por chunk.
   - Colisión: los edificios se registran con el pipeline existente
     (WALL_SOLIDS + flushWallSolids → LEVEL.platforms); al descargar un chunk
     se RETIRAN sus colisionadores (sin fugas ni fantasmas).
   - Dentro del núcleo (CORE_R del spawn) el sistema es invisible: cero costo.
   INTEGRACIÓN (la hace el coordinador, este archivo no edita nada):
   1. <script src="infinite.js"></script> en index.html (antes de game.js).
   2. En startLevel(), después de LEVEL = buildLevel(i):
        if (typeof InfiniteStreets !== 'undefined') InfiniteStreets.init();
   3. En loop(), dentro de la rama if (MODE === 'play'):
        if (typeof InfiniteStreets !== 'undefined') InfiniteStreets.update(dt);
*/
'use strict';

const InfiniteStreets = (() => {

  /* ================= parámetros ajustables ================= */
  const CFG = {
    CHUNK: 60,        // tamaño del chunk en metros (60×60)
    VIEW_R: 1,        // radio de chunks cargados alrededor del jugador (1 → 3×3 = 9 chunks ≈ 180×180 m)
    CORE_R: 220,      // radio del núcleo hecho a mano (desde el spawn): adentro no se genera nada
    CITY_WORLDS: [0, 3], // solo Ciudad Neón y Immokalee
    ROAD_W: 10,       // ancho de calle
    SW_W: 3,          // ancho de acera
    MAX_LOADS_PER_FRAME: 2, // tope de chunks construidos por frame (evita tirones)
  };

  /* ================= RNG determinista ================= */
  // mulberry32: el mismo seed → la misma secuencia, siempre.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // hash de (cx, cz, worldIdx) → seed de 32 bits
  function chunkSeed(cx, cz, wi) {
    let h = (Math.imul(cx, 374761393) + Math.imul(cz, 668265263) + Math.imul(wi + 11, 974711)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return h >>> 0;
  }

  /* ================= estado ================= */
  const chunks = new Map(); // "cx,cz" → { group, solidRefs, lvl }
  let activeWorld = -1;     // índice real del mundo activo (-1 = sistema apagado)
  let assetsOk = false;
  const A = {};             // activos compartidos (geometrías/materiales)

  /* ================= paleta viva GEAYI ================= */
  const PALETTE = [0xff5e8a, 0xff9d00, 0x00c2a8, 0x00a2ff, 0x7b2fff, 0xff2fd6];

  /* ================= texturas de ventanas (canvas propio) ================= */
  function makeWindowTex(variant) {
    try {
      const c = document.createElement('canvas'); c.width = 128; c.height = 256;
      const g = c.getContext('2d');
      if (!g || !g.fillRect) return null;
      const rnd = mulberry32(1234 + variant * 777);
      g.fillStyle = '#f2ede4'; g.fillRect(0, 0, 128, 256); // fachada clara
      g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, 0, 128, 10); // cornisa
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 4; col++) {
          const x = 10 + col * 29, y = 18 + row * 29;
          const lit = rnd() < 0.35;
          g.fillStyle = lit ? '#ffe95e' : '#20344d'; // ventana encendida/apagada
          g.fillRect(x, y, 20, 20);
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x, y, 20, 5); // reflejo
          g.fillStyle = '#8a8f9a'; g.fillRect(x - 2, y - 2, 24, 3); // marco sup
        }
      }
      const t = new THREE.CanvasTexture(c);
      if (typeof THREE !== 'undefined' && 'sRGBEncoding' in THREE) { try { t.encoding = THREE.sRGBEncoding; } catch (e) {} }
      return t;
    } catch (e) { return null; }
  }
  function makeRoadTex() {
    try {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64;
      const g = c.getContext('2d');
      if (!g || !g.fillRect) return null;
      g.fillStyle = '#33363e'; g.fillRect(0, 0, 64, 64); // asfalto
      g.fillStyle = '#2c2f36';
      for (let i = 0; i < 40; i++) g.fillRect((i * 37) % 64, (i * 53) % 64, 2, 2); // grano
      g.fillStyle = '#ffd23f'; g.fillRect(30, 8, 4, 20); // línea central
      const t = new THREE.CanvasTexture(c);
      if (typeof THREE !== 'undefined' && 'sRGBEncoding' in THREE) { try { t.encoding = THREE.sRGBEncoding; } catch (e) {} }
      try { t.wrapS = t.wrapT = THREE.RepeatWrapping; } catch (e) {}
      return t;
    } catch (e) { return null; }
  }

  /* ================= activos compartidos (una sola vez) ================= */
  function buildAssets() {
    if (assetsOk) return true;
    try {
      if (typeof THREE === 'undefined') return false;
      const S = CFG.CHUNK;
      A.unitBox = new THREE.BoxGeometry(1, 1, 1);
      A.groundGeo = new THREE.PlaneGeometry(S, S);
      A.poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 5.2, 8);
      A.headGeo = new THREE.BoxGeometry(0.7, 0.28, 0.7);
      A.trunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 2.6, 7);
      A.crownGeo = new THREE.ConeGeometry(1.7, 3.2, 8);
      A.palmGeo = new THREE.SphereGeometry(1.6, 8, 6);
      // --- materiales compartidos ---
      const std = (color, o) => {
        const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0.02 }, o || {}));
        return m;
      };
      A.groundMats = { 0: std(0x3a4152), 3: std(0x8fa37e) }; // Neón: gris azulado · Immokalee: verde
      const roadMat = (rx, rz) => { // un material por orientación, textura propia con repetición
        const t = makeRoadTex();
        if (t) { try { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, rz); } catch (e) {} }
        return t ? new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })
                 : std(0x33363e, { roughness: 0.95 });
      };
      A.roadMatNS = roadMat(1, 6); // avenidas norte-sur
      A.roadMatEW = roadMat(6, 1); // calles este-oeste
      A.swMat = std(0xb9bec9, { roughness: 0.9 });            // acera
      A.poleMat = std(0x2b2f3a, { roughness: 0.6, metalness: 0.4 });
      A.lampMat = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffd23f, emissiveIntensity: 0.9 });
      A.trunkMat = std(0x7a5230);
      A.leafMat = std(0x2fa35c, { roughness: 0.9 });
      A.palmMat = std(0x3fae5f, { roughness: 0.9 });
      // edificios: 4 texturas de ventanas × 6 colores de fachada = 24 materiales compartidos
      A.bldMats = [];
      for (let v = 0; v < 4; v++) {
        const tex = makeWindowTex(v);
        for (let ci = 0; ci < PALETTE.length; ci++) {
          const m = tex
            ? new THREE.MeshStandardMaterial({ map: tex, color: PALETTE[ci], roughness: 0.8, metalness: 0.03 })
            : std(PALETTE[ci], { roughness: 0.8 });
          A.bldMats.push(m);
        }
      }
      assetsOk = true;
      return true;
    } catch (e) { return false; }
  }
  function bldMat(texIdx, colorIdx) {
    if (!A.bldMats || !A.bldMats.length) return null;
    return A.bldMats[(texIdx * PALETTE.length + colorIdx) % A.bldMats.length];
  }

  /* ================= layout determinista del chunk =================
     Puro (sin THREE): dado (cx, cz, worldIdx) siempre devuelve lo mismo. */
  function genChunk(cx, cz, wi) {
    const rnd = mulberry32(chunkSeed(cx, cz, wi));
    const S = CFG.CHUNK, RW = CFG.ROAD_W, SW = CFG.SW_W;
    const in0 = RW + SW, in1 = S - RW - SW; // manzana interior
    const mid = S / 2;
    const buildings = [];
    const quads = [
      [in0, mid, in0, mid], [mid, in1, in0, mid],
      [in0, mid, mid, in1], [mid, in1, mid, in1],
    ];
    // orden aleatorio de cuadrantes para variar qué manzanas quedan vacías
    const order = [0, 1, 2, 3].sort(() => rnd() - 0.5);
    const want = 2 + Math.floor(rnd() * 3); // 2-4 edificios
    for (let k = 0; k < want && k < 4; k++) {
      const q = quads[order[k]];
      const w = 8 + rnd() * 5, d = 8 + rnd() * 5;
      const h = 8 + Math.floor(rnd() * 22 * 2) / 2; // 8–30 m, pasos de 0.5
      const qcx = (q[0] + q[1]) / 2, qcz = (q[2] + q[3]) / 2;
      const jx = (rnd() - 0.5) * Math.max(0, (q[1] - q[0]) - w - 4);
      const jz = (rnd() - 0.5) * Math.max(0, (q[3] - q[2]) - d - 4);
      buildings.push({
        x: qcx + jx, z: qcz + jz, w, d, h,
        c: Math.floor(rnd() * PALETTE.length),
        tex: Math.floor(rnd() * 4),
        ry: rnd() < 0.5 ? 0 : Math.PI / 2, // algunos girados 90°
      });
    }
    // postes en las 4 esquinas de la manzana
    const lamps = [
      { x: in0 + 1, z: in0 + 1 }, { x: in1 - 1, z: in0 + 1 },
      { x: in0 + 1, z: in1 - 1 }, { x: in1 - 1, z: in1 - 1 },
    ];
    // árboles/palmeras en candidatos de acera
    const spots = [
      [in0 + 6, mid - 8], [in0 + 6, mid + 8], [in1 - 6, mid - 8], [in1 - 6, mid + 8],
      [mid - 8, in0 + 6], [mid + 8, in0 + 6], [mid - 8, in1 - 6], [mid + 8, in1 - 6],
    ];
    const trees = [];
    const nT = 2 + Math.floor(rnd() * 3); // 2-4
    const sOrder = spots.map((s, i) => i).sort(() => rnd() - 0.5);
    for (let k = 0; k < nT && k < sOrder.length; k++) {
      const s = spots[sOrder[k]];
      trees.push({ x: s[0] + (rnd() - 0.5) * 2, z: s[1] + (rnd() - 0.5) * 2, s: 0.8 + rnd() * 0.5 });
    }
    return { buildings, lamps, trees };
  }

  /* ================= construcción del chunk (THREE) ================= */
  function mesh(geo, mat, x, y, z, sx, sy, sz, ry) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    if (ry) m.rotation.y = ry;
    return m;
  }
  function buildChunk(cx, cz, wi) {
    const S = CFG.CHUNK, RW = CFG.ROAD_W, SW = CFG.SW_W;
    const x0 = cx * S, z0 = cz * S;
    const g = new THREE.Group();
    g.position.set(0, 0, 0);
    const palm = (wi === 3); // Immokalee → palmeras; Neón → árboles
    // --- suelo base del chunk ---
    const gm = A.groundMats[wi] || A.groundMats[0];
    const ground = mesh(A.groundGeo, gm, x0 + S / 2, 0, z0 + S / 2, 1, 1, 1);
    ground.rotation.x = -Math.PI / 2;
    g.add(ground);
    // --- calles: avenidas N-S en bordes este/oeste, calles E-O en norte/sur ---
    const ry = 0.02, ry2 = 0.04; // leve separación para no pelear en Z
    const ns = (x) => { const m = mesh(A.unitBox, A.roadMatNS, x, ry, z0 + S / 2, RW, 0.06, S); g.add(m); };
    const ew = (z) => { const m = mesh(A.unitBox, A.roadMatEW, x0 + S / 2, ry2, z, S, 0.06, RW); g.add(m); };
    ns(x0 + RW / 2); ns(x0 + S - RW / 2);
    ew(z0 + RW / 2); ew(z0 + S - RW / 2);
    // --- aceras (lado interior de cada calle) ---
    const swy = 0.07;
    const swNS = (x) => { g.add(mesh(A.unitBox, A.swMat, x, swy, z0 + S / 2, SW, 0.12, S - 2 * RW)); };
    const swEW = (z) => { g.add(mesh(A.unitBox, A.swMat, x0 + S / 2, swy, z, S - 2 * RW, 0.12, SW)); };
    swNS(x0 + RW + SW / 2); swNS(x0 + S - RW - SW / 2);
    swEW(z0 + RW + SW / 2); swEW(z0 + S - RW - SW / 2);
    // --- contenido determinista ---
    const lay = genChunk(cx, cz, wi);
    const solids = [];
    for (const b of lay.buildings) {
      const m = mesh(A.unitBox, bldMat(b.tex, b.c), x0 + b.x, b.h / 2, z0 + b.z, b.w, b.h, b.d, b.ry);
      g.add(m);
      solids.push({ mesh: m, h: b.h });
      // techo: losa delgada del mismo color
      const roof = mesh(A.unitBox, A.poleMat, x0 + b.x, b.h + 0.15, z0 + b.z, b.w + 0.4, 0.3, b.d + 0.4, b.ry);
      g.add(roof);
    }
    for (const l of lay.lamps) {
      g.add(mesh(A.poleGeo, A.poleMat, x0 + l.x, 2.6, z0 + l.z, 1, 1, 1));
      g.add(mesh(A.headGeo, A.lampMat, x0 + l.x, 5.3, z0 + l.z, 1, 1, 1));
    }
    for (const t of lay.trees) {
      g.add(mesh(A.trunkGeo, A.trunkMat, x0 + t.x, 1.3 * t.s, z0 + t.z, t.s, t.s, t.s));
      if (palm) g.add(mesh(A.palmGeo, A.palmMat, x0 + t.x, (2.6 + 1.1) * t.s, z0 + t.z, t.s, t.s * 0.75, t.s));
      else g.add(mesh(A.crownGeo, A.leafMat, x0 + t.x, (2.6 + 1.6) * t.s, z0 + t.z, t.s, t.s, t.s));
    }
    return { group: g, solids, layout: lay };
  }

  /* ================= carga / descarga ================= */
  function chunkKey(cx, cz) { return cx + ',' + cz; }
  function inCore(cx, cz, sx, sz) {
    const S = CFG.CHUNK;
    const dx = (cx * S + S / 2) - sx, dz = (cz * S + S / 2) - sz;
    return (dx * dx + dz * dz) < CFG.CORE_R * CFG.CORE_R;
  }
  function loadChunk(cx, cz, wi, lvl, scn) {
    const key = chunkKey(cx, cz);
    if (chunks.has(key)) return true;
    try {
      const built = buildChunk(cx, cz, wi);
      scn.add(built.group);
      // colisionadores por el pipeline existente (WALL_SOLIDS → LEVEL.platforms)
      let refs = [];
      try {
        if (typeof WALL_SOLIDS !== 'undefined' && typeof flushWallSolids === 'function' &&
            lvl && Array.isArray(lvl.platforms)) {
          for (const s of built.solids) WALL_SOLIDS.push({ mesh: s.mesh, y0: 0, y1: s.h });
          const before = lvl.platforms.length;
          flushWallSolids(lvl);
          refs = lvl.platforms.slice(before);
        }
      } catch (e) {}
      chunks.set(key, { group: built.group, solidRefs: refs, lvl, layout: built.layout });
      return true;
    } catch (e) { return false; }
  }
  function unloadChunk(key) {
    const c = chunks.get(key);
    if (!c) return;
    chunks.delete(key);
    try {
      // retirar colisionadores (sin fantasmas)
      if (c.lvl && Array.isArray(c.lvl.platforms) && c.solidRefs) {
        for (const p of c.solidRefs) {
          const i = c.lvl.platforms.indexOf(p);
          if (i >= 0) c.lvl.platforms.splice(i, 1);
        }
      }
    } catch (e) {}
    try {
      if (c.group && c.group.parent) c.group.parent.remove(c.group);
      // geometrías/materiales son COMPARTIDOS: no se hace dispose (solo se suelta el grupo)
      c.group.traverse((o) => { o.parent = null; });
    } catch (e) {}
  }
  function unloadAll() {
    try {
      for (const k of Array.from(chunks.keys())) unloadChunk(k);
    } catch (e) {}
  }

  /* ================= API pública ================= */
  function init() {
    unloadAll();
    activeWorld = -1;
    try {
      if (typeof LEVEL === 'undefined' || !LEVEL) return;
      const wi = LEVEL.idx;
      if (CFG.CITY_WORLDS.indexOf(wi) < 0) return; // otros mundos: intactos
      if (!buildAssets()) return;
      activeWorld = wi;
    } catch (e) { activeWorld = -1; }
  }
  function update(dt) {
    try {
      if (activeWorld < 0) return;
      if (typeof MODE !== 'undefined' && MODE !== 'play') return;
      if (typeof Player === 'undefined' || !Player || !Player.pos) return;
      if (typeof LEVEL === 'undefined' || !LEVEL || LEVEL.idx !== activeWorld) return;
      if (typeof scene === 'undefined' || !scene) return;
      const S = CFG.CHUNK, R = CFG.VIEW_R;
      const px = Player.pos.x, pz = Player.pos.z;
      const sx = (LEVEL.start && LEVEL.start.x) || 0;
      const sz = (LEVEL.start && LEVEL.start.z) || 0;
      const ccx = Math.floor(px / S), ccz = Math.floor(pz / S);
      // 1) descargar lo lejano
      for (const key of Array.from(chunks.keys())) {
        const parts = key.split(',');
        const dx = Math.abs(parseInt(parts[0], 10) - ccx), dz = Math.abs(parseInt(parts[1], 10) - ccz);
        if (dx > R || dz > R) unloadChunk(key);
      }
      // 2) cargar lo cercano (fuera del núcleo), con tope por frame
      let loads = 0;
      for (let ax = ccx - R; ax <= ccx + R && loads < CFG.MAX_LOADS_PER_FRAME; ax++) {
        for (let az = ccz - R; az <= ccz + R && loads < CFG.MAX_LOADS_PER_FRAME; az++) {
          if (chunks.has(chunkKey(ax, az))) continue; // ya cargado: no consume el presupuesto
          if (inCore(ax, az, sx, sz)) continue;
          if (loadChunk(ax, az, activeWorld, LEVEL, scene)) loads++;
        }
      }
    } catch (e) {}
  }
  function reset() { init(); }

  return {
    init, update, reset,
    CFG,
    _genChunk: genChunk,   // expuesto para tests
    _chunks: chunks,       // expuesto para tests
    _chunkSeed: chunkSeed, // expuesto para tests
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = InfiniteStreets;
