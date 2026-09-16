/* castle.js — 🏰 CASTILLO GEAYI (GEAYI — Obby Xtreme 3D)
   Castillo 100% original, explorable por dentro, en el mundo ESPAÑA (idx 7).
   - Murallas con pasarela, 4 torres en las esquinas, patio central,
     salón del trono (trono de bloques, diseño propio), comedor con mesa
     larga y mirador en lo alto.
   - Puerta principal a NIVEL DEL SUELO (abierta, sin bloquear). Para subir a
     las murallas/mirador hay una RAMPA desde el suelo (≈15°, sin saltos:
     la regla dura es que lo elevado es opcional y con rampa). Barandales en
     el mirador; caerse da al suelo sin daño (castillo bajo, ~12 m máx).
   - Estandartes GEAYI (diseño propio), antorchas con luz cálida, letrero de
     bienvenida y 3 cofres decorativos (dan 5-10 🪙 una vez por visita; sin
     loot pay-to-win).
   - La rampa usa el mismo patrón probado de bridges.js: "heightfield" que
     envuelve moveAxis() (sin tocar player.js) para SUBIR CAMINANDO.
   COORDENADAS (verificadas por script contra plataformas, carros, NPCs y
   decoraciones del mundo España):
   - Centro (70, 55), explanada x∈[39,101], z∈[27,83]: libre de edificios,
     la ruta extrema queda en z≈-5 y el aeropuerto en (12, 8).
   INTEGRACIÓN (sin editar archivos existentes salvo lo indicado):
   1. <script src="castle.js"></script> en index.html (antes de game.js).
   2. En boot(): if (typeof Castle!=='undefined') Castle.init();
   3. En startLevel(i), tras LEVEL = buildLevel(i):
      if (typeof Castle!=='undefined') Castle.buildForLevel(i, LEVEL.group);
   4. En loop(): Castle.update(dt) (cofres por proximidad, antorchas).
   REGLAS: no ejecuta DOM al cargar; solo expone Castle.init()/buildForLevel()/update().
*/
'use strict';

/* ================= diseño ================= */
const CASTLE_IDX = 7;            // 🇪🇸 ESPAÑA
const CASTLE_CX = 70, CASTLE_CZ = 55;
const CASTLE_WALL_H = 6;         // altura de murallas (pasarela a y=6)
const CASTLE_RAMP = {            // rampa este: de (84,0,70) a (84,6,48), 7 m de ancho
  x0: 80.5, x1: 87.5, zA: 70, zB: 48, yA: 0, yB: 6,
};
const CASTLE_RAMP_ANG = Math.atan2(6, 22); // ≈15.3° (≤20°: caminable)

const Castle = {
  ramps: [],        // descriptores de rampa para el heightfield
  chests: [],       // cofres del nivel actual
  flames: [],       // llamas de antorcha (parpadeo)
  _wrapped: false,  // moveAxis ya envuelto
  _geo: {},         // geometrías reutilizadas (Android)
  _mat: {},         // materiales reutilizados por color
  _tex: {},         // texturas reutilizadas
  built: false,
  welcomed: false,
};

/* ---------- i18n (es/en) ---------- */
if (typeof addStrings === 'function') {
  addStrings('es', {
    'castle.welcome1': '🏰 ¡Bienvenido al CASTILLO GEAYI!',
    'castle.welcome2': 'Explora el trono, el comedor y el mirador',
    'castle.throne': '👑 SALÓN DEL TRONO',
    'castle.dining': '🍽️ COMEDOR REAL',
    'castle.lookout': '🔭 MIRADOR',
    'castle.ramp': '⬆️ Sube por la rampa',
    'castle.ramp2': '🔭 al MIRADOR',
    'castle.gate': '🚪 PUERTA PRINCIPAL',
    'castle.chest': '+{n} 🪙 ¡Cofre del castillo!',
  });
  addStrings('en', {
    'castle.welcome1': '🏰 Welcome to GEAYI CASTLE!',
    'castle.welcome2': 'Explore the throne, dining hall and lookout',
    'castle.throne': '👑 THRONE ROOM',
    'castle.dining': '🍽️ ROYAL DINING HALL',
    'castle.lookout': '🔭 LOOKOUT',
    'castle.ramp': '⬆️ Take the ramp up',
    'castle.ramp2': '🔭 to the LOOKOUT',
    'castle.gate': '🚪 MAIN GATE',
    'castle.chest': '+{n} 🪙 Castle chest!',
  });
}

