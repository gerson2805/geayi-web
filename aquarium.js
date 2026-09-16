/* ============================================================
   🐠 ACUARIO GEAYI — atracción del Parque GEAYI (mundo 4 · Immokalee, idx 3)
   100% original GEAYI, todo procedural, nada copiado.

   Edificio con paredes de vidrio (material transparente) y 3
   tanques con agua: PECES de colores, TIBURONES y TORTUGAS
   nadando con movimiento sinusoidal (aletas y colas que se mueven).
   Interior entrable: la cámara entra con el jugador (registro en
   INTERIORS + techo ocultable en CEILINGS, como hollowBuilding).

   Ubicación: dentro del Parque GEAYI (themepark.js), rectángulo
   x∈[85,101], z∈[-87.5,-80.5], centro (93,-84). La montaña rusa
   del parque pasa por encima del techo (riel a y≈8, techo a 4.2);
   themepark.js no pone soportes dentro de este rectángulo.
   (Zona del parque verificada libre en themepark.js.)

   Integración (la hace el coordinador):
   1. <script src="aquarium.js"></script> en index.html (después de
      themepark.js, antes de game.js).
   2. En startLevel(): if (typeof Aquarium!=='undefined') Aquarium.buildForLevel(i, LEVEL.group);
   3. En loop() (MODE==='play'): if (typeof Aquarium!=='undefined' && Aquarium.update) Aquarium.update(dt);
   Sin DOM al cargar. Sin luces reales nuevas. Geometrías y
   materiales compartidos (caché propia, patrón de waterpark.js).
   ============================================================ */
'use strict';

if (typeof addStrings === 'function') {
  addStrings('es', {
    'aq.name': '🐠 ACUARIO GEAYI',
    'aq.fish': 'PECES TROPICALES',
    'aq.shark': 'TIBURONES',
    'aq.turtle': 'TORTUGAS MARINAS',
  });
  addStrings('en', {
    'aq.name': '🐠 GEAYI AQUARIUM',
    'aq.fish': 'TROPICAL FISH',
    'aq.shark': 'SHARKS',
    'aq.turtle': 'SEA TURTLES',
  });
}
const aqT = (k) => (typeof T === 'function' ? T(k) : k);

const AQ_IDX = 3; // solo Immokalee (dentro del Parque GEAYI)
const AQ = { x: 93, z: -84, w: 16, d: 7, h: 4.2 }; // x∈[85,101], z∈[-87.5,-80.5]

/* ---------- caché Android ---------- */
const _aqGeo = {}, _aqMat = {};
function aqGeo(key, make) {
  if (typeof THREE === 'undefined') return null;
  if (!_aqGeo[key]) { try { _aqGeo[key] = make(); } catch (e) { return null; } }
  return _aqGeo[key];
}
function aqMat(color, extra) {
  const key = color + '|' + (extra || '');
  if (!_aqMat[key] && typeof THREE !== 'undefined') {
    try {
      _aqMat[key] = new THREE.MeshStandardMaterial(Object.assign({
        color, roughness: 0.55, metalness: 0.1,
      }, extra ? JSON.parse(extra) : {}));
    } catch (e) { return null; }
  }
  return _aqMat[key];
}
function aqGlassMat() { // vidrio compartido
  return aqMat(0x9fd8ff, '{"transparent":true,"opacity":0.32,"roughness":0.15,"metalness":0.1}');
}
function aqBox(parent, w, h, d, mat, x, y, z, ry) {
  if (typeof THREE === 'undefined') return null;
  const m = new THREE.Mesh(aqGeo('unitbox', () => new THREE.BoxGeometry(1, 1, 1)), mat);
  m.scale.set(w, h, d); m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  parent.add(m);
  return m;
}
function aqSolid(x, z, topY, w, h, d) {
  try {
    if (typeof LEVEL !== 'undefined' && LEVEL && Array.isArray(LEVEL.platforms)) {
      LEVEL.platforms.push({ x, z, topY, w, h, d, kind: 'wall', solid: true });
    }
  } catch (e) {}
}
function aqSignTex(main, sub) {
  if (typeof document === 'undefined') return null;
  try {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#0a4d8c'; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#7df9ff'; g.lineWidth = 10; g.strokeRect(12, 12, 488, 232);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 60px "Trebuchet MS",sans-serif';
    g.fillText(main, 256, sub ? 96 : 128);
    if (sub) { g.font = '700 38px "Trebuchet MS",sans-serif'; g.fillStyle = '#7df9ff'; g.fillText(sub, 256, 182); }
    return new THREE.CanvasTexture(c);
  } catch (e) { return null; }
}

