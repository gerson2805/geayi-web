/* train.js — 🚂 TREN GEAYI EXPRESS (mundo idx 0: Ciudad Neón)
   - Circuito de vías a nivel del suelo (rectángulo redondeado HE=61, CR=5)
     alrededor de la zona central. Verificado sin choques con edificios
     (script /tmp/train_track_check.js).
   - Locomotora caramelo ORIGINAL + 2 vagones (diseños propios, nada copiado).
   - 4 paradas con andenes bajos y letrero; el tren se detiene ~8 s en cada una.
   - Botones propios "🚂 SUBIR" / "⬇️ BAJAR": subir solo con el tren detenido
     cerca; al viajar el jugador va sentado en el vagón (la cámara normal lo
     sigue); bajar solo en paradas. Si el tren arranca sin ti, te espera en la
     próxima vuelta (sin penalización).
   - Todo a nivel del suelo, sin saltos ni desniveles. i18n es/en (+pt/fr).
   - Geometrías y materiales cacheados (Android).
   REGLAS: todo global (como los demás módulos), sin DOM al cargar.
*/
'use strict';

/* ---------- i18n ---------- */
addStrings('es', {
  'train.board': '🚂 SUBIR', 'train.exit': '⬇️ BAJAR',
  'train.st0': '🚂 PARADA ESTE', 'train.st1': '🚂 PARADA SUR',
  'train.st2': '🚂 PARADA OESTE', 'train.st3': '🚂 PARADA NORTE',
  'train.aboard': '🚂 ¡Todos a bordo! Próxima parada: {s}',
  'train.arrived': '🚂 Llegamos a {s}: ¡puedes bajar!',
  'train.alight': '🚂 ¡Te bajaste en {s}!'
});
addStrings('en', {
  'train.board': '🚂 BOARD', 'train.exit': '⬇️ GET OFF',
  'train.st0': '🚂 EAST STOP', 'train.st1': '🚂 SOUTH STOP',
  'train.st2': '🚂 WEST STOP', 'train.st3': '🚂 NORTH STOP',
  'train.aboard': '🚂 All aboard! Next stop: {s}',
  'train.arrived': '🚂 Arrived at {s}: you can get off!',
  'train.alight': '🚂 You got off at {s}!'
});
addStrings('pt', {
  'train.board': '🚂 EMBARCAR', 'train.exit': '⬇️ DESCER',
  'train.st0': '🚂 PARADA LESTE', 'train.st1': '🚂 PARADA SUL',
  'train.st2': '🚂 PARADA OESTE', 'train.st3': '🚂 PARADA NORTE',
  'train.aboard': '🚂 Todos a bordo! Próxima parada: {s}',
  'train.arrived': '🚂 Chegamos a {s}: pode descer!',
  'train.alight': '🚂 Você desceu em {s}!'
});
addStrings('fr', {
  'train.board': '🚂 MONTER', 'train.exit': '⬇️ DESCENDRE',
  'train.st0': '🚂 ARRÊT EST', 'train.st1': '🚂 ARRÊT SUD',
  'train.st2': '🚂 ARRÊT OUEST', 'train.st3': '🚂 ARRÊT NORD',
  'train.aboard': '🚂 Tous à bord ! Prochain arrêt : {s}',
  'train.arrived': '🚂 Arrivée à {s} : vous pouvez descendre !',
  'train.alight': '🚂 Vous êtes descendu à {s} !'
});

/* ---------- geometría del circuito (verificada en /tmp/train_track_check.js) ---------- */
const TRAIN_HE = 61, TRAIN_CR = 5;
const TRAIN_SL = 2 * (TRAIN_HE - TRAIN_CR);      // 112: largo de cada recta
const TRAIN_ARC = Math.PI / 2 * TRAIN_CR;        // ~7.854: cada curva
const TRAIN_P = 4 * TRAIN_SL + 4 * TRAIN_ARC;    // ~479.42: perímetro
const TRAIN_CRUISE = 7, TRAIN_ACCEL = 3.5, TRAIN_DECEL = 4, TRAIN_DWELL = 8;
const TRAIN_CAR_GAP = 9; // distancia locomotora→vagón1→vagón2