/* ---------- caché de geometrías / materiales / texturas ---------- */
function csGeo(key, make) {
  if (!Castle._geo[key]) Castle._geo[key] = make();
  return Castle._geo[key];
}
function csMat(color, emissive, ei, rough) {
  const key = color + '|' + (emissive || 0) + '|' + (ei || 0) + '|' + (rough == null ? 0.7 : rough);
  if (!Castle._mat[key]) {
    Castle._mat[key] = new THREE.MeshStandardMaterial({
      color, roughness: rough == null ? 0.7 : rough, metalness: 0.08,
      emissive: emissive || 0x000000, emissiveIntensity: ei || 0,
    });
  }
  return Castle._mat[key];
}
function csBox(parent, w, h, d, mat, x, y, z, ry) {
  const m = new THREE.Mesh(csGeo('box1', () => new THREE.BoxGeometry(1, 1, 1)), mat);
  m.scale.set(w, h, d); m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
/* estandarte GEAYI: diseño propio (campo granate, borde dorado, "GEAYI" + 5 estrellas) */
function csBannerTex() {
  if (Castle._tex.banner) return Castle._tex.banner;
  if (typeof canvasTex !== 'function') return null;
  Castle._tex.banner = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#7a1f1f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffc400'; g.lineWidth = 10; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#ffc400'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 30px "Trebuchet MS", sans-serif';
    'GEAYI'.split('').forEach((ch, i) => g.fillText(ch, w / 2, 44 + i * 30));
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) { // cinco estrellas como la bandera de Honduras
      const sx = 24 + i * 20, sy = h - 28;
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + k * (Math.PI * 2 / 5), a2 = a + Math.PI / 5;
        g.lineTo(sx + Math.cos(a) * 7, sy + Math.sin(a) * 7);
        g.lineTo(sx + Math.cos(a2) * 3, sy + Math.sin(a2) * 3);
      }
      g.closePath(); g.fill();
    }
  });
  return Castle._tex.banner;
}
function csBanner(parent, x, y, z, ry, w, h) {
  const tex = csBannerTex();
  const mat = tex
    ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide })
    : csMat(0x7a1f1f, 0x2a0808, 0.3);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w || 2.2, h || 4.4), mat);
  m.position.set(x, y, z); m.rotation.y = ry || 0;
  parent.add(m);
  return m;
}
/* antorcha: soporte + llama (parpadea en update) + opcional luz cálida */
function csTorch(parent, x, y, z, withLight) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  csBox(g, 0.16, 1.1, 0.16, csMat(0x5a3a1e, 0x1a0e04, 0.2), 0, 0.55, 0);
  csBox(g, 0.3, 0.18, 0.3, csMat(0x3a2410, 0x000000, 0), 0, 1.12, 0);
  const flame = new THREE.Mesh(
    csGeo('flame', () => new THREE.ConeGeometry(0.22, 0.55, 8)),
    new THREE.MeshBasicMaterial({ color: 0xff9d2e }));
  flame.position.set(0, 1.5, 0);
  flame.userData.phase = Math.random() * 6.28;
  g.add(flame);
  Castle.flames.push(flame);
  if (withLight && typeof THREE.PointLight === 'function') {
    const pl = new THREE.PointLight(0xffb45e, 1.1, 16);
    pl.position.set(0, 1.8, 0); g.add(pl);
  }
  parent.add(g);
  return g;
}
/* plataforma de colisión (registrada en LEVEL.platforms) */
function csPlat(lvl, x, z, w, d, topY, h) {
  const p = {
    x, z, w, d, topY, h: h == null ? topY : h,
    kind: 'castle', solid: true, move: null, pad: null, ghost: null,
    baseX: x, baseZ: z, dx: 0, dz: 0, phase: 0,
  };
  if (lvl && Array.isArray(lvl.platforms)) lvl.platforms.push(p);
  return p;
}

/* ---------- altura de la rampa (heightfield) ---------- */
Castle.groundAt = function (x, z) {
  for (const r of this.ramps) {
    if (x < r.x0 || x > r.x1) continue;
    const z0 = Math.min(r.zA, r.zB), z1 = Math.max(r.zA, r.zB);
    if (z < z0 || z > z1) continue;
    const t = (z - r.zA) / (r.zB - r.zA);
    return r.yA + (r.yB - r.yA) * t;
  }
  return null;
};