const Aquarium = {
  built: false, t: 0,
  creatures: [], // {grp, sw:{kind, cx,cy,cz, rx,rz,y, a,spd,dir, ph, tail,flips,body,tf}}
  waterMat: null,
};

/* ================= criaturas procedurales (diseño original) ================= */
function aqMakeFish(color) {
  const g = new THREE.Group();
  const bm = aqMat(color);
  const body = new THREE.Mesh(aqGeo('fishbody', () => new THREE.SphereGeometry(0.32, 10, 8)), bm);
  body.scale.set(1.5, 0.75, 0.6); g.add(body);
  const tailP = new THREE.Group(); tailP.position.set(-0.44, 0, 0); g.add(tailP);
  const tail = new THREE.Mesh(aqGeo('fishtail', () => new THREE.ConeGeometry(0.17, 0.38, 6)), bm);
  tail.rotation.z = Math.PI / 2; tail.position.x = -0.18; tail.scale.set(1, 1, 0.35); tailP.add(tail);
  const fin = new THREE.Mesh(aqGeo('fishfin', () => new THREE.ConeGeometry(0.1, 0.24, 4)), aqMat(0xffffff));
  fin.position.set(0.05, 0.26, 0); fin.scale.set(1, 1, 0.35); g.add(fin);
  const eyeM = aqMat(0x101418);
  [-1, 1].forEach(s => {
    const e = new THREE.Mesh(aqGeo('fisheye', () => new THREE.SphereGeometry(0.05, 6, 6)), eyeM);
    e.position.set(0.3, 0.08, s * 0.16); g.add(e);
  });
  g.userData.parts = { tail: tailP, body };
  return g;
}
function aqMakeShark() {
  const g = new THREE.Group();
  const bm = aqMat(0x7d94a8), dm = aqMat(0x3d4f5f);
  const body = new THREE.Mesh(aqGeo('sharkbody', () => new THREE.SphereGeometry(0.5, 12, 10)), bm);
  body.scale.set(2.1, 0.72, 0.55); g.add(body);
  const snout = new THREE.Mesh(aqGeo('sharkt', () => new THREE.ConeGeometry(0.3, 0.5, 8)), bm);
  snout.rotation.z = -Math.PI / 2; snout.position.set(1.15, -0.02, 0); snout.scale.set(1, 1, 0.7); g.add(snout);
  const tailP = new THREE.Group(); tailP.position.set(-1.0, 0, 0); g.add(tailP);
  const tf1 = new THREE.Mesh(aqGeo('sharkfin', () => new THREE.ConeGeometry(0.16, 0.55, 6)), dm);
  tf1.position.set(-0.2, 0.24, 0); tf1.scale.set(1, 1, 0.3); tailP.add(tf1);
  const tf2 = new THREE.Mesh(aqGeo('sharkfin', () => new THREE.ConeGeometry(0.14, 0.45, 6)), dm);
  tf2.rotation.z = Math.PI; tf2.position.set(-0.2, -0.2, 0); tf2.scale.set(1, 1, 0.3); tailP.add(tf2);
  const dor = new THREE.Mesh(aqGeo('sharkfin', () => new THREE.ConeGeometry(0.16, 0.5, 6)), dm);
  dor.position.set(0.15, 0.42, 0); dor.scale.set(1, 1, 0.3); g.add(dor);
  [-1, 1].forEach(s => {
    const pf = new THREE.Mesh(aqGeo('sharkfin', () => new THREE.ConeGeometry(0.12, 0.4, 6)), dm);
    pf.rotation.x = s * 1.1; pf.position.set(0.35, -0.25, s * 0.25); pf.scale.set(1, 1, 0.4); g.add(pf);
  });
  const eyeM = aqMat(0x101418);
  [-1, 1].forEach(s => {
    const e = new THREE.Mesh(aqGeo('fisheye', () => new THREE.SphereGeometry(0.05, 6, 6)), eyeM);
    e.position.set(0.85, 0.12, s * 0.2); g.add(e);
  });
  g.userData.parts = { tail: tailP, body };
  return g;
}
function aqMakeTurtle() {
  const g = new THREE.Group();
  const shM = aqMat(0x4a7c3a), skM = aqMat(0x8fce6e);
  const shell = new THREE.Mesh(
    aqGeo('tshell', () => new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), shM);
  shell.scale.set(1, 0.75, 1.25); shell.position.y = 0.1; g.add(shell);
  aqBox(g, 0.55, 0.12, 0.8, skM, 0, 0.02, 0); // pancita
  const head = new THREE.Mesh(aqGeo('fisheye', () => new THREE.SphereGeometry(0.13, 8, 8)), skM);
  head.position.set(0, 0.18, 0.62); g.add(head);
  const flips = [];
  [[-0.35, 0.3, 1], [0.35, 0.3, -1], [-0.3, -0.35, 1], [0.3, -0.35, -1]].forEach(([ox, oz, s]) => {
    const piv = new THREE.Group(); piv.position.set(ox, 0.05, oz); g.add(piv);
    aqBox(piv, 0.34, 0.06, 0.22, skM, s * 0.2, 0, 0); // aleta
    flips.push(piv);
  });
  g.userData.parts = { flips, body: shell };
  return g;
}