/* Punto del circuito: s en [0, TRAIN_P). Devuelve {x,z,tx,tz} (tangente unitaria). */
function trainTrackPoint(s) {
  const HE = TRAIN_HE, CR = TRAIN_CR, SL = TRAIN_SL;
  s = ((s % TRAIN_P) + TRAIN_P) % TRAIN_P;
  if (s < SL) return { x: HE, z: -(HE - CR) + s, tx: 0, tz: 1 };                       // E
  s -= SL;
  if (s < TRAIN_ARC) { const a = s / CR; return { x: (HE - CR) + CR * Math.cos(a), z: (HE - CR) + CR * Math.sin(a), tx: -Math.sin(a), tz: Math.cos(a) }; } // SE
  s -= TRAIN_ARC;
  if (s < SL) return { x: (HE - CR) - s, z: HE, tx: -1, tz: 0 };                      // S
  s -= SL;
  if (s < TRAIN_ARC) { const a = Math.PI / 2 + s / CR; return { x: -(HE - CR) + CR * Math.cos(a), z: (HE - CR) + CR * Math.sin(a), tx: -Math.sin(a), tz: Math.cos(a) }; } // SW
  s -= TRAIN_ARC;
  if (s < SL) return { x: -HE, z: (HE - CR) - s, tx: 0, tz: -1 };                      // O
  s -= SL;
  if (s < TRAIN_ARC) { const a = Math.PI + s / CR; return { x: -(HE - CR) + CR * Math.cos(a), z: -(HE - CR) + CR * Math.sin(a), tx: -Math.sin(a), tz: Math.cos(a) }; } // NW
  s -= TRAIN_ARC;
  if (s < SL) return { x: -(HE - CR) + s, z: -HE, tx: 1, tz: 0 };                     // N
  s -= SL;
  const a = 3 * Math.PI / 2 + s / CR;                                                 // NE
  return { x: (HE - CR) + CR * Math.cos(a), z: -(HE - CR) + CR * Math.sin(a), tx: -Math.sin(a), tz: Math.cos(a) };
}

/* Paradas: s = posición de la LOCOMOTORA detenida (el vagón 1 queda en el andén). */
const TRAIN_STOPS = [
  { s: 65,      key: 'train.st0', px: 58,  pz: 0,   pw: 3,  pd: 16 }, // ESTE
  { s: 164.854, key: 'train.st1', px: 20,  pz: 58,  pw: 16, pd: 3  }, // SUR
  { s: 304.708, key: 'train.st2', px: -58, pz: 0,   pw: 3,  pd: 16 }, // OESTE
  { s: 444.562, key: 'train.st3', px: 20,  pz: -58, pw: 16, pd: 3  }, // NORTE
];

/* ---------- cachés (una sola vez, compartidas) ---------- */
let _trGeo = null, _trMat = null, _trSignTex = {};
function _trCache() {
  if (_trGeo) return;
  _trGeo = {
    ballastS: new THREE.BoxGeometry(3, 0.1, TRAIN_SL),
    ballastC: new THREE.TorusGeometry(TRAIN_CR, 1.5, 6, 14, Math.PI / 2),
    railS: new THREE.BoxGeometry(0.12, 0.14, TRAIN_SL),
    tie: new THREE.BoxGeometry(2.2, 0.08, 0.5),
    plat: new THREE.BoxGeometry(1, 0.35, 1),
    edge: new THREE.BoxGeometry(1, 0.06, 1),
    post: new THREE.CylinderGeometry(0.09, 0.09, 2.6, 8),
    sign: new THREE.PlaneGeometry(7, 1.75),
    pole: new THREE.CylinderGeometry(0.12, 0.12, 3, 8),
    lamp: new THREE.SphereGeometry(0.28, 10, 10),
  };
  const std = (c, e, ei, r) => new THREE.MeshStandardMaterial(
    { color: c, emissive: e || 0x000000, emissiveIntensity: ei == null ? 0.35 : ei, roughness: r == null ? 0.55 : r });
  _trMat = {
    ballast: std(0x3a3f4d, 0x0a0d16, 0.3, 0.9),
    rail: new THREE.MeshStandardMaterial({ color: 0x9fb3c8, metalness: 0.75, roughness: 0.35 }),
    tie: std(0x6b4a2f, 0x000000, 0, 0.9),
    body: std(0x00c8e8, 0x004455, 0.5, 0.35),   // turquesa caramelo
    stripe: new THREE.MeshBasicMaterial({ color: 0xff2fd6 }), // magenta neón
    yellow: std(0xffd23f, 0x7a5b00, 0.4, 0.4),
    red: std(0xff3d5e, 0x550000, 0.5, 0.4),
    dark: std(0x232838, 0x000000, 0, 0.8),
    glass: new THREE.MeshBasicMaterial({ color: 0xbff6ff }),
    white: std(0xf5f8ff, 0x222833, 0.3, 0.5),
    platM: std(0x2c3145, 0x0c1226, 0.4, 0.8),
    edgeM: new THREE.MeshBasicMaterial({ color: 0xffe95e }),
    signPole: std(0x2b2f3a, 0x000000, 0, 0.7),
    crossLamp: new THREE.MeshBasicMaterial({ color: 0xff2222 }),
  };
}
function _trSignTexture(key) {
  if (_trSignTex[key]) return _trSignTex[key];
  const t = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#0d1b2a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#00e5ff'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 52px "Trebuchet MS", sans-serif';
    g.fillText(T(key), w / 2, h / 2 + 2);
  });
  _trSignTex[key] = t;
  return t;
}
function _trNameTexture() { // placa "GEAYI EXPRESS" de la locomotora
  if (_trSignTex.__geayi) return _trSignTex.__geayi;
  const t = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#ff2fd6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 64px "Trebuchet MS", sans-serif';
    g.fillText('GEAYI EXPRESS', w / 2, h / 2 + 2);
  });
  _trSignTex.__geayi = t;
  return t;
}

