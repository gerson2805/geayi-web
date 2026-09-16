/* ============================================================
   🪑 TIENDA DE MUEBLES GEAYI (Obby Xtreme 3D)
   ------------------------------------------------------------
   - Catálogo de 10 muebles 100% ORIGINALES GEAYI, construidos con
     cajas/cilindros/esferas compartidas (rendimiento Android: pocas
     geometrías y materiales, cero luces reales, sin texturas pesadas).
   - La TIENDA se abre con un botón de proximidad "🪑 Mueblería" que
     aparece cuando el jugador está DENTRO DE SU PROPIO LOTE (en
     Ciudad Neón o Immokalee). DECISIÓN DOCUMENTADA: no hay local
     físico aparte — los distritos comerciales de Immokalee ya están
     densamente ocupados (tiendas cada pocos metros en Main St y casas
     en la cuadrícula de expansión) y un edificio nuevo corría riesgo de
     traslaparse con contenido existente. El botón sale justo donde se
     puede colocar (el lote propio), que es el flujo más coherente.
   - Compra con monedas reales: Shop2.spendCoins(n); sin fondos avisa
     "🪙 Te faltan monedas".
   - Colocación: SOLO en lotes propios del jugador. El mueble se coloca
     frente al jugador (2.4u), con la orientación del jugador redondeada
     a 90°; se valida que quede dentro del rectángulo del lote (con
     margen del tamaño del mueble). Tope: 40 muebles por lote.
   - Persistencia: SAVE.lots[worldIdx][lotId].furniture = [{type,x,z,ry}]
     + persist(). En buildForLevel(i, group) se reconstruyen.
   - Los muebles con volumen (cama, sofá, mesa, silla, estantería, TV,
     refrigerador) registran colisionador en LEVEL.platforms con
     furnTag (no se atraviesan). La alfombra, la lámpara y la planta
     pequeña NO colisionan.
   - Quitar: botón "❌ Quitar" al acercarse a un mueble propio (< 2.8u).
     DECISIÓN DOCUMENTADA: Quitar ELIMINA el mueble permanentemente
     (sin reembolso) — es simple, predecible y evita un inventario
     intermedio que complicaría el flujo en celular.
   - Sentarse/acostarse: la silla y el sofá son sentables (useH = altura
     del asiento), la cama es acostable (useH = altura del colchón).
     Furniture.nearSeat()/nearBed() detectan a < 2.2u; el coordinador
     muestra 🪑 Sentarse / 🛏️ Acostarse y llama Player.sit(ref) /
     Player.lieDown(ref) con ref = Furniture.poseRefFor(found). El
     joystick o el salto levantan al jugador (Player.standUp()).
   - Mover: ✋ Mover sobre un mueble propio (< 2.8u) lo vuelve fantasma
     semi-transparente que sigue al jugador (solo a posiciones válidas
     del lote, validadas con _spotOk); ✅ Colocar fija la nueva posición
     (guarda en SAVE + persist + re-spawnea + sincroniza colisionadores).
     Cancelar o reconstruir el nivel lo devuelve a su sitio original.
   Integración (la hace el coordinador; este archivo NO toca DOM al cargar):
   1. <script src="furniture.js"></script> en index.html, DESPUÉS de
      <script src="lots.js"></script> y ANTES de <script src="game.js"></script>.
   2. En startLevel(), junto a los demás buildForLevel (game.js ~línea 410):
        if (typeof Furniture !== 'undefined') Furniture.buildForLevel(i, LEVEL.group); // 🪑 muebles
   3. En el loop de game.js, junto a LotSystem.update (game.js ~línea 600):
        if (typeof Furniture !== 'undefined') Furniture.update(dt); // 🪑 tienda de muebles
   Todo 100% original GEAYI. Sin saltos. Mundo abierto.
   ============================================================ */
'use strict';

/* ---------------- catálogo ---------------- */
const FURN_MAX = 40; // tope de muebles por lote
const FURNITURE_CATALOG = [
  { id: 'bed',    emoji: '🛏️', name: 'Cama Geayi',         price: 150, solid: true,  w: 2.2, d: 3.4, h: 1.2, useH: 0.75, desc: 'Cama cómoda de madera GEAYI' }, // useH: altura del colchón (🛏️ acostarse)
  { id: 'sofa',   emoji: '🛋️', name: 'Sofá Geayi',         price: 120, solid: true,  w: 2.6, d: 1.2, h: 1.1, useH: 0.65, desc: 'Sofá suave para tu sala' }, // useH: altura del asiento (🪑 sentarse)
  { id: 'lamp',   emoji: '💡', name: 'Lámpara Brillo',      price: 60,  solid: false, w: 0.6, d: 0.6, h: 1.9, desc: 'Brilla bonito (emissive, sin luz real)' },
  { id: 'table',  emoji: '🍽️', name: 'Mesa Familiar',       price: 80,  solid: true,  w: 1.8, d: 1.2, h: 0.85, desc: 'Mesa familiar de madera' },
  { id: 'chair',  emoji: '🪑', name: 'Silla Geayi',         price: 40,  solid: true,  w: 0.8, d: 0.8, h: 1.0, useH: 0.53, desc: 'Silla cómoda GEAYI' }, // useH: altura del asiento (🪑 sentarse)
  { id: 'shelf',  emoji: '📚', name: 'Estantería',          price: 100, solid: true,  w: 2.0, d: 0.6, h: 2.1, desc: 'Guarda tus cosas con estilo' },
  { id: 'tv',     emoji: '📺', name: 'TV Geayi',            price: 140, solid: true,  w: 1.7, d: 0.8, h: 1.6, desc: 'Pantalla brillante para tu sala' },
  { id: 'plant',  emoji: '🪴', name: 'Planta Viva',         price: 30,  solid: false, w: 0.6, d: 0.6, h: 1.1, desc: 'Una plantita que da vida' },
  { id: 'rug',    emoji: '🟧', name: 'Alfombra Sol',        price: 25,  solid: false, w: 3.0, d: 3.0, h: 0.08, desc: 'Alfombra suave para el piso' },
  { id: 'fridge', emoji: '🧊', name: 'Refrigerador Frost',  price: 130, solid: true,  w: 1.2, d: 1.2, h: 2.1, desc: 'Guarda tus refrescos bien fríos' },
];
const FURN_DEF = {};
FURNITURE_CATALOG.forEach(c => { FURN_DEF[c.id] = c; });

