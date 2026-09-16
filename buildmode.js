/* buildmode.js — 🧱 MODO CONSTRUIR (GEAYI — Obby Xtreme 3D)
   Sandbox de construcción estilo original GEAYI:
   - Botón "🧱 CONSTRUIR" inyectado dinámicamente en el menú principal.
   - Abre una parcela plana de 60×60 separada del mundo (sin enemigos ni metas).
   - Paleta: 12 colores caramelo + 8 formas (cubo, rampa, cilindro, esfera,
     escalera, arco, cuña, losa).
   - Materiales: caramelo, ladrillo, madera, vidrio, metal, piedra, pasto
     (texturas procedurales con canvas, caché por material+color).
   - Herramientas: 🧱 bloque (colocar) · 🪑 objetos · 🖌️ pincel (pintar) · 🧽 goma (borrar).
   - Objetos procedurales: árbol, flor, lámpara, silla, mesa, cerca, roca, farola.
   - Tutorial de 3 pasos la primera vez + ghost preview + toasts.
   - Luz de día clara en el modo, animación pop al colocar.
   - Táctil: toca el suelo/bloque para colocar · arrastra para orbitar la cámara ·
     botones ⬆️⬇️ de altura, ↻ girar forma, ◀ ▶ girar cámara, 🔍± zoom.
   - Guardar/cargar: 5 construcciones en SAVE.builds (localStorage vía persist()).
   - Botón "🏙️ Mis ciudades": listar / cargar / borrar.
   - Botón "🏆 Enviar a concurso": Community.registrarConstruccion(nombre) si existe.
   - Tope ~400 bloques (600 con Pase Constructor); geometrías y materiales
     REUTILIZADOS por caché (Android).
   REGLAS: no ejecuta DOM al cargar; todo el DOM vive en BuildMode.init().
   Expone BuildMode.open() / BuildMode.close() / BuildMode.update(dt).
   INTEGRACIÓN (sin editar archivos existentes):
   1. <script src="buildmode.js"></script> en index.html (antes de game.js).
   2. En boot(): if (typeof BuildMode !== 'undefined') BuildMode.init();
   3. En el loop de game.js, ANTES de la rama del menú:
        } else if (MODE === 'build' && typeof BuildMode !== 'undefined') { BuildMode.update(dt); }
      (sugerencia: agregar 'build' a los MODE de state.js: menu | levels | custom | play | pause | win | build)
*/
'use strict';

/* ================= constantes ================= */
const BM_PLOT = 60;            // parcela 60×60
const BM_MAX = 400;            // tope base de bloques
const BM_MAXY = 14;            // altura máxima de capas
function bmMax() { // 🧱 tope real: base + Pase Constructor de la tienda
  try { if (typeof Shop2 !== 'undefined' && typeof Shop2.blockBonus === 'function') return BM_MAX + Shop2.blockBonus(); } catch (e) {}
  return BM_MAX;
}
const BM_COLORS = [
  ['#ff5e8a', 'Rosa'], ['#ff9d00', 'Naranja'], ['#ffe95e', 'Amarillo'], ['#59d867', 'Verde'],
  ['#00c2a8', 'Menta'], ['#00a2ff', 'Azul'], ['#7b2fff', 'Morado'], ['#ff2fd6', 'Fucsia'],
  ['#ffffff', 'Blanco'], ['#8a5a33', 'Madera'], ['#2b2f3a', 'Negro'], ['#ffd9e8', 'Pastel'],
];
const BM_SHAPES = [
  { id: 'cube', n: 'Cubo', e: '🧱' },
  { id: 'ramp', n: 'Rampa', e: '📐' },
  { id: 'cyl', n: 'Cilindro', e: '🛢️' },
  { id: 'sph', n: 'Esfera', e: '⚪' },
  { id: 'stair', n: 'Escalera', e: '🪜' },
  { id: 'arch', n: 'Arco', e: '🌉' },
  { id: 'wedge', n: 'Cuña', e: '🔻' },
  { id: 'slab', n: 'Losa', e: '▬' },
];
const BM_TOOLS = [
  { id: 'block', n: 'Bloque', e: '🧱' },
  { id: 'object', n: 'Objetos', e: '🪑' },
  { id: 'paint', n: 'Pincel', e: '🖌️' },
  { id: 'erase', n: 'Goma', e: '🧽' },
];
/* 🧱 materiales con textura procedural (dibujada en blanco: el color la tiñe) */
const BM_MATS = [
  { id: 'candy', n: 'Caramelo', e: '🍬', rough: 0.55, metal: 0.1 },
  { id: 'brick', n: 'Ladrillo', e: '🧱', rough: 0.9, metal: 0.0 },
  { id: 'wood', n: 'Madera', e: '🪵', rough: 0.8, metal: 0.0 },
  { id: 'glass', n: 'Vidrio', e: '🪟', rough: 0.12, metal: 0.1, glass: true },
  { id: 'metal', n: 'Metal', e: '⚙️', rough: 0.35, metal: 0.8 },
  { id: 'stone', n: 'Piedra', e: '🪨', rough: 0.95, metal: 0.05 },
  { id: 'grass', n: 'Pasto', e: '🟩', rough: 1.0, metal: 0.0 },
];
const BM_MATMAP = {};
BM_MATS.forEach(m => { BM_MATMAP[m.id] = m; });
/* 🪑 objetos procedurales (2-5 piezas, colores fijos) */
const BM_OBJECTS = [
  { id: 'tree', n: 'Árbol', e: '🌳' },
  { id: 'flower', n: 'Flor', e: '🌸' },
  { id: 'lamp', n: 'Lámpara', e: '💡' },
  { id: 'chair', n: 'Silla', e: '🪑' },
  { id: 'table', n: 'Mesa', e: '🪑' },
  { id: 'fence', n: 'Cerca', e: '🪵' },
  { id: 'rock', n: 'Roca', e: '🪨' },
  { id: 'post', n: 'Farola', e: '🏮' },
];
/* posicionamiento por forma: y0 = centro vertical sobre la capa */
const BM_SHAPE_DEFS = {
  cube: { y0: 0.5 }, ramp: { y0: 0.42 }, cyl: { y0: 0.5, spin: true }, sph: { y0: 0.5 },
  stair: { y0: 0.5, spin: true }, arch: { y0: 0.5, spin: true },
  wedge: { y0: 0.5, spin: true }, slab: { y0: 0.125 },
};

const BuildMode = {
  active: false,
  blocks: [],            // {s, c, m, o, x, y, z, r, mesh}
  tool: 'block', shape: 'cube', color: BM_COLORS[0][0], mat: 'candy', object: 'tree',
  layer: 0, shapeRot: 0,
  cam: { az: 0.7, el: 0.85, dist: 54 },
  group: null, ui: {},
  curSlot: 0, curName: 'Mi construcción',
  _geo: {}, _mat: {}, _tex: {}, _pops: [],
  _prevMode: 'menu', _prevGroupVis: true, _prevAvatarVis: true,
  _ptr: null,            // estado del puntero para tap vs drag
  _lot: null,            // {worldIdx, lot} cuando se construye en un lote comprado (fase 2)
  _camTx: 0, _camTz: 0,  // objetivo de la cámara orbital (lote o 0,0)
  _ghost: null, _rig: null, _prevBg: undefined,
};

