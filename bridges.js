/* bridges.js — 🌉 PUENTES PEATONALES (GEAYI — Obby Xtreme 3D)
   Módulo 100% original: puentes peatonales OPCIONALES sobre las avenidas.
   - Rampa de subida + plataforma de 5 m con BARANDALES + rampa de bajada.
   - Ancho 3 m · altura 5 m (dentro del rango 4-6 m) · rampas suaves de ~10°.
   - Empiezan a nivel del suelo; la caída desde el puente da al suelo (sin daño).
   - NO bloquean el paso a nivel de calle: la avenida queda libre por debajo (5 m).
   - Colores caramelo + letrero "🌉 Puente seguro" en cada entrada.
   - Caminables de verdad: la plataforma es una plataforma real del nivel y las
     rampas usan un "heightfield" que envuelve moveAxis() (sin tocar player.js),
     así el jugador SUBE CAMINANDO la rampa de 10° sin saltar.
   COORDENADAS (verificadas por script contra edificios y farolas):
   - Ciudad Neón (idx 0): puentes en (0, -120) y (0, 60) — sobre la avenida,
     libres de edificios y farolas.
   - Immokalee (idx 3): puentes en (0, 17) y (0, 90) — sobre el corredor 1ST ST;
     z=17 evita los comercios de 1ST ST (terminan en z=13.5) y z=89 evita
     semáforos, edificios y la BOSTON AVE (z=80).
   INTEGRACIÓN (sin editar archivos existentes):
   1. <script src="bridges.js"></script> en index.html (antes de game.js).
   2. En boot(): Bridges.init();
   3. En startLevel(i), tras LEVEL = buildLevel(i): Bridges.buildForLevel(i, LEVEL.group);
   REGLAS: no ejecuta DOM al cargar; solo expone Bridges.init()/buildForLevel().
*/
'use strict';

/* ================= diseño del puente ================= */
const BRIDGE_H = 5;                          // altura de la plataforma (4-6 m)
const BRIDGE_ANG = Math.PI / 18;            // 10° de pendiente
const BRIDGE_RLEN = BRIDGE_H / Math.tan(BRIDGE_ANG); // ≈ 28.36 m de rampa por lado
const BRIDGE_HW = 1.5;                       // medio ancho: 3 m de ancho
const BRIDGE_PH = 2.5;                       // media plataforma: 5 m
const BRIDGE_X0 = -(BRIDGE_PH + BRIDGE_RLEN);// ≈ -30.86 (inicio rampa oeste)
const BRIDGE_X1 = (BRIDGE_PH + BRIDGE_RLEN); // ≈ +30.86 (fin rampa este)

/* puentes por mundo (builder idx): coordenadas [x, z] del centro */
const BRIDGE_SPOTS = {
  0: [[0, -120], [0, 60]],  // 🌃 Ciudad Neón: sobre la avenida principal (verificado libre de edificios/farolas)
  3: [[0, 17], [0, 90]],   // 🌴 Immokalee: sobre el corredor 1ST ST (verificado libre)
};

/* colores caramelo */
const BR_COL = {
  ramp: 0xff9ecd, rampE: 0x5e1f3a,   // rosa caramelo
  deck: 0x7edbff, deckE: 0x0e3a4a,   // azul caramelo
  rail: 0xffffff, railE: 0x444444,   // barandal blanco
  railTop: 0xff6fa5,                 // pasamanos rosa
  pillar: 0x9c7a4d,                  // madera cálida
};

const Bridges = {
  list: [],          // descriptores del nivel actual: {idx, cx, bz, x0, x1}
  _wrapped: false,   // moveAxis ya envuelto
  _geo: {},          // geometrías reutilizadas
  _mat: {},          // materiales reutilizados por color
};

