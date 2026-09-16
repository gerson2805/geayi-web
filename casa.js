/* casa.js — 🏠 CASA PROPIA del jugador (mundo 4 · Immokalee)
   - Casa entrable en (-20, 0, 40): piso, 4 paredes (puerta en el lado que mira a la pista),
     techo a dos aguas, ventanas con vidrio y letrero de madera "MI CASA".
   - Panel de decoración (HTML táctil) cuando el jugador está DENTRO de la casa:
     6 colores de pared + catálogo de 4 muebles (cama, mesa, sofá, TV) que se ponen/quitan.
   - Todo se guarda en SAVE.casa (localStorage vía persist()).
   - Diseños 100% originales: solo cajas y cilindros, nada copiado.
   Contrato:
   - addCasaContent(idx, lvl): construye la casa solo si idx === 3.
   - updateCasa(dt): por cuadro; muestra/oculta el panel según el jugador esté dentro.
*/
'use strict';

SAVE.casa = Object.assign({ wall: '#ffffff', bed: false, table: false, sofa: false, tv: false, owned: {} }, SAVE.casa || {});
if (!SAVE.casa.owned || typeof SAVE.casa.owned !== 'object') SAVE.casa.owned = {};

/* ============================== constantes ============================== */
const CASA = { x: -20, z: 40, w: 8, d: 7, h: 4, t: 0.45 }; // centro, ancho(x), fondo(z), alto, grosor
const CASA_COLORS = [
  { hex: '#ffffff', key: 'casa.c.white' },
  { hex: '#7ec8f7', key: 'casa.c.sky' },
  { hex: '#ffd54f', key: 'casa.c.sun' },
  { hex: '#9fe6b8', key: 'casa.c.mint' },
  { hex: '#ff9ebf', key: 'casa.c.pink' },
  { hex: '#c3aef0', key: 'casa.c.lav' },
];
const CASA_FURN_KEYS = ['bed', 'table', 'sofa', 'tv'];
const CASA_FURN_EMOJI = { bed: '🛏️', table: '🍽️', sofa: '🛋️', tv: '📺' };
/* 🛒 TIENDA DE MUEBLES: se compran con monedas y luego se ponen/quitan como los gratis */
const CASA_SHOP = [
  { key: 'lamp',  emoji: '🪔', price: 150 },
  { key: 'plant', emoji: '🌿', price: 100 },
  { key: 'frame', emoji: '🖼️', price: 120 },
  { key: 'shelf', emoji: '📚', price: 250 },
];
const CASA_SHOP_KEYS = CASA_SHOP.map(s => s.key);
const CASA_ALL_KEYS = CASA_FURN_KEYS.concat(CASA_SHOP_KEYS);
CASA_SHOP.forEach(s => { CASA_FURN_EMOJI[s.key] = s.emoji; });
// 4 huecos fijos para los muebles (dentro de la casa, piso en y=0)
const CASA_SLOTS = {
  bed:   { x: -22.4, z: 38.2, ry: 0 },
  sofa:  { x: -22.4, z: 41.9, ry: Math.PI / 2 },  // mira hacia la TV
  table: { x: -18.2, z: 38.1, ry: 0 },
  tv:    { x: -17.3, z: 41.9, ry: -Math.PI / 2 }, // mira hacia el sofá
};
/* Huecos de los muebles de la tienda (no se pisan con los gratis) */
const CASA_SHOP_SLOTS = {
  lamp:  { x: -20.8, z: 42.9, ry: 0 },
  plant: { x: -23.3, z: 43.0, ry: 0 },
  frame: { x: -21.5, y: 2.3, z: 43.2, ry: Math.PI }, // colgado en la pared norte
  shelf: { x: -23.4, z: 40.6, ry: Math.PI / 2 },     // contra la pared oeste
};

/* ============================== estado ============================== */
let casaGroup = null;            // grupo 3D de la casa (se recrea por nivel)
let casaWallMat = null;          // material compartido de las paredes (se tiñe)
let casaFurn = {};               // instancias 3D por clave (se llena dinámico)
CASA_ALL_KEYS.forEach(k => { casaFurn[k] = null; });
let decoEl = null, decoVisible = false, decoWasInside = false, decoLastLang = '';

/* ============================== ayudantes 3D ============================== */
function casaBox(parent, w, h, d, mat, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  parent.add(m);
  return m;
}
function casaCyl(parent, r, h, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function casaMat(color, rough) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough == null ? 0.85 : rough, metalness: 0.05 });
}