/* ================= caché de geometrías / materiales / texturas ================= */
function bmGeo(key, make) {
  if (!BuildMode._geo[key]) BuildMode._geo[key] = make();
  return BuildMode._geo[key];
}
function bmCanvas(s) {
  const c = document.createElement('canvas');
  c.width = c.height = s || 64;
  return c;
}
/* 🎨 texturas procedurales en blanco/grises: el color del bloque las tiñe */
function bmPaintTex(id) {
  const cv = bmCanvas(64), ctx = cv.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 64, 64);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  if (id === 'brick') {
    ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 3;
    for (let y = 0; y <= 64; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke(); }
    for (let r = 0; r < 4; r++) {
      const off = (r % 2) ? 16 : 0;
      for (let x = off; x <= 64; x += 32) { ctx.beginPath(); ctx.moveTo(x, r * 16); ctx.lineTo(x, r * 16 + 16); ctx.stroke(); }
    }
  } else if (id === 'wood') {
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = i % 2 ? '#b5b5b5' : '#d8d8d8'; ctx.lineWidth = 2 + (i % 3);
      const y = 4 + i * 7;
      ctx.beginPath(); ctx.moveTo(0, y);
      ctx.bezierCurveTo(20, y + 3, 44, y - 3, 64, y + 2); ctx.stroke();
    }
  } else if (id === 'metal') {
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#a8a8a8'; ctx.lineWidth = 5;
    for (let x = -64; x < 128; x += 18) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 64, 64); ctx.stroke(); }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    for (let x = -64; x < 128; x += 18) { ctx.beginPath(); ctx.moveTo(x + 6, 0); ctx.lineTo(x + 70, 64); ctx.stroke(); }
  } else if (id === 'stone') {
    for (let i = 0; i < 60; i++) {
      const g = 140 + Math.floor(rnd() * 100);
      ctx.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')';
      const r = 2 + rnd() * 5;
      ctx.beginPath(); ctx.arc(rnd() * 64, rnd() * 64, r, 0, 7); ctx.fill();
    }
  } else if (id === 'grass') {
    ctx.strokeStyle = '#c9c9c9'; ctx.lineWidth = 2;
    for (let i = 0; i < 46; i++) {
      const x = rnd() * 64, y = rnd() * 64, h = 5 + rnd() * 7;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 5, y - h); ctx.stroke();
    }
  }
  return cv;
}
function bmTexture(id) {
  if (BuildMode._tex[id] !== undefined) return BuildMode._tex[id];
  let t = null;
  try {
    if (typeof document !== 'undefined' && typeof THREE.CanvasTexture === 'function') {
      const cv = bmPaintTex(id);
      if (cv) {
        t = new THREE.CanvasTexture(cv);
        if (THREE.RepeatWrapping !== undefined) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; }
      }
    }
  } catch (e) { t = null; }
  BuildMode._tex[id] = t;
  return t;
}
/* 🟩 textura de la parcela: damero verde suave (caché) */
function bmGroundTex() {
  if (BuildMode._tex.ground !== undefined) return BuildMode._tex.ground;
  let t = null;
  try {
    if (typeof document !== 'undefined' && typeof THREE.CanvasTexture === 'function') {
      const cv = bmCanvas(128), ctx = cv.getContext('2d');
      ctx.fillStyle = '#93d897'; ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#8bcf90';
      ctx.fillRect(0, 0, 64, 64); ctx.fillRect(64, 64, 64, 64);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 126, 126);
      t = new THREE.CanvasTexture(cv);
      if (THREE.RepeatWrapping !== undefined) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; }
      if (t.repeat && typeof t.repeat.set === 'function') t.repeat.set(30, 30);
    }
  } catch (e) { t = null; }
  BuildMode._tex.ground = t;
  return t;
}
/* material por (material, color): un color distinto = otra entrada, como antes */
function bmMatFor(m, color) {
  m = (m && BM_MATMAP[m]) ? m : 'candy';
  const key = m + '|' + color;
  if (!BuildMode._mat[key]) {
    const def = BM_MATMAP[m];
    const params = { color: color, roughness: def.rough, metalness: def.metal };
    const tx = bmTexture(m);
    if (tx) params.map = tx;
    if (def.glass) { params.transparent = true; params.opacity = 0.45; }
    BuildMode._mat[key] = new THREE.MeshStandardMaterial(params);
  }
  return BuildMode._mat[key];
}
function bmMat(color) { return bmMatFor('candy', color); } // compatibilidad
/* 🔻 cuña: prisma triangular 1×1×1 (sección en XY, extruido en Z) */
function bmWedgeGeo() {
  const v = [
    0, 0, 0, 0, 0, 1, 1, 0, 1,   0, 0, 0, 1, 0, 1, 1, 0, 0,   // abajo
    0, 0, 0, 0, 1, 0, 0, 1, 1,   0, 0, 0, 0, 1, 1, 0, 0, 1,   // atrás x=0
    1, 0, 0, 0, 1, 0, 0, 1, 1,   1, 0, 0, 0, 1, 1, 1, 0, 1,   // rampa
    0, 0, 0, 0, 1, 0, 1, 0, 0,                                     // tapa z=0
    0, 0, 1, 1, 0, 1, 0, 1, 1,                                     // tapa z=1
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  const uv = [];
  for (let i = 0; i < v.length; i += 3) uv.push(v[i] + v[i + 2] * 0.5, v[i + 1]);
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (typeof geo.computeVertexNormals === 'function') geo.computeVertexNormals();
  return geo;
}
function bmShapeGeo(shape) {
  switch (shape) {
    case 'ramp': return bmGeo('ramp', () => new THREE.BoxGeometry(1.35, 0.32, 1));
    case 'cyl': return bmGeo('cyl', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 14));
    case 'sph': return bmGeo('sph', () => new THREE.SphereGeometry(0.5, 14, 10));
    case 'wedge': return bmGeo('wedge', bmWedgeGeo);
    case 'slab': return bmGeo('slab', () => new THREE.BoxGeometry(1, 0.25, 1));
    default: return bmGeo('cube', () => new THREE.BoxGeometry(1, 1, 1));
  }
}
/* 🪜 escalera y 🌉 arco: grupos de cajas con geometría compartida */
function bmBuildStair(mat) {
  const g = new THREE.Group();
  const geo = bmGeo('cube', () => new THREE.BoxGeometry(1, 1, 1));
  for (let i = 0; i < 4; i++) {
    const h = (i + 1) * 0.25;
    const st = new THREE.Mesh(geo, mat);
    st.scale.set(0.25, h, 1);
    st.position.set(i * 0.25 + 0.125 - 0.5, h / 2 - 0.5, 0);
    g.add(st);
  }
  return g;
}
function bmBuildArch(mat) {
  const g = new THREE.Group();
  const geo = bmGeo('cube', () => new THREE.BoxGeometry(1, 1, 1));
  [[-0.35, 0.5, 0.3, 1], [0.35, 0.5, 0.3, 1]].forEach(([px, py, w, h]) => {
    const p = new THREE.Mesh(geo, mat);
    p.scale.set(w, h, 1); p.position.set(px, py - 0.5, 0); g.add(p);
  });
  const beam = new THREE.Mesh(geo, mat);
  beam.scale.set(1, 0.25, 1); beam.position.set(0, 0.375, 0); g.add(beam);
  return g;
}
/* 🪑 objetos procedurales (origen en la base, ~1×1 de huella) */
function bmObjMat(color) { return bmMatFor('candy', color); }
function bmObjGlow(color, glow) {
  const key = 'glow|' + color;
  if (!BuildMode._mat[key]) {
    BuildMode._mat[key] = new THREE.MeshStandardMaterial({
      color: color, emissive: glow, emissiveIntensity: 1.4, roughness: 0.4, metalness: 0,
    });
  }
  return BuildMode._mat[key];
}
function bmBuildObject(id) {
  const g = new THREE.Group();
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(bmGeo('cube', () => new THREE.BoxGeometry(1, 1, 1)), mat);
    m.scale.set(w, h, d); m.position.set(x, y, z); g.add(m); return m;
  };
  const cyl = (rt, rb, h, mat, x, y, z, seg) => {
    const m = new THREE.Mesh(bmGeo('cyl16', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 12)), mat);
    m.scale.set(rt * 2, h, rb * 2); m.position.set(x, y, z); g.add(m); return m;
  };
  const sph = (r, mat, x, y, z) => {
    const m = new THREE.Mesh(bmGeo('sph', () => new THREE.SphereGeometry(0.5, 14, 10)), mat);
    m.scale.setScalar(r * 2); m.position.set(x, y, z); g.add(m); return m;
  };
  const wood = bmObjMat('#8a5a33'), leaf = bmObjMat('#2fae4e'), dark = bmObjMat('#2b2f3a');
  switch (id) {
    case 'tree':
      cyl(0.12, 0.16, 0.7, wood, 0, 0.35, 0);
      sph(0.45, leaf, 0, 0.95, 0); sph(0.3, bmObjMat('#3cc465'), 0.15, 1.3, 0.1);
      break;
    case 'flower':
      cyl(0.03, 0.03, 0.5, leaf, 0, 0.25, 0);
      sph(0.13, bmObjMat('#ff7edb'), 0, 0.55, 0); sph(0.06, bmObjMat('#ffe95e'), 0, 0.63, 0);
      break;
    case 'lamp':
      cyl(0.05, 0.07, 0.9, dark, 0, 0.45, 0);
      sph(0.16, bmObjGlow('#fff3c4', 0xffc94d), 0, 1.0, 0);
      break;
    case 'chair':
      box(0.55, 0.08, 0.55, wood, 0, 0.45, 0);
      box(0.55, 0.62, 0.08, wood, 0, 0.78, -0.24);
      box(0.5, 0.41, 0.5, bmObjMat('#6e4525'), 0, 0.2, 0);
      break;
    case 'table':
      box(0.9, 0.08, 0.9, wood, 0, 0.72, 0);
      [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]].forEach(([lx, lz]) =>
        box(0.08, 0.68, 0.08, bmObjMat('#6e4525'), lx, 0.34, lz));
      break;
    case 'fence':
      box(0.12, 0.9, 0.12, wood, -0.4, 0.45, 0); box(0.12, 0.9, 0.12, wood, 0.4, 0.45, 0);
      box(1, 0.12, 0.08, wood, 0, 0.62, 0);
      break;
    case 'rock': {
      const m = sph(0.45, bmObjMat('#8d8d99'), 0, 0.3, 0);
      m.scale.y = 0.62;
      break;
    }
    case 'post':
      cyl(0.06, 0.08, 1.6, dark, 0, 0.8, 0);
      box(0.28, 0.34, 0.28, bmObjGlow('#ffd9a0', 0xff9d00), 0, 1.72, 0);
      box(0.36, 0.06, 0.36, dark, 0, 1.93, 0);
      break;
    default:
      box(1, 1, 1, wood, 0, 0.5, 0);
  }
  return g;
}
/* crea el objeto 3D a colocar: bloque de forma o grupo-objeto */
BuildMode._makePlaced = function (s, m, o, color) {
  if (o) return bmBuildObject(o);
  const mat = bmMatFor(m, color);
  switch (s) {
    case 'stair': return bmBuildStair(mat);
    case 'arch': return bmBuildArch(mat);
    case 'wedge': return new THREE.Mesh(bmShapeGeo('wedge'), mat);
    case 'slab': return new THREE.Mesh(bmShapeGeo('slab'), mat);
    case 'ramp': { const me = new THREE.Mesh(bmShapeGeo('ramp'), mat); me.rotation.z = -0.42; return me; }
    case 'cyl': return new THREE.Mesh(bmShapeGeo('cyl'), mat);
    case 'sph': return new THREE.Mesh(bmShapeGeo('sph'), mat);
    default: return new THREE.Mesh(bmShapeGeo('cube'), mat);
  }
};
BuildMode._positionPlaced = function (obj, s, x, gy, y, z, r) {
  const d = BM_SHAPE_DEFS[s] || BM_SHAPE_DEFS.cube;
  obj.position.set(x, gy + y + (d.y0 == null ? 0.5 : d.y0), z);
  if (d.spin || s === 'ramp') obj.rotation.y = r * Math.PI / 2;
};