/* ---------------- geometrías y materiales compartidos (Android) ---------------- */
const _FURN_GEO = {};
function _fgeo(key, make) {
  if (!_FURN_GEO[key] && typeof THREE !== 'undefined') { try { _FURN_GEO[key] = make(); } catch (e) {} }
  return _FURN_GEO[key];
}
function _fgeos() {
  return {
    box:   _fgeo('box',   () => new THREE.BoxGeometry(1, 1, 1)),
    cyl:   _fgeo('cyl',   () => new THREE.CylinderGeometry(0.5, 0.5, 1, 10)),
    sph:   _fgeo('sph',   () => new THREE.SphereGeometry(0.5, 12, 10)),
    shade: _fgeo('shade', () => new THREE.CylinderGeometry(0.32, 0.48, 0.55, 12)),
    pot:   _fgeo('pot',   () => new THREE.CylinderGeometry(0.26, 0.2, 0.35, 10)),
  };
}
const _FURN_MATS = {};
function _fmat(key, color, emissive, emissiveIntensity) {
  const k = key + '|' + color + '|' + (emissive || 0) + '|' + (emissiveIntensity || 0);
  if (!_FURN_MATS[k] && typeof THREE !== 'undefined') {
    try {
      _FURN_MATS[k] = new THREE.MeshStandardMaterial({
        color: color, roughness: 0.75, metalness: 0.05,
        emissive: emissive || 0x000000, emissiveIntensity: emissiveIntensity || 1,
      });
    } catch (e) {}
  }
  return _FURN_MATS[k];
}
const _FC = { // paleta GEAYI (cálida y viva)
  wood: 0x8a5a2e, woodDark: 0x5e3a1a, cream: 0xf5e6c8, white: 0xffffff,
  teal: 0x0aa6a6, tealDark: 0x067a7a, gray: 0x9aa5b1, grayLight: 0xd6dbe2,
  black: 0x14161c, leaf: 0x2fae5f, leafDark: 0x1f7a42, terra: 0xc96f4a,
  soil: 0x4a3220, orange: 0xe2703a, yellow: 0xffc400, pink: 0xff7ab8,
  blue: 0x2f9dff, red: 0xe23c3c,
};

/* ayudantes de construcción: escalan geometrías unitarias compartidas */
function _box(g, mat, w, h, d, x, y, z) {
  const G = _fgeos();
  const m = new THREE.Mesh(G.box, mat);
  m.scale.set(w, h, d); m.position.set(x, y, z); g.add(m); return m;
}
function _cyl(g, mat, r, h, x, y, z) {
  const G = _fgeos();
  const m = new THREE.Mesh(G.cyl, mat);
  m.scale.set(r * 2, h, r * 2); m.position.set(x, y, z); g.add(m); return m;
}
function _sph(g, mat, r, x, y, z) {
  const G = _fgeos();
  const m = new THREE.Mesh(G.sph, mat);
  m.scale.setScalar(r * 2); m.position.set(x, y, z); g.add(m); return m;
}
function _shade(g, mat, x, y, z, s) {
  const G = _fgeos();
  const m = new THREE.Mesh(G.shade, mat);
  m.scale.set(s || 1, s || 1, s || 1); m.position.set(x, y, z); g.add(m); return m;
}
function _pot(g, mat, x, y, z, s) {
  const G = _fgeos();
  const m = new THREE.Mesh(G.pot, mat);
  m.scale.set(s || 1, s || 1, s || 1); m.position.set(x, y, z); g.add(m); return m;
}

