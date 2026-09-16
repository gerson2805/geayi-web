/* zoo.js — 🦁 ZOOLÓGICO GEAYI (mundo 4 · Immokalee, idx 3)
   Zoológico visitable de entrada GRATIS: arco de entrada + taquilla, senderos
   y 6 recintos con cercas bajas (el jugador ve por encima pero no entra).
   Animales 100% originales de bloques (nada copiado): jirafas 🦒, leones 🦁,
   elefantes 🐘, cebras 🦓, monos 🐒 y flamencos 🦩, con animaciones baratas
   (cuello/trompa/saltos/pata). Letrero con nombre + dato curioso en cada
   recinto. Botón "🍎 ALIMENTAR" cerca de 4 recintos: +5 🪙 por recinto con
   cooldown de 2 minutos. Solo se construye en idx 3.
   Ubicación verificada (zona libre, score 0 en el escaneo de /tmp/scan3.js):
   rectángulo x∈[-198,-138], z∈[-118,-78] (esquina noroeste del mapa), lejos de
   la traila Tamps (-16,44), puentes (0,17)/(0,90), lote de carros (-30,128),
   estadio (12..48,-123..-67), playa, cine (100,30) y helipuerto (132,-88).
   REGLAS: no toca archivos existentes; expone Zoo.init/onLevelStart/
   onLevelEnd/buildForLevel/update para los hooks de game.js. Sin DOM al
   cargar. Sin saltos, sin premium, todo original. */
'use strict';

/* ================= i18n ================= */
addStrings('es', {
  'zoo.title': '🦁 ZOOLÓGICO GEAYI',
  'zoo.free': '🎟️ ENTRADA GRATIS',
  'zoo.feed': '🍎 ALIMENTAR',
  'zoo.fed': '😋 ¡Ñam! El animal comió feliz · +5 🪙',
  'zoo.cool': '⏳ Ese animal ya comió · vuelve en {t}',
  'zoo.welcome': '🦁 ¡Bienvenido al ZOOLÓGICO GEAYI! Entrada gratis 🎟️',
  'zoo.r.jirafa': '🦒 JIRAFAS', 'zoo.f.jirafa': 'Duermen solo 2 horas al día 😴',
  'zoo.r.leon': '🦁 LEONES', 'zoo.f.leon': 'Su rugido se escucha a 8 km 📢',
  'zoo.r.elefante': '🐘 ELEFANTES', 'zoo.f.elefante': 'Se hablan con vibraciones en el suelo 🌍',
  'zoo.r.cebra': '🦓 CEBRAS', 'zoo.f.cebra': 'Cada cebra tiene rayas únicas ✨',
  'zoo.r.mono': '🐒 MONOS', 'zoo.f.mono': 'Se ríen cuando juegan 😄',
  'zoo.r.flamenco': '🦩 FLAMENCOS', 'zoo.f.flamenco': 'Son rosados por lo que comen 🦐',
});
addStrings('en', {
  'zoo.title': '🦁 GEAYI ZOO',
  'zoo.free': '🎟️ FREE ENTRY',
  'zoo.feed': '🍎 FEED',
  'zoo.fed': '😋 Yum! The animal ate happily · +5 🪙',
  'zoo.cool': '⏳ That animal already ate · come back in {t}',
  'zoo.welcome': '🦁 Welcome to GEAYI ZOO! Free entry 🎟️',
  'zoo.r.jirafa': '🦒 GIRAFFES', 'zoo.f.jirafa': 'They sleep only 2 hours a day 😴',
  'zoo.r.leon': '🦁 LIONS', 'zoo.f.leon': 'Their roar is heard 8 km away 📢',
  'zoo.r.elefante': '🐘 ELEPHANTS', 'zoo.f.elefante': 'They talk through ground vibrations 🌍',
  'zoo.r.cebra': '🦓 ZEBRAS', 'zoo.f.cebra': 'Every zebra has unique stripes ✨',
  'zoo.r.mono': '🐒 MONKEYS', 'zoo.f.mono': 'They laugh when they play 😄',
  'zoo.r.flamenco': '🦩 FLAMINGOS', 'zoo.f.flamenco': 'They are pink because of what they eat 🦐',
});