/* ================= modelo de datos ================= */
/* Rectángulo del lote en edición (coordenadas de mundo) o null en sandbox */
BuildMode._lotRect = function () {
  if (!this._lot) return null;
  const L = this._lot.lot;
  return {
    x0: L.x - L.w / 2, x1: L.x + L.w / 2 - 1,
    z0: L.z - L.d / 2, z1: L.z + L.d / 2 - 1,
    gy: L.groundY || 0,
  };
};

BuildMode.placeBlock = function (s, c, x, y, z, r, m, o, quiet) {
  // Sin límite de bloques: el juego optimiza solo para que no se ponga lento
  const lr = this._lotRect();
  if (lr) { // 🪧 modo lote: solo dentro del rectángulo del lote
    x = Math.max(lr.x0, Math.min(lr.x1, Math.round(x)));
    z = Math.max(lr.z0, Math.min(lr.z1, Math.round(z)));
  } else {
    x = Math.max(-30, Math.min(29, Math.round(x)));
    z = Math.max(-30, Math.min(29, Math.round(z)));
  }
  y = Math.max(0, Math.min(BM_MAXY, Math.round(y)));
  r = ((r || 0) % 4 + 4) % 4;
  m = (m && BM_MATMAP[m]) ? m : 'candy';
  o = o || null;
  const gy = lr ? lr.gy : 0;
  const obj = this._makePlaced(s, m, o, c);
  if (o) { obj.position.set(x, gy + y, z); obj.rotation.y = r * Math.PI / 2; }
  else this._positionPlaced(obj, s, x, gy, y, z, r);
  obj.traverse(function (n) { n.castShadow = true; n.receiveShadow = true; });
  if (this._lot && typeof LEVEL !== 'undefined' && LEVEL.group) {
    obj.userData.lotBlock = this._lot.lot.id;
    LEVEL.group.add(obj);
  } else if (this.group) this.group.add(obj);
  this.blocks.push({ s: s, c: c, m: m, o: o, x: x, y: y, z: z, r: r, mesh: obj });
  this._pop(obj);
  this._count();
  if (!quiet) this.toast(o ? '✨ ¡Objeto colocado!' : '🧱 ¡Bloque colocado!');
  return true;
};
BuildMode.removeBlock = function (b) {
  const i = this.blocks.indexOf(b);
  if (i < 0) return false;
  const parent = this._lot ? (typeof LEVEL !== 'undefined' ? LEVEL.group : null) : this.group;
  if (parent && b.mesh) parent.remove(b.mesh);
  // geometría/material compartidos: NO se liberan (se reutilizan)
  this.blocks.splice(i, 1);
  this._count();
  return true;
};
BuildMode.recolorBlock = function (b, color, m) {
  if (!b || b.o) return false; // 🪑 los objetos no se pintan
  b.c = color;
  if (m && BM_MATMAP[m]) b.m = m;
  if (b.mesh) {
    const mat = bmMatFor(b.m || 'candy', b.c);
    if (typeof b.mesh.traverse === 'function') b.mesh.traverse(function (n) { n.material = mat; });
    else b.mesh.material = mat;
  }
  return true;
};
/* ✨ animación pop al colocar (escala rápida, sin crear nada por frame) */
BuildMode._pop = function (obj) {
  try { obj.scale.setScalar(0.45); } catch (e) {}
  this._pops.push({ o: obj, t: 0 });
};
BuildMode._updatePops = function (dt) {
  const ps = this._pops;
  if (!ps.length) return;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i]; p.t += dt;
    const k = Math.min(1, p.t / 0.16);
    const s = 0.45 + 0.55 * (1 - Math.pow(1 - k, 3));
    try { p.o.scale.setScalar(s); } catch (e) {}
    if (k >= 1) { try { p.o.scale.setScalar(1); } catch (e) {} ps.splice(i, 1); }
  }
};
BuildMode.clearBlocks = function () {
  const parent = this._lot ? (typeof LEVEL !== 'undefined' ? LEVEL.group : null) : this.group;
  if (parent) this.blocks.forEach(b => { if (b.mesh) parent.remove(b.mesh); });
  this.blocks = [];
  this._count();
};
BuildMode.topAt = function (x, z) {
  let top = -1;
  for (const b of this.blocks) if (b.x === x && b.z === z && b.y > top) top = b.y;
  return top;
};
BuildMode._count = function () {
  const el = this.ui.count;
  if (el) el.textContent = this.blocks.length + ' 🧱';
};