/* ---------------- constructores de muebles (diseños originales) ---------------- */
function _buildBed(g) {
  const wood = _fmat('wood', _FC.wood), cream = _fmat('cream', _FC.cream),
        white = _fmat('white', _FC.white), teal = _fmat('teal', _FC.teal);
  _box(g, wood, 2.2, 0.35, 3.4, 0, 0.28, 0);            // base
  _box(g, wood, 2.2, 1.1, 0.18, 0, 0.65, -1.61);         // cabecera
  _box(g, cream, 2.0, 0.3, 3.1, 0, 0.6, 0);             // colchón
  _box(g, white, 1.1, 0.18, 0.7, 0, 0.83, -1.1);        // almohada
  _box(g, teal, 2.02, 0.14, 1.7, 0, 0.78, 0.6);         // cobija
}
function _buildSofa(g) {
  const fab = _fmat('teal', _FC.teal), fabD = _fmat('tealD', _FC.tealDark),
        dark = _fmat('wd', _FC.woodDark);
  _box(g, fab, 2.6, 0.45, 1.2, 0, 0.42, 0);             // base
  _box(g, fabD, 2.6, 0.85, 0.28, 0, 0.85, -0.46);       // respaldo
  _box(g, fab, 0.3, 0.75, 1.2, -1.15, 0.62, 0);         // brazos
  _box(g, fab, 0.3, 0.75, 1.2, 1.15, 0.62, 0);
  _box(g, fabD, 1.12, 0.22, 0.95, -0.58, 0.75, 0.02);   // cojines
  _box(g, fabD, 1.12, 0.22, 0.95, 0.58, 0.75, 0.02);
  [[-1.15, -0.5], [1.15, -0.5], [-1.15, 0.5], [1.15, 0.5]].forEach(([lx, lz]) =>
    _cyl(g, dark, 0.05, 0.2, lx, 0.1, lz));             // patitas
}
function _buildLamp(g) {
  const dark = _fmat('wd', _FC.woodDark), gray = _fmat('gray', _FC.gray);
  // 💡 "luz" solo con emissive — NINGUNA luz real (rendimiento Android)
  const shade = _fmat('shade', 0xffe9a3, 0xffc94d, 0.9);
  const bulb = _fmat('bulb', 0xfff6d8, 0xffedb0, 1);
  _cyl(g, dark, 0.3, 0.08, 0, 0.04, 0);                 // base
  _cyl(g, gray, 0.06, 1.4, 0, 0.78, 0);                 // poste
  _shade(g, shade, 0, 1.55, 0, 1);                      // pantalla que "brilla"
  _sph(g, bulb, 0.12, 0, 1.45, 0);                      // foco emissive
}
function _buildTable(g) {
  const wood = _fmat('wood', _FC.wood);
  _box(g, wood, 1.8, 0.12, 1.2, 0, 0.78, 0);            // tablero
  [[-0.8, -0.5], [0.8, -0.5], [-0.8, 0.5], [0.8, 0.5]].forEach(([lx, lz]) =>
    _box(g, wood, 0.12, 0.72, 0.12, lx, 0.36, lz));     // patas
}
function _buildChair(g) {
  const teal = _fmat('teal', _FC.teal), wood = _fmat('wood', _FC.wood);
  _box(g, teal, 0.8, 0.1, 0.8, 0, 0.48, 0);             // asiento
  _box(g, teal, 0.8, 0.75, 0.1, 0, 0.9, -0.35);         // respaldo
  [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]].forEach(([lx, lz]) =>
    _box(g, wood, 0.09, 0.43, 0.09, lx, 0.215, lz));    // patas
}
function _buildShelf(g) {
  const wood = _fmat('wood', _FC.wood);
  _box(g, wood, 0.08, 2.1, 0.6, -0.96, 1.05, 0);        // laterales
  _box(g, wood, 0.08, 2.1, 0.6, 0.96, 1.05, 0);
  _box(g, wood, 2.0, 0.08, 0.6, 0, 2.06, 0);            // tapa y base
  _box(g, wood, 2.0, 0.08, 0.6, 0, 0.1, 0);
  _box(g, wood, 1.84, 0.06, 0.55, 0, 0.75, 0);          // repisas
  _box(g, wood, 1.84, 0.06, 0.55, 0, 1.4, 0);
  const bookC = [_FC.red, _FC.blue, _FC.yellow, _FC.teal, _FC.pink, _FC.orange, _FC.leaf, _FC.cream];
  for (let i = 0; i < 8; i++) {                        // libritos de colores
    const bm = _fmat('book' + i, bookC[i % bookC.length]);
    const shelfY = i < 4 ? 0.78 : 1.43;
    const bh = 0.34 + (i % 3) * 0.07;
    _box(g, bm, 0.16, bh, 0.4, -0.72 + (i % 4) * 0.42, shelfY + bh / 2, 0);
  }
}
function _buildTV(g) {
  const wood = _fmat('wood', _FC.wood), black = _fmat('black', _FC.black),
        dark = _fmat('wd', _FC.woodDark);
  const scr = _fmat('screen', 0x0a2a33, 0x37e6ff, 0.85); // pantalla emissive
  _box(g, wood, 1.7, 0.55, 0.8, 0, 0.275, 0);           // mueble
  _box(g, black, 1.6, 0.95, 0.1, 0, 1.25, 0);           // marco
  _box(g, scr, 1.45, 0.8, 0.04, 0, 1.25, 0.04);        // pantalla brillante
  _cyl(g, dark, 0.04, 0.5, -0.3, 1.95, 0);              // antenitas
  _cyl(g, dark, 0.04, 0.5, 0.3, 1.95, 0);
}
function _buildPlant(g) {
  const terra = _fmat('terra', _FC.terra), soil = _fmat('soil', _FC.soil),
        leaf = _fmat('leaf', _FC.leaf), leafD = _fmat('leafD', _FC.leafDark);
  _pot(g, terra, 0, 0.175, 0, 1);                       // maceta
  _cyl(g, soil, 0.22, 0.05, 0, 0.36, 0);                // tierra
  _sph(g, leaf, 0.3, 0, 0.6, 0);                        // follaje
  _sph(g, leafD, 0.24, 0.12, 0.85, 0.05);
  _sph(g, leaf, 0.2, -0.1, 1.0, -0.08);
}
function _buildRug(g) {
  const o = _fmat('orange', _FC.orange), t = _fmat('teal', _FC.teal), c = _fmat('cream', _FC.cream);
  _box(g, o, 3.0, 0.06, 3.0, 0, 0.03, 0);               // base
  _box(g, t, 2.2, 0.065, 2.2, 0, 0.0325, 0);            // rombo medio
  _box(g, c, 1.2, 0.07, 1.2, 0, 0.035, 0);              // centro
}
function _buildFridge(g) {
  const gl = _fmat('gl', _FC.grayLight), gr = _fmat('gray', _FC.gray),
        dark = _fmat('wd', _FC.woodDark);
  const logo = _fmat('flogo', 0x0aa6a6, 0x0aa6a6, 0.5); // placa GEAYI
  _box(g, gl, 1.2, 2.1, 1.2, 0, 1.05, 0);               // cuerpo
  _box(g, gr, 1.14, 0.7, 0.04, 0, 1.7, 0.59);           // puerta congelador
  _box(g, gr, 1.14, 1.25, 0.04, 0, 0.85, 0.59);         // puerta refri
  _box(g, dark, 0.06, 0.4, 0.06, 0.45, 1.55, 0.63);      // jaladeras
  _box(g, dark, 0.06, 0.4, 0.06, 0.45, 0.95, 0.63);
  _box(g, logo, 0.4, 0.15, 0.02, 0, 1.95, 0.62);        // placa
}
const FURN_BUILDERS = {
  bed: _buildBed, sofa: _buildSofa, lamp: _buildLamp, table: _buildTable,
  chair: _buildChair, shelf: _buildShelf, tv: _buildTV, plant: _buildPlant,
  rug: _buildRug, fridge: _buildFridge,
};

