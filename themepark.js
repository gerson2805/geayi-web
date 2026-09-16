/* ============================================================
   🎢 PARQUE GEAYI — parque temático estilo Disney/Universal
   Mundo 4 · Immokalee (idx 3). 100% original GEAYI, nada copiado.

   Contenido:
   a) Castillo central original (muros almenados, 4 torres con
      banderas GEAYI, arco de entrada, patio con trono y cofre).
   b) Montaña rusa para SUBIRSE: riel en circuito cerrado elevado
      (≥4.5 m) con subidas/bajadas, 2 carritos (uno para el jugador
      y uno ambiental). Por proximidad a la estación aparece el
      botón dinámico 🎢 SUBIR (creado en DOM por ThemePark.init(),
      sin tocar index.html); el carrito lleva al jugador por el
      riel con la cámara siguiéndolo y al terminar la vuelta lo
      deja donde subió. Cuesta 10 🪙 por vuelta.
   c) Juegos mecánicos animados (visuales): carrusel giratorio con
      caballitos, torre de caída libre y tazas giratorias.
   d) 2 toboganes de agua + alberca.
   e) Taquilla + arco de entrada con letrero "PARQUE GEAYI".
   El acuario (edificio con tanques) lo construye aquarium.js en
   el rectángulo reservado AQ (ver abajo); este archivo no pone
   soportes de la rusa dentro de ese rectángulo.

   ===== ZONA ELEGIDA (verificada libre) =====
   Rectángulo x∈[80,106], z∈[-122,-72] (26×50 m), al norte del
   pueblo, junto a IMMOKALEE DR (z=-64, 8 m al norte del parque).
   Revisado contra world.js y los módulos:
   - Lotes LotSystem: immo-1 x∈[55,75] (oeste), immo-2 (5,128) e
     immo-3 (75,195) al sur. Ninguno toca el rectángulo.
   - Estadio (funpark.js): x∈[10,50], z∈[-125,-65] (oeste).
   - Lago Trafford (-78,18), aeropuerto (145,-70), casino (20,155),
     museo Pioneer (-135,-55), high school (x∈[-33,-7]): lejos.
   - WaterPark (x∈[-192,-138], z∈[44,156]), Zoo (x∈[-198,-138],
     z∈[-118,-78]), Bolera (-144,25), CarWash (90,8), cine (100,30),
     distrito moderno (x∈[52,102], z∈[-2,28]): lejos.
   - SR 29 (diagonal 110,-125 → 215,175): en z=-122 pasa por x≈111
     (el borde oeste del asfalto queda en ~107.5 > 106 ✓); en z=-72
     pasa por x≈139 ✓. El rectángulo queda al oeste de la vía.
   - Hileras de árboles (z=-56,-24 y z=40,70,100,116), casas de
     Immokalee Dr (x≤0) y AIRPARK BLVD (z=-40): fuera.
   - Helipuerto (132,-88), empacadoras (98,-8/-24): fuera.
   - Calles infinitas (infinite.js): núcleo de 220 m desde el spawn;
     el parque (~179 m) queda dentro del núcleo: no se generan
     chunks encima.

   Integración (la hace el coordinador; este archivo no toca DOM al cargar):
   1. <script src="themepark.js"></script> en index.html (después de
      lots.js, antes de game.js). <script src="aquarium.js"></script> igual.
   2. En boot():   if (typeof ThemePark!=='undefined' && ThemePark.init) ThemePark.init();
   3. En startLevel(), junto a los demás buildForLevel:
        if (typeof ThemePark !== 'undefined') ThemePark.buildForLevel(i, LEVEL.group);
        if (typeof Aquarium !== 'undefined') Aquarium.buildForLevel(i, LEVEL.group);
   4. En loop(), rama MODE==='play':
        if (typeof ThemePark !== 'undefined' && ThemePark.update) ThemePark.update(dt);
        if (typeof Aquarium !== 'undefined' && Aquarium.update) Aquarium.update(dt);
   5. En startLevel(), junto a los onLevelEnd:
        if (typeof ThemePark !== 'undefined' && ThemePark.onLevelEnd) ThemePark.onLevelEnd();
   El botón 🎢 SUBIR se crea solo en el DOM (estilos en línea, no
   necesita CSS en styles.css).
   ============================================================ */
'use strict';

/* ---------- i18n ---------- */
if (typeof addStrings === 'function') {
  addStrings('es', {
    'tp.park': 'PARQUE GEAYI',
    'tp.board': '🎢 SUBIR',
    'tp.go': '🎢 ¡Allá vamos! Agárrate fuerte…',
    'tp.done': '🎢 ¡Vuelta completa! Gracias por subir',
    'tp.need': 'Necesitas 10 🪙 para subir a la rusa',
    'tp.chest': '+30 🪙 ¡Cofre del castillo GEAYI!',
    'tp.station': '🎢 ESTACIÓN',
  });
  addStrings('en', {
    'tp.park': 'GEAYI PARK',
    'tp.board': '🎢 RIDE',
    'tp.go': '🎢 Here we go! Hold on tight…',
    'tp.done': '🎢 Full lap! Thanks for riding',
    'tp.need': 'You need 10 🪙 to ride the coaster',
    'tp.chest': '+30 🪙 GEAYI castle chest!',
    'tp.station': '🎢 STATION',
  });
}
const tpT = (k) => (typeof T === 'function' ? T(k) : k);