/* ================= ray picking propio (sin THREE.Raycaster) ================= */
function bmRayFromScreen(px, py) {
  if (typeof renderer === 'undefined' || !renderer.domElement || typeof camera === 'undefined') return null;
  const rect = renderer.domElement.getBoundingClientRect();
  const nx = ((px - rect.left) / rect.width) * 2 - 1;
  const ny = -((py - rect.top) / rect.height) * 2 + 1;
  const v = new THREE.Vector3(nx, ny, 0.5);
  if (typeof v.unproject !== 'function') return null;
  v.unproject(camera);
  const d = v.sub(camera.position).normalize();
  return { o: camera.position.clone(), d };
}
function bmRayBox(o, d, min, max) { // slab test; -1 = sin intersección
  let tmin = 0, tmax = Infinity;
  for (const ax of ['x', 'y', 'z']) {
    const dd = d[ax];
    if (Math.abs(dd) < 1e-9) { if (o[ax] < min[ax] || o[ax] > max[ax]) return -1; continue; }
    let t0 = (min[ax] - o[ax]) / dd, t1 = (max[ax] - o[ax]) / dd;
    if (t0 > t1) { const t = t0; t0 = t1; t1 = t; }
    if (t0 > tmin) tmin = t0;
    if (t1 < tmax) tmax = t1;
    if (tmin > tmax) return -1;
  }
  return tmin;
}
BuildMode.pickBlock = function (ray) {
  let best = null, bt = Infinity;
  for (const b of this.blocks) {
    const t = bmRayBox(ray.o, ray.d,
      { x: b.x - 0.5, y: b.y, z: b.z - 0.5 },
      { x: b.x + 0.5, y: b.y + 1, z: b.z + 0.5 });
    if (t >= 0 && t < bt) { bt = t; best = b; }
  }
  return best;
};
BuildMode.groundCell = function (ray) {
  if (Math.abs(ray.d.y) < 1e-6) return null;
  const lr = this._lotRect();
  const gy = lr ? lr.gy : 0; // 🪧 modo lote: el suelo es el pasto real del mundo
  const t = (gy - ray.o.y) / ray.d.y;
  if (t < 0) return null;
  const gx = Math.round(ray.o.x + ray.d.x * t), gz = Math.round(ray.o.z + ray.d.z * t);
  if (lr) { // solo dentro del rectángulo del lote
    if (gx < lr.x0 || gx > lr.x1 || gz < lr.z0 || gz > lr.z1) return null;
  } else if (gx < -30 || gx > 29 || gz < -30 || gz > 29) return null;
  return { gx, gz };
};

/* 🎯 calcula dónde caería el toque (lo usan tapAt y el ghost preview) */
BuildMode._targetAt = function (px, py) {
  const ray = bmRayFromScreen(px, py);
  if (!ray) return null;
  const b = this.pickBlock(ray);
  if (this.tool === 'erase' || this.tool === 'paint') return b ? { kind: 'block', b: b } : null;
  if (b) { // apilar encima del bloque tocado
    const top = this.topAt(b.x, b.z);
    if (top + 1 > BM_MAXY) return { kind: 'high' };
    return { kind: 'top', x: b.x, y: top + 1, z: b.z };
  }
  const cell = this.groundCell(ray);
  if (!cell) return null;
  const top = this.topAt(cell.gx, cell.gz);
  const y = top >= 0 ? top + 1 : this.layer;
  if (y > BM_MAXY) return { kind: 'high' };
  return { kind: 'ground', x: cell.gx, y: y, z: cell.gz };
};

/* toque: colocar / pintar / borrar */
BuildMode.tapAt = function (px, py) {
  if (typeof Audio2 !== 'undefined' && Audio2.click) Audio2.click();
  const t = this._targetAt(px, py);
  if (!t) return false;
  if (t.kind === 'high') { this.toast('🚧 ¡Muy alto!'); return false; }
  if (this.tool === 'erase') {
    this.removeBlock(t.b); this.toast('🧽 Borrado'); return true;
  }
  if (this.tool === 'paint') {
    if (t.b.o) { this.toast('🖌️ Los objetos no se pintan'); return false; }
    this.recolorBlock(t.b, this.color, this.mat); this.toast('🖌️ ¡Pintado!'); return true;
  }
  if (this.tool === 'object') {
    if (!this.object) { this.toast('🪑 Elige un objeto primero'); return false; }
    return this.placeBlock('cube', this.color, t.x, t.y, t.z, this.shapeRot, this.mat, this.object);
  }
  return this.placeBlock(this.shape, this.color, t.x, t.y, t.z, this.shapeRot, this.mat, null);
};

/* 👻 ghost preview: bloque semitransparente que sigue el dedo + sombra suave */
BuildMode._ensureGhost = function () {
  if (this._ghost) return this._ghost;
  let g = null;
  try {
    g = new THREE.Group();
    const gk = 'ghostmat';
    if (!BuildMode._mat[gk]) {
      BuildMode._mat[gk] = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
    }
    const box = new THREE.Mesh(bmGeo('cube', () => new THREE.BoxGeometry(1, 1, 1)), BuildMode._mat[gk]);
    box.scale.set(1.04, 1.04, 1.04);
    g.add(box);
    let shTex = null;
    try {
      const cv = bmCanvas(64), ctx = cv.getContext('2d');
      const gr = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
      gr.addColorStop(0, 'rgba(0,0,0,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64);
      shTex = new THREE.CanvasTexture(cv);
    } catch (e) { shTex = null; }
    const shMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: shTex ? 0.9 : 0.22, depthWrite: false });
    if (shTex) shMat.map = shTex;
    const sh = new THREE.Mesh(bmGeo('gshadow', () => new THREE.PlaneGeometry(1.5, 1.5)), shMat);
    sh.rotation.x = -Math.PI / 2;
    g.add(sh); g.userData.shadow = sh;
    g.visible = false;
    if (typeof scene !== 'undefined') scene.add(g);
  } catch (e) { g = null; }
  this._ghost = g;
  return g;
};
BuildMode._moveGhost = function (px, py) {
  const g = this._ensureGhost();
  if (!g) return;
  if (this.tool !== 'block' && this.tool !== 'object') { g.visible = false; return; }
  const t = this._targetAt(px, py);
  if (!t || t.kind === 'block' || t.kind === 'high') { g.visible = false; return; }
  const lr = this._lotRect();
  const gy = lr ? lr.gy : 0;
  g.position.set(t.x, gy + t.y + 0.5, t.z);
  if (g.userData.shadow) g.userData.shadow.position.set(0, -(t.y + 0.47), 0);
  g.visible = true;
};
BuildMode._hideGhost = function () { if (this._ghost) this._ghost.visible = false; };

/* ================= guardado (5 espacios en SAVE.builds) ================= */
BuildMode._slots = function () {
  if (!Array.isArray(SAVE.builds)) SAVE.builds = [null, null, null, null, null];
  while (SAVE.builds.length < 5) SAVE.builds.push(null);
  return SAVE.builds;
};
BuildMode.serialize = function () {
  return {
    name: this.curName || 'Mi construcción', ts: Date.now(),
    blocks: this.blocks.map(b => ({ s: b.s, c: b.c, m: b.m || 'candy', o: b.o || null, x: b.x, y: b.y, z: b.z, r: b.r })),
  };
};
BuildMode.saveSlot = function (i) {
  const slots = this._slots();
  slots[i] = this.serialize();
  this.curSlot = i; this.curName = slots[i].name;
  try { persist(); } catch (e) {}
  this.renderCities();
  this.toast('💾 Guardado en "' + slots[i].name + '" — ábrelo en 🏙️ Ciudades');
  return true;
};
BuildMode.loadSlot = function (i) {
  const s = this._slots()[i];
  if (!s) { this.toast('📭 Espacio vacío'); return false; }
  this.clearBlocks();
  (s.blocks || []).forEach(b => this.placeBlock(b.s, b.c, b.x, b.y, b.z, b.r, b.m, b.o, true));
  this.curSlot = i; this.curName = s.name;
  this.toast('📥 "' + s.name + '" cargada (' + this.blocks.length + ' 🧱)');
  return true;
};
BuildMode.deleteSlot = function (i) {
  const slots = this._slots();
  if (!slots[i]) return false;
  slots[i] = null;
  try { persist(); } catch (e) {}
  this.renderCities();
  this.toast('🗑️ Espacio ' + (i + 1) + ' borrado');
  return true;
};
BuildMode.enviarConcurso = function () {
  const name = String(this.curName || 'Mi construcción').slice(0, 40) || 'Mi construcción';
  if (typeof Community !== 'undefined' && typeof Community.registrarConstruccion === 'function') {
    Community.registrarConstruccion(name);
    this.toast('🏆 ¡Enviada al concurso!');
    return true;
  }
  this.toast('⚠️ Concursos no disponibles aún');
  return false;
};