/* Un tramo de pared: de a..b (medido desde el centro, sobre el eje dado), de y0 a y1 */
function casaSeg(cx, cz, axis, a, b, y0, y1) {
  const len = b - a, h = y1 - y0, mid = (a + b) / 2, ym = (y0 + y1) / 2;
  if (len <= 0.001 || h <= 0.001) return;
  if (axis === 'x') casaBox(casaGroup, len, h, CASA.t, casaWallMat, cx + mid, ym, cz);
  else casaBox(casaGroup, CASA.t, h, len, casaWallMat, cx, ym, cz + mid);
}
/* Pared con huecos: holes = [{c, w, y0, y1, glass?, door?}] */
function casaWall(cx, cz, axis, len, holes) {
  const hs = (holes || []).slice().sort((p, q) => p.c - q.c);
  let cur = -len / 2;
  hs.forEach(hh => {
    const a = hh.c - hh.w / 2, b = hh.c + hh.w / 2;
    if (a > cur + 0.001) casaSeg(cx, cz, axis, cur, a, 0, CASA.h);
    if (hh.y0 > 0.001) casaSeg(cx, cz, axis, a, b, 0, hh.y0);
    if (hh.y1 < CASA.h - 0.001) casaSeg(cx, cz, axis, a, b, hh.y1, CASA.h);
    cur = Math.max(cur, b);
  });
  if (cur < len / 2 - 0.001) casaSeg(cx, cz, axis, cur, len / 2, 0, CASA.h);
  hs.forEach(hh => {
    if (hh.glass) casaWindowUnit(cx, cz, axis, hh);
    if (hh.door) casaDoorUnit(cx, cz, axis, hh);
  });
}
/* Ventana: vidrio + marco blanco alrededor del hueco */
function casaWindowUnit(cx, cz, axis, hh) {
  const t = CASA.t, w = hh.w, hgt = hh.y1 - hh.y0, ym = (hh.y0 + hh.y1) / 2;
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x9fd8ff, roughness: 0.15, metalness: 0.3,
    transparent: true, opacity: 0.7, emissive: 0x3a7ca5, emissiveIntensity: 0.35
  });
  const frameMat = casaMat(0xf5f5f5, 0.7);
  if (axis === 'x') {
    casaBox(casaGroup, w, hgt, 0.12, glassMat, cx + hh.c, ym, cz);
    casaBox(casaGroup, w + 0.3, 0.14, t + 0.12, frameMat, cx + hh.c, hh.y1 + 0.07, cz);
    casaBox(casaGroup, w + 0.3, 0.14, t + 0.12, frameMat, cx + hh.c, hh.y0 - 0.07, cz);
    casaBox(casaGroup, 0.14, hgt + 0.14, t + 0.12, frameMat, cx + hh.c - w / 2 - 0.07, ym, cz);
    casaBox(casaGroup, 0.14, hgt + 0.14, t + 0.12, frameMat, cx + hh.c + w / 2 + 0.07, ym, cz);
    casaBox(casaGroup, 0.08, hgt, 0.16, frameMat, cx + hh.c, ym, cz); // parteluz
  } else {
    casaBox(casaGroup, 0.12, hgt, w, glassMat, cx, ym, cz + hh.c);
    casaBox(casaGroup, t + 0.12, 0.14, w + 0.3, frameMat, cx, hh.y1 + 0.07, cz + hh.c);
    casaBox(casaGroup, t + 0.12, 0.14, w + 0.3, frameMat, cx, hh.y0 - 0.07, cz + hh.c);
    casaBox(casaGroup, t + 0.12, hgt + 0.14, 0.14, frameMat, cx, ym, cz + hh.c - w / 2 - 0.07);
    casaBox(casaGroup, t + 0.12, hgt + 0.14, 0.14, frameMat, cx, ym, cz + hh.c + w / 2 + 0.07);
    casaBox(casaGroup, 0.16, hgt, 0.08, frameMat, cx, ym, cz + hh.c);
  }
}
/* Puerta: marco de madera + tapete afuera */
function casaDoorUnit(cx, cz, axis, hh) {
  const t = CASA.t, w = hh.w, hgt = hh.y1;
  const wood = casaMat(0x7a4a21, 0.8);
  if (axis === 'z') { // pared este (la puerta mira a la pista)
    casaBox(casaGroup, t + 0.12, hgt, 0.2, wood, cx, hgt / 2, cz + hh.c - w / 2 - 0.1);
    casaBox(casaGroup, t + 0.12, hgt, 0.2, wood, cx, hgt / 2, cz + hh.c + w / 2 + 0.1);
    casaBox(casaGroup, t + 0.12, 0.24, w + 0.4, wood, cx, hgt + 0.12, cz + hh.c);
    // tapete de bienvenida afuera
    casaBox(casaGroup, 1.5, 0.07, w + 0.7, casaMat(0x8d4a2f, 0.95), cx + 1.05, 0.045, cz + hh.c);
  } else {
    casaBox(casaGroup, 0.2, hgt, t + 0.12, wood, cx + hh.c - w / 2 - 0.1, hgt / 2, cz);
    casaBox(casaGroup, 0.2, hgt, t + 0.12, wood, cx + hh.c + w / 2 + 0.1, hgt / 2, cz);
    casaBox(casaGroup, w + 0.4, 0.24, t + 0.12, wood, cx + hh.c, hgt + 0.12, cz);
  }
}
/* Letrero de madera con el nombre de la casa */
function casaSignTexture() {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#7a4f2c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 4;
    for (let y = 40; y < h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = '#3e2712'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#ffe9b8'; g.textAlign = 'center';
    const txt = T('casa.sign');
    let fs = 72;
    g.font = '900 ' + fs + 'px "Trebuchet MS", sans-serif';
    while (g.measureText(txt).width > w - 70 && fs > 24) { fs -= 4; g.font = '900 ' + fs + 'px "Trebuchet MS", sans-serif'; }
    g.fillText(txt, w / 2, h / 2 + fs * 0.35);
  });
}