/* ---------- física: envolver moveAxis para subir la rampa caminando ----------
   Encadena con el envoltorio de Bridges si ya existe (se instala después). */
let _csPrevMoveAxis = null;
function csInstallPhysics() {
  if (Castle._wrapped || typeof moveAxis !== 'function') return false;
  _csPrevMoveAxis = moveAxis;
  const prev = _csPrevMoveAxis;
  moveAxis = function (axis, delta) { // eslint-disable-line no-global-assign
    if (axis === 'y' && delta < 0 && Castle.ramps.length &&
        typeof Player !== 'undefined' && Player && Player.pos) {
      const g = Castle.groundAt(Player.pos.x, Player.pos.z);
      if (g != null) {
        const py = Player.pos.y;
        if (py >= g - 0.09 && py + delta <= g) {
          Player.pos.y = g; Player.vel.y = 0; Player.grounded = true;
          Player.groundPlat = { topY: g, kind: 'castle', solid: true, move: null };
          return;
        }
      }
    }
    prev(axis, delta);
  };
  Castle._wrapped = true;
  return true;
}

Castle.init = function () {
  csInstallPhysics(); // instala el envoltorio una sola vez (idempotente)
  return true;
};

Castle.clear = function () {
  this.ramps = []; this.chests = []; this.flames = [];
  this.built = false; this.welcomed = false;
};