/* ---------- construcción de la locomotora (diseño 100% original) ---------- */
function _trBuildLoco() {
  _trCache();
  const M = _trMat, G = new THREE.Group();
  const B = (geo, mat, x, y, z, ry) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (ry) m.rotation.y = ry; G.add(m); return m;
  };
  const box = (w, h, d, mat, x, y, z) => B(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  // chasis y caldera
  box(2.4, 0.5, 7.2, M.dark, 0, 0.55, 0);
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 4.4, 14), M.body);
  boiler.rotation.x = Math.PI / 2; boiler.position.set(0, 1.55, 0.9); G.add(boiler);
  box(2.5, 0.18, 4.5, M.stripe, 0, 1.62, 0.9);            // franja magenta
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 12), M.red);
  nose.position.set(0, 1.55, 3.1); G.add(nose);            // nariz redonda caramelo
  const lampF = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), M.glass);
  lampF.position.set(0, 2.1, 3.35); G.add(lampF);          // faro
  // chimenea (sale el humo) + domo
  const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.36, 1.2, 10), M.yellow);
  chim.position.set(0, 2.9, 2.2); G.add(chim);
  const chimCap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.3, 10), M.red);
  chimCap.position.set(0, 3.55, 2.2); G.add(chimCap);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 10), M.yellow);
  dome.position.set(0, 2.5, 0.9); G.add(dome);
  // cabina con ventanas luminosas
  box(2.4, 2.3, 2.4, M.body, 0, 1.95, -2.1);
  box(2.5, 0.5, 2.5, M.red, 0, 3.25, -2.1);                // techo rojo caramelo
  box(2.46, 0.9, 0.06, M.glass, 0, 2.3, -0.92);            // ventana frontal
  box(0.06, 0.9, 1.6, M.glass, 1.23, 2.3, -2.1);           // ventanas laterales
  box(0.06, 0.9, 1.6, M.glass, -1.23, 2.3, -2.1);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55),
    new THREE.MeshBasicMaterial({ map: _trNameTexture() }));
  plate.position.set(0, 1.35, -3.32); plate.rotation.y = Math.PI; G.add(plate); // placa trasera
  // quitapiedras (cuña) original en V
  const wedge = box(2.2, 0.9, 0.5, M.red, 0, 0.45, 3.75); wedge.rotation.x = 0.6;
  // ruedas (3 por lado, giran)
  const wheels = [];
  [-2.2, 0, 2.2].forEach(z => [-1.15, 1.15].forEach(x => {
    const wg = new THREE.Group(); wg.position.set(x, 0.55, z);
    const wm = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 12), M.dark);
    wm.rotation.z = Math.PI / 2; wg.add(wm);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 8), M.yellow);
    hub.rotation.z = Math.PI / 2; wg.add(hub);
    G.add(wg); wheels.push({ g: wg, r: 0.55 });
  }));
  G.userData.wheels = wheels;
  return G;
}