/* ---------- constantes ---------- */
const TP_IDX = 3; // solo Immokalee
const TP = { x0: 80, x1: 106, z0: -122, z1: -72 }; // rectángulo del parque (verificado libre)
const TP_COASTER = { cx: 93, cz: -102, rx: 10, rz: 16, yBase: 4.5, n: 40, speed: 7 };
const TP_STATION = { x: 104, z: -102, r: 4.5 }; // plataforma de abordaje (nivel del suelo)
const TP_RIDE_PRICE = 10;
const TP_CASTLE = { x: 93, z: -102, w: 10, d: 10 }; // dentro del óvalo: el riel nunca pasa encima
const TP_AQ_RECT = { x0: 85, x1: 101, z0: -87.5, z1: -80.5 }; // reservado para aquarium.js
const TP_NOBUILD = [ // rectángulos donde la rusa NO pone soportes
  { x0: 88, x1: 98, z0: -107, z1: -97 },         // castillo
  { x0: 85, x1: 101, z0: -87.5, z1: -80.5 },     // acuario
  { x0: 98.5, x1: 101.5, z0: -117.5, z1: -114.5 }, // torre de toboganes
];
const TP_LOTS = [ // rectángulos de LotSystem (verificación en tests)
  { id: 'immo-1', x0: 55, x1: 75, z0: -98, z1: -82 },
  { id: 'immo-2', x0: -8, x1: 18, z0: 118, z1: 138 },
  { id: 'immo-3', x0: 60, x1: 90, z0: 183, z1: 207 },
];