/* ============================== muebles (originales) ============================== */
function makeBed() {
  const g = new THREE.Group();
  const wood = casaMat(0x8b5a2b, 0.8), white = casaMat(0xf7f7f7, 0.9), blanket = casaMat(0xff5a5a, 0.85);
  casaBox(g, 1.8, 0.4, 2.8, wood, 0, 0.45, 0);
  casaBox(g, 1.8, 1.1, 0.15, wood, 0, 0.85, -1.35);   // cabecera
  casaBox(g, 1.6, 0.28, 2.5, white, 0, 0.79, 0.05);   // colchón
  casaBox(g, 1.66, 0.16, 1.3, blanket, 0, 0.9, 0.65); // cobija
  casaBox(g, 1.1, 0.2, 0.55, white, 0, 1.0, -0.85);   // almohada
  [[-0.8, -1.3], [0.8, -1.3], [-0.8, 1.3], [0.8, 1.3]].forEach(p => casaCyl(g, 0.08, 0.25, wood, p[0], 0.13, p[1]));
  return g;
}
function makeTable() {
  const g = new THREE.Group();
  const wood = casaMat(0xa06a35, 0.8), cup = casaMat(0x7ec8f7, 0.5);
  casaBox(g, 1.7, 0.14, 1.7, wood, 0, 0.95, 0);
  [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].forEach(p => casaCyl(g, 0.07, 0.95, wood, p[0], 0.475, p[1]));
  casaCyl(g, 0.06, 0.16, cup, -0.3, 1.1, 0.2);        // vasito
  casaCyl(g, 0.06, 0.16, cup, 0.35, 1.1, -0.15);      // vasito
  casaBox(g, 0.34, 0.22, 0.34, casaMat(0xff9ebf, 0.7), 0, 1.13, 0.35); // dulcero
  return g;
}
function makeSofa() {
  const g = new THREE.Group();
  const blue = casaMat(0x3f7ad6, 0.9), dark = casaMat(0x3563b0, 0.9), cushion = casaMat(0x8ab6f5, 0.95);
  casaBox(g, 2.2, 0.55, 1.0, blue, 0, 0.45, 0);       // base
  casaBox(g, 2.2, 0.95, 0.28, blue, 0, 0.85, -0.36);  // respaldo
  casaBox(g, 0.28, 0.8, 1.0, dark, -0.96, 0.6, 0);    // brazo izq
  casaBox(g, 0.28, 0.8, 1.0, dark, 0.96, 0.6, 0);     // brazo der
  casaBox(g, 0.9, 0.2, 0.8, cushion, -0.47, 0.82, 0.05); // cojín
  casaBox(g, 0.9, 0.2, 0.8, cushion, 0.47, 0.82, 0.05);  // cojín
  [[-0.9, -0.35], [0.9, -0.35], [-0.9, 0.35], [0.9, 0.35]].forEach(p => casaCyl(g, 0.06, 0.18, dark, p[0], 0.09, p[1]));
  return g;
}
function makeTV() {
  const g = new THREE.Group();
  casaBox(g, 1.7, 0.5, 0.7, casaMat(0x5a3a1e, 0.8), 0, 0.25, 0);   // mueble
  casaBox(g, 1.8, 1.05, 0.14, casaMat(0x14141c, 0.5), 0, 1.35, 0); // pantalla
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.88),
    new THREE.MeshBasicMaterial({ color: 0x9fdcff }));
  disp.position.set(0, 1.35, 0.075); g.add(disp);                  // brillo encendido
  const ant = casaMat(0x888888, 0.4);
  const a1 = casaCyl(g, 0.02, 0.7, ant, -0.2, 2.1, 0); a1.rotation.z = 0.35;
  const a2 = casaCyl(g, 0.02, 0.7, ant, 0.2, 2.1, 0); a2.rotation.z = -0.35;
  return g;
}
const CASA_BUILDERS = { bed: makeBed, table: makeTable, sofa: makeSofa, tv: makeTV };