/* ================= helpers propios (caché de materiales) ================= */
const _zooMatCache = new Map();
function zooMat(color, emissive, ei) {
  const key = color + '|' + (emissive || 0) + '|' + (ei || 0);
  let m = _zooMatCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color, roughness: 0.75, metalness: 0.05,
      emissive: emissive || 0x000000, emissiveIntensity: ei || 0
    });
    _zooMatCache.set(key, m);
  }
  return m;
}
function zooBox(parent, w, h, d, color, x, y, z, shadow) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), zooMat(color));
  m.position.set(x, y, z);
  if (shadow !== false) m.castShadow = true;
  parent.add(m);
  return m;
}
function zooTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return new THREE.CanvasTexture(c);
}
function zooSignTexture(title, fact) { // 2 líneas: nombre + dato curioso
  return zooTex(512, 200, (g, w, h) => {
    g.fillStyle = '#0d3a1f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    g.textAlign = 'center'; g.fillStyle = '#ffd23f';
    g.font = '900 52px "Trebuchet MS", sans-serif';
    g.fillText(title, w / 2, 78);
    g.fillStyle = '#ffffff';
    g.font = '400 30px "Trebuchet MS", sans-serif';
    g.fillText(fact, w / 2, 140);
  });
}
function zooOk() { // ¿juego listo para lógica de mundo?
  return (typeof LEVEL !== 'undefined' && LEVEL && LEVEL.group &&
    typeof Player !== 'undefined' && Player && Player.pos &&
    typeof MODE !== 'undefined' && MODE === 'play' &&
    (typeof finished === 'undefined' || !finished));
}
function zooOnFoot() {
  return typeof Vehicle === 'undefined' || !Vehicle || Vehicle.mode === 'none';
}

/* ================= constructores de animales (diseños originales) =================
   Cada uno devuelve un Group con userData.pivots para animar barato en update. */