/* ---------- caché Android: geometrías y materiales compartidos ---------- */
const _tpGeo = {}, _tpMat = {}, _tpTex = {};
function tpGeo(key, make) {
  if (typeof THREE === 'undefined') return null;
  if (!_tpGeo[key]) { try { _tpGeo[key] = make(); } catch (e) { return null; } }
  return _tpGeo[key];
}
function tpMat(color, emissive, ei, extra) {
  const key = color + '|' + (emissive || 0) + '|' + (ei || 0) + '|' + (extra || '');
  if (!_tpMat[key] && typeof THREE !== 'undefined') {
    try {
      _tpMat[key] = new THREE.MeshStandardMaterial(Object.assign({
        color, roughness: 0.6, metalness: 0.12,
        emissive: emissive || 0x000000, emissiveIntensity: ei || 0,
      }, extra ? JSON.parse(extra) : {}));
    } catch (e) { return null; }
  }
  return _tpMat[key];
}
function tpUnitBox() { return tpGeo('unitbox', () => new THREE.BoxGeometry(1, 1, 1)); }
function tpBox(parent, w, h, d, mat, x, y, z, ry) {
  if (typeof THREE === 'undefined') return null;
  const m = new THREE.Mesh(tpUnitBox(), mat);
  m.scale.set(w, h, d); m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  parent.add(m);
  return m;
}
function tpCyl(parent, rt, rb, h, seg, mat, x, y, z) {
  if (typeof THREE === 'undefined') return null;
  const m = new THREE.Mesh(tpGeo('cyl' + rt + 'x' + rb + 'x' + h + 'x' + seg,
    () => new THREE.CylinderGeometry(rt, rb, h, seg)), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
/* viga orientada entre dos puntos (rieles, toboganes) */
function tpBeam(parent, p1, p2, w, h, mat) {
  if (typeof THREE === 'undefined') return null;
  const dx = p2.x - p1.x, dy = p2.y - p1.y, dz = p2.z - p1.z;
  const len = Math.hypot(dx, dy, dz) || 0.001;
  const m = new THREE.Mesh(tpUnitBox(), mat);
  m.scale.set(w, h, len);
  m.position.set((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2);
  try { m.lookAt(p2.x, p2.y, p2.z); } catch (e) {}
  parent.add(m);
  return m;
}
function tpSignTex(main, sub, bg, fg) {
  if (typeof document === 'undefined') return null;
  const key = 'sign' + main + sub;
  if (_tpTex[key]) return _tpTex[key];
  try {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.strokeRect(12, 12, 488, 232);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 64px "Trebuchet MS",sans-serif';
    g.fillText(main, 256, sub ? 96 : 128);
    if (sub) { g.font = '700 40px "Trebuchet MS",sans-serif'; g.fillText(sub, 256, 182); }
    _tpTex[key] = new THREE.CanvasTexture(c);
  } catch (e) { return null; }
  return _tpTex[key];
}
function tpSign(parent, w, h, tex, x, y, z, ry) {
  if (typeof THREE === 'undefined' || !tex) return null;
  const m = new THREE.Mesh(tpGeo('signplane' + w + 'x' + h, () => new THREE.PlaneGeometry(w, h)),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = ry || 0;
  parent.add(m);
  return m;
}
/* colisionador directo a LEVEL.platforms (los módulos corren después de flushWallSolids) */
function tpSolid(x, z, topY, w, h, d) {
  try {
    if (typeof LEVEL !== 'undefined' && LEVEL && Array.isArray(LEVEL.platforms)) {
      LEVEL.platforms.push({ x, z, topY, w, h, d, kind: 'wall', solid: true });
    }
  } catch (e) {}
}

/* ================= MONTAÑA RUSA ================= */
function tpTrackY(th) { // θ=0 este (estación); picos al norte (acuario) y sur
  const c1 = Math.cos(th - Math.PI / 2), c2 = Math.cos(th - 3 * Math.PI / 2);
  return TP_COASTER.yBase
    + 3.5 * Math.pow(Math.max(0, c1), 1.5)
    + 4.5 * Math.pow(Math.max(0, c2), 1.5);
}
function tpTrackPoint(th) {
  return {
    x: TP_COASTER.cx + TP_COASTER.rx * Math.cos(th),
    z: TP_COASTER.cz + TP_COASTER.rz * Math.sin(th),
    y: tpTrackY(th),
  };
}
function tpInRect(x, z, r) { return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1; }

const ThemePark = {
  built: false, t: 0,
  coaster: { pts: [], cum: [], L: 0, cartA: null, cartB: null, sB: 0, riding: false, s: 0 },
  rides: {}, // carrusel, torre, tazas, banderas, agua
  chest: null,
  _btn: null,
};

/* ---- construcción del riel ---- */
function tpBuildCoaster(g) {
  const C = TP_COASTER, N = C.n, T = ThemePark;
  const pts = [];
  for (let i = 0; i <= N; i++) pts.push(tpTrackPoint((i / N) * Math.PI * 2));
  const cum = [0];
  for (let i = 1; i <= N; i++) {
    const a = pts[i - 1], b = pts[i];
    cum.push(cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  }
  T.coaster.pts = pts; T.coaster.cum = cum; T.coaster.L = cum[N];
  const cg = new THREE.Group(); g.add(cg);
  const railM = tpMat(0xd94f2b, 0x5a1408, 0.35);   // rieles rojo GEAYI
  const tieM = tpMat(0x5b3a1e);                     // traviesas de madera
  const supM = tpMat(0x8a97a8, 0x1a2230, 0.2);      // soportes metálicos
  const _v = (p, s, off) => ({ x: p.x + s.x * off, y: p.y, z: p.z + s.z * off });
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[i + 1];
    let tx = b.x - a.x, ty = b.y - a.y, tz = b.z - a.z;
    const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    const sx = -tz, sz = tx; // perpendicular horizontal
    [-0.55, 0.55].forEach(off => tpBeam(cg, _v(a, { x: sx, z: sz }, off), _v(b, { x: sx, z: sz }, off), 0.14, 0.14, railM));
    if (i % 2 === 0) { // traviesa
      const tie = tpBox(cg, 1.5, 0.1, 0.3, tieM, a.x, a.y - 0.18, a.z);
      if (tie) tie.rotation.y = Math.atan2(sx, sz);
    }
    if (i % 4 === 0) { // soporte (salta edificios y la estación)
      const px = a.x, pz = a.z;
      const bad = TP_NOBUILD.some(r => tpInRect(px, pz, r)) ||
        Math.hypot(px - (TP_COASTER.cx + TP_COASTER.rx), pz - TP_COASTER.cz) < 2.5;
      if (!bad) {
        const h = a.y - 0.3;
        const pil = tpCyl(cg, 0.22, 0.3, 1, 8, supM, px, h / 2, pz);
        if (pil) pil.scale.y = h;
        tpBox(cg, 1.4, 0.25, 1.4, supM, px, 0.12, pz); // zapata
      }
    }
  }
  // estación: plataforma a nivel del suelo + techo + letrero
  const stM = tpMat(0x3a6ea5), trimM = tpMat(0xffd23f, 0x7a5b00, 0.3);
  tpBox(g, 3.4, 0.18, 3.4, stM, TP_STATION.x, 0.09, TP_STATION.z); // plataforma
  [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(([ox, oz]) =>
    tpCyl(g, 0.12, 0.12, 3.2, 8, trimM, TP_STATION.x + ox, 1.6, TP_STATION.z + oz));
  tpBox(g, 4.2, 0.25, 4.2, tpMat(0x7b2fff, 0x2a0a7a, 0.4), TP_STATION.x, 3.3, TP_STATION.z); // techo
  const stTex = tpSignTex(tpT('tp.station'), 'GEAYI', '#7b2fff', '#ffffff');
  tpSign(g, 3.6, 1.8, stTex, TP_STATION.x, 4.4, TP_STATION.z, -Math.PI / 2);
  tpSolid(TP_STATION.x, TP_STATION.z - 1.8, 3.2, 0.3, 3.2, 0.3); // postes traseros (los delanteros quedan libres)
  // carritos
  T.coaster.cartA = tpBuildCart(g, 0xff3b30, 0xffd23f); // jugador
  T.coaster.cartB = tpBuildCart(g, 0x00b3ff, 0xffffff); // ambiental
  T.coaster.sB = T.coaster.L / 2;
  tpPlaceCart(T.coaster.cartA, 0);
  tpPlaceCart(T.coaster.cartB, T.coaster.sB);
}
function tpBuildCart(g, color, trim) {
  const cart = new THREE.Group();
  const baseM = tpMat(color, 0x000000, 0), trimM = tpMat(trim, 0x000000, 0);
  const darkM = tpMat(0x2b2f36);
  tpBox(cart, 1.5, 0.4, 2.4, baseM, 0, 0.35, 0);          // chasis
  tpBox(cart, 1.5, 0.18, 2.4, trimM, 0, 0.62, 0);         // filo
  tpBox(cart, 1.3, 0.5, 0.25, darkM, 0, 0.85, -0.9);      // respaldo trasero
  tpBox(cart, 1.3, 0.5, 0.25, darkM, 0, 0.85, 0.1);       // respaldo medio
  tpBox(cart, 1.1, 0.35, 0.7, baseM, 0, 0.85, 1.0);       // trompa
  [[-0.7, -0.8], [0.7, -0.8], [-0.7, 0.8], [0.7, 0.8]].forEach(([ox, oz]) => {
    const w = tpCyl(cart, 0.22, 0.22, 0.16, 10, darkM, ox, 0.12, oz);
    if (w) w.rotation.z = Math.PI / 2;
  });
  g.add(cart);
  return cart;
}
function tpPosAt(s) {
  const C = ThemePark.coaster;
  if (!C.L) return { x: TP_COASTER.cx + TP_COASTER.rx, y: TP_COASTER.yBase, z: TP_COASTER.cz };
  s = ((s % C.L) + C.L) % C.L;
  const pts = C.pts, cum = C.cum, N = TP_COASTER.n;
  let i = 0;
  while (i < N - 1 && cum[i + 1] < s) i++;
  const a = pts[i], b = pts[i + 1], seg = (cum[i + 1] - cum[i]) || 1;
  const f = (s - cum[i]) / seg;
  const tx = b.x - a.x, ty = b.y - a.y, tz = b.z - a.z;
  const tl = Math.hypot(tx, ty, tz) || 1;
  return {
    x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f,
    tx: tx / tl, ty: ty / tl, tz: tz / tl,
  };
}
function tpPlaceCart(cart, s) {
  if (!cart) return;
  const p = tpPosAt(s);
  cart.position.set(p.x, p.y + 0.15, p.z);
  cart.rotation.order = 'YXZ';
  cart.rotation.y = Math.atan2(p.tx, p.tz);
  cart.rotation.x = -Math.asin(Math.max(-1, Math.min(1, p.ty || 0)));
}

/* ---- castillo central (diseño original GEAYI) ---- */
function tpBuildCastle(g) {
  const { x: cx, z: cz, w: W, d: D } = TP_CASTLE, H = 5;
  const wallM = tpMat(0xf2e8d8, 0x4a3a20, 0.12); // arenisca clara
  const trimM = tpMat(0x00e5ff, 0x00596e, 0.35); // turquesa GEAYI
  const goldM = tpMat(0xffd23f, 0x7a5b00, 0.35);
  const hw = W / 2, hd = D / 2, T = 0.6, gateW = 2.4;
  // muros (el norte lleva el arco de entrada)
  const segL = (W - gateW) / 2;
  tpBox(g, segL, H, T, wallM, cx - gateW / 2 - segL / 2, H / 2, cz - hd);
  tpBox(g, segL, H, T, wallM, cx + gateW / 2 + segL / 2, H / 2, cz - hd);
  tpBox(g, W, H, T, wallM, cx, H / 2, cz + hd);
  tpBox(g, T, H, D, wallM, cx - hw, H / 2, cz);
  tpBox(g, T, H, D, wallM, cx + hw, H / 2, cz);
  tpBox(g, gateW + 0.6, 1.1, T + 0.15, trimM, cx, H - 0.55, cz - hd); // dintel del arco
  // almenas
  const merM = wallM;
  for (let mx = -hw + 0.7; mx <= hw - 0.5; mx += 1.4) {
    tpBox(g, 0.7, 0.7, T + 0.1, merM, cx + mx, H + 0.35, cz - hd);
    tpBox(g, 0.7, 0.7, T + 0.1, merM, cx + mx, H + 0.35, cz + hd);
  }
  for (let mz = -hd + 0.7; mz <= hd - 0.5; mz += 1.4) {
    tpBox(g, T + 0.1, 0.7, 0.7, merM, cx - hw, H + 0.35, cz + mz);
    tpBox(g, T + 0.1, 0.7, 0.7, merM, cx + hw, H + 0.35, cz + mz);
  }
  // 4 torres con techos cónicos y banderas GEAYI
  ThemePark.rides.flags = [];
  [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]].forEach(([ox, oz], fi) => {
    const tx = cx + ox, tz = cz + oz;
    tpCyl(g, 1.25, 1.4, 8.5, 10, wallM, tx, 4.25, tz);
    const roof = tpCyl(g, 0.05, 1.7, 2.6, 10, trimM, tx, 9.8, tz);
    if (roof) roof.position.y = 8.5 + 1.3;
    tpCyl(g, 0.06, 0.06, 2.2, 6, goldM, tx, 12.2, tz); // asta
    const flagTex = tpSignTex('GEAYI', '★★★', '#00b3cc', '#ffffff');
    const fl = tpSign(g, 1.5, 1.0, flagTex, tx + 0.8, 12.6, tz, 0);
    if (fl) ThemePark.rides.flags.push(fl);
    tpSolid(tx, tz, 8.5, 2.6, 8.5, 2.6);
  });
  // colisionadores de muros (la puerta queda libre)
  tpSolid(cx - gateW / 2 - segL / 2, cz - hd, H, segL, H, T);
  tpSolid(cx + gateW / 2 + segL / 2, cz - hd, H, segL, H, T);
  tpSolid(cx, cz + hd, H, W, H, T);
  tpSolid(cx - hw, cz, H, T, H, D);
  tpSolid(cx + hw, cz, H, T, H, D);
  // patio: alfombra, trono y cofre
  tpBox(g, 3, 0.08, 5, tpMat(0x7b2fff, 0x2a0a7a, 0.3), cx, 0.04, cz);
  tpBox(g, 1.6, 1.1, 0.9, goldM, cx, 0.55, cz + 2.6);            // trono
  tpBox(g, 1.9, 0.25, 1.1, goldM, cx, 1.2, cz + 2.6);
  tpBox(g, 0.5, 1.6, 0.5, trimM, cx - 1.1, 0.8, cz + 2.6);
  tpBox(g, 0.5, 1.6, 0.5, trimM, cx + 1.1, 0.8, cz + 2.6);
  // cofre del castillo (+30 🪙 una sola vez)
  const chest = new THREE.Group(); chest.position.set(cx + 2.8, 0, cz - 2.8); g.add(chest);
  tpBox(chest, 1.1, 0.6, 0.8, tpMat(0x8a5a2e), 0, 0.3, 0);
  const lid = tpBox(chest, 1.1, 0.25, 0.8, tpMat(0xa06a35), 0, 0.72, 0);
  tpBox(chest, 0.25, 0.3, 0.1, goldM, 0, 0.45, 0.42);
  ThemePark.chest = { grp: chest, lid, x: cx + 2.8, z: cz - 2.8, opened: false };
  // estandartes GEAYI en la fachada
  const banTex = tpSignTex('GEAYI', '★★★★★', '#7a1f1f', '#ffc400');
  tpSign(g, 1.4, 2.6, banTex, cx - 3.4, 3.2, cz - hd - 0.36, Math.PI);
  tpSign(g, 1.4, 2.6, banTex, cx + 3.4, 3.2, cz - hd - 0.36, Math.PI);
}

/* ---- juegos mecánicos (visuales animados) ---- */
function tpBuildCarousel(g) {
  const cx = 87, cz = -102, R = 2.2;
  const grp = new THREE.Group(); grp.position.set(cx, 0, cz); g.add(grp);
  const baseM = tpMat(0xffd23f, 0x7a5b00, 0.3), poleM = tpMat(0xc0c8d4, 0x000000, 0, '{"metalness":0.7,"roughness":0.3}');
  const topM = tpMat(0xff4d94, 0x6e0f2e, 0.35);
  tpCyl(grp, R, R + 0.2, 0.35, 14, baseM, 0, 0.17, 0);
  tpCyl(grp, 0.3, 0.3, 3.4, 8, poleM, 0, 1.9, 0);
  const roof = tpCyl(grp, 0.1, R + 0.7, 1.4, 14, topM, 0, 4.3, 0);
  if (roof) roof.position.y = 3.6 + 0.7;
  const spin = new THREE.Group(); grp.add(spin);
  const horses = [];
  const cols = [0xffffff, 0x00e5ff, 0xffd23f, 0xff6f00];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const hx = Math.cos(a) * (R - 0.6), hz = Math.sin(a) * (R - 0.6);
    tpCyl(spin, 0.06, 0.06, 3.2, 6, poleM, hx, 1.9, hz);
    const h = new THREE.Group(); h.position.set(hx, 0.9, hz); h.rotation.y = -a + Math.PI / 2; spin.add(h);
    const hm = tpMat(cols[i]);
    tpBox(h, 0.85, 0.45, 0.4, hm, 0, 0.25, 0);                 // cuerpo
    tpBox(h, 0.28, 0.55, 0.24, hm, 0, 0.62, 0.42);             // cuello
    tpBox(h, 0.24, 0.28, 0.5, hm, 0, 0.85, 0.6);               // cabeza
    [[-0.3, -0.12], [0.3, -0.12], [-0.3, 0.12], [0.3, 0.12]].forEach(([ox, oz]) =>
      tpBox(h, 0.12, 0.55, 0.12, tpMat(0x6b4a2a), ox, -0.25, oz)); // patas
    tpBox(h, 0.5, 0.12, 0.44, tpMat(0x7b2fff), 0, 0.52, 0);     // silla
    horses.push(h);
  }
  tpSolid(cx, cz, 4.5, R * 2 + 0.6, 4.5, R * 2 + 0.6);
  ThemePark.rides.carousel = { spin, horses };
}
function tpBuildDropTower(g) {
  const cx = 99, cz = -102, H = 9;
  const grp = new THREE.Group(); grp.position.set(cx, 0, cz); g.add(grp);
  tpBox(grp, 1.0, H, 1.0, tpMat(0x2b2f36), 0, H / 2, 0);
  tpBox(grp, 2.2, 0.5, 2.2, tpMat(0xffd23f, 0x7a5b00, 0.4), 0, H + 0.25, 0);
  tpBox(grp, 1.2, 0.6, 1.2, tpMat(0x00e5ff, 0x00596e, 0.4), 0, H + 0.8, 0);
  const gon = new THREE.Group(); grp.add(gon);
  tpBox(gon, 2.6, 0.35, 2.6, tpMat(0xff4d94, 0x6e0f2e, 0.35), 0, 0, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    tpBox(gon, 0.5, 0.7, 0.25, tpMat(0x3a3f4a), Math.cos(a) * 1.05, 0.55, Math.sin(a) * 1.05);
  }
  tpSolid(cx, cz, H + 1, 1.2, H + 1, 1.2);
  ThemePark.rides.tower = { gon };
}
function tpBuildTeacups(g) {
  const cx = 93, cz = -93.5, R = 2.2;
  const grp = new THREE.Group(); grp.position.set(cx, 0, cz); g.add(grp);
  tpCyl(grp, R, R + 0.15, 0.3, 14, tpMat(0x00e5ff, 0x00596e, 0.3), 0, 0.15, 0);
  tpCyl(grp, 0.25, 0.25, 2.6, 8, tpMat(0x8a97a8), 0, 1.45, 0);
  tpCyl(grp, 0.05, 1.6, 0.9, 12, tpMat(0xffd23f, 0x7a5b00, 0.35), 0, 3.2, 0);
  const spin = new THREE.Group(); spin.position.y = 0.3; grp.add(spin);
  const cups = [];
  const cols = [0xff6f00, 0x7b2fff, 0x35c759];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const cup = new THREE.Group();
    cup.position.set(Math.cos(a) * 1.25, 0.25, Math.sin(a) * 1.25);
    spin.add(cup);
    tpCyl(cup, 0.5, 0.38, 0.55, 10, tpMat(cols[i], 0x000000, 0), 0, 0.28, 0);
    tpCyl(cup, 0.52, 0.52, 0.1, 10, tpMat(0xffffff), 0, 0.58, 0);
    cups.push(cup);
  }
  tpSolid(cx, cz, 3.6, R * 2 + 0.4, 3.6, R * 2 + 0.4);
  ThemePark.rides.teacups = { spin, cups };
}

/* ---- toboganes de agua + alberca ---- */
function tpSlideCurve(p0, p1, p2, n) { // bezier cuadrática manual (sin depender de THREE.Curve)
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push({
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
      z: u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z,
    });
  }
  return pts;
}
function tpBuildSlides(g) {
  const tx = 100, tz = -116, TH = 6; // torre
  const woodM = tpMat(0x8a5a33), slideM = tpMat(0x00c8ff, 0x005a7a, 0.4);
  tpBox(g, 2.5, TH, 2.5, woodM, tx, TH / 2, tz);
  tpBox(g, 3.0, 0.3, 3.0, tpMat(0xffd23f, 0x7a5b00, 0.3), tx, TH + 0.15, tz); // plataforma
  [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]].forEach(([ox, oz]) =>
    tpBox(g, 0.12, 1.1, 0.12, woodM, tx + ox, TH + 0.8, tz + oz));
  tpBox(g, 3.0, 0.15, 3.0, tpMat(0xff4d94, 0x6e0f2e, 0.35), tx, TH + 1.4, tz); // techito
  tpSolid(tx, tz, TH + 1.4, 2.6, TH + 1.4, 2.6);
  // alberca
  const px = 99, pz = -119.5, pw = 8, pd = 5;
  const rimM = tpMat(0xf2f2f2);
  tpBox(g, pw + 0.6, 0.5, 0.3, rimM, px, 0.25, pz - pd / 2);
  tpBox(g, pw + 0.6, 0.5, 0.3, rimM, px, 0.25, pz + pd / 2);
  tpBox(g, 0.3, 0.5, pd, rimM, px - pw / 2, 0.25, pz);
  tpBox(g, 0.3, 0.5, pd, rimM, px + pw / 2, 0.25, pz);
  const waterM = tpMat(0x00b8ff, 0x005a8a, 0.5, '{"transparent":true,"opacity":0.6}');
  const water = tpBox(g, pw, 0.35, pd, waterM, px, 0.28, pz);
  ThemePark.rides.waterMat = waterM; ThemePark.rides.waterMesh = water;
  // tobogán 1 (recto) y 2 (curvo)
  const s1 = tpSlideCurve({ x: tx, y: TH - 0.4, z: tz - 1.2 }, { x: tx - 0.5, y: 2.6, z: tz - 2.6 }, { x: px - 1.5, y: 0.55, z: pz }, 10);
  const s2 = tpSlideCurve({ x: tx + 0.9, y: TH - 0.4, z: tz + 0.6 }, { x: tx + 2.6, y: 3.0, z: tz - 1.8 }, { x: px + 1.8, y: 0.55, z: pz + 0.6 }, 12);
  [s1, s2].forEach(sp => {
    for (let i = 0; i < sp.length - 1; i++) tpBeam(g, sp[i], sp[i + 1], 0.95, 0.18, slideM);
  });
}