/* ================= tanque ================= */
function aqBuildTank(g, lx, lz, w, h, d, label) {
  const grp = new THREE.Group(); grp.position.set(AQ.x + lx, 0, AQ.z + lz); g.add(grp);
  const glassM = aqGlassMat(), baseM = aqMat(0x274b63), sandM = aqMat(0xe8d9a0);
  const T = 0.08;
  aqBox(grp, w, 0.5, d, baseM, 0, 0.25, 0);                       // mueble base
  aqBox(grp, w - 0.2, 0.14, d - 0.2, sandM, 0, 0.57, 0);          // arena
  aqBox(grp, w, h, T, glassM, 0, 0.5 + h / 2, -d / 2);            // vidrios
  aqBox(grp, w, h, T, glassM, 0, 0.5 + h / 2, d / 2);
  aqBox(grp, T, h, d, glassM, -w / 2, 0.5 + h / 2, 0);
  aqBox(grp, T, h, d, glassM, w / 2, 0.5 + h / 2, 0);
  aqBox(grp, w + 0.15, 0.12, d + 0.15, baseM, 0, 0.5 + h + 0.06, 0); // marco superior
  const wmat = aqMat(0x1a9fd4, '{"transparent":true,"opacity":0.42,"roughness":0.2}');
  if (!Aquarium.waterMat) Aquarium.waterMat = wmat;
  aqBox(grp, w - 0.25, h - 0.35, d - 0.25, wmat, 0, 0.5 + (h - 0.35) / 2 + 0.1, 0); // agua
  // corales y rocas (procedurales)
  const corM = [aqMat(0xff6f91), aqMat(0xff9d3c), aqMat(0xb06fff)];
  for (let i = 0; i < 3; i++) {
    const cxp = -w / 2 + 0.7 + i * (w - 1.4) / 2, czp = (i % 2 ? -1 : 1) * (d / 2 - 0.7);
    const cor = new THREE.Mesh(aqGeo('coral', () => new THREE.ConeGeometry(0.22, 0.7 + (i % 2) * 0.3, 7)), corM[i % 3]);
    cor.position.set(cxp, 0.95, czp); grp.add(cor);
    const rock = new THREE.Mesh(aqGeo('rock', () => new THREE.IcosahedronGeometry(0.28, 0)), aqMat(0x6b7a8a));
    rock.position.set(cxp + 0.5, 0.75, -czp * 0.6); grp.add(rock);
  }
  // etiqueta del tanque
  try {
    const tex = aqSignTex(label, '');
    if (tex && typeof THREE !== 'undefined') {
      const s = new THREE.Mesh(aqGeo('aqlabel', () => new THREE.PlaneGeometry(2.6, 1.0)),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      s.position.set(0, 0.5 + h + 0.65, d / 2 + 0.06); grp.add(s);
    }
  } catch (e) {}
  aqSolid(AQ.x + lx, AQ.z + lz, 0.5 + h, w, 0.5 + h, d);
  return grp;
}

/* ================= edificio ================= */
function aqBuildHouse(g) {
  const { x: cx, z: cz, w: W, d: D, h: H } = AQ;
  const hw = W / 2, hd = D / 2, doorW = 2.2;
  const glassM = aqGlassMat();
  const colM = aqMat(0x0a4d8c, 0x062a4d, 0.3);   // columnas azul profundo
  const baseM = aqMat(0x0e5f8a);                  // zócalo
  const roofM = aqMat(0x083a5e, 0x041e33, 0.35);
  // piso
  aqBox(g, W, 0.12, D, aqMat(0xd9cfae), cx, 0.0, cz);
  // columnas en las esquinas
  [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]].forEach(([ox, oz]) => {
    aqBox(g, 0.55, H, 0.55, colM, cx + ox, H / 2, cz + oz);
    aqSolid(cx + ox, cz + oz, H, 0.6, H, 0.6);
  });
  // zócalo + vidrio por tramo; la cara norte (z=-80.5) lleva la puerta
  const seg = (w, h, d, x, y, z) => {
    aqBox(g, w, 0.9, d, baseM, x, 0.45, z);
    aqBox(g, w, h - 0.9, d, glassM, x, 0.9 + (h - 0.9) / 2, z);
    aqSolid(x, z, h, Math.max(w, 0.3), h, Math.max(d, 0.3));
  };
  const nz = cz + hd; // cara norte (frente a la taquilla)
  const segL = (W - doorW) / 2 - 0.55;
  seg(segL, H, 0.18, cx - doorW / 2 - segL / 2, 0, nz); // norte izq
  seg(segL, H, 0.18, cx + doorW / 2 + segL / 2, 0, nz); // norte der
  seg(W - 1.1, H, 0.18, cx, 0, cz - hd);                // sur
  seg(0.18, H, D - 1.1, cx - hw, 0, cz);                // oeste
  seg(0.18, H, D - 1.1, cx + hw, 0, cz);                // este
  // marco de puerta + puerta ABIERTA
  aqBox(g, 0.22, 2.9, 0.5, colM, cx - doorW / 2, 1.45, nz);
  aqBox(g, 0.22, 2.9, 0.5, colM, cx + doorW / 2, 1.45, nz);
  aqBox(g, doorW + 0.44, 0.3, 0.5, colM, cx, 3.05, nz);
  const hinge = new THREE.Group(); hinge.position.set(cx - doorW / 2 + 0.05, 0, nz); hinge.rotation.y = -1.9; g.add(hinge);
  aqBox(hinge, doorW - 0.15, 2.7, 0.07, aqMat(0x0e5f8a), (doorW - 0.15) / 2, 1.4, 0);
  // techo (se oculta cuando la cámara entra)
  const roof = aqBox(g, W + 0.8, 0.35, D + 0.8, roofM, cx, H + 0.175, cz);
  aqBox(g, W + 1.1, 0.18, D + 1.1, aqMat(0x7df9ff, 0x1a6a8a, 0.5), cx, H + 0.42, cz); // filo luminoso
  // letrero en la fachada norte
  try {
    const tex = aqSignTex(aqT('aq.name'), '');
    if (tex && typeof THREE !== 'undefined') {
      const s = new THREE.Mesh(aqGeo('aqsign', () => new THREE.PlaneGeometry(7, 2.1)),
        new THREE.MeshBasicMaterial({ map: tex }));
      s.position.set(cx, 3.1, nz + 0.15); g.add(s);
    }
  } catch (e) {}
  // interior entrable: la cámara entra con el jugador
  try {
    if (typeof INTERIORS !== 'undefined') {
      const zone = { cx, cz, hw: hw - 0.3, hd: hd - 0.3, h: H, ry: 0 };
      INTERIORS.push(zone);
      if (typeof CEILINGS !== 'undefined' && roof) CEILINGS.push({ m: roof, zone });
    }
  } catch (e) {}
}