/* ================= construcción ================= */
Castle.buildForLevel = function (idx, group) {
  this.clear();
  if (idx !== CASTLE_IDX || !group) return 0;
  const lvl = (typeof LEVEL !== 'undefined') ? LEVEL : null;
  const g = new THREE.Group();
  const stoneM = csMat(0xcfc3a8, 0x4a4238, 0.18);
  const stoneDk = csMat(0xa89a80, 0x3a3228, 0.15);
  const woodM = csMat(0x7a5230, 0x2a1a08, 0.15);
  const goldM = csMat(0xffc400, 0x7a5a00, 0.5, 0.35);
  const redM = csMat(0x8a1f2d, 0x3a0a10, 0.25);
  const H = CASTLE_WALL_H;

  /* --- explanada del castillo (topY=0, pegada a la losa de la ciudad en x=39) --- */
  csPlat(lvl, CASTLE_CX, CASTLE_CZ, 62, 56, 0, 1);
  csBox(g, 62, 1, 56, csMat(0xbb8055, 0x4a2f18, 0.12), CASTLE_CX, -0.5, CASTLE_CZ);

  /* --- murallas (cajas con colisión; la parte alta es la pasarela) ---
     Puerta principal en el muro OESTE (x=50), mirando a la ciudad: hueco z∈[52,58] */
  const wall = (x, z, w, d) => {
    csPlat(lvl, x, z, w, d, H, H);
    csBox(g, w, H, d, stoneM, x, H / 2, z);
    // almenas decorativas en el borde exterior
    const n = Math.max(2, Math.floor(Math.max(w, d) / 2.4));
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const bx = w >= d ? x - w / 2 + 1 + t * (w - 2) : x;
      const bz = w >= d ? z : z - d / 2 + 1 + t * (d - 2);
      const ex = w >= d ? bx : bx + (x < CASTLE_CX ? -w / 2 + 0.2 : w / 2 - 0.2);
      const ez = w >= d ? bz + (z < CASTLE_CZ ? -d / 2 + 0.2 : d / 2 - 0.2) : bz;
      csBox(g, 0.9, 0.8, 0.5, stoneDk, ex, H + 0.4, ez);
    }
  };
  wall(70, 75, 40, 3);            // sur
  wall(70, 35, 40, 4);            // norte (mirador: 4 m de ancho)
  wall(90, 55, 4, 40);            // este (pasarela ancha del mirador)
  wall(50, 43.5, 3, 17);          // oeste norte (z∈[35,52])
  wall(50, 66.5, 3, 17);          // oeste sur (z∈[58,75])
  csPlat(lvl, 50, 55, 3, 6, H, 0.6); // pasarela sobre la puerta (losa alta: no bloquea el paso)
  csBox(g, 3, 0.6, H, stoneM, 50, H - 0.3, 55);

  /* --- puerta principal: ABIERTA (arco alto, sin puerta que bloquee) --- */
  const pilM = csMat(0xbfb298, 0x4a4238, 0.2);
  [[50, 51], [50, 59]].forEach(([px, pz]) => {
    csPlat(lvl, px, pz, 1.6, 1.6, 7, 7);
    csBox(g, 1.6, 7, 1.6, pilM, px, 3.5, pz);
    csBox(g, 2, 0.5, 2, goldM, px, 7.2, pz);
    csTorch(g, px, 5.2, pz - 0.9, false);
  });
  csBox(g, 10, 1.4, 3.4, stoneDk, 50, 5.3, 55); // arco sobre el hueco (y∈[4.6,6])
  csBanner(g, 49, 4.6, 51, -Math.PI / 2, 1.8, 3.6);
  csBanner(g, 49, 4.6, 59, -Math.PI / 2, 1.8, 3.6);
  if (typeof addSign3D === 'function')
    addSign3D(lvl || { group: g }, 43, 0, 55, [T('castle.gate')], {
      bg: '#3a2b00', border: '#ffc400', fg: '#ffe9b0', pw: 4.6, ph: 1.6, poleH: 2, ry: -Math.PI / 2,
    });

  /* --- 4 torres en las esquinas (cilindro + techo cónico + estandarte) --- */
  [[50, 35], [90, 35], [50, 75], [90, 75]].forEach(([tx, tz]) => {
    csPlat(lvl, tx, tz, 6, 6, 12, 12);
    const tg = new THREE.Group(); tg.position.set(tx, 0, tz);
    const body = new THREE.Mesh(csGeo('twr', () => new THREE.CylinderGeometry(3.2, 3.5, 12, 12)), stoneM);
    body.position.y = 6; body.castShadow = true; body.receiveShadow = true; tg.add(body);
    const roof = new THREE.Mesh(csGeo('twrRoof', () => new THREE.ConeGeometry(4, 3.2, 12)), csMat(0x9e4a30, 0x3a1408, 0.2));
    roof.position.y = 13.6; roof.castShadow = true; tg.add(roof);
    g.add(tg);
    const dx = tx - CASTLE_CX, dz = tz - CASTLE_CZ, dl = Math.hypot(dx, dz);
    csBanner(g, tx + dx / dl * 3.35, 8, tz + dz / dl * 3.35, Math.atan2(dx, dz));
  });

  /* --- patio central: fuente decorativa --- */
  csPlat(lvl, 78, 62, 4.4, 4.4, 1, 1);
  const fg = new THREE.Group(); fg.position.set(78, 0, 62);
  const basin = new THREE.Mesh(csGeo('fount', () => new THREE.CylinderGeometry(2.2, 2.4, 1, 14)), stoneDk);
  basin.position.y = 0.5; basin.castShadow = true; fg.add(basin);
  const water = new THREE.Mesh(csGeo('fountW', () => new THREE.CylinderGeometry(1.9, 1.9, 0.15, 14)),
    csMat(0x4db8ff, 0x1a5a8a, 0.5, 0.25));
  water.position.y = 0.92; fg.add(water);
  const col = new THREE.Mesh(csGeo('fountC', () => new THREE.CylinderGeometry(0.35, 0.5, 1.8, 10)), stoneM);
  col.position.y = 1.6; fg.add(col);
  const top = new THREE.Mesh(csGeo('fountT', () => new THREE.CylinderGeometry(0.9, 0.7, 0.3, 10)), stoneDk);
  top.position.y = 2.6; fg.add(top);
  g.add(fg);

  /* --- alfombra roja: puerta → patio → salón del trono (visual) --- */
  csBox(g, 18, 0.06, 3, redM, 61, 0.03, 55);
  csBox(g, 3, 0.06, 9, redM, 70, 0.03, 50.5);

  /* --- salón del trono (norte interior, abierto al sur) --- */
  const tr = { x0: 60, x1: 80, z0: 38, z1: 46 };
  csPlat(lvl, 70, 38, 20, 1.5, 5, 5); csBox(g, 20, 5, 1.5, stoneM, 70, 2.5, 38);
  csPlat(lvl, 60, 42, 1.5, 8, 5, 5); csBox(g, 1.5, 5, 8, stoneM, 60, 2.5, 42);
  csPlat(lvl, 80, 42, 1.5, 8, 5, 5); csBox(g, 1.5, 5, 8, stoneM, 80, 2.5, 42);
  csBox(g, 21, 0.6, 9, woodM, 70, 5.6, 42); // techo
  // trono de bloques (diseño propio): escalones + asiento + respaldo alto con oro
  const th = new THREE.Group(); th.position.set(70, 0, 39.5);
  csBox(th, 4, 0.4, 3, stoneDk, 0, 0.2, 0);
  csBox(th, 3.4, 0.4, 2.6, stoneM, 0, 0.6, 0);
  csBox(th, 2.8, 0.4, 2.2, stoneDk, 0, 1.0, 0);
  csBox(th, 2.2, 0.7, 1.6, redM, 0, 1.55, 0.1);
  csBox(th, 2.4, 2.6, 0.5, redM, 0, 3.0, -0.7);
  csBox(th, 2.6, 0.35, 0.6, goldM, 0, 4.4, -0.7);
  csBox(th, 0.5, 1.1, 1.6, goldM, -1.3, 2.2, 0.1);
  csBox(th, 0.5, 1.1, 1.6, goldM, 1.3, 2.2, 0.1);
  g.add(th);
  csPlat(lvl, 70, 39.5, 3.2, 2.6, 2.2, 2.2);
  csTorch(g, 66, 0, 38.9, false); csTorch(g, 74, 0, 38.9, false);
  if (typeof THREE.PointLight === 'function') {
    const pl = new THREE.PointLight(0xffc47e, 1.2, 20); pl.position.set(70, 4, 42); g.add(pl);
  }
  if (typeof addSign3D === 'function')
    addSign3D(lvl || { group: g }, 63, 0, 47.5, [T('castle.throne')], {
      bg: '#4a1000', border: '#ffc400', fg: '#ffe9b0', pw: 5, ph: 1.7, poleH: 2,
    });

  /* --- comedor real (sur-oeste interior, abierto al este): mesa larga + bancas ---
     (al sur del eje de la puerta para no bloquear la entrada) */
  csPlat(lvl, 52, 65, 1.5, 14, 4.5, 4.5); csBox(g, 1.5, 4.5, 14, stoneM, 52, 2.25, 65);
  csPlat(lvl, 58, 58, 12, 1.5, 4.5, 4.5); csBox(g, 12, 4.5, 1.5, stoneM, 58, 2.25, 58);
  csPlat(lvl, 58, 72, 12, 1.5, 4.5, 4.5); csBox(g, 12, 4.5, 1.5, stoneM, 58, 2.25, 72);
  csBox(g, 13, 0.6, 15, woodM, 58, 5, 65); // techo
  csPlat(lvl, 58, 65, 2.4, 10, 1.07, 1.07); // mesa
  csBox(g, 2.4, 0.25, 10, woodM, 58, 0.95, 65);
  [[53.5], [62.5]].forEach(([lx]) => { csBox(g, 0.5, 0.85, 0.5, woodM, lx, 0.42, 61); csBox(g, 0.5, 0.85, 0.5, woodM, lx, 0.42, 69); });
  csPlat(lvl, 55.8, 65, 1, 9, 0.5, 0.5); csBox(g, 1, 0.5, 9, woodM, 55.8, 0.25, 65);
  csPlat(lvl, 60.2, 65, 1, 9, 0.5, 0.5); csBox(g, 1, 0.5, 9, woodM, 60.2, 0.25, 65);
  const plateM = csMat(0xf5f0e6, 0x000000, 0, 0.4);
  for (let i = 0; i < 4; i++) { // platos y copas sobre la mesa
    const pz = 61.5 + i * 2.3;
    const pl1 = new THREE.Mesh(csGeo('plate', () => new THREE.CylinderGeometry(0.35, 0.35, 0.08, 12)), plateM);
    pl1.position.set(57.4, 1.12, pz); g.add(pl1);
    const pl2 = pl1.clone(); pl2.position.x = 58.6; g.add(pl2);
    const cup = new THREE.Mesh(csGeo('cup', () => new THREE.CylinderGeometry(0.12, 0.1, 0.3, 8)), goldM);
    cup.position.set(58, 1.22, pz + 0.7); g.add(cup);
  }
  csTorch(g, 53, 0, 58.9, false); csTorch(g, 53, 0, 71.1, false);
  if (typeof THREE.PointLight === 'function') {
    const pl = new THREE.PointLight(0xffc47e, 1.1, 18); pl.position.set(58, 3.5, 65); g.add(pl);
  }
  if (typeof addSign3D === 'function')
    addSign3D(lvl || { group: g }, 65.5, 0, 65, [T('castle.dining')], {
      bg: '#0d4d1f', border: '#ffc400', fg: '#ffe9b0', pw: 5, ph: 1.7, poleH: 2, ry: -Math.PI / 2,
    });

  /* --- RAMPA a las murallas (este interior): ≈15.3°, caminable sin saltar --- */
  const R = CASTLE_RAMP, rise = R.yB - R.yA, run = Math.abs(R.zB - R.zA);
  const rAng = Math.atan2(rise, run), rLen = Math.hypot(run, rise);
  const rw = R.x1 - R.x0, rcx = (R.x0 + R.x1) / 2, rcz = (R.zA + R.zB) / 2;
  const rampM = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.5, rLen), csMat(0xd9b380, 0x5a3a18, 0.2));
  rampM.position.set(rcx, rise / 2 - 0.25 * Math.cos(rAng), rcz);
  rampM.rotation.x = rAng; // el extremo +z (sur) queda abajo
  rampM.castShadow = true; rampM.receiveShadow = true;
  g.add(rampM);
  [-1, 1].forEach(s => { // bordillos de la rampa
    const c = new THREE.Mesh(csGeo('box1', () => new THREE.BoxGeometry(1, 1, 1)), csMat(0xffffff, 0x888888, 0.1));
    c.scale.set(0.18, 0.22, rLen); c.position.set(rcx + s * (rw / 2 - 0.05), rise / 2 + 0.1, rcz);
    c.rotation.x = rAng; g.add(c);
  });
  this.ramps.push({ x0: R.x0, x1: R.x1, zA: R.zA, zB: R.zB, yA: R.yA, yB: R.yB });
  // meseta plana (heightfield, sin bordes que bloqueen): une la rampa con la
  // pasarela del muro este. Es matemática, no un AABB, para que el paso de la
  // rampa inclinada a la meseta sea continuo y nada bloquee al caminante.
  this.ramps.push({ x0: 80.5, x1: 92, zA: 48, zB: 43, yA: 6, yB: 6 });
  csBox(g, 11.5, 0.6, 5, stoneDk, 86.25, H - 0.3, 45.5); // losa visual de la meseta
  csTorch(g, 80, 0, 71.5, false); // antorcha al pie de la rampa
  if (typeof addSign3D === 'function')
    addSign3D(lvl || { group: g }, 79.5, 0, 71.8, [T('castle.ramp'), T('castle.ramp2')], {
      bg: '#0d2a4d', border: '#7db8ff', fg: '#ffffff', pw: 5, ph: 2, poleH: 2, ry: Math.PI,
    });

  /* --- MIRADOR: pasarela del muro este con barandales --- */
  const railM = csMat(0xffffff, 0x555555, 0.12);
  const railTopM = csMat(0xffc400, 0x7a5a00, 0.3);
  const railX = 91.9;
  for (let z = 38; z <= 72; z += 2) csBox(g, 0.14, 1.2, 0.14, railM, railX, H + 0.6, z);
  [H + 0.75, H + 1.15].forEach((hy, bi) => {
    const beam = new THREE.Mesh(csGeo('box1', () => new THREE.BoxGeometry(1, 1, 1)), bi ? railTopM : railM);
    beam.scale.set(0.12, 0.1, 34.4); beam.position.set(railX, hy, 55); g.add(beam);
  });
  // barandal del descanso (borde norte, visual)
  for (let x = 81; x <= 91.5; x += 2) csBox(g, 0.14, 1.2, 0.14, railM, x, H + 0.6, 43.2);
  const beamN = new THREE.Mesh(csGeo('box1', () => new THREE.BoxGeometry(1, 1, 1)), railTopM);
  beamN.scale.set(11, 0.1, 0.12); beamN.position.set(86.25, H + 1.15, 43.2); g.add(beamN);
  // bancas y antorchas del mirador
  csBox(g, 1.6, 0.45, 0.6, woodM, 90, H + 0.22, 54);
  csBox(g, 1.6, 0.45, 0.6, woodM, 90, H + 0.22, 60);
  csTorch(g, 90, H, 46, true);
  csTorch(g, 90, H, 66, false);
  if (typeof THREE.PointLight === 'function') {
    const pl = new THREE.PointLight(0xffc47e, 1.0, 18); pl.position.set(90, H + 2.5, 56); g.add(pl);
  }
  if (typeof addSign3D === 'function')
    addSign3D(lvl || { group: g }, 90, H, 64, [T('castle.lookout')], {
      bg: '#0d2a4d', border: '#7db8ff', fg: '#ffffff', pw: 4.4, ph: 1.6, poleH: 1.6, ry: Math.PI / 2,
    });

  /* --- letrero de bienvenida (junto a la puerta, lado ciudad) --- */
  if (typeof addSign3D === 'function')
    addSign3D(lvl || { group: g }, 42.5, 0, 55, [T('castle.welcome1'), T('castle.welcome2')], {
      bg: '#7a1f1f', border: '#ffc400', fg: '#ffe9b0', colors: ['#ffc400', '#ffffff'],
      pw: 6.4, ph: 2.4, poleH: 2.2, ry: -Math.PI / 2,
    });

  /* --- cofres decorativos (5-10 🪙 una vez por visita) --- */
  const chestAt = (x, y, z) => {
    const cg = new THREE.Group(); cg.position.set(x, y, z);
    csBox(cg, 1.2, 0.7, 0.8, woodM, 0, 0.35, 0);
    csBox(cg, 1.24, 0.18, 0.84, goldM, 0, 0.72, 0);
    const lid = new THREE.Group(); lid.position.set(0, 0.8, -0.4);
    const lidM = new THREE.Mesh(csGeo('box1', () => new THREE.BoxGeometry(1, 1, 1)), woodM);
    lidM.scale.set(1.2, 0.4, 0.8); lidM.position.set(0, 0.2, 0.4);
    lidM.castShadow = true; lid.add(lidM); cg.add(lid);
    g.add(cg);
    this.chests.push({ x, y, z, lid, opened: false, opening: false, t: 0 });
  };
  chestAt(76, 0, 43);   // salón del trono
  chestAt(53.5, 0, 60.5); // comedor real
  chestAt(90, H, 50);   // mirador

  group.add(g);
  this.built = true;
  return 1;
};