/* ---- taquilla, arco de entrada, cerca y senderos ---- */
function tpBuildEntry(g) {
  // taquilla
  const bx = 87, bz = -74;
  const wallM = tpMat(0xffd23f, 0x7a5b00, 0.25), trimM = tpMat(0x7b2fff, 0x2a0a7a, 0.4);
  tpBox(g, 4, 2.8, 3, wallM, bx, 1.4, bz);
  tpBox(g, 4.5, 0.3, 3.5, trimM, bx, 2.95, bz);
  tpBox(g, 3.2, 1.1, 0.15, tpMat(0x9fd8ff, 0x2a6a8a, 0.3), bx, 1.7, bz + 1.55); // ventanilla
  const tkTex = tpSignTex('🎟️ TAQUILLA', 'PARQUE GEAYI', '#7b2fff', '#ffffff');
  tpSign(g, 3.6, 1.8, tkTex, bx, 3.9, bz + 1.0, 0);
  tpSolid(bx, bz, 3.1, 4.2, 3.1, 3.2);
  // arco de entrada con el letrero grande
  const ax = 93, az = -73;
  tpCyl(g, 0.28, 0.34, 6.5, 10, trimM, ax - 2.6, 3.25, az);
  tpCyl(g, 0.28, 0.34, 6.5, 10, trimM, ax + 2.6, 3.25, az);
  tpBox(g, 6.4, 1.1, 0.5, trimM, ax, 6.6, az);
  const pkTex = tpSignTex('🎢 ' + tpT('tp.park') + ' 🎠', '¡DIVERSIÓN GEAYI!', '#ff5e3a', '#ffffff');
  tpSign(g, 7.6, 2.6, pkTex, ax, 4.6, az, 0);
  tpSolid(ax - 2.6, az, 6.5, 0.6, 6.5, 0.6);
  tpSolid(ax + 2.6, az, 6.5, 0.6, 6.5, 0.6);
  // cerca perimetral con puerta al norte (x∈[91,95])
  const fM = tpMat(0xffd23f, 0x7a5b00, 0.25);
  const post = (x, z) => tpBox(g, 0.16, 1.15, 0.16, fM, x, 0.57, z);
  const railX = (x0, x1, z) => { // tramo este-oeste
    const w = x1 - x0;
    tpBox(g, w, 0.1, 0.1, fM, (x0 + x1) / 2, 0.95, z);
    tpBox(g, w, 0.1, 0.1, fM, (x0 + x1) / 2, 0.5, z);
    for (let x = x0; x <= x1 + 0.01; x += 3) post(x, z);
  };
  const railZ = (z0, z1, x) => { // tramo norte-sur
    const d = z1 - z0;
    tpBox(g, 0.1, 0.1, d, fM, x, 0.95, (z0 + z1) / 2);
    tpBox(g, 0.1, 0.1, d, fM, x, 0.5, (z0 + z1) / 2);
    for (let z = z0; z <= z1 + 0.01; z += 3) post(x, z);
  };
  railX(TP.x0, 91, TP.z1); railX(95, TP.x1, TP.z1); // norte con puerta
  railX(TP.x0, TP.x1, TP.z0);                        // sur
  railZ(TP.z0, TP.z1, TP.x0); railZ(TP.z0, TP.z1, TP.x1);
  tpSolid((TP.x0 + 91) / 2, TP.z1, 1.15, 91 - TP.x0, 1.15, 0.25);
  tpSolid((95 + TP.x1) / 2, TP.z1, 1.15, TP.x1 - 95, 1.15, 0.25);
  tpSolid((TP.x0 + TP.x1) / 2, TP.z0, 1.15, TP.x1 - TP.x0, 1.15, 0.25);
  tpSolid(TP.x0, (TP.z0 + TP.z1) / 2, 1.15, 0.25, 1.15, TP.z1 - TP.z0);
  tpSolid(TP.x1, (TP.z0 + TP.z1) / 2, 1.15, 0.25, 1.15, TP.z1 - TP.z0);
  // sendero principal norte-sur + ramal a la estación
  const pathM = tpMat(0xe8dcc0);
  for (let z = -72; z >= -100; z -= 3) tpBox(g, 2.6, 0.06, 2.9, pathM, 93, 0.03, z);
  for (let x = 94; x <= 102; x += 3) tpBox(g, 2.9, 0.06, 2.6, pathM, x, 0.03, -102);
}