/* ---------- muebles de la TIENDA (originales, se compran con monedas) ---------- */
function makeLamp() { // 🪔 lámpara de pie con foco encendido
  const g = new THREE.Group();
  const dark = casaMat(0x4a3728, 0.7);
  casaCyl(g, 0.28, 0.08, dark, 0, 0.04, 0);
  casaCyl(g, 0.045, 1.6, dark, 0, 0.88, 0);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.46, 0.52, 12), casaMat(0xffe0b3, 0.9));
  shade.position.set(0, 1.86, 0); g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff6c9 }));
  bulb.position.set(0, 1.68, 0); g.add(bulb);
  return g;
}
function makePlant() { // 🌿 planta en maceta
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.5, 12), casaMat(0xb34a2e, 0.9));
  pot.position.set(0, 0.25, 0); g.add(pot);
  casaCyl(g, 0.05, 0.9, casaMat(0x5a3a1e, 0.9), 0, 0.9, 0);
  const leaf = casaMat(0x35c759, 0.9);
  [[0, 1.62, 0], [0.26, 1.36, 0.1], [-0.26, 1.42, -0.1], [0.1, 1.46, -0.26], [-0.1, 1.36, 0.26]].forEach(p => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), leaf);
    s.position.set(p[0], p[1], p[2]); s.scale.y = 0.72; g.add(s);
  });
  return g;
}
function makeFrame() { // 🖼️ cuadro con paisaje (cielo, sol y campo)
  const g = new THREE.Group();
  casaBox(g, 1.6, 1.1, 0.08, casaMat(0x5a3a1e, 0.8), 0, 0, 0);
  casaBox(g, 1.36, 0.86, 0.04, casaMat(0x7ec8f7, 0.9), 0, 0, 0.035);
  casaBox(g, 1.36, 0.3, 0.045, casaMat(0x35c759, 0.9), 0, -0.28, 0.035);
  const sun = casaCyl(g, 0.14, 0.05, casaMat(0xffd54f, 0.7), 0.35, 0.2, 0.04);
  sun.rotation.x = Math.PI / 2;
  return g;
}
function makeShelf() { // 📚 librero con libros de colores
  const g = new THREE.Group();
  const wood = casaMat(0x6b4a2f, 0.85);
  casaBox(g, 0.08, 2.0, 0.45, wood, -0.76, 1.0, 0);
  casaBox(g, 0.08, 2.0, 0.45, wood, 0.76, 1.0, 0);
  casaBox(g, 1.6, 0.08, 0.45, wood, 0, 1.96, 0);
  casaBox(g, 1.6, 0.08, 0.45, wood, 0, 0.04, 0);
  casaBox(g, 1.6, 1.92, 0.06, wood, 0, 1.0, -0.2);
  const bookCols = [0xff5252, 0x40c4ff, 0xffd23f, 0x69f0ae, 0xea80fc];
  [0.55, 1.15, 1.65].forEach((sy, ri) => {
    casaBox(g, 1.44, 0.06, 0.4, wood, 0, sy, 0);
    let bx = -0.65;
    for (let i = 0; i < 6; i++) {
      const bw = 0.14 + ((i * 37 + ri * 11) % 8) / 100;
      const bh = 0.34 + ((i * 53 + ri * 17) % 12) / 100;
      casaBox(g, bw, bh, 0.3, casaMat(bookCols[(i + ri) % bookCols.length], 0.9), bx + bw / 2, sy + 0.03 + bh / 2, 0);
      bx += bw + 0.03;
    }
  });
  return g;
}
CASA_BUILDERS.lamp = makeLamp;
CASA_BUILDERS.plant = makePlant;
CASA_BUILDERS.frame = makeFrame;
CASA_BUILDERS.shelf = makeShelf;

function casaApplyFurn() {
  CASA_ALL_KEYS.forEach(k => {
    const want = !!SAVE.casa[k], have = casaFurn[k];
    if (want && !have && CASA_BUILDERS[k]) {
      const s = CASA_SLOTS[k] || CASA_SHOP_SLOTS[k];
      if (!s) return;
      const grp = CASA_BUILDERS[k]();
      grp.position.set(s.x, s.y || 0, s.z); grp.rotation.y = s.ry || 0;
      if (casaGroup) casaGroup.add(grp);
      casaFurn[k] = grp;
    } else if (!want && have) {
      if (casaGroup) casaGroup.remove(have);
      casaFurn[k] = null;
    }
  });
}
function casaResetFurn() {
  CASA_ALL_KEYS.forEach(k => { casaFurn[k] = null; });
}