/* ================= UI ================= */
BuildMode.toast = function (msg) {
  const t = this.ui && this.ui.toast;
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(this._toastTO);
  this._toastTO = setTimeout(() => { t.style.display = 'none'; }, 2200);
};
function bmBtn(label, title) {
  const b = document.createElement('button');
  b.className = 'btn bm-btn';
  b.textContent = label;
  if (title) b.title = title;
  b.style.cssText = 'min-height:56px;min-width:56px;font-size:17px;margin:3px;padding:8px 12px;touch-action:manipulation;';
  return b;
}
BuildMode._sel = function (group, id) { // marcar seleccionado en un grupo de botones
  const g = this.ui[group];
  if (!g) return;
  Array.prototype.forEach.call(g.children, el => {
    el.classList.toggle('bm-sel', el.dataset.bid === id);
  });
};

BuildMode.init = function () {
  if (this._inited) return true;
  this._inited = true;
  this._slots();
  const css = document.createElement('style');
  css.textContent = [    '#screen-build{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;background:rgba(10,14,30,.0);pointer-events:none;}',
    '#screen-build.hidden{display:none;}',
    '#bm-top{pointer-events:auto;display:flex;align-items:center;gap:4px;padding:8px;background:rgba(12,16,34,.92);border-bottom:2px solid #ff9d00;}',
    '#bm-title{color:#fff;font-weight:900;font-size:17px;margin-right:auto;text-shadow:0 2px 0 #000;}',
    '#bm-count{color:#ffe95e;font-weight:800;font-size:14px;margin-right:4px;}',
    '#bm-panel{pointer-events:auto;margin-top:auto;max-height:44%;overflow-y:auto;background:rgba(12,16,34,.94);border-top:2px solid #ff9d00;padding:6px 8px 12px;}',
    '.bm-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;margin:2px 0;}',
    '.bm-lab{color:#ffd9e8;font-size:13px;font-weight:800;width:100%;text-align:center;margin:4px 0 0;}',
    '.bm-btn.bm-sel{outline:3px solid #ffe95e;background:#5a3a10 !important;}',
    '.bm-swatch{width:56px;height:56px;border-radius:12px;border:3px solid rgba(255,255,255,.55);margin:3px;touch-action:manipulation;}',
    '.bm-swatch.bm-sel{border-color:#ffe95e;outline:3px solid #ffe95e;}',
    '#bm-cities{pointer-events:auto;position:fixed;inset:8% 6%;z-index:70;background:#141a30;border:3px solid #ff9d00;border-radius:16px;padding:14px;overflow-y:auto;color:#fff;}',
    '#bm-cities.hidden{display:none;}',
    '.bm-slot{display:flex;align-items:center;gap:6px;background:#1e2642;border-radius:12px;padding:8px;margin:8px 0;}',
    '.bm-slot .nm{flex:1;font-weight:800;font-size:15px;}',
    '.bm-slot .inf{color:#9fb3d8;font-size:12px;}',
    '#bm-toast{pointer-events:none;position:fixed;left:50%;bottom:46%;transform:translateX(-50%);z-index:80;background:#10162c;color:#ffe95e;font-weight:900;font-size:17px;padding:12px 20px;border-radius:14px;border:2px solid #ffe95e;display:none;text-align:center;max-width:86%;}',
    '#bm-name{width:100%;font-size:17px;padding:10px;border-radius:10px;border:2px solid #ff9d00;margin:6px 0;background:#0d1226;color:#fff;}',
    '#bm-tut{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;background:rgba(5,8,20,.55);pointer-events:auto;}',
    '#bm-tut.hidden{display:none;}',
    '.bm-tut-card{background:#141a30;border:3px solid #ff9d00;border-radius:18px;padding:22px;max-width:86%;color:#fff;text-align:center;}',
    '.bm-tut-card h2{margin:0 0 8px;font-size:22px;}',
    '.bm-tut-step{font-size:16px;margin:10px 0;color:#ffe9c9;}',
    '#bm-tut-ok{margin-top:10px;font-size:18px;}',
    '.bm-objrow.hidden{display:none;}',
  ].join('\n');
  const headEl = document.head || (document.getElementsByTagName && document.getElementsByTagName('head')[0]) || document.body;
  if (headEl) headEl.appendChild(css);

  const ov = document.createElement('div');
  ov.id = 'screen-build'; ov.className = 'hidden';
  ov.innerHTML =
    '<div id="bm-top"><span id="bm-title">🧱 MODO CONSTRUIR</span>' +
    '<span id="bm-count">0 🧱</span></div>' +
    '<div id="bm-panel"></div>';
  document.body.appendChild(ov);
  this.ui.overlay = ov;
  this.ui.count = ov.querySelector('#bm-count');
  this.ui.title = ov.querySelector('#bm-title');
  const top = ov.querySelector('#bm-top');
  const panel = ov.querySelector('#bm-panel');

  // barra superior: Guardar · Mis ciudades · Concurso · Salir
  const bSave = bmBtn('💾', 'Guardar construcción');
  bSave.addEventListener('click', () => { if (this._lot) this.saveLot(false); else this.saveSlot(this.curSlot); });
  const bCities = bmBtn('🏙️ Ciudades', 'Mis ciudades: guardar / cargar / borrar');
  bCities.addEventListener('click', () => { this.renderCities(); this.ui.cities.classList.remove('hidden'); });
  const bContest = bmBtn('🏆', 'Enviar a concurso');
  bContest.addEventListener('click', () => this.enviarConcurso());
  const bCopy = bmBtn('📋', 'Poner mi ciudad en mi lote');
  bCopy.addEventListener('click', () => this.copyBestToLot());
  const bExit = bmBtn('❌', 'Salir al menú');
  bExit.addEventListener('click', () => this.close());
  [bSave, bCities, bCopy, bContest, bExit].forEach(b => top.appendChild(b));
  this.ui.bSave = bSave; this.ui.bCities = bCities; this.ui.bCopy = bCopy; this.ui.bContest = bContest; this.ui.bExit = bExit;

  // filas de la paleta
  const mkRow = (lab) => {
    const r = document.createElement('div'); r.className = 'bm-row';
    const l = document.createElement('div'); l.className = 'bm-lab'; l.textContent = lab;
    panel.appendChild(l); panel.appendChild(r); r._lab = l; return r;
  };
  const rowTool = mkRow('Herramienta'), rowShape = mkRow('Forma'),
        rowMat = mkRow('Material'), rowObj = mkRow('🪑 Objetos'),
        rowCol = mkRow('Color'), rowCam = mkRow('Altura · Girar · Cámara');
  this.ui.rowTool = rowTool; this.ui.rowShape = rowShape;
  this.ui.rowMat = rowMat; this.ui.rowObj = rowObj;
  const syncObjRow = () => { // la fila de objetos solo se ve con la herramienta 🪑
    const show = this.tool === 'object';
    rowObj.classList.toggle('hidden', !show);
    if (rowObj._lab) rowObj._lab.style.display = show ? '' : 'none';
  };
  this._syncObjRow = syncObjRow;
  BM_TOOLS.forEach(t => {
    const b = bmBtn(t.e + ' ' + t.n); b.dataset.bid = t.id;
    b.addEventListener('click', () => { this.tool = t.id; this._sel('rowTool', t.id); this._syncObjRow(); this._hideGhost(); });
    rowTool.appendChild(b);
  });
  BM_SHAPES.forEach(s => {
    const b = bmBtn(s.e + ' ' + s.n); b.dataset.bid = s.id;
    b.addEventListener('click', () => { this.shape = s.id; this._sel('rowShape', s.id); this._hideGhost(); });
    rowShape.appendChild(b);
  });
  BM_MATS.forEach(mt => {
    const b = bmBtn(mt.e + ' ' + mt.n); b.dataset.bid = mt.id; b.title = mt.n;
    b.addEventListener('click', () => { this.mat = mt.id; this._sel('rowMat', mt.id); });
    rowMat.appendChild(b);
  });
  BM_OBJECTS.forEach(ob => {
    const b = bmBtn(ob.e + ' ' + ob.n); b.dataset.bid = ob.id; b.title = ob.n;
    b.addEventListener('click', () => { this.object = ob.id; this._sel('rowObj', ob.id); this._hideGhost(); });
    rowObj.appendChild(b);
  });
  BM_COLORS.forEach(([c, n]) => {
    const s = document.createElement('button');
    s.className = 'bm-swatch'; s.dataset.bid = c; s.title = n;
    s.style.background = c;
    s.addEventListener('click', () => { this.color = c; this._selSw(c); });
    rowCol.appendChild(s);
  });
  this.ui.rowSw = rowCol;
  // altura / girar / cámara
  const bDown = bmBtn('⬇️', 'Bajar capa'), bUp = bmBtn('⬆️', 'Subir capa');
  const labH = document.createElement('span');
  labH.style.cssText = 'color:#fff;font-weight:900;font-size:16px;margin:0 6px;';
  const paintH = () => { labH.textContent = 'Capa ' + this.layer; };
  bDown.addEventListener('click', () => { this.layer = Math.max(0, this.layer - 1); paintH(); });
  bUp.addEventListener('click', () => { this.layer = Math.min(BM_MAXY, this.layer + 1); paintH(); });
  paintH(); this._paintH = paintH;
  const bRot = bmBtn('↻', 'Girar forma');
  bRot.addEventListener('click', () => { this.shapeRot = (this.shapeRot + 1) % 4; this.toast('↻ Giro ' + (this.shapeRot * 90) + '°'); });
  const bCL = bmBtn('◀', 'Girar cámara'), bCR = bmBtn('▶', 'Girar cámara');
  bCL.addEventListener('click', () => { this.cam.az -= 0.4; });
  bCR.addEventListener('click', () => { this.cam.az += 0.4; });
  const bZi = bmBtn('🔍+', 'Acercar'), bZo = bmBtn('🔍−', 'Alejar');
  bZi.addEventListener('click', () => { this.cam.dist = Math.max(18, this.cam.dist - 7); });
  bZo.addEventListener('click', () => { this.cam.dist = Math.min(110, this.cam.dist + 7); });
  [bDown, labH, bUp, bRot, bCL, bCR, bZo, bZi].forEach(el => rowCam.appendChild(el));

  // panel Mis ciudades
  const cities = document.createElement('div');
  cities.id = 'bm-cities'; cities.className = 'hidden';
  cities.innerHTML = '<h2 style="margin:0 0 4px;">🏙️ Mis ciudades</h2>' +
    '<p style="margin:0 6px 8px;font-size:13px;opacity:.85;">🧱 Tus construcciones viven en este taller. Para construir dentro del mundo y verlo al jugar, compra un lote 🪧.</p>' +
    '<input id="bm-name" maxlength="40" placeholder="Nombre de tu construcción…">' +
    '<div id="bm-slots"></div>';
  const bClose = bmBtn('❌ Cerrar');
  bClose.addEventListener('click', () => cities.classList.add('hidden'));
  cities.appendChild(bClose);
  document.body.appendChild(cities);
  this.ui.cities = cities;
  this.ui.slots = cities.querySelector('#bm-slots');
  const nameInput = cities.querySelector('#bm-name');
  nameInput.value = this.curName;
  nameInput.addEventListener('input', () => { this.curName = nameInput.value; });

  // toast
  const toast = document.createElement('div');
  toast.id = 'bm-toast';
  document.body.appendChild(toast);
  this.ui.toast = toast;

  // 🎓 mini-tutorial de 3 pasos (solo la primera vez)
  const tut = document.createElement('div');
  tut.id = 'bm-tut'; tut.className = 'hidden';
  tut.innerHTML = '<div class="bm-tut-card"><h2>🧱 ¡Vamos a construir!</h2>' +
    '<div class="bm-tut-step">👆 <b>Toca el suelo</b> para poner un bloque</div>' +
    '<div class="bm-tut-step">🖌️ <b>Pincel</b> para pintar tus bloques</div>' +
    '<div class="bm-tut-step">🧽 <b>Goma</b> para borrar lo que no te guste</div>' +
    '<button id="bm-tut-ok" class="btn bm-btn">¡Entendido! 🎉</button></div>';
  document.body.appendChild(tut);
  const tutOk = tut.querySelector('#bm-tut-ok');
  if (tutOk) tutOk.addEventListener('click', () => {
    tut.classList.add('hidden');
    try { if (typeof SAVE !== 'undefined') { SAVE.bmTut = true; if (typeof persist === 'function') persist(); } } catch (e) {}
  });
  this.ui.tut = tut;

  this._sel('rowTool', 'block'); this._sel('rowShape', 'cube'); this._selSw(BM_COLORS[0][0]);
  this._sel('rowMat', 'candy'); this._sel('rowObj', 'tree'); this._syncObjRow();

  // botón en el menú principal (inyectado dinámicamente)
  const menuBtns = document.querySelector('#screen-menu .menu-buttons');
  if (menuBtns && !$('btn-build')) {
    const b = document.createElement('button');
    b.id = 'btn-build'; b.className = 'btn btn-big';
    b.textContent = '🧱 CONSTRUIR';
    b.addEventListener('click', () => this.open());
    menuBtns.appendChild(b);
  }
  return true;
};
/* 🎓 tutorial: mostrar / mostrar solo la primera vez */
BuildMode.showTutorial = function () {
  if (this.ui.tut) this.ui.tut.classList.remove('hidden');
};
BuildMode.maybeTutorial = function () {
  try {
    if (this.ui.tut && (typeof SAVE === 'undefined' || !SAVE.bmTut)) this.showTutorial();
  } catch (e) {}
};
BuildMode._selSw = function (c) {
  Array.prototype.forEach.call(this.ui.rowSw.children, el => {
    el.classList.toggle('bm-sel', el.dataset.bid === c);
  });
};
BuildMode.renderCities = function () {
  if (!this.ui.slots) return;
  const slots = this._slots();
  this.ui.slots.innerHTML = '';
  slots.forEach((s, i) => {
    const row = document.createElement('div'); row.className = 'bm-slot';
    const nm = document.createElement('span'); nm.className = 'nm';
    nm.textContent = (i + 1) + '. ' + (s ? s.name : '— Vacío —');
    const inf = document.createElement('span'); inf.className = 'inf';
    inf.textContent = s ? (s.blocks.length + ' 🧱 · ' + new Date(s.ts).toLocaleDateString()) : '';
    const bS = bmBtn('💾'); bS.title = 'Guardar aquí';
    bS.addEventListener('click', () => this.saveSlot(i));
    const bL = bmBtn('📥'); bL.title = 'Cargar';
    bL.addEventListener('click', () => this.loadSlot(i));
    const bD = bmBtn('🗑️'); bD.title = 'Borrar';
    bD.addEventListener('click', () => this.deleteSlot(i));
    [nm, inf, bS, bL, bD].forEach(el => row.appendChild(el));
    this.ui.slots.appendChild(row);
  });
};