/* inspección para tests (no afecta el juego) */
ThemePark.zone = TP; ThemePark.lots = TP_LOTS; ThemePark.station = TP_STATION;
ThemePark.aqRect = TP_AQ_RECT; ThemePark.nobuild = TP_NOBUILD;
ThemePark.trackPoint = tpTrackPoint; ThemePark.trackY = tpTrackY;
ThemePark.trackLen = function () { return ThemePark.coaster.L; };
ThemePark.worldIdx = TP_IDX; ThemePark.ridePrice = TP_RIDE_PRICE;

/* ================= API PÚBLICA ================= */
ThemePark.buildForLevel = function (i, group) {
  ThemePark.built = false;
  ThemePark.coaster.riding = false;
  ThemePark.coaster.pts = []; ThemePark.coaster.cum = []; ThemePark.coaster.L = 0;
  ThemePark.t = 0;
  ThemePark.rides = {}; ThemePark.chest = null;
  if (i !== TP_IDX || !group || typeof THREE === 'undefined') return;
  try {
    tpBuildCoaster(group);
    tpBuildCastle(group);
    tpBuildCarousel(group);
    tpBuildDropTower(group);
    tpBuildTeacups(group);
    tpBuildSlides(group);
    tpBuildEntry(group);
  } catch (e) { /* nunca romper el nivel */ }
  ThemePark.built = true;
};