/* ============================== construir la casa ============================== */
function addCasaContent(idx, lvl) {
  if (idx !== 3 || !lvl || !lvl.group) return;
  casaGroup = new THREE.Group();
  lvl.group.add(casaGroup);
  casaResetFurn();
  casaWallMat = new THREE.MeshStandardMaterial({
    color: SAVE.casa.wall || '#ffffff', roughness: 0.85, metalness: 0.05
  });

  const cx = CASA.x, cz = CASA.z;

  // piso (plataforma sólida: el jugador camina sobre él)
  addPlatform(lvl, cx, 0, cz, CASA.w, CASA.d, { color: 0x8a6a42, emissive: 0x000000 });

  // tapete dentro de la puerta
  casaBox(casaGroup, 2.4, 0.06, 1.6, casaMat(0xd64545, 0.95), cx + 2.2, 0.06, cz);

  // paredes: oeste sólida · este con PUERTA (mira a la pista, +x) · norte y sur con ventanas
  casaWall(cx - CASA.w / 2, cz, 'z', CASA.d, []);                                   // oeste
  casaWall(cx + CASA.w / 2, cz, 'z', CASA.d, [{ c: 0, w: 2.2, y0: 0, y1: 3, door: true }]); // este: puerta
  casaWall(cx, cz - CASA.d / 2, 'x', CASA.w, [{ c: -1.5, w: 2, y0: 1.4, y1: 2.6, glass: true }]); // sur: ventana
  casaWall(cx, cz + CASA.d / 2, 'x', CASA.w, [{ c: 1.5, w: 2, y0: 1.4, y1: 2.6, glass: true }]);  // norte: ventana

  // techo a dos aguas (cumbrera sobre el eje z)
  const roofMat = casaMat(0xb34a2e, 0.9);
  const ang = Math.atan2(1.7, 4.6);
  const lp = casaBox(casaGroup, 4.95, 0.25, 7.9, roofMat, cx - 2.32, 4.78, cz);
  lp.rotation.z = ang;
  const rp = casaBox(casaGroup, 4.95, 0.25, 7.9, roofMat, cx + 2.32, 4.78, cz);
  rp.rotation.z = -ang;
  // hastiales triangulares (siguen el color de la pared)
  const tri = new THREE.Shape();
  tri.moveTo(-4, 4); tri.lineTo(4, 4); tri.lineTo(0, 5.64); tri.closePath();
  const triGeo = new THREE.ShapeGeometry(tri);
  const g1 = new THREE.Mesh(triGeo, casaWallMat); g1.position.set(cx, 0, cz - CASA.d / 2); casaGroup.add(g1);
  const g2 = new THREE.Mesh(triGeo, casaWallMat); g2.position.set(cx, 0, cz + CASA.d / 2); g2.rotation.y = Math.PI; casaGroup.add(g2);

  // letrero de madera "MI CASA" sobre la puerta (lado de la pista)
  const boardX = cx + CASA.w / 2 + 0.3;
  casaBox(casaGroup, 0.12, 1.05, 3.2, casaMat(0x5a3a1e, 0.85), boardX, 3.62, cz);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.9),
    new THREE.MeshBasicMaterial({ map: casaSignTexture() }));
  sign.position.set(boardX + 0.07, 3.62, cz); sign.rotation.y = Math.PI / 2;
  casaGroup.add(sign);

  // muebles guardados
  casaApplyFurn();
}