/* ---------- abrir cofre por proximidad ---------- */
Castle.openChest = function (c) {
  c.opened = true; c.opening = true; c.t = 0;
  const n = 5 + Math.floor(Math.random() * 6); // 5-10 🪙
  if (typeof SAVE !== 'undefined') {
    SAVE.coins = (SAVE.coins || 0) + n;
    if (typeof persist === 'function') persist();
  }
  try {
    const el = (typeof $ === 'function') ? $('hud-coins') : null;
    if (el) el.textContent = SAVE.coins;
  } catch (e) {}
  if (typeof Audio2 !== 'undefined' && Audio2.coin) { try { Audio2.coin(); } catch (e) {} }
  if (typeof toast === 'function' && typeof tp === 'function') toast(tp('castle.chest', { n }));
  if (typeof Particles !== 'undefined' && Particles.burst) {
    try { Particles.burst(c.x, c.y + 1.2, c.z, [0xffd23f, 0xffe95e, 0xffffff], 12, 3); } catch (e) {}
  }
};

/* ---------- update por cuadro ---------- */
Castle.update = function (dt) {
  if (!this.built) return;
  const t = (typeof levelTime !== 'undefined') ? levelTime : 0;
  for (const f of this.flames) { // parpadeo de antorchas
    const s = 1 + Math.sin(t * 13 + (f.userData.phase || 0)) * 0.14;
    f.scale.set(s, 1 + (s - 1) * 1.6, s);
  }
  for (const c of this.chests) { // animación de tapa
    if (c.opening && c.lid) {
      c.t += dt;
      const k = Math.min(1, c.t / 0.6);
      c.lid.rotation.x = -1.9 * k;
      if (k >= 1) c.opening = false;
    }
  }
  if (typeof Player === 'undefined' || !Player.pos) return;
  if (typeof MODE !== 'undefined' && MODE !== 'play') return;
  for (const c of this.chests) { // cofres: una vez por visita
    if (c.opened) continue;
    const dx = Player.pos.x - c.x, dz = Player.pos.z - c.z, dy = (Player.pos.y + 1) - (c.y + 0.8);
    if (dx * dx + dz * dz < 5.5 && Math.abs(dy) < 2.5) this.openChest(c);
  }
  if (!this.welcomed) { // bienvenida al entrar al recinto
    const dx = Player.pos.x - CASTLE_CX, dz = Player.pos.z - CASTLE_CZ;
    if (dx * dx + dz * dz < 30 * 30) {
      this.welcomed = true;
      if (typeof toast === 'function' && typeof T === 'function') toast(T('castle.welcome1'));
    }
  }
};