ThemePark.onLevelEnd = function () {
  ThemePark.coaster.riding = false;
  if (ThemePark._btn) { try { ThemePark._btn.style.display = 'none'; } catch (e) {} }
};

ThemePark.init = function () { // botón dinámico 🎢 SUBIR (DOM solo aquí)
  if (typeof document === 'undefined' || ThemePark._btn) return;
  try {
    const b = document.createElement('button');
    b.id = 'btn-coaster';
    b.textContent = tpT('tp.board');
    b.style.cssText = 'position:fixed;right:18px;bottom:calc(308px + env(safe-area-inset-bottom));' +
      'z-index:16;min-width:124px;padding:14px 20px;border-radius:999px;' +
      'border:3px solid rgba(255,255,255,.9);font-family:inherit;font-weight:700;font-size:16px;' +
      'color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.45);cursor:pointer;display:none;' +
      'background:radial-gradient(circle at 35% 30%,#ff9d5c 0%,#ff5e3a 45%,#b32b00 100%);' +
      'box-shadow:0 0 22px #ff5e3abb,0 5px 0 #7a2b00,0 8px 20px rgba(0,0,0,.45);';
    b.addEventListener('click', () => ThemePark.tryBoard());
    document.body.appendChild(b);
    ThemePark._btn = b;
  } catch (e) {}
};