/* inspección para tests (no afecta el juego) */
Aquarium.rect = AQ; Aquarium.worldIdx = AQ_IDX;

/* ================= API ================= */
Aquarium.buildForLevel = function (i, group) {
  Aquarium.built = false; Aquarium.creatures = []; Aquarium.t = 0;
  if (i !== AQ_IDX || !group || typeof THREE === 'undefined') return;
  try {
    aqBuildHouse(group);
    // tanque 1: peces (oeste)
    const t1 = aqBuildTank(group, -4.6, -0.6, 4.6, 2.2, 2.8, aqT('aq.fish'));
    const fishCols = [0xff6f00, 0xffd23f, 0x00e5ff, 0xff4d94, 0x7dff6a, 0xc86bff];
    fishCols.forEach((c, k) => {
      const f = aqMakeFish(c); t1.add(f);
      Aquarium.creatures.push({
        grp: f,
        sw: {
          kind: 'fish', a: (k / 6) * Math.PI * 2, rx: 1.5, rz: 0.85, y: 1.15 + (k % 3) * 0.3,
          spd: 0.9 + (k % 3) * 0.2, dir: k % 2 ? 1 : -1, ph: k * 1.3, tf: 8,
        },
      });
    });
    // tanque 2: tiburones (este)
    const t2 = aqBuildTank(group, 4.6, -0.6, 4.6, 2.6, 3.2, aqT('aq.shark'));
    for (let k = 0; k < 2; k++) {
      const s = aqMakeShark(); t2.add(s);
      Aquarium.creatures.push({
        grp: s,
        sw: {
          kind: 'shark', a: k * Math.PI, rx: 1.55, rz: 1.05, y: 1.5 + k * 0.35,
          spd: 0.5, dir: k ? 1 : -1, ph: k * 2.1, tf: 5,
        },
      });
    }
    // tanque 3: tortugas (centro-sur)
    const t3 = aqBuildTank(group, 0, 1.9, 4.2, 2.0, 2.4, aqT('aq.turtle'));
    for (let k = 0; k < 3; k++) {
      const tu = aqMakeTurtle(); t3.add(tu);
      Aquarium.creatures.push({
        grp: tu,
        sw: {
          kind: 'turtle', a: (k / 3) * Math.PI * 2, rx: 1.25, rz: 0.7, y: 1.0 + (k % 2) * 0.3,
          spd: 0.35, dir: 1, ph: k * 1.7, tf: 3,
        },
      });
    }
  } catch (e) { /* nunca romper el nivel */ }
  Aquarium.built = true;
};