/* ============================== panel de decoración ============================== */
function casaCss() {
  if (document.getElementById('casa-css')) return;
  const st = document.createElement('style');
  st.id = 'casa-css';
  st.textContent =
    '#deco-panel{position:fixed;left:50%;transform:translateX(-50%);bottom:118px;z-index:60;display:none;' +
    'background:rgba(18,14,38,.96);border:2px solid #7ec8f7;border-radius:18px;padding:12px 14px;color:#fff;' +
    'font-family:inherit;max-width:94vw;box-shadow:0 8px 30px rgba(0,0,0,.5);text-align:center}' +
    '#deco-panel h3{margin:0 0 8px;font-size:17px}' +
    '.dc-lbl{font-size:13px;opacity:.9;margin:8px 0 6px}' +
    '.dc-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}' +
    '.dc-sw{width:48px;height:48px;border-radius:50%;border:3px solid rgba(255,255,255,.35);cursor:pointer;' +
    'font-size:18px;line-height:1;padding:0}' +
    '.dc-sw.on{border-color:#ffe95e;box-shadow:0 0 10px #ffe95e}' +
    '.dc-furn{min-width:70px;min-height:62px;border-radius:14px;border:2px solid rgba(255,255,255,.25);' +
    'background:#2a2350;color:#fff;cursor:pointer;padding:8px 10px;font-size:13px;font-family:inherit}' +
    '.dc-furn .e{font-size:26px;display:block}' +
    '.dc-furn.on{border-color:#59ff7a;background:#1d3a24;box-shadow:0 0 10px rgba(89,255,122,.5)}' +
    '.dc-close{margin-top:10px;min-height:52px;width:100%;border-radius:14px;border:0;cursor:pointer;' +
    'background:#59d867;color:#08240f;font-weight:900;font-size:16px;font-family:inherit}';
  document.head.appendChild(st);
}
function casaEnsurePanel() {
  casaCss();
  if (decoEl) return;
  decoEl = document.createElement('div');
  decoEl.id = 'deco-panel';
  document.body.appendChild(decoEl);
}
function casaRenderPanel() {
  if (!decoEl) return;
  const cur = SAVE.casa.wall || '#ffffff';
  let html = '<h3>' + T('casa.title') + '</h3>';
  html += '<div class="dc-lbl">' + T('casa.wallLabel') + '</div><div class="dc-row">';
  CASA_COLORS.forEach(c => {
    html += '<button class="dc-sw' + (cur.toLowerCase() === c.hex ? ' on' : '') + '" data-c="' + c.hex +
      '" title="' + T(c.key) + '" style="background:' + c.hex + '">' +
      (cur.toLowerCase() === c.hex ? '✔' : '') + '</button>';
  });
  html += '</div><div class="dc-lbl">' + T('casa.furnLabel') + '</div><div class="dc-row">';
  CASA_FURN_KEYS.forEach(k => {
    html += '<button class="dc-furn' + (SAVE.casa[k] ? ' on' : '') + '" data-f="' + k + '">' +
      '<span class="e">' + CASA_FURN_EMOJI[k] + '</span>' + T('casa.' + k) +
      '<br><small>' + T('casa.free') + '</small></button>';
  });
  html += '</div><div class="dc-lbl">🛒 ' + T('casa.shopLabel') + ' · 🪙 ' + casaCoinsText() + '</div><div class="dc-row">';
  CASA_SHOP.forEach(s => {
    const owned = !!(SAVE.casa.owned && SAVE.casa.owned[s.key]);
    const placed = !!SAVE.casa[s.key];
    html += '<button class="dc-furn' + (placed ? ' on' : '') + '" data-s="' + s.key + '">' +
      '<span class="e">' + s.emoji + '</span>' + T('casa.' + s.key) + '<br><small>' +
      (owned ? (placed ? T('casa.putAway') : T('casa.put')) : '🪙 ' + s.price) + '</small></button>';
  });
  html += '</div><button class="dc-close">' + T('casa.close') + '</button>';
  decoEl.innerHTML = html;
  decoLastLang = (typeof LANG !== 'undefined') ? LANG : 'es';

  decoEl.querySelectorAll('.dc-sw').forEach(b => b.addEventListener('click', () => {
    SAVE.casa.wall = b.getAttribute('data-c');
    try {
      if (casaWallMat) casaWallMat.color.set(SAVE.casa.wall);
      Audio2.click();
      persist();
      casaRenderPanel();
    } catch (e) {}
  }));
  decoEl.querySelectorAll('.dc-furn').forEach(b => b.addEventListener('click', () => {
    casaToggleFurn(b.getAttribute('data-f'));
  }));
  decoEl.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => {
    casaBuyFurn(b.getAttribute('data-s'));
  }));
  const cb = decoEl.querySelector('.dc-close');
  if (cb) cb.addEventListener('click', () => { try { Audio2.click(); } catch (e) {} casaHidePanel(); });
}
function casaShowPanel() {
  casaEnsurePanel();
  casaRenderPanel();
  decoEl.style.display = 'block';
  decoVisible = true;
}
function casaHidePanel() {
  decoVisible = false;
  if (decoEl) decoEl.style.display = 'none';
}

/* Poner / quitar un mueble (gratis o de la tienda si ya es tuyo) */
function casaToggleFurn(key) {
  if (CASA_ALL_KEYS.indexOf(key) < 0) return;
  if (CASA_SHOP_KEYS.indexOf(key) >= 0 && !(SAVE.casa.owned && SAVE.casa.owned[key])) {
    casaBuyFurn(key); // aún no es tuyo → comprar primero
    return;
  }
  const s = CASA_SLOTS[key] || CASA_SHOP_SLOTS[key] || {};
  SAVE.casa[key] = !SAVE.casa[key];
  try {
    casaApplyFurn();
    persist();
    if (SAVE.casa[key]) {
      Audio2.check();
      Particles.burst(s.x || CASA.x, 1.5, s.z || CASA.z, [0xffe95e, 0x59ff7a, 0x7ec8f7], 14, 3);
      toast(tp('casa.added', { n: CASA_FURN_EMOJI[key] + ' ' + T('casa.' + key) }));
      if (CASA_FURN_KEYS.every(k => SAVE.casa[k])) {
        if (typeof Trophy !== 'undefined' && Trophy.unlock) Trophy.unlock('deco');
        toast(T('casa.trophy'));
        Particles.burst(s.x || CASA.x, 2, s.z || CASA.z, [0xffe95e, 0xff9d00, 0xffffff], 30, 5);
      }
    } else {
      Audio2.click();
      toast(tp('casa.removed', { n: CASA_FURN_EMOJI[key] + ' ' + T('casa.' + key) }));
    }
    if (decoVisible) casaRenderPanel();
  } catch (e) {}
}