/* ================= abrir / cerrar ================= */
/* ☀️ luz de día clara para construir (se retira al salir) */
BuildMode._daylightOn = function () {
  try {
    if (typeof scene === 'undefined') return;
    this._prevBg = scene.background;
    scene.background = new THREE.Color(0x8ecfee);
    const rig = new THREE.Group();
    rig.add(new THREE.HemisphereLight(0xd6ecff, 0x8a9a6a, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(28, 46, 16);
    rig.add(sun);
    scene.add(rig);
    this._rig = rig;
  } catch (e) {}
};
BuildMode._daylightOff = function () {
  try {
    if (typeof scene === 'undefined') return;
    if (this._rig) { scene.remove(this._rig); this._rig = null; }
    if (this._prevBg !== undefined) { scene.background = this._prevBg; this._prevBg = undefined; }
    if (this._ghost) { try { scene.remove(this._ghost); } catch (e2) {} this._ghost = null; }
    this._pops.length = 0;
  } catch (e) {}
};
BuildMode.open = function () {
  if (this.active) return;
  if (!this._inited) this.init();
  try { if (typeof Audio2 !== 'undefined' && Audio2.init) Audio2.init(); } catch (e) {}
  try { if (typeof Audio2 !== 'undefined' && Audio2.click) Audio2.click(); } catch (e) {}
  this.active = true;
  this._lot = null; // sandbox separado: no es modo lote
  this._prevMode = (typeof MODE !== 'undefined') ? MODE : 'menu';
  if (this.ui.title) this.ui.title.textContent = '🧱 MODO CONSTRUIR';
  if (this.ui.bCities) this.ui.bCities.style.display = '';
  if (this.ui.bCopy) this.ui.bCopy.style.display = 'none';
  if (this.ui.bContest) this.ui.bContest.style.display = '';
  if (this.ui.bExit) this.ui.bExit.title = 'Salir al menú';
  if (typeof LEVEL !== 'undefined' && LEVEL.group) {
    this._prevGroupVis = LEVEL.group.visible;
    LEVEL.group.visible = false;
  }
  if (typeof Avatar !== 'undefined' && Avatar.group) {
    this._prevAvatarVis = Avatar.group.visible;
    Avatar.group.visible = false;
  }
  if (typeof showMain === 'function') showMain(null);
  ['hud', 'side-menu', 'touch'].forEach(id => {
    const e = (typeof $ !== 'undefined') ? $(id) : document.getElementById(id);
    if (e) e.classList.add('hidden');
  });
  // parcela 60×60 separada del mundo
  const g = new THREE.Group();
  const gtex = (typeof bmGroundTex === 'function') ? bmGroundTex() : null;
  const gmat = new THREE.MeshStandardMaterial({ color: 0x8fd694, roughness: 0.95 });
  if (gtex) gmat.map = gtex;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(BM_PLOT, BM_PLOT), gmat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  g.add(ground);
  const grid = new THREE.GridHelper(BM_PLOT, BM_PLOT, 0xffffff, 0x5da85f);
  grid.position.y = 0.02; grid.material.transparent = true; grid.material.opacity = 0.6;
  g.add(grid);
  // borde de caramelo
  const edgeM = bmMat('#ff9d00');
  [[0, -30.4, BM_PLOT + 1.6, 0.8], [0, 30.4, BM_PLOT + 1.6, 0.8],
   [-30.4, 0, 0.8, BM_PLOT + 1.6], [30.4, 0, 0.8, BM_PLOT + 1.6]].forEach(([ex, ez, w, d]) => {
    const e = new THREE.Mesh(bmGeo('cube', () => new THREE.BoxGeometry(1, 1, 1)), edgeM);
    e.scale.set(w, 0.8, d); e.position.set(ex, 0.4, ez);
    g.add(e);
  });
  this.group = g;
  if (typeof scene !== 'undefined') scene.add(g);
  this._daylightOn(); // ☀️ se ve claro, no oscuro
  this.blocks = [];
  this._count();
  this.cam.az = 0.7; this.cam.el = 0.85; this.cam.dist = 54;
  this.ui.overlay.classList.remove('hidden');
  this.ui.overlay.style.display = 'flex';
  this._bindPointer();
  if (typeof MODE !== 'undefined') MODE = 'build'; // sugerencia de MODE 'build'
  this.maybeTutorial();
  this.toast('🧱 ¡Toca el suelo para construir!');
};
BuildMode.close = function () {
  if (!this.active) return;
  if (this._lot) { this._closeLot(); return; } // 🪧 modo lote: volver al juego junto al lote
  this.active = false;
  this._unbindPointer();
  if (typeof scene !== 'undefined' && this.group) scene.remove(this.group);
  this.group = null; this.blocks = [];
  this._daylightOff();
  if (typeof LEVEL !== 'undefined' && LEVEL.group) LEVEL.group.visible = this._prevGroupVis;
  if (typeof Avatar !== 'undefined' && Avatar.group) Avatar.group.visible = this._prevAvatarVis;
  this.ui.overlay.classList.add('hidden');
  this.ui.overlay.style.display = 'none';
  if (this.ui.cities) this.ui.cities.classList.add('hidden');
  if (typeof showMain === 'function') showMain('screen-menu');
  if (typeof MODE !== 'undefined') MODE = 'menu';
};

/* ============ 🪧 MODO LOTE (fase 2): construir en tu lote DENTRO del mundo vivo ============
   - NO oculta LEVEL.group: el jugador edita su lote en la ciudad real.
   - Los bloques se colocan en coordenadas de mundo, restringidos al rectángulo del lote.
   - Se guardan en SAVE.lots (NO en SAVE.builds) y obtienen colisión al salir.
   - Al salir: MODE='play' de vuelta, junto al lote, sin pasar por el menú. */
BuildMode.openOnLot = function (worldIdx, lot) {
  try {
    if (this.active) return false;
    if (!lot || typeof LEVEL === 'undefined' || !LEVEL.group) return false;
    if (!this._inited) this.init();
    try { if (typeof Audio2 !== 'undefined' && Audio2.init) Audio2.init(); } catch (e) {}
    try { if (typeof Audio2 !== 'undefined' && Audio2.click) Audio2.click(); } catch (e) {}
    // quitar restos visuales viejos de este lote (lo guardado en SAVE manda)
    try {
      const rm = [];
      LEVEL.group.traverse(o => { if (o && o.userData && o.userData.lotBlock === lot.id) rm.push(o); });
      rm.forEach(o => { if (o.parent) o.parent.remove(o); });
    } catch (e) {}
    this.active = true;
    this._lot = { worldIdx: worldIdx, lot: lot };
    this._prevMode = (typeof MODE !== 'undefined') ? MODE : 'play';
    if (typeof showMain === 'function') showMain(null);
    ['hud', 'side-menu', 'touch'].forEach(id => {
      const e = (typeof $ !== 'undefined') ? $(id) : document.getElementById(id);
      if (e) e.classList.add('hidden');
    });
    if (this.ui.title) this.ui.title.textContent = '🧱 MI LOTE — ' + (lot.name || '');
    if (this.ui.bCities) this.ui.bCities.style.display = 'none';
    if (this.ui.bCopy) this.ui.bCopy.style.display = '';
    if (this.ui.bContest) this.ui.bContest.style.display = 'none';
    if (this.ui.bExit) this.ui.bExit.title = 'Volver al juego';
    this.group = null; this.blocks = [];
    // cargar construcción guardada del lote
    let saved = [];
    try {
      if (typeof LotSystem !== 'undefined' && typeof LotSystem.getBlocks === 'function')
        saved = LotSystem.getBlocks(worldIdx, lot.id) || [];
    } catch (e) {}
    saved.forEach(b => this.placeBlock(b.s, b.c, b.x, b.y, b.z, b.r, b.m, b.o, true));
    this._count();
    this._daylightOn(); // ☀️ luz de día también en el lote
    // cámara orbital centrada en el lote
    this.cam.az = 0.7; this.cam.el = 0.85;
    this.cam.dist = Math.max(24, Math.min(90, Math.max(lot.w, lot.d) * 2.2));
    this.ui.overlay.classList.remove('hidden');
    this.ui.overlay.style.display = 'flex';
    this._bindPointer();
    if (typeof MODE !== 'undefined') MODE = 'build';
    this.maybeTutorial();
    this.toast('🧱 Construye dentro de tu lote 🪧');
    return true;
  } catch (e) { return false; }
};

/* 📋 copiar la construcción del taller al lote: fácil, un toque, sin preguntas.
   Toma el guardado más reciente con bloques, lo centra en el lote y coloca
   solo lo que quepa dentro del rectángulo. */
BuildMode._stampPlan = function (blocks, rect) {
  if (!blocks || !blocks.length || !rect) return [];
  let ax0 = Infinity, ax1 = -Infinity, az0 = Infinity, az1 = -Infinity;
  blocks.forEach(function (b) {
    const x = Math.round(b.x), z = Math.round(b.z);
    if (x < ax0) ax0 = x; if (x > ax1) ax1 = x;
    if (z < az0) az0 = z; if (z > az1) az1 = z;
  });
  const dx = ((rect.x0 + rect.x1) / 2) - ((ax0 + ax1) / 2);
  const dz = ((rect.z0 + rect.z1) / 2) - ((az0 + az1) / 2);
  const out = [];
  blocks.forEach(function (b) {
    const x = Math.round(b.x + dx), z = Math.round(b.z + dz);
    if (x >= rect.x0 && x <= rect.x1 && z >= rect.z0 && z <= rect.z1) out.push({ b: b, x: x, z: z });
  });
  return out;
};
BuildMode.copyBestToLot = function () {
  if (!this._lot) return false;
  const slots = this._slots().filter(function (s) { return s && s.blocks && s.blocks.length; });
  if (!slots.length) { this.toast('📭 Aún no guardas nada: construye en el taller 🧱 y dale 💾'); return false; }
  slots.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
  const best = slots[0];
  const plan = this._stampPlan(best.blocks, this._lotRect());
  if (!plan.length) { this.toast('⚠️ No cupo en este lote 🪧'); return false; }
  let n = 0;
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i], b = p.b;
    if (this.placeBlock(b.s, b.c, p.x, b.y, p.z, b.r, b.m, b.o, true)) n++;
  }
  try { this.saveLot(true); } catch (e) {}
  this.toast('📋 ¡Listo! "' + best.name + '" ya está en tu lote 🏠 (' + n + ' 🧱)');
  return true;
};