function zooGiraffe() { // 🦒 cuello largo que se mece
  const g = new THREE.Group(), TAN = 0xd9a94e, SPOT = 0x8a5a1e;
  [[-0.42, 0.7], [0.42, 0.7], [-0.42, -0.7], [0.42, -0.7]].forEach(([lx, lz]) =>
    zooBox(g, 0.28, 1.2, 0.28, TAN, lx, 0.6, lz));
  zooBox(g, 1.1, 0.9, 1.9, TAN, 0, 1.65, 0);
  [[-0.25, 2.11, 0.3], [0.28, 2.11, -0.2], [0, 2.11, -0.6], [-0.3, 1.9, 0.75]].forEach(([sx, sy, sz]) =>
    zooBox(g, 0.3, 0.08, 0.3, SPOT, sx, sy, sz, false));
  const neck = new THREE.Group(); neck.position.set(0, 1.95, 0.8); g.add(neck);
  zooBox(neck, 0.34, 2.3, 0.34, TAN, 0, 1.15, 0.1);
  zooBox(neck, 0.3, 0.08, 0.3, SPOT, 0, 1.6, 0.12, false);
  zooBox(neck, 0.5, 0.45, 0.8, TAN, 0, 2.45, 0.22);
  zooBox(neck, 0.34, 0.3, 0.3, SPOT, 0, 2.35, 0.6, false); // hocico
  [-0.14, 0.14].forEach(ox => { // osiconos
    const o = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 6), zooMat(SPOT));
    o.position.set(ox, 2.85, 0.15); neck.add(o);
  });
  g.userData.pivots = { neck };
  return g;
}
function zooLion() { // 🦁 melena + cola que se mueve
  const g = new THREE.Group(), TAW = 0xd8a03c, MANE = 0x7a4a1a;
  [[-0.45, 0.7], [0.45, 0.7], [-0.45, -0.7], [0.45, -0.7]].forEach(([lx, lz]) =>
    zooBox(g, 0.3, 1.0, 0.3, TAW, lx, 0.5, lz));
  zooBox(g, 1.2, 0.9, 2.0, TAW, 0, 1.35, 0);
  zooBox(g, 1.5, 1.5, 0.5, MANE, 0, 1.9, 0.95); // melena
  const head = new THREE.Group(); head.position.set(0, 1.9, 1.2); g.add(head);
  zooBox(head, 0.8, 0.8, 0.7, TAW, 0, 0, 0.1);
  zooBox(head, 0.5, 0.35, 0.15, 0xe8c878, 0, -0.15, 0.5, false); // hocico claro
  zooBox(head, 0.16, 0.12, 0.1, 0x3a2410, 0, -0.05, 0.58, false); // nariz
  [-0.32, 0.32].forEach(ex => zooBox(head, 0.22, 0.22, 0.12, TAW, ex, 0.45, -0.05, false));
  const tail = new THREE.Group(); tail.position.set(0, 1.7, -1.0); g.add(tail);
  zooBox(tail, 0.12, 0.12, 1.0, TAW, 0, 0, -0.5, false);
  zooBox(tail, 0.22, 0.22, 0.3, MANE, 0, 0, -1.05, false); // borla
  g.userData.pivots = { head, tail };
  return g;
}
function zooElephant() { // 🐘 trompa que se balancea
  const g = new THREE.Group(), GRY = 0x9aa0a8;
  [[-0.65, 0.9], [0.65, 0.9], [-0.65, -0.9], [0.65, -0.9]].forEach(([lx, lz]) =>
    zooBox(g, 0.5, 1.4, 0.5, GRY, lx, 0.7, lz));
  zooBox(g, 1.9, 1.5, 2.6, GRY, 0, 2.15, 0);
  zooBox(g, 1.2, 1.2, 1.0, GRY, 0, 2.6, 1.5); // cabeza
  [-1.05, 1.05].forEach(ex => zooBox(g, 0.15, 1.2, 0.9, 0xd8a0a0, ex, 2.7, 1.25)); // orejas
  [-0.35, 0.35].forEach(tx => { // colmillos
    const t = zooBox(g, 0.12, 0.12, 0.7, 0xffffff, tx, 2.0, 2.2, false);
    t.rotation.x = 0.35;
  });
  const trunk = new THREE.Group(); trunk.position.set(0, 2.5, 2.0); g.add(trunk);
  zooBox(trunk, 0.36, 0.55, 0.36, GRY, 0, -0.25, 0.02);
  zooBox(trunk, 0.3, 0.55, 0.3, GRY, 0, -0.72, 0.08);
  zooBox(trunk, 0.24, 0.55, 0.24, GRY, 0, -1.15, 0.18);
  g.userData.pivots = { trunk };
  return g;
}
function zooZebra() { // 🦓 rayas únicas + cabeza que cabecea
  const g = new THREE.Group(), WHT = 0xf2f2f2, BLK = 0x1a1a1a;
  [[-0.38, 0.62], [0.38, 0.62], [-0.38, -0.62], [0.38, -0.62]].forEach(([lx, lz]) => {
    zooBox(g, 0.26, 1.1, 0.26, WHT, lx, 0.55, lz);
    zooBox(g, 0.28, 0.1, 0.28, BLK, lx, 0.7, lz, false);
  });
  zooBox(g, 1.0, 0.8, 1.8, WHT, 0, 1.5, 0);
  [-0.5, 0, 0.5].forEach(sz => zooBox(g, 1.02, 0.14, 0.2, BLK, 0, 1.55, sz, false)); // rayas
  const neck = new THREE.Group(); neck.position.set(0, 1.75, 0.8); g.add(neck);
  const nm = zooBox(neck, 0.3, 1.1, 0.34, WHT, 0, 0.45, 0.12); nm.rotation.x = -0.35;
  zooBox(neck, 0.34, 0.42, 0.72, WHT, 0, 1.05, 0.42);
  zooBox(neck, 0.2, 0.28, 0.2, BLK, 0, 0.95, 0.78, false); // hocico
  [0.15, 0.45, 0.75].forEach(hy => zooBox(neck, 0.1, 0.12, 0.4, BLK, 0, hy, -0.02, false)); // crin
  g.userData.pivots = { neck };
  return g;
}
function zooMonkey() { // 🐒 salta en su sitio
  const g = new THREE.Group(), BRN = 0x8a5a2e, FCE = 0xd9a066;
  zooBox(g, 0.5, 0.6, 0.45, BRN, 0, 0.85, 0);
  zooBox(g, 0.45, 0.45, 0.42, BRN, 0, 1.4, 0.05);
  zooBox(g, 0.3, 0.28, 0.08, FCE, 0, 1.38, 0.28, false); // cara
  [-0.3, 0.3].forEach(ex => zooBox(g, 0.14, 0.2, 0.1, BRN, ex, 1.5, 0, false));
  [-0.33, 0.33].forEach(ax => zooBox(g, 0.14, 0.6, 0.14, BRN, ax, 0.85, 0.1, false)); // brazos
  zooBox(g, 0.12, 0.5, 0.12, BRN, 0, 0.9, -0.35, false); // cola tramo 1
  const tailT = zooBox(g, 0.12, 0.5, 0.12, BRN, 0, 1.25, -0.45, false);
  tailT.rotation.x = 0.5;
  g.userData.pivots = { jumper: true };
  return g;
}
function zooFlamingo() { // 🦩 parado en una pata, cuello en S
  const g = new THREE.Group(), PNK = 0xff8fb3;
  zooBox(g, 0.08, 1.3, 0.08, 0xe06a8a, 0, 0.65, 0); // una sola pata
  const body = new THREE.Group(); body.position.set(0, 1.45, 0); g.add(body);
  const bd = zooBox(body, 0.55, 0.4, 0.85, PNK, 0, 0, 0); bd.rotation.x = 0.15;
  [-0.32, 0.32].forEach(wx => zooBox(body, 0.08, 0.28, 0.6, 0xff6f9f, wx, 0.12, 0, false)); // alas
  const neck = new THREE.Group(); neck.position.set(0, 0.15, 0.4); body.add(neck);
  const n1 = zooBox(neck, 0.12, 0.7, 0.12, PNK, 0, 0.3, 0.05); n1.rotation.x = -0.25;
  const n2 = zooBox(neck, 0.11, 0.6, 0.11, PNK, 0, 0.75, -0.08); n2.rotation.x = 0.35;
  zooBox(neck, 0.22, 0.2, 0.24, PNK, 0, 1.05, -0.18, false);
  zooBox(neck, 0.1, 0.12, 0.3, 0xffffff, 0, 1.0, -0.4, false); // pico
  zooBox(neck, 0.11, 0.08, 0.12, 0x1a1a1a, 0, 0.98, -0.55, false);
  g.userData.pivots = { body, neck };
  return g;
}