/* ---------- vagón de pasajeros abierto (diseño 100% original) ---------- */
function _trBuildWagon(stripeMat) {
  _trCache();
  const M = _trMat, G = new THREE.Group();
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); G.add(m); return m;
  };
  box(2.4, 0.4, 7, M.dark, 0, 0.5, 0);                    // chasis
  box(2.4, 0.25, 7, M.body, 0, 0.8, 0);                   // piso caramelo
  // paredes bajas con franja
  [[1.15, 0], [-1.15, 0]].forEach(([x]) => {
    box(0.12, 1.0, 7, M.body, x, 1.4, 0);
    box(0.14, 0.22, 7, stripeMat, x, 1.95, 0);
  });
  box(2.4, 1.0, 0.12, M.body, 0, 1.4, 3.44);
  box(2.4, 1.0, 0.12, M.body, 0, 1.4, -3.44);
  // bancas para pasajeros
  [-1.8, 0, 1.8].forEach(z => {
    box(1.8, 0.18, 0.9, M.yellow, 0, 1.15, z);
    box(1.8, 0.7, 0.18, M.red, 0, 1.5, z - 0.45);
  });
  // farolitos en las esquinas
  [[1.1, 3.3], [-1.1, 3.3], [1.1, -3.3], [-1.1, -3.3]].forEach(([x, z]) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), M.glass);
    l.position.set(x, 2.15, z); G.add(l);
  });
  const wheels = [];
  [-2.3, 2.3].forEach(z => [-1.15, 1.15].forEach(x => {
    const wg = new THREE.Group(); wg.position.set(x, 0.45, z);
    const wm = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12), M.dark);
    wm.rotation.z = Math.PI / 2; wg.add(wm);
    G.add(wg); wheels.push({ g: wg, r: 0.45 });
  }));
  G.userData.wheels = wheels;
  return G;
}