/* guarda los bloques del lote en SAVE.lots (no toca SAVE.builds) */
BuildMode.saveLot = function (silent) {
  if (!this._lot) return false;
  try {
    if (typeof LotSystem !== 'undefined' && typeof LotSystem._saveBlocks === 'function') {
      LotSystem._saveBlocks(this._lot.worldIdx, this._lot.lot.id,
        this.blocks.map(b => ({ s: b.s, c: b.c, m: b.m || 'candy', o: b.o || null, x: b.x, y: b.y, z: b.z, r: b.r })));
      if (!silent) this.toast('💾 ¡Lote guardado! 🏠');
      return true;
    }
  } catch (e) {}
  return false;
};

BuildMode._closeLot = function () {
  try { this.saveLot(true); } catch (e) {} // auto-guardado al salir
  this.active = false;
  this._unbindPointer();
  const lotInfo = this._lot;
  this._daylightOff();
  // los bloques QUEDAN en LEVEL.group: el jugador los ve y los pisa al salir
  this.group = null; this.blocks = [];
  this._lot = null;
  this.ui.overlay.classList.add('hidden');
  this.ui.overlay.style.display = 'none';
  if (this.ui.cities) this.ui.cities.classList.add('hidden');
  if (this.ui.title) this.ui.title.textContent = '🧱 MODO CONSTRUIR';
  if (this.ui.bCities) this.ui.bCities.style.display = '';
  if (this.ui.bCopy) this.ui.bCopy.style.display = 'none';
  if (this.ui.bContest) this.ui.bContest.style.display = '';
  if (this.ui.bExit) this.ui.bExit.title = 'Salir al menú';
  ['hud', 'side-menu', 'touch'].forEach(id => {
    const e = (typeof $ !== 'undefined') ? $(id) : document.getElementById(id);
    if (e) e.classList.remove('hidden');
  });
  // colisión fresca de lo construido
  try {
    if (lotInfo && typeof LotSystem !== 'undefined' && typeof LotSystem.syncLotColliders === 'function')
      LotSystem.syncLotColliders(lotInfo.worldIdx, lotInfo.lot.id);
  } catch (e) {}
  if (typeof MODE !== 'undefined') MODE = (this._prevMode === 'build') ? 'play' : (this._prevMode || 'play');
  this.toast('🏠 ¡Lote guardado!');
};