Aquarium.update = function (dt) {
  if (!Aquarium.built) return;
  Aquarium.t += dt;
  const t = Aquarium.t;
  for (const c of Aquarium.creatures) {
    const u = c.sw, g = c.grp;
    if (!u || !g) continue;
    u.a += dt * u.spd * u.dir;
    const x = Math.cos(u.a) * u.rx, z = Math.sin(u.a) * u.rz;
    g.position.set(x, u.y + Math.sin(t * 0.9 + u.ph) * 0.12, z);
    const tx = -Math.sin(u.a) * u.rx * u.dir, tz = Math.cos(u.a) * u.rz * u.dir;
    g.rotation.y = Math.atan2(tx, tz);
    const P = g.userData.parts || {};
    if (P.tail) P.tail.rotation.y = Math.sin(t * u.tf + u.ph) * 0.55; // cola/aleta: sinusoidal
    if (P.body && u.kind !== 'turtle') P.body.rotation.z = Math.sin(t * u.tf + u.ph) * 0.07;
    if (P.flips) P.flips.forEach((f, fi) => { f.rotation.z = Math.sin(t * 3.2 + u.ph + fi * 1.3) * 0.5; });
  }
  if (Aquarium.waterMat) Aquarium.waterMat.opacity = 0.42 + Math.sin(t * 1.4) * 0.05;
};