/* Texto de monedas (∞ con código familiar) */
function casaCoinsText() {
  try {
    if (typeof Shop2 !== 'undefined' && Shop2.coinsText) return Shop2.coinsText();
    return String((typeof SAVE !== 'undefined' && SAVE.coins) || 0);
  } catch (e) { return '0'; }
}

/* Comprar un mueble de la tienda con monedas */
function casaBuyFurn(key) {
  const item = CASA_SHOP.find(s => s.key === key);
  if (!item) return;
  SAVE.casa.owned = SAVE.casa.owned || {};
  if (SAVE.casa.owned[key]) { casaToggleFurn(key); return; }
  const doBuy = () => {
    let ok = false;
    try {
      if (typeof Shop2 !== 'undefined' && Shop2.spendCoins) ok = Shop2.spendCoins(item.price);
      else {
        const c = (typeof SAVE !== 'undefined' && SAVE.coins) || 0;
        if (c >= item.price) { SAVE.coins = c - item.price; persist(); ok = true; }
      }
    } catch (e) { ok = false; }
    if (!ok) {
      try { Audio2.deny(); } catch (e) {}
      toast(T('casa.noCoins'));
      return;
    }
    SAVE.casa.owned[key] = true;
    SAVE.casa[key] = true;
    try {
      persist();
      casaApplyFurn();
      Audio2.check();
      toast('✅ ¡' + T('casa.' + key) + ' ' + T('casa.bought') + '!');
      if (decoVisible) casaRenderPanel();
    } catch (e) {}
  };
  try {
    if (typeof Shop2 !== 'undefined' && Shop2.confirmDlg) {
      Shop2.confirmDlg('🛒 ' + T('casa.shopLabel'),
        '<b>' + item.emoji + ' ' + T('casa.' + key) + '</b><br>🪙 ' + item.price + ' ' + T('casa.coinsWord'), doBuy);
    } else doBuy();
  } catch (e) { doBuy(); }
}

/* ============================== bucle ============================== */
function updateCasa(dt) {
  casaEnsurePanel();
  let inside = false;
  try {
    if (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx === 3 &&
        typeof MODE !== 'undefined' && MODE === 'play' &&
        typeof Player !== 'undefined' && Player && Player.pos) {
      const p = Player.pos;
      inside = Math.abs(p.x - CASA.x) < CASA.w / 2 - 0.6 &&
               Math.abs(p.z - CASA.z) < CASA.d / 2 - 0.6 &&
               p.y > -2 && p.y < 7;
    }
  } catch (e) { inside = false; }
  const lang = (typeof LANG !== 'undefined') ? LANG : 'es';
  if (inside && !decoVisible) casaShowPanel();
  else if (!inside && decoVisible) casaHidePanel();
  else if (inside && decoVisible && decoLastLang !== lang) casaRenderPanel();
  if (inside && !decoWasInside) { try { toast(T('casa.welcome')); } catch (e) {} }
  decoWasInside = inside;
}