/* ================= el zoológico ================= */
// rectángulo libre verificado: x∈[-198,-138], z∈[-118,-78]
const ZOO = { x0: -198, x1: -138, z0: -118, z1: -78, cx: -168, cz: -98 };
const ZOO_FEED_CD = 120; // 2 minutos por recinto

const Zoo = {
  recintos: [],   // [{id, cx, cz, feedX, feedZ, feedable, animals:[], cd, feedT, t, signPos}]
  _els: {},
  _ui: false,
  _welcome: false,

  init() {
    if (this._ui) return;
    this._ui = true;
    const b = document.createElement('button');
    b.id = 'zoo-feed';
    b.innerHTML = '🍎 ALIMENTAR';
    b.style.cssText = 'position:fixed;z-index:45;display:none;font-family:inherit;' +
      'font-size:20px;font-weight:900;padding:14px 22px;border-radius:999px;' +
      'border:4px solid #fff;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.45);' +
      'right:14px;bottom:280px;background:linear-gradient(180deg,#ff9d3c,#c66a00);';
    b.addEventListener('click', () => {
      try { if (typeof Audio2 !== 'undefined') Audio2.init(); } catch (e) {}
      Zoo.feedNear();
    });
    document.body.appendChild(b);
    this._els['zoo-feed'] = b;
  },

  onLevelStart(idx) {
    for (const r of this.recintos) r.feedT = 0;
    this._welcome = false;
  },

  onLevelEnd() {
    this.recintos = [];
    const b = this._els['zoo-feed'];
    if (b) b.style.display = 'none';
  },

  /* ---------- construcción (solo idx 3) ---------- */
  buildForLevel(idx, group) {
    this.recintos = [];
    if (idx !== 3 || !group) return;
    const g = group;
    // ---- arco de entrada (lado este, mirando al pueblo) ----
    const ax = -140, az = -98;
    zooBox(g, 0.9, 5.2, 0.9, 0x8a5a2e, ax, 2.6, az - 3.2);
    zooBox(g, 0.9, 5.2, 0.9, 0x8a5a2e, ax, 2.6, az + 3.2);
    zooBox(g, 1.0, 1.0, 7.6, 0x6b4423, ax, 5.5, az);
    g.add(doubleFaceSign(6.6, 1.9,
      zooTex(512, 160, (c2, w, h) => {
        c2.fillStyle = '#0d4d1f'; c2.fillRect(0, 0, w, h);
        c2.strokeStyle = '#ffd23f'; c2.lineWidth = 10; c2.strokeRect(8, 8, w - 16, h - 16);
        c2.fillStyle = '#ffd23f'; c2.textAlign = 'center';
        c2.font = '900 58px "Trebuchet MS", sans-serif';
        c2.fillText(T('zoo.title'), w / 2, 100);
      }), ax, 4.2, az, Math.PI / 2));
    // ---- taquilla (entrada GRATIS) ----
    const tx = -136, tz = -92.5;
    zooBox(g, 3.2, 2.6, 3.0, 0xf2e0a8, tx, 1.3, tz);
    zooBox(g, 3.8, 0.4, 3.6, 0xd42a2a, tx, 2.8, tz, 0xd42a2a, 0.25);
    zooBox(g, 2.0, 1.2, 0.1, 0x9fd8ff, tx, 1.4, tz - 1.52, 0x9fd8ff, 0.4); // ventanilla
    g.add(doubleFaceSign(3.0, 0.9,
      zooTex(512, 150, (c2, w, h) => {
        c2.fillStyle = '#0d4d1f'; c2.fillRect(0, 0, w, h);
        c2.fillStyle = '#ffffff'; c2.textAlign = 'center';
        c2.font = '900 52px "Trebuchet MS", sans-serif';
        c2.fillText(T('zoo.free'), w / 2, 100);
      }), tx, 3.6, tz, 0));
    // ---- senderos (losas visuales) ----
    const pathM = new THREE.MeshStandardMaterial({ color: 0xd9c07a, roughness: 1 });
    const slab = (w, d, x, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), pathM);
      m.position.set(x, 0.03, z); m.receiveShadow = true; g.add(m);
    };
    slab(56, 3, -168, -98);            // principal este-oeste
    slab(3, 30, -186, -98); slab(3, 30, -168, -98); slab(3, 30, -150, -98); // ramales
    // ---- 6 recintos ----
    const defs = [
      { id: 'jirafa',   bx: zooGiraffe,   n: 2, cx: -186, cz: -107, fx: -186, fz: -100, feed: true,  ground: 0x7ec850 },
      { id: 'leon',     bx: zooLion,      n: 2, cx: -168, cz: -107, fx: 0,    fz: 0,    feed: false, ground: 0xc9a86a },
      { id: 'elefante', bx: zooElephant,  n: 1, cx: -150, cz: -107, fx: -150, fz: -100, feed: true,  ground: 0x9aa070 },
      { id: 'cebra',    bx: zooZebra,     n: 2, cx: -186, cz: -89,  fx: 0,    fz: 0,    feed: false, ground: 0x7ec850 },
      { id: 'mono',     bx: zooMonkey,    n: 3, cx: -168, cz: -89,  fx: -168, fz: -96,  feed: true,  ground: 0x6fae4a },
      { id: 'flamenco', bx: zooFlamingo,  n: 3, cx: -150, cz: -89,  fx: -150, fz: -96,  feed: true,  ground: 0x8fd0d8 },
    ];
    for (const d of defs) this._buildRecinto(g, d);
  },

  _buildRecinto(g, d) {
    const RW = 16, RD = 10, FH = 1.3; // ancho, fondo, alto de cerca
    const x0 = d.cx - RW / 2, x1 = d.cx + RW / 2, z0 = d.cz - RD / 2, z1 = d.cz + RD / 2;
    // suelo del recinto
    const gr = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.08, RD), zooMat(d.ground));
    gr.position.set(d.cx, 0.04, d.cz); gr.receiveShadow = true; g.add(gr);
    // cerca baja: postes + 2 rieles (se ve por encima)
    const postM = zooMat(0x8a6f3a), railM = zooMat(0x6b4f26);
    const post = (x, z) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, FH, 0.18), postM);
      p.position.set(x, FH / 2, z); g.add(p);
    };
    const railX = (z) => {
      [0.65, 1.15].forEach(y => {
        const r = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.09, 0.09), railM);
        r.position.set(d.cx, y, z); g.add(r);
      });
    };
    const railZ = (x) => {
      [0.65, 1.15].forEach(y => {
        const r = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, RD), railM);
        r.position.set(x, y, d.cz); g.add(r);
      });
    };
    for (let x = x0; x <= x1 + 0.01; x += 2) { post(x, z0); post(x, z1); }
    for (let z = z0 + 2; z <= z1 - 0.01; z += 2) { post(x0, z); post(x1, z); }
    railX(z0); railX(z1); railZ(x0); railZ(x1);
    // animales (pocos, posiciones separadas dentro del recinto)
    const animals = [];
    for (let i = 0; i < d.n; i++) {
      const a = d.bx();
      const axp = d.cx + (d.n === 1 ? 0 : (i - (d.n - 1) / 2) * 5.5);
      const azp = d.cz + (i % 2 === 0 ? 1.6 : -1.6);
      a.position.set(axp, 0, azp);
      a.rotation.y = (i * 1.7) % (Math.PI * 2);
      a.userData.base = { x: axp, z: azp };
      a.userData.phase = Math.random() * 10;
      g.add(a);
      animals.push(a);
    }
    // letrero: nombre + dato curioso (mirando al sendero)
    const sz = d.cz < ZOO.cz ? z1 + 0.8 : z0 - 0.8;
    zooBox(g, 0.22, 2.3, 0.22, 0x6b4423, d.cx, 1.15, sz);
    g.add(doubleFaceSign(5.2, 2.0,
      zooSignTexture(T('zoo.r.' + d.id), T('zoo.f.' + d.id)),
      d.cx, 2.9, sz, d.cz < ZOO.cz ? 0 : Math.PI));
    // comedero en los recintos alimentables
    if (d.feed) {
      zooBox(g, 1.6, 0.5, 0.7, 0x8a6f3a, d.fx, 0.25, d.fz);
      const ap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), zooMat(0xe63946, 0xe63946, 0.4));
      ap.position.set(d.fx - 0.35, 0.62, d.fz); g.add(ap);
      const ap2 = ap.clone(); ap2.position.x = d.fx + 0.3; g.add(ap2);
    }
    this.recintos.push({
      id: d.id, cx: d.cx, cz: d.cz, feedX: d.fx, feedZ: d.fz,
      feedable: d.feed, animals, cd: 0, feedT: 0, t: Math.random() * 10
    });
  },

  /* ---------- alimentar ---------- */
  nearFeedable() { // recinto alimentable más cercano al jugador (radio 6)
    if (!zooOk() || !zooOnFoot()) return null;
    let best = null, bd = 36;
    for (const r of this.recintos) {
      if (!r.feedable) continue;
      const dx = Player.pos.x - r.feedX, dz = Player.pos.z - r.feedZ;
      const d2 = dx * dx + dz * dz;
      if (d2 < bd) { bd = d2; best = r; }
    }
    return best;
  },
  feedNear() {
    const r = this.nearFeedable();
    if (r) this.feed(r.id);
  },
  feed(id) {
    const r = this.recintos.find(x => x.id === id);
    if (!r || !r.feedable) return false;
    if (r.cd > 0) {
      const mm = Math.floor(r.cd / 60), ss = Math.ceil(r.cd % 60);
      toast(tp('zoo.cool', { t: mm + ':' + String(ss).padStart(2, '0') }));
      try { if (typeof Audio2 !== 'undefined') Audio2.deny(); } catch (e) {}
      return false;
    }
    r.cd = ZOO_FEED_CD;
    r.feedT = 3; // 3 s de acercamiento
    try {
      if (typeof SAVE !== 'undefined' && SAVE.coins != null) {
        SAVE.coins += 5;
        try { if (typeof persist === 'function') persist(); } catch (e) {}
        const el = (typeof $ !== 'undefined') ? $('hud-coins') : null;
        if (el) el.textContent = SAVE.coins;
      }
      if (typeof Audio2 !== 'undefined') Audio2.good();
      if (typeof Particles !== 'undefined')
        Particles.burst(r.feedX, 1.2, r.feedZ, [0xe63946, 0x59d867, 0xffd23f], 14, 4);
    } catch (e) {}
    toast(T('zoo.fed'));
    return true;
  },

  /* ---------- animación barata ---------- */
  update(dt) {
    try {
      if (!zooOk() || LEVEL.idx !== 3) { this._hideBtn(); return; }
      for (const r of this.recintos) {
        r.t += dt;
        if (r.cd > 0) r.cd = Math.max(0, r.cd - dt);
        // acercamiento al alimentar: sale y vuelve (curva seno)
        let k = 0;
        if (r.feedT > 0) {
          r.feedT = Math.max(0, r.feedT - dt);
          k = Math.sin((1 - r.feedT / 3) * Math.PI) * 2.2;
        }
        for (const a of r.animals) {
          const P = a.userData.pivots || {}, ph = a.userData.phase || 0, t = r.t;
          if (P.neck) { // jirafa / cebra / flamenco: cuello
            P.neck.rotation.x = Math.sin(t * 1.3 + ph) * 0.14;
            P.neck.rotation.z = Math.sin(t * 0.9 + ph * 2) * 0.08;
          }
          if (P.head) P.head.rotation.x = Math.sin(t * 2 + ph) * 0.1;      // león: cabecea
          if (P.tail) P.tail.rotation.y = Math.sin(t * 3.1 + ph) * 0.55;   // león: cola
          if (P.trunk) P.trunk.rotation.x = Math.sin(t * 1.6 + ph) * 0.4;  // elefante: trompa
          if (P.jumper) { // mono: salta en su sitio
            a.position.y = Math.abs(Math.sin(t * 4 + ph)) * 0.7;
          }
          if (P.body) P.body.rotation.z = Math.sin(t * 0.9 + ph) * 0.06;   // flamenco: se mece
          // acercarse al comedero al alimentar
          if (k > 0 && a.userData.base) {
            const dx = r.feedX - a.userData.base.x, dz = r.feedZ - a.userData.base.z;
            const d = Math.hypot(dx, dz) || 1;
            a.position.x = a.userData.base.x + dx / d * k;
            a.position.z = a.userData.base.z + dz / d * k;
          } else if (a.userData.base && P.jumper) {
            a.position.x = a.userData.base.x; a.position.z = a.userData.base.z;
          }
        }
      }
      // botón 🍎 visible cerca de un recinto alimentable
      const near = this.nearFeedable();
      const b = this._els['zoo-feed'];
      if (b) {
        if (near) {
          b.style.display = 'block';
          b.innerHTML = '🍎 ' + T('zoo.r.' + near.id);
        } else b.style.display = 'none';
      }
      // bienvenida al entrar al zoo
      if (!this._welcome && Math.abs(Player.pos.x - ZOO.cx) < 34 && Math.abs(Player.pos.z - ZOO.cz) < 24) {
        this._welcome = true;
        toast(T('zoo.welcome'));
        try { if (typeof Audio2 !== 'undefined') Audio2.check(); } catch (e) {}
      }
    } catch (e) { /* nunca romper el loop */ }
  },
  _hideBtn() {
    const b = this._els['zoo-feed'];
    if (b) b.style.display = 'none';
  }
};