/* ---------- módulo Train ---------- */
const Train = {
  g: null,            // grupo con todo (vías + tren + andenes), solo en idx 0
  s: 0,               // posición de la locomotora sobre el circuito
  v: 0,               // velocidad actual
  state: 'run',       // 'run' | 'dwell'
  dwellT: 0, stopIdx: -1,
  riding: false,      // el jugador viaja en el vagón 2
  cars: [],           // [loco, vagón1, vagón2] (grupos)
  carPos: [],         // [{x,z,tx,tz}] por cuadro
  wheels: [],
  smokeT: 0, blinkT: 0,
  _bBoard: null, _bExit: null, _inited: false,
  _crossLamps: [],

  init() {
    if (this._inited) return;
    this._inited = true;
    const mk = (id, text) => {
      const b = document.createElement('button');
      b.id = id; b.className = 'veh-btn hidden'; b.textContent = text;
      b.style.bottom = 'calc(228px + env(safe-area-inset-bottom))';
      b.addEventListener('click', () => { Audio2.init(); Audio2.click(); });
      document.body.appendChild(b);
      return b;
    };
    this._bBoard = mk('btn-train-board', '🚂 ' + T('train.board'));
    this._bExit = mk('btn-train-exit', '⬇️ ' + T('train.exit'));
    this._bBoard.addEventListener('click', () => Train.board());
    this._bExit.addEventListener('click', () => Train.alight());
  },

  /* Limpia el nivel anterior y construye (solo idx 0). */
  buildForLevel(i, group) {
    if (this.g && this.g.parent) { try { this.g.parent.remove(this.g); } catch (e) {} }
    this.g = null; this.cars = []; this.carPos = []; this.wheels = [];
    this._crossLamps = []; this.riding = false;
    this.s = 0; this.v = 0; this.state = 'run'; this.dwellT = 0; this.stopIdx = -1;
    this._hideBtns();
    try { if (typeof Audio2 !== 'undefined') Audio2.engineStop(); } catch (e) {}
    if (i !== 0 || !group) return;
    _trCache();
    const G = new THREE.Group();
    this.g = G;
    this._buildTrack(G);
    this._buildStops(G);
    this._buildCrossings(G);
    // tren: locomotora + 2 vagones
    const loco = _trBuildLoco();
    const w1 = _trBuildWagon(_trMat.stripe);
    const w2 = _trBuildWagon(_trMat.yellow);
    G.add(loco); G.add(w1); G.add(w2);
    this.cars = [loco, w1, w2];
    for (const c of this.cars) for (const w of (c.userData.wheels || [])) this.wheels.push(w);
    group.add(G);
    this._placeCars();
  },

  _buildTrack(G) {
    const HE = TRAIN_HE, CR = TRAIN_CR, SL = TRAIN_SL;
    const M = _trMat, Ge = _trGeo;
    // balasto: 4 rectas + 4 curvas (plano bajo, a nivel del suelo)
    [[HE, 0], [-HE, 0]].forEach(([x, z]) => {
      const m = new THREE.Mesh(Ge.ballastS, M.ballast);
      m.position.set(x, 0.05, z); G.add(m);
    });
    [[0, HE, 0], [0, -HE, 0]].forEach(([x, z]) => {
      const m = new THREE.Mesh(Ge.ballastS, M.ballast);
      m.rotation.y = Math.PI / 2; m.position.set(x, 0.05, z); G.add(m);
    });
    [[HE - CR, HE - CR, 0], [-(HE - CR), HE - CR, Math.PI / 2],
     [-(HE - CR), -(HE - CR), Math.PI], [HE - CR, -(HE - CR), 3 * Math.PI / 2]].forEach(([x, z, rz]) => {
      const m = new THREE.Mesh(Ge.ballastC, M.ballast);
      m.rotation.x = Math.PI / 2; m.rotation.z = rz; m.position.set(x, 0.05, z); G.add(m);
    });
    // rieles dobles: 2 por recta / curva (offset ±0.75, perpendicular a la marcha)
    const railAt = (x, z, alongX) => [-0.75, 0.75].forEach(off => {
      const m = new THREE.Mesh(Ge.railS, M.rail);
      if (alongX) m.rotation.y = Math.PI / 2;
      m.position.set(x + (alongX ? 0 : off), 0.14, z + (alongX ? off : 0));
      G.add(m);
    });
    railAt(HE, 0, false); railAt(-HE, 0, false); railAt(0, HE, true); railAt(0, -HE, true);
    [[HE - CR, HE - CR, 0], [-(HE - CR), HE - CR, Math.PI / 2],
     [-(HE - CR), -(HE - CR), Math.PI], [HE - CR, -(HE - CR), 3 * Math.PI / 2]].forEach(([x, z, rz]) => {
      [-0.75, 0.75].forEach(off => {
        const m = new THREE.Mesh(
          new THREE.TorusGeometry(CR + off, 0.07, 6, 14, Math.PI / 2), M.rail);
        m.rotation.x = Math.PI / 2; // plano horizontal
        // orientar el arco: rotar para que coincida con el tramo
        const holder = new THREE.Group();
        holder.position.set(x, 0.14, z); holder.rotation.y = -rz;
        m.rotation.z = 0; m.rotation.x = Math.PI / 2;
        holder.add(m); G.add(holder);
      });
    });
    // durmientes cada ~3.2 m (geometría y material compartidos)
    const n = Math.floor(TRAIN_P / 3.2);
    for (let k = 0; k < n; k++) {
      const p = trainTrackPoint((k / n) * TRAIN_P);
      const m = new THREE.Mesh(Ge.tie, M.tie);
      m.position.set(p.x, 0.08, p.z);
      m.rotation.y = Math.atan2(p.tx, p.tz); // durmiente perpendicular a la marcha
      G.add(m);
    }
  },

  _buildStops(G) {
    const M = _trMat, Ge = _trGeo;
    TRAIN_STOPS.forEach((st, si) => {
      const horiz = st.pw > st.pd; // andén horizontal (SUR/NORTE) o vertical
      const plat = new THREE.Mesh(Ge.plat, M.platM);
      plat.scale.set(st.pw, 1, st.pd);
      plat.position.set(st.px, 0.175, st.pz);
      G.add(plat);
      const edge = new THREE.Mesh(Ge.edge, M.edgeM); // línea amarilla de seguridad
      edge.scale.set(horiz ? st.pw : 0.35, 1, horiz ? 0.35 : st.pd);
      const ex = horiz ? st.px : st.px + (st.px > 0 ? st.pw / 2 - 0.2 : -st.pw / 2 + 0.2);
      const ez = horiz ? st.pz + (st.pz > 0 ? st.pd / 2 - 0.2 : -st.pd / 2 + 0.2) : st.pz;
      edge.position.set(ex, 0.38, ez);
      G.add(edge);
      // letrero "🚂 PARADA ..." en 2 postes
      const tex = _trSignTexture(st.key);
      [-1, 1].forEach(e => {
        const post = new THREE.Mesh(Ge.post, M.signPole);
        const pxo = horiz ? st.px + e * (st.pw / 2 - 1) : st.px + (st.px > 0 ? 1 : -1);
        const pzo = horiz ? st.pz + (st.pz > 0 ? 1 : -1) : st.pz + e * (st.pd / 2 - 1);
        post.position.set(pxo, 1.3, pzo);
        G.add(post);
      });
      const sign = new THREE.Mesh(Ge.sign,
        new THREE.MeshBasicMaterial({ map: tex }));
      const sx = horiz ? st.px : st.px + (st.px > 0 ? 1 : -1);
      const sz = horiz ? st.pz + (st.pz > 0 ? 1 : -1) : st.pz;
      sign.position.set(sx, 3.1, sz);
      // el letrero mira hacia la vía
      sign.rotation.y = horiz ? (st.pz > 0 ? 0 : Math.PI) : (st.px > 0 ? Math.PI / 2 : -Math.PI / 2);
      G.add(sign);
    });
  },

  _buildCrossings(G) { // señales del cruce con la avenida (x=0, z=±61)
    const M = _trMat, Ge = _trGeo;
    [61, -61].forEach((z, ci) => {
      [-5.6, 5.6].forEach((x, xi) => {
        const pole = new THREE.Mesh(Ge.pole, M.signPole);
        pole.position.set(x, 1.5, z); G.add(pole);
        const lampM = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), M.crossLamp);
        lampM.position.set(x, 3.1, z); G.add(lampM);
        this._crossLamps.push({ m: lampM, phase: (ci + xi) * 0.5 });
      });
    });
  },

  _placeCars() {
    this.carPos = [];
    for (let c = 0; c < 3; c++) {
      const p = trainTrackPoint(this.s - c * TRAIN_CAR_GAP);
      this.carPos.push(p);
      const g = this.cars[c];
      g.position.set(p.x, 0, p.z);
      g.rotation.y = Math.atan2(p.tx, p.tz);
    }
  },

  _nextStop() {
    for (const st of TRAIN_STOPS) if (st.s > this.s + 0.01) return { st, dist: st.s - this.s };
    const st = TRAIN_STOPS[0];
    return { st, dist: TRAIN_P - this.s + st.s };
  },

  update(dt) {
    if (!this.g || typeof MODE === 'undefined' || MODE !== 'play') { this._hideBtns(); return; }
    // --- mover el tren ---
    if (this.state === 'run') {
      const { st, dist } = this._nextStop();
      const brakeD = (this.v * this.v) / (2 * TRAIN_DECEL) + 0.6;
      const target = dist < brakeD ? 0 : TRAIN_CRUISE;
      if (this.v < target) this.v = Math.min(target, this.v + TRAIN_ACCEL * dt);
      else if (this.v > target) this.v = Math.max(target, this.v - TRAIN_DECEL * dt);
      this.s += this.v * dt;
      if (dist < 0.9) { // llegada a la parada (pequeño ajuste final invisible)
        this.s = st.s; this.v = 0; this.state = 'dwell';
        this.dwellT = TRAIN_DWELL; this.stopIdx = TRAIN_STOPS.indexOf(st);
        try { Audio2.tone(392, 0.4, 'sawtooth', 0.1); Audio2.tone(523, 0.5, 'sawtooth', 0.1, 0.15); } catch (e) {}
        if (this.riding) toast(tp('train.arrived', { s: T(st.key) }));
      }
    } else { // dwell: ~8 s en la parada
      this.dwellT -= dt;
      if (this.dwellT <= 0) {
        this.state = 'run'; this.stopIdx = -1;
        try { Audio2.tone(330, 0.3, 'sawtooth', 0.1); } catch (e) {}
      }
    }
    if (this.s >= TRAIN_P) this.s -= TRAIN_P;
    this._placeCars();
    // ruedas girando
    const spin = this.v * dt;
    for (const w of this.wheels) w.g.rotation.x += spin / w.r;
    // humo de la chimenea (barato: sprites de Particles)
    this.smokeT -= dt;
    if (this.v > 0.5 && this.smokeT <= 0 && typeof Particles !== 'undefined') {
      this.smokeT = 0.18;
      const p = this.carPos[0];
      Particles.spawn(p.x + 2.2 * p.tx, 3.7, p.z + 2.2 * p.tz,
        { n: 2, colors: [0xffffff, 0xd8d8e0], speed: 0.8, up: 2.4, life: 1.1, size: 0.9, spread: 0.35, grav: -1.5 });
    }
    // parpadeo de los cruces
    this.blinkT += dt;
    for (const L of this._crossLamps) L.m.visible = ((this.blinkT * 1.6 + L.phase) % 1) < 0.55;
    // --- jugador viajando: va sentado en el vagón 2 (la cámara normal lo sigue) ---
    if (this.riding && typeof Player !== 'undefined' && Player.pos) {
      const p = this.carPos[2];
      Player.pos.set(p.x, 1.05, p.z);
      Player.vel.set(0, 0, 0);
      Player.grounded = true; Player.groundPlat = null;
      Player.heading = Math.atan2(p.tx, p.tz);
      if (typeof Avatar !== 'undefined' && Avatar.group) {
        Avatar.group.position.copy(Player.pos);
        Avatar.group.rotation.y = Player.heading;
      }
      try { Audio2.engineSet(0.15); } catch (e) {}
    }
    this._updateButtons();
  },

  _nearCar() {
    if (typeof Player === 'undefined' || !Player.pos || !this.carPos.length) return 1e9;
    let d = 1e9;
    for (const p of this.carPos) d = Math.min(d, Math.hypot(Player.pos.x - p.x, Player.pos.z - p.z));
    return d;
  },

  _updateButtons() {
    const bb = this._bBoard, be = this._bExit;
    if (!bb || !be) return;
    const driving = (typeof Vehicle !== 'undefined' && Vehicle.mode !== 'none');
    if (typeof MODE === 'undefined' || MODE !== 'play' || driving) { this._hideBtns(); return; }
    if (this.riding) {
      bb.classList.add('hidden');
      const canExit = this.state === 'dwell';
      be.classList.toggle('hidden', !canExit);
      if (canExit) be.textContent = '⬇️ ' + T('train.exit');
    } else if (this.state === 'dwell' && this._nearCar() < 8) {
      be.classList.add('hidden');
      bb.classList.remove('hidden');
      bb.textContent = '🚂 ' + T('train.board');
    } else this._hideBtns();
  },

  _hideBtns() {
    if (this._bBoard) this._bBoard.classList.add('hidden');
    if (this._bExit) this._bExit.classList.add('hidden');
  },

  /* Subir: solo con el tren detenido en una parada y el jugador cerca. */
  board() {
    if (this.riding || this.state !== 'dwell' || this._nearCar() >= 8) return false;
    if (typeof MODE !== 'undefined' && MODE !== 'play') return false;
    if (typeof Vehicle !== 'undefined' && Vehicle.mode !== 'none') return false;
    this.riding = true;
    try { Audio2.engineStart(); } catch (e) {}
    const st = TRAIN_STOPS[this.stopIdx] || this._nextStop().st;
    toast(tp('train.aboard', { s: T(st.key) }));
    this._updateButtons();
    return true;
  },

  /* Bajar: solo en paradas (con el tren detenido). */
  alight() {
    if (!this.riding || this.state !== 'dwell') return false;
    const st = TRAIN_STOPS[this.stopIdx] || TRAIN_STOPS[0];
    this.riding = false;
    try { Audio2.engineStop(); } catch (e) {}
    if (typeof Player !== 'undefined') {
      Player.pos.set(st.px, 0.6, st.pz);
      Player.vel.set(0, 0, 0);
      Player.grounded = false; Player.groundPlat = null;
    }
    toast(tp('train.alight', { s: T(st.key) }));
    this._updateButtons();
    return true;
  },
};