ThemePark.tryBoard = function () {
  const T = ThemePark;
  if (!T.built || T.coaster.riding) return false;
  if (typeof Player === 'undefined' || !Player.pos) return false;
  const dx = Player.pos.x - TP_STATION.x, dz = Player.pos.z - TP_STATION.z;
  if (dx * dx + dz * dz > TP_STATION.r * TP_STATION.r) return false;
  if (typeof Shop2 !== 'undefined' && typeof Shop2.spendCoins === 'function') {
    if (!Shop2.spendCoins(TP_RIDE_PRICE)) {
      if (typeof toast === 'function') toast(tpT('tp.need'));
      return false;
    }
  }
  T.coaster.riding = true; T.coaster.s = 0;
  if (typeof toast === 'function') toast(tpT('tp.go'));
  return true;
};

function tpUpdateButton() {
  const b = ThemePark._btn;
  if (!b) return;
  let show = false;
  try {
    const inWorld = (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx === TP_IDX);
    const playMode = (typeof MODE === 'undefined' || MODE === 'play');
    const vMode = (typeof Vehicle !== 'undefined' && Vehicle) ? Vehicle.mode : 'none';
    if (inWorld && playMode && ThemePark.built && !ThemePark.coaster.riding &&
        vMode === 'none' && typeof Player !== 'undefined' && Player.pos) {
      const dx = Player.pos.x - TP_STATION.x, dz = Player.pos.z - TP_STATION.z;
      show = (dx * dx + dz * dz) < TP_STATION.r * TP_STATION.r;
    }
  } catch (e) {}
  if (b._tpShow === show) return; // no tocar el DOM si no cambió
  b._tpShow = show;
  try {
    b.style.display = show ? 'block' : 'none';
    if (show) b.textContent = tpT('tp.board'); // idioma actual
  } catch (e) {}
}