/* ---------- caché de geometrías / materiales (rendimiento Android) ---------- */
function brGeo(key, make) {
  if (!Bridges._geo[key]) Bridges._geo[key] = make();
  return Bridges._geo[key];
}
function brMat(color, emissive, ei) {
  const key = color + '|' + (emissive || 0) + '|' + (ei || 0);
  if (!Bridges._mat[key]) {
    Bridges._mat[key] = new THREE.MeshStandardMaterial({
      color, roughness: 0.65, metalness: 0.08,
      emissive: emissive || 0x000000, emissiveIntensity: ei || 0,
    });
  }
  return Bridges._mat[key];
}
function brBox(parent, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(brGeo('box1', () => new THREE.BoxGeometry(1, 1, 1)), mat);
  m.scale.set(w, h, d); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
/* viga entre (xa,ya) y (xb,yb) en el plano x-y, a z fijo (para pasamanos inclinados) */
function brBeam(parent, xa, ya, xb, yb, z, thick, mat) {
  const len = Math.hypot(xb - xa, yb - ya);
  const m = new THREE.Mesh(brGeo('box1', () => new THREE.BoxGeometry(1, 1, 1)), mat);
  m.scale.set(len, thick, thick);
  m.position.set((xa + xb) / 2, (ya + yb) / 2, z);
  m.rotation.z = Math.atan2(yb - ya, xb - xa);
  m.castShadow = true;
  parent.add(m);
  return m;
}

/* ---------- altura de la superficie del puente (heightfield) ---------- */
function bridgeSurfY(b, x) {
  const d = Math.abs(x - b.cx);
  if (d <= BRIDGE_PH) return BRIDGE_H;
  const t = (d - BRIDGE_PH) / BRIDGE_RLEN;
  if (t >= 1) return 0;
  return BRIDGE_H * (1 - t);
}
/* altura caminable en (x,z) o null si no hay puente ahí */
Bridges.groundAt = function (x, z) {
  for (const b of this.list) {
    if (Math.abs(z - b.bz) > BRIDGE_HW + 0.34) continue;
    const d = Math.abs(x - b.cx);
    if (d > BRIDGE_PH + BRIDGE_RLEN) continue;
    return bridgeSurfY(b, x);
  }
  return null;
};

/* ---------- física: envolver moveAxis para subir la rampa caminando ---------- */
let _brOrigMoveAxis = null;
function brInstallPhysics() {
  if (Bridges._wrapped || typeof moveAxis !== 'function') return false;
  _brOrigMoveAxis = moveAxis;
  moveAxis = function (axis, delta) { // eslint-disable-line no-global-assign
    if (axis === 'y' && delta < 0 && Bridges.list.length &&
        typeof Player !== 'undefined' && Player && Player.pos) {
      const g = Bridges.groundAt(Player.pos.x, Player.pos.z);
      if (g != null) {
        const py = Player.pos.y;
        // aterriza sobre la rampa/plataforma si cae sobre su superficie
        if (py >= g - 0.09 && py + delta <= g) {
          Player.pos.y = g; Player.vel.y = 0; Player.grounded = true;
          Player.groundPlat = { topY: g, kind: 'bridge', solid: true, move: null };
          return;
        }
      }
    }
    _brOrigMoveAxis(axis, delta);
  };
  Bridges._wrapped = true;
  return true;
}

Bridges.init = function () {
  brInstallPhysics(); // instala el envoltorio una sola vez (idempotente)
  return true;
};

Bridges.clear = function () { this.list = []; };

/* ---------- construcción de un puente ---------- */
function brBuildOne(group, lvl, cx, bz, idx) {
  const H = BRIDGE_H, RLEN = BRIDGE_RLEN, HW = BRIDGE_HW, PH = BRIDGE_PH;
  const x0 = cx - PH - RLEN, x1 = cx + PH + RLEN;
  const g = new THREE.Group();
  const rampM = brMat(BR_COL.ramp, BR_COL.rampE, 0.25);
  const deckM = brMat(BR_COL.deck, BR_COL.deckE, 0.3);
  const railM = brMat(BR_COL.rail, BR_COL.railE, 0.15);
  const topM = brMat(BR_COL.railTop, 0x5e1f3a, 0.25);

  // --- rampas (cajas rotadas a 10°; la cara superior coincide con el heightfield)
  const L3 = Math.hypot(RLEN, H);
  const nx = H / L3, ny = RLEN / L3; // normal de la superficie (hacia arriba)
  [[1, -1], [-1, 1]].forEach(([side, sgn]) => {
    // side=+1: rampa este (baja hacia +x) → rotación -10°; oeste: +10°
    const mx = cx + side * (PH + RLEN / 2);
    const my = H / 2 - 0.25 * ny;
    const mxx = mx - 0.25 * nx * side;
    const m = new THREE.Mesh(new THREE.BoxGeometry(L3, 0.5, HW * 2), rampM);
    m.position.set(mxx, my, bz);
    m.rotation.z = -side * BRIDGE_ANG;
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    // bordillo blanco a los lados de la rampa (visual)
    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(brGeo('box1', () => new THREE.BoxGeometry(1, 1, 1)), railM);
      c.scale.set(L3, 0.22, 0.18);
      const cy = my + 0.25 * ny + 0.08, cxx = mxx;
      c.position.set(cxx, cy, bz + s * (HW - 0.02));
      c.rotation.z = -side * BRIDGE_ANG;
      g.add(c);
    });
  });

  // --- plataforma central (5 m): SIN pilares debajo — las columnas quedaban en
  // medio de la calle estorbando el paso y la vista; la plataforma se apoya
  // visualmente en las rampas de ambos lados.
  brBox(g, PH * 2, 0.6, HW * 2, deckM, cx, H - 0.3, bz);

  // --- barandales altos (postes + 2 pasamanos) en rampas y plataforma
  const surf = (x) => {
    const d = Math.abs(x - cx);
    if (d <= PH) return H;
    const t = (d - PH) / RLEN;
    return t >= 1 ? 0 : H * (1 - t);
  };
  [-1, 1].forEach(s => {
    const zr = bz + s * (HW - 0.08);
    // postes cada ~2 m a lo largo de todo el puente
    for (let x = x0 + 0.6; x <= x1 - 0.3; x += 2) {
      const sy = surf(x);
      if (sy < 0.15) continue;
      brBox(g, 0.14, 1.35, 0.14, railM, x, sy + 0.62, zr);
    }
    // pasamanos siguiendo la pendiente (rampas) y recto (plataforma)
    const segs = [[x0, cx - PH], [cx - PH, cx + PH], [cx + PH, x1]];
    segs.forEach(([xa, xb], si) => {
      [0.75, 1.25].forEach(hh => {
        brBeam(g, xa, surf(xa) + hh, xb, surf(xb) + hh, zr, 0.12, si === 1 ? topM : railM);
      });
    });
  });

  // --- letreros "🌉 Puente seguro" en ambas entradas (a un lado, sin estorbar)
  if (typeof addSign3D === 'function') {
    const fakeLvl = { group: g };
    addSign3D(fakeLvl, x0 - 2.6, 0, bz + 3.4, ['🌉 Puente seguro', 'Sube por la rampa →'],
      { bg: '#0d4d1f', border: '#35c759', fg: '#ffffff', pw: 5.2, ph: 1.8, poleH: 2.1, ry: -Math.PI / 2 });
    addSign3D(fakeLvl, x1 + 2.6, 0, bz + 3.4, ['🌉 Puente seguro', '← Sube por la rampa'],
      { bg: '#0d4d1f', border: '#35c759', fg: '#ffffff', pw: 5.2, ph: 1.8, poleH: 2.1, ry: Math.PI / 2 });
  }

  group.add(g);

  // --- colisiones registradas en el nivel
  if (lvl && Array.isArray(lvl.platforms)) {
    // plataforma: caja real (se puede caminar encima; por debajo queda libre la calle)
    lvl.platforms.push({ x: cx, z: bz, w: PH * 2, h: 0.6, d: HW * 2, topY: H, solid: true, kind: 'bridge' });
    // muros laterales invisibles siguiendo la rampa: evitan atravesar el cuerpo
    // de la rampa por los lados (los barandales visuales van justo encima)
    [1, -1].forEach(side => {
      const xa0 = cx + side * PH, xa1 = cx + side * (PH + RLEN);
      const N = 6, seg = RLEN / N;
      for (let i = 0; i < N; i++) {
        const sxa = xa0 + side * i * seg, sxb = xa0 + side * (i + 1) * seg;
        const outX = sxb; // extremo exterior del tramo (más bajo, lejos del centro)
        const top = surf(outX) + 1.1;
        if (top < 0.6) continue;
        [-1, 1].forEach(s => {
          lvl.platforms.push({
            x: (sxa + sxb) / 2, z: bz + s * (HW + 0.18),
            w: seg + 0.25, h: top, d: 0.35, topY: top,
            solid: true, kind: 'bridge-wall',
          });
        });
      }
    });
  }

  Bridges.list.push({ idx, cx, bz, x0, x1 });
}

/* ---------- API principal ---------- */
Bridges.buildForLevel = function (idx, group) {
  this.clear();
  const spots = BRIDGE_SPOTS[idx];
  if (!spots || !group) return 0;
  const lvl = (typeof LEVEL !== 'undefined') ? LEVEL : null;
  spots.forEach(([cx, bz]) => brBuildOne(group, lvl, cx, bz, idx));
  return spots.length;
};