/* ============================== i18n ============================== */
addStrings('es', {
  'casa.title': '🏠 Mi casa',
  'casa.sign': 'MI CASA',
  'casa.welcome': '🏠 ¡Estás en tu casa! Decórala como quieras 🎨',
  'casa.wallLabel': '🎨 Color de las paredes:',
  'casa.furnLabel': '🪑 Muebles (toca para poner o quitar):',
  'casa.bed': 'Cama',
  'casa.table': 'Mesa',
  'casa.sofa': 'Sofá',
  'casa.tv': 'Tele',
  'casa.lamp': 'Lámpara',
  'casa.plant': 'Planta',
  'casa.frame': 'Cuadro',
  'casa.shelf': 'Librero',
  'casa.shopLabel': 'Tienda de muebles',
  'casa.free': 'Gratis',
  'casa.put': 'Poner',
  'casa.putAway': 'Quitar',
  'casa.noCoins': '🪙 No tienes monedas suficientes',
  'casa.bought': 'comprado/a',
  'casa.coinsWord': 'monedas',
  'casa.added': '✅ {n} puesta',
  'casa.removed': '🧹 {n} guardada',
  'casa.close': '✔ Listo',
  'casa.trophy': '🏆 ¡Casa completada! ¡Eres un gran decorador!',
  'casa.c.white': 'Blanca',
  'casa.c.sky': 'Celeste',
  'casa.c.sun': 'Amarilla',
  'casa.c.mint': 'Menta',
  'casa.c.pink': 'Rosa',
  'casa.c.lav': 'Lila',
});
addStrings('en', {
  'casa.title': '🏠 My house',
  'casa.sign': 'MY HOUSE',
  'casa.welcome': '🏠 You are home! Decorate it your way 🎨',
  'casa.wallLabel': '🎨 Wall color:',
  'casa.furnLabel': '🪑 Furniture (tap to add or remove):',
  'casa.bed': 'Bed',
  'casa.table': 'Table',
  'casa.sofa': 'Sofa',
  'casa.tv': 'TV',
  'casa.lamp': 'Lamp',
  'casa.plant': 'Plant',
  'casa.frame': 'Painting',
  'casa.shelf': 'Bookshelf',
  'casa.shopLabel': 'Furniture store',
  'casa.free': 'Free',
  'casa.put': 'Place',
  'casa.putAway': 'Remove',
  'casa.noCoins': '🪙 Not enough coins',
  'casa.bought': 'bought',
  'casa.coinsWord': 'coins',
  'casa.added': '✅ {n} added',
  'casa.removed': '🧹 {n} put away',
  'casa.close': '✔ Done',
  'casa.trophy': '🏆 House complete! You are a great decorator!',
  'casa.c.white': 'White',
  'casa.c.sky': 'Sky blue',
  'casa.c.sun': 'Sunny yellow',
  'casa.c.mint': 'Mint',
  'casa.c.pink': 'Pink',
  'casa.c.lav': 'Lavender',
});
addStrings('pt', {
  'casa.title': '🏠 Minha casa',
  'casa.sign': 'MINHA CASA',
  'casa.welcome': '🏠 Você está em casa! Decore do seu jeito 🎨',
  'casa.wallLabel': '🎨 Cor das paredes:',
  'casa.furnLabel': '🪑 Móveis (toque para colocar ou tirar):',
  'casa.bed': 'Cama',
  'casa.table': 'Mesa',
  'casa.sofa': 'Sofá',
  'casa.tv': 'TV',
  'casa.lamp': 'Luminária',
  'casa.plant': 'Planta',
  'casa.frame': 'Quadro',
  'casa.shelf': 'Estante',
  'casa.shopLabel': 'Loja de móveis',
  'casa.free': 'Grátis',
  'casa.put': 'Colocar',
  'casa.putAway': 'Tirar',
  'casa.noCoins': '🪙 Moedas insuficientes',
  'casa.bought': 'comprado/a',
  'casa.coinsWord': 'moedas',
  'casa.added': '✅ {n} colocada',
  'casa.removed': '🧹 {n} guardada',
  'casa.close': '✔ Pronto',
  'casa.trophy': '🏆 Casa completa! Você é um ótimo decorador!',
  'casa.c.white': 'Branca',
  'casa.c.sky': 'Azul-céu',
  'casa.c.sun': 'Amarela',
  'casa.c.mint': 'Menta',
  'casa.c.pink': 'Rosa',
  'casa.c.lav': 'Lilás',
});
addStrings('fr', {
  'casa.title': '🏠 Ma maison',
  'casa.sign': 'MA MAISON',
  'casa.welcome': '🏠 Tu es chez toi ! Décore-la comme tu veux 🎨',
  'casa.wallLabel': '🎨 Couleur des murs :',
  'casa.furnLabel': '🪑 Meubles (touche pour ajouter ou retirer) :',
  'casa.bed': 'Lit',
  'casa.table': 'Table',
  'casa.sofa': 'Canapé',
  'casa.tv': 'Télé',
  'casa.lamp': 'Lampe',
  'casa.plant': 'Plante',
  'casa.frame': 'Tableau',
  'casa.shelf': 'Étagère',
  'casa.shopLabel': 'Magasin de meubles',
  'casa.free': 'Gratuit',
  'casa.put': 'Poser',
  'casa.putAway': 'Retirer',
  'casa.noCoins': '🪙 Pas assez de pièces',
  'casa.bought': 'acheté(e)',
  'casa.coinsWord': 'pièces',
  'casa.added': '✅ {n} ajoutée',
  'casa.removed': '🧹 {n} rangée',
  'casa.close': '✔ OK',
  'casa.trophy': '🏆 Maison terminée ! Tu es un super décorateur !',
  'casa.c.white': 'Blanche',
  'casa.c.sky': 'Bleu ciel',
  'casa.c.sun': 'Jaune soleil',
  'casa.c.mint': 'Menthe',
  'casa.c.pink': 'Rose',
  'casa.c.lav': 'Lavande',
});