/* ============ sin límites: oculta bloques lejanos para no ponerse lento ============ */
BuildMode._cullT = 0;
BuildMode.cullFar = function () {
  // Solo cada 0.5s para no gastar; oculta bloques a más de 120m del jugador
  var now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  if (now - this._cullT < 500) return;
  this._cullT = now;
  try {
    if (!this.blocks || !this.blocks.length) return;
    var px = 0, pz = 0;
    if (typeof player !== 'undefined' && player && player.position) { px = player.position.x; pz = player.position.z; }
    else if (typeof camera !== 'undefined' && camera && camera.position) { px = camera.position.x; pz = camera.position.z; }
    var R2 = 120 * 120;
    for (var i = 0; i < this.blocks.length; i++) {
      var b = this.blocks[i];
      if (!b.mesh) continue;
      var dx = b.x - px, dz = b.z - pz;
      var far = (dx * dx + dz * dz) > R2;
      if (b.mesh.visible === !far) continue;
      b.mesh.visible = !far;
    }
  } catch (e) {}
};

/* ================= cámara orbital táctil ================= */
BuildMode.update = function (dt) {
  if (!this.active || typeof camera === 'undefined') return;
  this._updatePops(dt); // ✨ animación pop de bloques recién puestos
  const c = this.cam;
  c.el = Math.max(0.25, Math.min(1.35, c.el));
  const ce = Math.cos(c.el), se = Math.sin(c.el);
  const tx = this._lot ? this._lot.lot.x : 0, tz = this._lot ? this._lot.lot.z : 0; // 🪧 la cámara orbita el lote
  camera.position.set(
    tx + Math.sin(c.az) * ce * c.dist,
    se * c.dist,
    tz + Math.cos(c.az) * ce * c.dist
  );
  camera.lookAt(tx, 1, tz);
};
BuildMode._onDown = function (e) {
  const t = e.touches && e.touches[0];
  const px = t ? t.clientX : e.clientX, py = t ? t.clientY : e.clientY;
  this._ptr = { x: px, y: py, t: Date.now(), drag: false };
};
BuildMode._onMove = function (e) {
  if (!this._ptr) return;
  const t = e.touches && e.touches[0];
  const px = t ? t.clientX : e.clientX, py = t ? t.clientY : e.clientY;
  const dx = px - this._ptr.x, dy = py - this._ptr.y;
  if (!this._ptr.drag && Math.hypot(dx, dy) > 14) {
    this._ptr.drag = true;
    this._hideGhost(); // arrastrar = orbitar: se esconde el ghost
  }
  if (this._ptr.drag) { // arrastrar = orbitar cámara
    this.cam.az -= dx * 0.008;
    this.cam.el = Math.max(0.25, Math.min(1.35, this.cam.el + dy * 0.006));
    this._ptr.x = px; this._ptr.y = py;
    if (e.cancelable !== false) e.preventDefault();
  } else {
    this._moveGhost(px, py); // 👻 el ghost sigue el dedo / mouse
  }
};
BuildMode._onUp = function (e) {
  if (!this._ptr) return;
  const quick = Date.now() - this._ptr.t < 600;
  if (!this._ptr.drag && quick) this.tapAt(this._ptr.x, this._ptr.y);
  this._ptr = null;
  this._hideGhost();
};
BuildMode._bindPointer = function () {
  if (typeof renderer === 'undefined' || !renderer.domElement) return;
  const el = renderer.domElement;
  this._bd = (e) => this._onDown(e);
  this._bm = (e) => this._onMove(e);
  this._bu = (e) => this._onUp(e);
  el.addEventListener('pointerdown', this._bd);
  el.addEventListener('pointermove', this._bm);
  el.addEventListener('pointerup', this._bu);
  el.addEventListener('pointercancel', this._bu);
};
BuildMode._unbindPointer = function () {
  if (typeof renderer === 'undefined' || !renderer.domElement) return;
  const el = renderer.domElement;
  if (this._bd) el.removeEventListener('pointerdown', this._bd);
  if (this._bm) el.removeEventListener('pointermove', this._bm);
  if (this._bu) el.removeEventListener('pointerup', this._bu);
  if (this._bu) el.removeEventListener('pointercancel', this._bu);
  this._bd = this._bm = this._bu = null;
};