/* ---------------- helpers de sonido/efectos/toast ---------------- */
function _fClick() { try { if (typeof Audio2 !== 'undefined' && Audio2 && Audio2.click) Audio2.click(); } catch (e) {} }
function _fWin() { try { if (typeof Audio2 !== 'undefined' && Audio2 && Audio2.win) Audio2.win(); } catch (e) {} }
function _fBurst(x, y, z) {
  try {
    if (typeof Particles !== 'undefined' && Particles && typeof Particles.burst === 'function')
      Particles.burst(x, y + 1, z, [0xffd23f, 0x59d867, 0x00e5ff, 0xffffff], 24, 7);
  } catch (e) {}
}
function _fToast(msg) { try { if (typeof toast === 'function') toast(msg); } catch (e) {} }
function _fCoinsText() {
  try {
    if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.coinsText === 'function') return Shop2.coinsText();
    if (typeof SAVE !== 'undefined') return String(SAVE.coins || 0);
  } catch (e) {}
  return '0';
}

/* ============================================================
   🪑 Furniture — API pública
   ============================================================ */
const Furniture = {
  CATALOG: FURNITURE_CATALOG,
  MAX_PER_LOT: FURN_MAX,
  _placed: {},        // 'worldIdx:lotId' -> [{rec, group}]
  _btns: null,        // {store, rm} botones de proximidad (DOM dinámico)
  _btnState: '',
  _rmState: '',
  _panel: null,
  _panelOpen: false,

  /* ---------- datos / persistencia ---------- */
  _defOf(worldIdx, lotId) {
    try {
      if (typeof LotSystem === 'undefined') return null;
      const defs = LotSystem.lotsFor(worldIdx) || [];
      for (const d of defs) if (d.id === lotId) return d;
    } catch (e) {}
    return null;
  },
  _ensureFurn(rec) {
    if (!rec) return [];
    if (!Array.isArray(rec.furniture)) rec.furniture = [];
    return rec.furniture;
  },
  /* lote PROPIO que contiene el punto (x,z) — null si no hay */
  lotAt(worldIdx, x, z) {
    try {
      if (typeof LotSystem === 'undefined') return null;
      const defs = LotSystem.lotsFor(worldIdx) || [];
      for (const def of defs) {
        if (!LotSystem.isOwned(worldIdx, def.id)) continue;
        if (Math.abs(x - def.x) <= def.w / 2 && Math.abs(z - def.z) <= def.d / 2) {
          const rec = LotSystem.getSave(worldIdx, def.id);
          if (rec) return { def: def, rec: rec };
        }
      }
    } catch (e) {}
    return null;
  },
  furnCount(worldIdx, lotId) {
    try {
      if (typeof LotSystem === 'undefined') return 0;
      const rec = LotSystem.getSave(worldIdx, lotId);
      return rec && Array.isArray(rec.furniture) ? rec.furniture.length : 0;
    } catch (e) { return 0; }
  },

  /* ---------- validación de posición ---------- */
  _spotOk(lotDef, def, ry, x, z) {
    try {
      const s45 = Math.abs(Math.sin(ry || 0)) > 0.5; // rotado 90°/270°: se intercambian w/d
      const fw = s45 ? def.d : def.w, fd = s45 ? def.w : def.d;
      const m = 0.15;
      return (x - fw / 2 >= lotDef.x - lotDef.w / 2 + m) &&
             (x + fw / 2 <= lotDef.x + lotDef.w / 2 - m) &&
             (z - fd / 2 >= lotDef.z - lotDef.d / 2 + m) &&
             (z + fd / 2 <= lotDef.z + lotDef.d / 2 - m);
    } catch (e) { return false; }
  },

  /* ---------- construcción 3D ---------- */
  buildItem(type) {
    try {
      if (typeof THREE === 'undefined') return null;
      const fn = FURN_BUILDERS[type];
      if (!fn) return null;
      const g = new THREE.Group();
      fn(g);
      g.userData.furnType = type;
      return g;
    } catch (e) { return null; }
  },
  _groundY(lotDef, lotRec) {
    try {
      if (lotDef && lotDef.groundY) return lotDef.groundY;
      if (lotRec && lotRec.groundY) return lotRec.groundY;
    } catch (e) {}
    return 0;
  },
  /* crea el mesh de un registro guardado + colisionador si tiene volumen */
  _spawnOne(worldIdx, lotId, lotDef, lotRec, frec, group) {
    try {
      const def = FURN_DEF[frec.type];
      if (!def) return null;
      const g = this.buildItem(def.id);
      if (!g) return null;
      const gy = this._groundY(lotDef, lotRec);
      g.position.set(frec.x, gy + (def.id === 'rug' ? 0.02 : 0), frec.z);
      g.rotation.y = frec.ry || 0;
      group.add(g);
      const key = worldIdx + ':' + lotId;
      if (!this._placed[key]) this._placed[key] = [];
      this._placed[key].push({ rec: frec, group: g });
      this._addCollider(worldIdx, lotId, def, gy, frec);
      return g;
    } catch (e) { return null; }
  },
  _addCollider(worldIdx, lotId, def, gy, frec) {
    try {
      if (!def.solid) return; // 🟧 alfombra, 💡 lámpara y 🪴 planta no colisionan
      if (typeof LEVEL === 'undefined' || !LEVEL || !Array.isArray(LEVEL.platforms)) return;
      const s45 = Math.abs(Math.sin(frec.ry || 0)) > 0.5;
      const fw = s45 ? def.d : def.w, fd = s45 ? def.w : def.d;
      LEVEL.platforms.push({
        x: frec.x, z: frec.z, topY: gy + def.h, w: fw, h: def.h, d: fd,
        solid: true, kind: 'furn',
        furnTag: worldIdx + ':' + lotId + ':' + def.id + '@' + frec.x + ',' + frec.z,
      });
    } catch (e) {}
  },
  /* retira los colisionadores del lote y los re-registra desde SAVE */
  syncColliders(worldIdx, lotId) {
    try {
      const key = worldIdx + ':' + lotId;
      if (typeof LEVEL !== 'undefined' && LEVEL && Array.isArray(LEVEL.platforms)) {
        LEVEL.platforms = LEVEL.platforms.filter(p =>
          !(p.furnTag && String(p.furnTag).indexOf(key + ':') === 0));
        if (typeof LotSystem !== 'undefined') {
          const def = this._defOf(worldIdx, lotId);
          const rec = LotSystem.getSave(worldIdx, lotId);
          if (def && rec && Array.isArray(rec.furniture)) {
            const gy = this._groundY(def, rec);
            rec.furniture.forEach(frec => {
              const d = FURN_DEF[frec.type];
              if (d) this._addCollider(worldIdx, lotId, d, gy, frec);
            });
          }
        }
      }
    } catch (e) {}
  },

  /* ---------- reconstrucción al cargar el nivel ---------- */
  buildForLevel(i, group) {
    this._placed = {};
    this.moving = null; // si se estaba moviendo algo, se cancela: el registro nunca cambió
    try {
      if (typeof THREE === 'undefined') return;
      const g = (group && group.group) ? group.group : group;
      if (!g || typeof g.add !== 'function') return;
      if (typeof LotSystem === 'undefined') return;
      const defs = LotSystem.lotsFor(i) || [];
      defs.forEach(def => {
        const key = i + ':' + def.id;
        this._placed[key] = [];
        try {
          if (!LotSystem.isOwned(i, def.id)) return;
          const rec = LotSystem.getSave(i, def.id);
          if (!rec || !Array.isArray(rec.furniture)) return;
          rec.furniture.forEach(frec => {
            try { this._spawnOne(i, def.id, def, rec, frec, g); } catch (e) {}
          });
        } catch (e) {}
      });
    } catch (e) {}
  },

  /* ---------- compra y colocación ---------- */
  /* busca un hueco válido cerca del jugador: frente, sitio, atrás, lados;
     prueba con la orientación del jugador y girada 90° */
  _placeSpot(lotDef, def, h) {
    try {
      const P = (typeof Player !== 'undefined' && Player) ? Player.pos : null;
      if (!P) return null;
      const rys = [Math.round(h / (Math.PI / 2)) * (Math.PI / 2)];
      rys.push(rys[0] + Math.PI / 2);
      const fx = Math.sin(h), fz = Math.cos(h);
      const px = Math.cos(h), pz = -Math.sin(h); // perpendicular
      const offs = [[2.4, 0], [0, 0], [-2.4, 0], [0, 2.4], [0, -2.4],
                    [1.5, 1.5], [1.5, -1.5], [-1.5, 1.5], [-1.5, -1.5],
                    [3.6, 0], [-3.6, 0], [0, 3.6], [0, -3.6]];
      for (const ry of rys) {
        for (const [fo, so] of offs) {
          const x = P.x + fx * fo + px * so;
          const z = P.z + fz * fo + pz * so;
          if (this._spotOk(lotDef, def, ry, x, z)) return { x: x, z: z, ry: ry };
        }
      }
    } catch (e) {}
    return null;
  },
  buy(type) {
    try {
      const def = FURN_DEF[type];
      if (!def) return false;
      if (typeof MODE !== 'undefined' && MODE !== 'play') return false;
      const P = (typeof Player !== 'undefined') ? Player : null;
      if (!P || !P.pos) return false;
      const wi = (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx != null) ? LEVEL.idx : null;
      if (wi == null) return false;
      // 🔒 solo dentro de un lote PROPIO
      const lot = this.lotAt(wi, P.pos.x, P.pos.z);
      if (!lot) { _fToast('🏠 Entra a tu lote para colocar muebles'); return false; }
      const list = this._ensureFurn(lot.rec);
      if (list.length >= FURN_MAX) { _fToast('🧱 Tope de ' + FURN_MAX + ' muebles en este lote'); return false; }
      // 🪙 fondos (antes de buscar hueco: no se cobra sin colocar)
      let ok = false;
      if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.spendCoins === 'function') {
        ok = !!Shop2.spendCoins(def.price);
      } else if (typeof SAVE !== 'undefined') {
        if ((SAVE.coins || 0) >= def.price) { SAVE.coins -= def.price; ok = true; }
      }
      if (!ok) { _fToast('🪙 Te faltan monedas'); return false; }
      // 📍 hueco válido cerca del jugador (siempre dentro del lote)
      const h = (typeof P.heading === 'number') ? P.heading : 0;
      const spot = this._placeSpot(lot.def, def, h);
      if (!spot) { // devolver las monedas: no se colocó nada
        try {
          if (typeof Shop2 !== 'undefined' && Shop2 && typeof Shop2.addCoins === 'function') Shop2.addCoins(def.price);
          else if (typeof SAVE !== 'undefined') SAVE.coins = (SAVE.coins || 0) + def.price;
        } catch (e) {}
        _fToast('🚧 No cabe aquí: muévete un poco');
        return false;
      }
      const frec = { type: def.id, x: +spot.x.toFixed(2), z: +spot.z.toFixed(2), ry: +spot.ry.toFixed(3) };
      list.push(frec);
      try { persist(); } catch (e) {}
      const grp = (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.group) ? LEVEL.group : null;
      if (grp) this._spawnOne(wi, lot.def.id, lot.def, lot.rec, frec, grp);
      _fWin();
      _fBurst(frec.x, (this._groundY(lot.def, lot.rec) || 0), frec.z);
      _fToast(def.emoji + ' ¡' + def.name + ' colocado!');
      this._refreshPanel();
      return true;
    } catch (e) { return false; }
  },

  /* quitar: elimina permanentemente el mueble propio más cercano (< 2.8u) */
  removeNearest() {
    try {
      const P = (typeof Player !== 'undefined') ? Player : null;
      if (!P || !P.pos) return false;
      if (typeof LEVEL === 'undefined' || !LEVEL || LEVEL.idx == null) return false;
      const near = this._nearestOwn(LEVEL.idx, P.pos.x, P.pos.z, 2.8);
      if (!near) { _fToast('🪑 Acércate a un mueble tuyo'); return false; }
      const wi = LEVEL.idx, lotId = near.lotId;
      const rec = (typeof LotSystem !== 'undefined') ? LotSystem.getSave(wi, lotId) : null;
      const list = this._ensureFurn(rec);
      const ix = list.indexOf(near.item.rec);
      if (ix >= 0) list.splice(ix, 1);
      try { if (near.item.group && near.item.group.parent) near.item.group.parent.remove(near.item.group); } catch (e) {}
      const arr = this._placed[wi + ':' + lotId] || [];
      const jx = arr.indexOf(near.item);
      if (jx >= 0) arr.splice(jx, 1);
      this.syncColliders(wi, lotId); // retira su colisionador
      try { persist(); } catch (e) {}
      _fClick();
      _fToast('🗑️ Mueble retirado');
      this._refreshPanel();
      return true;
    } catch (e) { return false; }
  },
  _nearestOwn(worldIdx, x, z, maxD) {
    try {
      const pre = worldIdx + ':';
      let best = null, bd = maxD * maxD;
      for (const key of Object.keys(this._placed)) {
        if (key.indexOf(pre) !== 0) continue;
        const lotId = key.slice(pre.length);
        for (const item of this._placed[key]) {
          if (!item || !item.group || !item.group.position) continue;
          if (this.moving && this.moving.entry === item) continue; // el que se está moviendo no cuenta
          const dx = item.group.position.x - x, dz = item.group.position.z - z;
          const d2 = dx * dx + dz * dz;
          if (d2 < bd) { bd = d2; best = { item: item, lotId: lotId }; } // < : el más cercano gana (empate → el más viejo)
        }
      }
      return best;
    } catch (e) { return null; }
  },

  /* ---------- proximidad para sentarse / acostarse / mover ---------- */
  /* busca el mueble propio más cercano de ciertos tipos dentro de maxD metros */
  _nearestType(worldIdx, x, z, maxD, types) {
    try {
      const pre = worldIdx + ':';
      let best = null, bd = maxD * maxD;
      for (const key of Object.keys(this._placed)) {
        if (key.indexOf(pre) !== 0) continue;
        const lotId = key.slice(pre.length);
        for (const item of this._placed[key]) {
          if (!item || !item.rec || !item.group || !item.group.position) continue;
          if (types.indexOf(item.rec.type) < 0) continue;
          if (this.moving && this.moving.entry === item) continue; // el que se está moviendo no cuenta
          const dx = item.group.position.x - x, dz = item.group.position.z - z;
          const d2 = dx * dx + dz * dz;
          if (d2 < bd) { bd = d2; best = { item: item, lotId: lotId, wi: worldIdx }; }
        }
      }
      return best;
    } catch (e) { return null; }
  },
  /* 🪑 silla o sofá a menos de 2.2m → botón 🪑 Sentarse (null si no hay) */
  nearSeat() {
    try {
      const P = (typeof Player !== 'undefined') ? Player : null;
      if (!P || !P.pos || this.moving || (P.pose && P.pose !== 'stand')) return null;
      if (typeof LEVEL === 'undefined' || !LEVEL || LEVEL.idx == null) return null;
      return this._nearestType(LEVEL.idx, P.pos.x, P.pos.z, 2.2, ['chair', 'sofa']);
    } catch (e) { return null; }
  },
  /* 🛏️ cama a menos de 2.2m → botón 🛏️ Acostarse (null si no hay) */
  nearBed() {
    try {
      const P = (typeof Player !== 'undefined') ? Player : null;
      if (!P || !P.pos || this.moving || (P.pose && P.pose !== 'stand')) return null;
      if (typeof LEVEL === 'undefined' || !LEVEL || LEVEL.idx == null) return null;
      return this._nearestType(LEVEL.idx, P.pos.x, P.pos.z, 2.2, ['bed']);
    } catch (e) { return null; }
  },
  /* ✋ cualquier mueble propio movible a menos de 2.8m → botón ✋ Mover (null si no hay) */
  nearFurniture() {
    try {
      const P = (typeof Player !== 'undefined') ? Player : null;
      if (!P || !P.pos || this.moving || (P.pose && P.pose !== 'stand')) return null;
      if (typeof LEVEL === 'undefined' || !LEVEL || LEVEL.idx == null) return null;
      return this._nearestType(LEVEL.idx, P.pos.x, P.pos.z, 2.8, FURNITURE_CATALOG.map(c => c.id));
    } catch (e) { return null; }
  },
  /* ref de pose para Player.sit/lieDown: {x,z,ry,useH,gy,front} */
  poseRefFor(found) {
    try {
      if (!found || !found.item || !found.item.group) return null;
      const def = FURN_DEF[found.item.rec.type];
      if (!def) return null;
      const g = found.item.group;
      const lotDef = this._defOf(found.wi != null ? found.wi : LEVEL.idx, found.lotId);
      const rec = (typeof LotSystem !== 'undefined') ? LotSystem.getSave(found.wi != null ? found.wi : LEVEL.idx, found.lotId) : null;
      return {
        x: g.position.x, z: g.position.z, ry: g.rotation.y || 0,
        useH: def.useH || 0.5,
        gy: this._groundY(lotDef, rec),
        front: (def.d || 1) / 2 + 0.6, // al levantarse da un pasito al frente del mueble
      };
    } catch (e) { return null; }
  },

  /* ---------- mover muebles (✋ Mover → ✅ Colocar) ---------- */
  moving: null, // {entry, lotId, wi, def, lastOk:{x,z}} mientras se mueve un mueble
  isMoving() { return !!this.moving; },
  /* pone un mueble en modo mover: fantasma semi-transparente que sigue al jugador */
  startMove(found) {
    try {
      if (!found || !found.item || !found.item.group) return false;
      if (this.moving) this.cancelMove();
      const def = FURN_DEF[found.item.rec.type];
      if (!def) return false;
      // quita su colisionador mientras se mueve (evita que choque consigo mismo)
      try {
        const wi0 = found.wi != null ? found.wi : LEVEL.idx;
        const tag = wi0 + ':' + found.lotId + ':' + def.id + '@' + found.item.rec.x + ',' + found.item.rec.z;
        if (typeof LEVEL !== 'undefined' && LEVEL && Array.isArray(LEVEL.platforms))
          LEVEL.platforms = LEVEL.platforms.filter(p => p.furnTag !== tag);
      } catch (e) {}
      // fantasma semi-transparente
      try {
        found.item.group.traverse(o => {
          if (o.isMesh && o.material && !o.userData._gm && typeof o.material.clone === 'function') {
            o.userData._gm = o.material;
            const m = o.material.clone();
            try { m.transparent = true; m.opacity = 0.55; } catch (e2) {}
            o.material = m;
          }
        });
      } catch (e) {}
      this.moving = { entry: found.item, lotId: found.lotId, wi: found.wi != null ? found.wi : LEVEL.idx, def: def,
        lastOk: { x: found.item.rec.x, z: found.item.rec.z } };
      _fToast('✋ Moviendo ' + def.emoji + ' ' + def.name + '… camina y toca ✅ Colocar');
      if (typeof Audio2 !== 'undefined' && Audio2.click) { try { Audio2.click(); } catch (e) {} }
      return true;
    } catch (e) { return false; }
  },
  /* ✅ fija el mueble donde está el fantasma (validado dentro del lote) y guarda */
  placeMove() {
    try {
      const mv = this.moving; if (!mv) return false;
      const g = mv.entry.group, frec = mv.entry.rec;
      // el fantasma ya solo se quedó en posiciones válidas; fija y guarda
      frec.x = +g.position.x.toFixed(2); frec.z = +g.position.z.toFixed(2);
      try { // restaura materiales opacos
        g.traverse(o => { if (o.isMesh && o.userData._gm) { o.material = o.userData._gm; delete o.userData._gm; } });
      } catch (e) {}
      try { persist(); } catch (e) {}
      // re-spawnea limpio en el registro (misma rotación) y sincroniza colisionadores
      try { if (g.parent) g.parent.remove(g); } catch (e) {}
      const key = mv.wi + ':' + mv.lotId;
      const arr = this._placed[key] || [];
      const jx = arr.indexOf(mv.entry); if (jx >= 0) arr.splice(jx, 1);
      const lotDef = this._defOf(mv.wi, mv.lotId);
      const rec = (typeof LotSystem !== 'undefined') ? LotSystem.getSave(mv.wi, mv.lotId) : null;
      const grp = (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.group) ? LEVEL.group : null;
      if (grp && lotDef) this._spawnOne(mv.wi, mv.lotId, lotDef, rec, frec, grp);
      this.syncColliders(mv.wi, mv.lotId);
      this.moving = null;
      _fWin();
      try { _fBurst(frec.x, this._groundY(lotDef, rec), frec.z); } catch (e) {}
      _fToast('✅ ' + mv.def.emoji + ' ' + mv.def.name + ' colocado');
      return true;
    } catch (e) { return false; }
  },
  /* cancela el movimiento: el mueble vuelve a su sitio original */
  cancelMove() {
    try {
      const mv = this.moving; if (!mv) return false;
      const g = mv.entry.group;
      g.position.set(mv.entry.rec.x, g.position.y, mv.entry.rec.z); // rec nunca cambió: vuelve al sitio original
      try { // restaura materiales opacos
        g.traverse(o => { if (o.isMesh && o.userData._gm) { o.material = o.userData._gm; delete o.userData._gm; } });
      } catch (e) {}
      this.moving = null;
      this.syncColliders(mv.wi, mv.lotId); // restaura su colisionador original
      _fToast('↩️ Sin cambios');
      return true;
    } catch (e) { return false; }
  },

  /* ---------- tienda (UI dinámica; NO se ejecuta al cargar) ---------- */
  _coinsForPanel() { return _fCoinsText(); },
  openStore() {
    this.closeStore();
    if (typeof document === 'undefined') return;
    try {
      this._panelOpen = true;
      const P = (typeof Player !== 'undefined') ? Player : null;
      const wi = (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx != null) ? LEVEL.idx : null;
      const lot = (P && P.pos && wi != null) ? this.lotAt(wi, P.pos.x, P.pos.z) : null;
      const n = lot ? this._ensureFurn(lot.rec).length : 0;
      const ov = document.createElement('div');
      ov.id = 'furn-ov'; ov.className = 'screen overlay';
      let html = '<div class="panel" style="max-width:440px;width:100%"><h2>🪑 Mueblería GEAYI</h2>' +
        '<div class="job-note">Decora tu lote · <b id="furn-count">' + n + '/' + FURN_MAX +
        '</b> muebles · Tienes <b id="furn-coins">' + this._coinsForPanel() + '</b> 🪙</div>';
      FURNITURE_CATALOG.forEach(c => {
        html += '<div class="job-card"><div class="job-emoji">' + c.emoji + '</div>' +
          '<div class="job-info"><div class="job-name">' + c.name + '</div>' +
          '<div class="job-desc">' + c.desc + ' · ' + c.price + ' 🪙</div></div>' +
          '<button class="btn job-go" data-furn="' + c.id + '">🪙 ' + c.price + '</button></div>';
      });
      html += '<div class="menu-buttons"><button class="btn" data-act="close">✕ Cerrar</button></div></div>';
      ov.innerHTML = html;
      document.body.appendChild(ov);
      const qs = ov.querySelectorAll('[data-furn]');
      for (let k = 0; k < qs.length; k++) {
        (function (b) {
          b.addEventListener('click', function () { Furniture.buy(b.getAttribute('data-furn')); });
        })(qs[k]);
      }
      const qc = ov.querySelectorAll('[data-act="close"]');
      for (let k = 0; k < qc.length; k++) {
        qc[k].addEventListener('click', function () { Furniture.closeStore(); });
      }
      ov.addEventListener('click', function (e) { if (e.target === ov) Furniture.closeStore(); });
      this._panel = ov;
    } catch (e) { this._panelOpen = false; }
  },
  closeStore() {
    try {
      if (this._panel && this._panel.parentNode) this._panel.parentNode.removeChild(this._panel);
    } catch (e) {}
    this._panel = null;
    this._panelOpen = false;
  },
  _refreshPanel() {
    try {
      if (!this._panelOpen || typeof document === 'undefined') return;
      const c1 = document.getElementById('furn-coins');
      if (c1) c1.textContent = this._coinsForPanel();
      const P = (typeof Player !== 'undefined') ? Player : null;
      const wi = (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx != null) ? LEVEL.idx : null;
      const lot = (P && P.pos && wi != null) ? this.lotAt(wi, P.pos.x, P.pos.z) : null;
      const c2 = document.getElementById('furn-count');
      if (c2) c2.textContent = (lot ? this._ensureFurn(lot.rec).length : 0) + '/' + FURN_MAX;
    } catch (e) {}
  },

  /* ---------- botones de proximidad (DOM dinámico) ---------- */
  _ensureButtons() {
    if (this._btns || typeof document === 'undefined') return;
    try {
      const mk = (id, label, bottomPx, bg) => {
        const b = document.createElement('button');
        b.id = id; b.textContent = label;
        b.style.cssText = 'position:fixed;right:18px;z-index:16;min-width:124px;' +
          'bottom:calc(' + bottomPx + 'px + env(safe-area-inset-bottom));' +
          'padding:14px 20px;border-radius:999px;border:3px solid rgba(255,255,255,.9);' +
          'font-family:inherit;font-weight:700;font-size:16px;letter-spacing:1px;color:#fff;' +
          'text-shadow:0 1px 3px rgba(0,0,0,.45);cursor:pointer;display:none;' +
          'background:' + bg + ';box-shadow:0 0 22px rgba(0,0,0,.35),0 5px 0 rgba(0,0,0,.35);';
        document.body.appendChild(b);
        return b;
      };
      const store = mk('btn-furn', '🪑 Mueblería', 372,
        'radial-gradient(circle at 35% 30%,#8fd8ff 0%,#1d86d6 45%,#0d4f8a 100%)');
      const rm = mk('btn-furnrm', '❌ Quitar', 436,
        'radial-gradient(circle at 35% 30%,#ff9a9a 0%,#d63c3c 45%,#7a1010 100%)');
      store.addEventListener('click', function () { Furniture.onStoreClick(); });
      rm.addEventListener('click', function () { Furniture.onRemoveClick(); });
      this._btns = { store: store, rm: rm };
    } catch (e) {}
  },
  onStoreClick() { _fClick(); this.openStore(); },
  onRemoveClick() { _fClick(); this.removeNearest(); },
  _showBtn(which, show, label) {
    try {
      const b = this._btns && this._btns[which];
      if (!b) return;
      if (show) { if (label) b.textContent = label; b.style.display = 'block'; }
      else b.style.display = 'none';
    } catch (e) {}
  },
  update(dt) {
    try { this._ensureButtons(); } catch (e) {}
    // ✋ modo mover: el fantasma sigue al jugador (solo a posiciones válidas del lote)
    if (this.moving) {
      try {
        const mv = this.moving, P = Player;
        if (P && P.pos && typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx === mv.wi) {
          const lotDef = this._defOf(mv.wi, mv.lotId);
          if (lotDef) {
            const h = (typeof P.heading === 'number') ? P.heading : 0;
            const nx = P.pos.x + Math.sin(h) * 2.4, nz = P.pos.z + Math.cos(h) * 2.4;
            const ry = mv.entry.group.rotation.y || 0;
            if (this._spotOk(lotDef, mv.def, ry, nx, nz)) {
              mv.entry.group.position.x = nx; mv.entry.group.position.z = nz;
              mv.lastOk = { x: nx, z: nz };
            }
          }
        }
      } catch (e) {}
    }
    let storeLot = null, rmItem = null;
    try {
      if (typeof MODE !== 'undefined' && MODE === 'play' &&
          typeof Player !== 'undefined' && Player && Player.pos &&
          typeof LEVEL !== 'undefined' && LEVEL && LEVEL.idx != null && !this._panelOpen) {
        const driving = (typeof Vehicle !== 'undefined' && Vehicle && Vehicle.mode && Vehicle.mode !== 'none');
        const building = (typeof BuildMode !== 'undefined' && BuildMode.active);
        const busy = this.moving || (Player.pose && Player.pose !== 'stand'); // moviendo o sentado/acostado: sin botones de tienda
        if (!driving && !building && !busy) {
          storeLot = this.lotAt(LEVEL.idx, Player.pos.x, Player.pos.z);
          rmItem = this._nearestOwn(LEVEL.idx, Player.pos.x, Player.pos.z, 2.8);
        }
      }
    } catch (e) {}
    try {
      const st = storeLot ? 'lot:' + storeLot.def.id : 'none';
      if (st !== this._btnState) {
        this._btnState = st;
        this._showBtn('store', !!storeLot, '🪑 Mueblería');
      }
      const rs = rmItem ? 'rm' : 'none';
      if (rs !== this._rmState) {
        this._rmState = rs;
        this._showBtn('rm', !!rmItem, '❌ Quitar');
      }
    } catch (e) {}
  },

  /* ---------- diagnóstico (tests) ---------- */
  _sharedGeoCount() { return Object.keys(_FURN_GEO).length; },
  _sharedMatCount() { return Object.keys(_FURN_MATS).length; },
};