ThemePark.update = function (dt) {
  const T = ThemePark;
  if (!T.built) { return; }
  T.t += dt;
  const t = T.t;
  const inWorld = (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx === TP_IDX);
  if (!inWorld) { tpUpdateButton(); return; }
  // carrito ambiental: siempre dando vueltas
  if (T.coaster.L > 0 && T.coaster.cartB) {
    T.coaster.sB = (T.coaster.sB + TP_COASTER.speed * dt) % T.coaster.L;
    tpPlaceCart(T.coaster.cartB, T.coaster.sB);
  }
  // jugador en la rusa
  if (T.coaster.riding && T.coaster.cartA && typeof Player !== 'undefined' && Player.pos) {
    T.coaster.s += TP_COASTER.speed * dt;
    if (T.coaster.s >= T.coaster.L) { // vuelta completa: baja donde subió
      T.coaster.riding = false; T.coaster.s = 0;
      tpPlaceCart(T.coaster.cartA, 0);
      Player.pos.x = TP_STATION.x; Player.pos.y = 0.1; Player.pos.z = TP_STATION.z;
      if (Player.vel && typeof Player.vel.set === 'function') Player.vel.set(0, 0, 0);
      else if (Player.vel) { Player.vel.x = 0; Player.vel.y = 0; Player.vel.z = 0; }
      if (typeof toast === 'function') toast(tpT('tp.done'));
    } else {
      const p = tpPosAt(T.coaster.s);
      tpPlaceCart(T.coaster.cartA, T.coaster.s);
      Player.pos.x = p.x; Player.pos.y = p.y + 0.95; Player.pos.z = p.z;
      if (Player.vel && typeof Player.vel.set === 'function') Player.vel.set(0, 0, 0);
      else if (Player.vel) { Player.vel.x = 0; Player.vel.y = 0; Player.vel.z = 0; }
      Player.grounded = true; Player.jumpBuf = 0; Player.coyote = 0;
      try { Player.heading = Math.atan2(p.tx, p.tz); } catch (e) {}
    }
  }
  // juegos animados
  const R = T.rides;
  if (R.carousel) {
    R.carousel.spin.rotation.y += dt * 0.7;
    R.carousel.horses.forEach((h, hi) => { h.position.y = 0.9 + Math.sin(t * 2.5 + hi * 1.7) * 0.3; });
  }
  if (R.tower) {
    const cyc = t % 9;
    let gy = 1;
    if (cyc < 3) gy = 1 + (cyc / 3) * 6;
    else if (cyc < 3.8) gy = 7;
    else if (cyc < 4.4) gy = 7 - ((cyc - 3.8) / 0.6) * 6;
    R.tower.gon.position.y = gy;
  }
  if (R.teacups) {
    R.teacups.spin.rotation.y += dt * 0.9;
    R.teacups.cups.forEach((c, ci) => { c.rotation.y += dt * (2 + ci * 0.4); });
  }
  if (R.flags) R.flags.forEach((f, fi) => { f.rotation.y = Math.sin(t * 2 + fi) * 0.18; });
  if (R.waterMat) R.waterMat.opacity = 0.55 + Math.sin(t * 1.4) * 0.08;
  // cofre del castillo (una sola vez)
  if (T.chest && !T.chest.opened && typeof Player !== 'undefined' && Player.pos && typeof SAVE !== 'undefined') {
    if (!SAVE.tpChest) {
      const dx = Player.pos.x - T.chest.x, dz = Player.pos.z - T.chest.z;
      if (dx * dx + dz * dz < 2.5 * 2.5) {
        T.chest.opened = true;
        if (T.chest.lid) T.chest.lid.rotation.x = -1.1;
        SAVE.tpChest = true;
        if (typeof Shop2 !== 'undefined' && typeof Shop2.addCoins === 'function') Shop2.addCoins(30);
        else { SAVE.coins = (SAVE.coins || 0) + 30; }
        if (typeof persist === 'function') persist();
        if (typeof toast === 'function') toast(tpT('tp.chest'));
      }
    } else { T.chest.opened = true; if (T.chest.lid) T.chest.lid.rotation.x = -1.1; }
  }
  tpUpdateButton();
};
